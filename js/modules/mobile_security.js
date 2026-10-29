/**
 * SISTEM PERIZINAN KELUAR AREA - PT PUPUK KUJANG CIKAMPEK
 * MODULE: MOBILE POS JAGA / SECURITY (Ref: Figma PDF Pos Jaga Hal 1 - 7)
 * 100% PARITAS LOGIKA & ALUR SISTEM DENGAN PC (DESKTOP)
 */

(function () {
  'use strict';

  let currentSecurityTab = 'dashboard'; // 'dashboard' | 'scanner' | 'pelacakan' | 'riwayat'
  let currentScannerMode = 'camera'; // 'camera' | 'manual'
  let currentPelacakanFilter = 'outside'; // 'outside' | 'ready'
  let pelacakanSearchQuery = '';
  let riwayatSearchQuery = '';
  let riwayatStatusFilter = 'all';
  let riwayatCategoryFilter = 'all';
  let riwayatPeriodFilter = 'all'; // 'all' | 'today' | 'week' | 'month' | 'year'
  let currentRiwayatPage = 1;
  let riwayatPageSize = 6;
  let riwayatSearchDebounceTimer = null;
  let currentRiwayatView = 'card'; // 'card' | 'list'
  let isPelacakanFilterOpen = false;
  let isSecurityRiwayatFilterOpen = false;
  let activeGate = 'Pos 1 Gerbang Utama (Utara)';

  // Camera scanner instance
  let mobileHtml5QrScanner = null;
  let isMobileCameraActive = false;

  // -------------------------------------------------------------------
  // HELPER GETTERS & FORMATTERS
  // -------------------------------------------------------------------
  function getActiveOfficer() {
    if (typeof window.getActiveGateOfficer === 'function') {
      const officer = window.getActiveGateOfficer(activeGate);
      if (officer) {
        return {
          name: officer.name || 'Sertu Agus',
          nip: officer.nip || 'SEC-2018-042',
          gateName: activeGate,
          title: officer.title || 'Petugas Pengamanan',
          dept: 'Departemen Pengamanan & K3'
        };
      }
    }
    return {
      name: 'Sertu Agus',
      nip: 'SEC-2018-042',
      gateName: activeGate,
      title: 'Petugas Pengamanan',
      dept: 'Departemen Pengamanan & K3'
    };
  }

  function getTickets() {
    return window.ticketsList || [];
  }

  function getTName(t) { return t.applicantName || t.employeeName || 'Budi Pratama, S.T.'; }
  function getTNip(t) { return t.applicantNip || t.employeeNip || 'PK-2024-8841'; }
  
  function formatTipeKepulanganDisplay(type) {
    if (!type) return 'Kembali ke Area';
    const s = String(type).trim();
    if (s === 'Pulang Mendahului' || s.includes('Pulang Mendahului') || s.includes('Pulang Lebih Awal') || s.includes('Tidak Kembali')) {
      return 'Pulang Lebih Awal';
    }
    return s;
  }

  function getTType(t) { return formatTipeKepulanganDisplay(t.type || t.returnType || 'Kembali ke Area'); }
  function getTTransport(t) { return t.transportMode || t.transportation || 'Kendaraan dinas'; }
  function getTReturnTime(t) { return t.estimatedReturn || t.plannedReturn || ''; }
  function getTExitTime(t) { return t.plannedExit || ''; }

  function formatTimeOnly(timeStr) {
    if (!timeStr) return '';
    if (timeStr.includes('T')) {
      const m = timeStr.split('T')[1].match(/^(\d{1,2})[:.](\d{2})/);
      if (m) return `${m[1]}.${m[2]} WIB`;
    }
    const match = timeStr.match(/(\d{1,2})[:.](\d{2})/);
    return match ? `${match[1].padStart(2, '0')}.${match[2]} WIB` : timeStr.replace(':', '.');
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return '-';
    let raw = String(dateStr).replace(/\s*\(Pos.*?\)/gi, '').trim();
    if (raw.includes('Okt') || raw.includes('WIB') || raw.includes('Jan') || raw.includes('Feb') || raw.includes('Mar')) {
      return raw.replace(/(\d{1,2}):(\d{2})(\s*WIB)?/gi, '$1.$2 WIB');
    }
    try {
      let parseStr = raw.replace(/(\d{4}-\d{2}-\d{2})[T ](\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?/, '$1T$2:$3:00');
      const dt = new Date(parseStr);
      if (!isNaN(dt.getTime())) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const pad = n => String(n).padStart(2, '0');
        return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}, ${pad(dt.getHours())}.${pad(dt.getMinutes())} WIB`;
      }
    } catch (e) {}
    return raw.replace(/(\d{1,2}):(\d{2})/g, '$1.$2 WIB');
  }

  function getFormattedTodayWIB() {
    const now = new Date();
    const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const months = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
    const pad = n => String(n).padStart(2, '0');
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} • ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;
  }

  function getBadgeClass(status) {
    const s = (status || '').toLowerCase();
    if (s.includes('menunggu')) return 'menunggu';
    if (s.includes('disetujui')) return 'disetujui';
    if (s.includes('luar')) return 'sedang-di-luar';
    if (s.includes('terlambat')) return 'terlambat';
    if (s.includes('selesai')) return 'selesai';
    if (s.includes('kedaluwarsa')) return 'kedaluwarsa';
    if (s.includes('tolak')) return 'ditolak';
    if (s.includes('batal')) return 'dibatalkan';
    return 'disetujui';
  }

  function renderTimelineHtml(t) {
    if (!t) {
      return '<p style="font-size: 0.75rem; color: #64748b; margin: 0;">Tidak ada kronologi izin berjalan.</p>';
    }

    if (t.timeline && t.timeline.length > 0) {
      return t.timeline.map((item, idx) => `
        <div class="mobile-timeline-item">
          <div class="mobile-timeline-track">
            <div class="mobile-timeline-dot ${idx === 0 ? 'active' : 'done'}"></div>
            ${idx < t.timeline.length - 1 ? '<div class="mobile-timeline-line"></div>' : ''}
          </div>
          <div class="mobile-timeline-content">
            <div class="mobile-timeline-time">${item.time}</div>
            <div class="mobile-timeline-title">${item.event}</div>
            <div class="mobile-timeline-desc">${item.desc || (item.by ? 'Oleh ' + item.by : '')}</div>
          </div>
        </div>
      `).join('');
    }

    const isApproved = t.status === 'Disetujui' || t.status === 'Sedang di Luar' || t.status === 'Selesai' || t.status === 'Terlambat';
    const isScanOut = t.status === 'Sedang di Luar' || t.status === 'Selesai' || t.status === 'Terlambat' || Boolean(t.scanOutTime);
    const isScanIn = t.status === 'Selesai' || Boolean(t.scanInTime);

    return `
      <div class="mobile-timeline-item">
        <div class="mobile-timeline-track">
          <div class="mobile-timeline-dot done"></div>
          <div class="mobile-timeline-line"></div>
        </div>
        <div class="mobile-timeline-content">
          <div class="mobile-timeline-time">${t.createdAt ? formatTimeOnly(t.createdAt) : '09.20 WIB'}</div>
          <div class="mobile-timeline-title">Pengajuan Dibuat</div>
          <div class="mobile-timeline-desc">${t.category || 'Dinas Kantor'} • ${getTType(t)}</div>
        </div>
      </div>

      <div class="mobile-timeline-item">
        <div class="mobile-timeline-track">
          <div class="mobile-timeline-dot ${isApproved ? 'done' : 'active'}"></div>
          <div class="mobile-timeline-line"></div>
        </div>
        <div class="mobile-timeline-content">
          <div class="mobile-timeline-time">${isApproved ? 'Telah Disetujui' : 'Menunggu'}</div>
          <div class="mobile-timeline-title">${isApproved ? 'Disetujui oleh Atasan' : 'Menunggu Persetujuan Atasan'}</div>
          <div class="mobile-timeline-desc">${isApproved ? 'Disetujui • ' + (t.approverName || 'Ir. Hendra Gunawan, M.T.') : 'Menunggu tinjauan atasan'}</div>
        </div>
      </div>

      ${isScanOut ? `
        <div class="mobile-timeline-item">
          <div class="mobile-timeline-track">
            <div class="mobile-timeline-dot done"></div>
            ${isScanIn ? '<div class="mobile-timeline-line"></div>' : ''}
          </div>
          <div class="mobile-timeline-content">
            <div class="mobile-timeline-time">${t.scanOutTime ? formatTimeOnly(t.scanOutTime) : '10.05 WIB'}</div>
            <div class="mobile-timeline-title">Scan Out Gerbang Pos Jaga</div>
            <div class="mobile-timeline-desc">${t.scanOutGate || 'Pos 1 Gerbang Utama'} • Karyawan keluar gerbang kawasan pabrik</div>
          </div>
        </div>
      ` : ''}

      ${isScanIn ? `
        <div class="mobile-timeline-item">
          <div class="mobile-timeline-track">
            <div class="mobile-timeline-dot done"></div>
          </div>
          <div class="mobile-timeline-content">
            <div class="mobile-timeline-time">${t.scanInTime ? formatTimeOnly(t.scanInTime) : '12.50 WIB'}</div>
            <div class="mobile-timeline-title">Tap In Kartu Akses (Masuk Kembali)</div>
            <div class="mobile-timeline-desc">${t.scanInGate || 'Pos 1 Gerbang Utama'} • Karyawan kembali ke area pabrik</div>
          </div>
        </div>
      ` : ''}
    `;
  }

  function extractTicketId(raw) {
    if (!raw) return '';
    let str = raw.trim();
    if (str.startsWith('KUJANG-PERMIT:')) {
      const parts = str.split(':');
      return parts[1] || str;
    }
    if (str.includes('|')) {
      const parts = str.split('|');
      return parts[1] || parts[0];
    }
    return str;
  }

  function isTicketLate(t) {
    if (t.status === 'Terlambat' || t.isLate) return true;
    if (t.status !== 'Sedang di Luar') return false;
    if (t.type === 'Pulang Mendahului' || t.returnType === 'Pulang Mendahului') return false;
    const ret = t.estimatedReturn || t.plannedReturn;
    if (!ret) return false;
    const retDt = new Date(ret);
    return !isNaN(retDt.getTime()) && retDt < new Date();
  }

  // -------------------------------------------------------------------
  // 1. RENDER SECURITY MAIN VIEW
  // -------------------------------------------------------------------
  function renderMobileSecurity(container, targetTab) {
    if (targetTab) currentSecurityTab = targetTab;
    if (!container) container = document.getElementById('mobileMainContent');
    if (!container) return;

    // Gracefully stop camera if leaving scanner
    if (currentSecurityTab !== 'scanner' && isMobileCameraActive) {
      stopMobileCameraScanner();
    }

    if (currentSecurityTab === 'dashboard') {
      renderSecurityDashboard(container);
    } else if (currentSecurityTab === 'scanner') {
      renderSecurityScanner(container);
    } else if (currentSecurityTab === 'pelacakan') {
      renderSecurityPelacakan(container);
    } else if (currentSecurityTab === 'riwayat') {
      renderSecurityRiwayat(container);
    }
  }

  // -------------------------------------------------------------------
  // 2. DASHBOARD POS JAGA (Hal 1)
  // -------------------------------------------------------------------
  function renderSecurityDashboard(container) {
    const officer = getActiveOfficer();
    const tickets = getTickets();

    // Headcount logic: Hanya izin Kembali ke Area yang sudah Scan Out dan belum Scan In
    const outsideTickets = tickets.filter(t =>
      (t.status === 'Sedang di Luar' || t.status === 'Terlambat') &&
      t.type !== 'Pulang Mendahului' && t.returnType !== 'Pulang Mendahului'
    );
    const readyExitTickets = tickets.filter(t => t.status === 'Disetujui');
    const lateTickets = outsideTickets.filter(t => isTicketLate(t));
    const onTimeOutside = Math.max(0, outsideTickets.length - lateTickets.length);

    // Scan today counters
    const scanOutTodayTickets = tickets.filter(t => t.scanOutTime || t.status === 'Sedang di Luar' || t.status === 'Selesai' || t.status === 'Terlambat');
    const scanOutKembali = scanOutTodayTickets.filter(t => t.type !== 'Pulang Mendahului' && t.returnType !== 'Pulang Mendahului').length;
    const scanOutPulang = scanOutTodayTickets.filter(t => t.type === 'Pulang Mendahului' || t.returnType === 'Pulang Mendahului').length;
    const tapInToday = tickets.filter(t => t.status === 'Selesai' && t.scanInTime).length;
    const scanInToday = tapInToday;

    // Overdue banner if any late tickets exist (PDF Hal 1)
    let alertBannerHtml = '';
    const overdueTicket = lateTickets[0];
    if (overdueTicket) {
      const lateMnt = overdueTicket.lateMinutes || 30;
      const batasJam = formatTimeOnly(getTReturnTime(overdueTicket)) || '10.30 WIB';
      alertBannerHtml = `
        <div class="mobile-emergency-banner" style="margin-bottom: 12px; background: #fef2f2; border: 1px solid #fecaca;">
          <div class="mobile-emergency-banner-title" style="color: #b91c1c; font-weight: 800; font-size: 0.8rem;">
            ${lateTickets.length} Karyawan Terlambat Kembali
          </div>
          <div class="mobile-emergency-banner-desc" style="color: #991b1b; font-size: 0.725rem; line-height: 1.4; margin-top: 4px;">
            <strong>${getTName(overdueTicket)}</strong> terlambat ${lateMnt} menit. Batas kembali ${batasJam}; belum Tap In. Segera konfirmasi keberadaan atau tindak lanjuti di ${activeGate.split(' ')[0]} ${activeGate.split(' ')[1]}.
          </div>
          <button type="button" class="mobile-btn-danger" style="margin-top: 8px; padding: 6px 12px; font-size: 0.725rem; width: auto; background: #dc2626; color: #fff; border: none; font-weight: 700; border-radius: 6px;" onclick="window.mobileSwitchPelacakanTabAndFilter('outside', 'late')">
            Lihat Headcount Terlambat →
          </button>
        </div>
      `;
    }

    // Karyawan Sedang di Luar list (PDF Hal 1)
    const outsideListHtml = outsideTickets.slice(0, 3).map(t => {
      const isLate = isTicketLate(t);
      const scanOutT = formatTimeOnly(t.scanOutTime) || '10.05 WIB';
      const returnT = formatTimeOnly(getTReturnTime(t)) || '13.00 WIB';
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
          <div>
            <div style="font-size: 0.825rem; font-weight: 800; color: #0f172a;">
              ${getTName(t)}
              <span class="mobile-badge ${isLate ? 'terlambat' : 'sedang-di-luar'}" style="margin-left: 4px;">
                ${isLate ? 'Terlambat' : 'Sedang di Luar'}
              </span>
            </div>
            <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">
              ${getTNip(t)} • ${t.department || 'Rekayasa & Pemeliharaan'}
            </div>
            <div style="font-size: 0.7rem; color: #475569; margin-top: 2px;">
              Scan Out ${scanOutT} • Kembali ${returnT}
            </div>
            <div style="font-size: 0.675rem; color: ${isLate ? '#b91c1c' : '#047857'}; font-weight: 700; margin-top: 2px;">
              ${isLate ? `Terlambat ${t.lateMinutes || 30} menit` : 'Sesuai jadwal'}
            </div>
          </div>
          <!-- Perubahan 1: Detail Pengajuan (Pil Putih Border Tipis + Icon Dokumen) -->
            <button type="button" class="mobile-btn-secondary" style="padding: 5px 10px; font-size: 0.725rem; width: auto; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; border-radius: 8px; min-height: 36px; cursor: pointer;" onclick="window.mobileSecurityInspectTicket('${t.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              <span>Detail Pengajuan</span>
            </button>
        </div>
      `;
    }).join('');

    // Aktivitas Transaksi Terbaru (PDF Hal 1)
    const recentActivityTickets = [...tickets]
      .filter(t => t.scanOutTime || t.scanInTime)
      .slice(0, 4);

    const recentActivityHtml = recentActivityTickets.map(t => {
      const hasIn = Boolean(t.scanInTime && t.status === 'Selesai');
      const eventLabel = hasIn ? 'Tap In' : (t.isEmergency ? 'Scan Out • Darurat' : 'Scan Out');
      const timeStr = hasIn ? formatTimeOnly(t.scanInTime) : formatTimeOnly(t.scanOutTime);
      const gateStr = hasIn ? (t.scanInGate || activeGate) : (t.scanOutGate || activeGate);
      return `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
          <div>
            <div style="font-size: 0.8rem; font-weight: 800; color: #0f172a;">${getTName(t)}</div>
            <div style="font-size: 0.675rem; color: #64748b; font-family: monospace;">${t.id} • ${gateStr}</div>
            <div style="font-size: 0.725rem; color: ${hasIn ? '#047857' : '#2563eb'}; font-weight: 700; margin-top: 2px;">
              ${eventLabel} • ${timeStr || '10.05 WIB'}
            </div>
            <div style="font-size: 0.65rem; color: #94a3b8;">Petugas: ${officer.name}</div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <!-- Hero Pos Jaga Profile (Green Hero with White Button) -->
      <section class="mobile-hero-card">
        <div class="mobile-hero-greeting-sub">Selamat pagi, petugas Pos Jaga</div>
        <h2 class="mobile-hero-name">${officer.name}</h2>
        <div class="mobile-hero-role">NIP ${officer.nip} • ${officer.dept}</div>

        <div class="mobile-hero-divider"></div>

        <button type="button" class="mobile-hero-btn mobile-hero-btn-white" onclick="window.mobileSwitchTab('scanner')">
          <span>Buka Kamera Scan</span>
        </button>
      </section>

      <!-- Late Warning Banner -->
      ${alertBannerHtml}

      <!-- 4 Stat Metric Cards -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
        <div class="mobile-card" style="margin: 0; padding: 12px; cursor: pointer;" onclick="window.mobileSwitchPelacakanTabAndFilter('outside')">
          <div style="font-size: 0.675rem; color: #64748b; font-weight: 700;">Sedang di luar</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #7c3aed; line-height: 1.2; margin: 2px 0;">${outsideTickets.length}</div>
        </div>

        <div class="mobile-card" style="margin: 0; padding: 12px; cursor: pointer;" onclick="window.mobileSwitchPelacakanTabAndFilter('ready')">
          <div style="font-size: 0.675rem; color: #64748b; font-weight: 700;">Siap keluar</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #047857; line-height: 1.2; margin: 2px 0;">${readyExitTickets.length}</div>
        </div>

        <div class="mobile-card" style="margin: 0; padding: 12px; cursor: pointer;" onclick="window.mobileSwitchTab('riwayat')">
          <div style="font-size: 0.675rem; color: #64748b; font-weight: 700;">Scan Out hari ini</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #0f172a; line-height: 1.2; margin: 2px 0;">${scanOutTodayTickets.length}</div>
        </div>

        <div class="mobile-card" style="margin: 0; padding: 12px;" onclick="window.mobileSwitchTab('riwayat')">
          <div style="font-size: 0.675rem; color: #64748b; font-weight: 700;">Tap In hari ini</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #047857; line-height: 1.2; margin: 2px 0;">${tapInToday}</div>
        </div>
      </div>

      <!-- Akses Cepat (PDF Hal 1) -->
      <section class="mobile-card" style="padding: 12px 14px; margin-bottom: 12px;">
        <h3 class="mobile-card-title" style="margin-bottom: 8px;">Akses cepat</h3>
        <div class="mobile-quick-card" onclick="window.mobileSwitchTab('scanner')">
          <div>
            <div style="font-size: 0.8rem; font-weight: 800; color: #0f172a;">Pemindai QR & Manual</div>
          </div>
          <span style="color: #2563eb; font-weight: 800;">→</span>
        </div>
        <div class="mobile-quick-card" onclick="window.mobileSwitchTab('pelacakan')">
          <div>
            <div style="font-size: 0.8rem; font-weight: 800; color: #0f172a;">Pelacakan di Luar</div>
          </div>
          <span style="color: #2563eb; font-weight: 800;">→</span>
        </div>
        <div class="mobile-quick-card" onclick="window.mobileSwitchTab('riwayat')">
          <div>
            <div style="font-size: 0.8rem; font-weight: 800; color: #0f172a;">Log Riwayat Gerbang</div>
          </div>
          <span style="color: #2563eb; font-weight: 800;">→</span>
        </div>
      </section>

      <!-- Karyawan Sedang di Luar (PDF Hal 1) -->
      <section class="mobile-card">
        <div class="mobile-card-header">
          <h3 class="mobile-card-title">Karyawan sedang di luar</h3>
          <span style="font-size: 0.7rem; color: #7c3aed; font-weight: 700;">${outsideTickets.length} Orang</span>
        </div>
        ${outsideListHtml || '<p style="font-size: 0.75rem; color: #64748b; margin: 0;">Tidak ada karyawan di luar area pabrik saat ini.</p>'}
        <div style="text-align: center; margin-top: 10px;">
          <a href="#" class="mobile-link-rincian" onclick="window.mobileSwitchTab('pelacakan'); return false;">Lihat pelacakan →</a>
        </div>
      </section>

      <!-- Aktivitas Transaksi Terbaru (PDF Hal 1) -->
      <section class="mobile-card">
        <div class="mobile-card-header">
          <h3 class="mobile-card-title">Aktivitas transaksi terbaru</h3>
        </div>
        ${recentActivityHtml || '<p style="font-size: 0.75rem; color: #64748b; margin: 0;">Belum ada riwayat transaksi gerbang hari ini.</p>'}
        <div style="text-align: center; margin-top: 10px;">
          <a href="#" class="mobile-link-rincian" onclick="window.mobileSwitchTab('riwayat'); return false;">Semua riwayat →</a>
        </div>
      </section>
    `;
  }

  // -------------------------------------------------------------------
  // 3. PEMINDAI QR (Hal 2 & 3)
  // -------------------------------------------------------------------
  function renderSecurityScanner(container) {
    const officer = getActiveOfficer();
    const tickets = getTickets();

    const scannableTickets = tickets.filter(t => t.status === 'Disetujui' || t.status === 'Sedang di Luar' || t.status === 'Terlambat').slice(0, 6);

    container.innerHTML = `
      

      <!-- Terminal Verifikasi Tiket Card (PDF Hal 2 & 3) -->
      <section class="mobile-card" style="margin-bottom: 12px;">
        <div style="font-size: 0.8rem; font-weight: 800; color: #0f172a; margin-bottom: 8px;">Terminal verifikasi tiket</div>
        
        <div style="margin-bottom: 12px;">
          <label class="mobile-meta-sub" style="margin-bottom: 4px; display: block;">Pos bertugas</label>
          <select class="mobile-select" id="mSecGateSelect" onchange="window.mobileChangeGate(this.value)" style="font-size: 0.8rem; font-weight: 700; color: #0f172a; padding: 8px 10px;">
            <option value="Pos 1 Gerbang Utama (Utara)" ${activeGate.includes('Pos 1') ? 'selected' : ''}>Pos 1 Gerbang Utama (Utara)</option>
            <option value="Pos 2 Gerbang Darurat" ${activeGate.includes('Pos 2') ? 'selected' : ''}>Pos 2 Gerbang Darurat</option>
            <option value="Pos 3 Logistik" ${activeGate.includes('Pos 3') ? 'selected' : ''}>Pos 3 Logistik</option>
          </select>
        </div>

        <!-- Segment Tabs (Kamera vs Manual / Barcode) -->
        <div class="mobile-segment-toggle" style="margin-bottom: 0;">
          <button type="button" class="mobile-seg-btn ${currentScannerMode === 'camera' ? 'active' : ''}" onclick="window.mobileSwitchScannerMode('camera')">
            Kamera
          </button>
          <button type="button" class="mobile-seg-btn ${currentScannerMode === 'manual' ? 'active' : ''}" onclick="window.mobileSwitchScannerMode('manual')">
            Manual / Barcode
          </button>
        </div>
      </section>

      <!-- TAB 1: KAMERA PEMINDAI (PDF Hal 2) -->
      <div id="mScannerSecCamera" style="display: ${currentScannerMode === 'camera' ? 'block' : 'none'};">
        <!-- Viewport Box: Active Live Feed or Idle Placeholder -->
        <div id="mCameraReaderView" class="mobile-video-wrap" style="display: ${isMobileCameraActive ? 'block' : 'none'};">
          <!-- Video element populated by Html5Qrcode -->
        </div>

        <div id="mCameraIdlePlaceholder" class="mobile-scanner-idle" style="display: ${isMobileCameraActive ? 'none' : 'block'};">
          <div style="margin-bottom: 8px; color: #64748b;"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></div>
          <h4 style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">Kamera belum aktif</h4>
          <p style="font-size: 0.75rem; color: #64748b; margin: 0 0 16px 0; line-height: 1.4;">
            Aktifkan kamera, lalu arahkan QR tiket ke dalam bingkai.
          </p>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button type="button" class="mobile-btn-primary" style="padding: 10px 14px; font-weight: 700;" onclick="window.mobileStartCameraScanner()">
              <span>Aktifkan Kamera</span>
            </button>
            <button type="button" class="mobile-btn-secondary" style="padding: 10px 14px; font-weight: 700; background: #fff;" onclick="window.mobileTriggerUploadQr()">
              <span>Unggah Gambar QR</span>
            </button>
            <input type="file" id="mSecInputQrFile" accept="image/*" style="display: none;" onchange="window.mobileHandleQrFileUpload(event)">
          </div>
        </div>

        <div id="mCameraActiveBar" style="display: ${isMobileCameraActive ? 'flex' : 'none'}; gap: 8px; margin-bottom: 12px;">
          <button type="button" class="mobile-btn-danger" style="flex: 1; padding: 10px; background: #dc2626; color: #fff; border: none; font-weight: 700; border-radius: 8px;" onclick="window.mobileStopCameraScanner()">
            <span>Hentikan Kamera</span>
          </button>
        </div>

        <div id="mCameraStatusMsg" style="font-size: 0.725rem; text-align: center; color: #64748b; margin-bottom: 12px; display: none;"></div>

        <!-- Panduan Kotak Bawah (PDF Hal 2) -->
        <div class="mobile-card" style="background: #f8fafc; border: 1px solid #e2e8f0;">
          <div style="font-size: 0.775rem; font-weight: 800; color: #0f172a; margin-bottom: 6px;">Kamera & unggah QR</div>
          <ol style="margin: 0; padding-left: 18px; font-size: 0.725rem; color: #475569; line-height: 1.5;">
            <li>Aktifkan Kamera dan izinkan akses di browser.</li>
            <li>Posisikan QR dengan jelas dan cahaya cukup.</li>
            <li>Atau pilih Unggah Gambar QR dari tiket.</li>
          </ol>
          <div style="font-size: 0.7rem; color: #64748b; margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            Kamera tidak tersedia? Gunakan <a href="#" style="color: #2563eb; font-weight: 700; text-decoration: none;" onclick="window.mobileSwitchScannerMode('manual'); return false;">Input Manual / Barcode</a>.
          </div>
        </div>
      </div>

      <!-- TAB 2: MANUAL / BARCODE (PDF Hal 3) -->
      <div id="mScannerSecManual" style="display: ${currentScannerMode === 'manual' ? 'block' : 'none'};">
        <div class="mobile-card" style="margin-bottom: 12px;">
          <div style="font-size: 0.8rem; font-weight: 800; color: #0f172a; margin-bottom: 8px;">Verifikasi nomor tiket</div>
          <form onsubmit="window.mobileSubmitManualScan(event)">
            <div class="mobile-form-group" style="margin-bottom: 10px;">
              <label class="mobile-form-label">Nomor tiket <span class="req">*</span></label>
              <input type="text" class="mobile-input" id="mSecInputTicketId" placeholder="Masukkan nomor tiket" required style="font-size: 0.825rem; padding: 10px 12px; font-family: monospace;">
            </div>
            <button type="submit" class="mobile-btn-primary" style="padding: 10px; font-weight: 700;">
              <span>Verifikasi Tiket</span>
            </button>
          </form>
        </div>

        <!-- Panduan Input Tiket Secara Manual (PDF Hal 3) -->
        <div class="mobile-card" style="background: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: 12px;">
          <div style="font-size: 0.775rem; font-weight: 800; color: #0f172a; margin-bottom: 6px;">Input tiket secara manual</div>
          <ol style="margin: 0; padding-left: 18px; font-size: 0.725rem; color: #475569; line-height: 1.5;">
            <li>Ketik nomor tiket.</li>
            <li>Tekan Enter atau pilih Verifikasi Tiket.</li>
            <li>Cocokkan identitas dan tujuan sebelum mencatat gerbang.</li>
          </ol>
        </div>

        <!-- Quick Select scannable tickets (Convenient testing in browser) -->
        <div class="mobile-card">
          <div style="font-size: 0.75rem; font-weight: 800; color: #0f172a; margin-bottom: 6px;">Tiket Aktif Siap Scan (Pilih Cepat)</div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${scannableTickets.length === 0 ? '<div style="font-size:0.725rem; color:#94a3b8; font-style:italic;">Tidak ada tiket aktif yang siap dipindai.</div>' : ''}
            ${scannableTickets.map(t => `
              <button type="button" class="mobile-btn-secondary" style="font-size:0.725rem; justify-content:space-between; padding: 8px 10px;" onclick="window.mobileSecurityInspectTicket('${t.id}')">
                <span><strong>${t.id}</strong> — ${getTName(t)} (${t.status === 'Disetujui' ? 'Siap Keluar' : 'Sedang di Luar'})</span> <span>→</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------------
  // 4. PELACAKAN KARYAWAN (Hal 4 & 5)
  // -------------------------------------------------------------------
  function renderSecurityPelacakan(container) {
    const tickets = getTickets();

    const outsideTickets = tickets.filter(t =>
      (t.status === 'Sedang di Luar' || t.status === 'Terlambat') &&
      t.type !== 'Pulang Mendahului' && t.returnType !== 'Pulang Mendahului'
    );
    const readyExitTickets = tickets.filter(t => t.status === 'Disetujui');
    const lateTickets = outsideTickets.filter(t => isTicketLate(t));

    let activeList = (currentPelacakanFilter === 'outside') ? outsideTickets : readyExitTickets;

    if (pelacakanSearchQuery) {
      const matcher = typeof window.matchSearchTokens === 'function' ? window.matchSearchTokens : (typeof matchSearchTokens === 'function' ? matchSearchTokens : null);
      if (matcher) {
        activeList = activeList.filter(t => matcher(pelacakanSearchQuery, t.id, getTName(t), getTNip(t), t.destination, t.department, t.reason, t.approverName));
      } else {
        const q = pelacakanSearchQuery.toLowerCase();
        activeList = activeList.filter(t =>
          (t.id && t.id.toLowerCase().includes(q)) ||
          (getTName(t).toLowerCase().includes(q)) ||
          (getTNip(t).toLowerCase().includes(q)) ||
          (t.destination && t.destination.toLowerCase().includes(q)) ||
          (t.department && t.department.toLowerCase().includes(q))
        );
      }
    }

    const listHtml = activeList.map(t => {
      const isLate = isTicketLate(t);
      const isReady = (t.status === 'Disetujui');
      const scanOutT = formatTimeOnly(t.scanOutTime);
      const scanInT = formatTimeOnly(t.scanInTime);
      const returnT = formatTimeOnly(getTReturnTime(t)) || '13.00 WIB';
      const exitPlanT = formatTimeOnly(getTExitTime(t)) || '10.00 WIB';

      let statusInfoHtml = '';
      if (isReady) {
        statusInfoHtml = `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; font-size: 0.7rem; color: #475569; margin-bottom: 8px; line-height: 1.4;">
            Disetujui atasan • ${t.createdAt ? formatTimeOnly(t.createdAt) : '10.40 WIB'}. Belum meninggalkan area; bukan headcount.
          </div>
        `;
      } else if (isLate) {
        statusInfoHtml = `
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 6px 10px; font-size: 0.7rem; color: #b91c1c; margin-bottom: 8px; line-height: 1.4;">
            <strong>Terlambat ${t.lateMinutes || 30} menit</strong> • Batas kembali ${returnT}. Belum kembali pada ${formatTimeOnly(new Date().toISOString()) || '11.00 WIB'}.<br>
            Hubungi karyawan untuk konfirmasi keberadaan. Verifikasi identitas sebelum mencatat kembali.
          </div>
        `;
      } else {
        statusInfoHtml = `
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 6px 10px; font-size: 0.7rem; color: #047857; margin-bottom: 8px; line-height: 1.4;">
            Disetujui ${t.approverName || 'Ir. Hendra Gunawan, M.T.'} • Batas kembali ${returnT}.<br>
            Masih dalam waktu izin • Sesuai jadwal. Verifikasi identitas sebelum mencatat kembali.
          </div>
        `;
      }

      return `
        <div class="mobile-ticket-item" style="border-left: 3px solid ${isLate ? '#dc2626' : (isReady ? '#047857' : '#7c3aed')}; margin-bottom: 12px;">
          <div class="mobile-ticket-item-header">
            <div>
              <div style="font-family: monospace; font-size: 0.85rem; font-weight: 800; color: #0f172a;">${t.id}</div>
              <div style="font-size: 0.85rem; font-weight: 800; color: #1e293b; margin-top: 1px;">${getTName(t)}</div>
              <div style="font-size: 0.675rem; color: #64748b;">${getTNip(t)} • ${t.department || 'Rekayasa & Pemeliharaan'}</div>
            </div>
            <span class="mobile-badge ${getBadgeClass(t.status)}">${t.status}</span>
          </div>

          <div style="font-size: 0.725rem; color: #047857; font-weight: 700; margin-bottom: 2px;">${t.category} • ${getTType(t)}</div>
          <div style="font-size: 0.8rem; font-weight: 800; color: #1e293b; margin-bottom: 2px;">📍 ${(t.destination && t.destination.trim()) ? t.destination.trim() : 'Tanpa tujuan'}</div>
          <div style="font-size: 0.7rem; color: #64748b; margin-bottom: 6px;">Rencana : ${t.createdAt ? t.createdAt.split(',')[0] : '19 Okt 2026'} • ${exitPlanT} – ${returnT}</div>

          <div class="mobile-ticket-grid-meta" style="margin-bottom: 8px;">
            <div>
              <div class="mobile-meta-sub">${isReady ? 'Rencana Keluar' : 'Scan Out'}</div>
              <div class="mobile-meta-val">${isReady ? exitPlanT : (scanOutT || '10.05 WIB')}</div>
              <div style="font-size: 0.625rem; color: #64748b;">${isReady ? 'Belum Scan Out' : (t.scanOutGate || activeGate)}</div>
            </div>
            <div>
              <div class="mobile-meta-sub">Tap In Kartu</div>
              <div class="mobile-meta-val" style="color: ${scanInT ? '#047857' : '#64748b'};">${scanInT || 'Belum Tap In'}</div>
              <div style="font-size: 0.625rem; color: #64748b;">${scanInT ? (t.scanInGate || activeGate) : 'Belum ada catatan pos'}</div>
            </div>
          </div>

          ${statusInfoHtml}

          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="mobile-btn-detail" aria-label="Lihat Detail tiket ${t.id}" onclick="window.mobileSecurityInspectTicket('${t.id}')">Lihat Detail</button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
     

      <!-- 2 Summary Cards (PDF Hal 4 & 5) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
        <div class="mobile-card" style="margin: 0; padding: 12px;">
          <div style="font-size: 0.675rem; color: #64748b; font-weight: 700;">Sedang di luar</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #7c3aed; line-height: 1.2; margin: 2px 0;">${outsideTickets.length}</div>
          <div style="font-size: 0.675rem; color: #64748b;">Karyawan</div>
          <div style="font-size: 0.65rem; color: #047857; font-weight: 700; margin-top: 4px; padding-top: 4px; border-top: 1px solid #f1f5f9;">
            ${readyExitTickets.length} izin siap keluar • Bukan headcount
          </div>
        </div>

        <div class="mobile-card" style="margin: 0; padding: 12px;">
          <div style="font-size: 0.675rem; color: #64748b; font-weight: 700;">Terlambat</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #b91c1c; line-height: 1.2; margin: 2px 0;">${lateTickets.length}</div>
          <div style="font-size: 0.675rem; color: #64748b;">Lewat batas kembali</div>
          <div style="font-size: 0.65rem; color: #64748b; margin-top: 4px; padding-top: 4px; border-top: 1px solid #f1f5f9;">
            Segera konfirmasi
          </div>
        </div>
      </div>

      <!-- Segment Tabs (Sedang di Luar · 2 | Izin Siap Keluar · 1) -->
      <div class="mobile-segment-toggle" style="margin-bottom: 12px;">
        <button type="button" class="mobile-seg-btn ${currentPelacakanFilter === 'outside' ? 'active' : ''}" onclick="window.mobileSwitchPelacakanFilter('outside')">
          Sedang di Luar · ${outsideTickets.length}
        </button>
        <button type="button" class="mobile-seg-btn ${currentPelacakanFilter === 'ready' ? 'active' : ''}" onclick="window.mobileSwitchPelacakanFilter('ready')">
          Izin Siap Keluar · ${readyExitTickets.length}
        </button>
      </div>

      <!-- Result Bar & Filter Button -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 0.725rem; color: #64748b; font-weight: 700;">
          ${activeList.length} karyawan (${currentPelacakanFilter === 'outside' ? 'Di Luar Area' : 'Siap Keluar'})
        </span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button type="button" class="mobile-filter-toggle-btn" style="background: #fff; color: #dc2626; border-color: #fca5a5; padding: 4px 8px; font-size: 0.725rem; display: inline-flex; align-items: center; gap: 4px;" onclick="window.mobileSecurityClearAllFinished()" title="Hapus Riwayat Selesai">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Hapus Selesai</span>
          </button>
          <button type="button" class="mobile-filter-toggle-btn ${isPelacakanFilterOpen ? 'active' : ''}" onclick="window.mobileTogglePelacakanFilter()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          <span>${isPelacakanFilterOpen ? 'Tutup Filter' : 'Filter'}</span>
          ${pelacakanSearchQuery ? '<span style="width: 6px; height: 6px; border-radius: 50%; background: #059669; display: inline-block;"></span>' : ''}
        </button>
        </div>
      </div>

      <!-- Collapsible Filter Card -->
      <div id="mPelacakanFilterCard" class="mobile-filter-panel" style="display: ${isPelacakanFilterOpen ? 'block' : 'none'};">
        <div class="mobile-filter-panel-title">
          <span>Cari & filter pelacakan</span>
          <button type="button" style="border:none; background:none; font-size:0.75rem; color:#64748b; cursor:pointer;" onclick="window.mobileTogglePelacakanFilter()">✕</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div>
            <label class="mobile-filter-label">Pencarian</label>
            <input type="text" id="mPelacakanSearchInput" class="mobile-filter-input" placeholder="Cari tiket, nama, NIP, atau tujuan…" value="${pelacakanSearchQuery}">
          </div>
          <div>
            <label class="mobile-filter-label">Status pelacakan</label>
            <select class="mobile-filter-select" id="mPelacakanFilterSelect" onchange="window.mobileHandlePelacakanDropdown(this.value)">
              <option value="outside" ${currentPelacakanFilter === 'outside' ? 'selected' : ''}>Sedang di Luar (Headcount)</option>
              <option value="ready" ${currentPelacakanFilter === 'ready' ? 'selected' : ''}>Izin Siap Keluar (Disetujui Atasan)</option>
            </select>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <button type="button" class="mobile-btn-primary" style="flex: 2; padding: 7px 12px; font-size: 0.75rem;" onclick="window.mobileApplyPelacakanSearch()">
              Terapkan Filter
            </button>
            <button type="button" class="mobile-btn-secondary" style="flex: 1; padding: 7px 12px; font-size: 0.75rem;" onclick="window.mobileResetPelacakanSearch()">
              Reset
            </button>
          </div>
        </div>
      </div>

      <!-- Tickets List -->
      ${listHtml || `<div class="mobile-card" style="text-align: center; color: #64748b; font-size: 0.8rem; padding: 24px;">Tidak ada karyawan pada status ini.</div>`}
    `;
  }

  // -------------------------------------------------------------------
  // 5. RIWAYAT PEMINDAIAN (Pos Jaga - Sesuai Standar Tampilan Riwayat Karyawan)
  // -------------------------------------------------------------------
  function renderSecurityRiwayat(container) {
    const tickets = getTickets();

    const hasDeletableTickets = tickets.some(t =>
      !t.deletedBySecurity &&
      (t.status === 'Selesai' || t.status === 'Dibatalkan' || t.status === 'Ditolak' || t.status === 'Kedaluwarsa')
    );

    // 1. Filter log transaksi gerbang & tiket aktif
    let eligible = tickets.filter(t =>
      !t.deletedBySecurity &&
      (t.scanOutTime || t.scanInTime || t.status === 'Selesai' || t.status === 'Sedang di Luar' || t.status === 'Terlambat' || t.status === 'Disetujui')
    );

    // 2. Filter Periode (Hari Ini, Minggu Ini, Bulan Ini, Tahun Ini, Semua Waktu)
    if (riwayatPeriodFilter !== 'all' && typeof window.matchesPeriodFilter === 'function') {
      eligible = eligible.filter(t => window.matchesPeriodFilter(t, riwayatPeriodFilter));
    }

    // 3. Filter Kategori
    if (riwayatCategoryFilter !== 'all') {
      eligible = eligible.filter(t => t.category === riwayatCategoryFilter);
    }

    // 4. Filter Status
    if (riwayatStatusFilter !== 'all') {
      if (riwayatStatusFilter === 'Terlambat') {
        eligible = eligible.filter(t => t.status === 'Terlambat' || t.isLate || (t.scanInTime && t.scanInTime.includes('[Terlambat]')));
      } else {
        eligible = eligible.filter(t => t.status === riwayatStatusFilter);
      }
    }

    // 5. Filter Pencarian Live Search (ID, Nama, NIP, Tujuan, Departemen, Alasan, Kategori, Gerbang)
    if (riwayatSearchQuery && riwayatSearchQuery.trim()) {
      const q = riwayatSearchQuery.trim().toLowerCase();
      eligible = eligible.filter(t => {
        const idStr = (t.id || '').toLowerCase();
        const nameStr = (getTName(t) || '').toLowerCase();
        const nipStr = (getTNip(t) || '').toLowerCase();
        const destStr = (t.destination || '').toLowerCase();
        const deptStr = (t.department || '').toLowerCase();
        const reasonStr = (t.reason || '').toLowerCase();
        const catStr = (t.category || '').toLowerCase();
        const typeStr = (t.type || t.returnType || '').toLowerCase();
        const gateOutStr = (t.scanOutGate || '').toLowerCase();
        const gateInStr = (t.scanInGate || '').toLowerCase();
        return idStr.includes(q) || nameStr.includes(q) || nipStr.includes(q) ||
               destStr.includes(q) || deptStr.includes(q) || reasonStr.includes(q) ||
               catStr.includes(q) || typeStr.includes(q) || gateOutStr.includes(q) || gateInStr.includes(q);
      });
    }

    // 6. Urutan: Terbaru lebih dulu (berdasarkan waktu scan in, scan out, atau created)
    eligible.sort((a, b) => {
      const parseTime = (item) => {
        const raw = item.scanInTime || item.scanOutTime || item.createdAt || item.plannedExit || 0;
        const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
        return (d && !isNaN(d.getTime())) ? d.getTime() : 0;
      };
      return parseTime(b) - parseTime(a);
    });

    // 7. Paginasi Dinamis
    const totalItems = eligible.length;
    const totalPages = Math.ceil(totalItems / riwayatPageSize) || 1;
    if (currentRiwayatPage > totalPages) currentRiwayatPage = 1;
    if (currentRiwayatPage < 1) currentRiwayatPage = 1;

    const startIndex = (currentRiwayatPage - 1) * riwayatPageSize;
    const pageTickets = eligible.slice(startIndex, startIndex + riwayatPageSize);

    // Keterangan teks periode
    const periodMap = {
      'all': 'Semua waktu',
      'today': 'Hari ini',
      'week': 'Minggu ini',
      'month': 'Bulan ini',
      'year': 'Tahun ini'
    };
    const periodText = periodMap[riwayatPeriodFilter] || 'Semua waktu';

    // 8. Tampilan Card View
    const cardsHtml = pageTickets.map(t => {
      const isPulang = (t.type === 'Pulang Mendahului' || t.type === 'Pulang Lebih Awal' || t.returnType === 'Pulang Mendahului');
      const isLate = isTicketLate(t);
      const isEmergencyTicket = Boolean(t.isEmergency || (t.id && (t.id.includes('-EMG-') || t.id.startsWith('TK-EMG'))));
      const destText = (t.destination && t.destination.trim()) ? t.destination.trim() : 'Tanpa tujuan';
      const typeDisplay = formatTipeKepulanganDisplay(t.type || t.returnType);
      const scanOutT = formatTimeOnly(t.scanOutTime);
      const scanInT = formatTimeOnly(t.scanInTime);
      const scanOutGateName = t.scanOutGate || (t.scanOutTime ? 'Pos 1' : 'Belum ada catatan pos');
      const scanInGateName = isPulang ? 'Pulang Lebih Awal' : (t.scanInGate || (t.scanInTime ? 'Pos 1' : 'Belum ada catatan pos'));
      const isCompleted = (t.status === 'Selesai');

      return `
        <div class="mobile-ticket-card">
          <!-- Baris 1: Nomor Tiket & Badge Status -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 6px;">
              <span style="font-family: monospace; font-size: 0.875rem; font-weight: 800; color: #0f172a;">${t.id}</span>
              ${isEmergencyTicket ? '<span class="mobile-badge" style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; font-size: 0.65rem; font-weight: 800; padding: 1px 5px; border-radius: 4px;">🚨 DARURAT</span>' : ''}
            </div>
            <span class="mobile-badge ${getBadgeClass(t.status)}">${t.status}</span>
          </div>

          <!-- Baris 2: Nama Karyawan (Tebal) & NIP, Departemen -->
          <div style="font-size: 0.925rem; font-weight: 800; color: #0f172a; margin-bottom: 1px; line-height: 1.3;">
            ${getTName(t)}
          </div>
          <div style="font-size: 0.725rem; font-weight: 600; color: #334155; margin-bottom: 6px;">
            ${getTNip(t)}${t.department ? ' • ' + t.department : ''}
          </div>

          <!-- Baris 3: Kategori dan Tipe Kepulangan -->
          <div style="font-size: 0.75rem; font-weight: 700; color: #047857; margin-bottom: 4px;">
            ${t.category || 'Dinas Kantor'} • ${typeDisplay}
          </div>

          <!-- Baris 4: Tujuan / Lokasi Keluar -->
          <div style="font-size: 0.825rem; font-weight: 700; color: #1e293b; margin-bottom: 4px; line-height: 1.35;">
            📍 ${destText}
          </div>

          <!-- Baris 5: Rencana Waktu -->
          <div style="font-size: 0.725rem; color: #475569; font-weight: 600; margin-bottom: 8px;">
            ${isPulang
              ? `<span style="color: #0f172a; font-weight: 700;">Rencana Keluar:</span> ${formatTimeOnly(getTExitTime(t)) || '10.00 WIB'}`
              : `<span style="color: #0f172a; font-weight: 700;">Rencana:</span> ${formatTimeOnly(getTExitTime(t)) || '10.00 WIB'} – ${formatTimeOnly(getTReturnTime(t)) || '13.00 WIB'}`
            }
          </div>

          <!-- Baris 6: Kotak Kecil Scan Out & Masuk Kembali -->
          <div class="mobile-ticket-grid-meta" style="margin: 6px 0 8px 0; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 8px 10px;">
            <div>
              <div class="mobile-meta-sub" style="font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Scan Out</div>
              <div class="mobile-meta-val" style="font-size: 0.775rem; color: ${scanOutT ? '#0f172a' : '#64748b'}; font-weight: 800;">
                ${scanOutT || 'Belum Scan Out'}
              </div>
              <div style="font-size: 0.65rem; color: #475569; margin-top: 2px;">${scanOutGateName}</div>
            </div>
            <div>
              <div class="mobile-meta-sub" style="font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Masuk Kembali</div>
              <div class="mobile-meta-val" style="font-size: 0.775rem; color: ${isPulang ? '#64748b' : (scanInT ? '#047857' : (isLate ? '#b91c1c' : '#dc2626'))}; font-weight: 800;">
                ${isPulang ? 'Tidak kembali' : (scanInT || 'Belum kembali')}
              </div>
              <div style="font-size: 0.65rem; color: #475569; margin-top: 2px;">${scanInGateName}</div>
            </div>
          </div>

          <!-- Baris 7: Status ringkas & Tombol Lihat Detail -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #f1f5f9; margin-top: 4px; gap: 8px;">
            <div style="font-size: 0.7rem; font-weight: 600; color: ${isCompleted ? '#047857' : (isLate ? '#b91c1c' : '#475569')};">
              ${isCompleted
                ? `✓ Selesai ${isLate ? 'terlambat' : 'tepat waktu'}`
                : (isLate
                    ? `⚠️ Terlambat ${t.lateMinutes || 30} menit`
                    : (t.status === 'Sedang di Luar'
                        ? '• Sedang di luar kawasan'
                        : '• Siap verifikasi keluar gerbang'
                      )
                  )
              }
            </div>
            <!-- Perubahan 1: Detail Pengajuan (Pil Putih Border Tipis + Icon Dokumen) -->
            <button type="button" class="mobile-btn-secondary" style="padding: 5px 10px; font-size: 0.725rem; width: auto; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; border-radius: 8px; min-height: 36px; cursor: pointer;" onclick="window.mobileSecurityInspectTicket('${t.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              <span>Detail Pengajuan</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // 9. Tampilan List View
    const listHtml = pageTickets.map(t => {
      const isPulang = (t.type === 'Pulang Mendahului' || t.type === 'Pulang Lebih Awal' || t.returnType === 'Pulang Mendahului');
      const isLate = isTicketLate(t);
      const isEmergencyTicket = Boolean(t.isEmergency || (t.id && (t.id.includes('-EMG-') || t.id.startsWith('TK-EMG'))));
      const destText = (t.destination && t.destination.trim()) ? t.destination.trim() : 'Tanpa tujuan';
      const typeDisplay = formatTipeKepulanganDisplay(t.type || t.returnType);
      const scanOutT = formatTimeOnly(t.scanOutTime);
      const scanInT = formatTimeOnly(t.scanInTime);

      return `
        <div class="mobile-ticket-list-row">
          <!-- Baris 1: ID Tiket & Status Badge -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">
              <span style="font-family: monospace; font-size: 0.85rem; font-weight: 800; color: #0f172a;">${t.id}</span>
              ${isEmergencyTicket ? '<span class="mobile-badge" style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; font-size: 0.6rem; font-weight: 800; padding: 1px 4px; border-radius: 4px;">🚨 DARURAT</span>' : ''}
            </div>
            <span class="mobile-badge ${getBadgeClass(t.status)}">${t.status}</span>
          </div>

          <!-- Baris 2: Nama Karyawan & NIP -->
          <div style="font-size: 0.875rem; font-weight: 800; color: #0f172a; margin-bottom: 1px;">
            ${getTName(t)}
          </div>
          <div style="font-size: 0.7rem; font-weight: 600; color: #334155; margin-bottom: 4px;">
            ${getTNip(t)}${t.department ? ' • ' + t.department : ''}
          </div>

          <!-- Baris 3: Kategori, Tipe & Lokasi -->
          <div style="font-size: 0.725rem; font-weight: 700; color: #047857; margin-bottom: 2px;">
            ${t.category || 'Dinas Kantor'} • ${typeDisplay}
          </div>
          <div style="font-size: 0.8rem; font-weight: 700; color: #1e293b; margin-bottom: 6px;">
            📍 ${destText}
          </div>

          <!-- Baris 4: Info Gerbang Aktual + Tombol Lihat Detail -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #f1f5f9; margin-top: 4px; gap: 8px;">
            <div style="font-size: 0.7rem; color: #334155; font-weight: 600;">
              Scan Out: <strong style="color: #0f172a;">${scanOutT || '—'}</strong> • Masuk: <strong style="color: ${isPulang ? '#64748b' : (scanInT ? '#047857' : '#dc2626')};">${isPulang ? '—' : (scanInT || 'Belum')}</strong>
            </div>
            <!-- Perubahan 1: Detail Pengajuan (Pil Putih Border Tipis + Icon Dokumen) -->
            <button type="button" class="mobile-btn-secondary" style="padding: 5px 10px; font-size: 0.725rem; width: auto; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; border-radius: 8px; min-height: 36px; cursor: pointer;" onclick="window.mobileSecurityInspectTicket('${t.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              <span>Detail Pengajuan</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // 10. Tampilan Kosong (Empty State)
    const emptyHtml = `
      <div class="mobile-card" style="text-align: center; padding: 28px 16px; border: 1.5px dashed #cbd5e1; border-radius: 14px; background: #ffffff;">
        <div style="color: #94a3b8; margin-bottom: 8px;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        </div>
        <div style="font-size: 0.9rem; font-weight: 800; color: #0f172a; margin-bottom: 4px;">Tidak Ada Log Pemindaian Ditemukan</div>
        <div style="font-size: 0.775rem; color: #475569; max-width: 270px; margin: 0 auto; line-height: 1.4;">
          ${riwayatSearchQuery ? `Tidak ada log yang cocok dengan kata kunci "<strong>${riwayatSearchQuery}</strong>".` : 'Tidak ada catatan pemindaian yang sesuai dengan kriteria filter ini.'}
        </div>
        ${(riwayatSearchQuery || riwayatStatusFilter !== 'all' || riwayatCategoryFilter !== 'all' || riwayatPeriodFilter !== 'all') ? `
          <button type="button" class="mobile-btn-secondary" style="margin-top: 14px; padding: 8px 16px; font-size: 0.75rem; width: auto; font-weight: 700; min-height: 40px; display: inline-flex; align-items: center; gap: 6px;" onclick="window.mobileResetSecurityRiwayatFilter()">
            <span>Reset Pencarian & Filter</span>
          </button>
        ` : ''}
      </div>
    `;

    // 11. Tombol Paginasi Dinamis
    let paginationHtml = '';
    if (totalPages > 1) {
      let pageBtns = '';
      for (let p = 1; p <= totalPages; p++) {
        const isActive = (p === currentRiwayatPage);
        pageBtns += `
          <button type="button" style="min-width: 36px; height: 36px; padding: 0 8px; border-radius: 8px; border: 1px solid ${isActive ? '#2563eb' : '#cbd5e1'}; background: ${isActive ? '#2563eb' : '#ffffff'}; color: ${isActive ? '#ffffff' : '#334155'}; font-size: 0.8rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileSetSecurityRiwayatPage(${p})">
            ${p}
          </button>
        `;
      }
      paginationHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin: 18px 0 8px 0; gap: 8px;">
          <div style="font-size: 0.725rem; color: #64748b; font-weight: 600;">
            Menampilkan ${startIndex + 1}–${Math.min(startIndex + riwayatPageSize, totalItems)} dari ${totalItems} catatan
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-left: auto;">
            ${pageBtns}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <!-- Header Halaman Riwayat Pos Jaga -->
      <div class="mobile-page-header" style="margin-bottom: 12px;">
        <h2 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0;">Riwayat Pemindaian</h2>
        

      <!-- 1. Search Bar (Live search with debounce and clear button) -->
      <div style="display: flex; align-items: center; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 0 12px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.2" style="flex-shrink: 0; margin-right: 8px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="mRiwayatSecLiveSearch" placeholder="Cari nomor tiket, nama, NIP, tujuan..." value="${riwayatSearchQuery}" style="flex: 1; border: none; background: transparent; font-size: 0.825rem; color: #0f172a; padding: 11px 0; outline: none; min-width: 0;" oninput="window.mobileDebounceSecurityRiwayatSearch(this.value)">
        <button type="button" id="mBtnClearRiwayatSecSearch" aria-label="Hapus teks pencarian" style="display: ${riwayatSearchQuery ? 'inline-flex' : 'none'}; border: none; background: #e2e8f0; color: #475569; width: 24px; height: 24px; border-radius: 50%; align-items: center; justify-content: center; font-size: 11px; cursor: pointer; flex-shrink: 0; margin-left: 6px;" onclick="window.mobileClearSecurityRiwayatSearch()">✕</button>
      </div>

      <!-- 2. Toolbar (Perubahan 2: Toggle Dihapus; Perubahan 3: Filter & Hapus Riwayat Berdampingan di Kanan Bawah Kolom Pencarian) -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; width: 100%; box-sizing: border-box;">
        <div style="font-size: 0.75rem; font-weight: 700; color: #475569;">
          ${totalItems} log pemindaian
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <!-- Tombol Filter (36x36px visual, Hit Area >= 44x44px) -->
          <button type="button" class="mobile-filter-toggle-btn mobile-touch-hit-44 ${isSecurityRiwayatFilterOpen ? 'active' : ''}" style="width: 36px; height: 36px; min-width: 36px; min-height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; border: 1.5px solid ${isSecurityRiwayatFilterOpen ? '#059669' : '#cbd5e1'}; background: ${isSecurityRiwayatFilterOpen ? '#ecfdf5' : '#ffffff'}; color: ${isSecurityRiwayatFilterOpen ? '#047857' : '#334155'}; cursor: pointer; box-sizing: border-box; position: relative;" onclick="window.mobileToggleSecurityRiwayatFilter()" title="Filter Riwayat Pemindaian" aria-label="Filter Riwayat Pemindaian">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            ${(riwayatStatusFilter !== 'all' || riwayatCategoryFilter !== 'all' || riwayatPeriodFilter !== 'all') ? '<span style="position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; border-radius: 50%; background: #059669;"></span>' : ''}
          </button>
          <!-- Tombol Merah Solid Sampah (36x36px visual, Hit Area >= 44x44px) -->
          <button type="button" class="mobile-btn-clear-history mobile-touch-hit-44" ${hasDeletableTickets ? '' : 'disabled'} title="Hapus Riwayat Selesai" aria-label="Hapus Riwayat Selesai" style="width: 36px; height: 36px; min-width: 36px; min-height: 36px; padding: 0; border-radius: 10px; background: #dc2626; border: 1.5px solid #dc2626; color: #ffffff; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(220, 38, 38, 0.2);" onclick="window.mobileClearRiwayat('security')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      </div>

      <!-- 3. Collapsible Filter Panel -->
      <div id="mSecurityRiwayatFilterCard" class="mobile-filter-panel" style="display: ${isSecurityRiwayatFilterOpen ? 'block' : 'none'}; margin-bottom: 12px;">
        <div class="mobile-filter-panel-title">
          <span>Filter Riwayat Pemindaian</span>
          <button type="button" style="border:none; background:none; font-size:0.75rem; color:#64748b; cursor:pointer;" onclick="window.mobileToggleSecurityRiwayatFilter()">✕</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <!-- Filter Periode -->
          <div>
            <label class="mobile-filter-label">Periode Waktu</label>
            <select class="mobile-filter-select" id="mRiwayatSecPeriod" onchange="window.mobileHandleSecurityRiwayatPeriodChange(this.value)">
              <option value="all" ${riwayatPeriodFilter === 'all' ? 'selected' : ''}>Semua Waktu</option>
              <option value="today" ${riwayatPeriodFilter === 'today' ? 'selected' : ''}>Hari Ini</option>
              <option value="week" ${riwayatPeriodFilter === 'week' ? 'selected' : ''}>Minggu Ini</option>
              <option value="month" ${riwayatPeriodFilter === 'month' ? 'selected' : ''}>Bulan Ini</option>
              <option value="year" ${riwayatPeriodFilter === 'year' ? 'selected' : ''}>Tahun Ini</option>
            </select>
          </div>

          <!-- Filter Kategori & Status (2 Kolom) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <label class="mobile-filter-label">Kategori</label>
              <select class="mobile-filter-select" id="mRiwayatSecCat" onchange="window.mobileHandleSecurityRiwayatCatChange(this.value)">
                <option value="all" ${riwayatCategoryFilter === 'all' ? 'selected' : ''}>Semua Kategori</option>
                <option value="Dinas Kantor" ${riwayatCategoryFilter === 'Dinas Kantor' ? 'selected' : ''}>Dinas Kantor</option>
                <option value="Urusan Pribadi" ${riwayatCategoryFilter === 'Urusan Pribadi' ? 'selected' : ''}>Urusan Pribadi</option>
              </select>
            </div>
            <div>
              <label class="mobile-filter-label">Status</label>
              <select class="mobile-filter-select" id="mRiwayatSecStatus" onchange="window.mobileHandleSecurityRiwayatStatusChange(this.value)">
                <option value="all" ${riwayatStatusFilter === 'all' ? 'selected' : ''}>Semua Status</option>
                <option value="Sedang di Luar" ${riwayatStatusFilter === 'Sedang di Luar' ? 'selected' : ''}>Sedang di Luar</option>
                <option value="Disetujui" ${riwayatStatusFilter === 'Disetujui' ? 'selected' : ''}>Disetujui</option>
                <option value="Selesai" ${riwayatStatusFilter === 'Selesai' ? 'selected' : ''}>Selesai</option>
                <option value="Terlambat" ${riwayatStatusFilter === 'Terlambat' ? 'selected' : ''}>Terlambat</option>
                <option value="Kedaluwarsa" ${riwayatStatusFilter === 'Kedaluwarsa' ? 'selected' : ''}>Kedaluwarsa</option>
              </select>
            </div>
          </div>

          <div style="margin-top: 4px;">
            <button type="button" class="mobile-btn-secondary" style="width: 100%; padding: 8px 12px; font-size: 0.75rem; font-weight: 700;" onclick="window.mobileResetSecurityRiwayatFilter()">
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      <!-- 4. Ringkasan Hasil -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 0.725rem; color: #475569; font-weight: 700;">
          ${totalItems} log pemindaian • ${periodText} • Terbaru lebih dulu
        </span>
      </div>

      <!-- 5. Items Container -->
      <div id="mSecurityRiwayatItemsContainer">
        ${totalItems === 0 ? emptyHtml : listHtml}
      </div>

      <!-- 6. Paginasi -->
      ${paginationHtml}
    `;
  }

  // -------------------------------------------------------------------
  // 6. POS JAGA ACTION HANDLERS & MODAL (Scan Out / Scan In & Detail)
  // -------------------------------------------------------------------
  window.mobileSecurityInspectTicket = function (ticketId) {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;

    const tickets = getTickets();
    const cleanId = extractTicketId(ticketId);
    const t = tickets.find(x => x.id === cleanId || x.id.toLowerCase() === cleanId.toLowerCase());
    if (!t) {
      if (typeof window.showToast === 'function') window.showToast(`Tiket #${cleanId} tidak ditemukan dalam sistem!`, 'danger');
      return;
    }

    const isReadyOut = (t.status === 'Disetujui');
    const isReadyIn = (t.status === 'Sedang di Luar' || t.status === 'Terlambat');
    const isCompleted = (t.status === 'Selesai');
    const isPulang = (t.type === 'Pulang Mendahului' || t.returnType === 'Pulang Mendahului' || t.type === 'Pulang Lebih Awal');
    const isEmergencyTicket = Boolean(t.isEmergency || (t.id && (t.id.includes('-EMG-') || t.id.startsWith('TK-EMG'))));
    const isLate = isTicketLate(t);    const isFinished = (t.status === 'Selesai' || t.status === 'Ditolak' || t.status === 'Dibatalkan' || t.status === 'Kedaluwarsa');    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-top: 1px;">
          <h3 class="mobile-sheet-title" style="font-family: monospace; font-size: 1rem; margin: 0; color: #0f172a;">${t.id}</h3>
          ${isEmergencyTicket ? '<span class="mobile-badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-size:0.65rem; font-weight:800; padding:1px 5px; border-radius:4px;">🚨 DARURAT</span>' : ''}
        </div>
        <button type="button" aria-label="Tutup" class="mobile-sheet-close" style="width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; background: #f1f5f9; border: none; border-radius: 50%; font-size: 1.1rem; color: #64748b; cursor: pointer; padding: 0;" onclick="window.mobileCloseSheet()">✕</button>
      </div>

      <div class="mobile-sheet-body">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a;">${getTName(t)}</div>
            <div style="font-size: 0.725rem; color: #475569; font-weight: 600;">${getTNip(t)}${t.department ? ' • ' + t.department : ''}</div>
          </div>
          <span class="mobile-badge ${getBadgeClass(t.status)}">${t.status}</span>
        </div>

        <!-- Segment Toggle: Info vs Aktivitas -->
        <div class="mobile-segment-toggle" style="margin-bottom: 12px;">
          <button type="button" class="mobile-seg-btn active" id="mBtnSecDetailInfo" onclick="window.mobileToggleSecurityDetailTab('info')">Informasi Tiket</button>
          <button type="button" class="mobile-seg-btn" id="mBtnSecDetailJejak" onclick="window.mobileToggleSecurityDetailTab('jejak')">Riwayat Aktivitas</button>
        </div>

        <div id="mSecDetailSecInfo">
          <!-- Card 1: Informasi Karyawan -->
          <div class="mobile-card" style="margin-bottom: 8px;">
            <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; margin-bottom: 4px;">INFORMASI KARYAWAN</div>
            <div style="font-size: 0.75rem; color: #1e293b; line-height: 1.5;">
              <strong>Nama:</strong> ${getTName(t)}<br>
              <strong>NIP:</strong> ${getTNip(t)}<br>
              <strong>Departemen:</strong> ${t.department || 'Departemen Rekayasa & Pemeliharaan'}
            </div>
          </div>

          <!-- Card 2: Keperluan Izin -->
          <div class="mobile-card" style="margin-bottom: 8px;">
            <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; margin-bottom: 4px;">KEPERLUAN IZIN</div>
            <div style="font-size: 0.75rem; color: #1e293b; line-height: 1.5;">
              <strong>Kategori:</strong> ${t.category || 'Dinas Kantor'}<br>
              <strong>Tipe Kepulangan:</strong> ${getTType(t)}<br>
              <strong>Tujuan:</strong> ${(t.destination && t.destination.trim()) ? t.destination.trim() : 'Tanpa tujuan'}<br>
              <strong>Alasan:</strong> "${t.reason || '-'}"<br>
              <strong>Atasan Pemberi Izin:</strong> ${t.approverName || 'Ir. Hendra Gunawan, M.T.'}<br>
              <strong>Moda Transportasi:</strong> ${getTTransport(t)}
            </div>
          </div>

          <!-- Card 3: Waktu Rencana -->
          <div class="mobile-card" style="margin-bottom: 8px;">
            <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; margin-bottom: 4px;">${isPulang ? 'WAKTU RENCANA KELUAR' : 'WAKTU RENCANA KELUAR & KEMBALI'}</div>
            <div class="mobile-ticket-grid-meta" style="margin: 4px 0 0 0;">
              <div>
                <div class="mobile-meta-sub">Rencana Keluar</div>
                <div class="mobile-meta-val">${formatDisplayDate(getTExitTime(t)) || '10.00 WIB'}</div>
              </div>
              <div>
                <div class="mobile-meta-sub">${isPulang ? 'Tipe Kepulangan' : 'Batas Kembali'}</div>
                <div class="mobile-meta-val">${isPulang ? 'Pulang Lebih Awal' : (formatDisplayDate(getTReturnTime(t)) || '13.00 WIB')}</div>
              </div>
            </div>
          </div>

          <!-- Card 4: Catatan Gerbang & Petugas Pos -->
          <div class="mobile-card" style="margin-bottom: 8px;">
            <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; margin-bottom: 4px;">REALISASI GERBANG & POS JAGA</div>
            <div class="mobile-ticket-grid-meta" style="margin: 4px 0 0 0;">
              <div>
                <div class="mobile-meta-sub">Scan Out Aktual</div>
                <div class="mobile-meta-val" style="color: ${t.scanOutTime ? '#0f172a' : '#64748b'}; font-weight: 700;">${t.scanOutTime ? formatDisplayDate(t.scanOutTime) : 'Belum Scan Out'}</div>
                <div style="font-size: 0.65rem; color: #475569; margin-top: 2px;">${t.scanOutGate || (t.scanOutTime ? activeGate : 'Belum ada')} • ${t.securityOfficerOut || 'Petugas'}</div>
              </div>
              <div>
                <div class="mobile-meta-sub">Masuk Kembali Aktual</div>
                <div class="mobile-meta-val" style="color: ${isPulang ? '#64748b' : (t.scanInTime ? '#047857' : (isLate ? '#b91c1c' : '#dc2626'))}; font-weight: 700;">
                  ${isPulang ? 'Tidak kembali' : (t.scanInTime ? formatDisplayDate(t.scanInTime) : 'Belum kembali')}
                </div>
                <div style="font-size: 0.65rem; color: #475569; margin-top: 2px;">${isPulang ? 'Pulang Lebih Awal' : ((t.scanInGate || (t.scanInTime ? activeGate : 'Belum ada')) + ' • ' + (t.securityOfficerIn || 'Petugas'))}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab Riwayat Aktivitas (Timeline) -->
        <div id="mSecDetailSecJejak" style="display: none;">
          <div class="mobile-timeline">
            ${renderTimelineHtml(t)}
          </div>
        </div>

        <!-- Action Buttons (Read-only for Pos Jaga, only operational Scan Out / Scan In when applicable) -->
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 8px;">
          <!-- Pos Jaga: Detail bersifat inspeksi. Scan Out dan Tap In hanya dilakukan oleh Karyawan -->

          ${(t.isEmergency && t.emergencyLocked) ? `
            <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 10px; font-size: 0.725rem; color: #991b1b; text-align: center; font-weight: 700;">
              🚨 Tiket Darurat TERKUNCI: Menunggu otorisasi Atasan sebelum gerbang dapat dibuka.
            </div>
          ` : ''}

          ${(t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat') ? `
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px; font-size: 0.725rem; color: #92400e; text-align: center; font-weight: 700;">
              ⚠️ Akses Belum Diizinkan: Tiket belum disetujui oleh Atasan.
            </div>
          ` : ''}

          ${(isCompleted || isFinished) ? `
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; font-size: 0.75rem; color: #047857; text-align: center; font-weight: 700;">
              Tiket ini telah selesai diproses. QR Code sudah tidak aktif.
            </div>
            <button type="button" class="mobile-btn-danger" style="background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; font-weight: 700; min-height: 44px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.825rem; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.25); width: 100%; margin-top: 4px;" onclick="window.mobileDeleteTicketItem('${t.id}', 'security')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              <span>Hapus Riwayat</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  function closeMobileSheet() {
    if (typeof window.mobileCloseSheet === 'function') {
      window.mobileCloseSheet();
    } else {
      const sheet = document.getElementById('mobileActionSheet');
      const backdrop = document.getElementById('mobileModalBackdrop');
      if (sheet) sheet.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
    }
  }

  window.mobileSecurityDirectScanOut = function (ticketId) {
    localStorage.setItem('KUJANG_ACTIVE_GATE', activeGate);

    if (typeof window.executeScanOut === 'function') {
      window.executeScanOut(ticketId);
      closeMobileSheet();
      renderMobileSecurity(null, currentSecurityTab);
      if (typeof window.renderActiveView === 'function') window.renderActiveView();
      return;
    }

    const tickets = getTickets();
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;

    const officer = getActiveOfficer();
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const nowFormatted = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

    t.scanOutGate = activeGate;
    t.scanOutTime = `${nowFormatted} (${activeGate})`;
    t.securityOfficerOut = officer.name;
    t.securityNipOut = officer.nip;
    if (!t.timeline) t.timeline = [];

    if (t.type === 'Pulang Mendahului' || t.returnType === 'Pulang Mendahului') {
      t.status = 'Selesai';
      if (typeof window.createNotification === 'function') {
        window.createNotification({
          recipientRole: 'karyawan',
          recipientNip: t.applicantNip || 'PK-2024-8841',
          recipientName: t.applicantName || 'Budi Pratama, S.T.',
          actorSource: 'security',
          type: 'selesai',
          title: 'Izin Selesai Diproses',
          message: `Perjalanan izin keluar Anda (#${t.id}) telah selesai dicatat oleh Pos Jaga (Pulang Lebih Awal).`,
          ticketId: t.id,
          priority: 'normal',
          eventId: `completed_${t.id}`
        });
      }
      t.timeline.push({
        event: 'Scan Out Pos Jaga (Pulang)',
        time: nowFormatted,
        by: `${officer.name} (${activeGate})`,
        gate: activeGate,
        desc: `Karyawan meninggalkan kawasan pabrik melalui ${activeGate} (Pulang Lebih Awal). Tiket langsung Selesai.`
      });
      if (typeof window.showToast === 'function') {
        window.showToast(`Scan Out berhasil di ${activeGate}! Tiket #${t.id} selesai diproses (Pulang Lebih Awal).`, 'success');
      }
    } else {
      t.status = 'Sedang di Luar';
      t.timeline.push({
        event: 'Scan Out Pos Jaga',
        time: nowFormatted,
        by: `${officer.name} (${activeGate})`,
        gate: activeGate,
        desc: `Karyawan diverifikasi keluar gerbang pabrik melalui ${activeGate}. Status: Sedang di Luar.`
      });
      if (typeof window.showToast === 'function') {
        window.showToast(`Scan Out berhasil! ${getTName(t)} meninggalkan area pada ${nowFormatted} (${activeGate}).`, 'success');
      }
    }

    if (typeof window.saveTickets === 'function') {
      window.saveTickets(tickets);
    } else {
      localStorage.setItem('kujang_tickets', JSON.stringify(tickets));
    }

    closeMobileSheet();
    renderMobileSecurity(null, currentSecurityTab);
    if (typeof window.renderActiveView === 'function') window.renderActiveView();
  };

  window.mobileSecurityDirectScanIn = function (ticketId) {
    localStorage.setItem('KUJANG_ACTIVE_GATE', activeGate);

    if (typeof window.executeScanIn === 'function') {
      window.executeScanIn(ticketId);
      closeMobileSheet();
      renderMobileSecurity(null, currentSecurityTab);
      if (typeof window.renderActiveView === 'function') window.renderActiveView();
      return;
    }

    const tickets = getTickets();
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;

    const officer = getActiveOfficer();
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const nowFormatted = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

    t.status = 'Selesai';
    t.scanInGate = activeGate;
    t.scanInTime = `${nowFormatted} (${activeGate})`;
    t.securityOfficerIn = officer.name;
    t.securityNipIn = officer.nip;
    if (!t.timeline) t.timeline = [];

    const wasOverdue = isTicketLate(t);
    if (typeof window.createNotification === 'function') {
      window.createNotification({
        recipientRole: 'karyawan',
        recipientNip: t.applicantNip || 'PK-2024-8841',
        recipientName: t.applicantName || 'Budi Pratama, S.T.',
        actorSource: 'security',
        type: 'selesai',
        title: 'Izin Selesai Diproses',
        message: `Kepulangan Anda (#${t.id}) telah diverifikasi di ${activeGate}. Tiket selesai.`,
        ticketId: t.id,
        priority: 'normal',
        eventId: `completed_${t.id}`
      });
    }
    t.timeline.push({
      event: wasOverdue ? 'Tap In Kartu (Kembali Terlambat)' : 'Tap In Kartu (Kembali Masuk)',
      time: nowFormatted,
      by: `${officer.name} (${activeGate})`,
      gate: activeGate,
      desc: `Karyawan tiba kembali di kawasan pabrik melalui ${activeGate}. Diverifikasi oleh ${officer.name}. Tiket selesai.`
    });

    if (typeof window.saveTickets === 'function') {
      window.saveTickets(tickets);
    } else {
      localStorage.setItem('kujang_tickets', JSON.stringify(tickets));
    }

    closeMobileSheet();
    if (typeof window.showToast === 'function') {
      window.showToast(`Tap In Kartu Akses berhasil! ${getTName(t)} telah kembali ke area pabrik pada ${nowFormatted}. Tiket Selesai.`, wasOverdue ? 'warning' : 'success');
    }
    renderMobileSecurity(null, currentSecurityTab);
    if (typeof window.renderActiveView === 'function') window.renderActiveView();
  };

  // Alias for Tap In
  window.mobileSecurityDirectTapIn = window.mobileSecurityDirectScanIn;

  // -------------------------------------------------------------------
  // 7. REAL CAMERA SCANNER & FILE UPLOAD INTEGRATION
  // -------------------------------------------------------------------
  window.mobileStartCameraScanner = async function () {
    const statusMsg = document.getElementById('mCameraStatusMsg');
    const idleCard = document.getElementById('mCameraIdlePlaceholder');
    const activeBar = document.getElementById('mCameraActiveBar');
    const readerWrap = document.getElementById('mCameraReaderView');

    if (typeof Html5Qrcode === 'undefined') {
      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.innerHTML = '<span style="color: #dc2626; font-weight: 700;">Library pemindai kamera (Html5Qrcode) belum termuat. Silakan gunakan Input Manual.</span>';
      }
      if (typeof window.showToast === 'function') window.showToast('Library pemindai kamera tidak termuat.', 'danger');
      return;
    }

    try {
      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.innerHTML = 'Sedang mengaktifkan kamera...';
      }

      if (!mobileHtml5QrScanner) {
        mobileHtml5QrScanner = new Html5Qrcode('mCameraReaderView');
      }

      const config = {
        fps: 15,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0
      };

      // Prefer back camera on mobile (facingMode: environment)
      await mobileHtml5QrScanner.start(
        { facingMode: { ideal: "environment" } },
        config,
        (decodedText) => {
          window.mobileHandleCameraDecode(decodedText);
        },
        () => { }
      );

      isMobileCameraActive = true;
      if (idleCard) idleCard.style.display = 'none';
      if (readerWrap) readerWrap.style.display = 'block';
      if (activeBar) activeBar.style.display = 'flex';
      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.innerHTML = '<span style="color: #047857; font-weight: 700;">Kamera aktif: Arahkan ke QR Code tiket...</span>';
      }
      if (typeof window.showToast === 'function') window.showToast('Kamera pemindai aktif!', 'success');
    } catch (err) {
      console.warn('Mobile camera start error:', err);
      isMobileCameraActive = false;
      if (idleCard) idleCard.style.display = 'block';
      if (readerWrap) readerWrap.style.display = 'none';
      if (activeBar) activeBar.style.display = 'none';

      let userMsg = 'Kamera tidak dapat diakses. Pastikan izin kamera diberikan di browser.';
      const errStr = String(err ? (err.message || err) : '').toLowerCase();
      if (errStr.includes('permission') || errStr.includes('denied') || errStr.includes('notallowed')) {
        userMsg = 'Izin akses kamera ditolak. Silakan izinkan kamera di browser Anda.';
      } else if (errStr.includes('notfound') || errStr.includes('device')) {
        userMsg = 'Perangkat kamera tidak ditemukan. Gunakan Input Manual / Barcode.';
      }

      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.innerHTML = `<span style="color: #dc2626; font-weight: 700;">${userMsg}</span>`;
      }
      if (typeof window.showToast === 'function') window.showToast(userMsg, 'danger');
    }
  };

  window.mobileStopCameraScanner = async function () {
    if (mobileHtml5QrScanner && isMobileCameraActive) {
      try {
        await mobileHtml5QrScanner.stop();
      } catch (e) {
        console.warn('Error stopping mobile camera:', e);
      }
    }
    isMobileCameraActive = false;

    const idleCard = document.getElementById('mCameraIdlePlaceholder');
    const activeBar = document.getElementById('mCameraActiveBar');
    const readerWrap = document.getElementById('mCameraReaderView');
    const statusMsg = document.getElementById('mCameraStatusMsg');

    if (idleCard) idleCard.style.display = 'block';
    if (activeBar) activeBar.style.display = 'none';
    if (readerWrap) readerWrap.style.display = 'none';
    if (statusMsg) statusMsg.style.display = 'none';
  };

  function stopMobileCameraScanner() {
    window.mobileStopCameraScanner();
  }

  window.mobileHandleCameraDecode = function (decodedText) {
    const cleanId = extractTicketId(decodedText);
    if (!cleanId) return;

    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    if (typeof window.showToast === 'function') window.showToast(`✓ QR Terbaca: ${cleanId}`, 'success');

    window.mobileStopCameraScanner();
    window.mobileSecurityInspectTicket(cleanId);
  };

  window.mobileTriggerUploadQr = function () {
    const fileInput = document.getElementById('mSecInputQrFile');
    if (fileInput) fileInput.click();
  };

  window.mobileHandleQrFileUpload = async function (e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const statusMsg = document.getElementById('mCameraStatusMsg');
    try {
      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.textContent = 'Memindai berkas gambar QR...';
      }

      if (isMobileCameraActive) {
        await window.mobileStopCameraScanner();
      }

      if (!mobileHtml5QrScanner) {
        mobileHtml5QrScanner = new Html5Qrcode('mCameraReaderView');
      }

      const decodedText = await mobileHtml5QrScanner.scanFile(file, false);
      if (decodedText) {
        window.mobileHandleCameraDecode(decodedText);
      } else {
        throw new Error('QR tidak terdeteksi');
      }
    } catch (err) {
      console.warn('Upload QR decode error:', err);
      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.innerHTML = '<span style="color: #dc2626; font-weight: 700;">QR Code tidak ditemukan dalam gambar. Coba gambar lain yang lebih jelas.</span>';
      }
      if (typeof window.showToast === 'function') window.showToast('Gagal memindai: QR Code tidak terdeteksi di gambar.', 'danger');
    } finally {
      e.target.value = '';
    }
  };

  window.mobileSubmitManualScan = function (e) {
    e.preventDefault();
    const input = document.getElementById('mSecInputTicketId');
    if (!input || !input.value.trim()) return;
    const ticketId = input.value.trim();
    window.mobileSecurityInspectTicket(ticketId);
  };

  // -------------------------------------------------------------------
  // 8. NAVIGATION, TABS & FILTERS
  // -------------------------------------------------------------------
  window.mobileSwitchScannerMode = function (mode, customContainer) {
    currentScannerMode = mode;
    if (isMobileCameraActive && mode !== 'camera') {
      window.mobileStopCameraScanner();
    }
    const container = customContainer || document.getElementById('mobileMainContent');
    if (container) {
      renderSecurityScanner(container);
    }
  };

  window.mobileChangeGate = function (gate, customContainer) {
    activeGate = gate;
    localStorage.setItem('KUJANG_ACTIVE_GATE', gate);
    if (typeof window.showToast === 'function') {
      window.showToast(`Terminal aktif diubah ke: ${gate}`, 'info');
    }
    const container = customContainer || document.getElementById('mobileMainContent');
    if (container) {
      renderSecurityDashboard(container);
    }
  };

  window.mobileSwitchPelacakanFilter = function (filter, customContainer) {
    currentPelacakanFilter = filter;
    const container = customContainer || document.getElementById('mobileMainContent');
    if (container) {
      renderSecurityPelacakan(container);
    }
  };

  window.mobileHandlePelacakanDropdown = function (val) {
    window.mobileSwitchPelacakanFilter(val);
  };

  window.mobileApplyPelacakanSearch = function (customContainer) {
    const input = document.getElementById('mPelacakanSearchInput');
    if (input) pelacakanSearchQuery = input.value.trim();
    const container = customContainer || document.getElementById('mobileMainContent');
    if (container) {
      renderSecurityPelacakan(container);
    }
  };

  window.mobileTogglePelacakanFilter = function () {
    isPelacakanFilterOpen = !isPelacakanFilterOpen;
    renderMobileSecurity(null, 'pelacakan');
  };

  window.mobileResetPelacakanSearch = function () {
    pelacakanSearchQuery = '';
    renderMobileSecurity(null, 'pelacakan');
  };

  window.mobileToggleSecurityRiwayatFilter = function () {
    isSecurityRiwayatFilterOpen = !isSecurityRiwayatFilterOpen;
    renderMobileSecurity(null, 'riwayat');
  };

  window.mobileSwitchPelacakanTabAndFilter = function (tabFilter, specialQuery) {
    currentPelacakanFilter = tabFilter || 'outside';
    if (specialQuery === 'late') {
      pelacakanSearchQuery = '';
    }
    if (typeof window.mobileSwitchTab === 'function') {
      window.mobileSwitchTab('pelacakan');
    } else {
      currentSecurityTab = 'pelacakan';
      renderMobileSecurity(null, 'pelacakan');
    }
  };

  window.mobileToggleSecurityDetailTab = function (tab) {
    const secInfo = document.getElementById('mSecDetailSecInfo');
    const secJejak = document.getElementById('mSecDetailSecJejak');
    const btnInfo = document.getElementById('mBtnSecDetailInfo');
    const btnJejak = document.getElementById('mBtnSecDetailJejak');
    if (!secInfo || !secJejak) return;

    if (tab === 'info') {
      secInfo.style.display = 'block';
      secJejak.style.display = 'none';
      if (btnInfo) btnInfo.classList.add('active');
      if (btnJejak) btnJejak.classList.remove('active');
    } else {
      secInfo.style.display = 'none';
      secJejak.style.display = 'block';
      if (btnInfo) btnInfo.classList.remove('active');
      if (btnJejak) btnJejak.classList.add('active');
    }
  };

  window.mobileSwitchRiwayatViewSec = function (v, customContainer) {
    currentRiwayatView = v;
    const container = customContainer || document.getElementById('mobileMainContent');
    renderSecurityRiwayat(container);
  };

  window.mobileToggleSecurityRiwayatFilter = function () {
    isSecurityRiwayatFilterOpen = !isSecurityRiwayatFilterOpen;
    renderMobileSecurity(null, 'riwayat');
  };

  window.mobileHandleSecurityRiwayatPeriodChange = function (val) {
    riwayatPeriodFilter = val;
    currentRiwayatPage = 1;
    renderMobileSecurity(null, 'riwayat');
  };

  window.mobileHandleSecurityRiwayatCatChange = function (val) {
    riwayatCategoryFilter = val;
    currentRiwayatPage = 1;
    renderMobileSecurity(null, 'riwayat');
  };

  window.mobileHandleSecurityRiwayatStatusChange = function (val) {
    riwayatStatusFilter = val;
    currentRiwayatPage = 1;
    renderMobileSecurity(null, 'riwayat');
  };

  window.mobileDebounceSecurityRiwayatSearch = function (val) {
    if (riwayatSearchDebounceTimer) clearTimeout(riwayatSearchDebounceTimer);
    const clearBtn = document.getElementById('mBtnClearRiwayatSecSearch');
    if (clearBtn) clearBtn.style.display = val && val.trim() ? 'inline-flex' : 'none';

    riwayatSearchDebounceTimer = setTimeout(() => {
      riwayatSearchQuery = val;
      currentRiwayatPage = 1;
      renderMobileSecurity(null, 'riwayat');
    }, 250);
  };

  window.mobileClearSecurityRiwayatSearch = function () {
    riwayatSearchQuery = '';
    currentRiwayatPage = 1;
    const inp = document.getElementById('mRiwayatSecLiveSearch');
    if (inp) inp.value = '';
    const clearBtn = document.getElementById('mBtnClearRiwayatSecSearch');
    if (clearBtn) clearBtn.style.display = 'none';
    renderMobileSecurity(null, 'riwayat');
  };

  window.mobileResetSecurityRiwayatFilter = function () {
    riwayatSearchQuery = '';
    riwayatStatusFilter = 'all';
    riwayatCategoryFilter = 'all';
    riwayatPeriodFilter = 'all';
    currentRiwayatPage = 1;
    renderMobileSecurity(null, 'riwayat');
  };

  window.mobileSetSecurityRiwayatPage = function (p) {
    currentRiwayatPage = p;
    renderMobileSecurity(null, 'riwayat');
  };

  // Expose module function
  window.renderMobileSecurity = renderMobileSecurity;

})();
