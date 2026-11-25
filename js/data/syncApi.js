/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT PUPUK KUJANG CIKAMPEK
 * Real-time MySQL Sync Engine (Laptop & HP Cross-Device Synchronizer)
 * Menghubungkan Frontend ke API PHP Laragon tanpa mengubah logika modul yang ada.
 */

(function () {
  'use strict';

  // 1. Tentukan URL Base API secara Dinamis (Mendukung Laptop localhost & HP IP Wi-Fi)
  function resolveApiBaseUrl() {
    const protocol = window.location.protocol; // http:
    const hostname = window.location.hostname || 'localhost';

    // Jika dibuka langsung lewat Laragon Apache (/perizinan/)
    if (window.location.pathname.includes('/perizinan')) {
      return `${window.location.origin}/perizinan/api`;
    }

    // Jika dibuka lewat server Python port 8000 atau port lain, akses Apache Laragon di port 80
    return `${protocol}//${hostname}/perizinan/api`;
  }

  const API_BASE = resolveApiBaseUrl();
  let isApiOnline = false;
  let isSyncing = false;
  let hasInitialFetchCompleted = false;
  let lastTicketsJson = '';
  let pollIntervalTimer = null;
  const knownServerTicketHashes = new Map();
  const knownServerStatuses = new Map();
  const knownServerPendingExt = new Map();
  const pendingCreateIds = new Set();
  const lastLocalSnapshotIds = new Set();
  let softDeleteInFlight = 0;
  let mutationInFlight = 0;

  console.log(`[SyncEngine] Menghubungkan ke API Laragon MySQL di: ${API_BASE}`);

  // Helper Universal: Cek apakah tiket sudah dihapus dari riwayat karyawan aktif saat ini
  window.isTicketDeletedByKaryawan = function(t, myNip) {
    if (!t) return false;
    const nip = myNip || (typeof window.getCurrentEmployeeActor === 'function' ? window.getCurrentEmployeeActor().nip : null) || 'PK-2024-8841';
    if (Array.isArray(t.deletedByKaryawanNips) && t.deletedByKaryawanNips.length > 0) {
      return t.deletedByKaryawanNips.includes(nip);
    }
    return Boolean(t.deletedByKaryawan);
  };

  // Helper Komparasi Lengkap per Tiket & Daftar Tiket
  function computeSingleHash(t) {
    if (!t) return '';
    const mbrStr = Array.isArray(t.members) ? t.members.map(m => `${m.nip}:${m.status || 'aktif'}`).join(',') : '';
    const extStr = t.pendingExtension ? `${t.pendingExtension.status || ''}:${t.pendingExtension.newEstimatedReturn || ''}:${t.pendingExtension.reason || ''}` : '';
    const delAppr = Array.isArray(t.deletedByApproverNips) ? t.deletedByApproverNips.join(',') : '';
    const delKary = Array.isArray(t.deletedByKaryawanNips) ? t.deletedByKaryawanNips.join(',') : '';
    return [
      t.id, t.status, t.scanOutTime || '', t.scanInTime || '', t.tapInTime || '',
      t.lateMinutes || 0, t.isLate ? 1 : 0, t.approverNip || '', t.approverNote || '', t.rejectionReason || '',
      t.cancellationReason || '', t.approvedAt || '', t.plannedExit || '', t.estimatedReturn || '',
      t.emergencyAuthorizerNip || '', t.emergencyAuthorizerName || '', t.emergencyVerifiedAt || '',
      t.timeFrozen ? 1 : 0, t.arrivalReportedTime || '', t.timeline ? t.timeline.length : 0,
      mbrStr, t.hasExtensionPending ? 1 : 0, extStr, t.extensionApproved ? 1 : 0,
      t.deletedByKaryawan ? 1 : 0, delKary, t.deletedByApprover1 ? 1 : 0, t.deletedByApprover2 ? 1 : 0,
      t.deletedBySecurity ? 1 : 0, t.deletedFromAudit ? 1 : 0, delAppr,
      t.initiatorCancelled ? 1 : 0
    ].join(':');
  }

  function computeHash(tickets) {
    if (!tickets || !Array.isArray(tickets)) return '';
    return tickets.map(computeSingleHash).join('|');
  }

  // 2. Fetch Tiket dari Database MySQL
  async function fetchTicketsFromMySQL(isInitial = false) {
    if (isSyncing || softDeleteInFlight > 0 || mutationInFlight > 0) return;
    isSyncing = true;

    try {
      const cacheBust = Date.now();
      const response = await fetch(`${API_BASE}/get_tickets.php?_t=${cacheBust}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      if (softDeleteInFlight > 0 || mutationInFlight > 0) return;

      const resJson = await response.json();
      if (softDeleteInFlight > 0 || mutationInFlight > 0) return;
      if (resJson && resJson.success && Array.isArray(resJson.data)) {
        isApiOnline = true;
        const serverTickets = resJson.data;
        const prevStatusesSnapshot = new Map(knownServerStatuses);

        // Normalisasi & Integritas Status Tiket (Cegah kontradiksi data)
        serverTickets.forEach(t => {
          if (t.scanInTime && !['Selesai', 'Selesai (Terlambat)', 'Dibatalkan', 'Ditolak', 'Kedaluwarsa'].includes(t.status)) {
            t.status = 'Selesai';
          } else if (t.scanOutTime && !t.scanInTime && (t.status === 'Disetujui' || t.status === 'Menunggu Persetujuan')) {
            t.status = 'Sedang di Luar';
          } else if (t.status === 'Disetujui' || t.status === 'Menunggu Persetujuan') {
            t.scanOutTime = null;
            t.scanOutGate = null;
            t.scanInTime = null;
            t.scanInGate = null;
          }

          // Cegah permohonan perpanjangan ghoib: tiket final atau belum scan out tidak boleh memiliki perpanjangan aktif
          if (['Selesai', 'Selesai (Terlambat)', 'Dibatalkan', 'Ditolak', 'Kedaluwarsa'].includes(t.status) || Boolean(t.scanInTime) || (t.status !== 'Sedang di Luar' && t.status !== 'Terlambat')) {
            t.pendingExtension = null;
            t.hasExtensionPending = false;
            t.extensionRequestedTime = null;
            t.extensionReason = null;
          }
        });

        // Sinkronisasi notifikasi lintas perangkat dari MySQL
        let serverNotifsFetched = [];
        let notifFetchSucceeded = false;
        const rawRole = (typeof window.getCurrentMobileRole === 'function' && window.innerWidth <= 768 ? window.getCurrentMobileRole() : null) || (typeof window.getCurrentRole === 'function' ? window.getCurrentRole() : window.currentActor) || 'karyawan';
        const apiRole = rawRole.startsWith('karyawan') ? 'karyawan' : (rawRole.startsWith('approver') ? 'approver' : rawRole);
        try {
          if (!window._notifDeleteInFlight) {
            const notifRes = await fetch(`${API_BASE}/notifications.php?role=${encodeURIComponent(apiRole)}&limit=200&_t=${cacheBust}`, {
              headers: { 'Accept': 'application/json' },
              cache: 'no-store'
            });
            if (notifRes.ok && !window._notifDeleteInFlight) {
              const notifData = await notifRes.json();
              if (notifData && notifData.success && Array.isArray(notifData.data)) {
                notifFetchSucceeded = true;
                serverNotifsFetched = notifData.data;
                if (typeof window.mergeServerNotifications === 'function') {
                  window.mergeServerNotifications(serverNotifsFetched, apiRole);
                }
              }
            }
          }
        } catch (e) {}

        // Fallback notifikasi persetujuan HANYA saat terjadi transisi live ke 'Disetujui' dan belum dihapus pengguna
        serverTickets.forEach(t => {
          const prevStatus = prevStatusesSnapshot.get(t.id);
          if (prevStatus && prevStatus !== 'Disetujui' && t.status === 'Disetujui') {
            const notifEventId = `approved_${t.id}`;
            const isDismissed = typeof window.isNotifEventDismissed === 'function' && window.isNotifEventDismissed(notifEventId);
            const hasInServer = serverNotifsFetched.some(n => n.eventId === notifEventId || (n.ticketId === t.id && (n.type === 'disetujui' || n.type === 'persetujuan')));
            const notifs = (typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('kujang_notifications') || '[]') : []);
            const hasNotif = hasInServer || notifs.some(n => n.eventId === notifEventId || (n.ticketId === t.id && (n.type === 'disetujui' || n.type === 'persetujuan')));
            if (!hasNotif && !isDismissed && typeof window.createNotification === 'function') {
              window.createNotification({
                recipientRole: 'karyawan',
                recipientNip: t.applicantNip || 'PK-2024-8841',
                recipientName: t.applicantName || 'Budi Pratama, S.T.',
                actorSource: 'approver',
                type: 'disetujui',
                title: 'Pengajuan Disetujui',
                message: `Pengajuan izin Anda (#${t.id}) telah disetujui oleh ${t.approverName || 'Atasan'}. QR Code resmi siap digunakan.`,
                ticketId: t.id,
                priority: 'normal',
                eventId: notifEventId
              });
            }
          }
        });

        // Pertahankan tiket yang BARU dibuat secara lokal dan masih dalam antrean upload ke MySQL
        const serverIdSet = new Set(serverTickets.map(t => t.id));
        const localTicketsBefore = window.ticketsList || [];
        const pendingCreates = localTicketsBefore.filter(t => t && t.id && pendingCreateIds.has(t.id) && !serverIdSet.has(t.id));
        const mergedTickets = [...pendingCreates, ...serverTickets];

        // Perbarui peta referensi MySQL (MySQL selalu menjadi Single Source of Truth, termasuk jika tabel dikosongkan di phpMyAdmin)
        knownServerTicketHashes.clear();
        knownServerStatuses.clear();
        knownServerPendingExt.clear();
        serverTickets.forEach(t => {
          knownServerTicketHashes.set(t.id, computeSingleHash(t));
          knownServerStatuses.set(t.id, t.status);
          knownServerPendingExt.set(t.id, Boolean(t.hasExtensionPending || (t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan')));
          pendingCreateIds.delete(t.id);
        });
        hasInitialFetchCompleted = true;

        const currentHash = computeHash(window.ticketsList || []);
        const serverHash = computeHash(mergedTickets);

        // Jika data dari MySQL berbeda dengan data lokal saat ini (termasuk ketika dikosongkan di phpMyAdmin!)
        if (isInitial || currentHash !== serverHash) {
          console.log('[SyncEngine] Data tiket MySQL terdeteksi berubah, memperbarui tampilan...');
          window.ticketsList = mergedTickets;
          lastTicketsJson = serverHash;

          lastLocalSnapshotIds.clear();
          mergedTickets.forEach(t => { if (t && t.id) lastLocalSnapshotIds.add(t.id); });

          // Perbarui juga cache localStorage untuk ketahanan offline
          try {
            localStorage.setItem(window.STORAGE_KEY || 'KUJANG_GATEPASS_TICKETS_V9', JSON.stringify(mergedTickets));
          } catch (e) {}

          // Auto-close QR Sheet jika tiket yang sedang ditampilkan di layar karyawan sudah di-scan di pos jaga
          if (window.currentOpenedMobileQrTicketId) {
            const activeQrT = serverTickets.find(x => x.id === window.currentOpenedMobileQrTicketId);
            if (activeQrT && activeQrT.status !== 'Disetujui') {
              const gateName = activeQrT.scanOutGate ? ` di ${activeQrT.scanOutGate}` : '';
              window.currentOpenedMobileQrTicketId = null;
              if (typeof window.stopQrScanOutWatcher === 'function') {
                window.stopQrScanOutWatcher();
              }
              if (typeof window.mobileCloseSheet === 'function') {
                window.mobileCloseSheet();
              }
              if (typeof window.showToast === 'function') {
                window.showToast(`✅ Tiket #${activeQrT.id} berhasil dipindai oleh Pos Jaga${gateName}. Selamat jalan!`, 'success');
              }
              if (typeof window.renderMobileActiveView === 'function') {
                window.renderMobileActiveView();
              }
            }
          }

          // Auto-close Desktop QR Modal jika tiket yang sedang ditampilkan di layar laptop karyawan sudah di-scan di pos jaga
          if (window.currentOpenedDesktopQrTicketId) {
            const activeDesktopQrT = serverTickets.find(x => x.id === window.currentOpenedDesktopQrTicketId);
            if (activeDesktopQrT && activeDesktopQrT.status !== 'Disetujui') {
              const gateName = activeDesktopQrT.scanOutGate ? ` di ${activeDesktopQrT.scanOutGate}` : '';
              const tid = window.currentOpenedDesktopQrTicketId;
              window.currentOpenedDesktopQrTicketId = null;
              if (typeof window.stopDesktopQrScanOutWatcher === 'function') {
                window.stopDesktopQrScanOutWatcher();
              }
              const modalPass = document.getElementById('modalDigitalPassQR');
              if (modalPass) modalPass.classList.remove('open');
              const modalDetail = document.getElementById('modalTicketDetail');
              if (modalDetail) {
                if (typeof window.closeTicketDetailModal === 'function') window.closeTicketDetailModal();
                else {
                  modalDetail.classList.remove('open');
                  modalDetail.style.display = 'none';
                }
              }
              if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
              if (typeof window.refreshAllDashboardData === 'function') window.refreshAllDashboardData();
              if (typeof window.showToast === 'function') {
                window.showToast(`✅ Tiket #${tid} telah berhasil dipindai oleh Pos Jaga${gateName}. Selamat jalan!`, 'success');
              }
            }
          }

          // Refresh UI aktif sesuai modul yang tersedia
          refreshActiveViewSafely();
        }
      }
    } catch (err) {
      if (isInitial) {
        console.warn('[SyncEngine] Backend API MySQL belum dapat dijangkau, menggunakan data lokal.', err.message);
      }
      isApiOnline = false;
    } finally {
      isSyncing = false;
    }
  }

  // Helper Refresh UI Tanpa Gangguan
  function refreshActiveViewSafely() {
    try {
      const role = (typeof window.getCurrentRole === 'function' ? window.getCurrentRole() : (window.getCurrentMobileRole ? window.getCurrentMobileRole() : window.currentActor)) || 'karyawan';

      // 1. Dashboard & Charts
      if (typeof window.refreshAllDashboardData === 'function') {
        window.refreshAllDashboardData();
      } else if (typeof window.renderAllCharts === 'function') {
        window.renderAllCharts();
      }

      // 2. Tampilan Web Desktop per Aktor
      if (typeof window.renderKaryawanView === 'function') {
        window.renderKaryawanView();
      }
      if (typeof window.renderApproverView === 'function') {
        window.renderApproverView();
      }
      if (typeof window.renderSecurityView === 'function') {
        window.renderSecurityView();
      }
      if (typeof window.renderAdminView === 'function') {
        window.renderAdminView();
      }

      // 3. Tampilan Mobile HP (Auto-update kartu status, riwayat, antrean secara real-time)
      if (typeof window.renderMobileActiveView === 'function') {
        window.renderMobileActiveView();
      } else {
        if (typeof window.renderMobileKaryawan === 'function') window.renderMobileKaryawan();
        if (typeof window.renderMobileAtasan === 'function') window.renderMobileAtasan();
        if (typeof window.renderMobileSecurity === 'function') window.renderMobileSecurity();
      }

      // 4. Update Metrik & Badges
      if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
      if (typeof window.updateApproverMetrics === 'function') window.updateApproverMetrics();
      if (typeof window.updateSecurityMetrics === 'function') window.updateSecurityMetrics();
      if (typeof window.updateNotificationBadges === 'function') window.updateNotificationBadges();

    } catch (e) {
      console.warn('[SyncEngine] Error saat refresh UI otomatis:', e);
    }
  }

  // 3. Mengirim Perubahan Tiket ke Database MySQL saat saveTickets Dipanggil (Hanya Tiket Baru / Berubah)
  async function pushTicketChangesToMySQL(newTicketsList) {
    if (!newTicketsList || !Array.isArray(newTicketsList)) return;

    const tasks = [];
    mutationInFlight++;

    try {
      for (const t of newTicketsList) {
        if (!t || !t.id) continue;

        const currentTicketHash = computeSingleHash(t);
        const existedOnServer = knownServerTicketHashes.has(t.id);
        const isBrandNewLocal = !existedOnServer && (!lastLocalSnapshotIds.has(t.id) || pendingCreateIds.has(t.id));

        // Lewati jika tiket server tidak berubah sama sekali
        if (existedOnServer && knownServerTicketHashes.get(t.id) === currentTicketHash) {
          continue;
        }

        // Jangan sisipkan ulang tiket default/cache lama atau tiket yang sudah dihapus di phpMyAdmin
        if (!existedOnServer && !isBrandNewLocal) {
          continue;
        }

        if (isBrandNewLocal) {
          pendingCreateIds.add(t.id);
        }

        const wasPendingExt = Boolean(knownServerPendingExt.get(t.id));
        const isNowPendingExt = Boolean(
          (t.status === 'Sedang di Luar' || t.status === 'Terlambat') &&
          (t.hasExtensionPending || (t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan')) &&
          (!t.pendingExtension || !t.pendingExtension.status || t.pendingExtension.status === 'Menunggu Persetujuan')
        );
        let extensionResolvedStatus = '';
        if (wasPendingExt && !isNowPendingExt) {
          const lastTl = Array.isArray(t.timeline) && t.timeline.length > 0 ? t.timeline[t.timeline.length - 1] : null;
          const ev = String((lastTl && (lastTl.event || lastTl.title)) || '').toLowerCase();
          if (t.extensionApproved || ev.includes('perpanjangan waktu disetujui')) {
            extensionResolvedStatus = 'Disetujui';
          } else if (ev.includes('pembatalan') || ev.includes('batal')) {
            extensionResolvedStatus = 'Dibatalkan';
          } else {
            extensionResolvedStatus = 'Ditolak';
          }
        }

        const payload = {
          id: t.id,
          updateOnly: existedOnServer ? 1 : 0,
          applicantNip: t.applicantNip || t.karyawanNip || (t.pemohon && t.pemohon.nip),
          applicantName: t.applicantName || (t.pemohon && t.pemohon.nama),
          applicantPhone: t.applicantPhone || t.telepon,
          department: t.department || t.departemen,
          category: t.category || t.kategori,
          type: t.type || t.jenis,
          destination: t.destination || t.tujuan,
          reason: t.reason || t.keperluan || t.alasan,
          transportMode: t.transportMode || t.kendaraan,
          vehiclePlate: t.vehiclePlate || t.nomorPolisi,
          plannedExit: t.plannedExit || t.waktuKeluar,
          estimatedReturn: t.estimatedReturn || t.estimasiKembali,
          status: t.status,
          isLate: t.isLate ? 1 : 0,
          lateMinutes: t.lateMinutes || 0,
          tapInTime: t.tapInTime,
          tapInMember: t.tapInMember,
          tapInNip: t.tapInNip,
          arrivalReportedTime: t.arrivalReportedTime,
          arrivalReportedAt: t.arrivalReportedAt,
          timeFrozen: t.timeFrozen ? 1 : 0,
          isEmergency: t.isEmergency ? 1 : 0,
          isGroupDinas: t.isGroupDinas ? 1 : 0,
          members: t.members || [],
          approverNip: t.approverNip,
          approverName: t.approverName,
          approverTitle: t.approverTitle,
          approverNote: t.approverNote,
          approvedAt: t.approvedAt || null,
          rejectionReason: t.rejectionReason || t.rejectReason || null,
          cancellationReason: t.cancellationReason || null,
          emergencyAuthorizerNip: t.emergencyAuthorizerNip || null,
          emergencyAuthorizerName: t.emergencyAuthorizerName || null,
          emergencyAuthorizerPhone: t.emergencyAuthorizerPhone || null,
          emergencyAuthorizationNote: t.emergencyAuthorizationNote || null,
          emergencyVerifiedAt: t.emergencyVerifiedAt || null,
          hasExtensionPending: isNowPendingExt ? 1 : 0,
          pendingExtension: isNowPendingExt ? (t.pendingExtension || {
            newEstimatedReturn: t.extensionRequestedTime,
            reason: t.extensionReason || 'Perpanjangan waktu keluar',
            status: 'Menunggu Persetujuan'
          }) : null,
          extensionResolvedStatus: extensionResolvedStatus || null,
          scanOutGate: t.scanOutGate,
          securityOfficerOut: t.securityOfficerOut,
          scanOutTime: t.scanOutTime,
          scanInGate: t.scanInGate,
          securityOfficerIn: t.securityOfficerIn,
          scanInTime: t.scanInTime,
          timeline: t.timeline || [],
          documentName: t.documentName || (t.suratPerintah ? t.suratPerintah.name : null),
          documentUrl: t.documentUrl,
          deletedByKaryawan: t.deletedByKaryawan ? 1 : 0,
          deletedByKaryawanNips: Array.isArray(t.deletedByKaryawanNips) ? t.deletedByKaryawanNips : [],
          deletedByApprover1: t.deletedByApprover1 ? 1 : 0,
          deletedByApprover2: t.deletedByApprover2 ? 1 : 0,
          deletedByApproverNips: Array.isArray(t.deletedByApproverNips) ? t.deletedByApproverNips : [],
          deletedBySecurity: t.deletedBySecurity ? 1 : 0,
          deletedFromAudit: t.deletedFromAudit ? 1 : 0
        };

        const createPromise = fetch(`${API_BASE}/create_ticket.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(res => res.ok ? res.json() : null)
          .then(resJson => {
            if (resJson && resJson.success) {
              pendingCreateIds.delete(t.id);
              if (resJson.data && resJson.data.skippedDeleted) {
                knownServerTicketHashes.delete(t.id);
                knownServerStatuses.delete(t.id);
                knownServerPendingExt.delete(t.id);
              } else {
                knownServerTicketHashes.set(t.id, currentTicketHash);
                knownServerStatuses.set(t.id, t.status);
                knownServerPendingExt.set(t.id, isNowPendingExt);
              }
            }
          })
          .catch(e => console.warn('[SyncEngine] Gagal sync tiket individual:', e));
        tasks.push(createPromise);
      }

      if (tasks.length > 0) {
        await Promise.allSettled(tasks);
      }
    } catch (err) {
      console.warn('[SyncEngine] Gagal push perubahan ke MySQL:', err);
    } finally {
      setTimeout(() => {
        mutationInFlight = Math.max(0, mutationInFlight - 1);
      }, 600);
    }
  }

  // 4. Hook Transparan pada window.saveTickets (Zero-Breaking Change)
  function initSaveTicketsHook() {
    if (typeof window.saveTickets === 'function') {
      const originalSave = window.saveTickets;
      window.saveTickets = function (data) {
        originalSave(data);

        // Jika QR sheet mobile terbuka dan tiket yang di-save sudah bukan 'Disetujui'
        if (window.currentOpenedMobileQrTicketId) {
          const currentT = (data || []).find(x => x.id === window.currentOpenedMobileQrTicketId);
          if (currentT && currentT.status !== 'Disetujui') {
            const gateName = currentT.scanOutGate ? ` di ${currentT.scanOutGate}` : '';
            window.currentOpenedMobileQrTicketId = null;
            if (typeof window.stopQrScanOutWatcher === 'function') window.stopQrScanOutWatcher();
            if (typeof window.mobileCloseSheet === 'function') window.mobileCloseSheet();
            if (typeof window.showToast === 'function') {
              window.showToast(`✅ Tiket telah berhasil dipindai oleh Pos Jaga${gateName}. Selamat jalan!`, 'success');
            }
          }
        }

        // Jika Desktop QR modal terbuka dan tiket yang di-save sudah bukan 'Disetujui'
        if (window.currentOpenedDesktopQrTicketId) {
          const currentDesktopT = (data || []).find(x => x.id === window.currentOpenedDesktopQrTicketId);
          if (currentDesktopT && currentDesktopT.status !== 'Disetujui') {
            const gateName = currentDesktopT.scanOutGate ? ` di ${currentDesktopT.scanOutGate}` : '';
            const tid = window.currentOpenedDesktopQrTicketId;
            window.currentOpenedDesktopQrTicketId = null;
            if (typeof window.stopDesktopQrScanOutWatcher === 'function') window.stopDesktopQrScanOutWatcher();
            const modalPass = document.getElementById('modalDigitalPassQR');
            if (modalPass) modalPass.classList.remove('open');
            const modalDetail = document.getElementById('modalTicketDetail');
            if (modalDetail) {
              if (typeof window.closeTicketDetailModal === 'function') window.closeTicketDetailModal();
              else {
                modalDetail.classList.remove('open');
                modalDetail.style.display = 'none';
              }
            }
            if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
            if (typeof window.refreshAllDashboardData === 'function') window.refreshAllDashboardData();
            if (typeof window.showToast === 'function') {
              window.showToast(`✅ Tiket #${tid} telah berhasil dipindai oleh Pos Jaga${gateName}. Selamat jalan!`, 'success');
            }
          }
        }

        pushTicketChangesToMySQL(data);
        lastLocalSnapshotIds.clear();
        (data || []).forEach(item => { if (item && item.id) lastLocalSnapshotIds.add(item.id); });
      };
      console.log('[SyncEngine] Hook window.saveTickets berhasil diaktifkan.');
    }
  }

  // 5. Polling Real-time Sinkronisasi (Dinamis: 1.2 detik saat QR terbuka, 4 detik normal)
  function startBackgroundPolling() {
    if (pollIntervalTimer) clearTimeout(pollIntervalTimer);

    const scheduleNext = () => {
      const delay = (window.currentOpenedMobileQrTicketId || window.currentOpenedDesktopQrTicketId) ? 1200 : 4000;
      pollIntervalTimer = setTimeout(async () => {
        if (!document.hidden) {
          await fetchTicketsFromMySQL(false);
        }
        scheduleNext();
      }, delay);
    };

    scheduleNext();
  }

  // 6. Jalankan Inisialisasi Saat DOM Siap
  function initSyncEngine() {
    lastLocalSnapshotIds.clear();
    (window.ticketsList || []).forEach(t => { if (t && t.id) lastLocalSnapshotIds.add(t.id); });
    initSaveTicketsHook();
    fetchTicketsFromMySQL(true);
    startBackgroundPolling();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSyncEngine);
  } else {
    initSyncEngine();
  }

  // 3b. Soft Delete Riwayat Batch / Single ke MySQL (Semua Aktor: Karyawan, Atasan, Pos Jaga, Admin)
  async function softDeleteTickets(ticketIds, role, nip) {
    const ids = Array.isArray(ticketIds) ? ticketIds.filter(Boolean) : (ticketIds ? [ticketIds] : []);
    if (ids.length === 0) return;
    softDeleteInFlight++;
    try {
      await fetch(`${API_BASE}/delete_ticket.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'soft_delete',
          ticketIds: ids,
          role: role || 'karyawan',
          nip: nip || ''
        })
      });
    } catch (e) {
      console.warn('[SyncEngine] Gagal sinkronisasi soft delete riwayat ke MySQL:', e);
    } finally {
      setTimeout(() => {
        softDeleteInFlight = Math.max(0, softDeleteInFlight - 1);
      }, 400);
    }
  }

  // 3c. Direct Ticket Lifecycle Action Sync Helper (Lock polling during update_ticket.php)
  async function callUpdateTicket(payload) {
    if (!payload || !payload.ticketId || !payload.action) return null;
    mutationInFlight++;
    try {
      const res = await fetch(`${API_BASE}/update_ticket.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = res.ok ? await res.json() : null;
      if (json && json.success && Array.isArray(window.ticketsList)) {
        const localT = window.ticketsList.find(x => x && x.id === payload.ticketId);
        if (localT) {
          knownServerTicketHashes.set(localT.id, computeSingleHash(localT));
          knownServerStatuses.set(localT.id, localT.status);
          knownServerPendingExt.set(
            localT.id,
            Boolean(localT.hasExtensionPending || (localT.pendingExtension && localT.pendingExtension.status === 'Menunggu Persetujuan'))
          );
        }
      }
      return json;
    } catch (e) {
      console.warn('[SyncEngine] callUpdateTicket gagal:', payload.action, e);
      return null;
    } finally {
      setTimeout(() => {
        mutationInFlight = Math.max(0, mutationInFlight - 1);
      }, 350);
    }
  }

  // Expose untuk kontrol manual / debugging jika diperlukan
  window.SyncEngine = {
    fetchFromMySQL: fetchTicketsFromMySQL,
    pushToMySQL: pushTicketChangesToMySQL,
    softDeleteTickets: softDeleteTickets,
    callUpdateTicket: callUpdateTicket,
    getApiUrl: () => API_BASE,
    isOnline: () => isApiOnline,
    isInitialFetchDone: () => hasInitialFetchCompleted
  };

})();
