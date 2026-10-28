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
  function getTType(t) { return t.type || t.returnType || 'Kembali ke Area'; }
  function getTTransport(t) { return t.transportMode || t.transportation || 'Kendaraan dinas'; }
  function getTReturnTime(t) { return t.estimatedReturn || t.plannedReturn || ''; }
  function getTExitTime(t) { return t.plannedExit || ''; }

  function formatTimeOnly(timeStr) {
    if (!timeStr) return '';
    if (timeStr.includes('T')) {
      return timeStr.split('T')[1].slice(0, 5) + ' WIB';
    }
    const match = timeStr.match(/(\d{1,2})[:.](\d{2})/);
    return match ? `${match[1]}.${match[2]} WIB` : timeStr;
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return '-';
    if (typeof window.formatDisplayDate === 'function') {
      return window.formatDisplayDate(dateStr);
    }
    try {
      const dt = new Date(dateStr);
      if (isNaN(dt.getTime())) return dateStr;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const pad = n => String(n).padStart(2, '0');
      return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}, ${pad(dt.getHours())}:${pad(dt.getMinutes())} WIB`;
    } catch (e) {
      return dateStr;
    }
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
    if (s.includes('luar')) return 'sedang-di-luar';
    if (s.includes('menunggu')) return 'menunggu';
    if (s.includes('disetujui')) return 'disetujui';
    if (s.includes('terlambat')) return 'terlambat';
    if (s.includes('selesai')) return 'selesai';
    if (s.includes('darurat')) return 'terlambat';
    if (s.includes('tolak')) return 'ditolak';
    return 'disetujui';
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
    const scanInToday = tickets.filter(t => t.status === 'Selesai' && t.scanInTime).length;

    // Overdue banner if any late tickets exist (PDF Hal 1)
    let alertBannerHtml = '';
    const overdueTicket = lateTickets[0];
    if (overdueTicket) {
      const lateMnt = overdueTicket.lateMinutes || 30;
      const batasJam = formatTimeOnly(getTReturnTime(overdueTicket)) || '10.30 WIB';
      alertBannerHtml = `
        <div class="mobile-emergency-banner" style="margin-bottom: 12px; background: #fef2f2; border: 1px solid #fecaca;">
          <div class="mobile-emergency-banner-title" style="color: #b91c1c; font-weight: 800; font-size: 0.8rem;">
            ⚠️ ${lateTickets.length} karyawan terlambat kembali
          </div>
          <div class="mobile-emergency-banner-desc" style="color: #991b1b; font-size: 0.725rem; line-height: 1.4; margin-top: 4px;">
            <strong>${getTName(overdueTicket)}</strong> terlambat ${lateMnt} menit. Batas kembali ${batasJam}; belum Scan In. Segera konfirmasi keberadaan atau tindak lanjuti di ${activeGate.split(' ')[0]} ${activeGate.split(' ')[1]}.
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
          <button type="button" class="mobile-link-rincian" style="border:none; background:none; font-size: 0.75rem; color: #2563eb; font-weight: 700;" onclick="window.mobileSecurityInspectTicket('${t.id}')">
            Rincian →
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
      const eventLabel = hasIn ? 'Scan In' : (t.isEmergency ? 'Scan Out • Darurat' : 'Scan Out');
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
        <h2 class="mobile-hero-name">${officer.name} 🛡️</h2>
        <div class="mobile-hero-role">NIP ${officer.nip} • ${officer.dept}</div>

        <div class="mobile-hero-divider"></div>

        <button type="button" class="mobile-hero-btn mobile-hero-btn-white" onclick="window.mobileSwitchTab('scanner')">
          <span>📷 Buka Kamera Scan</span>
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

        <div class="mobile-card" style="margin: 0; padding: 12px; cursor: pointer;" onclick="window.mobileSwitchTab('riwayat')">
          <div style="font-size: 0.675rem; color: #64748b; font-weight: 700;">Scan In hari ini</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #047857; line-height: 1.2; margin: 2px 0;">${scanInToday}</div>
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
      <div class="mobile-page-header">
        <div class="mobile-page-category-tag">Terminal Verifikasi Tiket</div>
        <h1 class="mobile-page-title">Pemindai QR</h1>
      </div>

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
          <div style="font-size: 2.2rem; margin-bottom: 8px;">📷</div>
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
            <span>✕ Hentikan Kamera</span>
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
      const q = pelacakanSearchQuery.toLowerCase();
      activeList = activeList.filter(t =>
        (t.id && t.id.toLowerCase().includes(q)) ||
        (getTName(t).toLowerCase().includes(q)) ||
        (getTNip(t).toLowerCase().includes(q)) ||
        (t.destination && t.destination.toLowerCase().includes(q)) ||
        (t.department && t.department.toLowerCase().includes(q))
      );
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
          <div style="font-size: 0.8rem; font-weight: 800; color: #1e293b; margin-bottom: 2px;">📍 ${t.destination || 'Area Rekayasa'}</div>
          <div style="font-size: 0.7rem; color: #64748b; margin-bottom: 6px;">Rencana : ${t.createdAt ? t.createdAt.split(',')[0] : '19 Okt 2026'} • ${exitPlanT} – ${returnT}</div>

          <div class="mobile-ticket-grid-meta" style="margin-bottom: 8px;">
            <div>
              <div class="mobile-meta-sub">${isReady ? 'Rencana Keluar' : 'Scan Out'}</div>
              <div class="mobile-meta-val">${isReady ? exitPlanT : (scanOutT || '10.05 WIB')}</div>
              <div style="font-size: 0.625rem; color: #64748b;">${isReady ? 'Belum Scan Out' : (t.scanOutGate || activeGate)}</div>
            </div>
            <div>
              <div class="mobile-meta-sub">Scan In</div>
              <div class="mobile-meta-val" style="color: ${scanInT ? '#047857' : '#64748b'};">${scanInT || 'Belum Scan In'}</div>
              <div style="font-size: 0.625rem; color: #64748b;">${scanInT ? (t.scanInGate || activeGate) : 'Belum ada catatan pos'}</div>
            </div>
          </div>

          ${statusInfoHtml}

          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="mobile-btn-secondary" style="padding: 5px 12px; font-size: 0.725rem; width: auto;" onclick="window.mobileSecurityInspectTicket('${t.id}')">
              Rincian
            </button>
            ${isReady ? `
              <button type="button" class="mobile-btn-primary" style="padding: 5px 12px; font-size: 0.725rem; width: auto;" onclick="window.mobileSecurityDirectScanOut('${t.id}')">
                Catat Scan Out
              </button>
            ` : `
              <button type="button" class="mobile-btn-primary" style="padding: 5px 12px; font-size: 0.725rem; width: auto; background: #047857; border-color: #047857;" onclick="window.mobileSecurityDirectScanIn('${t.id}')">
                Catat Scan In
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="mobile-page-header">
        <div class="mobile-page-category-tag">Terminal Pos Jaga</div>
        <h1 class="mobile-page-title">Pelacakan karyawan</h1>
      </div>

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
        <button type="button" class="mobile-filter-toggle-btn ${isPelacakanFilterOpen ? 'active' : ''}" onclick="window.mobileTogglePelacakanFilter()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          <span>${isPelacakanFilterOpen ? 'Tutup Filter' : 'Filter'}</span>
          ${pelacakanSearchQuery ? '<span style="width: 6px; height: 6px; border-radius: 50%; background: #059669; display: inline-block;"></span>' : ''}
        </button>
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
  // 5. RIWAYAT PEMINDAIAN (Hal 6 & 7 - Card & List View)
  // -------------------------------------------------------------------
  function renderSecurityRiwayat(container) {
    const tickets = getTickets();

    let filtered = tickets.filter(t => t.scanOutTime || t.scanInTime || t.status === 'Selesai' || t.status === 'Sedang di Luar' || t.status === 'Terlambat');

    if (riwayatStatusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === riwayatStatusFilter);
    }
    if (riwayatCategoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === riwayatCategoryFilter);
    }
    if (riwayatSearchQuery) {
      const q = riwayatSearchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        (t.id && t.id.toLowerCase().includes(q)) ||
        (getTName(t).toLowerCase().includes(q)) ||
        (getTNip(t).toLowerCase().includes(q)) ||
        (t.destination && t.destination.toLowerCase().includes(q)) ||
        (t.department && t.department.toLowerCase().includes(q))
      );
    }

    const cardsHtml = filtered.map(t => {
      const scanOutT = formatTimeOnly(t.scanOutTime);
      const scanInT = formatTimeOnly(t.scanInTime);
      const isPulang = (t.type === 'Pulang Mendahului' || t.returnType === 'Pulang Mendahului');
      const isLate = isTicketLate(t);

      return `
        <div class="mobile-ticket-item" style="border-left: 3px solid ${t.status === 'Selesai' ? '#047857' : (isLate ? '#dc2626' : (t.status === 'Disetujui' ? '#059669' : '#7c3aed'))}; margin-bottom: 12px;">
          <div class="mobile-ticket-item-header">
            <div>
              <div style="font-family: monospace; font-size: 0.85rem; font-weight: 800; color: #0f172a;">${t.id}</div>
              <div style="font-size: 0.85rem; font-weight: 800; color: #1e293b; margin-top: 1px;">${getTName(t)}</div>
              <div style="font-size: 0.675rem; color: #64748b;">${getTNip(t)} • ${t.department || 'Rekayasa & Pemeliharaan'}</div>
            </div>
            <span class="mobile-badge ${getBadgeClass(t.status)}">${t.status}</span>
          </div>

          <div style="font-size: 0.725rem; color: #047857; font-weight: 700; margin-bottom: 2px;">${t.category} • ${getTType(t)}</div>
          <div style="font-size: 0.8rem; font-weight: 800; color: #1e293b; margin-bottom: 2px;">📍 ${t.destination || 'Area Rekayasa'}</div>
          <div style="font-size: 0.7rem; color: #64748b; margin-bottom: 6px;">
            Rencana: ${t.createdAt ? t.createdAt.split(',')[0] : '19 Okt 2026'} • ${formatTimeOnly(getTExitTime(t))} – ${formatTimeOnly(getTReturnTime(t)) || '13.00 WIB'}
          </div>

          <div class="mobile-ticket-grid-meta" style="margin-bottom: 8px;">
            <div>
              <div class="mobile-meta-sub">Scan Out</div>
              <div class="mobile-meta-val">${scanOutT || 'Belum Scan Out'}</div>
              <div style="font-size: 0.625rem; color: #64748b;">${scanOutT ? (t.scanOutGate || activeGate) : 'Belum ada catatan pos'}</div>
            </div>
            <div>
              <div class="mobile-meta-sub">Scan In</div>
              <div class="mobile-meta-val" style="color: ${scanInT ? '#047857' : (isPulang ? '#64748b' : '#dc2626')};">
                ${isPulang ? 'Tidak diperlukan' : (scanInT || 'Belum Scan In')}
              </div>
              <div style="font-size: 0.625rem; color: #64748b;">
                ${isPulang ? 'Pulang Mendahului' : (scanInT ? (t.scanInGate || activeGate) : 'Belum ada catatan pos')}
              </div>
            </div>
          </div>

          ${t.status === 'Selesai' ? `
            <div style="font-size: 0.675rem; color: #047857; font-weight: 700; margin-bottom: 8px;">
              Selesai ${isLate ? 'terlambat' : 'tepat waktu'} • QR tidak lagi aktif.
            </div>
          ` : (isLate ? `
            <div style="font-size: 0.675rem; color: #b91c1c; font-weight: 700; margin-bottom: 8px;">
              ⚠️ Terlambat ${t.lateMinutes || 30} menit • Batas kembali ${formatTimeOnly(getTReturnTime(t))}.
            </div>
          ` : `
            <div style="font-size: 0.675rem; color: #64748b; margin-bottom: 8px;">
              Disetujui ${t.approverName || 'Atasan'} • Batas kembali ${formatTimeOnly(getTReturnTime(t)) || '13.00 WIB'}.
            </div>
          `)}

          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="mobile-btn-secondary" style="padding: 5px 12px; font-size: 0.725rem; width: auto;" onclick="window.mobileSecurityInspectTicket('${t.id}')">
              Rincian
            </button>
          </div>
        </div>
      `;
    }).join('');

    const listHtml = filtered.map(t => `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">
        <div style="flex: 1;">
          <div style="font-family: monospace; font-size: 0.8rem; font-weight: 800; color: #0f172a;">${t.id}</div>
          <div style="font-size: 0.825rem; font-weight: 800; color: #1e293b; margin-top: 1px;">${getTName(t)}</div>
          <div style="font-size: 0.675rem; color: #64748b;">${getTNip(t)} • ${t.department || 'Rekayasa & Pemeliharaan'}</div>
          <div style="font-size: 0.725rem; color: #047857; margin-top: 2px;">${t.category} • ${getTType(t)}</div>
          <div style="font-size: 0.675rem; color: #64748b;">Scan Out: ${formatTimeOnly(t.scanOutTime) || '—'} • Scan In: ${formatTimeOnly(t.scanInTime) || '—'}</div>
        </div>
        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
          <span class="mobile-badge ${getBadgeClass(t.status)}">${t.status}</span>
          <button type="button" class="mobile-link-rincian" style="border:none; background:none; font-size: 0.725rem; color: #2563eb;" onclick="window.mobileSecurityInspectTicket('${t.id}')">Rincian</button>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="mobile-page-header">
        <div class="mobile-page-category-tag">Log Transaksi Gerbang</div>
        <h1 class="mobile-page-title">Riwayat pemindaian</h1>
      </div>

      <!-- Results Summary Bar, View Switcher & Filter Button -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 0.725rem; color: #64748b; font-weight: 700;">
          ${filtered.length} log pemindaian
        </span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <!-- Segment Toggle: Card | List -->
          <div class="mobile-segment-toggle" style="margin-bottom: 0; padding: 2px;">
            <button type="button" class="mobile-seg-btn ${currentRiwayatView === 'card' ? 'active' : ''}" style="padding: 4px 10px; font-size: 0.7rem;" onclick="window.mobileSwitchRiwayatViewSec('card')">
              Card
            </button>
            <button type="button" class="mobile-seg-btn ${currentRiwayatView === 'list' ? 'active' : ''}" style="padding: 4px 10px; font-size: 0.7rem;" onclick="window.mobileSwitchRiwayatViewSec('list')">
              List
            </button>
          </div>
          <button type="button" class="mobile-filter-toggle-btn ${isSecurityRiwayatFilterOpen ? 'active' : ''}" onclick="window.mobileToggleSecurityRiwayatFilter()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            <span>${isSecurityRiwayatFilterOpen ? 'Tutup Filter' : 'Filter'}</span>
            ${(riwayatSearchQuery || riwayatStatusFilter !== 'all' || riwayatCategoryFilter !== 'all') ? '<span style="width: 6px; height: 6px; border-radius: 50%; background: #059669; display: inline-block;"></span>' : ''}
          </button>
        </div>
      </div>

      <!-- Collapsible Filter Card -->
      <div id="mSecurityRiwayatFilterCard" class="mobile-filter-panel" style="display: ${isSecurityRiwayatFilterOpen ? 'block' : 'none'};">
        <div class="mobile-filter-panel-title">
          <span>Cari & filter riwayat pemindaian</span>
          <button type="button" style="border:none; background:none; font-size:0.75rem; color:#64748b; cursor:pointer;" onclick="window.mobileToggleSecurityRiwayatFilter()">✕</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div>
            <label class="mobile-filter-label">Pencarian</label>
            <input type="text" id="mRiwayatSecSearch" class="mobile-filter-input" placeholder="Cari tiket, nama, NIP, atau tujuan…" value="${riwayatSearchQuery}">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <label class="mobile-filter-label">Kategori</label>
              <select class="mobile-filter-select" id="mRiwayatSecCat">
                <option value="all" ${riwayatCategoryFilter === 'all' ? 'selected' : ''}>Semua Kategori</option>
                <option value="Dinas Kantor" ${riwayatCategoryFilter === 'Dinas Kantor' ? 'selected' : ''}>Dinas Kantor</option>
                <option value="Urusan Pribadi" ${riwayatCategoryFilter === 'Urusan Pribadi' ? 'selected' : ''}>Urusan Pribadi</option>
              </select>
            </div>
            <div>
              <label class="mobile-filter-label">Status</label>
              <select class="mobile-filter-select" id="mRiwayatSecStatus">
                <option value="all" ${riwayatStatusFilter === 'all' ? 'selected' : ''}>Semua Status</option>
                <option value="Sedang di Luar" ${riwayatStatusFilter === 'Sedang di Luar' ? 'selected' : ''}>Sedang di Luar</option>
                <option value="Disetujui" ${riwayatStatusFilter === 'Disetujui' ? 'selected' : ''}>Disetujui</option>
                <option value="Selesai" ${riwayatStatusFilter === 'Selesai' ? 'selected' : ''}>Selesai</option>
                <option value="Terlambat" ${riwayatStatusFilter === 'Terlambat' ? 'selected' : ''}>Terlambat</option>
              </select>
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <button type="button" class="mobile-btn-primary" style="flex: 2; padding: 7px 12px; font-size: 0.75rem;" onclick="window.mobileFilterRiwayatSec()">
              Terapkan Filter
            </button>
            <button type="button" class="mobile-btn-secondary" style="flex: 1; padding: 7px 12px; font-size: 0.75rem;" onclick="window.mobileResetRiwayatSec()">
              Reset
            </button>
          </div>
        </div>
      </div>

      <!-- Items List -->
      ${currentRiwayatView === 'card' ? `
        <div>${cardsHtml || '<div class="mobile-card" style="text-align: center; color: #64748b; font-size: 0.8rem; padding: 24px;">Tidak ada riwayat pemindaian.</div>'}</div>
      ` : `
        <div class="mobile-card" style="padding: 4px 10px;">
          ${listHtml || '<div style="text-align: center; color: #64748b; font-size: 0.8rem; padding: 20px;">Tidak ada riwayat pemindaian.</div>'}
        </div>
      `}

      <!-- Pagination (Matching PDF Hal 6 & 7) -->
      <div style="display: flex; justify-content: center; gap: 6px; margin: 16px 0;">
        <span style="display: inline-flex; width: 32px; height: 32px; border-radius: 8px; background: #2563eb; color: #fff; font-size: 0.75rem; font-weight: 800; align-items: center; justify-content: center;">1</span>
        <span style="display: inline-flex; width: 32px; height: 32px; border-radius: 8px; background: #f1f5f9; color: #64748b; font-size: 0.75rem; font-weight: 700; align-items: center; justify-content: center; cursor: pointer;">2</span>
      </div>
    `;
  }

  // -------------------------------------------------------------------
  // 6. POS JAGA ACTION HANDLERS & MODAL (Scan Out / Scan In)
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
    const isPulang = (t.type === 'Pulang Mendahului' || t.returnType === 'Pulang Mendahului');

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">
        <div>
          <span style="font-size: 0.675rem; color: #2563eb; font-weight: 800; text-transform: uppercase;">VERIFIKASI GERBANG • ${activeGate}</span>
          <h3 class="mobile-sheet-title" style="font-family: monospace; font-size: 1.1rem; margin-top: 2px;">${t.id}</h3>
        </div>
        <button type="button" class="mobile-sheet-close" onclick="window.mobileCloseSheet()">✕</button>
      </div>

      <div class="mobile-sheet-body">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a;">${getTName(t)}</div>
            <div style="font-size: 0.725rem; color: #64748b;">${getTNip(t)} • ${t.department || 'Rekayasa & Pemeliharaan'}</div>
          </div>
          <span class="mobile-badge ${getBadgeClass(t.status)}">${t.status}</span>
        </div>

        <div class="mobile-card" style="background: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: 12px; padding: 10px 12px;">
          <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; margin-bottom: 4px;">DETAIL DOKUMEN IZIN</div>
          <div style="font-size: 0.75rem; color: #1e293b; line-height: 1.5;">
            <strong>Keperluan:</strong> ${t.category} (${getTType(t)})<br>
            <strong>Tujuan:</strong> ${t.destination || 'Area Cikampek'}<br>
            <strong>Alasan:</strong> "${t.reason || '-'}"<br>
            <strong>Atasan:</strong> ${t.approverName || 'Ir. Hendra Gunawan, M.T.'}<br>
            <strong>Transportasi:</strong> ${getTTransport(t)}
          </div>
        </div>

        <div class="mobile-ticket-grid-meta" style="margin-bottom: 14px;">
          <div>
            <div class="mobile-meta-sub">Rencana Keluar</div>
            <div class="mobile-meta-val">${formatTimeOnly(getTExitTime(t)) || '10.00 WIB'}</div>
            <div style="font-size: 0.65rem; color: #64748b;">${t.scanOutTime ? formatTimeOnly(t.scanOutTime) + ' (Aktual)' : 'Belum keluar'}</div>
          </div>
          <div>
            <div class="mobile-meta-sub">${isPulang ? 'Tipe' : 'Batas Kembali'}</div>
            <div class="mobile-meta-val" style="color: ${isTicketLate(t) ? '#dc2626' : '#0f172a'};">
              ${isPulang ? 'Pulang Mendahului' : (formatTimeOnly(getTReturnTime(t)) || '13.00 WIB')}
            </div>
            <div style="font-size: 0.65rem; color: #64748b;">${isPulang ? 'Tidak kembali' : (t.scanInTime ? formatTimeOnly(t.scanInTime) + ' (Kembali)' : 'Belum kembali')}</div>
          </div>
        </div>

        <!-- Action Buttons (Strict Rule 5: NO APPROVAL/REJECTION BY POS JAGA) -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${isReadyOut ? `
            <button type="button" class="mobile-btn-primary" style="font-weight: 700; padding: 11px;" onclick="window.mobileSecurityDirectScanOut('${t.id}')">
              <span>Catat Scan Out (${activeGate.split(' ')[0]} ${activeGate.split(' ')[1]})</span>
            </button>
          ` : ''}

          ${isReadyIn ? `
            <button type="button" class="mobile-btn-primary" style="font-weight: 700; padding: 11px; background: #047857; border-color: #047857;" onclick="window.mobileSecurityDirectScanIn('${t.id}')">
              <span>Catat Scan In (${activeGate.split(' ')[0]} ${activeGate.split(' ')[1]})</span>
            </button>
          ` : ''}

          ${isCompleted ? `
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px; font-size: 0.725rem; color: #047857; text-align: center; font-weight: 700;">
              Tiket ini telah selesai diproses. QR Code sudah tidak aktif.
            </div>
          ` : ''}

          <button type="button" class="mobile-btn-secondary" style="font-weight: 600;" onclick="window.mobileCloseSheet()">
            Tutup
          </button>
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
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

    t.scanOutGate = activeGate;
    t.scanOutTime = `${nowFormatted} (${activeGate})`;
    t.securityOfficerOut = officer.name;
    t.securityNipOut = officer.nip;
    if (!t.timeline) t.timeline = [];

    if (t.type === 'Pulang Mendahului' || t.returnType === 'Pulang Mendahului') {
      t.status = 'Selesai';
      t.timeline.push({
        event: 'Scan Out Pos Jaga (Pulang)',
        time: nowFormatted,
        by: `${officer.name} (${activeGate})`,
        gate: activeGate,
        desc: `Karyawan meninggalkan kawasan pabrik melalui ${activeGate} (Pulang Mendahului). Tiket langsung Selesai.`
      });
      if (typeof window.showToast === 'function') {
        window.showToast(`Scan Out berhasil di ${activeGate}! Tiket #${t.id} selesai diproses (Pulang Mendahului).`, 'success');
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
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

    t.status = 'Selesai';
    t.scanInGate = activeGate;
    t.scanInTime = `${nowFormatted} (${activeGate})`;
    t.securityOfficerIn = officer.name;
    t.securityNipIn = officer.nip;
    if (!t.timeline) t.timeline = [];

    const wasOverdue = isTicketLate(t);
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
      window.showToast(`Scan In berhasil! ${getTName(t)} telah kembali ke area pabrik pada ${nowFormatted}. Tiket Selesai.`, wasOverdue ? 'warning' : 'success');
    }
    renderMobileSecurity(null, currentSecurityTab);
    if (typeof window.renderActiveView === 'function') window.renderActiveView();
  };

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
        () => {}
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
        statusMsg.innerHTML = `<span style="color: #dc2626; font-weight: 700;">⚠️ ${userMsg}</span>`;
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

  window.mobileSwitchRiwayatViewSec = function (v, customContainer) {
    currentRiwayatView = v;
    const container = customContainer || document.getElementById('mobileMainContent');
    renderSecurityRiwayat(container);
  };

  window.mobileFilterRiwayatSec = function () {
    const searchEl = document.getElementById('mRiwayatSecSearch');
    const catEl = document.getElementById('mRiwayatSecCat');
    const statusEl = document.getElementById('mRiwayatSecStatus');
    if (searchEl) riwayatSearchQuery = searchEl.value.trim();
    if (catEl) riwayatCategoryFilter = catEl.value;
    if (statusEl) riwayatStatusFilter = statusEl.value;
    renderMobileSecurity(null, 'riwayat');
  };

  window.mobileResetRiwayatSec = function () {
    riwayatSearchQuery = '';
    riwayatCategoryFilter = 'all';
    riwayatStatusFilter = 'all';
    renderMobileSecurity(null, 'riwayat');
  };

  // Expose module function
  window.renderMobileSecurity = renderMobileSecurity;

})();
