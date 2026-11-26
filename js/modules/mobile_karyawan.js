/**
 * SISTEM PERIZINAN KELUAR AREA - PT PUPUK KUJANG CIKAMPEK
 * MODULE: MOBILE KARYAWAN (Ref: Figma PDF Karyawan Hal 1 - 14)
 * 100% PARITAS LOGIKA & ALUR SISTEM DENGAN PC (DESKTOP)
 */

(function () {
  'use strict';

  let currentKaryawanTab = 'dashboard'; // 'dashboard' | 'pengajuan' | 'riwayat' | 'form_pengajuan'
  let currentFormIsEmergency = false;
  let currentFormPrefill = null;
  let formPreviousTab = 'pengajuan';
  let currentSegment = 'ringkasan';
  let mobileDonutPeriod = 'month'; // 'month' | 'today' | 'all' // 'ringkasan' | 'donut'
  let riwayatSearchQuery = '';
  let riwayatStatusFilter = 'all';
  let riwayatStartDate = '';
  let riwayatEndDate = '';
  let currentRiwayatView = 'card';
  let isRiwayatFilterOpen = false;
  let currentRiwayatPage = 1;
  const riwayatPageSize = 6;
  let riwayatSearchDebounceTimer = null;
  let selectedApproverData = null;
  let pendingMobileFormData = null;
  let isSubmittingMobilePermit = false;
  let isSubmittingPerpanjangan = false;
  window.currentMobileFormStep = 1;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  }

  // -------------------------------------------------------------------
  // HELPER USER & TICKET GETTERS
  // -------------------------------------------------------------------
  function getActiveEmp() {
    if (typeof window.getCurrentEmployeeActor === 'function') {
      const actor = window.getCurrentEmployeeActor();
      return {
        name: actor.name || 'Budi Pratama, S.T.',
        nip: actor.nip || 'PK-2024-8841',
        role: actor.role || actor.title || 'Staf Rekayasa Mesin',
        dept: actor.department || 'Departemen Rekayasa & Pemeliharaan'
      };
    }
    return {
      name: 'Budi Pratama, S.T.',
      nip: 'PK-2024-8841',
      role: 'Staf Rekayasa Mesin',
      dept: 'Departemen Rekayasa & Pemeliharaan'
    };
  }

  function getTName(t) { return t.applicantName || t.employeeName || 'Budi Pratama, S.T.'; }
  function getTNip(t) { return t.applicantNip || t.employeeNip || 'PK-2024-8841'; }
  function getTType(t) { return formatTipeKepulanganDisplay(t.type || t.returnType || 'Kembali ke Area'); }
  function getTTransport(t) { return t.transportMode || t.transportation || 'Kendaraan dinas'; }
  function formatTipeKepulanganDisplay(type) {
    if (!type) return 'Kembali ke Area';
    const s = String(type).trim();
    if (s === 'Pulang Mendahului' || s.includes('Pulang Mendahului') || s.includes('Pulang Lebih Awal') || s.includes('Tidak Kembali')) {
      return 'Pulang Lebih Awal';
    }
    return s;
  }

  function getTReturnTime(t) {
    let ret = t.estimatedReturn || t.plannedReturn || '';
    if (typeof window.normalizeReturnDateTime === 'function') {
      ret = window.normalizeReturnDateTime(ret);
    } else if (ret && ret.includes('20') && (ret.match(/\d{4}-\d{2}-\d{2}/g) || []).length > 1) {
      const lastIdx = ret.lastIndexOf('20');
      if (lastIdx > 0) ret = ret.slice(lastIdx);
    }
    return ret;
  }
  function getTExitTime(t) { return t.plannedExit || ''; }

  function getAllEmpTickets() {
    const emp = getActiveEmp();
    const tickets = window.ticketsList || [];
    const myNip = emp.nip || 'PK-2024-8841';
    return tickets.filter(t => (
      t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841') || (myNip === 'PK-2024-8841' && (!t.applicantNip || t.applicantNip === 'PK-2024-8841')) ||
      (Array.isArray(t.members) && t.members.some(m => m.nip === myNip))
    ));
  }

  function getEmpTickets() {
    const emp = getActiveEmp();
    const tickets = window.ticketsList || [];
    const myNip = emp.nip || 'PK-2024-8841';
    return tickets.filter(t => {
      const isFinished = (t.status === 'Selesai' || t.status === 'Selesai (Terlambat)' || (typeof t.status === 'string' && t.status.startsWith('Selesai')) || t.status === 'Ditolak' || t.status === 'Dibatalkan' || t.status === 'Kedaluwarsa');
      const isDelEmp = (typeof window.isTicketDeletedByKaryawan === 'function') ? window.isTicketDeletedByKaryawan(t, myNip) : Boolean(t.deletedByKaryawan);
      const isDeleted = isFinished && isDelEmp;
      if (isDeleted) return false;
      return (
        t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841') || (myNip === 'PK-2024-8841' && (!t.applicantNip || t.applicantNip === 'PK-2024-8841')) ||
        (Array.isArray(t.members) && t.members.some(m => m.nip === myNip))
      );
    });
  }

  function getActiveTicket() {
    const emp = getActiveEmp();
    const tickets = getEmpTickets();

    if (typeof window.getActiveTicket === 'function') {
      return window.getActiveTicket(emp.nip);
    }
    return tickets.find(t =>
      t.status !== 'Dibatalkan' &&
      t.status !== 'Ditolak' &&
      t.status !== 'Selesai' &&
      t.status !== 'Kedaluwarsa' &&
      (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat' || t.status === 'Disetujui' || t.status === 'Sedang di Luar' || t.status === 'Terlambat' || t.status === 'Menunggu Verifikasi Atasan' || t.status === 'Menunggu Bukti Kedatangan')
    );
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return '-';
    let raw = String(dateStr).replace(/\s*\(Pos.*?\)/gi, '').trim();
    if (typeof window.normalizeReturnDateTime === 'function') {
      raw = window.normalizeReturnDateTime(raw);
    } else if (raw.includes('20') && (raw.match(/\d{4}-\d{2}-\d{2}/g) || []).length > 1) {
      const lastIdx = raw.lastIndexOf('20');
      if (lastIdx > 0) raw = raw.slice(lastIdx);
    }
    if ((raw.includes('Okt') || raw.includes('WIB') || raw.includes('Jan') || raw.includes('Feb') || raw.includes('Mar')) && !raw.includes(':00')) {
      return raw.replace(/(\d{1,2}):(\d{2})(\s*WIB)?/gi, '$1.$2 WIB');
    }
    if (typeof window.formatDisplayDate === 'function') {
      return window.formatDisplayDate(raw).replace(/(\d{1,2}):(\d{2})(\s*WIB)?/gi, '$1.$2 WIB');
    }
    try {
      let parseStr = raw.replace(/(\d{4}-\d{2}-\d{2})[T ](\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?/, '$1T$2:$3:00');
      const dt = new Date(parseStr);
      if (!isNaN(dt.getTime())) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const pad = n => String(n).padStart(2, '0');
        return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}, ${pad(dt.getHours())}.${pad(dt.getMinutes())} WIB`;
      }
    } catch (e) { }
    return raw.replace(/(\d{1,2}):(\d{2})/g, '$1.$2 WIB');
  }

  function formatDateTimeLocal(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function formatTimeOnly(timeStr) {
    if (!timeStr) return '';
    if (timeStr.includes('T')) {
      const m = timeStr.split('T')[1].match(/^(\d{1,2})[:.](\d{2})/);
      if (m) return `${m[1]}.${m[2]} WIB`;
    }
    const match = timeStr.match(/(\d{1,2})[:.](\d{2})/);
    return match ? `${match[1].padStart(2, '0')}.${match[2]} WIB` : timeStr;
  }

  function getBadgeClass(status) {
    const s = (status || '').toLowerCase();
    if (s.includes('menunggu')) return 'menunggu';
    if (s.includes('disetujui')) return 'disetujui';
    if (s.includes('sedang')) return 'sedang-di-luar';
    if (s.includes('terlambat')) return 'terlambat';
    if (s.includes('selesai')) return 'selesai';
    if (s.includes('tolak')) return 'ditolak';
    if (s.includes('batal')) return 'dibatalkan';
    if (s.includes('daluwarsa')) return 'kedaluwarsa';
    return 'menunggu';
  }

  function getMobileStatusBadge(t) {
    if (!t) return `<span class="mobile-badge selesai">Selesai</span>`;
    const status = t.status || 'Selesai';
    const isLateCompleted = (status === 'Selesai') && (t.isLate || (t.scanInTime && t.scanInTime.includes('[Terlambat]')) || (t.lateMinutes > 0));

    if (isLateCompleted) {
      return `<span class="mobile-badge selesai-terlambat" style="background: #fef3c7; color: #b45309; border: 1.2px solid #fde68a; font-weight: 800; white-space: nowrap;">Selesai (Terlambat)</span>`;
    }
    if (status === 'Terlambat') {
      return `<span class="mobile-badge terlambat" style="background: #fee2e2; color: #dc2626; border: 1.2px solid #fca5a5; font-weight: 800; white-space: nowrap;">Sedang di Luar (Terlambat)</span>`;
    }
    return `<span class="mobile-badge ${getBadgeClass(status)}">${status}</span>`;
  }

  function getMobileApprovers() {
    return [
      { name: 'Ir. Hendra Gunawan, M.T.', title: 'Manajer Rekayasa & Pemeliharaan', department: 'Departemen Rekayasa & Pemeliharaan', initials: 'HG', avatarBg: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', nip: 'PK-2015-1002' },
      { name: 'Dewi Sartika, S.T., M.M.', title: 'VP Operasional & Pemeliharaan', department: 'Departemen Rekayasa & Pemeliharaan', initials: 'DS', avatarBg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', nip: 'PK-2012-0845' },
      { name: 'Agus Setiawan, S.T.', title: 'Supervisor Instrumen & Kelistrikan', department: 'Departemen Rekayasa & Pemeliharaan', initials: 'AS', avatarBg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', nip: 'PK-2018-4421' },
      { name: 'Dr. Ir. Bambang Hermanto', title: 'Kepala Divisi Teknologi & Rekayasa', department: 'Direktorat Operasi Pabrik', initials: 'BH', avatarBg: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)', nip: 'PK-2010-0112' },
      { name: 'Siti Nurhaliza, M.T.', title: 'Kepala Bagian Pemeliharaan Mekanikal', department: 'Departemen Rekayasa & Pemeliharaan', initials: 'SN', avatarBg: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)', nip: 'PK-2019-5510' },
      { name: 'Rahmat Hidayat, S.T.', title: 'Kepala Bagian Inspeksi Pabrik', department: 'Departemen Rekayasa & Pemeliharaan', initials: 'RH', avatarBg: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)', nip: 'PK-2017-3891' },
      { name: 'Ir. Ahmad Zulkifli', title: 'General Manager Produksi Pabrik 1B', department: 'Direktorat Produksi', initials: 'AZ', avatarBg: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', nip: 'PK-2011-0422' },
      { name: 'Budi Santoso, S.Kom.', title: 'Manajer Keamanan & Sistem Informasi', department: 'Departemen TI & Pengamanan', initials: 'BS', avatarBg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', nip: 'PK-2015-2881' }
    ];
  }

  // Expose tab aktif secara global untuk pengamanan sinkronisasi
  window.getCurrentKaryawanTab = function() {
    return currentKaryawanTab;
  };

  // -------------------------------------------------------------------
  // 1. RENDER KARYAWAN MAIN VIEW
  // -------------------------------------------------------------------
  function renderMobileKaryawan(container, targetTab) {
    if (targetTab) {
      currentKaryawanTab = targetTab;
      if (currentKaryawanTab === 'form_pengajuan') {
        try {
          const emgVal = sessionStorage.getItem('KUJANG_FORM_IS_EMERGENCY');
          if (emgVal !== null) currentFormIsEmergency = (emgVal === '1');
        } catch (e) {}
      }
    }
    if (!container) container = document.getElementById('mobileMainContent');
    if (!container) return;

    // GUARD: Jika mobile sedang aktif sebagai Approver atau Security, dilarang menimpa mobileMainContent
    const activeRole = (typeof window.getCurrentMobileRole === 'function' ? window.getCurrentMobileRole() : (window.currentMobileRole || window.currentActor));
    if (activeRole && !['karyawan', 'karyawan2'].includes(activeRole)) {
      return;
    }

    if (currentKaryawanTab === 'dashboard') {
      renderDashboard(container);
    } else if (currentKaryawanTab === 'pengajuan') {
      renderPengajuan(container);
    } else if (currentKaryawanTab === 'riwayat') {
      renderRiwayat(container);
    } else if (currentKaryawanTab === 'form_pengajuan') {
      // PROTEKSI: Jika formulir pengajuan sudah tampil dan ini adalah background refresh (tanpa targetTab eksplisit),
      // DILARANG merender ulang agar seluruh ketikan pengguna tidak terhapus.
      const hasActiveForm = container && (container.querySelector('#mFormReason') || container.querySelector('#mFormDestination'));
      if (!targetTab && hasActiveForm) {
        return;
      }
      renderKaryawanPengajuanFullPage(container, currentFormIsEmergency, currentFormPrefill);
    }
  }

  // -------------------------------------------------------------------
  // 2. DASHBOARD KARYAWAN (100% PARITAS DENGAN PC)
  // -------------------------------------------------------------------
  function renderDashboard(container) {
    const emp = getActiveEmp();
    const allEmpTickets = getAllEmpTickets();
    const tickets = getEmpTickets();
    const activeTicket = getActiveTicket();
    const approver = (typeof window.getPrimaryApprover === 'function')
      ? window.getPrimaryApprover()
      : { name: 'Ir. Hendra Gunawan, M.T.' };

    const monthEmpTickets = allEmpTickets.filter(t =>
      typeof window.matchesPeriodFilter === 'function' ? window.matchesPeriodFilter(t, 'month') : true
    );
    const totalCount = monthEmpTickets.length;
    const completedTickets = monthEmpTickets.filter(t => t.status === 'Selesai');
    const selesaiCount = completedTickets.length;
    const lateCompleted = completedTickets.filter(t => t.isLate || (t.approverNote && t.approverNote.toLowerCase().includes('terlambat'))).length;
    const tepatWaktuCount = Math.max(0, selesaiCount - lateCompleted);
    const activeCount = activeTicket ? 1 : 0;
    const terlambatCount = monthEmpTickets.filter(t => t.status === 'Terlambat' || (t.status === 'Selesai' && ((t.lateMinutes && t.lateMinutes > 0) || (t.scanInTime || '').includes('[Terlambat]')))).length;

    // Greeting by time of day (matching PC)
    const nowH = new Date().getHours();
    let timeGreeting = 'pagi';
    if (nowH >= 11 && nowH < 15) timeGreeting = 'siang';
    else if (nowH >= 15 && nowH < 18) timeGreeting = 'sore';
    else if (nowH >= 18 || nowH < 5) timeGreeting = 'malam';

    // Dynamic Active Strip in Hero (100% Parity with PC figmaHeroStrip)
    let activeStripHtml = '';
    if (activeTicket) {
      if (activeTicket.status === 'Menunggu Persetujuan' || activeTicket.status === 'Menunggu Otorisasi Darurat') {
        activeStripHtml = `
          <div class="mobile-active-strip" style="background: rgba(245, 158, 11, 0.16); border: 1px solid rgba(245, 158, 11, 0.45);">
            <div class="mobile-active-strip-head">
              <span class="mobile-active-strip-title" style="color: #fef08a;">
                Status: Izin Diajukan — ${activeTicket.id}
              </span>
              <span class="mobile-active-strip-badge" style="background: #f59e0b; color: #78350f;">Menunggu Persetujuan</span>
            </div>
            <div class="mobile-active-strip-desc" style="color: #fef3c7;">
              ${activeTicket.category || 'Dinas Kantor'} — Menunggu Persetujuan Atasan (${activeTicket.approverName || approver.name})
            </div>
          </div>
        `;
      } else if (activeTicket.status === 'Disetujui') {
        activeStripHtml = `
          <div class="mobile-active-strip" style="background: rgba(16, 185, 129, 0.18); border: 1px solid rgba(16, 185, 129, 0.45);">
            <div class="mobile-active-strip-head">
              <span class="mobile-active-strip-title" style="color: #a7f3d0;">
                Status: Izin Disetujui — ${activeTicket.id}
              </span>
              <span class="mobile-active-strip-badge" style="background: #10b981; color: #064e3b;">Disetujui</span>
            </div>
            <div class="mobile-active-strip-desc" style="color: #d1fae5;">
              ${activeTicket.category || 'Dinas Kantor'} — QR Siap Digunakan di Pos Gerbang — Jadwal Keluar ${activeTicket.plannedExit ? formatTimeOnly(activeTicket.plannedExit) : ''}
            </div>
          </div>
        `;
      } else if (activeTicket.status === 'Sedang di Luar') {
        activeStripHtml = `
          <div class="mobile-active-strip" style="background: rgba(2, 132, 199, 0.18); border: 1px solid rgba(2, 132, 199, 0.45);">
            <div class="mobile-active-strip-head">
              <span class="mobile-active-strip-title" style="color: #bae6fd;">
                Status: Izin Aktif — ${activeTicket.id}
              </span>
              <span class="mobile-active-strip-badge" style="background: #0284c7; color: #ffffff;">Sedang di Luar</span>
            </div>
            <div class="mobile-active-strip-desc" style="color: #e0f2fe;">
              ${activeTicket.category || 'Dinas Kantor'} — Scan Out ${activeTicket.scanOutTime ? formatTimeOnly(activeTicket.scanOutTime) : '10.05 WIB'} — ${activeTicket.type === 'Pulang Mendahului' ? 'Pulang Lebih Awal' : 'Batas kembali ' + (getTReturnTime(activeTicket) ? formatTimeOnly(getTReturnTime(activeTicket)) : '13.00 WIB')}
            </div>
          </div>
        `;
      } else if (activeTicket.status === 'Terlambat') {
        activeStripHtml = `
          <div class="mobile-active-strip" style="background: rgba(239, 68, 68, 0.22); border: 1px solid rgba(239, 68, 68, 0.5);">
            <div class="mobile-active-strip-head">
              <span class="mobile-active-strip-title" style="color: #fca5a5;">
                Status: Terlambat Kembali — ${activeTicket.id}
              </span>
              <span class="mobile-active-strip-badge" style="background: #dc2626; color: #ffffff;">Terlambat</span>
            </div>
            <div class="mobile-active-strip-desc" style="color: #fee2e2;">
              ${activeTicket.category} — Batas waktu TELAH TERLEWAT! Segera Tap In di Pos Gerbang.
            </div>
          </div>
        `;
      } else if (activeTicket.status === 'Menunggu Bukti Kedatangan') {
        activeStripHtml = `
          <div class="mobile-active-strip" style="background: rgba(239, 68, 68, 0.22); border: 1px solid rgba(239, 68, 68, 0.5);">
            <div class="mobile-active-strip-head">
              <span class="mobile-active-strip-title" style="color: #fca5a5;">
                Status: Menunggu Bukti Kedatangan — ${activeTicket.id}
              </span>
              <span class="mobile-active-strip-badge" style="background: #dc2626; color: #ffffff;">Butuh Bukti</span>
            </div>
            <div class="mobile-active-strip-desc" style="color: #fee2e2;">
              Atasan (${escapeHtml(activeTicket.arrivalRejectBy || approver.name)}) menandai Belum Tiba. Wajib unggah foto bukti real-time.
            </div>
          </div>
        `;
      } else if (activeTicket.status === 'Menunggu Verifikasi Atasan') {
        activeStripHtml = `
          <div class="mobile-active-strip" style="background: rgba(37, 99, 235, 0.18); border: 1px solid rgba(37, 99, 235, 0.45);">
            <div class="mobile-active-strip-head">
              <span class="mobile-active-strip-title" style="color: #93c5fd;">
                Status: Menunggu Verifikasi Atasan — ${activeTicket.id}
              </span>
              <span class="mobile-active-strip-badge" style="background: #2563eb; color: #ffffff;">Verifikasi</span>
            </div>
            <div class="mobile-active-strip-desc" style="color: #dbeafe;">
              Laporan kedatangan tercatat. Menunggu verifikasi kehadiran fisik oleh Atasan (${escapeHtml(activeTicket.approverName || approver.name)}).
            </div>
          </div>
        `;
      }
    } else {
      activeStripHtml = '';
    }

    // Recent 2 tickets
    const recentTickets = [...tickets]
      .filter(t => !activeTicket || t.id !== activeTicket.id)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 2);

    const emergencyTickets = tickets.filter(t => t.isEmergency || (t.id && t.id.includes('-EMG-')) || t.category === 'Izin Darurat' || t.status === 'Menunggu Otorisasi Darurat');
    const emergencyActive = emergencyTickets.filter(t => t.status !== 'Selesai' && t.status !== 'Ditolak' && t.status !== 'Dibatalkan').length;
    const emergencyFinished = emergencyTickets.filter(t => t.status === 'Selesai').length;

    let recentHtml = recentTickets.map(t => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
        <div>
          <div style="font-size: 0.8rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 6px;"><span>${t.id}</span> ${getMobileStatusBadge(t)}</div>
          <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">${t.category} • ${t.destination || 'Area Pabrik'}</div>
        </div>
        <button type="button" class="mobile-btn-secondary" title="Detail Pengajuan" aria-label="Detail Pengajuan" style="width: 32px; height: 32px; min-width: 32px; min-height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 1.5px solid #cbd5e1; background: #ffffff; color: #475569; border-radius: 8px; flex-shrink: 0; cursor: pointer;  box-shadow: 0 1px 2px rgba(0,0,0,0.04);" onclick="window.mobileOpenTicketDetail('${t.id}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg></button>
      </div>
    `).join('');

    // Donut SVG calculations with dynamic period filtering (100% full coverage, NO white gaps)
    const isEmg = (item) => Boolean(item.isEmergency || (item.id && (item.id.includes('-EMG-') || item.id.startsWith('TK-EMG'))) || (item.category && item.category.toLowerCase().includes('darurat')));
    const donutFilteredTickets = allEmpTickets.filter(item => {
      if (typeof window.matchesPeriodFilter === 'function') {
        return window.matchesPeriodFilter(item, mobileDonutPeriod);
      }
      return true;
    });

    const donutTotal = donutFilteredTickets.length;
    const donutEmg = donutFilteredTickets.filter(isEmg).length;
    const donutSelesai = Math.max(0, donutTotal - donutEmg);

    const selesaiPct = donutTotal ? Math.round((donutSelesai / donutTotal) * 1000) / 10 : 0;
    const emgPct = donutTotal ? Math.round((donutEmg / donutTotal) * 1000) / 10 : 0;

    const strokeDash = 239; // 2 * PI * 38
    let selesaiLen = donutTotal ? Math.round((donutSelesai / donutTotal) * strokeDash) : 0;
    let emgLen = donutTotal ? Math.max(0, strokeDash - selesaiLen) : 0;

    container.innerHTML = `
      <!-- Hero Card Profile -->
      <section class="mobile-hero-card">
        <div class="mobile-hero-greeting-sub">Selamat ${timeGreeting},</div>
        <h2 class="mobile-hero-name">${emp.name}</h2>
        <div class="mobile-hero-role">${emp.role || 'Staf Rekayasa Mesin'}</div>
        <div class="mobile-hero-meta">${emp.dept || 'Departemen Rekayasa & Pemeliharaan'}</div>
        <div class="mobile-hero-meta">Atasan: ${approver.name || 'Ir. Hendra Gunawan, M.T.'}</div>

        ${activeTicket ? `
          <button type="button" class="mobile-hero-btn" style="margin-top: 14px;" onclick="window.mobileSwitchTab('pengajuan')">
            <span>Pengajuan Saya</span>
          </button>
        ` : `
          <button type="button" class="mobile-hero-btn" style="margin-top: 14px;" onclick="window.mobileSwitchTab('pengajuan')">
            <span>+ Buat Pengajuan</span>
          </button>
        `}
      </section>

      <!-- Switcher Segment: Ringkasan Perizinan | Total Pengajuan Izin (A2: Hijau Teks Putih) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
        <button type="button" id="mBtnSegRingkasan" style="height: 38px; border-radius: 8px; font-weight: 700; font-size: 0.775rem; border: 1.5px solid #059669; background: ${currentSegment === 'ringkasan' ? '#059669' : '#ffffff'}; color: ${currentSegment === 'ringkasan' ? '#ffffff' : '#059669'}; cursor: pointer; transition: all 0.2s;" onclick="window.mobileSwitchSegment('ringkasan')">
          Ringkasan Perizinan
        </button>
        <button type="button" id="mBtnSegDonut" style="height: 38px; border-radius: 8px; font-weight: 700; font-size: 0.775rem; border: 1.5px solid #059669; background: ${currentSegment === 'donut' ? '#059669' : '#ffffff'}; color: ${currentSegment === 'donut' ? '#ffffff' : '#059669'}; cursor: pointer; transition: all 0.2s;" onclick="window.mobileSwitchSegment('donut')">
          Total Pengajuan Izin
        </button>
      </div>

      <!-- Segment 1: 3-Col Stats Card (Ringkasan Perizinan) -->
      <div id="mobileSecRingkasan" class="mobile-stats-card" style="display: ${currentSegment === 'ringkasan' ? 'grid' : 'none'}; margin-bottom: 14px;">
        <div class="mobile-stat-col">
          <div class="mobile-stat-label">Total pengajuan</div>
          <div class="mobile-stat-number" style="color: #0f172a;">${totalCount}</div>
        </div>
        <div class="mobile-stat-col">
          <div class="mobile-stat-label">Izin selesai</div>
          <div class="mobile-stat-number" style="color: #0f172a;">${selesaiCount}</div>
        </div>
        <div class="mobile-stat-col">
          <div class="mobile-stat-label">Izin aktif</div>
          <div class="mobile-stat-number" style="color: #0f172a;">${activeCount}</div>
        </div>
      </div>

      <!-- Segment 2: Chart Donat (Total Pengajuan Izin) -->
      <div id="mobileSecDonut" class="mobile-card" style="display: ${currentSegment === 'donut' ? 'block' : 'none'}; margin-bottom: 14px; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; background: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">
          <div>
            <h3 style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin: 0;">Total Pengajuan Izin</h3>
            <span style="font-size: 0.7rem; color: #64748b; font-weight: 500;">Distribusi kategori perizinan</span>
          </div>
          <select id="mSelectDonutPeriod" style="padding: 2px 6px; font-size: 0.675rem; font-weight: 700; height: 26px; line-height: 22px; border-radius: 6px; border: 1px solid #cbd5e1; background: #ffffff; color: #1e293b; cursor: pointer; outline: none;" onchange="window.mobileSwitchDonutPeriod(this.value)">
            <option value="month" ${mobileDonutPeriod === 'month' ? 'selected' : ''}>Bulan Ini</option>
            <option value="today" ${mobileDonutPeriod === 'today' ? 'selected' : ''}>Hari Ini</option>
            <option value="all" ${mobileDonutPeriod === 'all' ? 'selected' : ''}>Semua Periode</option>
          </select>
        </div>

        <div style="display: flex; align-items: center; gap: 16px;">
          <!-- SVG Donut Chart (Lingkaran Penuh 100%, Tanpa Celah Putih) -->
          <div style="position: relative; width: 114px; height: 114px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
            <svg width="114" height="114" viewBox="0 0 100 100" style="transform: rotate(-90deg); overflow: visible;">
              <!-- Lingkaran Dasar / Baseline Ring (Abu-abu Halus) -->
              <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" stroke-width="14" />
              <!-- Selesai (Hijau) -->
              ${selesaiLen > 0 ? `<circle cx="50" cy="50" r="38" fill="none" stroke="#059669" stroke-width="14" stroke-dasharray="${selesaiLen} ${strokeDash}" stroke-dashoffset="0" />` : ''}
              <!-- Izin Darurat (Merah) -->
              ${emgLen > 0 ? `<circle cx="50" cy="50" r="38" fill="none" stroke="#dc2626" stroke-width="14" stroke-dasharray="${emgLen} ${strokeDash}" stroke-dashoffset="${-selesaiLen}" />` : ''}
            </svg>
            <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
              <span style="font-size: 1.15rem; font-weight: 800; color: #0f172a; line-height: 1; font-family: 'Plus Jakarta Sans', sans-serif;">${donutTotal}</span>
              <span style="font-size: 0.65rem; color: #64748b; font-weight: 700; margin-top: 2px;">Total Izin</span>
            </div>
          </div>

          <!-- Modern Bento Breakdown Cards (Selesai & Darurat Penuh 100%) -->
          <div style="display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0;">
            <!-- Selesai Card -->
            <div style="padding: 6px 10px; border-radius: 7px; background: #f8fafc; border: 1px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.7rem; font-weight: 700; color: #0f172a;">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: #059669; flex-shrink: 0;"></span>
                  <span>Izin Selesai</span>
                </span>
                <span style="font-size: 0.65rem; font-weight: 800; color: #059669; font-family: var(--font-mono);">${donutSelesai} (${selesaiPct}%)</span>
              </div>
              <div style="width: 100%; height: 4px; border-radius: 999px; background: #e2e8f0; overflow: hidden;">
                <div style="width: ${selesaiPct}%; height: 100%; background: #059669; border-radius: 999px;"></div>
              </div>
            </div>

            <!-- Izin Darurat Card -->
            <div style="padding: 6px 10px; border-radius: 7px; background: #f8fafc; border: 1px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.7rem; font-weight: 700; color: #0f172a;">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: #dc2626; flex-shrink: 0;"></span>
                  <span>Izin Darurat</span>
                </span>
                <span style="font-size: 0.65rem; font-weight: 800; color: #dc2626; font-family: var(--font-mono);">${donutEmg} (${emgPct}%)</span>
              </div>
              <div style="width: 100%; height: 4px; border-radius: 999px; background: #e2e8f0; overflow: hidden;">
                <div style="width: ${emgPct}%; height: 100%; background: #dc2626; border-radius: 999px;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sync Footer Pill -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding: 4px 8px; border-radius: 6px; background: #f1f5f9; font-size: 0.68rem; color: #64748b;">
          <span>Data Real-time</span>
          <span style="font-weight: 700; color: #334155;">Sinkron Single Source</span>
        </div>
      </div>
<!-- Card: Izin Aktif Saya (Live Card with Full PC Parity Action Buttons) -->
      ${renderActiveTicketCard(activeTicket)}

      <!-- Card: Pengajuan Terbaru -->
      <section class="mobile-card" style="border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
        <div class="mobile-card-header">
          <h3 class="mobile-card-title">Pengajuan Terbaru</h3>
        </div>
        ${recentHtml || '<p style="font-size: 0.75rem; color: #64748b; margin-top: 0;">Belum ada riwayat pengajuan.</p>'}
        <div style="text-align: center; margin-top: 10px;">
          <a href="#" class="mobile-link-rincian" style="font-size: 0.75rem; color: #2563eb; font-weight: 700; text-decoration: none;" onclick="window.mobileSwitchTab('riwayat'); return false;">Semua riwayat</a>
        </div>
      </section>

      <!-- Card: Kontak Pos Jaga 1 -->
     
    `;
  }

  // -------------------------------------------------------------------
  // 3. PENGAJUAN SAYA (Hal 2)
  // -------------------------------------------------------------------
  function renderPengajuan(container) {
    const activeTicket = getActiveTicket();
    const emp = getActiveEmp();
    const approver = (typeof window.getPrimaryApprover === 'function')
      ? window.getPrimaryApprover()
      : { name: 'Ir. Hendra Gunawan, M.T.' };

    if (activeTicket) {
      container.innerHTML = `
        <!-- Card Izin Aktif (Langsung tampil di paling atas tanpa gap/margin berlebih) -->
        ${renderActiveTicketCard(activeTicket)}

        <!-- Card Kronologi Tercatat (Timeline matching PDF Page 2) -->
        <section class="mobile-card" style="margin-top: 12px;">
          <h3 class="mobile-card-title" style="margin-bottom: 12px;">Kronologi tercatat</h3>
          <div class="mobile-timeline">
            ${renderTimelineHtml(activeTicket)}
          </div>
        </section>
      `;
    } else {
      container.innerHTML = `
        <!-- Card Informasi Pengajuan (Tampil saat tidak ada tiket aktif) -->
        <section class="mobile-card">
          <h3 class="mobile-card-title" style="margin-bottom: 8px;">Informasi pengajuan</h3>
          <div style="font-size: 0.75rem; line-height: 1.45; color: #334155;">
            <div style="margin-bottom: 8px;">
              <div class="mobile-meta-sub">Atasan langsung</div>
              <div style="font-weight: 800; color: #0f172a;">${approver.name || 'Ir. Hendra Gunawan, M.T.'}</div>
              <div style="color: #64748b; font-size: 0.7rem;">${approver.title || 'Manajer Rekayasa & Pemeliharaan'}</div>
            </div>
            <div style="margin-bottom: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div>
                <div class="mobile-meta-sub">Nama karyawan</div>
                <div style="font-weight: 800; color: #0f172a;">${emp.name}</div>
              </div>
              <div>
                <div class="mobile-meta-sub">NIP</div>
                <div style="font-weight: 800; color: #0f172a;">${emp.nip}</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Action Buttons (Izin Darurat di Kiri, Buat Pengajuan di Kanan) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
          <!-- Kolom 1 (Kiri): Izin Darurat (Merah Solid #dc2626, Teks Putih) -->
          <button type="button" class="mobile-btn-danger" style="margin: 0; min-height: 44px; padding: 0 10px; font-size: 0.8125rem; font-weight: 700; background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.25); cursor: pointer;" onclick="window.mobileOpenCreateModal(true)">
            <span>Izin Darurat</span>
          </button>

          <!-- Kolom 2 (Kanan): Buat Pengajuan (Hijau Utama #059669, Teks Putih) -->
          <button type="button" class="mobile-btn-primary" style="margin: 0; min-height: 44px; padding: 0 10px; font-size: 0.8125rem; font-weight: 700; background: #059669; color: #ffffff; border: 1.5px solid #059669; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 6px rgba(5, 150, 105, 0.2); cursor: pointer;" onclick="window.mobileOpenCreateModal(false)">
           
            <span>Buat Pengajuan</span>
          </button>
        </div>

        <!-- Card Kronologi Tercatat (Kosong saat tidak ada izin aktif) -->
        <section class="mobile-card">
          <h3 class="mobile-card-title" style="margin-bottom: 12px;">Kronologi tercatat</h3>
          <div class="mobile-timeline">
            ${renderTimelineHtml(null)}
          </div>
        </section>
      `;
    }
  }

  // -------------------------------------------------------------------
  // 4. RIWAYAT PENGAJUAN (Hal 3, 5, 6 - Card & List View Toggle, Live Search, Dynamic Pagination)
  // -------------------------------------------------------------------
  function buildMobilePaginationHtml(currentPage, totalPages, totalItems, startIndex, pageSize) {
    if (totalPages <= 1) return '';
    const isFirst = currentPage <= 1;
    const isLast = currentPage >= totalPages;

    let pageNumbers = [];
    if (totalPages <= 4) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      pageNumbers.push(1);
      if (currentPage > 3) pageNumbers.push('...');
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 2) end = Math.min(totalPages - 1, 3);
      if (currentPage >= totalPages - 1) start = Math.max(2, totalPages - 2);
      for (let i = start; i <= end; i++) {
        if (!pageNumbers.includes(i)) pageNumbers.push(i);
      }
      if (currentPage < totalPages - 2) pageNumbers.push('...');
      if (!pageNumbers.includes(totalPages)) pageNumbers.push(totalPages);
    }

    let pageBtns = '';
    // Previous Arrow Button
    pageBtns += `
      <button type="button" aria-label="Halaman Sebelumnya" style="min-width: 34px; height: 34px; padding: 0 6px; border-radius: 8px; border: 1px solid ${isFirst ? '#e2e8f0' : '#cbd5e1'}; background: ${isFirst ? '#f8fafc' : '#ffffff'}; color: ${isFirst ? '#94a3b8' : '#334155'}; font-size: 0.85rem; font-weight: 800; cursor: ${isFirst ? 'not-allowed' : 'pointer'}; display: inline-flex; align-items: center; justify-content: center; opacity: ${isFirst ? '0.5' : '1'}; transition: all 0.15s ease;" ${isFirst ? 'disabled' : `onclick="window.mobileSetRiwayatPage(${currentPage - 1})"`}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
    `;

    // Number Buttons
    pageNumbers.forEach(p => {
      if (p === '...') {
        pageBtns += `<span style="padding: 0 3px; color: #94a3b8; font-weight: 700; font-size: 0.8rem; user-select: none;">…</span>`;
      } else {
        const isActive = (p === currentPage);
        pageBtns += `
          <button type="button" style="min-width: 34px; height: 34px; padding: 0 8px; border-radius: 8px; border: 1px solid ${isActive ? '#2563eb' : '#cbd5e1'}; background: ${isActive ? '#2563eb' : '#ffffff'}; color: ${isActive ? '#ffffff' : '#334155'}; font-size: 0.8rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-shadow: ${isActive ? '0 1px 3px rgba(37, 99, 235, 0.3)' : 'none'};" onclick="window.mobileSetRiwayatPage(${p})">
            ${p}
          </button>
        `;
      }
    });

    // Next Arrow Button
    pageBtns += `
      <button type="button" aria-label="Halaman Berikutnya" style="min-width: 34px; height: 34px; padding: 0 6px; border-radius: 8px; border: 1px solid ${isLast ? '#e2e8f0' : '#cbd5e1'}; background: ${isLast ? '#f8fafc' : '#ffffff'}; color: ${isLast ? '#94a3b8' : '#334155'}; font-size: 0.85rem; font-weight: 800; cursor: ${isLast ? 'not-allowed' : 'pointer'}; display: inline-flex; align-items: center; justify-content: center; opacity: ${isLast ? '0.5' : '1'}; transition: all 0.15s ease;" ${isLast ? 'disabled' : `onclick="window.mobileSetRiwayatPage(${currentPage + 1})"`}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    `;

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin: 18px 0 8px 0; gap: 8px;">
        <div style="font-size: 0.725rem; color: #64748b; font-weight: 600;">
          Menampilkan ${startIndex + 1}–${Math.min(startIndex + pageSize, totalItems)} dari ${totalItems} tiket
        </div>
        <div style="display: flex; align-items: center; gap: 5px; margin-left: auto;">
          ${pageBtns}
        </div>
      </div>
    `;
  }

  function renderRiwayat(container) {
    const emp = getActiveEmp();
    let allEmpTickets = getEmpTickets().filter(t => {
      const isFinished = (t.status === 'Selesai' || t.status === 'Selesai (Terlambat)' || (typeof t.status === 'string' && t.status.startsWith('Selesai')) || t.status === 'Ditolak' || t.status === 'Dibatalkan' || t.status === 'Kedaluwarsa');
      const isEmergency = Boolean(t.isEmergency || (t.id && (t.id.includes('-EMG-') || t.id.startsWith('TK-EMG'))) || t.category === 'Izin Darurat' || t.status === 'Menunggu Otorisasi Darurat');
      // Sesuai Aturan Global Rule 7: Riwayat HANYA berisi status final (Selesai, Ditolak, Dibatalkan, Kedaluwarsa)
      if (isEmergency && isFinished) return true;
      return isFinished;
    });

    const myActorNip = (emp && emp.nip) ? emp.nip : 'PK-2024-8841';
    const hasDeletableTickets = (window.ticketsList || []).some(t => {
      const isDelEmp = (typeof window.isTicketDeletedByKaryawan === 'function') ? window.isTicketDeletedByKaryawan(t, myActorNip) : Boolean(t.deletedByKaryawan);
      const isMine = (t.applicantNip === myActorNip || (!t.applicantNip && myActorNip === 'PK-2024-8841') || (Array.isArray(t.members) && t.members.some(m => m.nip === myActorNip)));
      return !isDelEmp && isMine &&
        (t.status === 'Selesai' || t.status === 'Selesai (Terlambat)' || (typeof t.status === 'string' && t.status.startsWith('Selesai')) || t.status === 'Dibatalkan' || t.status === 'Ditolak' || t.status === 'Kedaluwarsa');
    });

    // 1. Filter by Status
    let filtered = allEmpTickets;
    if (riwayatStatusFilter !== 'all') {
      filtered = filtered.filter(t => {
        if (riwayatStatusFilter === 'Terlambat') {
          return t.status === 'Terlambat' || t.isLate || (t.scanInTime && t.scanInTime.includes('[Terlambat]')) || (t.approverNote && t.approverNote.toLowerCase().includes('terlambat'));
        }
        if (riwayatStatusFilter === 'Selesai') {
          return t.status === 'Selesai' || t.status === 'Selesai (Terlambat)' || (typeof t.status === 'string' && t.status.startsWith('Selesai'));
        }
        return t.status === riwayatStatusFilter;
      });
    }

    // 2. Filter by Search Query (ID, destination, reason, category, approver, type, members)
    if (riwayatSearchQuery && riwayatSearchQuery.trim()) {
      const q = riwayatSearchQuery.trim().toLowerCase();
      filtered = filtered.filter(t => {
        const idStr = (t.id || '').toLowerCase();
        const destStr = (t.destination || '').toLowerCase();
        const reasonStr = (t.reason || '').toLowerCase();
        const catStr = (t.category || '').toLowerCase();
        const appStr = (t.approverName || '').toLowerCase();
        const typeStr = (t.type || t.returnType || '').toLowerCase();
        const memberMatch = Array.isArray(t.members) && t.members.some(m =>
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.nip && m.nip.toLowerCase().includes(q))
        );
        return idStr.includes(q) || destStr.includes(q) || reasonStr.includes(q) || catStr.includes(q) || appStr.includes(q) || typeStr.includes(q) || memberMatch;
      });
    }

    // 2b. Filter by Date Range (Rentang Tanggal)
    if (riwayatStartDate) {
      filtered = filtered.filter(t => {
        const raw = t.createdAt || t.plannedExit || 0;
        const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
        if (!d || isNaN(d.getTime())) return true;
        const dStr = d.toISOString().slice(0, 10);
        return dStr >= riwayatStartDate;
      });
    }
    if (riwayatEndDate) {
      filtered = filtered.filter(t => {
        const raw = t.createdAt || t.plannedExit || 0;
        const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
        if (!d || isNaN(d.getTime())) return true;
        const dStr = d.toISOString().slice(0, 10);
        return dStr <= riwayatEndDate;
      });
    }

    // Urutkan riwayat: Tiket terbaru selalu di paling atas
    filtered.sort((a, b) => {
      const parseTime = (t) => {
        const raw = t.createdAt || t.plannedExit || 0;
        const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
        return (d && !isNaN(d.getTime())) ? d.getTime() : 0;
      };
      return parseTime(b) - parseTime(a);
    });

    // 3. Pagination calculations
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / riwayatPageSize) || 1;
    if (currentRiwayatPage > totalPages) currentRiwayatPage = 1;
    if (currentRiwayatPage < 1) currentRiwayatPage = 1;

    const startIndex = (currentRiwayatPage - 1) * riwayatPageSize;
    const pageTickets = filtered.slice(startIndex, startIndex + riwayatPageSize);

    // 4. Card View HTML (Points 1, 2, 4, 5, 6, 7, 8, 9, 10)
    const cardsHtml = pageTickets.map(t => {
      const isEmergency = Boolean(t.isEmergency || (t.id && (t.id.includes('-EMG-') || t.id.startsWith('TK-EMG'))) || t.category === 'Izin Darurat' || t.status === 'Menunggu Otorisasi Darurat');
      const isGroupDinas = Boolean((t.isGroupDinas || (Array.isArray(t.members) && t.members.length > 0)) && (t.category === 'Dinas Kantor' || !t.category || t.category === 'Dinas Perusahaan'));
      const isPulang = (t.type === 'Pulang Mendahului' || t.type === 'Pulang Lebih Awal' || t.returnType === 'Pulang Mendahului');
      const destText = (t.destination && t.destination.trim()) ? t.destination.trim() : 'Tanpa tujuan';
      const typeDisplay = formatTipeKepulanganDisplay(t.type || t.returnType);
      const dateStr = (t.createdAt ? formatDisplayDate(t.createdAt) : 'Hari ini').split(',')[0];

      return `
        <div class="mobile-ticket-card">
          <!-- Baris 1: ID Tiket & Tanggal (Kiri) + Status Badge (Kanan) -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span style="font-family: monospace; font-size: 0.875rem; font-weight: 800; color: #0f172a;">${t.id}</span>
                ${isEmergency ? '<span class="mobile-badge darurat" style="background: #fee2e2; color: #b91c1c; border: 1.2px solid #fca5a5; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 6px;">🚨 Darurat</span>' : ''}
                ${isGroupDinas ? '<span class="mobile-badge rombongan" style="background: #e0f2fe; color: #0369a1; border: 1.2px solid #bae6fd; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 6px;">👥 Tim</span>' : ''}
              </div>
              <div style="font-size: 0.725rem; font-weight: 600; color: #334155; margin-top: 1px;">Diajukan ${dateStr}</div>
            </div>
            ${getMobileStatusBadge(t)}
          </div>

          <!-- Baris 2: Lokasi / Tujuan Keluar (Judul Utama - 1 Baris Ellipsis) -->
          <div class="mobile-clamp-1" style="font-size: 0.9rem; font-weight: 800; color: #0f172a; margin-bottom: 2px; line-height: 1.35; word-break: break-word; overflow-wrap: anywhere;" title="${destText.replace(/"/g, '&quot;')}">
            ${destText}
          </div>

          <!-- Alasan Keperluan (Teks Tebal Bold, 1 Baris Ellipsis) -->
          <div class="mobile-clamp-1" style="font-size: 0.75rem; color: #0f172a; font-weight: 700; margin-bottom: 4px; line-height: 1.35; word-break: break-word; overflow-wrap: anywhere;" title="${(t.reason || 'Keperluan dinas kantor').replace(/"/g, '&quot;')}">
            "${t.reason || 'Keperluan dinas kantor'}"
          </div>

          <!-- Baris 3: Kategori & Tipe Kepulangan -->
          <div style="font-size: 0.75rem; font-weight: 600; color: #047857; margin-bottom: 8px;">
            ${t.category || 'Dinas Kantor'} • ${typeDisplay}
          </div>

          <!-- Baris 4: Waktu Keluar / Kembali + Tombol Lihat Detail -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #f1f5f9; margin-top: 4px; gap: 8px;">
            <div style="font-size: 0.75rem; color: #334155; font-weight: 600;">
              ${isPulang
          ? `<span style="color: #0f172a; font-weight: 700;">Keluar:</span> ${formatTimeOnly(getTExitTime(t))}`
          : `<span style="color: #0f172a; font-weight: 700;">Rencana:</span> ${formatTimeOnly(getTExitTime(t))} – ${formatTimeOnly(getTReturnTime(t)) || '13.00 WIB'}`
        }
            </div>
            <!-- Tombol Detail Pengajuan (Emoji Dokumen) & Tombol Hapus 1 Riwayat (Tong Sampah Merah) -->
            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
              <button type="button" class="mobile-btn-secondary" title="Detail Pengajuan" aria-label="Detail Pengajuan" style="width: 32px; height: 32px; min-width: 32px; min-height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 1.5px solid #cbd5e1; background: #ffffff; color: #475569; border-radius: 8px; cursor: pointer;  box-shadow: 0 1px 2px rgba(0,0,0,0.04);" onclick="window.mobileOpenTicketDetail('${t.id}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg></button>
              <button type="button" class="mobile-btn-danger" title="Hapus Riwayat" aria-label="Hapus Riwayat" style="width: 32px; height: 32px; min-width: 32px; min-height: 32px; padding: 0; background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(220, 38, 38, 0.25);" onclick="window.mobileDeleteTicketItem('${t.id}', 'karyawan')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // 5. List View HTML (Points 1, 2, 4, 5, 6, 7, 8, 9, 10)
    const listHtml = pageTickets.map(t => {
      const isEmergency = Boolean(t.isEmergency || (t.id && (t.id.includes('-EMG-') || t.id.startsWith('TK-EMG'))) || t.category === 'Izin Darurat' || t.status === 'Menunggu Otorisasi Darurat');
      const isGroupDinas = Boolean((t.isGroupDinas || (Array.isArray(t.members) && t.members.length > 0)) && (t.category === 'Dinas Kantor' || !t.category || t.category === 'Dinas Perusahaan'));
      const isPulang = (t.type === 'Pulang Mendahului' || t.type === 'Pulang Lebih Awal' || t.returnType === 'Pulang Mendahului');
      const destText = (t.destination && t.destination.trim()) ? t.destination.trim() : 'Tanpa tujuan';
      const typeDisplay = formatTipeKepulanganDisplay(t.type || t.returnType);
      const dateStr = (t.createdAt ? formatDisplayDate(t.createdAt) : 'Hari ini').split(',')[0];

      return `
        <div class="mobile-ticket-list-row">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div>
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span style="font-family: monospace; font-size: 0.85rem; font-weight: 800; color: #0f172a;">${t.id}</span>
                ${isEmergency ? '<span class="mobile-badge darurat" style="background: #fee2e2; color: #b91c1c; border: 1.2px solid #fca5a5; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 6px;">🚨 Darurat</span>' : ''}
                ${isGroupDinas ? '<span class="mobile-badge rombongan" style="background: #e0f2fe; color: #0369a1; border: 1.2px solid #bae6fd; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 6px;">👥 Tim</span>' : ''}
              </div>
              <div style="font-size: 0.725rem; font-weight: 600; color: #334155; margin-top: 1px;">Diajukan ${dateStr}</div>
            </div>
            ${getMobileStatusBadge(t)}
          </div>

          <div class="mobile-clamp-1" style="font-size: 0.85rem; font-weight: 800; color: #0f172a; margin-bottom: 2px; line-height: 1.35; word-break: break-word; overflow-wrap: anywhere;" title="${destText.replace(/"/g, '&quot;')}">
            ${destText}
          </div>

          <!-- Alasan Keperluan (Teks Tebal Bold, 1 Baris Ellipsis) -->
          <div class="mobile-clamp-1" style="font-size: 0.725rem; color: #0f172a; font-weight: 700; margin-bottom: 3px; line-height: 1.35; word-break: break-word; overflow-wrap: anywhere;" title="${(t.reason || 'Keperluan dinas kantor').replace(/"/g, '&quot;')}">
            "${t.reason || 'Keperluan dinas kantor'}"
          </div>

          <div style="font-size: 0.725rem; font-weight: 600; color: #047857; margin-bottom: 6px;">
            ${t.category || 'Dinas Kantor'} • ${typeDisplay}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #f1f5f9; margin-top: 4px; gap: 8px;">
            <div style="font-size: 0.725rem; color: #334155; font-weight: 600;">
              ${isPulang
          ? `<span style="color: #0f172a; font-weight: 700;">Keluar:</span> ${formatTimeOnly(getTExitTime(t))}`
          : `${formatTimeOnly(getTExitTime(t))} – ${formatTimeOnly(getTReturnTime(t)) || '13.00 WIB'}`
        }
            </div>
            <!-- Tombol Detail Pengajuan (Emoji Dokumen) & Tombol Hapus 1 Riwayat (Tong Sampah Merah) -->
            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
              <button type="button" class="mobile-btn-secondary" title="Detail Pengajuan" aria-label="Detail Pengajuan" style="width: 32px; height: 32px; min-width: 32px; min-height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 1.5px solid #cbd5e1; background: #ffffff; color: #475569; border-radius: 8px; cursor: pointer;  box-shadow: 0 1px 2px rgba(0,0,0,0.04);" onclick="window.mobileOpenTicketDetail('${t.id}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg></button>
              <button type="button" class="mobile-btn-danger" title="Hapus Riwayat" aria-label="Hapus Riwayat" style="width: 32px; height: 32px; min-width: 32px; min-height: 32px; padding: 0; background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(220, 38, 38, 0.25);" onclick="window.mobileDeleteTicketItem('${t.id}', 'karyawan')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Empty state (Point 11.c)
    const emptyHtml = `
      <div class="mobile-card" style="text-align: center; padding: 28px 16px; border: 1.5px dashed #cbd5e1; border-radius: 14px; background: #ffffff;">
        <div style="color: #94a3b8; margin-bottom: 8px;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        </div>
        <div style="font-size: 0.9rem; font-weight: 800; color: #0f172a; margin-bottom: 4px;">Tidak Ada Pengajuan Ditemukan</div>
        <div style="font-size: 0.775rem; color: #475569; max-width: 260px; margin: 0 auto; line-height: 1.4;">
          ${riwayatSearchQuery ? `Tidak ada tiket yang cocok dengan kata kunci "<strong>${riwayatSearchQuery}</strong>".` : 'Tidak ada permohonan izin yang sesuai dengan kriteria filter ini.'}
        </div>
        ${(riwayatSearchQuery || riwayatStatusFilter !== 'all') ? `
          <button type="button" class="mobile-btn-secondary" style="margin-top: 14px; padding: 8px 16px; font-size: 0.75rem; width: auto; font-weight: 700; min-height: 40px; display: inline-flex; align-items: center; gap: 6px;" onclick="window.mobileResetRiwayatFilterKaryawan()">
            <span>Reset Pencarian & Filter</span>
          </button>
        ` : ''}
      </div>
    `;

    // Dynamic Pagination with Arrows and Smart Window
    const paginationHtml = buildMobilePaginationHtml(currentRiwayatPage, totalPages, totalItems, startIndex, riwayatPageSize);

    container.innerHTML = `
      <!-- 1. Search Bar (Point 11.c) -->
      <div style="display: flex; align-items: center; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 0 12px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.2" style="flex-shrink: 0; margin-right: 8px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="mRiwayatLiveSearch" placeholder="Cari nomor tiket, tujuan, alasan, kategori..." value="${riwayatSearchQuery}" style="flex: 1; border: none; background: transparent; font-size: 0.825rem; color: #0f172a; padding: 11px 0; outline: none; min-width: 0;" oninput="window.mobileDebounceRiwayatSearch(this.value)" onkeydown="if(event.key==='Enter'){ event.preventDefault(); window.mobileExecuteRiwayatSearch(this.value); }">
        <button type="button" id="mBtnClearRiwayatSearch" aria-label="Hapus teks pencarian" style="display: ${riwayatSearchQuery ? 'inline-flex' : 'none'}; border: none; background: #e2e8f0; color: #475569; width: 24px; height: 24px; border-radius: 50%; align-items: center; justify-content: center; font-size: 11px; cursor: pointer; flex-shrink: 0; margin-left: 6px;" onclick="window.mobileClearRiwayatSearch()">✕</button>
      </div>

      <!-- 2. Toolbar (Perubahan 2: Toggle Dihapus; Perubahan 3: Filter & Hapus Riwayat Berdampingan di Kanan Bawah Kolom Pencarian) -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; width: 100%; box-sizing: border-box;">
        <div style="font-size: 0.75rem; font-weight: 700; color: #475569;" id="mRiwayatCountText">
          ${totalItems} tiket riwayat
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <!-- Tombol Export Excel Karyawan (.xlsx) -->
          <button type="button" class="mobile-btn-export-csv mobile-touch-hit-44" style="width: 36px; height: 36px; min-width: 36px; min-height: 36px; padding: 0; border-radius: 10px; border: 1.5px solid #16a34a; background: #f0fdf4; color: #16a34a; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-sizing: border-box;" onclick="window.mobileExportKaryawanRiwayatCsv()" title="Unduh Riwayat (Excel .xlsx)" aria-label="Unduh Riwayat (Excel .xlsx)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="8" y1="13" x2="16" y2="13"></line>
              <line x1="8" y1="17" x2="16" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </button>
          <!-- Tombol Filter (36x36px visual, Hit Area >= 44x44px) -->
          <button type="button" class="mobile-filter-toggle-btn mobile-touch-hit-44 ${isRiwayatFilterOpen ? 'active' : ''}" style="width: 36px; height: 36px; min-width: 36px; min-height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; border: 1.5px solid ${isRiwayatFilterOpen ? '#059669' : '#cbd5e1'}; background: ${isRiwayatFilterOpen ? '#ecfdf5' : '#ffffff'}; color: ${isRiwayatFilterOpen ? '#047857' : '#334155'}; cursor: pointer; box-sizing: border-box; position: relative;" onclick="window.mobileToggleRiwayatFilter()" title="Filter Status Riwayat" aria-label="Filter Status Riwayat">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            ${(riwayatStatusFilter !== 'all' || riwayatStartDate || riwayatEndDate) ? '<span style="position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; border-radius: 50%; background: #059669;"></span>' : ''}
          </button>
          <!-- Tombol Merah Solid Sampah (36x36px visual, Hit Area >= 44x44px) -->
          <button type="button" class="mobile-btn-clear-history mobile-touch-hit-44" ${hasDeletableTickets ? '' : 'disabled'} title="Hapus Riwayat Selesai" aria-label="Hapus Riwayat Selesai" style="width: 36px; height: 36px; min-width: 36px; min-height: 36px; padding: 0; border-radius: 10px; background: #dc2626; border: 1.5px solid #dc2626; color: #ffffff; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(220, 38, 38, 0.2);" onclick="window.mobileClearRiwayat('karyawan')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      </div>

      <!-- 3. Collapsible Filter Panel -->
      <div id="mRiwayatFilterCard" class="mobile-filter-panel" style="display: ${isRiwayatFilterOpen ? 'block' : 'none'};">
        <div class="mobile-filter-panel-title">
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            <span>Filter Status & Tanggal</span>
          </div>
          <button type="button" class="mobile-filter-close-btn" onclick="window.mobileToggleRiwayatFilter()" aria-label="Tutup Filter">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div>
            <label class="mobile-filter-label">Status Tiket</label>
            <select class="mobile-filter-select" id="mRiwayatSelectStatus" onchange="window.mobileHandleRiwayatStatusChange(this.value)">
              <option value="all" ${riwayatStatusFilter === 'all' ? 'selected' : ''}>Semua Status</option>
              <option value="Sedang di Luar" ${riwayatStatusFilter === 'Sedang di Luar' ? 'selected' : ''}>Sedang di Luar</option>
              <option value="Disetujui" ${riwayatStatusFilter === 'Disetujui' ? 'selected' : ''}>Disetujui</option>
              <option value="Selesai" ${riwayatStatusFilter === 'Selesai' ? 'selected' : ''}>Selesai</option>
              <option value="Terlambat" ${riwayatStatusFilter === 'Terlambat' ? 'selected' : ''}>Terlambat</option>
              <option value="Ditolak" ${riwayatStatusFilter === 'Ditolak' ? 'selected' : ''}>Ditolak</option>
              <option value="Dibatalkan" ${riwayatStatusFilter === 'Dibatalkan' ? 'selected' : ''}>Dibatalkan</option>
            </select>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label class="mobile-filter-label">Dari Tanggal</label>
              <input type="date" class="mobile-filter-date" id="mRiwayatDateStart" value="${riwayatStartDate || ''}" onchange="window.mobileHandleRiwayatDateStartChange(this.value)">
            </div>
            <div>
              <label class="mobile-filter-label">Sampai Tanggal</label>
              <input type="date" class="mobile-filter-date" id="mRiwayatDateEnd" value="${riwayatEndDate || ''}" onchange="window.mobileHandleRiwayatDateEndChange(this.value)">
            </div>
          </div>
          <div style="margin-top: 4px; padding-top: 8px; border-top: 1px solid #f1f5f9;">
            <button type="button" class="mobile-filter-reset-btn" onclick="window.mobileResetRiwayatFilterKaryawan()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
              <span>Reset Filter</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 4. Items Container (Card View or List View) -->
      <div id="mRiwayatItemsContainer">
        ${totalItems === 0 ? emptyHtml : (currentRiwayatView === 'list' ? listHtml : cardsHtml)}
      </div>

      <!-- 5. Dynamic Pagination (Point 11.c) -->
      <div id="mRiwayatPaginationContainer">
        ${paginationHtml}
      </div>
    `;
  }

  // Helper untuk update in-place daftar riwayat karyawan tanpa merusak fokus input pencarian
  function renderKaryawanRiwayatListOnly() {
    const listContainer = document.getElementById('mRiwayatItemsContainer');
    const countContainer = document.getElementById('mRiwayatCountText');
    const pagContainer = document.getElementById('mRiwayatPaginationContainer');
    const clearBtn = document.getElementById('mBtnClearRiwayatSearch');

    if (!listContainer) {
      renderMobileKaryawan(null, 'riwayat');
      return;
    }

    if (clearBtn) {
      clearBtn.style.display = riwayatSearchQuery ? 'inline-flex' : 'none';
    }

    const emp = typeof getActiveEmp === 'function' ? getActiveEmp() : null;
    const myActorNip = (emp && emp.nip) ? emp.nip : 'PK-2024-8841';
    const baseTickets = typeof getEmpTickets === 'function' ? getEmpTickets() : (window.ticketsList || []);

    const allEmpTickets = baseTickets.filter(t => {
      const isDelEmp = (typeof window.isTicketDeletedByKaryawan === 'function') ? window.isTicketDeletedByKaryawan(t, myActorNip) : Boolean(t.deletedByKaryawan);
      if (isDelEmp) return false;
      const isFinished = (t.status === 'Selesai' || t.status === 'Selesai (Terlambat)' || (typeof t.status === 'string' && t.status.startsWith('Selesai')) || t.status === 'Ditolak' || t.status === 'Dibatalkan' || t.status === 'Kedaluwarsa');
      const isEmergency = Boolean(t.isEmergency || (t.id && (t.id.includes('-EMG-') || t.id.startsWith('TK-EMG'))) || t.category === 'Izin Darurat' || t.status === 'Menunggu Otorisasi Darurat');
      if (isEmergency && isFinished) return true;
      return isFinished;
    });

    let filtered = allEmpTickets;
    if (riwayatStatusFilter !== 'all') {
      filtered = filtered.filter(t => {
        if (riwayatStatusFilter === 'Terlambat') {
          return t.status === 'Terlambat' || t.isLate || (t.scanInTime && t.scanInTime.includes('[Terlambat]')) || (t.approverNote && t.approverNote.toLowerCase().includes('terlambat'));
        }
        if (riwayatStatusFilter === 'Selesai') {
          return t.status === 'Selesai' || t.status === 'Selesai (Terlambat)' || (typeof t.status === 'string' && t.status.startsWith('Selesai'));
        }
        return t.status === riwayatStatusFilter;
      });
    }

    if (riwayatSearchQuery && riwayatSearchQuery.trim()) {
      const q = riwayatSearchQuery.trim().toLowerCase();
      filtered = filtered.filter(t => {
        const idStr = (t.id || '').toLowerCase();
        const destStr = (t.destination || '').toLowerCase();
        const reasonStr = (t.reason || '').toLowerCase();
        const catStr = (t.category || '').toLowerCase();
        const appStr = (t.approverName || '').toLowerCase();
        const typeStr = (t.type || t.returnType || '').toLowerCase();
        const memberMatch = Array.isArray(t.members) && t.members.some(m =>
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.nip && m.nip.toLowerCase().includes(q))
        );
        return idStr.includes(q) || destStr.includes(q) || reasonStr.includes(q) || catStr.includes(q) || appStr.includes(q) || typeStr.includes(q) || memberMatch;
      });
    }

    if (riwayatStartDate) {
      filtered = filtered.filter(t => {
        const raw = t.createdAt || t.plannedExit || 0;
        const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
        if (!d || isNaN(d.getTime())) return true;
        return d.toISOString().slice(0, 10) >= riwayatStartDate;
      });
    }
    if (riwayatEndDate) {
      filtered = filtered.filter(t => {
        const raw = t.createdAt || t.plannedExit || 0;
        const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
        if (!d || isNaN(d.getTime())) return true;
        return d.toISOString().slice(0, 10) <= riwayatEndDate;
      });
    }

    filtered.sort((a, b) => {
      const parseTime = (t) => {
        const raw = t.createdAt || t.plannedExit || 0;
        const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
        return (d && !isNaN(d.getTime())) ? d.getTime() : 0;
      };
      return parseTime(b) - parseTime(a);
    });

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / riwayatPageSize) || 1;
    if (currentRiwayatPage > totalPages) currentRiwayatPage = 1;
    if (currentRiwayatPage < 1) currentRiwayatPage = 1;

    const startIndex = (currentRiwayatPage - 1) * riwayatPageSize;
    const pageTickets = filtered.slice(startIndex, startIndex + riwayatPageSize);

    // Render cards and empty state
    const emptyHtml = `
      <div class="mobile-card" style="text-align: center; padding: 28px 16px; border: 1.5px dashed #cbd5e1; border-radius: 14px; background: #ffffff;">
        <div style="color: #94a3b8; margin-bottom: 8px;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        </div>
        <div style="font-size: 0.9rem; font-weight: 800; color: #0f172a; margin-bottom: 4px;">Tidak Ada Pengajuan Ditemukan</div>
        <div style="font-size: 0.775rem; color: #475569; max-width: 260px; margin: 0 auto; line-height: 1.4;">
          ${riwayatSearchQuery ? `Tidak ada tiket yang cocok dengan kata kunci "<strong>${riwayatSearchQuery}</strong>".` : 'Tidak ada permohonan izin yang sesuai dengan kriteria filter ini.'}
        </div>
        ${(riwayatSearchQuery || riwayatStatusFilter !== 'all') ? `
          <button type="button" class="mobile-btn-secondary" style="margin-top: 14px; padding: 8px 16px; font-size: 0.75rem; width: auto; font-weight: 700; min-height: 40px; display: inline-flex; align-items: center; gap: 6px;" onclick="window.mobileResetRiwayatFilterKaryawan()">
            <span>Reset Pencarian & Filter</span>
          </button>
        ` : ''}
      </div>
    `;

    const cardsHtml = pageTickets.map(t => {
      const isEmergency = Boolean(t.isEmergency || (t.id && (t.id.includes('-EMG-') || t.id.startsWith('TK-EMG'))) || t.category === 'Izin Darurat' || t.status === 'Menunggu Otorisasi Darurat');
      const isGroupDinas = Boolean((t.isGroupDinas || (Array.isArray(t.members) && t.members.length > 0)) && (t.category === 'Dinas Kantor' || !t.category || t.category === 'Dinas Perusahaan'));
      const isPulang = (t.type === 'Pulang Mendahului' || t.type === 'Pulang Lebih Awal' || t.returnType === 'Pulang Mendahului');
      const destText = (t.destination && t.destination.trim()) ? t.destination.trim() : 'Tanpa tujuan';
      const typeDisplay = formatTipeKepulanganDisplay(t.type || t.returnType);
      const dateStr = (t.createdAt ? formatDisplayDate(t.createdAt) : 'Hari ini').split(',')[0];

      return `
        <div class="mobile-ticket-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span style="font-family: monospace; font-size: 0.875rem; font-weight: 800; color: #0f172a;">${t.id}</span>
                ${isEmergency ? '<span class="mobile-badge darurat" style="background: #fee2e2; color: #b91c1c; border: 1.2px solid #fca5a5; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 6px;">🚨 Darurat</span>' : ''}
                ${isGroupDinas ? '<span class="mobile-badge rombongan" style="background: #e0f2fe; color: #0369a1; border: 1.2px solid #bae6fd; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 6px;">👥 Tim</span>' : ''}
              </div>
              <div style="font-size: 0.725rem; font-weight: 600; color: #334155; margin-top: 1px;">Diajukan ${dateStr}</div>
            </div>
            ${getMobileStatusBadge(t)}
          </div>

          <div class="mobile-clamp-1" style="font-size: 0.9rem; font-weight: 800; color: #0f172a; margin-bottom: 2px; line-height: 1.35; word-break: break-word; overflow-wrap: anywhere;" title="${destText.replace(/"/g, '&quot;')}">
            ${destText}
          </div>

          <div class="mobile-clamp-1" style="font-size: 0.75rem; color: #0f172a; font-weight: 700; margin-bottom: 4px; line-height: 1.35; word-break: break-word; overflow-wrap: anywhere;" title="${(t.reason || 'Keperluan dinas kantor').replace(/"/g, '&quot;')}">
            "${t.reason || 'Keperluan dinas kantor'}"
          </div>

          <div style="font-size: 0.75rem; font-weight: 600; color: #047857; margin-bottom: 8px;">
            ${t.category || 'Dinas Kantor'} • ${typeDisplay}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #f1f5f9; margin-top: 4px; gap: 8px;">
            <div style="font-size: 0.75rem; color: #334155; font-weight: 600;">
              ${isPulang
                ? `<span style="color: #0f172a; font-weight: 700;">Keluar:</span> ${formatTimeOnly(getTExitTime(t))}`
                : `<span style="color: #0f172a; font-weight: 700;">Rencana:</span> ${formatTimeOnly(getTExitTime(t))} – ${formatTimeOnly(getTReturnTime(t)) || '13.00 WIB'}`
              }
            </div>
            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
              <button type="button" class="mobile-btn-secondary" title="Detail Pengajuan" aria-label="Detail Pengajuan" style="width: 32px; height: 32px; min-width: 32px; min-height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 1.5px solid #cbd5e1; background: #ffffff; color: #475569; border-radius: 8px; cursor: pointer;  box-shadow: 0 1px 2px rgba(0,0,0,0.04);" onclick="window.mobileOpenTicketDetail('${t.id}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg></button>
              <button type="button" class="mobile-btn-danger" title="Hapus Riwayat" aria-label="Hapus Riwayat" style="width: 32px; height: 32px; min-width: 32px; min-height: 32px; padding: 0; background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(220, 38, 38, 0.25);" onclick="window.mobileDeleteTicketItem('${t.id}', 'karyawan')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Dynamic Pagination with Arrows and Smart Window
    const paginationHtml = buildMobilePaginationHtml(currentRiwayatPage, totalPages, totalItems, startIndex, riwayatPageSize);

    if (countContainer) {
      countContainer.innerText = `${totalItems} tiket riwayat`;
    }
    listContainer.innerHTML = (totalItems === 0 ? emptyHtml : cardsHtml);
    if (pagContainer) {
      pagContainer.innerHTML = paginationHtml;
    }
  }

  // Riwayat View, Search & Filter Handlers
  window.mobileSwitchRiwayatView = function (v) {
    currentRiwayatView = v;
    renderMobileKaryawan(null, 'riwayat');
  };

  window.mobileToggleRiwayatFilter = function () {
    isRiwayatFilterOpen = !isRiwayatFilterOpen;
    renderMobileKaryawan(null, 'riwayat');
  };

  window.mobileHandleRiwayatStatusChange = function (val) {
    riwayatStatusFilter = val;
    currentRiwayatPage = 1;
    renderKaryawanRiwayatListOnly();
  };

  window.mobileDebounceRiwayatSearch = function (val) {
    clearTimeout(riwayatSearchDebounceTimer);
    const clearBtn = document.getElementById('mBtnClearRiwayatSearch');
    const rawVal = val ? val.trim() : '';
    if (clearBtn) clearBtn.style.display = rawVal ? 'inline-flex' : 'none';

    if (rawVal.length === 0) {
      riwayatSearchQuery = '';
      currentRiwayatPage = 1;
      renderKaryawanRiwayatListOnly();
      return;
    }

    if (rawVal.length === 1) return;

    riwayatSearchDebounceTimer = setTimeout(() => {
      riwayatSearchQuery = rawVal;
      currentRiwayatPage = 1;
      renderKaryawanRiwayatListOnly();
    }, 400);
  };

  window.mobileExecuteRiwayatSearch = function (val) {
    clearTimeout(riwayatSearchDebounceTimer);
    riwayatSearchQuery = val ? val.trim() : '';
    currentRiwayatPage = 1;
    renderKaryawanRiwayatListOnly();
  };

  window.mobileClearRiwayatSearch = function () {
    clearTimeout(riwayatSearchDebounceTimer);
    riwayatSearchQuery = '';
    currentRiwayatPage = 1;
    const input = document.getElementById('mRiwayatLiveSearch');
    if (input) {
      input.value = '';
      input.focus();
    }
    const clearBtn = document.getElementById('mBtnClearRiwayatSearch');
    if (clearBtn) clearBtn.style.display = 'none';
    renderKaryawanRiwayatListOnly();
  };

  window.mobileSetRiwayatPage = function (p) {
    currentRiwayatPage = p;
    renderMobileKaryawan(null, 'riwayat');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.mobileHandleRiwayatDateStartChange = function (val) {
    riwayatStartDate = val;
    currentRiwayatPage = 1;
    renderMobileKaryawan(null, 'riwayat');
  };

  window.mobileHandleRiwayatDateEndChange = function (val) {
    riwayatEndDate = val;
    currentRiwayatPage = 1;
    renderMobileKaryawan(null, 'riwayat');
  };

  window.mobileExportKaryawanRiwayatCsv = function () {
    const emp = getActiveEmp();
    let tickets = getEmpTickets().filter(t => {
      const isEmergency = Boolean(t.isEmergency || (t.id && (t.id.includes('-EMG-') || t.id.startsWith('TK-EMG'))) || t.category === 'Izin Darurat' || t.status === 'Menunggu Otorisasi Darurat');
      if (isEmergency) return true;
      return t.status === 'Selesai' || t.status === 'Dibatalkan' || t.status === 'Ditolak' || t.status === 'Kedaluwarsa';
    });

    if (riwayatStatusFilter !== 'all') {
      tickets = tickets.filter(t => t.status === riwayatStatusFilter);
    }
    if (riwayatStartDate) {
      tickets = tickets.filter(t => {
        const raw = t.createdAt || t.plannedExit || 0;
        const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
        return d && !isNaN(d.getTime()) && d.toISOString().slice(0, 10) >= riwayatStartDate;
      });
    }
    if (riwayatEndDate) {
      tickets = tickets.filter(t => {
        const raw = t.createdAt || t.plannedExit || 0;
        const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
        return d && !isNaN(d.getTime()) && d.toISOString().slice(0, 10) <= riwayatEndDate;
      });
    }

    if (tickets.length === 0) {
      if (typeof window.showToast === 'function') window.showToast('Tidak ada data riwayat perizinan untuk diekspor.', 'warning');
      return;
    }

    const formatDateTimeClean = (dtStr) => {
      if (!dtStr || dtStr === '-' || dtStr === 'null') return '-';
      const isoMatch = String(dtStr).match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
      if (isoMatch) {
        const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
        const d = parseInt(isoMatch[3], 10);
        const m = months[parseInt(isoMatch[2], 10) - 1];
        const y = isoMatch[1];
        const h = isoMatch[4];
        const min = isoMatch[5];
        return `${d} ${m} ${y}, ${h}.${min} WIB`;
      }
      return String(dtStr).replace(/^(Minggu|Senin|Selasa|Rabu|Kamis|Jumat|Sabtu),\s*/i, '');
    };

    const cleanTimeAndGate = (timeStr, explicitGate) => {
      let gate = explicitGate || '-';
      let time = timeStr || '-';
      if (time !== '-') {
        time = time.replace(/^(Minggu|Senin|Selasa|Rabu|Kamis|Jumat|Sabtu),\s*/i, '');
        const m = time.match(/^(.*?)\s*\((.*?)\)$/);
        if (m) {
          time = m[1].trim();
          if (!explicitGate || explicitGate === '-') {
            gate = m[2].trim();
          }
        }
      }
      return { time, gate };
    };

    const headers = [
      'No',
      'No Tiket',
      'Tanggal Pengajuan',
      'NIP Karyawan',
      'Nama Karyawan',
      'Keperluan',
      'Tipe Izin',
      'Tujuan',
      'Alasan',
      'Rencana Keluar',
      'Estimasi Kembali',
      'Scan Out (Waktu)',
      'Scan Out (Gerbang)',
      'Tap In (Waktu)',
      'Tap In (Gerbang)',
      'Status Akhir',
      'Catatan / Alasan Penolakan'
    ];

    const rows = tickets.map((t, idx) => {
      const reqDate = formatDateTimeClean(t.createdAt || t.createdDate);
      const outData = cleanTimeAndGate(t.scanOutTime, t.scanOutGate || t.gateOut);
      const inData = cleanTimeAndGate(t.scanInTime, t.scanInGate || t.gateIn);
      const planExit = formatDateTimeClean(t.plannedExit);
      let estReturn = '-';
      if (t.type === 'Tidak Kembali (Pulang)' || t.type === 'Pulang Mendahului') {
        estReturn = 'Tidak Kembali (Pulang)';
      } else if (t.estimatedReturn && t.estimatedReturn !== 'null') {
        estReturn = formatDateTimeClean(t.estimatedReturn);
      }
      let finalStatus = t.status || '-';
      if (t.status === 'Selesai' && (t.isLate || (t.scanInTime && t.scanInTime.includes('[Terlambat]')) || (t.lateMinutes > 0))) {
        finalStatus = 'Selesai (Terlambat)';
      }
      const notes = t.rejectionReason || t.cancellationReason || t.approverNote || '-';

      return [
        idx + 1,
        t.id || '-',
        reqDate,
        t.applicantNip || (emp ? emp.nip : '-'),
        t.applicantName || (emp ? emp.name : ''),
        t.category || '-',
        t.type || t.returnType || '-',
        t.destination || '',
        t.reason || '',
        planExit,
        estReturn,
        outData.time,
        outData.gate,
        inData.time,
        inData.gate,
        finalStatus,
        String(notes)
      ];
    });

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    // Native Microsoft Excel (.xlsx) Export via SheetJS
    if (typeof window.XLSX !== 'undefined') {
      const ws = window.XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [
        { wch: 6 },  // No
        { wch: 18 }, // No Tiket
        { wch: 22 }, // Tanggal Pengajuan
        { wch: 16 }, // NIP
        { wch: 25 }, // Nama
        { wch: 16 }, // Keperluan
        { wch: 20 }, // Tipe Izin
        { wch: 25 }, // Tujuan
        { wch: 25 }, // Alasan
        { wch: 22 }, // Rencana Keluar
        { wch: 22 }, // Estimasi Kembali
        { wch: 16 }, // Scan Out
        { wch: 24 }, // Scan Out Gate
        { wch: 16 }, // Tap In
        { wch: 24 }, // Tap In Gate
        { wch: 18 }, // Status Akhir
        { wch: 30 }  // Catatan
      ];
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Riwayat Izin");
      window.XLSX.writeFile(wb, `Riwayat_Izin_Karyawan_${dateStr}.xlsx`);
      if (typeof window.showToast === 'function') window.showToast(`Berhasil mengunduh ${tickets.length} riwayat ke Excel (.xlsx)!`, 'success');
      return;
    }

    // Fallback to CSV
    const csvRows = rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
    const csvContent = '\uFEFFsep=,\r\n' + [headers.map(h => `"${h}"`).join(','), ...csvRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Riwayat-Izin-Karyawan-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 1000);
    if (typeof window.showToast === 'function') window.showToast('Riwayat berhasil diekspor ke file CSV!', 'success');
  };

  window.mobileResetRiwayatFilterKaryawan = function () {
    riwayatSearchQuery = '';
    riwayatStatusFilter = 'all';
    riwayatStartDate = '';
    riwayatEndDate = '';
    currentRiwayatPage = 1;
    isRiwayatFilterOpen = false;
    renderMobileKaryawan(null, 'riwayat');
  };
  // -------------------------------------------------------------------
  // 5. HELPER RENDERING: ACTIVE TICKET CARD (EXACT PC PARITY)
  // -------------------------------------------------------------------
  function renderActiveTicketCard(t) {
    if (!t) {
      return `
  
      `;
    }

    const isPending = (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat');
    const isApproved = (t.status === 'Disetujui');
    const isOutside = (t.status === 'Sedang di Luar' || t.status === 'Terlambat');
    const isFinished = (t.status === 'Selesai' || t.status === 'Ditolak' || t.status === 'Dibatalkan' || t.status === 'Kedaluwarsa');
    const isEmergency = Boolean(t.isEmergency || (t.id && t.id.includes('-EMG-')) || t.status === 'Menunggu Otorisasi Darurat');
    const isEmergencyLocked = Boolean(isEmergency && (t.emergencyLocked || t.qrLocked || t.status === 'Menunggu Otorisasi Darurat'));

    const myEmp = getActiveEmp();
    const myNip = myEmp ? myEmp.nip : 'PK-2024-8841';
    const isTaggedMember = Boolean(t.isGroupDinas && Array.isArray(t.members) && t.members.some(m => m.nip === myNip && m.status !== 'batal'));
    const isOwnerOrTeamMember = (t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841')) || isTaggedMember;

    const col1Label = (isOutside && t.scanOutTime) ? 'Scan Out • Pos Gerbang' : 'Jadwal Keluar';
    const col1Val = (isOutside && t.scanOutTime)
      ? formatDisplayDate(t.scanOutTime)
      : (t.plannedExit ? formatDisplayDate(t.plannedExit) : '-');

    const isPulang = (t.type === 'Pulang Mendahului' || t.returnType === 'Pulang Mendahului');
    const col2Label = isPulang ? 'Tipe Kepulangan' : 'Batas Jam Kembali';
    const col2Val = isPulang
      ? 'Pulang Lebih Awal'
      : (getTReturnTime(t) ? formatDisplayDate(getTReturnTime(t)) : '-');

    let actionButtonsHtml = '';
    if (isPending) {
      if (isEmergencyLocked) {
        actionButtonsHtml = `
          <div style="background: #fef2f2; border: 1px dashed #fca5a5; border-radius: 8px; padding: 10px; margin-top: 10px; text-align: left;">
            <div style="font-size: 0.75rem; font-weight: 800; color: #991b1b; display: flex; align-items: center; gap: 4px;">
              <span>QR Code Terkunci (SOP Darurat)</span>
            </div>
            <div style="font-size: 0.725rem; color: #7f1d1d; margin-top: 3px; line-height: 1.35;">
              QR Code terkunci sampai diotorisasi Atasan melalui salah satu dari 3 metode otorisasi.
            </div>
          </div>
          <div class="mobile-btn-group-stacked" style="margin-top: 10px;">
            <button type="button" class="mobile-btn-primary" style="background: #059669; border-color: #059669; color: #ffffff; font-weight: 800;" onclick="window.mobileOpenEmergencyUnlockSheet('${t.id}')">
              <span>Buka Kunci QR Darurat</span>
            </button>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button type="button" class="mobile-btn-secondary mobile-btn-edit-solid" style="background: #2563eb; color: #ffffff; border: 1.5px solid #2563eb; font-weight: 700; padding: 10px; font-size: 0.8rem; border-radius: 8px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileOpenEditSheet('${t.id}')">
                <span>Edit Pengajuan</span>
              </button>
              <button type="button" class="mobile-btn-danger mobile-btn-cancel-solid" style="background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; font-weight: 700; padding: 10px; font-size: 0.8rem; border-radius: 8px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileOpenCancelSheet('${t.id}')">
                <span>Batalkan Izin</span>
              </button>
            </div>
          </div>
        `;
      } else if (isTaggedMember) {
        actionButtonsHtml = `
          <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">
            <button type="button" class="mobile-btn-danger mobile-btn-cancel-solid" style="background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; font-weight: 700; padding: 10px; font-size: 0.8rem; border-radius: 8px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileOpenCancelSheet('${t.id}')">
              <span>Batalkan Keikutsertaan Saya</span>
            </button>
          </div>
          <div style="text-align: center; margin-top: 8px;">
            <a href="#" class="mobile-link-rincian" onclick="window.mobileOpenTicketDetail('${t.id}'); return false;">Lihat Detail</a>
          </div>
        `;
      } else {
        actionButtonsHtml = `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px;">
            <button type="button" class="mobile-btn-secondary mobile-btn-edit-solid" style="background: #2563eb; color: #ffffff; border: 1.5px solid #2563eb; font-weight: 700; padding: 10px; font-size: 0.8rem; border-radius: 8px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileOpenEditSheet('${t.id}')">
              <span>Edit Pengajuan</span>
            </button>
            <button type="button" class="mobile-btn-danger mobile-btn-cancel-solid" style="background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; font-weight: 700; padding: 10px; font-size: 0.8rem; border-radius: 8px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileOpenCancelSheet('${t.id}')">
              <span>Batalkan Izin</span>
            </button>
          </div>
          <div style="text-align: center; margin-top: 8px;">
            <a href="#" class="mobile-link-rincian" onclick="window.mobileOpenTicketDetail('${t.id}'); return false;">Lihat Detail</a>
          </div>
        `;
      }
    } else if (isApproved) {
      actionButtonsHtml = `
        <div class="mobile-btn-group-stacked" style="margin-top: 12px;">
          <button type="button" class="mobile-btn-secondary mobile-btn-qr-blue" style="background: #2563eb; color: #ffffff; border: 1.5px solid #2563eb; font-weight: 700; min-height: 44px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileOpenQrModal('${t.id}')">
            <span>Buka QR Izin</span>
          </button>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button type="button" class="mobile-btn-secondary" style="font-weight: 600; min-height: 44px; white-space: nowrap;" onclick="window.mobileOpenTicketDetail('${t.id}')">
              <span>Lihat Detail</span>
            </button>
            <button type="button" class="mobile-btn-danger mobile-btn-cancel-solid" style="background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; font-weight: 700; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileOpenCancelSheet('${t.id}')">
              <span>${isTaggedMember ? 'Batal Ikut' : 'Batalkan Izin'}</span>
            </button>
          </div>
        </div>
      `;
    } else if (t.status === 'Menunggu Bukti Kedatangan') {
      const approverName = t.arrivalRejectBy || t.approverName || (typeof window.getPrimaryApprover === 'function' ? window.getPrimaryApprover().name : 'Atasan');
      const lockedTime = t.tapInTime || t.arrivalReportedTime || t.employeeReportedReturnTime || 'Terkunci';
      actionButtonsHtml = `
        <div class="proof-reason-alert-box" style="border-radius: 8px; padding: 10px 12px; margin-top: 12px; text-align: left; background: #ffffff; border: 1px solid #e2e8f0;">
          <div style="font-size: 0.775rem; font-weight: 800; display: flex; align-items: center; gap: 6px; color: #0f172a;">
            <span>Atasan (${escapeHtml(approverName)}) menandai Belum Tiba (Putaran #${t.arrivalRejectionRound || 1}):</span>
          </div>
          <div style="font-size: 0.75rem; margin-top: 4px; line-height: 1.4; color: #334155; font-weight: 600;">
            "${escapeHtml(t.arrivalRejectReason || 'Personel belum terlihat di ruangan kerja.')}"
          </div>
          <div style="font-size: 0.68rem; margin-top: 5px; color: #475569; line-height: 1.35; opacity: 0.95;">
            Tap In Gerbang (${lockedTime}) tetap terkunci. Wajib unggah foto bukti dari galeri (dilengkapi stempel waktu real-time).
          </div>
        </div>
        ${isOwnerOrTeamMember ? `
          <button type="button" class="mobile-btn-primary" style="margin-top: 10px; width: 100%; min-height: 44px; background: #dc2626; border: 1.5px solid #dc2626; color: #ffffff; font-weight: 800; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 3px rgba(220,38,38,0.25); cursor: pointer;" onclick="if(typeof window.openUploadArrivalProofModal==='function') window.openUploadArrivalProofModal('${t.id}')">
            <span>Upload Foto</span>
          </button>
        ` : ''}
        <div style="text-align: center; margin-top: 8px;">
          <a href="#" class="mobile-link-rincian" onclick="window.mobileOpenTicketDetail('${t.id}'); return false;">Lihat Detail</a>
        </div>
      `;
    } else if (t.status === 'Menunggu Verifikasi Atasan') {
      actionButtonsHtml = `
       
        </div>
        <div style="text-align: center; margin-top: 8px;">
          <a href="#" class="mobile-link-rincian" onclick="window.mobileOpenTicketDetail('${t.id}'); return false;">Lihat Detail</a>
        </div>
      `;
    } else if (isOutside) {
      const isLateStatus = (t.status === 'Terlambat' || t.isLate);
      const hasPendingExt = Boolean(t.hasExtensionPending || (t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan'));
      const hasUsedExt = Boolean(t.extensionApproved);

      let extButtonHtml = '';
      if (hasPendingExt) {
        extButtonHtml = `
          <button type="button" class="mobile-btn-secondary" disabled style="background: #fffbeb; color: #92400e; border: 1.5px solid #fde68a; min-height: 44px; font-weight: 700; opacity: 0.95; cursor: not-allowed; font-size: 0.725rem; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; text-align: center; padding: 4px 6px; line-height: 1.25;">
            <span>Menunggu Persetujuan</span>
          </button>
        `;
      } else if (hasUsedExt) {
        extButtonHtml = `
          <button type="button" class="mobile-btn-secondary" disabled style="background: #f8fafc; color: #94a3b8; border: 1.5px solid #e2e8f0; min-height: 44px; font-weight: 700; opacity: 0.85; cursor: not-allowed; font-size: 0.725rem; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; text-align: center; padding: 4px 6px; line-height: 1.25;" title="Perpanjangan waktu hanya dapat diajukan maksimal 1 kali dan telah disetujui">
            <span>Perpanjangan Telah Digunakan (Maks. 1x)</span>
          </button>
        `;
      } else {
        extButtonHtml = `
          <button type="button" class="mobile-btn-secondary mobile-btn-extend-solid" style="background: #d97706; color: #ffffff; border: 1.5px solid #d97706; font-weight: 700; min-height: 44px; font-size: 0.8rem; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; text-align: center;" onclick="window.mobileOpenPerpanjanganModal('${t.id}')">
            <span>Ajukan Perpanjangan</span>
          </button>
        `;
      }

      const isGroupDinasActive = Boolean(t.isGroupDinas && Array.isArray(t.members) && t.members.filter(m => m.status !== 'batal').length > 0);
      const tapInBtn = isGroupDinasActive ? `
        <button type="button" class="mobile-btn-primary" style="background: #2563eb; color: #ffffff; border: 1.5px solid #2563eb; font-weight: 700; min-height: 44px; font-size: 0.8rem; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-align: center; width: 100%; box-shadow: 0 1px 3px rgba(37,99,235,0.2);" onclick="if(typeof window.openSimulasiTapInModal==='function'){window.openSimulasiTapInModal('${t.id}');}else if(typeof window.reportArrivalAtOffice==='function'){window.reportArrivalAtOffice('${t.id}');}">
          <span>💳 Simulasi Tap In Gerbang</span>
        </button>
      ` : `
        <button type="button" class="mobile-btn-primary" style="background: #059669; color: #ffffff; border: 1.5px solid #059669; font-weight: 700; min-height: 44px; font-size: 0.8rem; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; text-align: center; width: 100%; box-shadow: 0 1px 3px rgba(5,150,105,0.2);" onclick="window.mobileExecuteTapIn('${t.id}')">
          <span>✓ Tap In Masuk</span>
        </button>
      `;

      if (isLateStatus) {
        actionButtonsHtml = `
          <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">
            ${tapInBtn}
            <div style="background: #fff5f5; border: 1px solid #fecaca; border-radius: 8px; padding: 6px 10px; font-size: 0.72rem; color: #b91c1c; font-weight: 700; text-align: center; line-height: 1.35;">
              ⚠️ Batas waktu telah terlewati. Perpanjangan tidak tersedia, Anda wajib segera Tap In.
            </div>
          </div>
          <div style="text-align: center; margin-top: 8px;">
            <a href="#" class="mobile-link-rincian" onclick="window.mobileOpenTicketDetail('${t.id}'); return false;">Lihat Detail</a>
          </div>
        `;
      } else {
        const cancelExtBtn = `
          <button type="button" class="mobile-btn-danger btn-cancel-pending-ext" style="background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; min-height: 44px; font-size: 0.7rem; font-weight: 700; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; text-align: center; padding: 4px; line-height: 1.2; cursor: pointer;" onclick="window.mobileCancelPendingExtension('${t.id}')" title="Batalkan Perpanjangan">
            <span>✕ Batalkan</span>
          </button>
        `;

        actionButtonsHtml = `
          <div style="margin-top: 12px;">
            <div style="display: grid; grid-template-columns: ${hasPendingExt ? '1fr 1fr 1fr' : '1fr 1fr'}; gap: ${hasPendingExt ? '6px' : '8px'};">
              ${extButtonHtml}
              ${tapInBtn}
              ${hasPendingExt ? cancelExtBtn : ''}
            </div>
          </div>
          <div style="text-align: center; margin-top: 8px;">
            <a href="#" class="mobile-link-rincian" onclick="window.mobileOpenTicketDetail('${t.id}'); return false;">Lihat Detail</a>
          </div>
        `;
      }
    }

    return `
      <section class="mobile-card" style="background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <div class="mobile-card-header">
          <div>
            <div style="font-size: 0.625rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
              IZIN AKTIF SAYA ${isEmergency ? '<span style="color:#b91c1c; margin-left:4px;">[DARURAT]</span>' : ''}
            </div>
            <h3 class="mobile-card-title" style="font-family: monospace; font-size: 0.95rem;">${t.id}</h3>
          </div>
          ${getMobileStatusBadge(t)}
        </div>

        <div style="font-size: 0.775rem; color: #059669; font-weight: 700;">${t.category} • ${getTType(t)}</div>
        <div class="mobile-clamp-1" style="font-size: 0.85rem; font-weight: 800; color: #0f172a; margin: 3px 0 2px 0; word-break: break-word; overflow-wrap: anywhere; line-height: 1.35;" title="${(t.destination || 'Area Cikampek').replace(/"/g, '&quot;')}">${t.destination || 'Area Cikampek'}</div>
        <div class="mobile-clamp-1" style="font-size: 0.75rem; color: #0f172a; font-weight: 700; margin-bottom: 8px; font-style: normal; word-break: break-word; overflow-wrap: anywhere; line-height: 1.35;" title="${(t.reason || 'Keperluan dinas kantor').replace(/"/g, '&quot;')}">"${t.reason || 'Keperluan dinas kantor'}"</div>

        <div class="mobile-ticket-grid-meta">
          <div>
            <div class="mobile-meta-sub">${col1Label}</div>
            <div class="mobile-meta-val">${col1Val}</div>
          </div>
          <div>
            <div class="mobile-meta-sub">${col2Label}</div>
            <div class="mobile-meta-val" style="${isOutside && !isPulang ? 'color: #b91c1c;' : ''}">${col2Val}</div>
          </div>
        </div>

        ${actionButtonsHtml}
      </section>
    `;
  }

  function renderTimelineHtml(t) {
    if (!t) {
      return '<p style="font-size: 0.75rem; color: #64748b; margin: 0;">Tidak ada kronologi izin berjalan.</p>';
    }

    const isPending = (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat');
    const isApproved = (t.status === 'Disetujui');
    const isOutside = (t.status === 'Sedang di Luar' || t.status === 'Terlambat');
    const isWaitingVerify = (t.status === 'Menunggu Verifikasi Atasan');
    const isWaitingProof = (t.status === 'Menunggu Bukti Kedatangan');

    let ongoingItem = null;
    if (isPending) {
      ongoingItem = {
        event: (t.isEmergency || (t.id && t.id.startsWith('TK-EMG'))) ? 'Menunggu Otorisasi Darurat' : 'Menunggu Persetujuan Atasan',
        time: 'Sedang berlangsung',
        desc: `Menunggu tinjauan & keputusan dari ${t.approverName || 'Atasan Langsung'}`,
        state: 'active_pending'
      };
    } else if (isApproved && !t.scanOutTime) {
      ongoingItem = {
        event: 'Siap Scan Out di Pos Gerbang',
        time: t.plannedExit ? (window.formatDisplayDate ? window.formatDisplayDate(t.plannedExit) : t.plannedExit) : 'Siap Keluar',
        desc: 'Tunjukkan QR Code digital kepada petugas satpam di pos jaga',
        state: 'active_ready'
      };
    } else if (isOutside) {
      ongoingItem = {
        event: t.status === 'Terlambat' ? 'Tap In Terlambat (Segera ke Pos Gerbang)' : 'Tap In Kartu di Pos Gerbang',
        time: t.status === 'Terlambat' ? '⚠️ Melewati batas estimasi' : `Batas kembali ${t.estimatedReturn ? (window.formatDisplayDate ? window.formatDisplayDate(t.estimatedReturn) : t.estimatedReturn) : '-'}`,
        desc: t.status === 'Terlambat' ? 'Segera lakukan Tap In Kartu Akses di Pos Gerbang!' : 'Belum kembali ke area',
        state: t.status === 'Terlambat' ? 'active_overdue' : 'active_outside'
      };
    } else if (isWaitingProof) {
      ongoingItem = {
        event: 'Menunggu Unggah Foto Bukti',
        time: 'Sedang berlangsung',
        desc: 'Verifikasi kedatangan ditolak. Wajib unggah foto bukti berstempel waktu.',
        state: 'active_overdue'
      };
    } else if (isWaitingVerify) {
      ongoingItem = {
        event: 'Menunggu Verifikasi Fisik Atasan',
        time: 'Sedang berlangsung',
        desc: `Jam kepulangan dikunci (${t.tapInTime || 'Tercatat'}). Menunggu verifikasi fisik oleh Atasan.`,
        state: 'active_pending'
      };
    }

    let itemsToRender = [];
    if (t.timeline && t.timeline.length > 0) {
      // Reverse timeline array to have newest at TOP (Shopee & mobile style)
      const reversedTimeline = [...t.timeline].reverse();
      itemsToRender = ongoingItem ? [ongoingItem, ...reversedTimeline] : reversedTimeline;
    } else {
      const fallbackList = [];
      if (t.status === 'Selesai') {
        fallbackList.push({ event: 'Tap In Tercatat', time: t.scanInTime ? (typeof formatTimeOnly === 'function' ? formatTimeOnly(t.scanInTime) : t.scanInTime) : 'Tercatat', desc: (t.scanInGate || 'Pos Gerbang') + ' • Karyawan telah kembali ke pabrik.' });
      }
      if (t.status === 'Sedang di Luar' || t.status === 'Terlambat' || t.status === 'Selesai' || t.scanOutTime) {
        fallbackList.push({ event: 'Scan Out Tercatat', time: t.scanOutTime ? (typeof formatTimeOnly === 'function' ? formatTimeOnly(t.scanOutTime) : t.scanOutTime) : 'Tercatat', desc: (t.scanOutGate || 'Pos Gerbang') + ' • Karyawan meninggalkan area.' });
      }
      if (t.status === 'Disetujui' || t.status === 'Sedang di Luar' || t.status === 'Terlambat' || t.status === 'Selesai') {
        fallbackList.push({ event: 'Disetujui oleh Atasan', time: t.approvedAt ? (typeof formatTimeOnly === 'function' ? formatTimeOnly(t.approvedAt) : t.approvedAt) : 'Telah Disetujui', desc: 'Disetujui • ' + (t.approverName || 'Ir. Hendra Gunawan, M.T.') });
      }
      fallbackList.push({ event: 'Pengajuan Dibuat', time: t.createdAt ? (typeof formatTimeOnly === 'function' ? formatTimeOnly(t.createdAt) : t.createdAt) : 'Tercatat', desc: `${t.category || 'Dinas Kantor'} • ${t.returnType || 'Kembali ke Area'}` });

      itemsToRender = ongoingItem ? [ongoingItem, ...fallbackList] : fallbackList;
    }

    return itemsToRender.map((item, idx) => {
      let photoUrl = item.photoDataUrl || '';
      let historyIdx = -1;
      const evLower = (item.event || '').toLowerCase();
      if (evLower.includes('foto bukti') || evLower.includes('bukti kedatangan')) {
        const roundMatch = (item.event || '').match(/Putaran\s*#?(\d+)/i);
        const roundNum = roundMatch ? parseInt(roundMatch[1], 10) : 1;
        if (!photoUrl && Array.isArray(t.arrivalVerificationHistory)) {
          const hIndex = t.arrivalVerificationHistory.findIndex(h => h.round === roundNum && h.photoDataUrl);
          if (hIndex >= 0) {
            photoUrl = t.arrivalVerificationHistory[hIndex].photoDataUrl;
            historyIdx = hIndex;
          }
        }
        if (!photoUrl && t.arrivalProofPhoto) {
          photoUrl = t.arrivalProofPhoto;
        }
      }

      const isTop = (idx === 0);
      let dotClass = isTop ? 'active' : 'done';
      if (item.state === 'active_pending') dotClass = 'active';
      else if (item.state === 'active_overdue') dotClass = 'danger';

      return `
        <div class="mobile-timeline-item">
          <div class="mobile-timeline-track">
            <div class="mobile-timeline-dot ${dotClass}"></div>
            ${idx < itemsToRender.length - 1 ? '<div class="mobile-timeline-line"></div>' : ''}
          </div>
          <div class="mobile-timeline-content">
            <div class="mobile-timeline-time">${item.time || '-'}</div>
            <div class="mobile-timeline-title" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
              <span style="${isTop ? 'font-weight: 800; color: #0f172a;' : ''}">${item.event || item.status || 'Pengajuan Dibuat'}</span>
              ${isTop ? '<span style="font-size: 0.65rem; font-weight: 800; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 1px 6px; border-radius: 9999px;">Terbaru</span>' : ''}
              ${photoUrl ? `
                <span style="display: inline-flex; align-items: center; gap: 4px; cursor: pointer; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1; background: #ffffff;" onclick="event.stopPropagation(); if(typeof window.viewArrivalProofPhoto==='function') window.viewArrivalProofPhoto('${t.id}', ${historyIdx >= 0 ? historyIdx : "''"})" title="Klik untuk lihat foto bukti">
                  <img src="${photoUrl}" alt="Foto Bukti" style="width: 24px; height: 18px; border-radius: 2px; object-fit: cover; vertical-align: middle;">
                  <span style="font-size: 0.68rem; color: #2563eb; font-weight: 700;">Lihat Foto</span>
                </span>
              ` : ''}
            </div>
            <div class="mobile-timeline-desc">${item.desc || item.keterangan || (item.by || item.actor ? 'Oleh ' + (item.by || item.actor) : '')}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // -------------------------------------------------------------------
  // 6. FORMULIR PENGAJUAN (STEP 1: INPUT FORM)
  // -------------------------------------------------------------------
  window.mobileOpenActiveBlockedSheet = function (activeTicket) {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="border-bottom: 1px solid #f1f5f9;">
        <div>
          <h3 style="font-size: 1.1rem; font-weight: 800; color: #b45309; margin: 0;">Pengajuan Baru Ditangguhkan</h3>
          <p style="font-size: 0.75rem; color: #64748b; margin: 2px 0 0 0;">Ketentuan Pembatasan Izin Aktif Karyawan</p>
        </div>
        <button type="button" class="mobile-sheet-close" onclick="window.mobileCloseSheet()">✕</button>
      </div>
      <div class="mobile-sheet-body">
        ${(activeTicket && activeTicket.status === 'Ditolak') ? `
          <div style="background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 10px; padding: 12px; margin-bottom: 12px; text-align: left;">
            <div style="font-size: 0.775rem; font-weight: 800; color: #991b1b; display: flex; align-items: center; gap: 5px;">
              <span>⚠️ Pengajuan Ditolak oleh Atasan</span>
            </div>
            <div style="font-size: 0.75rem; color: #7f1d1d; margin-top: 4px; line-height: 1.45;">
              <strong>Alasan Penolakan:</strong> "${activeTicket.rejectionReason || activeTicket.rejectReason || activeTicket.approverNote || 'Alasan dinas belum memenuhi ketentuan operasional.'}"
            </div>
          </div>
        ` : ''}
        <div style="text-align: center; padding: 6px 0 16px 0;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: #fef3c7; border: 2px solid #fde68a; color: #b45309; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 1.5rem;">
            ⚠️
          </div>
          <h4 style="font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">
            Anda Masih Memiliki Izin Aktif
          </h4>
          <p style="font-size: 0.8rem; color: #475569; margin: 0; line-height: 1.45;">
            Tiket <strong>${activeTicket.id}</strong> saat ini masih berstatus ${getMobileStatusBadge(activeTicket)}.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-top: 14px; text-align: left; font-size: 0.75rem;">
            <strong style="color: #0f172a;">Kebijakan Sistem:</strong>
            <p style="color: #64748b; margin: 4px 0 0 0; line-height: 1.4;">
              Karyawan tidak diperkenankan mengajukan izin baru sebelum tiket aktif saat ini diselesaikan, dibatalkan mandiri, atau ditolak oleh Atasan.
            </p>
          </div>
        </div>

        <div style="display: flex; gap: 10px; align-items: center;">
          ${activeTicket.status === 'Disetujui' ? `
            <button type="button" class="mobile-btn-secondary mobile-btn-qr-blue" style="width: 100%; background: #2563eb; color: #ffffff; border: 1.5px solid #2563eb; font-weight: 700; min-height: 40px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileCloseSheet(); window.mobileOpenQrModal('${activeTicket.id}')">
              Buka QR Izin Aktif Ini
            </button>
          ` : ''}
          ${activeTicket.status === 'Menunggu Persetujuan' ? `
            <button type="button" class="mobile-btn-secondary mobile-btn-edit-solid" style="flex: 1; background: #2563eb; color: #ffffff; border: 1.5px solid #2563eb; font-weight: 700; min-height: 38px; padding: 0 12px; font-size: 0.8rem; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileCloseSheet(); window.mobileOpenEditSheet('${activeTicket.id}')">
              Edit Pengajuan Ini
            </button>
            <button type="button" class="mobile-btn-danger mobile-btn-cancel-solid" style="flex: 1; background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; font-weight: 700; min-height: 38px; padding: 0 12px; font-size: 0.8rem; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileCloseSheet(); window.mobileOpenCancelSheet('${activeTicket.id}')">
              Batalkan Izin Ini
            </button>
          ` : ''}
        </div>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  window.mobileCloseFormPengajuan = function () {
    if (window.currentMobileFormStep === 2) {
      window.mobileFormGoToStep(1);
      return;
    }
    window.editingTicketId = null;
    currentFormPrefill = null;
    window.currentMobileFormStep = 1;
    currentKaryawanTab = formPreviousTab || 'pengajuan';
    try {
      sessionStorage.setItem('KUJANG_MOBILE_ACTIVE_TAB', currentKaryawanTab);
      localStorage.setItem('KUJANG_MOBILE_ACTIVE_TAB', currentKaryawanTab);
      sessionStorage.removeItem('KUJANG_FORM_IS_EMERGENCY');
    } catch (e) {}
    renderMobileKaryawan(null, currentKaryawanTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.mobileCancelFormPengajuan = function () {
    window.editingTicketId = null;
    currentFormPrefill = null;
    window.currentMobileFormStep = 1;
    currentKaryawanTab = formPreviousTab || 'pengajuan';
    try {
      sessionStorage.setItem('KUJANG_MOBILE_ACTIVE_TAB', currentKaryawanTab);
      localStorage.setItem('KUJANG_MOBILE_ACTIVE_TAB', currentKaryawanTab);
      sessionStorage.removeItem('KUJANG_FORM_IS_EMERGENCY');
    } catch (e) {}
    renderMobileKaryawan(null, currentKaryawanTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.mobileOpenCreateModal = function (isEmergency, prefillData) {
    // Option C Check from PC
    const activeTicket = getActiveTicket();
    if (!isEmergency && activeTicket && !prefillData && !window.editingTicketId) {
      window.mobileOpenActiveBlockedSheet(activeTicket);
      return;
    }
    // Guard: Izin Darurat pun tidak bisa dibuat jika masih ada izin aktif
    if (isEmergency && activeTicket && !prefillData && !window.editingTicketId) {
      if (typeof window.showToast === 'function') {
        window.showToast('Anda masih memiliki izin aktif. Selesaikan atau batalkan terlebih dahulu.', 'warning');
      } else {
        alert('Anda masih memiliki izin aktif. Selesaikan atau batalkan terlebih dahulu.');
      }
      return;
    }

    if (!prefillData && !window.editingTicketId) {
      if (typeof window.resetAllDinasUploadState === 'function') {
        window.resetAllDinasUploadState();
      }
      window.currentMobileFormStep = 1;
    }

    if (typeof window.mobileCloseSheet === 'function') {
      window.mobileCloseSheet();
    }

    currentFormIsEmergency = Boolean(isEmergency);
    currentFormPrefill = prefillData || null;
    formPreviousTab = (currentKaryawanTab === 'form_pengajuan') ? 'pengajuan' : (currentKaryawanTab || 'pengajuan');
    currentKaryawanTab = 'form_pengajuan';
    try {
      sessionStorage.setItem('KUJANG_MOBILE_ACTIVE_TAB', 'form_pengajuan');
      localStorage.setItem('KUJANG_MOBILE_ACTIVE_TAB', 'form_pengajuan');
      sessionStorage.setItem('KUJANG_FORM_IS_EMERGENCY', isEmergency ? '1' : '0');
    } catch (e) {}

    renderMobileKaryawan(null, 'form_pengajuan');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  function renderKaryawanPengajuanFullPage(container, isEmergency, prefillData) {
    if (!container) container = document.getElementById('mobileMainContent');
    if (!container) return;

    const isEditing = Boolean(window.editingTicketId);
    const now = new Date();
    const formatForInput = (val, defaultMinutes) => {
      if (!val) return '';
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return val;
      const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(val) : new Date(val);
      if (d && !isNaN(d.getTime())) return formatDateTimeLocal(d);
      return '';
    };
    const defaultExit = isEditing ? formatForInput(prefillData?.plannedExit, 5) : '';
    const defaultReturn = isEditing ? formatForInput(prefillData?.estimatedReturn, 120) : '';

    // Approver resolution
    const approvers = getMobileApprovers();
    if (prefillData?.approverName || prefillData?.approver) {
      const apprName = prefillData.approverName || prefillData.approver;
      const found = approvers.find(a => a.name === apprName || (a.nip && a.nip === prefillData.approverNip));
      selectedApproverData = found || { name: apprName, nip: prefillData.approverNip || '', title: 'Atasan Peninjau', initials: 'AP' };
    } else if (isEditing) {
      selectedApproverData = approvers[0];
    } else {
      selectedApproverData = null; // Kosongkan saat membuat pengajuan baru
    }

    window._selectedGroupMembersMobile = (isEditing && prefillData && Array.isArray(prefillData.members)) ? [...prefillData.members] : [];
    window._currentSuratPerintahMobile = (isEditing && prefillData && prefillData.suratPerintah) ? { ...prefillData.suratPerintah } : null;

    const initialCat = isEditing ? (prefillData?.category || '') : '';
    const initialType = isEditing ? (prefillData?.type || prefillData?.returnType || '') : '';
    const initialDest = isEditing ? (prefillData?.destination || '') : '';
    const initialReason = isEditing ? (prefillData?.reason || '') : '';

    const activeStep = window.currentMobileFormStep || 1;

    container.innerHTML = `
      <!-- Header Navigasi Halaman Baru Formulir Pengajuan (Clean & Compact) -->
      <div class="mobile-page-header" style="margin-bottom: 12px; padding-top: 4px;">
        <h1 class="mobile-page-title" style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; line-height: 1.3;">
          ${isEditing ? `Edit Pengajuan Izin — ${window.editingTicketId}` : (isEmergency ? 'Formulir Izin Darurat (Emergency Pass)' : 'Formulir Pengajuan Izin Keluar')}
        </h1>
        <p class="mobile-page-subtitle" style="font-size: 0.725rem; color: #64748b; margin: 0; line-height: 1.35;">
          ${isEditing ? 'Perbarui data formulir izin keluar Anda sebelum disetujui Atasan' : (isEmergency ? 'Penerbitan izin darurat untuk evakuasi/keadaan mendesak' : 'Lengkapi detail perizinan Anda secara bertahap')}
        </p>
      </div>

      <!-- Multi-Step Progress Bar (Editorial Modern) -->
      <div class="mobile-form-stepper" id="mFormStepper" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
        <!-- Step 1 Node -->
        <div class="m-step-item" id="mStepNode1" style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; cursor: pointer;" onclick="window.mobileFormGoToStep(1)">
          <div class="m-step-circle" id="mStepCircle1" style="width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; background: ${activeStep >= 1 ? (isEmergency ? '#dc2626' : '#059669') : '#cbd5e1'}; color: #ffffff; transition: all 0.25s ease;">
            ${activeStep > 1 ? '✓' : '1'}
          </div>
          <span class="m-step-text" id="mStepText1" style="font-size: 0.675rem; font-weight: ${activeStep === 1 ? '800' : '600'}; color: ${activeStep === 1 ? (isEmergency ? '#dc2626' : '#059669') : '#64748b'}; text-align: center; white-space: nowrap;">
            Kategori & Berkas
          </span>
        </div>

        <!-- Connector Line 1-2 -->
        <div class="m-step-line" id="mStepLine1" style="flex: 1; height: 2px; background: ${activeStep >= 2 ? (isEmergency ? '#dc2626' : '#059669') : '#e2e8f0'}; margin: 0 4px; margin-top: -16px; transition: all 0.25s ease;"></div>

        <!-- Step 2 Node -->
        <div class="m-step-item" id="mStepNode2" style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; cursor: pointer;" onclick="window.mobileFormGoToStep(2)">
          <div class="m-step-circle" id="mStepCircle2" style="width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; background: ${activeStep >= 2 ? (isEmergency ? '#dc2626' : '#059669') : '#cbd5e1'}; color: #ffffff; transition: all 0.25s ease;">
            ${activeStep > 2 ? '✓' : '2'}
          </div>
          <span class="m-step-text" id="mStepText2" style="font-size: 0.675rem; font-weight: ${activeStep === 2 ? '800' : '600'}; color: ${activeStep === 2 ? (isEmergency ? '#dc2626' : '#059669') : '#64748b'}; text-align: center; white-space: nowrap;">
            Tujuan & Waktu
          </span>
        </div>

        <!-- Connector Line 2-3 -->
        <div class="m-step-line" id="mStepLine2" style="flex: 1; height: 2px; background: ${activeStep >= 3 ? (isEmergency ? '#dc2626' : '#059669') : '#e2e8f0'}; margin: 0 4px; margin-top: -16px; transition: all 0.25s ease;"></div>

        <!-- Step 3 Node -->
        <div class="m-step-item" id="mStepNode3" style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1;">
          <div class="m-step-circle" id="mStepCircle3" style="width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; background: ${activeStep >= 3 ? (isEmergency ? '#dc2626' : '#059669') : '#cbd5e1'}; color: #ffffff; transition: all 0.25s ease;">
            3
          </div>
          <span class="m-step-text" id="mStepText3" style="font-size: 0.675rem; font-weight: ${activeStep === 3 ? '800' : '600'}; color: ${activeStep === 3 ? (isEmergency ? '#dc2626' : '#059669') : '#64748b'}; text-align: center; white-space: nowrap;">
            Konfirmasi
          </span>
        </div>
      </div>

      <div class="mobile-card" style="padding: 16px 14px; margin-bottom: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        ${isEmergency ? `
          <div class="mobile-emergency-banner" style="margin-bottom: 14px; background: #fff5f5; border: 1.5px solid #fca5a5; border-radius: 10px; padding: 12px;">
            <div class="mobile-emergency-banner-title" style="color: #b91c1c; font-weight: 800; font-size: 0.825rem; display: flex; align-items: center; gap: 6px;">
              <span>PERHATIAN: JALUR IZIN DARURAT (EMERGENCY PASS)</span>
            </div>
          </div>
        ` : ''}

        <form id="mobileCreatePermitForm" novalidate onsubmit="window.mobileSubmitPermitForm(event, ${!!isEmergency})">
          <!-- TAHAP 1: KATEGORI & BERKAS -->
          <div id="mFormStep1" style="display: ${activeStep === 1 ? 'block' : 'none'};">
            <!-- 1. Pilih Atasan Langsung (Searchable Combobox) -->
            <div class="mobile-form-group" style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="mobile-form-label" style="margin: 0;">Pilih Atasan Peninjau <span class="req">*</span></label>
                <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.675rem; font-weight: 700; color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 999px; padding: 2px 8px;">
                  Ketik nama langsung terpilih
                </span>
              </div>

              <div class="mobile-approver-combobox-wrapper" id="mApproverComboboxWrapper">
                <div class="mobile-approver-selected-card" id="mApproverSelectedCard" style="display: ${selectedApproverData ? 'flex' : 'none'};">
                  <div class="mobile-approver-selected-left">
                    <div class="mobile-approver-item-avatar" id="mSelectedAvatar">
                      ${selectedApproverData ? (selectedApproverData.initials || 'HG') : 'HG'}
                    </div>
                    <div class="mobile-approver-selected-meta">
                      <div class="mobile-approver-selected-name" id="mSelectedName">
                        ${selectedApproverData ? selectedApproverData.name : ''}
                      </div>
                      <div class="mobile-approver-selected-title" id="mSelectedTitle">
                        ${selectedApproverData ? (selectedApproverData.title || 'Manager') : ''}
                      </div>
                    </div>
                  </div>
                  <button type="button" class="mobile-btn-change-approver" onclick="window.mobileChangeApprover()">
                    Ubah Atasan
                  </button>
                </div>

                <div class="mobile-approver-input-box" id="mApproverInputBox" style="display: ${selectedApproverData ? 'none' : 'flex'};">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input type="text" id="mSearchApproverInput" class="mobile-approver-search-input" placeholder="Masukkan nama atau NIP atasan..." autocomplete="off" oninput="window.mobileFilterApprovers(this.value)" onclick="window.mobileShowApproverDropdown()" onkeydown="if(event.key==='Enter'){event.preventDefault();window.mobileSelectFirstApprover();}">
                  <button type="button" id="mBtnClearApprover" style="display:none; background:none; border:none; color:#64748b; font-size:12px; cursor:pointer;" onclick="window.mobileClearApproverSearch()">✕</button>
                  <button type="button" style="background:none; border:none; color:#64748b; font-size:11px; cursor:pointer;" onclick="window.mobileToggleApproverDropdown()">▼</button>
                </div>

                <div class="mobile-approver-dropdown" id="mApproverDropdown" style="display: none;"></div>
                <input type="hidden" id="mFormApproverValue" value="${selectedApproverData ? selectedApproverData.name : ''}" required>
                <input type="hidden" id="mFormApproverNip" value="${selectedApproverData ? (selectedApproverData.nip || '') : ''}">
              </div>
            </div>

            <!-- 2. Kategori Keperluan (Tampil Awal di Tahap 1) -->
            <div class="mobile-form-group" style="margin-bottom: 12px;">
              <label class="mobile-form-label">Kategori Keperluan <span class="req">*</span></label>
              <select class="mobile-select" id="mFormCategory" required onchange="window.mobileHandleCategoryChange(this.value)">
                <option value="" ${!initialCat ? 'selected' : ''}>-- Pilih Kategori --</option>
                <option value="Dinas Kantor" ${initialCat === 'Dinas Kantor' ? 'selected' : ''}>Dinas Kantor</option>
                <option value="Urusan Pribadi" ${initialCat === 'Urusan Pribadi' ? 'selected' : ''}>Urusan Pribadi</option>
              </select>
            </div>

            <!-- 2A. Tipe Kepulangan (Hanya muncul setelah Kategori dipilih) -->
            <div class="mobile-form-group" id="mWrapReturnType" style="display: ${initialCat ? 'block' : 'none'}; margin-bottom: 12px;">
              <label class="mobile-form-label">Tipe Kepulangan <span class="req">*</span></label>
              <select class="mobile-select" id="mFormReturnType" required onchange="window.mobileToggleReturnType(this.value)">
                <option value="" ${!initialType ? 'selected' : ''}>-- Pilih Tipe Kepulangan --</option>
                <option value="Kembali ke Area" ${initialType === 'Kembali ke Area' ? 'selected' : ''}>Kembali ke Area</option>
                <option value="Pulang Mendahului" ${initialType === 'Pulang Mendahului' ? 'selected' : ''}>Pulang Lebih Awal</option>
              </select>
            </div>

            <!-- 2B. Anggota Rombongan Tim (Khusus Dinas Kantor) -->
            <div class="mobile-form-group" id="mGroupDinasWrapper" style="display: ${initialCat === 'Dinas Kantor' ? 'block' : 'none'}; margin-bottom: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                <label class="mobile-form-label" style="margin: 0; color: #0f172a; font-weight: 700; font-size: 0.775rem;">Tambahkan Anggota Tim (Dinas Bersama)</label>
                <span style="font-size: 0.625rem; font-weight: 500; color: #94a3b8; white-space: nowrap; margin-left: 6px;">Opsional (Maks. 5 Orang)</span>
              </div>
              <div style="position: relative;">
                <div style="display: flex; align-items: center; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 4px 10px; gap: 8px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input type="text" id="mInputSearchGroupMember" style="flex: 1; border: none; outline: none; font-size: 0.775rem; padding: 4px 0; background: transparent;" placeholder="Cari nama karyawan, NIP, jabatan..." autocomplete="off" oninput="window.mobileFilterGroupMembers(this.value)">
                </div>
                <div id="mMemberFloatingDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.15); max-height: 200px; overflow-y: auto; z-index: 1000; padding: 4px;">
                  <div id="mMemberItemsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
              <div id="mListSelectedGroupMembers" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;"></div>
            </div>

            <!-- 2C. Unggah Surat Perintah / Surat Tugas (Khusus Dinas Kantor) -->
            <div class="mobile-form-group" id="mSuratPerintahWrapper" style="display: ${initialCat === 'Dinas Kantor' ? 'block' : 'none'}; margin-bottom: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
              <label class="mobile-form-label" style="margin: 0 0 4px 0; color: #0f172a; font-weight: 700;">
                Unggah Surat Perintah / Surat Tugas Dinas
              </label>
              <p style="font-size: 0.7rem; color: #64748b; margin: 0 0 8px 0; line-height: 1.35;">
                Lampirkan surat tugas resmi (PDF, JPG, PNG, maks 5 MB).
              </p>
              <div id="mDropzoneSuratPerintah" onclick="document.getElementById('mFileSuratPerintah').click()" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 14px; border: 1.5px dashed #94a3b8; border-radius: 8px; background: #ffffff; cursor: pointer; text-align: center;">
                <span style="font-size: 1.3rem; margin-bottom: 4px;">📎</span>
                <span style="font-size: 0.75rem; font-weight: 700; color: #0f172a;">Klik untuk Pilih Dokumen / Foto</span>
                <span style="font-size: 0.675rem; color: #64748b;">PDF, JPG, PNG hingga 5 MB</span>
                <input type="file" id="mFileSuratPerintah" accept=".pdf,image/png,image/jpeg" style="display: none;" onchange="window.mobileHandleSuratPerintahUpload(event)">
              </div>
              <div id="mPreviewSuratPerintahCard" style="display: none; align-items: center; justify-content: space-between; padding: 10px 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; margin-top: 6px;">
                <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                  <span style="font-size: 1.1rem;">📄</span>
                  <div style="min-width: 0;">
                    <div id="mPreviewSuratPerintahName" style="font-size: 0.775rem; font-weight: 700; color: #065f46; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">Surat_Tugas.pdf</div>
                    <div id="mPreviewSuratPerintahMeta" style="font-size: 0.675rem; color: #047857;">142 KB • Siap dikirim</div>
                  </div>
                </div>
                <button type="button" onclick="window.mobileRemoveSuratPerintahFile()" style="background: none; border: none; color: #dc2626; font-size: 0.75rem; font-weight: 700; cursor: pointer; padding: 4px 6px;">Hapus</button>
              </div>
            </div>

            <!-- Footer Step 1: Batal & Lanjut ke Tahap 2 -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; padding-top: 14px; margin-top: 14px; border-top: 1px solid #f1f5f9;">
              <button type="button" class="mobile-btn-secondary" style="width: auto; min-height: 42px; padding: 10px 18px; font-weight: 600;" onclick="window.mobileCancelFormPengajuan()">
                Batal
              </button>
              <button type="button" class="mobile-btn-primary" style="width: auto; min-height: 42px; padding: 10px 22px; font-weight: 700; background: ${isEmergency ? '#dc2626' : '#059669'}; border-color: ${isEmergency ? '#dc2626' : '#059669'}; display: inline-flex; align-items: center; gap: 6px;" onclick="window.mobileFormGoToStep(2)">
                <span>Lanjut: Tujuan & Waktu</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>

          <!-- TAHAP 2: TUJUAN & WAKTU -->
          <div id="mFormStep2" style="display: ${activeStep === 2 ? 'block' : 'none'};">
            <!-- 3. Lokasi / Tujuan Keluar -->
            <div class="mobile-form-group" style="margin-bottom: 12px;">
              <label class="mobile-form-label">Lokasi / Tujuan Keluar <span class="req">*</span></label>
              <input type="text" class="mobile-input" id="mFormDestination" placeholder="Masukkan lokasi / tujuan keluar..." value="${initialDest}" required>
            </div>

            <!-- 4. Alasan Keperluan Izin -->
            <div class="mobile-form-group" style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <label class="mobile-form-label" id="mFormReasonLabel" data-is-emergency="${isEmergency ? '1' : '0'}" style="margin-bottom: 0;">${initialType === 'Pulang Mendahului' ? 'Alasan Keperluan Izin dan memilih pulang lebih awal' : (isEmergency ? 'Alasan Kondisi Kedaruratan' : 'Alasan Keperluan Izin')} <span class="req">*</span></label>
                <span id="mFormReasonWordCount" style="font-size: 0.68rem; color: #64748b; font-weight: 600;">0 / 500 kata</span>
              </div>
              <textarea class="mobile-textarea" id="mFormReason" placeholder="${initialType === 'Pulang Mendahului' ? 'Masukkan alasan keperluan izin dan memilih pulang lebih awal (maks. 500 kata)...' : (isEmergency ? 'Masukkan alasan kondisi kedaruratan (maks. 500 kata)...' : 'Masukkan alasan keperluan izin (maks. 500 kata)...')}" required style="min-height: 65px;" oninput="window.handleReasonWordCount(this, 'mFormReasonWordCount')">${initialReason}</textarea>
            </div>

            <!-- 5. Rencana Waktu Keluar & Perkiraan Waktu Kembali (Anti Waktu Lampau & Aturan Kategori) -->
            <div class="mobile-form-grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 6px;">
              <div class="mobile-form-group" style="margin: 0;">
                <label class="mobile-form-label">Rencana Waktu Keluar <span class="req">*</span></label>
                <div style="position: relative; display: flex; align-items: center;">
                  <input type="datetime-local" class="mobile-input" id="mFormPlannedExit" min="${formatDateTimeLocal(now)}" ${initialCat === 'Urusan Pribadi' ? `max="${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${(now.getDay() === 5 ? '16:30' : '16:00')}"` : ''} value="${defaultExit}" required oninput="window.mobileHandleExitChange(this.value)" onchange="window.mobileHandleExitChange(this.value)" onclick="if(typeof this.showPicker==='function'){try{this.showPicker();}catch(e){}}" style="cursor: pointer; padding-right: 30px;">
                  <button type="button" onclick="const el=document.getElementById('mFormPlannedExit');if(el&&typeof el.showPicker==='function'){try{el.showPicker();}catch(e){el.focus();}}else if(el){el.focus();}" style="position: absolute; right: 6px; background: none; border: none; padding: 4px; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Buka Kalender" aria-label="Buka Kalender Waktu Keluar">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </button>
                </div>
              </div>
              <div class="mobile-form-group" id="mFormWrapReturn" style="margin: 0; display: ${initialType === 'Pulang Mendahului' ? 'none' : 'block'};">
                <label class="mobile-form-label">Perkiraan Waktu Kembali <span class="req">*</span></label>
                <div style="position: relative; display: flex; align-items: center;">
                  <input type="datetime-local" class="mobile-input" id="mFormEstimatedReturn" min="${formatDateTimeLocal(now)}" ${initialCat === 'Urusan Pribadi' ? `max="${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${(now.getDay() === 5 ? '16:30' : '16:00')}"` : ''} value="${defaultReturn}" ${initialType === 'Pulang Mendahului' ? '' : 'required'} oninput="window.mobileHandleReturnChange(this.value)" onchange="window.mobileHandleReturnChange(this.value)" onclick="if(typeof this.showPicker==='function'){try{this.showPicker();}catch(e){}}" style="cursor: pointer; padding-right: 30px;">
                  <button type="button" onclick="const el=document.getElementById('mFormEstimatedReturn');if(el&&typeof el.showPicker==='function'){try{el.showPicker();}catch(e){el.focus();}}else if(el){el.focus();}" style="position: absolute; right: 6px; background: none; border: none; padding: 4px; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Buka Kalender" aria-label="Buka Kalender Waktu Kembali">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </button>
                </div>
              </div>
            </div>

            <div style="font-size: 0.725rem; color: #64748b; margin-bottom: 12px; line-height: 1.4;">
              * Wajib diisi. Dilarang memilih waktu yang sudah dilalui. Seluruh waktu dalam WIB.
            </div>

            ${isEmergency ? `
              <!-- 6. Metode Otorisasi Darurat (Pilihan 3 Opsi) -->
              <div class="mobile-form-group" style="margin-bottom: 14px; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px;">
                <label class="mobile-form-label" style="color: #991b1b; font-weight: 800; margin-bottom: 6px;">Pilih Cara Otorisasi Buka Kunci QR <span class="req">*</span></label>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 0.775rem; color: #1e293b; cursor: pointer;">
                    <input type="radio" name="mEmgMethod" value="app" checked>
                    <div>
                      <strong>Persetujuan Langsung Atasan di App (1-Click)</strong>
                      <div style="color: #64748b; font-size: 0.675rem;">Notifikasi prioritas dikirim ke perangkat Atasan</div>
                    </div>
                  </label>
                  
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 0.775rem; color: #1e293b; cursor: pointer;">
                    <input type="radio" name="mEmgMethod" value="facescan">
                    <div>
                      <strong>Scan Wajah Atasan (Face Scan Biometrik)</strong>
                      <div style="color: #64748b; font-size: 0.675rem;">Pindai wajah Atasan langsung di tempat</div>
                    </div>
                  </label>
                </div>
              </div>
            ` : ''}

            <!-- Footer Step 2: Kembali ke Tahap 1 & Review Pengajuan -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; padding-top: 14px; margin-top: 14px; border-top: 1px solid #f1f5f9;">
              <button type="button" class="mobile-btn-secondary" style="width: auto; min-height: 42px; padding: 10px 18px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;" onclick="window.mobileFormGoToStep(1)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                <span>Kembali</span>
              </button>
              <button type="submit" class="mobile-btn-primary" style="width: auto; min-height: 42px; padding: 10px 22px; font-weight: 700; background: ${isEmergency ? '#dc2626' : '#059669'}; border-color: ${isEmergency ? '#dc2626' : '#059669'}; display: inline-flex; align-items: center; gap: 6px;">
                <span>${isEditing ? 'Lanjutkan & Simpan' : (isEmergency ? 'Lanjutkan Konfirmasi Darurat' : 'Review Pengajuan')}</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>
        </form>
      </div>
    `;

    if (typeof window.mobileRenderSelectedGroupMembers === 'function') window.mobileRenderSelectedGroupMembers();
    if (typeof window.mobileRenderSuratPerintahPreview === 'function') window.mobileRenderSuratPerintahPreview();
  }

  // Open Edit Sheet
  window.mobileOpenEditSheet = function (ticketId) {
    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;

    const emp = getActiveEmp();
    // Guard: Validasi Kepemilikan Tiket
    if (t.applicantNip && emp.nip && t.applicantNip !== emp.nip) {
      if (typeof window.showToast === 'function') {
        window.showToast('Gagal: Anda tidak berhak mengedit permohonan izin karyawan lain!', 'danger');
      }
      return;
    }

    // Guard: Hanya tiket yang berstatus Menunggu Persetujuan atau Menunggu Otorisasi Darurat yang dapat diedit
    const isPending = (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat');
    if (!isPending || t.scanOutTime || t.status === 'Disetujui') {
      if (typeof window.showToast === 'function') {
        window.showToast('Pengajuan hanya dapat diedit saat berstatus Menunggu Persetujuan (sebelum disetujui Atasan atau diproses keluar)!', 'warning');
      } else {
        alert('Pengajuan hanya dapat diedit saat berstatus Menunggu Persetujuan (sebelum disetujui Atasan atau diproses keluar)!');
      }
      return;
    }

    window.editingTicketId = ticketId;
    window.mobileOpenCreateModal(Boolean(t.isEmergency || (t.id && t.id.includes('-EMG-'))), {
      approver: t.approverName,
      approverName: t.approverName,
      category: t.category,
      type: t.type || t.returnType,
      destination: t.destination,
      reason: t.reason,
      plannedExit: t.plannedExit,
      estimatedReturn: t.estimatedReturn,
      members: t.members,
      suratPerintah: t.suratPerintah
    });
  };

  // Open Cancel Sheet (KRITIS-01 & KRITIS-05 FIX: Ownership, Status Guard, XSS Sanitation)
  window.mobileOpenCancelSheet = function (ticketId) {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;

    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;

    const emp = getActiveEmp();
    const isInitiator = t.applicantNip === emp.nip || (!t.applicantNip && emp.nip === 'PK-2024-8841');
    const isTaggedMember = Boolean(t.isGroupDinas && Array.isArray(t.members) && t.members.some(m => m.nip === emp.nip && m.status !== 'batal'));

    // Guard: Validasi Kepemilikan Tiket (Hanya pemohon atau anggota rombongan yang berhak membatalkan)
    if (!isInitiator && !isTaggedMember) {
      if (typeof window.showToast === 'function') {
        window.showToast('Gagal: Anda tidak berhak membatalkan permohonan izin karyawan lain!', 'danger');
      }
      return;
    }

    // Guard: Tiket yang sudah selesai tidak dapat dibatalkan
    if (t.status === 'Selesai' || t.status === 'Selesai (Terlambat)') {
      if (typeof window.showToast === 'function') {
        window.showToast(`Izin #${t.id} telah selesai dan tidak dapat dibatalkan lagi.`, 'warning');
      }
      if (typeof window.renderMobileActiveView === 'function') {
        window.renderMobileActiveView();
      } else if (typeof window.renderMobileKaryawan === 'function') {
        window.renderMobileKaryawan();
      }
      return;
    }

    // Guard: Tiket yang sudah Scan Out atau sedang di luar area pabrik
    const isOutsideOrDone = t.status === 'Sedang di Luar' || t.status === 'Terlambat' || (Boolean(t.scanOutTime) && t.status !== 'Disetujui');
    if (isOutsideOrDone) {
      if (typeof window.showToast === 'function') {
        window.showToast('Izin tidak dapat dibatalkan karena Anda telah tercatat keluar pabrik (Scan Out). Anda wajib melakukan Tap In di Pos Jaga.', 'danger');
      }
      if (typeof window.renderMobileActiveView === 'function') {
        window.renderMobileActiveView();
      } else if (typeof window.renderMobileKaryawan === 'function') {
        window.renderMobileKaryawan();
      }
      return;
    }

    if (t.status === 'Dibatalkan' || t.status === 'Ditolak' || t.status === 'Kedaluwarsa') {
      if (typeof window.showToast === 'function') {
        window.showToast(`Izin telah berstatus '${t.status}' dan tidak dapat dibatalkan lagi.`, 'warning');
      }
      if (typeof window.renderMobileActiveView === 'function') {
        window.renderMobileActiveView();
      } else if (typeof window.renderMobileKaryawan === 'function') {
        window.renderMobileKaryawan();
      }
      return;
    }

    let promptHtml = '';
    let buttonsHtml = '';

    if (t.isGroupDinas) {
      if (isTaggedMember) {
        promptHtml = `
          <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 14px; margin-bottom: 14px;">
            <div style="font-size: 0.8rem; font-weight: 700; color: #9f1239; margin-bottom: 4px;">Batalkan Keikutsertaan Dinas Bersama</div>
            <div style="font-size: 0.825rem; color: #475569; line-height: 1.45;">
              Apakah Anda yakin ingin membatalkan keikutsertaan Anda dalam tiket tim dinas <strong>${escapeHtml(t.id)}</strong>? Anggota tim lain dan inisiator tetap dapat melanjutkan dinas.
            </div>
          </div>
        `;
        buttonsHtml = `
          <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #f1f5f9; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <button type="button" class="mobile-btn-secondary" style="padding: 11px; font-weight: 700; border: 1.5px solid #cbd5e1; background: #ffffff; color: #334155; border-radius: 8px; cursor: pointer;" onclick="window.mobileCloseSheet()">
              <span>Tidak, Kembali</span>
            </button>
            <button type="button" class="mobile-btn-danger" style="padding: 11px; font-weight: 700; background: #dc2626; border: 1.5px solid #dc2626; color: #ffffff; border-radius: 8px; cursor: pointer;" onclick="window.mobileCloseSheet(); if(typeof window.cancelMemberParticipation==='function') window.cancelMemberParticipation('${escapeHtml(t.id)}', '${emp.nip}')">
              <span>Batal Ikut Saja</span>
            </button>
          </div>
        `;
      } else if (isInitiator) {
        const activeMembers = (t.members || []).filter(m => m.status !== 'batal');
        promptHtml = `
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px; margin-bottom: 14px;">
            <div style="font-size: 0.8rem; font-weight: 700; color: #1e40af; margin-bottom: 4px;">Inisiator Tim Dinas</div>
            <div style="font-size: 0.825rem; color: #1e3a8a; line-height: 1.45;">
              Anda adalah <strong>Inisiator Pengajuan</strong> tim dinas tiket <strong>${escapeHtml(t.id)}</strong>. Pilih opsi pembatalan di bawah:
            </div>
          </div>
        `;
        if (activeMembers.length > 0) {
          buttonsHtml = `
            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 8px;">
              <button type="button" class="mobile-btn-secondary" style="padding: 11px; font-weight: 700; border: 1.5px solid #2563eb; background: #eff6ff; color: #1d4ed8; border-radius: 8px; cursor: pointer; text-align: center;" onclick="window.mobileCloseSheet(); if(typeof window.cancelGroupForInitiatorOnly==='function') window.cancelGroupForInitiatorOnly('${escapeHtml(t.id)}')">
                <span>Batalkan untuk Saya Saja</span>
              </button>
              <button type="button" id="mBtnConfirmCancel" class="mobile-btn-danger" style="padding: 11px; font-weight: 700; background: #dc2626; border: 1.5px solid #dc2626; color: #ffffff; border-radius: 8px; cursor: pointer; text-align: center;" onclick="window.mobileConfirmCancelTicket('${escapeHtml(t.id)}')">
                <span>Batalkan Seluruh Pengajuan Tim</span>
              </button>
              <button type="button" class="mobile-btn-secondary" style="padding: 9px; font-weight: 600; border: 1px solid #cbd5e1; background: #ffffff; color: #64748b; border-radius: 8px; cursor: pointer;" onclick="window.mobileCloseSheet()">
                <span>Kembali</span>
              </button>
            </div>
          `;
        } else {
          buttonsHtml = `
            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #f1f5f9; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <button type="button" class="mobile-btn-secondary" style="padding: 11px; font-weight: 700; border: 1.5px solid #cbd5e1; background: #ffffff; color: #334155; border-radius: 8px; cursor: pointer;" onclick="window.mobileCloseSheet()">
                <span>Tidak, Kembali</span>
              </button>
              <button type="button" id="mBtnConfirmCancel" class="mobile-btn-danger" style="padding: 11px; font-weight: 700; background: #dc2626; border: 1.5px solid #dc2626; color: #ffffff; border-radius: 8px; cursor: pointer;" onclick="window.mobileConfirmCancelTicket('${escapeHtml(t.id)}')">
                <span>Ya, Batalkan Izin</span>
              </button>
            </div>
          `;
        }
      }
    } else {
      promptHtml = `
        <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 14px; margin-bottom: 14px;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #9f1239; margin-bottom: 4px;">Konfirmasi Pembatalan</div>
          <div style="font-size: 0.825rem; color: #475569; line-height: 1.45;">
            Apakah Anda yakin ingin membatalkan permohonan tiket izin <strong>${escapeHtml(t.id)}</strong> (${escapeHtml(t.category || 'Izin')} ke ${escapeHtml(t.destination || '-')})?
          </div>
        </div>
      `;
      buttonsHtml = `
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #f1f5f9; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <button type="button" class="mobile-btn-secondary" style="padding: 11px; font-weight: 700; border: 1.5px solid #cbd5e1; background: #ffffff; color: #334155; border-radius: 8px; cursor: pointer;" onclick="window.mobileCloseSheet()">
            <span>Tidak, Kembali</span>
          </button>
          <button type="button" id="mBtnConfirmCancel" class="mobile-btn-danger" style="padding: 11px; font-weight: 700; background: #dc2626; border: 1.5px solid #dc2626; color: #ffffff; border-radius: 8px; cursor: pointer;" onclick="window.mobileConfirmCancelTicket('${escapeHtml(t.id)}')">
            <span>Ya, Batalkan Izin</span>
          </button>
        </div>
      `;
    }

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="border-bottom: 1px solid #fee2e2;">
        <div>
          <h3 style="font-size: 1.1rem; font-weight: 800; color: #b91c1c; margin: 0;">Batalkan Pengajuan Izin</h3>
          <p style="font-size: 0.75rem; color: #64748b; margin: 2px 0 0 0;">Tiket ${escapeHtml(t.id)}</p>
        </div>
        <button type="button" class="mobile-sheet-close" onclick="window.mobileCloseSheet()">✕</button>
      </div>

      <div class="mobile-sheet-body">
        ${promptHtml}
        ${buttonsHtml}
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  window.mobileConfirmCancelTicket = function (ticketId) {
    const btnCancel = document.getElementById('mBtnConfirmCancel');
    if (btnCancel) {
      if (btnCancel.disabled) return;
      btnCancel.disabled = true;
      btnCancel.style.opacity = '0.6';
      btnCancel.style.pointerEvents = 'none';
    }

    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;

    const emp = getActiveEmp();

    // Guard: Validasi Kepemilikan Tiket
    if (t.applicantNip && emp.nip && t.applicantNip !== emp.nip) {
      if (typeof window.showToast === 'function') {
        window.showToast('Gagal: Anda tidak berhak membatalkan permohonan izin karyawan lain!', 'danger');
      }
      return;
    }

    // Guard: Tiket yang sudah Scan Out atau selesai tidak boleh dibatalkan mandiri
    if (t.status === 'Selesai' || t.status === 'Selesai (Terlambat)') {
      if (typeof window.showToast === 'function') {
        window.showToast(`Izin #${ticketId} telah selesai dan tidak dapat dibatalkan.`, 'warning');
      }
      if (typeof window.renderMobileActiveView === 'function') window.renderMobileActiveView();
      return;
    }
    if (t.status === 'Sedang di Luar' || t.status === 'Terlambat' || (Boolean(t.scanOutTime) && t.status !== 'Disetujui')) {
      if (typeof window.showToast === 'function') {
        window.showToast('Izin tidak dapat dibatalkan karena Anda telah tercatat keluar area pabrik (Scan Out). Anda wajib melakukan Tap In di Pos Jaga.', 'danger');
      }
      if (typeof window.renderMobileActiveView === 'function') window.renderMobileActiveView();
      return;
    }

    const rawReason = (document.getElementById('mCancelReason')?.value || '').trim();
    const reason = rawReason ? escapeHtml(rawReason) : 'Dibatalkan mandiri oleh pemohon.';
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

    t.status = 'Dibatalkan';
    t.emergencyLocked = false;
    t.qrLocked = false;
    if (!t.timeline) t.timeline = [];
    t.timeline.push({
      event: 'Pengajuan Dibatalkan',
      time: nowFormatted,
      by: `${emp.name} (Karyawan)`,
      desc: `Dibatalkan mandiri. Alasan: "${reason}".`
    });

    if (typeof window.saveTickets === 'function') {
      window.saveTickets(tickets);
    } else {
      localStorage.setItem('kujang_tickets', JSON.stringify(tickets));
      window.ticketsList = tickets;
    }

    // Sinkronisasi pembatalan tiket ke database MySQL secara real-time
    try {
      const cancelTicketPayload = {
        action: 'cancel',
        ticketId: ticketId,
        cancellationReason: reason,
        cancelledBy: `${emp.name} (Karyawan)`
      };
      if (window.SyncEngine && typeof window.SyncEngine.callUpdateTicket === 'function') {
        window.SyncEngine.callUpdateTicket(cancelTicketPayload);
      } else {
        fetch('api/update_ticket.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cancelTicketPayload)
        }).catch(e => console.warn('[Mobile] Gagal sync pembatalan ke MySQL:', e));
      }
    } catch (e) {}

    window.mobileCloseSheet();

    if (typeof window.showToast === 'function') {
      window.showToast(`Tiket #${ticketId} berhasil dibatalkan. Anda kini dapat mengajukan izin baru.`, 'success');
    }

    if (typeof window.renderMobileActiveView === 'function') {
      window.renderMobileActiveView();
    } else {
      renderMobileKaryawan(null, currentKaryawanTab);
    }
    if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
    if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
    if (typeof window.renderApproverView === 'function') window.renderApproverView();
  };

  // SEDANG-05 FIX: Opsi Penarikan Permohonan Perpanjangan Waktu oleh Karyawan
  window.mobileCancelPendingExtension = function (ticketId) {
    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;
    const emp = getActiveEmp();
    if (t.applicantNip && emp.nip && t.applicantNip !== emp.nip) {
      if (typeof window.showToast === 'function') {
        window.showToast('Gagal: Anda bukan pemilik izin ini.', 'danger');
      }
      return;
    }
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

    t.hasExtensionPending = false;
    t.pendingExtension = null;
    t.extensionRequestedTime = null;
    t.extensionReason = null;
    if (!t.timeline) t.timeline = [];
    t.timeline.push({
      event: 'Perpanjangan Dibatalkan',
      time: nowFormatted,
      by: `${emp.name} (Karyawan)`,
      desc: 'Permohonan perpanjangan waktu dibatalkan mandiri sebelum disetujui Atasan.'
    });

    if (typeof window.saveTickets === 'function') {
      window.saveTickets(tickets);
    } else {
      localStorage.setItem('kujang_tickets', JSON.stringify(tickets));
      window.ticketsList = tickets;
    }
    if (window.SyncEngine && typeof window.SyncEngine.callUpdateTicket === 'function') {
      window.SyncEngine.callUpdateTicket({
        ticketId: ticketId,
        action: 'cancel_extension'
      });
    }

    if (typeof window.showToast === 'function') {
      window.showToast('Permohonan perpanjangan waktu berhasil dibatalkan.', 'info');
    }
    window.mobileCloseSheet();
    renderMobileKaryawan(null, currentKaryawanTab);
    if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
  };

  // Combobox Helper Methods
  window.mobileToggleApproverDropdown = function () {
    const dd = document.getElementById('mApproverDropdown');
    if (!dd) return;
    if (dd.style.display === 'none') {
      window.mobileShowApproverDropdown();
    } else {
      dd.style.display = 'none';
    }
  };

  window.mobileShowApproverDropdown = function () {
    const dd = document.getElementById('mApproverDropdown');
    const input = document.getElementById('mSearchApproverInput');
    if (!dd) return;
    window.mobileFilterApprovers(input ? input.value : '');
    dd.style.display = 'flex';
  };

  window.mobileClearApproverSearch = function () {
    const input = document.getElementById('mSearchApproverInput');
    const btnClear = document.getElementById('mBtnClearApprover');
    if (input) {
      input.value = '';
      input.focus();
    }
    if (btnClear) btnClear.style.display = 'none';
    window.mobileFilterApprovers('');
  };

  window.mobileFilterApprovers = function (query) {
    const dd = document.getElementById('mApproverDropdown');
    const btnClear = document.getElementById('mBtnClearApprover');
    if (!dd) return;
    dd.style.display = 'flex';
    if (btnClear) btnClear.style.display = query ? 'block' : 'none';

    const approvers = getMobileApprovers();
    const matcher = typeof window.matchSearchTokens === 'function' ? window.matchSearchTokens : (typeof matchSearchTokens === 'function' ? matchSearchTokens : null);
    const filtered = matcher
      ? approvers.filter(a => matcher(query, a.name, a.title, a.department, a.nip, a.role))
      : approvers.filter(a => {
        const q = (query || '').toLowerCase().trim();
        return a.name.toLowerCase().includes(q) ||
          (a.title && a.title.toLowerCase().includes(q)) ||
          (a.department && a.department.toLowerCase().includes(q)) ||
          (a.nip && a.nip.toLowerCase().includes(q));
      });

    if (filtered.length === 0) {
      dd.innerHTML = `<div style="padding: 14px; text-align: center; color: #64748b; font-size: 0.775rem;">Atasan "${query}" tidak ditemukan</div>`;
      return;
    }

    dd.innerHTML = filtered.map(a => `
      <div class="mobile-approver-item" style="${a.isUnavailable ? 'opacity: 0.6; cursor: not-allowed;' : ''}" onclick="${a.isUnavailable ? `window.showToast('Atasan ${a.name.replace(/'/g, "\\\'")} saat ini Tidak Tersedia karena hak aksesnya dicabut.', 'warning');` : `window.mobileSelectApprover('${a.name.replace(/'/g, "\\'")}', '${(a.title || '').replace(/'/g, "\\'")}', '${(a.initials || 'HG')}', '${(a.nip || '')}')`}">
        <div class="mobile-approver-item-avatar" style="background: ${a.avatarBg || 'linear-gradient(135deg, #059669 0%, #0d9488 100%)'};">
          ${a.initials || 'HG'}
        </div>
        <div class="mobile-approver-item-info">
          <div class="mobile-approver-item-name" style="display: flex; align-items: center; gap: 6px;">
            <span>${a.name}</span>
            <span style="${a.isUnavailable ? 'background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;' : 'background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;'} font-size: 0.625rem; font-weight: 700; padding: 1px 6px; border-radius: 9999px;">${a.isUnavailable ? 'Tidak tersedia' : 'Aktif'}</span>
          </div>
          <div class="mobile-approver-item-role">${a.title || 'Manajer'} • ${a.department || 'Rekayasa'}</div>
        </div>
      </div>
    `).join('');
  };

  window.mobileSelectFirstApprover = function () {
    const input = document.getElementById('mSearchApproverInput');
    const q = (input?.value || '').toLowerCase().trim();
    const approvers = getMobileApprovers();
    const match = approvers.find(a =>
      a.name.toLowerCase().includes(q) ||
      (a.title && a.title.toLowerCase().includes(q)) ||
      (a.nip && a.nip.toLowerCase().includes(q))
    ) || approvers[0];
    if (match) {
      window.mobileSelectApprover(match.name, match.title || 'Manajer', match.initials || 'HG', match.nip || '');
    }
  };

  window.mobileSelectApprover = function (name, title, initials, nip) {
    if (!nip) {
      const approvers = getMobileApprovers();
      const match = approvers.find(a => a.name === name);
      if (match) nip = match.nip;
    }
    selectedApproverData = { name, title, initials, nip: nip || '' };
    const hiddenInput = document.getElementById('mFormApproverValue');
    const hiddenNipInput = document.getElementById('mFormApproverNip');
    const card = document.getElementById('mApproverSelectedCard');
    const inputBox = document.getElementById('mApproverInputBox');
    const dd = document.getElementById('mApproverDropdown');
    const nameEl = document.getElementById('mSelectedName');
    const titleEl = document.getElementById('mSelectedTitle');
    const avatarEl = document.getElementById('mSelectedAvatar');

    if (hiddenInput) hiddenInput.value = name;
    if (hiddenNipInput) hiddenNipInput.value = nip || '';
    if (nameEl) nameEl.textContent = name;
    if (titleEl) titleEl.textContent = title;
    if (avatarEl) avatarEl.textContent = initials;

    if (dd) dd.style.display = 'none';
    if (inputBox) inputBox.style.display = 'none';
    if (card) card.style.display = 'flex';

    if (typeof window.showToast === 'function') {
      window.showToast(`Atasan terpilih: ${name}`, 'info');
    }
  };

  window.mobileChangeApprover = function () {
    selectedApproverData = null;
    const hiddenInput = document.getElementById('mFormApproverValue');
    const hiddenNipInput = document.getElementById('mFormApproverNip');
    const card = document.getElementById('mApproverSelectedCard');
    const inputBox = document.getElementById('mApproverInputBox');
    const input = document.getElementById('mSearchApproverInput');

    if (hiddenInput) hiddenInput.value = '';
    if (hiddenNipInput) hiddenNipInput.value = '';
    if (card) card.style.display = 'none';
    if (inputBox) inputBox.style.display = 'flex';
    if (input) {
      input.value = '';
      input.focus();
    }
    window.mobileShowApproverDropdown();
  };

  window.mobileToggleReturnType = function (val) {
    const wrap = document.getElementById('mFormWrapReturn');
    const input = document.getElementById('mFormEstimatedReturn');
    const reasonLabel = document.getElementById('mFormReasonLabel');
    const reasonInput = document.getElementById('mFormReason');
    if (reasonLabel) {
      const isEmergency = reasonLabel.getAttribute('data-is-emergency') === '1';
      if (val === 'Pulang Mendahului') {
        reasonLabel.innerHTML = 'Alasan Keperluan Izin dan memilih pulang lebih awal <span class="req">*</span>';
      } else {
        reasonLabel.innerHTML = `${isEmergency ? 'Alasan Kondisi Kedaruratan' : 'Alasan Keperluan Izin'} <span class="req">*</span>`;
      }
    }
    if (reasonInput) {
      const isEmergency = reasonLabel && reasonLabel.getAttribute('data-is-emergency') === '1';
      reasonInput.placeholder = val === 'Pulang Mendahului'
        ? 'Masukkan alasan keperluan izin dan memilih pulang lebih awal...'
        : (isEmergency ? 'Masukkan alasan kondisi kedaruratan...' : 'Masukkan alasan keperluan izin...');
    }
    if (!wrap || !input) return;
    if (val === 'Pulang Mendahului') {
      wrap.style.display = 'none';
      input.removeAttribute('required');
      input.value = '';
    } else {
      wrap.style.display = 'block';
      input.setAttribute('required', 'required');
      const exitVal = document.getElementById('mFormPlannedExit')?.value;
      if (exitVal) {
        const exitDt = new Date(exitVal);
        input.value = formatDateTimeLocal(new Date(exitDt.getTime() + 2 * 60 * 60000));
      }
    }
  };

  window.mobileHandleCategoryChange = function (val) {
    const exitInput = document.getElementById('mFormPlannedExit');
    const retInput = document.getElementById('mFormEstimatedReturn');
    const wrapReturnType = document.getElementById('mWrapReturnType');
    const groupWrap = document.getElementById('mGroupDinasWrapper');
    const suratWrap = document.getElementById('mSuratPerintahWrapper');

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const maxHourStr = (now.getDay() === 5) ? '16:30' : '16:00';
    const todayEnd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${maxHourStr}`;
    const nowLocal = formatDateTimeLocal(now);

    // Progressive Disclosure: Dropdown Tipe Kepulangan hanya muncul jika Kategori sudah dipilih
    if (wrapReturnType) {
      wrapReturnType.style.display = val ? 'block' : 'none';
      if (!val) {
        const retSelect = document.getElementById('mFormReturnType');
        if (retSelect) retSelect.value = '';
      }
    }

    if (val === 'Urusan Pribadi') {
      if (exitInput) {
        exitInput.min = nowLocal;
        exitInput.max = todayEnd;
        if (exitInput.value) {
          const d = new Date(exitInput.value);
          if (d.getDate() !== now.getDate() || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear() || d < now) {
            exitInput.value = formatDateTimeLocal(new Date(now.getTime() + 5 * 60000));
          }
        }
      }
      if (retInput) {
        retInput.min = (exitInput && exitInput.value) ? exitInput.value : nowLocal;
        retInput.max = todayEnd;
        if (retInput.value) {
          const rd = new Date(retInput.value);
          if (rd.getDate() !== now.getDate() || rd.getMonth() !== now.getMonth() || rd.getFullYear() !== now.getFullYear() || (exitInput && rd <= new Date(exitInput.value))) {
            const baseExit = exitInput ? new Date(exitInput.value) : now;
            retInput.value = formatDateTimeLocal(new Date(baseExit.getTime() + 60 * 60000));
          }
        }
      }
      if (groupWrap) groupWrap.style.display = 'none';
      if (suratWrap) suratWrap.style.display = 'none';
      window._selectedGroupMembersMobile = [];
      window._currentSuratPerintahMobile = null;
    } else if (val === 'Dinas Kantor') {
      if (exitInput) {
        exitInput.min = nowLocal;
        exitInput.removeAttribute('max');
        if (exitInput.value && new Date(exitInput.value) < new Date(now.getTime() - 30000)) {
          exitInput.value = formatDateTimeLocal(new Date(now.getTime() + 5 * 60000));
        }
      }
      if (retInput) {
        retInput.min = (exitInput && exitInput.value) ? exitInput.value : nowLocal;
        retInput.removeAttribute('max');
      }
      if (groupWrap) groupWrap.style.display = 'block';
      if (suratWrap) suratWrap.style.display = 'block';
    } else {
      // Nilai kosong / -- Pilih Kategori --
      if (groupWrap) groupWrap.style.display = 'none';
      if (suratWrap) suratWrap.style.display = 'none';
      window._selectedGroupMembersMobile = [];
      window._currentSuratPerintahMobile = null;
    }
    if (typeof window.mobileRenderSelectedGroupMembers === 'function') window.mobileRenderSelectedGroupMembers();
    if (typeof window.mobileRenderSuratPerintahPreview === 'function') window.mobileRenderSuratPerintahPreview();
  };

  window.mobileFilterGroupMembers = function(query) {
    const dropdown = document.getElementById('mMemberFloatingDropdown');
    const listContainer = document.getElementById('mMemberItemsList');
    if (!dropdown || !listContainer) return;

    const q = (query || '').toLowerCase().trim();
    if (!q) {
      dropdown.style.display = 'none';
      return;
    }

    const currentEmp = getActiveEmp();
    const myNip = currentEmp ? currentEmp.nip : 'PK-2024-8841';
    const allUsers = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];

    const selectedNips = (window._selectedGroupMembersMobile || []).map(m => m.nip);
    selectedNips.push(myNip);

    const candidates = allUsers.filter(u => {
      if (selectedNips.includes(u.nip)) return false;
      if (u.roleKey && u.roleKey.includes('admin')) return false;
      if (u.role && u.role.includes('Administrator')) return false;
      if (u.status !== 'Aktif') return false;

      // CEK TIKET AKTIF: Karyawan yang sedang memiliki izin aktif dilarang ditambahkan
      const activeTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket(u.nip) : null;
      if (activeTicket) return false;

      const name = (u.name || '').toLowerCase();
      const nip = (u.nip || '').toLowerCase();
      const dept = (u.department || '').toLowerCase();
      const title = (u.title || u.role || '').toLowerCase();
      const sup = (u.directSupervisor || u.supervisor || '').toLowerCase();
      return name.includes(q) || nip.includes(q) || dept.includes(q) || title.includes(q) || sup.includes(q);
    });

    if (candidates.length === 0) {
      listContainer.innerHTML = `<div style="padding: 10px; font-size: 0.75rem; color: #64748b; text-align: center;">Karyawan "${escapeHtml(query)}" tidak ditemukan atau sedang memiliki izin aktif</div>`;
      dropdown.style.display = 'block';
      return;
    }

    listContainer.innerHTML = candidates.slice(0, 8).map(c => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: 6px; cursor: pointer; transition: background 0.15s; border-bottom: 1px solid #f1f5f9;" onclick="window.mobileAddGroupMemberByNip('${c.nip}')">
        <div style="min-width: 0;">
          <div style="font-size: 0.775rem; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.name}</div>
          <div style="font-size: 0.675rem; color: #64748b;">${c.nip} • ${c.department}</div>
          <div style="font-size: 0.65rem; color: #2563eb;">Atasan Langsung: ${c.directSupervisor || c.supervisor || 'Ir. Hendra Gunawan, M.T.'}</div>
        </div>
        <span style="font-size: 0.7rem; font-weight: 700; color: #059669; padding: 4px 8px; background: #ecfdf5; border-radius: 6px; white-space: nowrap;">+ Tambah</span>
      </div>
    `).join('');
    dropdown.style.display = 'block';
  };

  window.mobileAddGroupMemberByNip = function(nip) {
    if (!nip) return;
    if (!window._selectedGroupMembersMobile) window._selectedGroupMembersMobile = [];
    if (window._selectedGroupMembersMobile.length >= 5) {
      if (typeof window.showToast === 'function') window.showToast('Maksimal anggota tim dinas adalah 5 orang.', 'warning');
      return;
    }
    const allUsers = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
    const user = allUsers.find(u => u.nip === nip);
    if (!user) return;

    // Validasi izin aktif
    const activeTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket(user.nip) : null;
    if (activeTicket) {
      if (typeof window.showToast === 'function') {
        window.showToast(`Karyawan (${user.name}) saat ini masih memiliki izin aktif (#${activeTicket.id}) dan tidak dapat ditambahkan ke tim dinas.`, 'warning');
      }
      return;
    }

    if (window._selectedGroupMembersMobile.some(m => String(m.nip).trim() === String(nip).trim())) return;

    window._selectedGroupMembersMobile.push({
      nip: user.nip,
      name: user.name,
      title: user.title || user.role || 'Karyawan',
      department: user.department || 'Departemen Rekayasa & Pemeliharaan',
      supervisor: user.directSupervisor || user.supervisor || 'Ir. Hendra Gunawan, M.T.'
    });

    const inputSearch = document.getElementById('mInputSearchGroupMember');
    if (inputSearch) inputSearch.value = '';
    const dropdown = document.getElementById('mMemberFloatingDropdown');
    if (dropdown) dropdown.style.display = 'none';

    window.mobileRenderSelectedGroupMembers();
  };

  window.mobileRemoveGroupMemberByNip = function(nip, event) {
    if (event) {
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
      if (typeof event.preventDefault === 'function') event.preventDefault();
    }
    if (!window._selectedGroupMembersMobile) return;
    window._selectedGroupMembersMobile = window._selectedGroupMembersMobile.filter(m => String(m.nip).trim() !== String(nip).trim());
    window.mobileRenderSelectedGroupMembers();
  };

  window.mobileRenderSelectedGroupMembers = function() {
    const container = document.getElementById('mListSelectedGroupMembers');
    if (!container) return;
    const members = window._selectedGroupMembersMobile || [];
    if (members.length === 0) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = members.map(m => `
      <div style="display: inline-flex; align-items: center; gap: 6px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 20px; padding: 4px 10px; font-size: 0.725rem; color: #1e40af;">
        <span>👤 <strong>${escapeHtml(m.name.split(',')[0])}</strong> (${m.nip})</span>
        <span onclick="window.mobileRemoveGroupMemberByNip('${m.nip}', event)" style="cursor: pointer; font-weight: 800; color: #dc2626; margin-left: 2px; padding: 0 4px;" title="Hapus">✕</span>
      </div>
    `).join('');
  };

  window.mobileHandleSuratPerintahUpload = function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      if (typeof window.showToast === 'function') window.showToast('Ukuran file maksimal adalah 5 MB.', 'danger');
      return;
    }
    const reader = new FileReader();
    reader.onload = function(evt) {
      window._currentSuratPerintahMobile = {
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: evt.target.result,
        uploadedAt: new Date().toISOString()
      };
      window.mobileRenderSuratPerintahPreview();
    };
    reader.readAsDataURL(file);
  };

  window.mobileRemoveSuratPerintahFile = function() {
    window._currentSuratPerintahMobile = null;
    const input = document.getElementById('mFileSuratPerintah');
    if (input) input.value = '';
    window.mobileRenderSuratPerintahPreview();
  };

  window.mobileRenderSuratPerintahPreview = function() {
    const dropzone = document.getElementById('mDropzoneSuratPerintah');
    const preview = document.getElementById('mPreviewSuratPerintahCard');
    const nameEl = document.getElementById('mPreviewSuratPerintahName');
    const metaEl = document.getElementById('mPreviewSuratPerintahMeta');
    const data = window._currentSuratPerintahMobile;
    if (!dropzone || !preview) return;
    if (data) {
      dropzone.style.display = 'none';
      preview.style.display = 'flex';
      if (nameEl) nameEl.textContent = data.name;
      if (metaEl) metaEl.textContent = `${Math.round(data.size / 1024)} KB • Siap dikirim`;
    } else {
      dropzone.style.display = 'flex';
      preview.style.display = 'none';
    }
  };

  window.mobileHandleExitChange = function (val) {
    const exitInput = document.getElementById('mFormPlannedExit');
    const retInput = document.getElementById('mFormEstimatedReturn');
    const cat = document.getElementById('mFormCategory')?.value || '';
    if (!val) return;

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const maxHourStr = (now.getDay() === 5) ? '16:30' : '16:00';
    const todayEnd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${maxHourStr}`;

    // 1. VALIDASI KETAT ANTI MASA LALU (Toleransi 30 detik)
    if (new Date(val).getTime() < now.getTime() - 30000) {
      if (typeof window.showToast === 'function') {
        window.showToast('Rencana waktu keluar tidak boleh memilih hari kemarin atau jam yang sudah berlalu! Disesuaikan otomatis.', 'warning');
      }
      const adjusted = new Date(now.getTime() + 5 * 60000);
      if (exitInput) {
        exitInput.value = formatDateTimeLocal(adjusted);
        val = exitInput.value;
      }
    }

    // 2. VALIDASI KHUSUS URUSAN PRIBADI (HANYA HARI INI & JAM KERJA)
    if (cat === 'Urusan Pribadi') {
      const d = new Date(val);
      if (d.getDate() !== now.getDate() || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) {
        if (typeof window.showToast === 'function') {
          window.showToast('Untuk keperluan Urusan Pribadi, izin keluar hanya berlaku untuk hari ini (jam maju)!', 'warning');
        }
        const adjusted = new Date(now.getTime() + 5 * 60000);
        if (exitInput) {
          exitInput.value = formatDateTimeLocal(adjusted);
          val = exitInput.value;
        }
      }
    }

    if (retInput && val) {
      retInput.min = val;
      if (cat === 'Urusan Pribadi') {
        retInput.max = todayEnd;
      }
      if (retInput.value && new Date(retInput.value) <= new Date(val)) {
        const exitDt = new Date(val);
        retInput.value = formatDateTimeLocal(new Date(exitDt.getTime() + 2 * 60 * 60000));
      }
    }
  };

  window.mobileHandleReturnChange = function (val) {
    const exitInput = document.getElementById('mFormPlannedExit');
    const retInput = document.getElementById('mFormEstimatedReturn');
    if (!val || !exitInput) return;
    const exitVal = exitInput.value;
    if (exitVal && new Date(val) <= new Date(exitVal)) {
      if (typeof window.showToast === 'function') {
        window.showToast('Perkiraan waktu kembali harus lebih besar dari rencana waktu keluar!', 'warning');
      }
      const exitDt = new Date(exitVal);
      if (retInput) retInput.value = formatDateTimeLocal(new Date(exitDt.getTime() + 2 * 60 * 60000));
    }
  };

  // -------------------------------------------------------------------
  // MULTI-STEP NAVIGATION & STEPPER CONTROLLER (MOBILE ONLY)
  // -------------------------------------------------------------------
  window.mobileUpdateStepperUI = function(step) {
    const isEmg = Boolean(currentFormIsEmergency);
    const activeColor = isEmg ? '#dc2626' : '#059669';
    const inactiveBg = '#cbd5e1';
    const inactiveText = '#64748b';

    const c1 = document.getElementById('mStepCircle1');
    const c2 = document.getElementById('mStepCircle2');
    const c3 = document.getElementById('mStepCircle3');
    const t1 = document.getElementById('mStepText1');
    const t2 = document.getElementById('mStepText2');
    const t3 = document.getElementById('mStepText3');
    const l1 = document.getElementById('mStepLine1');
    const l2 = document.getElementById('mStepLine2');
    const backBtnText = document.getElementById('mBtnHeaderBackText');

    if (backBtnText) {
      backBtnText.textContent = step === 2 ? 'Langkah Sebelumnya' : 'Kembali';
    }

    if (c1 && t1) {
      if (step === 1) {
        c1.style.background = activeColor;
        c1.textContent = '1';
        t1.style.color = activeColor;
        t1.style.fontWeight = '800';
      } else if (step > 1) {
        c1.style.background = activeColor;
        c1.textContent = '✓';
        t1.style.color = activeColor;
        t1.style.fontWeight = '700';
      }
    }

    if (l1) {
      l1.style.background = (step >= 2) ? activeColor : '#e2e8f0';
    }

    if (c2 && t2) {
      if (step < 2) {
        c2.style.background = inactiveBg;
        c2.textContent = '2';
        t2.style.color = inactiveText;
        t2.style.fontWeight = '600';
      } else if (step === 2) {
        c2.style.background = activeColor;
        c2.textContent = '2';
        t2.style.color = activeColor;
        t2.style.fontWeight = '800';
      } else if (step > 2) {
        c2.style.background = activeColor;
        c2.textContent = '✓';
        t2.style.color = activeColor;
        t2.style.fontWeight = '700';
      }
    }

    if (l2) {
      l2.style.background = (step >= 3) ? activeColor : '#e2e8f0';
    }

    if (c3 && t3) {
      if (step < 3) {
        c3.style.background = inactiveBg;
        t3.style.color = inactiveText;
        t3.style.fontWeight = '600';
      } else {
        c3.style.background = activeColor;
        t3.style.color = activeColor;
        t3.style.fontWeight = '800';
      }
    }
  };

  window.mobileFormGoToStep = function (targetStep) {
    if (targetStep === 2) {
      // Validasi Tahap 1 sebelum berpindah ke Tahap 2
      const approverName = document.getElementById('mFormApproverValue')?.value || '';
      const category = document.getElementById('mFormCategory')?.value || '';
      const returnType = document.getElementById('mFormReturnType')?.value || '';

      if (!approverName) {
        if (typeof window.showToast === 'function') window.showToast('Harap cari dan pilih nama Atasan Peninjau terlebih dahulu!', 'warning');
        if (typeof window.mobileChangeApprover === 'function') window.mobileChangeApprover();
        return;
      }

      if (!category) {
        if (typeof window.showToast === 'function') window.showToast('Harap pilih Kategori Keperluan!', 'warning');
        document.getElementById('mFormCategory')?.focus();
        return;
      }

      if (!returnType) {
        if (typeof window.showToast === 'function') window.showToast('Harap pilih Tipe Kepulangan!', 'warning');
        document.getElementById('mFormReturnType')?.focus();
        return;
      }

      if (category === 'Dinas Kantor' && !window._currentSuratPerintahMobile) {
        if (typeof window.showToast === 'function') {
          window.showToast('Surat Perintah / Tugas Dinas wajib diunggah untuk kategori Dinas Kantor!', 'danger');
        }
        const dropzone = document.getElementById('mDropzoneSuratPerintah');
        if (dropzone) {
          dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
          dropzone.style.borderColor = '#e11d48';
          setTimeout(() => {
            if (dropzone) dropzone.style.borderColor = '';
          }, 3500);
        }
        return;
      }

      const mobileMembers = (category === 'Dinas Kantor' && Array.isArray(window._selectedGroupMembersMobile)) ? [...window._selectedGroupMembersMobile] : [];
      if (category === 'Dinas Kantor' && mobileMembers.length > 0) {
        for (const m of mobileMembers) {
          const actTik = typeof window.getActiveTicket === 'function' ? window.getActiveTicket(m.nip) : null;
          if (actTik && (!window.editingTicketId || actTik.id !== window.editingTicketId)) {
            if (typeof window.showToast === 'function') {
              window.showToast(`Anggota (${m.name}) masih memiliki izin aktif (#${actTik.id}). Harap hapus anggota ini dari tim terlebih dahulu.`, 'warning');
            }
            return;
          }
        }
      }
    }

    window.currentMobileFormStep = targetStep;

    const s1 = document.getElementById('mFormStep1');
    const s2 = document.getElementById('mFormStep2');
    if (s1 && s2) {
      if (targetStep === 1) {
        s1.style.display = 'block';
        s2.style.display = 'none';
      } else {
        s1.style.display = 'none';
        s2.style.display = 'block';
      }
    }

    window.mobileUpdateStepperUI(targetStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Form Submit Handler -> Validates & Opens Step 2 Confirmation Summary
  window.mobileSubmitPermitForm = function (e, isEmergency) {
    e.preventDefault();

    // 0. Validasi Jam Kerja Reguler Pengiriman (Senin - Kamis max 16:00, Jumat max 16:30, Sabtu/Minggu libur)
    if (typeof window.isWithinOperationalHours === 'function') {
      const opCheck = window.isWithinOperationalHours(new Date());
      if (!opCheck.allowed) {
        if (typeof window.showToast === 'function') {
          window.showToast(opCheck.message || `Pengajuan izin hanya dapat dilakukan saat jam kerja reguler (${opCheck.scheduleText})!`, 'danger');
        } else {
          alert(opCheck.message || `Pengajuan izin hanya dapat dilakukan saat jam kerja reguler (${opCheck.scheduleText})!`);
        }
        return;
      }
    }

    const approverName = document.getElementById('mFormApproverValue')?.value || '';
    let approverNip = document.getElementById('mFormApproverNip')?.value || selectedApproverData?.nip || '';
    if (!approverNip && approverName) {
      const approvers = getMobileApprovers();
      const match = approvers.find(a => a.name === approverName);
      if (match) approverNip = match.nip;
    }
    const category = document.getElementById('mFormCategory')?.value || '';
    const returnType = document.getElementById('mFormReturnType')?.value || '';
    const destination = (document.getElementById('mFormDestination')?.value || '').trim();
    const reason = (document.getElementById('mFormReason')?.value || '').trim();
    const plannedExit = document.getElementById('mFormPlannedExit')?.value || '';
    const estimatedReturn = returnType === 'Pulang Mendahului' ? null : (document.getElementById('mFormEstimatedReturn')?.value || '');
    const emergencyMethod = document.querySelector('input[name="mEmgMethod"]:checked')?.value || 'app';

    // 1. Approver check
    if (!approverName) {
      if (typeof window.showToast === 'function') window.showToast('Harap cari dan pilih nama atasan Anda terlebih dahulu!', 'warning');
      window.mobileChangeApprover();
      return;
    }

    // 2. Category check
    if (!category) {
      if (typeof window.showToast === 'function') window.showToast('Harap pilih kategori keperluan!', 'warning');
      document.getElementById('mFormCategory')?.focus();
      return;
    }

    // 3. Return type check
    if (!returnType) {
      if (typeof window.showToast === 'function') window.showToast('Harap pilih tipe kepulangan!', 'warning');
      document.getElementById('mFormReturnType')?.focus();
      return;
    }

    // 4. Destination & Reason check
    if (!destination || !reason) {
      if (typeof window.showToast === 'function') window.showToast('Harap lengkapi lokasi tujuan dan alasan keperluan izin!', 'warning');
      if (!destination) document.getElementById('mFormDestination')?.focus();
      else document.getElementById('mFormReason')?.focus();
      return;
    }

    if (typeof window.countWords === 'function' ? window.countWords(reason) > 500 : reason.split(/\s+/).filter(Boolean).length > 500) {
      if (typeof window.showToast === 'function') window.showToast('Alasan keperluan izin dibatasi maksimal 500 kata!', 'warning');
      document.getElementById('mFormReason')?.focus();
      return;
    }

    // 5. Planned exit check
    if (!plannedExit) {
      if (typeof window.showToast === 'function') window.showToast('Harap isi rencana waktu keluar!', 'warning');
      document.getElementById('mFormPlannedExit')?.focus();
      return;
    }

    const now = new Date();
    const thirtySecAgo = new Date(now.getTime() - 30000);
    if (new Date(plannedExit) < thirtySecAgo) {
      if (typeof window.showToast === 'function') window.showToast('Rencana waktu keluar tidak boleh memilih waktu atau jam yang sudah berlalu!', 'danger');
      document.getElementById('mFormPlannedExit')?.focus();
      return;
    }

    // 6. Urusan Pribadi check
    if (category === 'Urusan Pribadi') {
      const exitD = new Date(plannedExit);
      if (exitD.getDate() !== now.getDate() || exitD.getMonth() !== now.getMonth() || exitD.getFullYear() !== now.getFullYear()) {
        if (typeof window.showToast === 'function') window.showToast('Untuk keperluan Urusan Pribadi, izin keluar hanya berlaku untuk hari ini!', 'warning');
        document.getElementById('mFormPlannedExit')?.focus();
        return;
      }
    }

    // Validasi Rencana Waktu Keluar terhadap jam kerja pabrik (07:00 - 16:00/16:30)
    if (typeof window.validateWorkingHours === 'function') {
      const exitWorkCheck = window.validateWorkingHours(plannedExit, isEmergency ? 'Rencana waktu keluar darurat' : 'Rencana waktu keluar');
      if (!exitWorkCheck.valid) {
        if (typeof window.showToast === 'function') {
          window.showToast(exitWorkCheck.message, 'danger');
        }
        document.getElementById('mFormPlannedExit')?.focus();
        return;
      }
    }

    // 7. Estimated return check
    if (returnType === 'Kembali ke Area') {
      if (!estimatedReturn) {
        if (typeof window.showToast === 'function') window.showToast('Harap isi perkiraan waktu kembali!', 'warning');
        document.getElementById('mFormEstimatedReturn')?.focus();
        return;
      }
      if (new Date(estimatedReturn) <= new Date(plannedExit)) {
        if (typeof window.showToast === 'function') window.showToast('Perkiraan jam kembali harus lebih besar dari rencana jam keluar!', 'danger');
        document.getElementById('mFormEstimatedReturn')?.focus();
        return;
      }
      if (category === 'Urusan Pribadi') {
        const retD = new Date(estimatedReturn);
        if (retD.getDate() !== now.getDate() || retD.getMonth() !== now.getMonth() || retD.getFullYear() !== now.getFullYear()) {
          if (typeof window.showToast === 'function') window.showToast('Untuk keperluan Urusan Pribadi, perkiraan waktu kembali harus pada hari ini!', 'warning');
          document.getElementById('mFormEstimatedReturn')?.focus();
          return;
        }
      }

      // Validasi Perkiraan Waktu Kembali terhadap jam kerja pabrik (07:00 - 16:00/16:30)
      if (typeof window.validateWorkingHours === 'function') {
        const returnWorkCheck = window.validateWorkingHours(estimatedReturn, isEmergency ? 'Perkiraan waktu kembali darurat' : 'Perkiraan waktu kembali');
        if (!returnWorkCheck.valid) {
          if (typeof window.showToast === 'function') {
            window.showToast(returnWorkCheck.message, 'danger');
          }
          document.getElementById('mFormEstimatedReturn')?.focus();
          return;
        }
      }
    }

    if (category === 'Dinas Kantor' && !window._currentSuratPerintahMobile) {
      if (typeof window.showToast === 'function') {
        window.showToast('Surat Perintah / Tugas Dinas wajib diunggah untuk kategori Dinas Kantor!', 'danger');
      }
      const dropzone = document.getElementById('mDropzoneSuratPerintah');
      if (dropzone) {
        dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
        dropzone.style.borderColor = '#e11d48';
        setTimeout(() => {
          if (dropzone) dropzone.style.borderColor = '';
        }, 3500);
      }
      return;
    }

    // Validasi Anggota: pastikan tidak ada anggota rombongan yang sedang memiliki izin aktif
    const mobileMembers = (category === 'Dinas Kantor' && Array.isArray(window._selectedGroupMembersMobile)) ? [...window._selectedGroupMembersMobile] : [];
    if (category === 'Dinas Kantor' && mobileMembers.length > 0) {
      for (const m of mobileMembers) {
        const actTik = typeof window.getActiveTicket === 'function' ? window.getActiveTicket(m.nip) : null;
        if (actTik && (!window.editingTicketId || actTik.id !== window.editingTicketId)) {
          if (typeof window.showToast === 'function') {
            window.showToast(`Anggota (${m.name}) masih memiliki izin aktif (#${actTik.id}). Harap hapus anggota ini dari tim terlebih dahulu.`, 'warning');
          }
          return;
        }
      }
    }

    // Save pending form data for Step 2 Confirmation
    pendingMobileFormData = {
      approverName,
      approverNip,
      category,
      returnType,
      type: returnType,
      destination,
      reason,
      plannedExit,
      estimatedReturn,
      emergencyMethod,
      isEmergency: !!isEmergency,
      isEditing: Boolean(window.editingTicketId),
      editingTicketId: window.editingTicketId,
      members: (category === 'Dinas Kantor' && Array.isArray(window._selectedGroupMembersMobile)) ? [...window._selectedGroupMembersMobile] : [],
      suratPerintah: (category === 'Dinas Kantor' && window._currentSuratPerintahMobile)
        ? { ...window._currentSuratPerintahMobile }
        : null
    };
    window.pendingMobileFormData = pendingMobileFormData;

    // Open Step 3: Konfirmasi Ringkasan Pengajuan
    if (typeof window.mobileUpdateStepperUI === 'function') {
      window.mobileUpdateStepperUI(3);
    }
    window.mobileOpenConfirmSummarySheet();
  };

  // -------------------------------------------------------------------
  // 7. STEP 3: KONFIRMASI RINGKASAN PENGAJUAN (EXACT PC MODAL 2)
  // -------------------------------------------------------------------
  window.mobileOpenConfirmSummarySheet = function () {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop || (!pendingMobileFormData && !window.pendingMobileFormData)) return;
    const data = pendingMobileFormData || window.pendingMobileFormData;
    const emp = getActiveEmp();
    const isEditing = data.isEditing;

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="padding: 14px 18px 10px 18px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.25;">
            ${isEditing ? `Konfirmasi Perubahan Izin — ${data.editingTicketId}` : 'Konfirmasi Ringkasan Pengajuan'}
          </h3>
          <p style="font-size: 0.775rem; color: #64748b; margin: 3px 0 0 0;">
            ${isEditing ? 'Pastikan seluruh pembaruan data perizinan sudah sesuai' : 'Pastikan seluruh informasi perizinan sudah sesuai'}
          </p>
        </div>
        <button type="button" class="mobile-sheet-close" onclick="window.mobileCloseSheet()" title="Tutup">✕</button>
      </div>

      <div class="mobile-sheet-body">
        <!-- Summary Card -->
        <div class="mobile-summary-card">
          <div class="mobile-summary-row">
            <span class="mobile-summary-label">Pemohon</span>
            <span class="mobile-summary-value">${emp.name} (${emp.nip})</span>
          </div>
          <div class="mobile-summary-row">
            <span class="mobile-summary-label">Atasan Peninjau</span>
            <span class="mobile-summary-value" style="color: #059669; font-weight: 700;">${data.approverName}</span>
          </div>
          <div class="mobile-summary-row">
            <span class="mobile-summary-label">Kategori Keperluan</span>
            <span class="mobile-summary-value">${data.category}</span>
          </div>
          ${(data.members && data.members.length > 0) ? `
            <div class="mobile-summary-row">
              <span class="mobile-summary-label">Rekan Dinas</span>
              <div class="mobile-summary-value" style="display: flex; flex-direction: column; gap: 4px;">
                ${data.members.map(m => `
                  <div style="font-size: 0.775rem; font-weight: 700; color: #0f172a; line-height: 1.4;">
                    • ${escapeHtml(m.name)}
                  </div>
                `).join('')}
                <div style="font-size: 0.7rem; color: #64748b; font-weight: 600; line-height: 1.3;">
                  (${data.members.length} Orang)
                </div>
              </div>
            </div>
          ` : ''}
          ${data.suratPerintah ? `
            <div class="mobile-summary-row">
              <span class="mobile-summary-label">Surat Perintah</span>
              <div class="mobile-summary-value" style="display: flex; align-items: flex-start; gap: 6px; color: #0f172a; font-weight: 700; line-height: 1.4;">
                <span style="font-size: 0.85rem; line-height: 1.4;">📄</span>
                <span style="word-break: break-word; line-height: 1.4;">${escapeHtml(data.suratPerintah.name)}</span>
              </div>
            </div>
          ` : ''}
          <div class="mobile-summary-row">
            <span class="mobile-summary-label">Tipe Kepulangan</span>
            <span class="mobile-summary-value">${data.returnType}</span>
          </div>
          <div class="mobile-summary-row">
            <span class="mobile-summary-label">Lokasi / Tujuan</span>
            <span class="mobile-summary-value" title="${(data.destination || '').replace(/"/g, '&quot;')}">${escapeHtml(data.destination || '-')}</span>
          </div>
          <div class="mobile-summary-row">
            <span class="mobile-summary-label">Alasan Keperluan</span>
            <span class="mobile-summary-value" style="font-style: normal; color: #0f172a; font-weight: 700; line-height: 1.4;" title="${(data.reason || '').replace(/"/g, '&quot;')}">"${escapeHtml(data.reason || '-')}"</span>
          </div>
          <div class="mobile-summary-row">
            <span class="mobile-summary-label">Rencana Keluar</span>
            <span class="mobile-summary-value">${formatDisplayDate(data.plannedExit)}</span>
          </div>
          ${data.returnType === 'Kembali ke Area' ? `
            <div class="mobile-summary-row">
              <span class="mobile-summary-label">Perkiraan Kembali</span>
              <span class="mobile-summary-value" style="color: #0f172a; font-weight: 700; line-height: 1.4;">${formatDisplayDate(data.estimatedReturn)}</span>
            </div>
          ` : `
            <div class="mobile-summary-row">
              <span class="mobile-summary-label">Perkiraan Kembali</span>
              <span class="mobile-summary-value" style="color: #64748b; line-height: 1.4;">Pulang Lebih Awal</span>
            </div>
          `}
        </div>

        <!-- Buttons -->
        <div style="display: flex; gap: 10px; margin-top: 18px; padding-top: 12px; border-top: 1px solid #f1f5f9;">
          <button type="button" class="mobile-btn-secondary" style="flex: 1; padding: 11px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 6px;" onclick="window.mobileBackToCreateModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Edit Data</span>
          </button>
          <button type="button" class="mobile-btn-primary" style="flex: 2; padding: 11px; font-weight: 700; background: #059669; border-color: #059669; display: inline-flex; align-items: center; justify-content: center; gap: 6px;" onclick="window.mobileExecuteSubmitPermit()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>${isEditing ? 'Simpan Perubahan' : (data.isEmergency ? 'Terbitkan QR Darurat' : 'Kirim Pengajuan Izin')}</span>
          </button>
        </div>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  window.mobileBackToCreateModal = function () {
    window.currentMobileFormStep = 2;
    if (!pendingMobileFormData) {
      window.mobileOpenCreateModal(false);
      return;
    }
    const data = pendingMobileFormData;
    window.mobileOpenCreateModal(data.isEmergency, {
      approver: data.approverName,
      category: data.category,
      type: data.returnType,
      destination: data.destination,
      reason: data.reason,
      plannedExit: data.plannedExit,
      estimatedReturn: data.estimatedReturn,
      members: data.members,
      suratPerintah: data.suratPerintah
    });
  };

  // -------------------------------------------------------------------
  // 8. EXECUTE SAVE / UPDATE PERMIT (100% PARITY DENGAN PC MODAL 2 SUBMISSION)
  // -------------------------------------------------------------------
  window.mobileExecuteSubmitPermit = function () {
    if (isSubmittingMobilePermit) return;
    if (!pendingMobileFormData && !window.pendingMobileFormData) return;
    isSubmittingMobilePermit = true;

    // Kunci tombol submit segera untuk mencegah double submission (KRITIS-04)
    const submitBtn = document.querySelector('#mobileActionSheet .mobile-btn-primary');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.6';
      submitBtn.style.pointerEvents = 'none';
    }

    try {
      const data = pendingMobileFormData || window.pendingMobileFormData;
      const emp = getActiveEmp();
      const tickets = (typeof window.getTickets === 'function') ? window.getTickets() : ((typeof window.loadTickets === 'function') ? window.loadTickets() : (window.ticketsList || []));

      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const dateCode = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

      // CASE 1: UPDATE EXISTING TICKET (EDIT MODE)
      if (data.isEditing && data.editingTicketId) {
        const ticketId = data.editingTicketId;
        const t = tickets.find(x => x.id === ticketId);
        if (t) {
          const oldApprover = t.approverName;
          const oldApproverNip = t.approverNip || '';
          const newApprover = data.approverName;

          const allUsersList = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
          const foundApproverUser = allUsersList.find(u => u.name === newApprover || (u.nip && u.nip === data.approverNip));
          const newApproverNip = (foundApproverUser && foundApproverUser.nip) ? foundApproverUser.nip : (data.approverNip || (newApprover && newApprover.includes('Dewi') ? 'PK-2012-0845' : 'PK-2015-1002'));
          const isApproverChanged = Boolean(oldApprover && newApprover && oldApprover !== newApprover);

          t.approverName = data.approverName;
          if (newApproverNip) t.approverNip = newApproverNip;
          t.category = data.category;
          t.type = data.returnType;
          t.returnType = data.returnType;
          t.destination = data.destination;
          t.reason = data.reason;
          t.plannedExit = data.plannedExit;
          t.estimatedReturn = data.returnType === 'Pulang Mendahului' ? null : data.estimatedReturn;
          t.plannedReturn = data.returnType === 'Pulang Mendahului' ? null : data.estimatedReturn;

          if (t.category === 'Dinas Kantor' && Array.isArray(data.members)) {
            t.members = data.members.map(m => ({
              nip: m.nip,
              name: m.name,
              department: m.department || t.department,
              supervisor: m.supervisor || t.approverName,
              supervisorNip: m.supervisorNip || t.approverNip || null,
              status: m.status || 'aktif'
            }));
            t.isGroupDinas = t.members.length > 0;
            t.suratPerintah = data.suratPerintah || null;
          } else {
            t.members = [];
            t.isGroupDinas = false;
            t.suratPerintah = null;
          }

          if (!t.timeline) t.timeline = [];

          if (isApproverChanged) {
            t.reassignedFrom = oldApprover;
            t.reassignedFromNip = oldApproverNip;
            t.reassignedTo = newApprover;
            t.reassignedToNip = newApproverNip;
            t.reassignedAt = nowFormatted;
            t.reassignedBy = `${emp.name} (Karyawan)`;

            t.timeline.unshift({
              event: 'Persetujuan Dialihkan',
              time: nowFormatted,
              by: `${emp.name} (Karyawan)`,
              desc: `Peninjauan persetujuan izin dialihkan dari ${oldApprover} ke ${newApprover}.`
            });

            // Notifikasi lonceng untuk kedua atasan jika sistem notifikasi aktif
            if (typeof window.createNotification === 'function') {
              // Untuk atasan baru yang menerima pengalihan
              window.createNotification({
                recipientRole: 'approver',
                recipientName: newApprover,
                recipientNip: newApproverNip,
                actorSource: 'karyawan',
                type: 'pengajuan_dialihkan',
                title: 'Pengajuan Dialihkan ke Anda',
                message: `Pengajuan #${ticketId} (${emp.name}) dialihkan dari ${oldApprover} ke Anda.`,
                ticketId: ticketId,
                priority: 'urgent'
              });

              // Untuk atasan lama yang dialihkan keluar
              window.createNotification({
                recipientRole: 'approver',
                recipientName: oldApprover,
                recipientNip: oldApproverNip,
                actorSource: 'karyawan',
                type: 'pengajuan_dialihkan_keluar',
                title: 'Pengajuan Dialihkan ke Atasan Lain',
                message: `Pengajuan #${ticketId} (${emp.name}) dialihkan oleh pemohon ke ${newApprover}. Status tetap dapat Anda pantau.`,
                ticketId: ticketId,
                priority: 'normal'
              });
            }
          } else {
            t.timeline.unshift({
              event: 'Pengajuan Diperbarui (Diedit)',
              time: nowFormatted,
              by: `${emp.name} (Karyawan)`,
              desc: `Data pengajuan izin diperbarui sebelum persetujuan Atasan (${t.approverName}).`
            });
          }

          window.editingTicketId = null;
          pendingMobileFormData = null;

          if (typeof window.saveTickets === 'function') {
            window.saveTickets(tickets);
          } else {
            localStorage.setItem('kujang_tickets', JSON.stringify(tickets));
            window.ticketsList = tickets;
          }

          window.mobileCloseSheet();

          if (typeof window.showToast === 'function') {
            if (isApproverChanged) {
              window.showToast(`Pengajuan #${ticketId} berhasil dialihkan ke ${newApprover}!`, 'success');
            } else {
              window.showToast(`Pengajuan #${ticketId} berhasil diperbarui!`, 'success');
            }
          }

          currentKaryawanTab = 'pengajuan';
          try {
            sessionStorage.setItem('KUJANG_MOBILE_ACTIVE_TAB', 'pengajuan');
            localStorage.setItem('KUJANG_MOBILE_ACTIVE_TAB', 'pengajuan');
            sessionStorage.removeItem('KUJANG_FORM_IS_EMERGENCY');
          } catch (e) {}
          renderMobileKaryawan(null, 'pengajuan');
          if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
          if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
          if (typeof window.renderApproverView === 'function') window.renderApproverView();
          if (typeof window.updateApproverMetrics === 'function') window.updateApproverMetrics();
          return;
        }
      }

      // CASE 2: CREATE NEW TICKET (PARITY DENGAN PC MODAL 1 & 2)
      // BRULE-22 Enforcement: Maksimal 1 tiket aktif
      const existingActive = getActiveTicket();
      if (existingActive) {
        if (typeof window.showToast === 'function') {
          window.showToast('Gagal: Anda masih memiliki tiket aktif! Sesuai aturan BRULE-22, Anda hanya dapat memiliki maksimal 1 izin aktif.', 'danger');
        }
        window.mobileCloseSheet();
        renderMobileKaryawan(null, 'pengajuan');
        isSubmittingMobilePermit = false;
        return;
      }

      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const newId = (data.isEmergency ? 'TK-EMG-' : 'TK-') + dateCode + '-' + randomSuffix;

      const allUsersList = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
      const foundApproverUser = allUsersList.find(u => u.name === data.approverName || (u.nip && u.nip === data.approverNip));
      const resolvedApproverNip = (foundApproverUser && foundApproverUser.nip) ? foundApproverUser.nip : (data.approverNip || 'PK-2015-1002');
      const resolvedSupervisorName = (emp.directSupervisor) ? emp.directSupervisor : (foundApproverUser ? foundApproverUser.name : data.approverName);
      const resolvedSupervisorNip = (emp.directSupervisorNip) ? emp.directSupervisorNip : resolvedApproverNip;

      const newTicket = {
        id: newId,
        applicantName: emp.name,
        applicantNip: emp.nip,
        employeeId: 'EMP-001',
        employeeName: emp.name,
        employeeNip: emp.nip,
        department: emp.dept || 'Departemen Rekayasa & Pemeliharaan',
        category: data.category,
        type: data.returnType,
        returnType: data.returnType,
        destination: data.destination,
        reason: data.reason,
        transportMode: 'Kendaraan dinas',
        transportation: 'Kendaraan dinas',
        plannedExit: data.plannedExit,
        estimatedReturn: data.returnType === 'Pulang Mendahului' ? null : data.estimatedReturn,
        plannedReturn: data.returnType === 'Pulang Mendahului' ? null : data.estimatedReturn,
        approverName: data.approverName,
        approverNip: resolvedApproverNip,
        approverNote: null,
        systemNote: null,
        reassignedFrom: null,
        reassignedTo: null,
        directSupervisor: resolvedSupervisorName,
        directSupervisorNip: resolvedSupervisorNip,
        status: data.isEmergency ? 'Menunggu Otorisasi Darurat' : 'Menunggu Persetujuan',
        isEmergency: !!data.isEmergency,
        emergencyLocked: !!data.isEmergency,
        qrLocked: !!data.isEmergency,
        emergencyPasscode: data.isEmergency ? String(Math.floor(100000 + Math.random() * 900000)) : undefined,
        emergencyMethod: data.emergencyMethod || 'app',
        createdAt: nowFormatted,
        timeline: [
          {
            event: data.isEmergency ? 'Pengajuan Izin Darurat Dibuat' : 'Pengajuan Dibuat',
            time: nowFormatted,
            by: `${emp.name} (Karyawan)`,
            desc: data.isEmergency
              ? 'Izin darurat dibuat via sistem bypass, menunggu otorisasi aplikasi Atasan atau scan wajah.'
              : `Pengajuan tiket izin keluar area berhasil dikirim ke antrean Atasan (${data.approverName}).`
          }
        ]
      };

      if (data.category === 'Dinas Kantor' && !data.suratPerintah) {
        if (typeof window.showToast === 'function') {
          window.showToast('Surat Perintah / Tugas Dinas wajib diunggah untuk kategori Dinas Kantor!', 'danger');
        }
        return;
      }

      const isGroupDinas = data.category === 'Dinas Kantor' && Array.isArray(data.members) && data.members.length > 0;
      if (isGroupDinas) {
        newTicket.isGroupDinas = true;
        newTicket.initiatorNip = emp.nip;
        newTicket.initiatorName = emp.name;
        const allUsers = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
        newTicket.members = data.members.map(m => {
          const u = allUsers.find(x => x.nip === m.nip);
          const supName = (u && (u.directSupervisor || u.supervisor)) || m.supervisor || null;
          let supNip = m.supervisorNip || (u && (u.directSupervisorNip || u.supervisorNip)) || null;
          if (!supNip && supName) {
            const supUser = allUsers.find(x => x.name === supName || (supName.includes('Dewi') && x.nip === 'PK-2012-0845') || (supName.includes('Subagja') && x.nip === 'PK-2012-0543') || (supName.includes('Hendra') && x.nip === 'PK-2015-1002'));
            if (supUser) supNip = supUser.nip;
          }
          return {
            nip: m.nip,
            name: m.name,
            department: m.department || (u ? u.department : newTicket.department),
            supervisor: supName,
            supervisorNip: supNip,
            status: 'aktif'
          };
        });
        const memberNames = newTicket.members.map(m => m.name).join(', ');
        newTicket.timeline[0].desc += ` (Izin Dinas Bersama: ${newTicket.applicantName} mengikutsertakan ${memberNames}).`;
      }

      if (data.suratPerintah) {
        newTicket.suratPerintah = data.suratPerintah;
      }

      tickets.unshift(newTicket);

      if (typeof window.createNotification === 'function') {
        if (data.isEmergency) {
          window.createNotification({
            recipientRole: 'approver',
            recipientName: newTicket.approverName || 'Ir. Hendra Gunawan, M.T.',
            actorSource: 'karyawan',
            type: 'darurat_baru',
            title: 'IZIN DARURAT BARU',
            message: `PERINGATAN: ${newTicket.applicantName} (${newTicket.applicantNip}) mengajukan izin kedaruratan #${newTicket.id}. Memerlukan otorisasi segera.`,
            ticketId: newTicket.id,
            priority: 'high',
            eventId: `emg_alert_${newTicket.id}`
          });
        } else {
          window.createNotification({
            recipientRole: 'approver',
            recipientName: newTicket.approverName || 'Ir. Hendra Gunawan, M.T.',
            actorSource: 'karyawan',
            type: 'pengajuan_baru',
            title: 'Pengajuan Izin Baru',
            message: `${newTicket.applicantName} (${newTicket.applicantNip}) mengajukan izin ${newTicket.category}. Menunggu persetujuan Anda.`,
            ticketId: newTicket.id,
            priority: 'normal',
            eventId: `new_sub_${newTicket.id}`
          });

          if (isGroupDinas && Array.isArray(newTicket.members)) {
            newTicket.members.forEach(m => {
              window.createNotification({
                recipientRole: 'karyawan',
                recipientNip: m.nip,
                recipientName: m.name,
                actorSource: 'karyawan',
                type: 'pengajuan_dinas_bersama',
                title: 'Izin Dinas Kantor Bersama',
                message: `Anda ditambahkan oleh ${newTicket.applicantName} ke pengajuan izin Dinas Kantor (${newTicket.destination}). Izin ini aktif bersama tim dinas.`,
                ticketId: newTicket.id,
                priority: 'normal',
                eventId: `grp_notif_m_${newTicket.id}_${m.nip}`
              });
            });

            // Kirim notifikasi tembusan ke atasan langsung anggota jika berbeda dari peninjau utama
            const supGroupMap = {};
            newTicket.members.forEach(m => {
              const supNip = m.supervisorNip;
              const supName = m.supervisor;
              if (supNip && supNip !== newTicket.approverNip) {
                if (!supGroupMap[supNip]) {
                  supGroupMap[supNip] = { nip: supNip, name: supName, members: [] };
                }
                supGroupMap[supNip].members.push(m.name.split(',')[0].trim());
              }
            });

            Object.values(supGroupMap).forEach(supObj => {
              const formattedMembers = supObj.members.join(' dan ');
              window.createNotification({
                recipientRole: 'approver',
                recipientNip: supObj.nip,
                recipientName: supObj.name,
                actorSource: 'karyawan',
                type: 'info_tembusan',
                title: 'Tembusan Pengajuan Dinas Staf',
                message: `Staf Anda (${formattedMembers}) terdaftar dalam pengajuan Dinas Kantor bersama tim (Inisiator: ${newTicket.applicantName}) ke ${newTicket.destination}. Menunggu persetujuan ${newTicket.approverName}.`,
                ticketId: newTicket.id,
                priority: 'normal',
                eventId: `fyi_submitted_m_${newTicket.id}_${supObj.nip}`
              });
            });
          }
        }
      }

      window._selectedGroupMembersMobile = [];

      if (typeof window.saveTickets === 'function') {
        window.saveTickets(tickets);
      } else {
        localStorage.setItem('kujang_tickets', JSON.stringify(tickets));
        window.ticketsList = tickets;
      }

      pendingMobileFormData = null;
      window.editingTicketId = null;

      window.mobileCloseSheet();

      if (data.isEmergency) {
        if (typeof window.showToast === 'function') {
          window.showToast(`Izin Darurat #${newId} dibuat! QR Code terkunci sampai diotorisasi Atasan.`, 'warning');
        }
        setTimeout(() => {
          window.mobileOpenEmergencyUnlockSheet(newId);
        }, 250);
      } else {
        if (typeof window.showToast === 'function') {
          window.showToast(`Tiket #${newId} berhasil diajukan! Sistem kini mengunci pengajuan baru hingga tiket ini diproses.`, 'success');
        }
      }

      currentKaryawanTab = 'pengajuan';
      if (typeof window.currentMobileTab !== 'undefined') {
        window.currentMobileTab = 'pengajuan';
      }
      try {
        sessionStorage.setItem('KUJANG_MOBILE_ACTIVE_ROLE', 'karyawan');
        localStorage.setItem('KUJANG_MOBILE_ACTIVE_ROLE', 'karyawan');
        sessionStorage.setItem('KUJANG_MOBILE_ACTIVE_TAB', 'pengajuan');
        localStorage.setItem('KUJANG_MOBILE_ACTIVE_TAB', 'pengajuan');
        sessionStorage.setItem('KUJANG_KARYAWAN_NAV', 'pengajuan');
        localStorage.setItem('KUJANG_KARYAWAN_NAV', 'pengajuan');
        sessionStorage.removeItem('KUJANG_FORM_IS_EMERGENCY');
      } catch (e) {}
      if (typeof window.renderMobileShell === 'function') window.renderMobileShell();
      renderMobileKaryawan(null, 'pengajuan');
      if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
      if (typeof window.renderApproverView === 'function') window.renderApproverView();
    } finally {
      isSubmittingMobilePermit = false;
    }
  };

  // -------------------------------------------------------------------
  // TAP IN KARTU AKSES (ALUR KEMBALI KE PABRIK)
  // -------------------------------------------------------------------
  window.mobileExecuteTapIn = function (ticketId) {
    let executedInCore = false;
    if (typeof window.executeScanIn === 'function') {
      try {
        window.executeScanIn(ticketId);
        executedInCore = true;
      } catch (err) {
        console.warn('executeScanIn threw error, falling back to local mobile handler:', err);
      }
    }

    if (!executedInCore) {
      const tickets = window.ticketsList || [];
      const t = tickets.find(x => x.id === ticketId);
      if (t) {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;
        const wasOverdue = (t.status === 'Terlambat');

        t.status = 'Selesai';
        t.scanInTime = `${nowFormatted} (Pos Gerbang)`;
        t.scanInGate = 'Pos Gerbang';

        if (t.pendingExtension || t.hasExtensionPending) {
          if (!t.timeline) t.timeline = [];
          const actorApplicant = t.applicantName || (typeof getActiveEmp === 'function' ? getActiveEmp().name : '') || 'Karyawan';
          t.timeline.push({
            event: 'Perpanjangan Waktu Gugur Otomatis',
            time: nowFormatted,
            by: `${actorApplicant} (Karyawan)`,
            desc: `Pengajuan perpanjangan waktu otomatis dibatalkan karena karyawan telah Tap In masuk ke area pabrik.`
          });
          delete t.pendingExtension;
          t.hasExtensionPending = false;
          delete t.extensionRequestedTime;
        } else {
          t.hasExtensionPending = false;
          t.pendingExtension = null;
        }

        const actorApplicant = t.applicantName || (typeof getActiveEmp === 'function' ? getActiveEmp().name : '') || 'Karyawan';
        if (!t.timeline) t.timeline = [];
        t.timeline.push({
          event: wasOverdue ? 'Tap In Kartu (Kembali Terlambat)' : 'Tap In Kartu (Kembali Tepat Waktu)',
          time: nowFormatted,
          by: `${actorApplicant} (Karyawan)`,
          desc: `Tap In Kartu Akses berhasil di Pos Gerbang. Karyawan kembali ke area pabrik. Tiket #${t.id} resmi selesai.`
        });

        if (typeof window.saveTickets === 'function') window.saveTickets(tickets);
        else localStorage.setItem('kujang_tickets', JSON.stringify(tickets));

        if (typeof window.showToast === 'function') {
          window.showToast(`Tap In Kartu Akses berhasil! Anda telah kembali ke area pabrik. Tiket #${t.id} selesai.`, wasOverdue ? 'warning' : 'success');
        }
      }
    }

    // Arahkan ke tab riwayat agar karyawan dapat langsung melihat tiket yang selesai
    currentKaryawanTab = 'riwayat';
    try {
      sessionStorage.setItem('KUJANG_MOBILE_ACTIVE_TAB', 'riwayat');
      localStorage.setItem('KUJANG_MOBILE_ACTIVE_TAB', 'riwayat');
      sessionStorage.removeItem('KUJANG_FORM_IS_EMERGENCY');
    } catch (e) {}

    if (typeof window.mobileSwitchTab === 'function') {
      window.mobileSwitchTab('riwayat');
    } else {
      renderMobileKaryawan(null, 'riwayat');
    }

    try { if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView(); } catch (e) {}
    try { if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics(); } catch (e) {}
    try { if (typeof window.renderSecurityView === 'function') window.renderSecurityView(); } catch (e) {}
    try { if (typeof window.renderMobileAtasan === 'function') window.renderMobileAtasan(); } catch (e) {}
    try { if (typeof window.renderMobileApprover === 'function') window.renderMobileApprover(); } catch (e) {}
  };

  // -------------------------------------------------------------------
  // OTORISASI IZIN DARURAT (3 METODE BUKA KUNCI QR DARURAT)
  // -------------------------------------------------------------------
  window.mobileOpenEmergencyUnlockSheet = function (ticketId) {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;
    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId) || getActiveTicket();
    if (!t) return;

    window.currentMobileEmergencyTicketId = t.id;

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="border-bottom: 1.5px solid #fee2e2; background: #fff5f5; padding: 14px 18px 10px 18px;">
        <div>
          <div style="font-size: 0.675rem; font-weight: 800; color: #b91c1c; letter-spacing: 0.5px;">SOP DARURAT • NO APPROVAL NO EXIT</div>
          <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 2px 0 0 0;">Otorisasi Buka Kunci QR</h3>
          <p style="font-size: 0.725rem; color: #64748b; margin: 2px 0 0 0;">Tiket ${t.id} • Atasan: ${t.approverName}</p>
        </div>
        <button type="button" class="mobile-sheet-close" onclick="window.mobileCloseSheet()">✕</button>
      </div>

      <div class="mobile-sheet-body">
        <!-- 2 Pilihan Metode Otorisasi Darurat: App Atasan & Scan Wajah -->
        <div style="display: flex; gap: 4px; background: #f1f5f9; padding: 4px; border-radius: 10px; margin-bottom: 14px;">
          <button type="button" id="mTabBtnEmgApp" class="mobile-seg-btn active" style="flex:1; padding: 7px 4px; font-size: 0.725rem; font-weight: 700;" onclick="window.mobileSwitchEmgTab('app')">
            App Atasan (1-Klik)
          </button>
          <button type="button" id="mTabBtnEmgFace" class="mobile-seg-btn" style="flex:1; padding: 7px 4px; font-size: 0.725rem; font-weight: 700;" onclick="window.mobileSwitchEmgTab('facescan')">
            Scan Wajah Biometrik
          </button>
        </div>

        <!-- Tab 1: Persetujuan App Atasan -->
        <div id="mPaneEmgApp" style="display: block; text-align: center; padding: 6px 0;">
          <div style="margin-bottom: 6px; color: #64748b;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg></div>
          <div style="font-size: 0.9rem; font-weight: 800; color: #0f172a;">Persetujuan 1-Click di Aplikasi Atasan</div>
          <p style="font-size: 0.75rem; color: #64748b; line-height: 1.45; margin: 6px 0 14px 0;">
            Notifikasi prioritas darurat telah diteruskan ke perangkat <strong>${t.approverName}</strong>. Atasan dapat menyetujui langsung dari HP atau antrean sistem.
          </p>
          <button type="button" class="mobile-btn-primary" style="background: #059669; border-color: #059669; font-weight: 800; padding: 11px;" onclick="window.mobileSimulateApproverUnlock('${t.id}')">
            <span>Simulasikan Persetujuan Atasan</span>
          </button>
        </div>

        <!-- Tab 2: Scan Wajah Biometrik -->
        <div id="mPaneEmgFace" style="display: none; text-align: center; padding: 6px 0;">
          <div style="margin-bottom: 6px; color: #64748b;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 3H5a2 2 0 0 0-2 2v2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M3 17v2a2 2 0 0 0 2 2h2"></path><circle cx="12" cy="12" r="3"></circle></svg></div>
          <div style="font-size: 0.9rem; font-weight: 800; color: #0f172a; margin-bottom: 4px;">Pindai Wajah Atasan Langsung</div>
          <div id="mFaceStatusText" style="font-size: 0.775rem; color: #475569; margin-bottom: 12px;">
            Posisikan wajah Atasan di depan kamera lalu tekan tombol scan biometrik.
          </div>
          <div style="background: #e2e8f0; height: 6px; border-radius: 999px; overflow: hidden; margin-bottom: 14px; width: 80%; margin-left: auto; margin-right: auto;">
            <div id="mFaceProgressBar" style="width: 0%; height: 100%; background: #059669; transition: width 0.3s;"></div>
          </div>
          <button type="button" id="mBtnTriggerFace" class="mobile-btn-primary" style="font-weight: 800; padding: 11px;" onclick="window.mobileTriggerFaceScan('${t.id}')">
            <span>Pindai Wajah Atasan Sekarang</span>
          </button>
        </div>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  window.mobileSwitchEmgTab = function (tab) {
    const btnApp = document.getElementById('mTabBtnEmgApp');
    const btnFace = document.getElementById('mTabBtnEmgFace');
    const paneApp = document.getElementById('mPaneEmgApp');
    const paneFace = document.getElementById('mPaneEmgFace');

    if (btnApp) btnApp.classList.toggle('active', tab === 'app');
    if (btnFace) btnFace.classList.toggle('active', tab === 'facescan');

    if (paneApp) paneApp.style.display = tab === 'app' ? 'block' : 'none';
    if (paneFace) paneFace.style.display = tab === 'facescan' ? 'block' : 'none';
  };

  function completeEmergencyUnlock(ticketId, method) {
    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;

    t.status = 'Disetujui';
    t.emergencyLocked = false;
    t.qrLocked = false;
    t.emergencyUnlockMethod = method;
    let methodShort = method;
    if (method.includes('Scan Wajah') || method.includes('Face Scan')) {
      methodShort = 'Face Scan Biometrik';
    } else if (method.includes('Persetujuan Langsung')) {
      methodShort = 'Dashboard Atasan';
    }
    t.approverNote = `[Otorisasi Sah]: QR Code dibuka via ${methodShort} oleh ${t.approverName || 'Atasan'}.`;

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

    if (!t.timeline) t.timeline = [];
    t.timeline.push({
      event: 'Otorisasi Darurat Berhasil',
      time: nowFormatted,
      by: `${t.approverName || 'Atasan Langsung'}`,
      desc: `QR Code darurat berhasil dibuka kuncinya melalui metode: ${method}. QR kini aktif untuk Scan Out di Pos Jaga.`
    });

    if (typeof window.saveTickets === 'function') window.saveTickets(tickets);
    else localStorage.setItem('kujang_tickets', JSON.stringify(tickets));

    window.mobileCloseSheet();

    if (typeof window.showToast === 'function') {
      window.showToast(`BERHASIL! QR Code Darurat #${t.id} telah TERBUKA & AKTIF!`, 'success');
    }

    renderMobileKaryawan(null, currentKaryawanTab);
    if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
    if (typeof window.renderApproverView === 'function') window.renderApproverView();

    setTimeout(() => {
      window.mobileOpenQrModal(t.id);
    }, 350);
  }

  window.mobileSimulateApproverUnlock = function (ticketId) {
    completeEmergencyUnlock(ticketId, 'Persetujuan Langsung Atasan di App');
  };

  // (Metode Kode Sandi / OTP telah dihapus sesuai BRD darurat terkini)

  window.mobileTriggerFaceScan = function (ticketId) {
    const btn = document.getElementById('mBtnTriggerFace');
    const statusText = document.getElementById('mFaceStatusText');
    const progress = document.getElementById('mFaceProgressBar');
    const overlay = document.getElementById('mFaceScanOverlay');

    if (btn) btn.disabled = true;
    if (overlay) overlay.style.display = 'block';
    if (statusText) statusText.innerHTML = '<span style="color:#059669; font-weight:700;">Memindai biometrik wajah Atasan... 30%</span>';
    if (progress) progress.style.width = '35%';

    setTimeout(() => {
      if (statusText) statusText.innerHTML = '<span style="color:#059669; font-weight:700;">Mencocokkan data wajah Atasan... 80%</span>';
      if (progress) progress.style.width = '80%';

      setTimeout(() => {
        if (statusText) statusText.innerHTML = '<span style="color:#059669; font-weight:800;">✓ Wajah Cocok (99.2%)! Otorisasi Berhasil.</span>';
        if (progress) progress.style.width = '100%';

        setTimeout(() => {
          completeEmergencyUnlock(ticketId, 'Scan Wajah Atasan (Biometrik)');
        }, 400);
      }, 500);
    }, 500);
  };

  // -------------------------------------------------------------------
  // 9. QR MODAL, DETAIL TIKET, DAN PERPANJANGAN WAKTU
  // -------------------------------------------------------------------
  let qrScanWatcherTimer = null;
  function startQrScanOutWatcher(ticketId) {
    if (qrScanWatcherTimer) clearInterval(qrScanWatcherTimer);
    window.currentOpenedMobileQrTicketId = ticketId;

    qrScanWatcherTimer = setInterval(() => {
      const sheet = document.getElementById('mobileActionSheet');
      if (!sheet || !sheet.classList.contains('open') || window.currentOpenedMobileQrTicketId !== ticketId) {
        clearInterval(qrScanWatcherTimer);
        qrScanWatcherTimer = null;
        return;
      }

      const tickets = (typeof window.loadTickets === 'function' ? window.loadTickets() : window.ticketsList) || [];
      const currentT = tickets.find(x => x.id === ticketId);

      // Jika tiket telah dipindai oleh Pos Jaga (status berubah dari 'Disetujui' ke 'Sedang di Luar' / 'Selesai')
      if (currentT && currentT.status !== 'Disetujui') {
        clearInterval(qrScanWatcherTimer);
        qrScanWatcherTimer = null;
        window.currentOpenedMobileQrTicketId = null;

        // Tutup modal QR seketika
        if (typeof window.mobileCloseSheet === 'function') {
          window.mobileCloseSheet();
        }

        const gateName = currentT.scanOutGate ? ` di ${currentT.scanOutGate}` : '';
        if (typeof window.showToast === 'function') {
          window.showToast(`✅ Tiket telah berhasil dipindai oleh Pos Jaga${gateName}. Selamat jalan!`, 'success');
        }

        // Render ulang tampilan aktif Karyawan agar langsung masuk ke status Sedang di Luar
        if (typeof window.renderMobileActiveView === 'function') {
          window.renderMobileActiveView();
        } else if (typeof window.renderMobileKaryawan === 'function') {
          window.renderMobileKaryawan();
        }
      }
    }, 600);
  }
  window.startQrScanOutWatcher = startQrScanOutWatcher;
  window.stopQrScanOutWatcher = function () {
    if (qrScanWatcherTimer) {
      clearInterval(qrScanWatcherTimer);
      qrScanWatcherTimer = null;
    }
    window.currentOpenedMobileQrTicketId = null;
  };

  window.mobileOpenDigitalPassSheet = function (ticketId) {
    return window.mobileOpenQrModal(ticketId);
  };
  window.mobileOpenQrModal = function (ticketId) {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;

    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId) || getActiveTicket();
    if (!t) return;

    // Mulai watcher otomatis agar saat Pos Jaga scan QR, tampilan langsung menutup sendiri
    startQrScanOutWatcher(t.id);

    const isOutside = (t.status === 'Sedang di Luar' || t.status === 'Terlambat');
    const isPulang = (t.type === 'Pulang Mendahului' || t.returnType === 'Pulang Mendahului');

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px;">
        <div>
          <span style="font-size: 0.675rem; color: #059669; font-weight: 700; text-transform: uppercase;">RINCIAN TIKET</span>
          <h3 class="mobile-sheet-title" style="font-family: monospace; font-size: 0.925rem; margin: 0; color: #0f172a;">${t.id}</h3>
        </div>
        <button type="button" aria-label="Tutup" class="mobile-sheet-close" style="width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; background: #f1f5f9; border: none; border-radius: 50%; font-size: 1.1rem; color: #64748b; cursor: pointer; padding: 0;" onclick="window.mobileCloseSheet()">✕</button>
      </div>
      <div class="mobile-sheet-body" style="text-align: center;">
        <div style="font-size: 0.8rem; color: #059669; font-weight: 700;">${t.category} • ${getTType(t)}</div>
        <div style="font-size: 1.15rem; font-weight: 800; font-family: monospace; color: #0f172a; margin: 2px 0 4px 0;">${t.id}</div>
        ${getMobileStatusBadge(t)}

        <!-- QR Box -->
        <div style="background: #ffffff; border: 2px solid #059669; border-radius: 16px; padding: 18px; margin: 16px auto; max-width: 220px; box-shadow: 0 4px 14px rgba(5,150,105,0.08);">
          <div id="mobileQrCanvasContainer" style="display:flex; justify-content:center; align-items:center;"></div>
          <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700; margin-top: 8px;">PT PUPUK KUJANG CIKAMPEK</div>
        </div>

       

        <div class="mobile-ticket-grid-meta" style="text-align: left; margin-bottom: 14px;">
          <div>
            <div class="mobile-meta-sub">Pemegang Tiket</div>
            <div class="mobile-meta-val">${getTName(t)}</div>
          </div>
          <div>
            <div class="mobile-meta-sub">${isPulang ? 'Tipe' : 'Batas Jam Kembali'}</div>
            <div class="mobile-meta-val" style="${isOutside && !isPulang ? 'color:#b91c1c;' : ''}">
              ${isPulang ? 'Pulang Lebih Awal' : (getTReturnTime(t) ? formatTimeOnly(getTReturnTime(t)) : '13.00 WIB')}
            </div>
          </div>
        </div>

        <div style="margin-top: 10px;">
          <button type="button" class="mobile-btn-primary" style="width: 100%; font-weight: 700; background: #0284c7; border-color: #0284c7; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px;" onclick="window.mobileDownloadQr('${t.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>Unduh Tiket QR</span>
          </button>
        </div>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');

    // Generate QR
    setTimeout(() => {
      const container = document.getElementById('mobileQrCanvasContainer');
      if (container) {
        container.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
          new QRCode(container, {
            text: `KUJANG-PASS|${t.id}|${t.applicantNip || 'PK-2024-8841'}|${t.category || 'Dinas Kantor'}|${t.plannedExit || ''}`,
            width: 180,
            height: 180,
            colorDark: '#0f172a',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
          });
        } else {
          container.innerHTML = `<div style="font-family:monospace; font-size:0.8rem; padding:30px 10px; background:#f1f5f9; border-radius:8px;">[ QR CODE ${t.id} ]</div>`;
        }
      }
    }, 50);
  };

  // Open Ticket Detail Sheet (Hal 9 & 12)
  window.mobileOpenTicketDetail = function (ticketId) {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;

    const cleanId = (typeof window.extractTicketId === 'function')
      ? window.extractTicketId(ticketId)
      : String(ticketId || '').replace(/^#/, '').trim();

    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === cleanId || x.id.toUpperCase() === cleanId.toUpperCase()) ||
      (ticketId ? tickets.find(x => x.id === ticketId) : null) ||
      getActiveTicket();
    if (!t) return;
    const isPending = (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat');
    const isApproved = (t.status === 'Disetujui');
    const isOutside = (t.status === 'Sedang di Luar' || t.status === 'Terlambat');
    const isFinished = (t.status === 'Selesai' || t.status === 'Ditolak' || t.status === 'Dibatalkan' || t.status === 'Kedaluwarsa');
    const isPulang = (t.type === 'Pulang Mendahului' || t.returnType === 'Pulang Mendahului' || t.type === 'Pulang Lebih Awal');

    // BRULE-08 & BRULE-12: Hanya Karyawan pemilik tiket yang melihat tombol aksi pemilik
    const emp = getActiveEmp();
    const myActorNip = (emp && emp.nip) ? emp.nip : 'PK-2024-8841';
    const isOwner = (window.currentActor === 'karyawan' || window.currentActor === 'karyawan2' || !window.currentActor) &&
      (t.applicantNip === myActorNip || (!t.applicantNip && myActorNip === 'PK-2024-8841'));
    const isTaggedMember = Boolean(t.isGroupDinas && Array.isArray(t.members) && t.members.some(m => m.nip === myActorNip && m.status !== 'batal'));
    const isGroupDinasActive = Boolean(t.isGroupDinas && Array.isArray(t.members) && t.members.filter(m => m.status !== 'batal').length > 0);
    const canUploadProof = isOwner || isTaggedMember;

    // Push state for Android / hardware back gesture
    try {
      window.history.pushState({ modalOpen: true, modalType: 'karyawanDetail', ticketId: t.id }, '');
    } catch (e) { }

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px 8px 16px; border-bottom: 1px solid #e2e8f0;">
        <div>
          <span style="font-size: 0.675rem; color: #059669; font-weight: 700; text-transform: uppercase;">RINCIAN TIKET</span>
          <h3 class="mobile-sheet-title" style="font-family: monospace; font-size: 1rem; margin: 0; color: #0f172a;">${t.id}</h3>
        </div>
        <button type="button" aria-label="Tutup" class="mobile-sheet-close" style="width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; background: #f1f5f9; border: none; border-radius: 50%; font-size: 1.1rem; color: #64748b; cursor: pointer; padding: 0;" onclick="window.mobileCloseSheet()">✕</button>
      </div>
      <div class="mobile-sheet-body" style="padding-top: 6px; padding-bottom: 20px;">
        <div class="mobile-segment-toggle" style="margin-top: 4px; margin-bottom: 12px;">
          <button type="button" class="mobile-seg-btn active" id="mBtnDetailInfo" onclick="window.mobileToggleDetailTab('info')">Informasi Tiket</button>
          <button type="button" class="mobile-seg-btn" id="mBtnDetailJejak" onclick="window.mobileToggleDetailTab('jejak')">Riwayat Aktivitas</button>
        </div>

        <div id="mDetailSecInfo">
          <div class="mobile-card" style="margin-bottom: 8px;">
            <div style="font-size: 0.725rem; color: #0f172a; font-weight: 800; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">INFORMASI KARYAWAN</div>
            <div style="font-size: 0.75rem; color: #1e293b; line-height: 1.4;">
              <strong>Nama:</strong> ${getTName(t)}<br>
              <strong>NIP:</strong> ${getTNip(t)}<br>
              <strong>Departemen:</strong> ${t.department || 'Departemen Rekayasa & Pemeliharaan'}<br>
              <strong>Atasan:</strong> ${t.approverName || 'Ir. Hendra Gunawan, M.T.'}${t.reassignedStatusLabel ? ` <span style="font-size: 0.675rem; color: #0284c7; font-weight: 700;">(↳ ${t.reassignedStatusLabel})</span>` : (t.reassignedFrom ? ` <span style="font-size: 0.675rem; color: #b45309; font-weight: 700;">(Dialihkan dari ${t.reassignedFrom})</span>` : '')}
            </div>
          </div>

          <div class="mobile-card" style="margin-bottom: 8px; padding: 12px 14px;">
            <div style="font-size: 0.725rem; color: #0f172a; font-weight: 800; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">KEPERLUAN IZIN</div>
            <div style="background: var(--bg-subtle, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 10px;">
              <div>
                <div style="font-size: 0.7rem; color: #64748b; font-weight: 600; margin-bottom: 2px;">Tujuan Keluar</div>
                <div style="font-size: 0.75rem; color: #0f172a; font-weight: 700; word-break: break-word; overflow-wrap: anywhere; line-height: 1.35;">${t.destination || 'Area Rekayasa'}</div>
              </div>
              <div style="border-top: 1px dashed #e2e8f0; padding-top: 8px;">
                <div style="font-size: 0.7rem; color: #64748b; font-weight: 600; margin-bottom: 2px;">Alasan Keperluan</div>
                <div style="font-size: 0.74rem; color: #0f172a; font-weight: 700; word-break: break-word; overflow-wrap: anywhere; line-height: 1.4;">"${t.reason || 'Keperluan dinas kantor'}"</div>
              </div>
            </div>
          </div>

          ${(() => {
            const mRawNote = t.approverNote || t.approvalNote || '';
            const mRawSystemNote = t.systemNote || '';
            const mRawRej = t.rejectionReason || t.rejectReason || '';
            const mRawArrivalReject = t.arrivalRejectReason || '';
            const mRawArrivalConfirm = t.arrivalConfirmNote || '';
            const isAppr = (t.status === 'Disetujui' || t.status === 'Sedang di Luar' || t.status === 'Selesai' || t.status === 'Terlambat');
            const isRej = t.status === 'Ditolak' || Boolean(mRawRej);
            const isArrivalPending = t.status === 'Menunggu Bukti Kedatangan' || Boolean(mRawArrivalReject && !mRawArrivalConfirm);
            const isArrivalDone = Boolean(mRawArrivalConfirm) || (t.status === 'Selesai' && t.scanInTime && t.scanInTime.includes('Dikonfirmasi Atasan'));
            const hasReassignNote = Boolean(mRawSystemNote || (mRawNote && (mRawNote.includes('bawahan dari') || mRawNote.includes('Hak akses'))));

            if (isRej) {
              const text = mRawRej || (mRawNote ? mRawNote.replace(/^Ditolak:\s*/i, '') : 'Pengajuan izin tidak disetujui atasan.');
              return `
                <div class="mobile-card" style="margin-bottom: 8px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="font-size: 0.725rem; color: #0f172a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">CATATAN DARI ATASAN</div>
                    <span style="font-size: 0.65rem; font-weight: 700; color: #dc2626; background: #fee2e2; border: 1px solid #fecdd3; padding: 2px 8px; border-radius: 9999px;">Alasan Penolakan</span>
                  </div>
                  <div style="font-size: 0.75rem; color: #0f172a; font-weight: 600; line-height: 1.45; word-break: break-word;">${text}</div>
                </div>
              `;
            } else if (isArrivalPending) {
              const text = mRawArrivalReject || 'Atasan menandai personel belum tiba di lokasi kerja. Silakan unggah foto bukti kehadiran.';
              return `
                <div class="mobile-card" style="margin-bottom: 8px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="font-size: 0.725rem; color: #0f172a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">CATATAN DARI ATASAN</div>
                    <span style="font-size: 0.65rem; font-weight: 700; color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 8px; border-radius: 9999px;">Konfirmasi Kehadiran</span>
                  </div>
                  <div style="font-size: 0.75rem; color: #0f172a; font-weight: 600; line-height: 1.45; word-break: break-word;">${text}</div>
                </div>
              `;
            } else if (isArrivalDone) {
              const text = mRawArrivalConfirm || (mRawNote && mRawNote !== 'Disetujui' ? mRawNote : 'Kehadiran fisik karyawan di area kerja telah diverifikasi langsung oleh Atasan. Izin resmi selesai.');
              return `
                <div class="mobile-card" style="margin-bottom: 8px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="font-size: 0.725rem; color: #0f172a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">CATATAN DARI ATASAN</div>
                    <span style="font-size: 0.65rem; font-weight: 700; color: #15803d; background: #dcfce7; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 9999px;">Konfirmasi Kehadiran</span>
                  </div>
                  <div style="font-size: 0.75rem; color: #0f172a; font-weight: 600; line-height: 1.45; word-break: break-word;">${text}</div>
                </div>
              `;
            } else if (isAppr) {
              const text = (mRawNote && mRawNote !== 'Disetujui' ? mRawNote : 'Disetujui. Pastikan koordinasi selesai tepat waktu.');
              return `
                <div class="mobile-card" style="margin-bottom: 8px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="font-size: 0.725rem; color: #0f172a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">CATATAN DARI ATASAN</div>
                    <span style="font-size: 0.65rem; font-weight: 700; color: #15803d; background: #dcfce7; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 9999px;">Catatan Persetujuan</span>
                  </div>
                  <div style="font-size: 0.75rem; color: #0f172a; font-weight: 600; line-height: 1.45; word-break: break-word;">${text}</div>
                </div>
              `;
            } else if (hasReassignNote) {
              const text = mRawSystemNote || mRawNote;
              return `
                <div class="mobile-card" style="margin-bottom: 8px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="font-size: 0.725rem; color: #0f172a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">CATATAN DARI ATASAN</div>
                    <span style="font-size: 0.65rem; font-weight: 700; color: #0369a1; background: #e0f2fe; border: 1px solid #bae6fd; padding: 2px 8px; border-radius: 9999px;">Catatan Pengalihan</span>
                  </div>
                  <div style="font-size: 0.75rem; color: #0f172a; font-weight: 600; line-height: 1.45; word-break: break-word;">${text}</div>
                </div>
              `;
            }
            return '';
          })()}

          <div class="mobile-card" style="margin-bottom: 8px;">
            <div style="font-size: 0.725rem; color: #0f172a; font-weight: 800; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${isPulang ? 'WAKTU KELUAR' : 'WAKTU KELUAR & KEMBALI'}</div>
            <div class="mobile-ticket-grid-meta" style="margin: 4px 0 0 0;">
              <div>
                <div class="mobile-meta-sub">Waktu Keluar</div>
                <div class="mobile-meta-val">${t.scanOutTime ? formatDisplayDate(t.scanOutTime) + ' (Aktual)' : (getTExitTime(t) ? formatDisplayDate(getTExitTime(t)) + ' (Rencana)' : '10.00 WIB')}</div>
              </div>
              <div>
                <div class="mobile-meta-sub">${isPulang ? 'Tipe Kepulangan' : 'Batas Kembali'}</div>
                <div class="mobile-meta-val">${isPulang ? 'Pulang Lebih Awal' : (getTReturnTime(t) ? formatDisplayDate(getTReturnTime(t)) : '13.00 WIB')}</div>
              </div>
            </div>
          </div>

          ${(t.isGroupDinas && Array.isArray(t.members) && t.members.length > 0) ? `
            <div class="mobile-card" style="margin-bottom: 8px; padding: 12px 14px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 0.725rem; color: #0f172a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                  TIM DINAS BERSAMA
                </span>
                <span style="font-size: 0.72rem; color: #2563eb; font-weight: 700; background: #eff6ff; padding: 2px 8px; border-radius: 999px; border: 1px solid #bfdbfe;">
                  ${(t.initiatorCancelled ? 0 : 1) + t.members.filter(m => m.status !== 'batal').length} Karyawan Aktif
                </span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; gap: 12px;">
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 0.775rem; color: #0f172a; line-height: 1.35; display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">
                      <strong>${escapeHtml(t.applicantName || 'Inisiator')}</strong>
                      <span style="font-size: 0.675rem; font-weight: 700; color: #d97706; background: #fef3c7; padding: 1px 6px; border-radius: 4px;">Inisiator</span>
                    </div>
                    <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">
                      NIP: ${t.applicantNip || 'PK-2024-8841'}
                    </div>
                  </div>
                  <div style="flex-shrink: 0; text-align: right;">
                    <span style="font-size: 0.725rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; ${t.initiatorCancelled ? 'background: #fee2e2; color: #dc2626; border: 1px solid #fecaca;' : 'background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0;'} white-space: nowrap;">
                      ${t.initiatorCancelled ? 'Batal Ikut Serta' : 'Aktif Ikut'}
                    </span>
                  </div>
                </div>
                ${t.members.map(m => `
                  <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; gap: 12px;">
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-size: 0.775rem; color: ${(m.status === 'batal' || m.status === 'cancelled') ? '#94a3b8' : '#0f172a'}; line-height: 1.35; ${(m.status === 'batal' || m.status === 'cancelled') ? 'text-decoration: line-through;' : ''}">
                        <strong>${escapeHtml(m.name)}</strong>
                      </div>
                      <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">
                        NIP: ${m.nip}
                      </div>
                    </div>
                    <div style="flex-shrink: 0; text-align: right;">
                      <span style="font-size: 0.725rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; ${(m.status === 'batal' || m.status === 'cancelled') ? 'background: #fee2e2; color: #dc2626; border: 1px solid #fecaca;' : 'background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0;'} white-space: nowrap;">
                        ${(m.status === 'batal' || m.status === 'cancelled') ? 'Batal Ikut Serta' : 'Aktif Ikut'}
                      </span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${t.suratPerintah ? `
            <div class="mobile-card" style="margin-bottom: 8px; padding: 12px 14px; background: #ffffff; border: 1px solid #e2e8f0;">
              <div style="font-size: 0.7rem; color: #334155; font-weight: 700; margin-bottom: 6px; text-transform: uppercase;">
                Surat Perintah / Surat Tugas
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <div style="min-width: 0;">
                  <div style="font-size: 0.775rem; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">
                    ${escapeHtml(t.suratPerintah.name || 'Surat_Perintah.pdf')}
                  </div>
                  <div style="font-size: 0.675rem; color: #64748b;">
                    ${Math.round((t.suratPerintah.size || 140000)/1024)} KB • <span style="color: #16a34a; font-weight: 700;">Terlampir</span> Resmi
                  </div>
                </div>
                <button type="button" class="mobile-btn-secondary" style="padding: 4px 10px; font-size: 0.7rem; min-height: 32px; border-radius: 6px; background: #ffffff; border: 1px solid #cbd5e1; color: #334155; font-weight: 700; cursor: pointer;" onclick="if(window.viewSuratPerintahDetail){window.currentDetailTicketId='${t.id}'; window.viewSuratPerintahDetail();}">
                  Lihat File
                </button>
              </div>
            </div>
          ` : ''}

          ${t.approverNote ? `
           
          ` : ''}

          ${(t.status === 'Menunggu Bukti Kedatangan' || t.arrivalRejectReason || t.arrivalProofPhoto || (Array.isArray(t.arrivalVerificationHistory) && t.arrivalVerificationHistory.length > 0)) ? `
            <div style="margin: 12px 0; display: flex; flex-direction: column; gap: 8px;">
              <div style="font-size: 0.8rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 6px;">
                <span>Riwayat Verifikasi Kedatangan &amp; Foto Bukti Real-Time</span>
              </div>
              ${t.arrivalRejectReason ? `
                <div class="proof-reason-alert-box" style="padding: 10px 12px; border-radius: 8px; font-size: 0.775rem; line-height: 1.45; background: #ffffff; border: 1px solid #e2e8f0; color: #0f172a;">
                  <div style="font-weight: 800; color: #0f172a; margin-bottom: 3px;">
                    Alasan Belum Tiba (${escapeHtml(t.arrivalRejectBy || 'Atasan')} • Putaran #${t.arrivalRejectionRound || 1}):
                  </div>
                  <div style="color: #334155; font-weight: 600; margin-bottom: 4px;">
                    "${escapeHtml(t.arrivalRejectReason)}"
                  </div>
                  <div style="font-size: 0.7rem; color: #64748b; opacity: 0.9;">
                    Dikirim pada: ${t.arrivalRejectAt || t.tapInTime || '-'}
                  </div>
                </div>
              ` : ''}
              ${t.arrivalProofPhoto ? `
                <div class="proof-photo-review-card" style="display: flex; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 8px; background: #ffffff; border: 1px solid #e2e8f0;">
                  <img src="${t.arrivalProofPhoto}" alt="Foto Bukti" class="proof-photo-thumb" style="width: 80px; height: 56px; border-radius: 6px; object-fit: cover; cursor: pointer;" onclick="event.stopPropagation(); if(typeof window.viewArrivalProofPhoto==='function') window.viewArrivalProofPhoto('${t.id}')">
                  <div style="flex: 1; min-width: 0; font-size: 0.725rem; line-height: 1.4;">
                    <div style="font-weight: 800; color: #0f172a;">Foto Bukti Real-Time Terbaru</div>
                    <div style="color: #1e293b;">Oleh: <strong>${escapeHtml(t.arrivalProofBy || '-')}</strong></div>
                    <div style="color: #059669; font-weight: 700;">Stempel: ${t.arrivalProofAt || '-'}</div>
                    ${t.arrivalProofNote ? `<div style="font-style: italic; color: #475569; margin-top: 2px;">"${escapeHtml(t.arrivalProofNote)}"</div>` : ''}
                  </div>
                </div>
              ` : ''}
              ${(t.status === 'Menunggu Bukti Kedatangan' && canUploadProof) ? `
                <button type="button" class="mobile-btn-primary" style="background: #dc2626; border: 1.5px solid #dc2626; color: #ffffff; min-height: 44px; font-weight: 800; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: 100%; box-shadow: 0 1px 3px rgba(220,38,38,0.25); cursor: pointer;" onclick="window.mobileCloseSheet(); if(typeof window.openUploadArrivalProofModal==='function') window.openUploadArrivalProofModal('${t.id}')">
                  <span>Upload Foto Bukti Sekarang</span>
                </button>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <div id="mDetailSecJejak" style="display: none;">
          <div class="mobile-timeline">
            ${renderTimelineHtml(t)}
          </div>
        </div>
      </div> <!-- end mobile-sheet-body -->

      <!-- Action buttons STICKY at the bottom of sheet -->
      ${(isOwner || (!isOwner && isTaggedMember)) ? `
        <div class="mobile-sheet-footer" style="flex-shrink: 0; padding: 10px 16px calc(12px + env(safe-area-inset-bottom, 0px)) 16px; background: #ffffff; border-top: 1px solid #e2e8f0; z-index: 10;">
          ${isOwner ? `
            ${isPending ? `
              <div style="display: flex; gap: 10px; align-items: center; width: 100%;">
                <button type="button" class="mobile-btn-danger mobile-btn-cancel-solid" style="flex: 1; background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; min-height: 40px; padding: 0 12px; font-size: 0.8rem; font-weight: 700; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileCloseSheet(); window.mobileOpenCancelSheet('${t.id}')">
                  Batalkan Izin Ini
                </button>
                <button type="button" class="mobile-btn-secondary mobile-btn-edit-solid" style="flex: 1; background: #2563eb; color: #ffffff; border: 1.5px solid #2563eb; min-height: 40px; padding: 0 12px; font-size: 0.8rem; font-weight: 700; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileCloseSheet(); window.mobileOpenEditSheet('${t.id}')">
                  Edit Pengajuan Ini
                </button>
              </div>
            ` : ''}
            ${(isApproved && !isOutside) ? `
              <div style="display: flex; gap: 10px; align-items: center; width: 100%;">
                <button type="button" class="mobile-btn-danger mobile-btn-cancel-solid" style="flex: 1; background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; min-height: 40px; padding: 0 12px; font-size: 0.8rem; font-weight: 700; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileCloseSheet(); window.mobileOpenCancelSheet('${t.id}')">
                  Batalkan Izin
                </button>
                <button type="button" class="mobile-btn-secondary mobile-btn-qr-blue" style="flex: 1; background: #2563eb; color: #ffffff; border: 1.5px solid #2563eb; min-height: 40px; padding: 0 12px; font-size: 0.8rem; font-weight: 700; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileCloseSheet(); window.mobileOpenQrModal('${t.id}')">
                  Tampilkan QR Code
                </button>
              </div>
            ` : (isApproved ? `
              <button type="button" class="mobile-btn-danger mobile-btn-cancel-solid" style="width: 100%; background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; min-height: 40px; font-weight: 700; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileCloseSheet(); window.mobileOpenCancelSheet('${t.id}')">
                Batalkan Izin
              </button>
            ` : '')}
            ${isOutside ? `
              ${(t.status === 'Terlambat' || t.isLate) ? `
                <div style="background: #fff5f5; border: 1px solid #fecaca; border-radius: 8px; padding: 8px 10px; font-size: 0.725rem; color: #b91c1c; font-weight: 700; text-align: center; line-height: 1.35; width: 100%;">
                  ⚠️ Batas waktu telah terlewati. Perpanjangan tidak tersedia, Anda wajib segera Tap In.
                </div>
              ` : (t.extensionApproved) ? `
                <button type="button" class="mobile-btn-secondary" disabled style="background: #f8fafc; color: #94a3b8; border: 1.5px solid #e2e8f0; min-height: 40px; font-weight: 700; opacity: 0.85; cursor: not-allowed; border-radius: 8px; text-align: center; width: 100%;">
                  Perpanjangan Telah Digunakan (Maks. 1x)
                </button>
              ` : (t.hasExtensionPending || (t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan')) ? `
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; width: 100%;">
                  <button type="button" class="mobile-btn-secondary btn-pending-ext-notice" disabled style="background: #fffbeb; color: #92400e; border: 1.5px solid #fde68a; min-height: 40px; font-size: 0.68rem; font-weight: 700; opacity: 0.95; cursor: not-allowed; border-radius: 8px; text-align: center; display: flex; align-items: center; justify-content: center; padding: 0 4px; line-height: 1.2;">
                    Menunggu Persetujuan
                  </button>
                  ${isGroupDinasActive ? `
                    <button type="button" class="mobile-btn-primary" style="background: #2563eb; color: #ffffff; border: 1.5px solid #2563eb; min-height: 40px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 4px; border-radius: 8px; padding: 0 4px; line-height: 1.2;" onclick="window.mobileCloseSheet(); if(typeof window.openSimulasiTapInModal==='function') window.openSimulasiTapInModal('${t.id}'); else window.mobileExecuteTapIn('${t.id}');">
                      💳 Tap In Gerbang
                    </button>
                  ` : `
                    <button type="button" class="mobile-btn-primary" style="background: #059669; color: #ffffff; border: 1.5px solid #059669; min-height: 40px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 4px; border-radius: 8px; padding: 0 4px; line-height: 1.2;" onclick="window.mobileCloseSheet(); window.mobileExecuteTapIn('${t.id}');">
                      ✓ Tap In Masuk
                    </button>
                  `}
                  <button type="button" class="mobile-btn-danger btn-cancel-pending-ext" style="background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; min-height: 40px; font-size: 0.68rem; font-weight: 700; border-radius: 8px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 0 4px; line-height: 1.2; cursor: pointer;" onclick="window.mobileCancelPendingExtension('${t.id}')">
                    ✕ Batalkan
                  </button>
                </div>
              ` : `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%;">
                  <button type="button" class="mobile-btn-secondary mobile-btn-extend-solid" style="background: #d97706; color: #ffffff; border: 1.5px solid #d97706; min-height: 40px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; padding: 0 4px;" onclick="window.mobileCloseSheet(); window.mobileOpenPerpanjanganModal('${t.id}')">
                    Perpanjangan
                  </button>
                  ${isGroupDinasActive ? `
                    <button type="button" class="mobile-btn-primary" style="background: #2563eb; color: #ffffff; border: 1.5px solid #2563eb; min-height: 40px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 4px; border-radius: 8px; padding: 0 4px;" onclick="window.mobileCloseSheet(); if(typeof window.openSimulasiTapInModal==='function') window.openSimulasiTapInModal('${t.id}'); else window.mobileExecuteTapIn('${t.id}');">
                      💳 Tap In Gerbang
                    </button>
                  ` : `
                    <button type="button" class="mobile-btn-primary" style="background: #059669; color: #ffffff; border: 1.5px solid #059669; min-height: 40px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 4px; border-radius: 8px; padding: 0 4px;" onclick="window.mobileCloseSheet(); window.mobileExecuteTapIn('${t.id}');">
                      ✓ Tap In Masuk
                    </button>
                  `}
                </div>
              `}
            ` : ''}
            ${isFinished ? `
              <button type="button" class="mobile-btn-danger" style="background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; font-weight: 700; min-height: 40px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.825rem; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.25); width: 100%;" onclick="window.mobileDeleteTicketItem('${t.id}', 'karyawan')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                <span>Hapus Riwayat</span>
              </button>
            ` : ''}
          ` : ''}

          ${(!isOwner && isTaggedMember) ? `
            ${(isPending || (isApproved && !isOutside)) ? `
              <button type="button" class="mobile-btn-danger mobile-btn-cancel-solid" style="background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; min-height: 40px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; width: 100%;" onclick="window.mobileCloseSheet(); window.mobileOpenCancelSheet('${t.id}')">
                Batalkan Keikutsertaan Saya
              </button>
            ` : ''}
            ${isApproved && !isOutside ? `
              <button type="button" class="mobile-btn-secondary mobile-btn-qr-blue" style="background: #2563eb; color: #ffffff; border: 1.5px solid #2563eb; min-height: 40px; font-weight: 700; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; width: 100%;" onclick="window.mobileCloseSheet(); window.mobileOpenQrModal('${t.id}')">
                Tampilkan QR Code Tim
              </button>
            ` : ''}
            ${isOutside ? `
              ${isGroupDinasActive ? `
                <button type="button" class="mobile-btn-primary" style="background: #2563eb; color: #ffffff; border: 1.5px solid #2563eb; min-height: 40px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 8px; width: 100%;" onclick="window.mobileCloseSheet(); if(typeof window.openSimulasiTapInModal==='function') window.openSimulasiTapInModal('${t.id}'); else window.mobileExecuteTapIn('${t.id}');">
                  💳 Simulasi Tap In Gerbang Masuk
                </button>
              ` : `
                <button type="button" class="mobile-btn-primary" style="background: #059669; color: #ffffff; border: 1.5px solid #059669; min-height: 40px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 8px; width: 100%;" onclick="window.mobileCloseSheet(); window.mobileExecuteTapIn('${t.id}');">
                  ✓ Tap In Kartu Akses (Masuk)
                </button>
              `}
            ` : ''}
          ` : ''}
        </div>
      ` : ''}
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  window.mobileToggleDetailTab = function (tab) {
    const secInfo = document.getElementById('mDetailSecInfo');
    const secJejak = document.getElementById('mDetailSecJejak');
    const btnInfo = document.getElementById('mBtnDetailInfo');
    const btnJejak = document.getElementById('mBtnDetailJejak');
    if (!secInfo || !secJejak) return;

    if (tab === 'info') {
      secInfo.style.display = 'block';
      secJejak.style.display = 'none';
      btnInfo.classList.add('active');
      btnJejak.classList.remove('active');
    } else {
      secInfo.style.display = 'none';
      secJejak.style.display = 'block';
      btnInfo.classList.remove('active');
      btnJejak.classList.add('active');
    }
  };

  // Open Extension Request Modal (Hal 14)
  window.mobileOpenPerpanjanganModal = function (ticketId) {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;

    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId) || getActiveTicket();
    if (!t) return;

    if (t.status === 'Terlambat' || t.isLate) {
      if (typeof window.showToast === 'function') {
        window.showToast('Izin telah berstatus Terlambat! Anda tidak dapat mengajukan perpanjangan dan wajib melakukan Tap In.', 'danger');
      } else {
        alert('Izin telah berstatus Terlambat! Anda tidak dapat mengajukan perpanjangan dan wajib melakukan Tap In.');
      }
      return;
    }

    if (t.extensionApproved) {
      if (typeof window.showToast === 'function') {
        window.showToast('Perpanjangan waktu hanya dapat diajukan maksimal 1 kali dan telah disetujui sebelumnya!', 'warning');
      }
      return;
    }
    const hasPendingExt = Boolean(t.hasExtensionPending || (t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan'));
    if (hasPendingExt) {
      if (typeof window.showToast === 'function') {
        window.showToast('Permohonan perpanjangan Anda sedang menunggu persetujuan Atasan!', 'warning');
      }
      return;
    }

    const currentReturn = getTReturnTime(t) || '';
    const now = new Date();
    const baseDate = currentReturn ? new Date(currentReturn) : now;
    const newEst = new Date(baseDate.getTime() + 60 * 60000);
    const defaultNewTime = formatDateTimeLocal(newEst);

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header">
        <div>
          <h3 class="mobile-sheet-title">Ajukan Perpanjangan Waktu</h3>
          <p style="font-size: 0.725rem; color: #64748b; margin: 1px 0 0 0;">Tiket ${t.id} • Maksimal 1 Kali</p>
        </div>
        <button type="button" class="mobile-sheet-close" onclick="window.mobileCloseSheet()">✕</button>
      </div>
      <div class="mobile-sheet-body">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 14px;">
          <div style="font-size: 0.7rem; color: #64748b;">Batas Waktu Kembali Saat Ini:</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #b91c1c; margin-top: 2px;">
            ${currentReturn ? formatDisplayDate(currentReturn) : '13.00 WIB'}
          </div>
        </div>

        <form onsubmit="window.mobileSubmitPerpanjangan(event, '${t.id}')">
          <div class="mobile-form-group">
            <label class="mobile-form-label">Usulan Jam Kembali Baru <span class="req">*</span></label>
            <input type="datetime-local" class="mobile-input" id="mPerpanjangNewTime" value="${defaultNewTime}" min="${formatDateTimeLocal(new Date(Math.max(Date.now(), currentReturn ? new Date(currentReturn).getTime() : Date.now()) + 5 * 60000))}" required onclick="if(typeof this.showPicker==='function'){try{this.showPicker();}catch(e){}}" style="cursor: pointer;" onchange="const minVal = this.getAttribute('min'); if (this.value && minVal && this.value < minVal) { this.value = minVal; if (typeof window.showToast === 'function') window.showToast('Waktu perpanjangan tidak boleh di masa lampau!', 'warning'); }">
            <div style="font-size: 0.7rem; color: #64748b; margin-top: 4px;">Pilih waktu kepulangan baru (disarankan +30 s.d +60 menit).</div>
          </div>

          <div class="mobile-form-group">
            <label class="mobile-form-label">Alasan Kendala di Lapangan <span class="req">*</span></label>
            <textarea class="mobile-textarea" id="mPerpanjangReason" placeholder="Masukkan alasan kendala / perpanjangan waktu..." required style="min-height: 75px;"></textarea>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #f1f5f9;">
            <button type="button" class="mobile-btn-secondary" style="flex: 1;" onclick="window.mobileCloseSheet()">Batal</button>
            <button type="submit" class="mobile-btn-primary" style="flex: 2; background: #059669; border-color: #059669; font-weight: 700;">
              <span>Kirim Permohonan</span>
            </button>
          </div>
        </form>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  window.mobileSubmitPerpanjangan = function (e, ticketId) {
    e.preventDefault();
    if (isSubmittingPerpanjangan) return;

    const submitBtn = e.target && e.target.querySelector ? e.target.querySelector('button[type="submit"]') : null;
    const unlockBtn = () => {
      isSubmittingPerpanjangan = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.pointerEvents = 'auto';
      }
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.6';
      submitBtn.style.pointerEvents = 'none';
    }

    const newTime = document.getElementById('mPerpanjangNewTime')?.value || '';
    const rawReason = (document.getElementById('mPerpanjangReason')?.value || '').trim();
    const reason = rawReason ? escapeHtml(rawReason) : '';

    if (!newTime || !reason) {
      if (typeof window.showToast === 'function') window.showToast('Harap lengkapi waktu dan alasan perpanjangan!', 'warning');
      unlockBtn();
      return;
    }

    isSubmittingPerpanjangan = true;

    const selDate = new Date(newTime);
    const nowTime = new Date();

    // 1. Validasi Jam Kerja Operasional Pabrik saat Pengajuan Perpanjangan
    if (typeof window.isWithinOperationalHours === 'function') {
      const workHoursCheck = window.isWithinOperationalHours(nowTime);
      if (!workHoursCheck.allowed) {
        if (typeof window.showToast === 'function') {
          window.showToast(`Ajukan perpanjangan hanya bisa sebelum jam pulang (${workHoursCheck.scheduleText})!`, 'danger');
        } else {
          alert(`Ajukan perpanjangan hanya bisa sebelum jam pulang (${workHoursCheck.scheduleText})!`);
        }
        unlockBtn();
        return;
      }
    }

    if (isNaN(selDate.getTime()) || selDate.getTime() <= nowTime.getTime()) {
      if (typeof window.showToast === 'function') {
        window.showToast('Waktu perpanjangan tidak boleh di masa lampau!', 'warning');
      } else {
        alert('Waktu perpanjangan tidak boleh di masa lampau!');
      }
      unlockBtn();
      return;
    }

    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId);
    if (!t) {
      unlockBtn();
      return;
    }

    // 2. Validasi Batas Usulan Jam Kembali Baru terhadap Jam Pulang Kerja
    const isDinas = t.category && String(t.category).toLowerCase().includes('dinas');
    if (!isDinas) {
      if (selDate.getDate() !== nowTime.getDate() || selDate.getMonth() !== nowTime.getMonth() || selDate.getFullYear() !== nowTime.getFullYear()) {
        if (typeof window.showToast === 'function') {
          window.showToast('Perpanjangan waktu Urusan Pribadi hanya dapat diajukan untuk hari ini!', 'danger');
        }
        unlockBtn();
        return;
      }
      const dayOfWeek = nowTime.getDay();
      const returnHours = selDate.getHours();
      const returnMins = selDate.getMinutes();
      const returnTotalMins = returnHours * 60 + returnMins;
      const maxAllowedMins = (dayOfWeek === 5) ? (16 * 60 + 30) : (16 * 60);
      const closingStr = (dayOfWeek === 5) ? '16:30 WIB' : '16:00 WIB';

      if (returnTotalMins > maxAllowedMins) {
        if (typeof window.showToast === 'function') {
          window.showToast(`Perpanjangan waktu tidak boleh melebihi batas jam pulang kantor (${closingStr})!`, 'danger');
        }
        unlockBtn();
        return;
      }
    } else {
      if (typeof window.validateWorkingHours === 'function') {
        const extCheck = window.validateWorkingHours(newTime, 'Perkiraan waktu kembali perpanjangan');
        if (!extCheck.valid) {
          if (typeof window.showToast === 'function') {
            window.showToast(extCheck.message, 'danger');
          }
          unlockBtn();
          return;
        }
      }
    }

    const emp = getActiveEmp();
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

    t.hasExtensionPending = true;
    t.extensionRequestedTime = newTime;
    t.extensionReason = reason;
    t.pendingExtension = {
      requestedAt: nowFormatted,
      newEstimatedReturn: newTime,
      reason: reason,
      status: 'Menunggu Persetujuan'
    };

    if (!t.timeline) t.timeline = [];
    t.timeline.push({
      event: 'Perpanjangan Waktu Diajukan',
      time: nowFormatted,
      by: `${emp.name} (Karyawan)`,
      desc: `Mengajukan perpanjangan kembali hingga ${formatDisplayDate(newTime)}. Alasan: "${reason}".`
    });

    if (typeof window.saveTickets === 'function') {
      window.saveTickets(tickets);
    } else {
      localStorage.setItem('kujang_tickets', JSON.stringify(tickets));
      window.ticketsList = tickets;
      try {
        const apiBase = 'api';
        fetch(`${apiBase}/update_ticket.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: ticketId,
            action: 'request_extension',
            newEstimatedReturn: newTime,
            reason: reason
          })
        }).catch(e => console.warn('[Sync] Gagal push perpanjangan ke MySQL:', e));
      } catch (e) {}
    }

    window.mobileCloseSheet();

    if (typeof window.createNotification === 'function') {
      window.createNotification({
        recipientRole: 'approver',
        actorSource: 'karyawan',
        type: 'perpanjangan_diajukan',
        title: 'Permohonan Perpanjangan Waktu',
        message: `${emp.name} mengajukan perpanjangan waktu kembali untuk tiket #${ticketId} hingga ${formatDisplayDate(newTime)}.`,
        ticketId: ticketId,
        priority: 'normal',
        eventId: `ext_req_${ticketId}_${newTime}`
      });
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`Permohonan perpanjangan tiket #${ticketId} berhasil dikirim ke Atasan!`, 'success');
    }

    renderMobileKaryawan(null, currentKaryawanTab);
    if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
    if (typeof window.renderApproverView === 'function') window.renderApproverView();
    unlockBtn();
  };

  // -------------------------------------------------------------------
  // 10. GLOBAL EVENT DELEGATES FOR KARYAWAN
  // -------------------------------------------------------------------
  window.mobileSwitchSegment = function (seg) {
    currentSegment = seg;
    const secR = document.getElementById('mobileSecRingkasan');
    const secD = document.getElementById('mobileSecDonut');
    if (secR && secD) {
      secR.style.display = seg === 'ringkasan' ? 'grid' : 'none';
      secD.style.display = seg === 'donut' ? 'block' : 'none';
    }
    const btnR = document.getElementById('mBtnSegRingkasan');
    const btnD = document.getElementById('mBtnSegDonut');
    if (btnR && btnD) {
      if (seg === 'ringkasan') {
        btnR.style.background = '#059669';
        btnR.style.color = '#ffffff';
        btnR.style.borderColor = '#059669';
        btnD.style.background = '#ffffff';
        btnD.style.color = '#059669';
        btnD.style.borderColor = '#059669';
      } else {
        btnD.style.background = '#059669';
        btnD.style.color = '#ffffff';
        btnD.style.borderColor = '#059669';
        btnR.style.background = '#ffffff';
        btnR.style.color = '#059669';
        btnR.style.borderColor = '#059669';
      }
    }
  };

  window.mobileSearchRiwayat = function (q) {
    riwayatSearchQuery = q;
    const container = document.getElementById('mobileMainContent');
    if (container && currentKaryawanTab === 'riwayat') {
      renderRiwayat(container);
    }
  };

  window.mobileDownloadQr = function (ticketId) {
    const list = window.ticketsList || [];
    const t = list.find(x => x.id === ticketId) || {};
    const safeId = t.id || ticketId || 'IZ-TIKET';
    const safeNip = t.applicantNip || t.employeeNip || 'PK-2024-8841';
    const safeName = t.applicantName || t.employeeName || 'Budi Pratama, S.T.';
    const safeCategory = t.category || 'Dinas Kantor';
    const safeDestination = t.destination || 'Area Industri Cikampek';
    const safeReturn = t.estimatedReturn || t.plannedReturn || t.plannedExit || '-';

    // Standarisasi payload QR (Diakui penuh oleh scanner kamera & pos jaga)
    const qrPayload = `KUJANG-PASS|${safeId}|${safeNip}|${safeCategory}|${safeReturn}`;

    const finishCompositeDownload = (sourceCanvasOrImg) => {
      try {
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = 480;
        finalCanvas.height = 620;
        const ctx = finalCanvas.getContext('2d');
        if (!ctx) return;

        // 1. Background kartu putih solid
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

        // 2. Header resmi Pupuk Kujang
        ctx.fillStyle = '#065f46';
        ctx.fillRect(0, 0, finalCanvas.width, 70);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PT PUPUK KUJANG CIKAMPEK', finalCanvas.width / 2, 28);
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#a7f3d0';
        ctx.fillText('TIKET IZIN KELUAR DIGITAL (RESMI)', finalCanvas.width / 2, 48);

        // 3. QR Code dengan Quiet Zone (Margin putih 40px sekeliling)
        const qrSize = 300;
        const qrX = (finalCanvas.width - qrSize) / 2;
        const qrY = 92;

        // Border halus sekeliling quiet zone
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24);

        // Gambar QR Code
        ctx.drawImage(sourceCanvasOrImg, qrX, qrY, qrSize, qrSize);

        // 4. Panel Metadata Tiket di Bagian Bawah
        const infoY = qrY + qrSize + 30;
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(24, infoY, finalCanvas.width - 48, 148);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(24, infoY, finalCanvas.width - 48, 148);

        ctx.textAlign = 'left';

        // No. Tiket
        ctx.fillStyle = '#64748b';
        ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('NO. TIKET IZIN:', 40, infoY + 28);
        ctx.fillStyle = '#0f172a';
        ctx.font = '800 15px monospace';
        ctx.fillText(safeId, 40, infoY + 48);

        // Pemohon
        ctx.fillStyle = '#64748b';
        ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('NAMA & NIP PEMOHON:', 40, infoY + 74);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(`${safeName} (${safeNip})`, 40, infoY + 92);

        // Kategori
        ctx.fillStyle = '#64748b';
        ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('KATEGORI & TUJUAN:', 40, infoY + 118);
        ctx.fillStyle = '#047857';
        ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(`${safeCategory} • ${safeDestination}`, 40, infoY + 134);

        // 5. Unduh PNG
        const dataUrl = finalCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `Tiket-QR-${safeId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (typeof window.showToast === 'function') {
          window.showToast('Tiket QR resmi beresolusi tinggi berhasil diunduh!', 'success');
        }
      } catch (err) {
        console.error('Download QR failed:', err);
      }
    };

    if (typeof QRCode !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'fixed';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '300px';
      tempDiv.style.height = '300px';
      document.body.appendChild(tempDiv);

      new QRCode(tempDiv, {
        text: qrPayload,
        width: 300,
        height: 300,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });

      setTimeout(() => {
        const qrCanvas = tempDiv.querySelector('canvas');
        const qrImg = tempDiv.querySelector('img');
        if (qrCanvas) {
          finishCompositeDownload(qrCanvas);
        } else if (qrImg && qrImg.src) {
          const imgObj = new Image();
          imgObj.onload = () => finishCompositeDownload(imgObj);
          imgObj.src = qrImg.src;
        } else {
          const mainContainer = document.getElementById('mobileQrCanvasContainer');
          const fallbackC = mainContainer ? mainContainer.querySelector('canvas') : null;
          if (fallbackC) finishCompositeDownload(fallbackC);
        }
        if (tempDiv.parentNode) tempDiv.parentNode.removeChild(tempDiv);
      }, 70);
    } else {
      if (typeof window.showToast === 'function') window.showToast('Library QR belum termuat.', 'danger');
    }
  };

  window.mobileCloseSheet = function () {
    if (typeof window.stopQrScanOutWatcher === 'function') {
      window.stopQrScanOutWatcher();
    }
    window.currentOpenedMobileQrTicketId = null;
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (sheet) sheet.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    if (typeof window.mobileUpdateStepperUI === 'function' && currentKaryawanTab === 'form_pengajuan') {
      window.mobileUpdateStepperUI(window.currentMobileFormStep || 1);
    }
    window.editingTicketId = null;
    pendingMobileFormData = null;
  };

  window.mobileSwitchDonutPeriod = function (period) {
    mobileDonutPeriod = period || 'month';
    currentSegment = 'donut';
    renderMobileKaryawan(null, 'dashboard');
  };

  // Expose module function
  window.renderMobileKaryawan = renderMobileKaryawan;
  window.getAllEmpTickets = getAllEmpTickets;

})();
