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
  let lastTicketsJson = '';
  let pollIntervalTimer = null;

  console.log(`[SyncEngine] Menghubungkan ke API Laragon MySQL di: ${API_BASE}`);

  // Helper Komparasi Ringan
  function computeHash(tickets) {
    if (!tickets || !Array.isArray(tickets)) return '';
    return tickets.map(t => `${t.id}:${t.status}:${t.scanOutTime || ''}:${t.scanInTime || ''}:${t.tapInTime || ''}:${t.lateMinutes || 0}:${t.approverNote || ''}:${t.timeline ? t.timeline.length : 0}`).join('|');
  }

  // 2. Fetch Tiket dari Database MySQL
  async function fetchTicketsFromMySQL(isInitial = false) {
    if (isSyncing) return;
    isSyncing = true;

    try {
      const response = await fetch(`${API_BASE}/get_tickets.php`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const resJson = await response.json();
      if (resJson && resJson.success && Array.isArray(resJson.data)) {
        isApiOnline = true;
        const serverTickets = resJson.data;
        const currentHash = computeHash(window.ticketsList || []);
        const serverHash = computeHash(serverTickets);

        // Jika data dari MySQL berbeda dengan data lokal saat ini
        if (isInitial || currentHash !== serverHash) {
          console.log('[SyncEngine] Data tiket MySQL terdeteksi berubah, memperbarui tampilan...');
          window.ticketsList = serverTickets;
          lastTicketsJson = serverHash;

          // Perbarui juga cache localStorage untuk ketahanan offline
          try {
            if (window.STORAGE_KEY) {
              localStorage.setItem(window.STORAGE_KEY, JSON.stringify(serverTickets));
            }
          } catch (e) {}

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
      const role = (typeof window.getCurrentRole === 'function' ? window.getCurrentRole() : window.currentActor) || 'karyawan';

      // 1. Dashboard & Charts
      if (typeof window.refreshAllDashboardData === 'function') {
        window.refreshAllDashboardData();
      } else if (typeof window.renderAllCharts === 'function') {
        window.renderAllCharts();
      }

      // 2. Tampilan Web Desktop per Aktor
      if (role === 'karyawan' && typeof window.renderKaryawanView === 'function') {
        window.renderKaryawanView();
      } else if ((role === 'approver' || role === 'approver2') && typeof window.renderApproverView === 'function') {
        window.renderApproverView();
      } else if (role === 'security' && typeof window.renderSecurityView === 'function') {
        window.renderSecurityView();
      } else if (role === 'admin' && typeof window.renderAdminView === 'function') {
        window.renderAdminView();
      }

      // 3. Tampilan Mobile HP
      if (typeof window.renderMobileKaryawanTickets === 'function') {
        window.renderMobileKaryawanTickets();
      }
      if (typeof window.renderMobileApproverPendingTickets === 'function') {
        window.renderMobileApproverPendingTickets();
      }
      if (typeof window.renderMobileSecurityActiveTickets === 'function') {
        window.renderMobileSecurityActiveTickets();
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

  // 3. Mengirim Perubahan Tiket ke Database MySQL saat saveTickets Dipanggil
  async function pushTicketChangesToMySQL(newTicketsList) {
    if (!newTicketsList || !Array.isArray(newTicketsList)) return;

    try {
      for (const t of newTicketsList) {
        if (!t || !t.id) continue;

        const payload = {
          id: t.id,
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
          scanOutGate: t.scanOutGate,
          securityOfficerOut: t.securityOfficerOut,
          scanOutTime: t.scanOutTime,
          scanInGate: t.scanInGate,
          securityOfficerIn: t.securityOfficerIn,
          scanInTime: t.scanInTime,
          timeline: t.timeline || [],
          documentName: t.documentName || (t.suratPerintah ? t.suratPerintah.name : null),
          documentUrl: t.documentUrl
        };

        fetch(`${API_BASE}/create_ticket.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(e => console.warn('[SyncEngine] Gagal sync tiket individual:', e));
      }
    } catch (err) {
      console.warn('[SyncEngine] Gagal push perubahan ke MySQL:', err);
    }
  }

  // 4. Hook Transparan pada window.saveTickets (Zero-Breaking Change)
  function initSaveTicketsHook() {
    if (typeof window.saveTickets === 'function') {
      const originalSave = window.saveTickets;
      window.saveTickets = function (data) {
        originalSave(data);
        pushTicketChangesToMySQL(data);
      };
      console.log('[SyncEngine] Hook window.saveTickets berhasil diaktifkan.');
    }
  }

  // 5. Polling Real-time Sinkronisasi (Setiap 4 Detik)
  function startBackgroundPolling() {
    if (pollIntervalTimer) clearInterval(pollIntervalTimer);

    pollIntervalTimer = setInterval(() => {
      if (!document.hidden) {
        fetchTicketsFromMySQL(false);
      }
    }, 4000);
  }

  // 6. Jalankan Inisialisasi Saat DOM Siap
  function initSyncEngine() {
    initSaveTicketsHook();
    fetchTicketsFromMySQL(true);
    startBackgroundPolling();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSyncEngine);
  } else {
    initSyncEngine();
  }

  // Expose untuk kontrol manual / debugging jika diperlukan
  window.SyncEngine = {
    fetchFromMySQL: fetchTicketsFromMySQL,
    pushToMySQL: pushTicketChangesToMySQL,
    getApiUrl: () => API_BASE,
    isOnline: () => isApiOnline
  };

})();
