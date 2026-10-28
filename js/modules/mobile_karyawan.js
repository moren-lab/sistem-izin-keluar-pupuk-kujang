/**
 * SISTEM PERIZINAN KELUAR AREA - PT PUPUK KUJANG CIKAMPEK
 * MODULE: MOBILE KARYAWAN (Ref: Figma PDF Karyawan Hal 1 - 14)
 * 100% PARITAS LOGIKA & ALUR SISTEM DENGAN PC (DESKTOP)
 */

(function () {
  'use strict';

  let currentKaryawanTab = 'dashboard'; // 'dashboard' | 'pengajuan' | 'riwayat'
  let currentSegment = 'ringkasan'; // 'ringkasan' | 'donut'
  let riwayatSearchQuery = '';
  let riwayatStatusFilter = 'all';
  let selectedApproverData = null;
  let pendingMobileFormData = null;

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
  function getTType(t) { return t.type || t.returnType || 'Kembali ke Area'; }
  function getTTransport(t) { return t.transportMode || t.transportation || 'Kendaraan dinas'; }
  function getTReturnTime(t) { return t.estimatedReturn || t.plannedReturn || ''; }
  function getTExitTime(t) { return t.plannedExit || ''; }

  function getEmpTickets() {
    const emp = getActiveEmp();
    const tickets = window.ticketsList || [];
    const myNip = emp.nip || 'PK-2024-8841';
    return tickets.filter(t => !t.deletedByKaryawan && (
      t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841') || (myNip === 'PK-2024-8841' && (!t.applicantNip || t.applicantNip === 'PK-2024-8841'))
    ));
  }

  function getActiveTicket() {
    const emp = getActiveEmp();
    if (typeof window.getActiveTicket === 'function') {
      return window.getActiveTicket(emp.nip);
    }
    const tickets = getEmpTickets();
    return tickets.find(t =>
      t.status !== 'Dibatalkan' &&
      t.status !== 'Ditolak' &&
      t.status !== 'Selesai' &&
      t.status !== 'Kedaluwarsa' &&
      (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat' || t.status === 'Disetujui' || t.status === 'Sedang di Luar' || t.status === 'Terlambat')
    );
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

  function formatDateTimeLocal(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function formatTimeOnly(timeStr) {
    if (!timeStr) return '';
    if (timeStr.includes('T')) {
      return timeStr.split('T')[1].slice(0, 5) + ' WIB';
    }
    const match = timeStr.match(/(\d{1,2})[:.](\d{2})/);
    return match ? `${match[1]}.${match[2]} WIB` : timeStr;
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
    return 'menunggu';
  }

  function getMobileApprovers() {
    return [
      { name: 'Ir. Hendra Gunawan, M.T.', title: 'Manajer Rekayasa & Pemeliharaan', department: 'Departemen Rekayasa & Pemeliharaan', initials: 'HG', avatarBg: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', nip: 'PK-2016-3392' },
      { name: 'Dewi Sartika, S.T., M.M.', title: 'VP Operasional & Pemeliharaan', department: 'Departemen Rekayasa & Pemeliharaan', initials: 'DS', avatarBg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', nip: 'PK-2012-0845' },
      { name: 'Agus Setiawan, S.T.', title: 'Supervisor Instrumen & Kelistrikan', department: 'Departemen Rekayasa & Pemeliharaan', initials: 'AS', avatarBg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', nip: 'PK-2018-4421' },
      { name: 'Dr. Ir. Bambang Hermanto', title: 'Kepala Divisi Teknologi & Rekayasa', department: 'Direktorat Operasi Pabrik', initials: 'BH', avatarBg: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)', nip: 'PK-2010-0112' },
      { name: 'Siti Nurhaliza, M.T.', title: 'Kepala Bagian Pemeliharaan Mekanikal', department: 'Departemen Rekayasa & Pemeliharaan', initials: 'SN', avatarBg: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)', nip: 'PK-2019-5510' },
      { name: 'Rahmat Hidayat, S.T.', title: 'Kepala Bagian Inspeksi Pabrik', department: 'Departemen Rekayasa & Pemeliharaan', initials: 'RH', avatarBg: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)', nip: 'PK-2017-3891' },
      { name: 'Ir. Ahmad Zulkifli', title: 'General Manager Produksi Pabrik 1B', department: 'Direktorat Produksi', initials: 'AZ', avatarBg: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', nip: 'PK-2011-0422' },
      { name: 'Budi Santoso, S.Kom.', title: 'Manajer Keamanan & Sistem Informasi', department: 'Departemen TI & Pengamanan', initials: 'BS', avatarBg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', nip: 'PK-2015-2881' }
    ];
  }

  // -------------------------------------------------------------------
  // 1. RENDER KARYAWAN MAIN VIEW
  // -------------------------------------------------------------------
  function renderMobileKaryawan(container, targetTab) {
    if (targetTab) currentKaryawanTab = targetTab;
    if (!container) container = document.getElementById('mobileMainContent');
    if (!container) return;

    if (currentKaryawanTab === 'dashboard') {
      renderDashboard(container);
    } else if (currentKaryawanTab === 'pengajuan') {
      renderPengajuan(container);
    } else if (currentKaryawanTab === 'riwayat') {
      renderRiwayat(container);
    }
  }

  // -------------------------------------------------------------------
  // 2. DASHBOARD KARYAWAN (100% PARITAS DENGAN PC)
  // -------------------------------------------------------------------
  function renderDashboard(container) {
    const emp = getActiveEmp();
    const tickets = getEmpTickets();
    const activeTicket = getActiveTicket();
    const approver = (typeof window.getPrimaryApprover === 'function')
      ? window.getPrimaryApprover()
      : { name: 'Ir. Hendra Gunawan, M.T.' };

    const totalCount = tickets.length;
    const completedTickets = tickets.filter(t => t.status === 'Selesai');
    const selesaiCount = completedTickets.length;
    const lateCompleted = completedTickets.filter(t => t.isLate || (t.approverNote && t.approverNote.toLowerCase().includes('terlambat'))).length;
    const tepatWaktuCount = Math.max(0, selesaiCount - lateCompleted);
    const activeCount = activeTicket ? 1 : 0;
    const terlambatCount = tickets.filter(t => t.status === 'Terlambat' || (t.status === 'Selesai' && ((t.lateMinutes && t.lateMinutes > 0) || (t.scanInTime || '').includes('[Terlambat]')))).length;

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
                <span class="pulsing-dot" style="display:inline-block; width:7px; height:7px; background:#f59e0b; border-radius:50%;"></span>
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
                <span class="pulsing-dot" style="display:inline-block; width:7px; height:7px; background:#34d399; border-radius:50%;"></span>
                Status: Izin Disetujui — ${activeTicket.id}
              </span>
              <span class="mobile-active-strip-badge" style="background: #10b981; color: #064e3b;">Disetujui</span>
            </div>
            <div class="mobile-active-strip-desc" style="color: #d1fae5;">
              ${activeTicket.category || 'Dinas Kantor'} — QR Siap Digunakan di Pos 1 — Jadwal Keluar ${activeTicket.plannedExit ? activeTicket.plannedExit.slice(11, 16) + ' WIB' : ''}
            </div>
          </div>
        `;
      } else if (activeTicket.status === 'Sedang di Luar') {
        activeStripHtml = `
          <div class="mobile-active-strip" style="background: rgba(2, 132, 199, 0.18); border: 1px solid rgba(2, 132, 199, 0.45);">
            <div class="mobile-active-strip-head">
              <span class="mobile-active-strip-title" style="color: #bae6fd;">
                <span class="pulsing-dot" style="display:inline-block; width:7px; height:7px; background:#38bdf8; border-radius:50%;"></span>
                Status: Izin Aktif — ${activeTicket.id}
              </span>
              <span class="mobile-active-strip-badge" style="background: #0284c7; color: #ffffff;">Sedang di Luar</span>
            </div>
            <div class="mobile-active-strip-desc" style="color: #e0f2fe;">
              ${activeTicket.category || 'Dinas Kantor'} — Scan Out ${activeTicket.scanOutTime ? activeTicket.scanOutTime.replace(/ \(Pos 1.*\)/, '').slice(11, 16) + ' WIB' : '10:05 WIB'} — Batas kembali ${activeTicket.type === 'Pulang Mendahului' ? 'Pulang Mendahului' : (getTReturnTime(activeTicket) ? getTReturnTime(activeTicket).slice(11, 16) + ' WIB' : '13.00 WIB')}
            </div>
          </div>
        `;
      } else if (activeTicket.status === 'Terlambat') {
        activeStripHtml = `
          <div class="mobile-active-strip" style="background: rgba(239, 68, 68, 0.22); border: 1px solid rgba(239, 68, 68, 0.5);">
            <div class="mobile-active-strip-head">
              <span class="mobile-active-strip-title" style="color: #fca5a5;">
                ⚠️ Status: Terlambat Kembali — ${activeTicket.id}
              </span>
              <span class="mobile-active-strip-badge" style="background: #dc2626; color: #ffffff;">Terlambat</span>
            </div>
            <div class="mobile-active-strip-desc" style="color: #fee2e2;">
              ${activeTicket.category} — Batas waktu TELAH TERLEWAT! Segera Tap In di Pos 1.
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

    let recentHtml = recentTickets.map(t => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
        <div>
          <div style="font-size: 0.8rem; font-weight: 800; color: #0f172a;">${t.id} <span class="mobile-badge ${getBadgeClass(t.status)}" style="margin-left: 4px;">${t.status}</span></div>
          <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">${t.category} • ${t.destination || 'Area Pabrik'}</div>
        </div>
        <button type="button" class="mobile-link-rincian" style="border:none; background:none;" onclick="window.mobileOpenTicketDetail('${t.id}')">Rincian →</button>
      </div>
    `).join('');

    container.innerHTML = `
      <!-- Hero Card Profile -->
      <section class="mobile-hero-card">
        <div class="mobile-hero-greeting-sub">Selamat ${timeGreeting},</div>
        <h2 class="mobile-hero-name">${emp.name} 👋</h2>
        <div class="mobile-hero-role">${emp.role || 'Staf Rekayasa Mesin'}</div>
        <div class="mobile-hero-meta">${emp.dept || 'Departemen Rekayasa & Pemeliharaan'}</div>
        <div class="mobile-hero-meta">Atasan: ${approver.name || 'Ir. Hendra Gunawan, M.T.'}</div>

        ${activeTicket ? `
          <button type="button" class="mobile-hero-btn" style="margin-top: 14px;" onclick="window.mobileSwitchTab('pengajuan')">
            <span>Pengajuan Saya →</span>
          </button>
        ` : `
          <button type="button" class="mobile-hero-btn" style="margin-top: 14px;" onclick="window.mobileOpenCreateModal(false)">
            <span>+ Buat Pengajuan</span>
          </button>
        `}
      </section>

      <!-- Segment Switcher: Ringkasan Perizinan | Total Pengajuan Izin (Grafik) -->
      <div class="mobile-segment-toggle" style="margin-bottom: 12px;">
        <button type="button" class="mobile-seg-btn ${currentSegment === 'ringkasan' ? 'active' : ''}" onclick="window.mobileSwitchSegment('ringkasan')">
          Ringkasan Perizinan
        </button>
        <button type="button" class="mobile-seg-btn ${currentSegment === 'donut' ? 'active' : ''}" onclick="window.mobileSwitchSegment('donut')">
          Total Pengajuan Izin
        </button>
      </div>

      <!-- Segment Content: 3-Col Stats Card -->
      <div id="mobileSecRingkasan" style="display: ${currentSegment === 'ringkasan' ? 'grid' : 'none'};" class="mobile-stats-card">
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

      <!-- Segment Content: Donut Chart -->
      <div id="mobileSecDonut" style="display: ${currentSegment === 'donut' ? 'block' : 'none'};" class="mobile-card">
        <div class="mobile-card-header">
          <h3 class="mobile-card-title">Total Pengajuan Izin</h3>
          <span style="font-size: 0.7rem; color: #64748b; font-weight: 700;">Bulan Ini</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-around; padding: 12px 0;">
          <svg width="110" height="110" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="45" fill="none" stroke="#e2e8f0" stroke-width="16" />
            <circle cx="60" cy="60" r="45" fill="none" stroke="#059669" stroke-width="16" stroke-dasharray="212 282" stroke-dashoffset="0" transform="rotate(-90 60 60)" />
            <circle cx="60" cy="60" r="45" fill="none" stroke="#0284c7" stroke-width="16" stroke-dasharray="35 282" stroke-dashoffset="-212" transform="rotate(-90 60 60)" />
            <circle cx="60" cy="60" r="45" fill="none" stroke="#f59e0b" stroke-width="16" stroke-dasharray="35 282" stroke-dashoffset="-247" transform="rotate(-90 60 60)" />
            <text x="60" y="56" text-anchor="middle" font-size="18" font-weight="800" fill="#0f172a">${totalCount}</text>
            <text x="60" y="72" text-anchor="middle" font-size="10" font-weight="700" fill="#64748b">TOTAL</text>
          </svg>
          <div style="font-size: 0.725rem; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #059669;"></span>
              <span><strong>${selesaiCount}</strong> Selesai (${totalCount ? Math.round((selesaiCount/totalCount)*100) : 0}%)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #0284c7;"></span>
              <span><strong>${activeCount}</strong> Sedang Aktif</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #f59e0b;"></span>
              <span><strong>${terlambatCount}</strong> Perlu Perhatian</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Card: Izin Aktif Saya (Live Card with Full PC Parity Action Buttons) -->
      ${renderActiveTicketCard(activeTicket)}

      <!-- Card: Pengajuan Terbaru -->
      <section class="mobile-card">
        <div class="mobile-card-header">
          <h3 class="mobile-card-title">Pengajuan Terbaru</h3>
        </div>
        ${recentHtml || '<p style="font-size: 0.75rem; color: #64748b; margin-top: 0;">Belum ada riwayat pengajuan.</p>'}
        <div style="text-align: center; margin-top: 10px;">
          <a href="#" class="mobile-link-rincian" onclick="window.mobileSwitchTab('riwayat'); return false;">Semua riwayat →</a>
        </div>
      </section>

      <!-- Card: Ketentuan Izin Keluar -->
      <section class="mobile-card" style="background: #f8fafc;">
        <h3 class="mobile-card-title" style="margin-bottom: 6px;">Ketentuan Izin Keluar</h3>
        <ul style="margin: 0; padding-left: 18px; font-size: 0.75rem; color: #475569; line-height: 1.45;">
          <li>Izin reguler memerlukan persetujuan Atasan. Maksimal satu tiket aktif.</li>
          <li>Tunjukkan QR kepada petugas satpam saat keluar dan kembali.</li>
          <li>Ajukan perpanjangan waktu sebelum batas jam kembali jika terjadi kendala dinas.</li>
        </ul>
      </section>

      <!-- Card: Kontak Pos Jaga 1 -->
      <section class="mobile-card">
        <div style="font-size: 0.75rem; font-weight: 800; color: #0f172a; margin-bottom: 4px;">Kontak Pos Jaga 1</div>
        <div style="font-size: 0.75rem; color: #334155; line-height: 1.35;">
          <strong>Petugas Pengamanan • 24 jam</strong><br>
          Ekstensi 110 / 0264 316 110<br>
          <span style="color: #64748b; font-size: 0.7rem;">Hubungi petugas jika terjadi kendala pemindaian QR di gerbang.</span>
        </div>
      </section>
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

    container.innerHTML = `
      <div class="mobile-page-header">
        <h1 class="mobile-page-title">Pengajuan Saya</h1>
      </div>

      <!-- Card Izin Aktif -->
      ${renderActiveTicketCard(activeTicket)}

      <!-- Card Informasi Pengajuan (Matching PDF Page 2) -->
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
          ${activeTicket && activeTicket.approverNote ? `
            <div style="background: #f1f5f9; padding: 8px 10px; border-radius: 8px; margin-top: 4px;">
              <span style="color: #475569; font-size: 0.7rem; font-weight: 700;">Catatan atasan:</span><br>
              <em style="color: #1e293b;">"${activeTicket.approverNote}"</em>
            </div>
          ` : ''}
        </div>
      </section>

      <!-- Card Kronologi Tercatat (Timeline matching PDF Page 2) -->
      <section class="mobile-card">
        <h3 class="mobile-card-title" style="margin-bottom: 12px;">Kronologi tercatat</h3>
        <div class="mobile-timeline">
          ${renderTimelineHtml(activeTicket)}
        </div>
      </section>
    `;
  }

  // -------------------------------------------------------------------
  // 4. RIWAYAT PENGAJUAN (Hal 3, 5, 6 - Card & List View Toggle)
  // -------------------------------------------------------------------
  let currentRiwayatView = 'card'; // 'card' | 'list'
  let isRiwayatFilterOpen = false;

  function renderRiwayat(container) {
    const emp = getActiveEmp();
    let tickets = getEmpTickets();

    if (riwayatStatusFilter !== 'all') {
      tickets = tickets.filter(t => {
        if (riwayatStatusFilter === 'Terlambat') {
          return t.status === 'Terlambat' || t.isLate || (t.approverNote && t.approverNote.toLowerCase().includes('terlambat'));
        }
        return t.status === riwayatStatusFilter;
      });
    }

    if (riwayatSearchQuery) {
      const q = riwayatSearchQuery.toLowerCase();
      tickets = tickets.filter(t =>
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.destination && t.destination.toLowerCase().includes(q)) ||
        (t.reason && t.reason.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.approverName && t.approverName.toLowerCase().includes(q))
      );
    }

    // Card View HTML (PDF Page 3 & 5)
    const cardsHtml = tickets.map(t => {
      const isOutside = (t.status === 'Sedang di Luar');
      const isLate = (t.status === 'Terlambat' || t.isLate);
      return `
        <div class="mobile-ticket-item" style="border-left: 3px solid ${t.status === 'Selesai' ? '#047857' : (t.status === 'Ditolak' ? '#dc2626' : (isOutside ? '#7c3aed' : '#f59e0b'))}; margin-bottom: 12px;">
          <div class="mobile-ticket-item-header">
            <div>
              <div style="font-family: monospace; font-size: 0.85rem; font-weight: 800; color: #0f172a;">${t.id}</div>
              <div style="font-size: 0.675rem; color: #64748b;">Diajukan ${t.createdAt ? t.createdAt.split(',')[0] : '19 Okt 2026'}</div>
            </div>
            <span class="mobile-badge ${getBadgeClass(t.status)}">${t.status}</span>
          </div>

          <div style="font-size: 0.725rem; color: #047857; font-weight: 700; margin-bottom: 2px;">${t.category} • ${getTType(t)}</div>
          <div style="font-size: 0.8rem; font-weight: 800; color: #1e293b; margin-bottom: 2px;">📍 ${t.destination || 'Area Rekayasa'}</div>
          <div style="font-size: 0.7rem; color: #64748b; margin-bottom: 6px;">${getTTransport(t)}</div>

          <div class="mobile-ticket-grid-meta" style="margin-bottom: 8px;">
            <div>
              <div class="mobile-meta-sub">Rencana waktu</div>
              <div class="mobile-meta-val">${formatTimeOnly(getTExitTime(t))} – ${formatTimeOnly(getTReturnTime(t)) || '13.00 WIB'}</div>
            </div>
            <div>
              <div class="mobile-meta-sub">Status info</div>
              <div class="mobile-meta-val" style="font-size: 0.7rem; color: ${isLate ? '#b91c1c' : '#047857'};">
                ${t.status === 'Selesai' ? 'Tepat waktu' : (isOutside ? 'QR tersedia' : t.status)}
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            ${(t.status === 'Sedang di Luar' || t.status === 'Disetujui') ? `
              <button type="button" class="mobile-btn-primary" style="padding: 5px 12px; font-size: 0.725rem; width: auto;" onclick="window.mobileOpenQrModal('${t.id}')">Buka QR Izin</button>
            ` : ''}
            <button type="button" class="mobile-btn-secondary" style="padding: 5px 12px; font-size: 0.725rem; width: auto;" onclick="window.mobileOpenTicketDetail('${t.id}')">Rincian</button>
          </div>
        </div>
      `;
    }).join('');

    // List View HTML (PDF Page 6)
    const listHtml = tickets.map(t => `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">
        <div style="flex: 1;">
          <div style="font-family: monospace; font-size: 0.8rem; font-weight: 800; color: #0f172a;">${t.id}</div>
          <div style="font-size: 0.675rem; color: #64748b;">Diajukan ${t.createdAt ? t.createdAt.split(',')[0] : '19 Okt 2026'}</div>
          <div style="font-size: 0.775rem; font-weight: 700; color: #1e293b; margin-top: 2px;">📍 ${t.destination || 'Area Rekayasa'}</div>
          <div style="font-size: 0.7rem; color: #047857;">${t.category} • ${getTType(t)}</div>
          <div style="font-size: 0.675rem; color: #64748b;">${formatTimeOnly(getTExitTime(t))} – ${formatTimeOnly(getTReturnTime(t)) || '13.00 WIB'}</div>
        </div>
        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
          <span class="mobile-badge ${getBadgeClass(t.status)}">${t.status}</span>
          <button type="button" class="mobile-link-rincian" style="border:none; background:none; font-size: 0.725rem; color: #2563eb;" onclick="window.mobileOpenTicketDetail('${t.id}')">Rincian</button>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="mobile-page-header">
        <h1 class="mobile-page-title">Riwayat Pengajuan</h1>
      </div>

      <!-- Filter Button Bar -->
      <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 10px;">
        <button type="button" class="mobile-filter-toggle-btn ${isRiwayatFilterOpen ? 'active' : ''}" onclick="window.mobileToggleRiwayatFilter()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          <span>${isRiwayatFilterOpen ? 'Tutup Filter' : 'Filter'}</span>
          ${(riwayatSearchQuery || riwayatStatusFilter !== 'all') ? '<span style="width: 6px; height: 6px; border-radius: 50%; background: #059669; display: inline-block;"></span>' : ''}
        </button>
      </div>

      <!-- Segment Toggle: Card | List (Matching PDF Page 3 & 6) -->
      <div class="mobile-segment-toggle" style="margin-bottom: 12px;">
        <button type="button" class="mobile-seg-btn ${currentRiwayatView === 'card' ? 'active' : ''}" onclick="window.mobileSwitchRiwayatView('card')">
          Card
        </button>
        <button type="button" class="mobile-seg-btn ${currentRiwayatView === 'list' ? 'active' : ''}" onclick="window.mobileSwitchRiwayatView('list')">
          List
        </button>
      </div>

      <!-- Collapsible Filter Card -->
      <div id="mRiwayatFilterCard" class="mobile-filter-panel" style="display: ${isRiwayatFilterOpen ? 'block' : 'none'};">
        <div class="mobile-filter-panel-title">
          <span>Cari & filter pengajuan</span>
          <button type="button" style="border:none; background:none; font-size:0.75rem; color:#64748b; cursor:pointer;" onclick="window.mobileToggleRiwayatFilter()">✕</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div>
            <label class="mobile-filter-label">Cari pengajuan</label>
            <input type="text" class="mobile-filter-input" id="mRiwayatSearchInput" placeholder="Cari tiket, alasan, atau tujuan..." value="${riwayatSearchQuery}">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <label class="mobile-filter-label">Status</label>
              <select class="mobile-filter-select" id="mRiwayatSelectStatus">
                <option value="all" ${riwayatStatusFilter === 'all' ? 'selected' : ''}>Semua Status</option>
                <option value="Sedang di Luar" ${riwayatStatusFilter === 'Sedang di Luar' ? 'selected' : ''}>Sedang di Luar</option>
                <option value="Disetujui" ${riwayatStatusFilter === 'Disetujui' ? 'selected' : ''}>Disetujui</option>
                <option value="Selesai" ${riwayatStatusFilter === 'Selesai' ? 'selected' : ''}>Selesai</option>
                <option value="Terlambat" ${riwayatStatusFilter === 'Terlambat' ? 'selected' : ''}>Terlambat</option>
                <option value="Ditolak" ${riwayatStatusFilter === 'Ditolak' ? 'selected' : ''}>Ditolak</option>
              </select>
            </div>
            <div>
              <label class="mobile-filter-label">Tanggal pengajuan</label>
              <input type="text" class="mobile-filter-input" placeholder="Semua Waktu" readonly style="color: #64748b;">
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <button type="button" class="mobile-btn-primary" style="flex: 2; padding: 7px 12px; font-size: 0.75rem;" onclick="window.mobileApplyRiwayatFilterKaryawan()">
              Terapkan Filter
            </button>
            <button type="button" class="mobile-btn-secondary" style="flex: 1; padding: 7px 12px; font-size: 0.75rem;" onclick="window.mobileResetRiwayatFilterKaryawan()">
              Reset
            </button>
          </div>
        </div>
      </div>

      <!-- Items Container (Card View or List View) -->
      ${currentRiwayatView === 'card' ? `
        <div>${cardsHtml || '<div class="mobile-card" style="text-align: center; color: #64748b; font-size: 0.8rem; padding: 24px;">Tidak ada pengajuan yang sesuai dengan filter.</div>'}</div>
      ` : `
        <div class="mobile-card" style="padding: 4px 10px;">
          ${listHtml || '<div style="text-align: center; color: #64748b; font-size: 0.8rem; padding: 20px;">Tidak ada pengajuan.</div>'}
        </div>
      `}

      <!-- Pagination (Matching PDF Page 3 & 6) -->
      <div style="display: flex; justify-content: center; gap: 6px; margin: 16px 0;">
        <span style="display: inline-flex; width: 32px; height: 32px; border-radius: 8px; background: #2563eb; color: #fff; font-size: 0.75rem; font-weight: 800; align-items: center; justify-content: center;">1</span>
        <span style="display: inline-flex; width: 32px; height: 32px; border-radius: 8px; background: #f1f5f9; color: #64748b; font-size: 0.75rem; font-weight: 700; align-items: center; justify-content: center; cursor: pointer;">2</span>
      </div>
    `;
  }

  // Riwayat View & Filter Helpers
  window.mobileSwitchRiwayatView = function (v) {
    currentRiwayatView = v;
    renderMobileKaryawan(null, 'riwayat');
  };

  window.mobileToggleRiwayatFilter = function () {
    isRiwayatFilterOpen = !isRiwayatFilterOpen;
    renderMobileKaryawan(null, 'riwayat');
  };

  window.mobileApplyRiwayatFilterKaryawan = function () {
    const searchEl = document.getElementById('mRiwayatSearchInput');
    const statusEl = document.getElementById('mRiwayatSelectStatus');
    if (searchEl) riwayatSearchQuery = searchEl.value.trim();
    if (statusEl) riwayatStatusFilter = statusEl.value;
    renderMobileKaryawan(null, 'riwayat');
  };

  window.mobileResetRiwayatFilterKaryawan = function () {
    riwayatSearchQuery = '';
    riwayatStatusFilter = 'all';
    renderMobileKaryawan(null, 'riwayat');
  };

  // -------------------------------------------------------------------
  // 5. HELPER RENDERING: ACTIVE TICKET CARD (EXACT PC PARITY)
  // -------------------------------------------------------------------
  function renderActiveTicketCard(t) {
    if (!t) {
      return `
        <section class="mobile-card" style="text-align: center; padding: 22px 16px;">
          <div style="font-size: 1.6rem; margin-bottom: 6px;">📋</div>
          <div style="font-size: 0.9rem; font-weight: 800; color: #0f172a;">Tidak Ada Izin Aktif</div>
          <div style="font-size: 0.775rem; color: #64748b; margin-top: 4px; line-height: 1.4;">
            Anda belum mengajukan izin keluar area atau izin sebelumnya telah selesai.
          </div>
          <button type="button" class="mobile-btn-primary" style="margin-top: 14px; width: 100%; font-weight: 700; background: #059669; border-color: #059669;" onclick="window.mobileOpenCreateModal(false)">
            <span>+ Ajukan Izin Keluar</span>
          </button>
          <button type="button" class="mobile-btn-secondary" style="margin-top: 8px; width: 100%; font-weight: 700;" onclick="window.mobileSwitchSegment('donut')">
            <span>📊 Lihat Grafik Pengajuan Izin</span>
          </button>
        </section>
      `;
    }

    const isPending = (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat');
    const isApproved = (t.status === 'Disetujui');
    const isOutside = (t.status === 'Sedang di Luar' || t.status === 'Terlambat');
    const isEmergency = Boolean(t.isEmergency || (t.id && t.id.includes('-EMG-')) || t.status === 'Menunggu Otorisasi Darurat');

    const col1Label = (isOutside && t.scanOutTime) ? 'Scan Out • Pos 1' : 'Jadwal Keluar';
    const col1Val = (isOutside && t.scanOutTime)
      ? t.scanOutTime.replace(/ \(Pos 1.*\)/, '').slice(11, 16) + ' WIB'
      : (t.plannedExit ? formatDisplayDate(t.plannedExit) : '-');

    const isPulang = (t.type === 'Pulang Mendahului' || t.returnType === 'Pulang Mendahului');
    const col2Label = isPulang ? 'Tipe Kepulangan' : 'Batas Jam Kembali';
    const col2Val = isPulang
      ? 'Pulang Mendahului'
      : (getTReturnTime(t) ? formatDisplayDate(getTReturnTime(t)) : '-');

    let actionButtonsHtml = '';
    if (isPending) {
      actionButtonsHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px;">
          <button type="button" class="mobile-btn-secondary" style="font-weight: 700; padding: 10px; font-size: 0.8rem;" onclick="window.mobileOpenEditSheet('${t.id}')">
            <span>✏️ Edit Pengajuan</span>
          </button>
          <button type="button" class="mobile-btn-danger" style="background:#ffffff; color:#dc2626; border-color:#fca5a5; font-weight: 700; padding: 10px; font-size: 0.8rem;" onclick="window.mobileOpenCancelSheet('${t.id}')">
            <span>✕ Batalkan Izin</span>
          </button>
        </div>
        <div style="text-align: center; margin-top: 8px;">
          <a href="#" class="mobile-link-rincian" onclick="window.mobileOpenTicketDetail('${t.id}'); return false;">Detail pengajuan →</a>
        </div>
      `;
    } else if (isApproved) {
      actionButtonsHtml = `
        <div class="mobile-btn-group-stacked" style="margin-top: 12px;">
          <button type="button" class="mobile-btn-primary" style="background: #059669; border-color: #059669; font-weight: 700;" onclick="window.mobileOpenQrModal('${t.id}')">
            <span>📱 Buka QR Izin</span>
          </button>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button type="button" class="mobile-btn-secondary" style="font-weight: 600;" onclick="window.mobileOpenTicketDetail('${t.id}')">
              <span>Detail pengajuan</span>
            </button>
            <button type="button" class="mobile-btn-danger" style="background:#ffffff; color:#dc2626; border-color:#fca5a5; font-weight: 600;" onclick="window.mobileOpenCancelSheet('${t.id}')">
              <span>Batalkan</span>
            </button>
          </div>
        </div>
      `;
    } else if (isOutside) {
      const hasUsedExt = t.extensionApproved || (t.extensionCount && t.extensionCount >= 1);
      actionButtonsHtml = `
        <div class="mobile-btn-group-stacked" style="margin-top: 12px;">
          <button type="button" class="mobile-btn-primary" style="background: #059669; border-color: #059669; font-weight: 700;" onclick="window.mobileOpenQrModal('${t.id}')">
            <span>📱 Buka QR Izin (${t.status === 'Terlambat' ? 'Terlambat' : 'Masuk'})</span>
          </button>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            ${hasUsedExt ? `
              <button type="button" class="mobile-btn-secondary" disabled style="opacity: 0.6; cursor: not-allowed; font-size: 0.7rem;" title="Perpanjangan waktu hanya dapat diajukan maksimal 1 kali">
                <span>Perpanjangan Digunakan</span>
              </button>
            ` : `
              <button type="button" class="mobile-btn-secondary" style="font-weight: 600;" onclick="window.mobileOpenPerpanjanganModal('${t.id}')">
                <span>⏱️ Perpanjangan</span>
              </button>
            `}
            <button type="button" class="mobile-btn-secondary" style="font-weight: 600;" onclick="window.mobileOpenTicketDetail('${t.id}')">
              <span>Detail</span>
            </button>
          </div>
        </div>
      `;
    }

    return `
      <section class="mobile-card" style="border-left: 4px solid ${isPending ? '#f59e0b' : (isApproved ? '#059669' : (t.status === 'Terlambat' ? '#dc2626' : '#0284c7'))};">
        <div class="mobile-card-header">
          <div>
            <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase;">
              IZIN AKTIF SAYA ${isEmergency ? '<span style="color:#b91c1c; margin-left:4px;">[DARURAT]</span>' : ''}
            </div>
            <h3 class="mobile-card-title" style="font-family: monospace; font-size: 1.05rem;">${t.id}</h3>
          </div>
          <span class="mobile-badge ${getBadgeClass(t.status)}">${t.status}</span>
        </div>

        <div style="font-size: 0.775rem; color: #059669; font-weight: 700;">${t.category} • ${getTType(t)}</div>
        <div style="font-size: 0.85rem; font-weight: 800; color: #0f172a; margin: 3px 0 2px 0;">📍 ${t.destination || 'Area Cikampek'}</div>
        <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 8px; font-style: italic;">"${t.reason || 'Keperluan dinas kantor'}"</div>

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
    const isScanOut = t.status === 'Sedang di Luar' || t.status === 'Selesai' || t.status === 'Terlambat';
    const isScanIn = t.status === 'Selesai';

    return `
      <div class="mobile-timeline-item">
        <div class="mobile-timeline-track">
          <div class="mobile-timeline-dot done"></div>
          <div class="mobile-timeline-line"></div>
        </div>
        <div class="mobile-timeline-content">
          <div class="mobile-timeline-time">${t.createdAt ? t.createdAt.slice(11, 16) + ' WIB' : '09.20 WIB'}</div>
          <div class="mobile-timeline-title">Pengajuan Dibuat</div>
          <div class="mobile-timeline-desc">${t.category} • ${t.returnType || 'Kembali ke Area'}</div>
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

      <div class="mobile-timeline-item">
        <div class="mobile-timeline-track">
          <div class="mobile-timeline-dot ${isScanOut ? 'done' : (isApproved ? 'active' : '')}"></div>
          <div class="mobile-timeline-line"></div>
        </div>
        <div class="mobile-timeline-content">
          <div class="mobile-timeline-time">${t.scanOutTime ? t.scanOutTime.slice(11, 16) + ' WIB' : 'Menunggu Keluar'}</div>
          <div class="mobile-timeline-title">${isScanOut ? 'Scan Out Tercatat' : 'Verifikasi Gerbang Keluar'}</div>
          <div class="mobile-timeline-desc">${isScanOut ? (t.scanOutGate || 'Pos 1') + ' • Karyawan meninggalkan area' : 'Tunjukkan QR di pos jaga'}</div>
        </div>
      </div>

      <div class="mobile-timeline-item">
        <div class="mobile-timeline-track">
          <div class="mobile-timeline-dot ${isScanIn ? 'done' : ''}"></div>
        </div>
        <div class="mobile-timeline-content">
          <div class="mobile-timeline-time">${t.scanInTime ? t.scanInTime.slice(11, 16) + ' WIB' : 'Menunggu Kembali'}</div>
          <div class="mobile-timeline-title">${isScanIn ? 'Scan In Tercatat' : 'Verifikasi Gerbang Kembali'}</div>
          <div class="mobile-timeline-desc">${isScanIn ? (t.scanInGate || 'Pos 1') + ' • Karyawan telah kembali. Tiket Selesai.' : 'Belum kembali ke area pabrik'}</div>
        </div>
      </div>
    `;
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
        <div style="text-align: center; padding: 6px 0 16px 0;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: #fef3c7; border: 2px solid #fde68a; color: #b45309; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 1.5rem;">
            ⚠️
          </div>
          <h4 style="font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">
            Anda Masih Memiliki Izin Aktif
          </h4>
          <p style="font-size: 0.8rem; color: #475569; margin: 0; line-height: 1.45;">
            Tiket <strong>${activeTicket.id}</strong> saat ini masih berstatus <span class="mobile-badge ${getBadgeClass(activeTicket.status)}">${activeTicket.status}</span>.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-top: 14px; text-align: left; font-size: 0.75rem;">
            <strong style="color: #0f172a;">Kebijakan Sistem:</strong>
            <p style="color: #64748b; margin: 4px 0 0 0; line-height: 1.4;">
              Karyawan tidak diperkenankan mengajukan izin baru sebelum tiket aktif saat ini diselesaikan, dibatalkan mandiri, atau ditolak oleh Atasan.
            </p>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${(activeTicket.status === 'Disetujui' || activeTicket.status === 'Sedang di Luar') ? `
            <button type="button" class="mobile-btn-primary" onclick="window.mobileCloseSheet(); window.mobileOpenQrModal('${activeTicket.id}')">
              Buka QR Izin Aktif Ini
            </button>
          ` : ''}
          ${activeTicket.status === 'Menunggu Persetujuan' ? `
            <button type="button" class="mobile-btn-secondary" onclick="window.mobileCloseSheet(); window.mobileOpenEditSheet('${activeTicket.id}')">
              ✏️ Edit Pengajuan Ini
            </button>
            <button type="button" class="mobile-btn-danger" style="background:#fff1f2; color:#be123c; border:1px solid #fecdd3;" onclick="window.mobileCloseSheet(); window.mobileOpenCancelSheet('${activeTicket.id}')">
              ✕ Batalkan Izin Ini
            </button>
          ` : ''}
          <button type="button" class="mobile-btn-secondary" onclick="window.mobileCloseSheet()">
            Tutup
          </button>
        </div>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  window.mobileOpenCreateModal = function (isEmergency, prefillData) {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;

    // Option C Check from PC
    const activeTicket = getActiveTicket();
    if (!isEmergency && activeTicket && !prefillData && !window.editingTicketId) {
      window.mobileOpenActiveBlockedSheet(activeTicket);
      return;
    }

    const isEditing = Boolean(window.editingTicketId);
    const now = new Date();
    const defaultExit = prefillData?.plannedExit || formatDateTimeLocal(new Date(now.getTime() + 5 * 60000));
    const defaultReturn = prefillData?.estimatedReturn || formatDateTimeLocal(new Date(now.getTime() + 2 * 60 * 60000));

    // Approver resolution
    const approvers = getMobileApprovers();
    if (prefillData?.approverName || prefillData?.approver) {
      const apprName = prefillData.approverName || prefillData.approver;
      selectedApproverData = approvers.find(a => a.name === apprName) || { name: apprName, title: 'Atasan Peninjau', initials: 'AP' };
    } else {
      selectedApproverData = approvers[0];
    }

    const initialCat = prefillData?.category || '';
    const initialType = prefillData?.type || prefillData?.returnType || '';
    const initialDest = prefillData?.destination || '';
    const initialReason = prefillData?.reason || '';

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="padding: 14px 18px 10px 18px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.25;">
            ${isEditing ? `Edit Pengajuan Izin — ${window.editingTicketId}` : (isEmergency ? 'Formulir Izin Darurat / Bypass' : 'Formulir Pengajuan Izin Keluar')}
          </h3>
          <p style="font-size: 0.775rem; color: #64748b; margin: 3px 0 0 0;">
            ${isEditing ? 'Perbarui data formulir izin keluar Anda sebelum disetujui Atasan' : (isEmergency ? 'Penerbitan izin darurat untuk evakuasi/keadaan mendesak' : 'Lengkapi detail perizinan Anda di bawah ini')}
          </p>
        </div>
        <button type="button" class="mobile-sheet-close" onclick="window.mobileCloseSheet()" title="Tutup">✕</button>
      </div>

      <div class="mobile-sheet-body">
        ${isEmergency ? `
          <div class="mobile-emergency-banner" style="margin-bottom: 14px;">
            <div class="mobile-emergency-banner-title">🚨 PERHATIAN: IZIN DARURAT / BYPASS</div>
            <div class="mobile-emergency-banner-desc">Gunakan hanya untuk evakuasi atau keadaan darurat medis/teknis. Data wajib diisi lengkap.</div>
          </div>
        ` : ''}

        <form id="mobileCreatePermitForm" onsubmit="window.mobileSubmitPermitForm(event, ${!!isEmergency})">
          <!-- 1. Pilih Atasan Langsung (Searchable Combobox) -->
          <div class="mobile-form-group" style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label class="mobile-form-label" style="margin: 0;">Pilih Atasan Langsung <span class="req">*</span></label>
              <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.675rem; font-weight: 700; color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 999px; padding: 2px 8px;">
                🔍 Ketik / cari nama atasan anda
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
                  Ganti
                </button>
              </div>

              <div class="mobile-approver-input-box" id="mApproverInputBox" style="display: ${selectedApproverData ? 'none' : 'flex'};">
                <span style="color: #64748b; font-size: 0.85rem;">🔍</span>
                <input type="text" id="mSearchApproverInput" class="mobile-approver-search-input" placeholder="Ketik/cari nama atasan anda..." autocomplete="off" oninput="window.mobileFilterApprovers(this.value)" onclick="window.mobileShowApproverDropdown()">
                <button type="button" id="mBtnClearApprover" style="display:none; background:none; border:none; color:#64748b; font-size:12px; cursor:pointer;" onclick="window.mobileClearApproverSearch()">✕</button>
                <button type="button" style="background:none; border:none; color:#64748b; font-size:11px; cursor:pointer;" onclick="window.mobileToggleApproverDropdown()">▼</button>
              </div>

              <div class="mobile-approver-dropdown" id="mApproverDropdown" style="display: none;"></div>
              <input type="hidden" id="mFormApproverValue" value="${selectedApproverData ? selectedApproverData.name : ''}" required>
            </div>
          </div>

          <!-- 2. Kategori Keperluan & Tipe Kepulangan (Side-by-side Dropdowns) -->
          <div class="mobile-form-grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div class="mobile-form-group" style="margin: 0;">
              <label class="mobile-form-label">Kategori Keperluan <span class="req">*</span></label>
              <select class="mobile-select" id="mFormCategory" required onchange="window.mobileHandleCategoryChange(this.value)">
                <option value="">-- Pilih Kategori --</option>
                <option value="Dinas Kantor" ${initialCat === 'Dinas Kantor' ? 'selected' : ''}>Dinas Kantor</option>
                <option value="Urusan Pribadi" ${initialCat === 'Urusan Pribadi' ? 'selected' : ''}>Urusan Pribadi</option>
              </select>
            </div>

            <div class="mobile-form-group" style="margin: 0;">
              <label class="mobile-form-label">Tipe Kepulangan <span class="req">*</span></label>
              <select class="mobile-select" id="mFormReturnType" required onchange="window.mobileToggleReturnType(this.value)">
                <option value="">-- Pilih Tipe Kepulangan --</option>
                <option value="Kembali ke Area" ${initialType === 'Kembali ke Area' ? 'selected' : ''}>Kembali ke Area</option>
                <option value="Pulang Mendahului" ${initialType === 'Pulang Mendahului' ? 'selected' : ''}>Pulang Mendahului (Tidak Kembali)</option>
              </select>
            </div>
          </div>

          <!-- 3. Lokasi / Tujuan Keluar -->
          <div class="mobile-form-group" style="margin-bottom: 12px;">
            <label class="mobile-form-label">Lokasi / Tujuan Keluar <span class="req">*</span></label>
            <input type="text" class="mobile-input" id="mFormDestination" placeholder="PT Rekayasa Industri, Cikampek" value="${initialDest}" required>
          </div>

          <!-- 4. Alasan Keperluan Izin -->
          <div class="mobile-form-group" style="margin-bottom: 12px;">
            <label class="mobile-form-label">Alasan Keperluan Izin <span class="req">*</span></label>
            <textarea class="mobile-textarea" id="mFormReason" placeholder="Koordinasi teknis dan pemeriksaan komponen pompa P-204 bersama vendor pemeliharaan." required style="min-height: 65px;">${initialReason}</textarea>
          </div>

          <!-- 5. Rencana Waktu Keluar & Perkiraan Waktu Kembali -->
          <div class="mobile-form-grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 6px;">
            <div class="mobile-form-group" style="margin: 0;">
              <label class="mobile-form-label">Rencana Waktu Keluar <span class="req">*</span></label>
              <input type="datetime-local" class="mobile-input" id="mFormPlannedExit" min="${formatDateTimeLocal(now)}" ${initialCat === 'Urusan Pribadi' ? `max="${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T23:59"` : ''} value="${defaultExit}" required onchange="window.mobileHandleExitChange(this.value)">
            </div>
            <div class="mobile-form-group" id="mFormWrapReturn" style="margin: 0; display: ${initialType === 'Pulang Mendahului' ? 'none' : 'block'};">
              <label class="mobile-form-label">Perkiraan Waktu Kembali <span class="req">*</span></label>
              <input type="datetime-local" class="mobile-input" id="mFormEstimatedReturn" min="${formatDateTimeLocal(now)}" ${initialCat === 'Urusan Pribadi' ? `max="${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T23:59"` : ''} value="${defaultReturn}" ${initialType === 'Pulang Mendahului' ? '' : 'required'}>
            </div>
          </div>

          <div style="font-size: 0.725rem; color: #64748b; margin-bottom: 18px; line-height: 1.4;">
            * Wajib diisi. Waktu kembali wajib jika memilih Kembali ke Area. Seluruh waktu dalam WIB.
          </div>

          <!-- Footer Actions (Batal & Lanjutkan Konfirmasi) -->
          <div style="display: flex; justify-content: flex-end; gap: 10px; padding-top: 14px; margin-top: 14px; border-top: 1px solid #f1f5f9;">
            <button type="button" class="mobile-btn-secondary" style="width: auto; padding: 10px 20px; font-weight: 600;" onclick="window.mobileCloseSheet()">
              Batal
            </button>
            <button type="submit" class="mobile-btn-primary" style="width: auto; padding: 10px 24px; font-weight: 700; background: #059669; border-color: #059669; display: inline-flex; align-items: center; gap: 6px;">
              <span>${isEditing ? 'Lanjutkan & Simpan Perubahan' : 'Lanjutkan Konfirmasi'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </form>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  // Open Edit Sheet
  window.mobileOpenEditSheet = function (ticketId) {
    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;
    window.editingTicketId = ticketId;
    window.mobileOpenCreateModal(t.isEmergency, {
      approver: t.approverName,
      category: t.category,
      type: t.type || t.returnType,
      destination: t.destination,
      reason: t.reason,
      plannedExit: t.plannedExit,
      estimatedReturn: t.estimatedReturn
    });
  };

  // Open Cancel Sheet
  window.mobileOpenCancelSheet = function (ticketId) {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;

    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="border-bottom: 1px solid #fee2e2;">
        <div>
          <h3 style="font-size: 1.1rem; font-weight: 800; color: #b91c1c; margin: 0;">Batalkan Pengajuan Izin</h3>
          <p style="font-size: 0.75rem; color: #64748b; margin: 2px 0 0 0;">Tiket ${t.id}</p>
        </div>
        <button type="button" class="mobile-sheet-close" onclick="window.mobileCloseSheet()">✕</button>
      </div>

      <div class="mobile-sheet-body">
        <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 12px; margin-bottom: 14px;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #9f1239; margin-bottom: 4px;">Konfirmasi Pembatalan</div>
          <div style="font-size: 0.75rem; color: #475569; line-height: 1.4;">
            Apakah Anda yakin ingin membatalkan permohonan izin <strong>${t.category}</strong> ke <strong>${t.destination}</strong>?
            Setelah dibatalkan, sistem akan mengizinkan Anda membuat pengajuan baru.
          </div>
        </div>

        <div class="mobile-form-group">
          <label class="mobile-form-label">Alasan Pembatalan <span class="req">*</span></label>
          <textarea class="mobile-textarea" id="mCancelReason" placeholder="Masukkan alasan pembatalan tiket ini (misal: agenda dibatalkan oleh pihak klien)..." style="min-height: 75px;"></textarea>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 18px; padding-top: 12px; border-top: 1px solid #f1f5f9;">
          <button type="button" class="mobile-btn-secondary" style="flex: 1; padding: 11px; font-weight: 600;" onclick="window.mobileCloseSheet()">
            Tutup
          </button>
          <button type="button" class="mobile-btn-danger" style="flex: 2; padding: 11px; font-weight: 700; background: #dc2626; border-color: #dc2626; color: #ffffff;" onclick="window.mobileConfirmCancelTicket('${t.id}')">
            <span>Ya, Batalkan Izin</span>
          </button>
        </div>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  window.mobileConfirmCancelTicket = function (ticketId) {
    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;

    const reason = (document.getElementById('mCancelReason')?.value || '').trim() || 'Dibatalkan mandiri oleh pemohon.';
    const emp = getActiveEmp();
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

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

    window.mobileCloseSheet();

    if (typeof window.showToast === 'function') {
      window.showToast(`Tiket #${ticketId} berhasil dibatalkan. Anda kini dapat mengajukan izin baru.`, 'success');
    }

    renderMobileKaryawan(null, currentKaryawanTab);
    if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
    if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
    if (typeof window.renderApproverView === 'function') window.renderApproverView();
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
    if (btnClear) btnClear.style.display = query ? 'block' : 'none';

    const q = (query || '').toLowerCase().trim();
    const approvers = getMobileApprovers();
    const filtered = approvers.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.title && a.title.toLowerCase().includes(q)) ||
      (a.department && a.department.toLowerCase().includes(q)) ||
      (a.nip && a.nip.toLowerCase().includes(q))
    );

    if (filtered.length === 0) {
      dd.innerHTML = `<div style="padding: 14px; text-align: center; color: #64748b; font-size: 0.775rem;">Atasan "${query}" tidak ditemukan</div>`;
      return;
    }

    dd.innerHTML = filtered.map(a => `
      <div class="mobile-approver-item" onclick="window.mobileSelectApprover('${a.name.replace(/'/g, "\\'")}', '${(a.title || '').replace(/'/g, "\\'")}', '${(a.initials || 'HG')}')">
        <div class="mobile-approver-item-avatar" style="background: ${a.avatarBg || 'linear-gradient(135deg, #059669 0%, #0d9488 100%)'};">
          ${a.initials || 'HG'}
        </div>
        <div class="mobile-approver-item-info">
          <div class="mobile-approver-item-name">${a.name}</div>
          <div class="mobile-approver-item-role">${a.title || 'Manajer'} • ${a.department || 'Rekayasa'}</div>
        </div>
        <span style="color: #059669; font-size: 0.75rem; font-weight: 700;">Pilih →</span>
      </div>
    `).join('');
  };

  window.mobileSelectApprover = function (name, title, initials) {
    selectedApproverData = { name, title, initials };
    const hiddenInput = document.getElementById('mFormApproverValue');
    const card = document.getElementById('mApproverSelectedCard');
    const inputBox = document.getElementById('mApproverInputBox');
    const dd = document.getElementById('mApproverDropdown');
    const nameEl = document.getElementById('mSelectedName');
    const titleEl = document.getElementById('mSelectedTitle');
    const avatarEl = document.getElementById('mSelectedAvatar');

    if (hiddenInput) hiddenInput.value = name;
    if (nameEl) nameEl.textContent = name;
    if (titleEl) titleEl.textContent = title;
    if (avatarEl) avatarEl.textContent = initials;

    if (dd) dd.style.display = 'none';
    if (inputBox) inputBox.style.display = 'none';
    if (card) card.style.display = 'flex';
  };

  window.mobileChangeApprover = function () {
    selectedApproverData = null;
    const hiddenInput = document.getElementById('mFormApproverValue');
    const card = document.getElementById('mApproverSelectedCard');
    const inputBox = document.getElementById('mApproverInputBox');
    const input = document.getElementById('mSearchApproverInput');

    if (hiddenInput) hiddenInput.value = '';
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
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const todayEnd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T23:59`;

    if (val === 'Urusan Pribadi') {
      if (exitInput) exitInput.max = todayEnd;
      if (retInput) retInput.max = todayEnd;
    } else {
      if (exitInput) exitInput.removeAttribute('max');
      if (retInput) retInput.removeAttribute('max');
    }
  };

  window.mobileHandleExitChange = function (val) {
    const retInput = document.getElementById('mFormEstimatedReturn');
    if (retInput && val) {
      retInput.min = val;
      if (retInput.value && retInput.value <= val) {
        const exitDt = new Date(val);
        retInput.value = formatDateTimeLocal(new Date(exitDt.getTime() + 60 * 60000));
      }
    }
  };

  // Form Submit Handler -> Validates & Opens Step 2 Confirmation Summary
  window.mobileSubmitPermitForm = function (e, isEmergency) {
    e.preventDefault();
    const approverName = document.getElementById('mFormApproverValue')?.value || '';
    const category = document.getElementById('mFormCategory')?.value || '';
    const returnType = document.getElementById('mFormReturnType')?.value || '';
    const destination = (document.getElementById('mFormDestination')?.value || '').trim();
    const reason = (document.getElementById('mFormReason')?.value || '').trim();
    const plannedExit = document.getElementById('mFormPlannedExit')?.value || '';
    const estimatedReturn = returnType === 'Pulang Mendahului' ? null : (document.getElementById('mFormEstimatedReturn')?.value || '');

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

    // 5. Planned exit check
    if (!plannedExit) {
      if (typeof window.showToast === 'function') window.showToast('Harap isi rencana waktu keluar!', 'warning');
      document.getElementById('mFormPlannedExit')?.focus();
      return;
    }

    const now = new Date();
    const oneMinAgo = new Date(now.getTime() - 60000);
    if (new Date(plannedExit) < oneMinAgo) {
      if (typeof window.showToast === 'function') window.showToast('Hari atau tanggal sebelumnya tidak dapat dipilih sebagai rencana waktu keluar!', 'danger');
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
    }

    // Save pending form data for Step 2 Confirmation
    pendingMobileFormData = {
      approverName,
      category,
      returnType,
      type: returnType,
      destination,
      reason,
      plannedExit,
      estimatedReturn,
      isEmergency: !!isEmergency,
      isEditing: Boolean(window.editingTicketId),
      editingTicketId: window.editingTicketId
    };

    // Open Step 2: Konfirmasi Ringkasan Pengajuan
    window.mobileOpenConfirmSummarySheet();
  };

  // -------------------------------------------------------------------
  // 7. STEP 2: KONFIRMASI RINGKASAN PENGAJUAN (EXACT PC MODAL 2)
  // -------------------------------------------------------------------
  window.mobileOpenConfirmSummarySheet = function () {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop || !pendingMobileFormData) return;

    const emp = getActiveEmp();
    const data = pendingMobileFormData;
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
          <div class="mobile-summary-row">
            <span class="mobile-summary-label">Tipe Kepulangan</span>
            <span class="mobile-summary-value">${data.returnType}</span>
          </div>
          <div class="mobile-summary-row">
            <span class="mobile-summary-label">Lokasi / Tujuan</span>
            <span class="mobile-summary-value">${data.destination}</span>
          </div>
          <div class="mobile-summary-row">
            <span class="mobile-summary-label">Alasan Keperluan</span>
            <span class="mobile-summary-value" style="font-style: italic; color: #334155;">"${data.reason}"</span>
          </div>
          <div class="mobile-summary-row">
            <span class="mobile-summary-label">Rencana Keluar</span>
            <span class="mobile-summary-value">${formatDisplayDate(data.plannedExit)}</span>
          </div>
          ${data.returnType === 'Kembali ke Area' ? `
            <div class="mobile-summary-row">
              <span class="mobile-summary-label">Perkiraan Kembali</span>
              <span class="mobile-summary-value" style="color: #059669; font-weight: 700;">${formatDisplayDate(data.estimatedReturn)}</span>
            </div>
          ` : `
            <div class="mobile-summary-row">
              <span class="mobile-summary-label">Perkiraan Kembali</span>
              <span class="mobile-summary-value" style="color: #64748b;">Pulang Mendahului (Tidak Kembali)</span>
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
            <span>${isEditing ? 'Simpan Perubahan' : (data.isEmergency ? '🚨 Terbitkan QR Darurat' : 'Kirim Pengajuan Izin')}</span>
          </button>
        </div>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  window.mobileBackToCreateModal = function () {
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
      estimatedReturn: data.estimatedReturn
    });
  };

  // -------------------------------------------------------------------
  // 8. EXECUTE SAVE / UPDATE PERMIT (100% PARITY DENGAN PC MODAL 2 SUBMISSION)
  // -------------------------------------------------------------------
  window.mobileExecuteSubmitPermit = function () {
    if (!pendingMobileFormData) return;
    const data = pendingMobileFormData;
    const emp = getActiveEmp();
    const tickets = window.ticketsList || [];

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateCode = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

    // CASE 1: UPDATE EXISTING TICKET (EDIT MODE)
    if (data.isEditing && data.editingTicketId) {
      const ticketId = data.editingTicketId;
      const t = tickets.find(x => x.id === ticketId);
      if (t) {
        t.approverName = data.approverName;
        t.category = data.category;
        t.type = data.returnType;
        t.returnType = data.returnType;
        t.destination = data.destination;
        t.reason = data.reason;
        t.plannedExit = data.plannedExit;
        t.estimatedReturn = data.returnType === 'Pulang Mendahului' ? null : data.estimatedReturn;
        t.plannedReturn = data.returnType === 'Pulang Mendahului' ? null : data.estimatedReturn;

        if (!t.timeline) t.timeline = [];
        t.timeline.unshift({
          event: 'Pengajuan Diperbarui (Diedit)',
          time: nowFormatted,
          by: `${emp.name} (Karyawan)`,
          desc: `Data pengajuan izin diperbarui sebelum persetujuan Atasan (${t.approverName}).`
        });

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
          window.showToast(`Pengajuan #${ticketId} berhasil diperbarui!`, 'success');
        }

        renderMobileKaryawan(null, currentKaryawanTab);
        if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
        if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
        if (typeof window.renderApproverView === 'function') window.renderApproverView();
        return;
      }
    }

    // CASE 2: CREATE NEW TICKET (PARITY DENGAN PC MODAL 1 & 2)
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newId = (data.isEmergency ? 'TK-EMG-' : 'TK-') + dateCode + '-' + randomSuffix;

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
      status: data.isEmergency ? 'Menunggu Otorisasi Darurat' : 'Menunggu Persetujuan',
      isEmergency: !!data.isEmergency,
      emergencyLocked: !!data.isEmergency,
      qrLocked: !!data.isEmergency,
      createdAt: nowFormatted,
      timeline: [
        {
          event: data.isEmergency ? 'Pengajuan Izin Darurat Dibuat' : 'Pengajuan Dibuat',
          time: nowFormatted,
          by: `${emp.name} (Karyawan)`,
          desc: data.isEmergency
            ? 'Izin darurat dibuat via sistem bypass, menunggu otorisasi sandi/wajah.'
            : `Pengajuan tiket izin keluar area berhasil dikirim ke antrean Atasan (${data.approverName}).`
        }
      ]
    };

    tickets.unshift(newTicket);

    if (typeof window.saveTickets === 'function') {
      window.saveTickets(tickets);
    } else {
      localStorage.setItem('kujang_tickets', JSON.stringify(tickets));
      window.ticketsList = tickets;
    }

    pendingMobileFormData = null;
    window.editingTicketId = null;

    window.mobileCloseSheet();

    if (typeof window.showToast === 'function') {
      window.showToast(`Tiket #${newId} berhasil diajukan! Sistem kini mengunci pengajuan baru hingga tiket ini diproses.`, 'success');
    }

    renderMobileKaryawan(null, currentKaryawanTab);
    if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
    if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
    if (typeof window.renderApproverView === 'function') window.renderApproverView();
  };

  // -------------------------------------------------------------------
  // 9. QR MODAL, DETAIL TIKET, DAN PERPANJANGAN WAKTU
  // -------------------------------------------------------------------
  window.mobileOpenQrModal = function (ticketId) {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;

    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId) || getActiveTicket();
    if (!t) return;

    const isOutside = (t.status === 'Sedang di Luar' || t.status === 'Terlambat');
    const isPulang = (t.type === 'Pulang Mendahului' || t.returnType === 'Pulang Mendahului');

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header">
        <div>
          <h3 class="mobile-sheet-title">Tiket Izin Digital</h3>
          
        </div>
        <button type="button" class="mobile-sheet-close" onclick="window.mobileCloseSheet()">✕</button>
      </div>
      <div class="mobile-sheet-body" style="text-align: center;">
        <div style="font-size: 0.8rem; color: #059669; font-weight: 700;">${t.category} • ${getTType(t)}</div>
        <div style="font-size: 1.15rem; font-weight: 800; font-family: monospace; color: #0f172a; margin: 2px 0 4px 0;">${t.id}</div>
        <span class="mobile-badge ${getBadgeClass(t.status)}">${t.status}</span>

        <!-- QR Box -->
        <div style="background: #ffffff; border: 2px solid #e2e8f0; border-radius: 16px; padding: 18px; margin: 16px auto; max-width: 220px; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
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
              ${isPulang ? 'Pulang Mendahului' : (getTReturnTime(t) ? getTReturnTime(t).slice(11, 16) + ' WIB' : '13.00 WIB')}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button type="button" class="mobile-btn-primary" style="flex: 2; font-weight: 700; background: #0284c7; border-color: #0284c7; display: flex; align-items: center; justify-content: center; gap: 6px;" onclick="window.mobileDownloadQr('${t.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>Unduh Tiket QR</span>
          </button>
          <button type="button" class="mobile-btn-secondary" style="flex: 1; font-weight: 700;" onclick="window.mobileCloseSheet()">
            <span>Tutup</span>
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
            text: `KUJANG-PERMIT:${t.id}:${t.employeeNip || 'PK-2024-8841'}`,
            width: 170,
            height: 170,
            colorDark: '#0f172a',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
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

    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId) || getActiveTicket();
    if (!t) return;

    const isPending = (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat');
    const isApproved = (t.status === 'Disetujui');
    const isOutside = (t.status === 'Sedang di Luar' || t.status === 'Terlambat');

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header">
        <div>
          <span style="font-size: 0.7rem; color: #059669; font-weight: 700;">RINCIAN TIKET</span>
          <h3 class="mobile-sheet-title" style="font-family: monospace;">${t.id}</h3>
        </div>
        <button type="button" class="mobile-sheet-close" onclick="window.mobileCloseSheet()">✕</button>
      </div>
      <div class="mobile-sheet-body">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <div style="font-size: 0.85rem; font-weight: 800; color: #0f172a;">${getTName(t)}</div>
            <div style="font-size: 0.725rem; color: #64748b;">${t.category} • ${getTType(t)}</div>
          </div>
          <span class="mobile-badge ${getBadgeClass(t.status)}">${t.status}</span>
        </div>

        <div class="mobile-segment-toggle" style="margin-bottom: 12px;">
          <button type="button" class="mobile-seg-btn active" id="mBtnDetailInfo" onclick="window.mobileToggleDetailTab('info')">Informasi Tiket</button>
          <button type="button" class="mobile-seg-btn" id="mBtnDetailJejak" onclick="window.mobileToggleDetailTab('jejak')">Riwayat Aktivitas</button>
        </div>

        <div id="mDetailSecInfo">
          <div class="mobile-card" style="margin-bottom: 8px;">
            <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; margin-bottom: 4px;">INFORMASI KARYAWAN</div>
            <div style="font-size: 0.75rem; color: #1e293b; line-height: 1.4;">
              <strong>Nama:</strong> ${getTName(t)}<br>
              <strong>NIP:</strong> ${getTNip(t)}<br>
              <strong>Departemen:</strong> ${t.department || 'Departemen Rekayasa & Pemeliharaan'}
            </div>
          </div>

          <div class="mobile-card" style="margin-bottom: 8px;">
            <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; margin-bottom: 4px;">KEPERLUAN IZIN</div>
            <div style="font-size: 0.75rem; color: #1e293b; line-height: 1.4;">
              <strong>Tujuan:</strong> ${t.destination || 'Area Rekayasa'}<br>
              <strong>Alasan:</strong> ${t.reason || 'Keperluan dinas kantor'}<br>
              <strong>Transportasi:</strong> ${getTTransport(t)}
            </div>
          </div>

          <div class="mobile-card" style="margin-bottom: 8px;">
            <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; margin-bottom: 4px;">WAKTU KELUAR & KEMBALI</div>
            <div class="mobile-ticket-grid-meta" style="margin: 4px 0 0 0;">
              <div>
                <div class="mobile-meta-sub">Waktu Keluar</div>
                <div class="mobile-meta-val">${t.scanOutTime ? t.scanOutTime.slice(11, 16) + ' WIB (Aktual)' : (getTExitTime(t) ? getTExitTime(t).slice(11, 16) + ' WIB (Rencana)' : '10.00 WIB')}</div>
              </div>
              <div>
                <div class="mobile-meta-sub">Batas Kembali</div>
                <div class="mobile-meta-val">${getTReturnTime(t) ? getTReturnTime(t).slice(11, 16) + ' WIB' : '13.00 WIB'}</div>
              </div>
            </div>
          </div>

          ${t.approverNote ? `
            <div class="mobile-card" style="margin-bottom: 8px; background: #ecfdf5; border-color: #a7f3d0;">
              <div style="font-size: 0.7rem; color: #047857; font-weight: 700; margin-bottom: 2px;">CATATAN ATASAN</div>
              <div style="font-size: 0.75rem; color: #064e3b; font-style: italic;">"${t.approverNote}"</div>
              <div style="font-size: 0.65rem; color: #047857; margin-top: 4px;">Oleh ${t.approverName || 'Ir. Hendra Gunawan, M.T.'}</div>
            </div>
          ` : ''}
        </div>

        <div id="mDetailSecJejak" style="display: none;">
          <div class="mobile-timeline">
            ${renderTimelineHtml(t)}
          </div>
        </div>

        <!-- Action buttons according to ticket status -->
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 8px;">
          ${isPending ? `
            <button type="button" class="mobile-btn-secondary" onclick="window.mobileCloseSheet(); window.mobileOpenEditSheet('${t.id}')">
              ✏️ Edit Pengajuan Ini
            </button>
            <button type="button" class="mobile-btn-danger" style="background:#fff1f2; color:#be123c; border-color:#fecdd3;" onclick="window.mobileCloseSheet(); window.mobileOpenCancelSheet('${t.id}')">
              ✕ Batalkan Izin Ini
            </button>
          ` : ''}
          ${isApproved || isOutside ? `
            <button type="button" class="mobile-btn-primary" style="background:#059669; border-color:#059669;" onclick="window.mobileCloseSheet(); window.mobileOpenQrModal('${t.id}')">
              📱 Tampilkan QR Code Resmi
            </button>
          ` : ''}
          ${isApproved ? `
            <button type="button" class="mobile-btn-danger" style="background:#fff1f2; color:#be123c; border-color:#fecdd3;" onclick="window.mobileCloseSheet(); window.mobileOpenCancelSheet('${t.id}')">
              ✕ Batalkan Izin
            </button>
          ` : ''}
          ${isOutside ? `
            <button type="button" class="mobile-btn-secondary" onclick="window.mobileCloseSheet(); window.mobileOpenPerpanjanganModal('${t.id}')">
              ⏱️ Ajukan Perpanjangan Waktu
            </button>
          ` : ''}
          <button type="button" class="mobile-btn-secondary" onclick="window.mobileCloseSheet()">Tutup</button>
        </div>
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

    if (t.extensionApproved || (t.extensionCount && t.extensionCount >= 1)) {
      if (typeof window.showToast === 'function') {
        window.showToast('Perpanjangan waktu hanya dapat diajukan maksimal 1 kali dan telah disetujui sebelumnya!', 'warning');
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
            <input type="datetime-local" class="mobile-input" id="mPerpanjangNewTime" value="${defaultNewTime}" required>
            <div style="font-size: 0.7rem; color: #64748b; margin-top: 4px;">Pilih waktu kepulangan baru (disarankan +30 s.d +60 menit).</div>
          </div>

          <div class="mobile-form-group">
            <label class="mobile-form-label">Alasan Kendala di Lapangan <span class="req">*</span></label>
            <textarea class="mobile-textarea" id="mPerpanjangReason" placeholder="Pekerjaan koordinasi teknis bersama vendor belum selesai, memerlukan tambahan waktu..." required style="min-height: 75px;"></textarea>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #f1f5f9;">
            <button type="button" class="mobile-btn-secondary" style="flex: 1;" onclick="window.mobileCloseSheet()">Batal</button>
            <button type="submit" class="mobile-btn-primary" style="flex: 2; background: #059669; border-color: #059669; font-weight: 700;">
              <span>Kirim Permohonan →</span>
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
    const newTime = document.getElementById('mPerpanjangNewTime')?.value || '';
    const reason = (document.getElementById('mPerpanjangReason')?.value || '').trim();

    if (!newTime || !reason) {
      if (typeof window.showToast === 'function') window.showToast('Harap lengkapi waktu dan alasan perpanjangan!', 'warning');
      return;
    }

    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;

    const emp = getActiveEmp();
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

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
    }

    window.mobileCloseSheet();

    if (typeof window.showToast === 'function') {
      window.showToast(`Permohonan perpanjangan tiket #${ticketId} berhasil dikirim ke Atasan!`, 'success');
    }

    renderMobileKaryawan(null, currentKaryawanTab);
    if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
    if (typeof window.renderApproverView === 'function') window.renderApproverView();
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
    document.querySelectorAll('.mobile-seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.toLowerCase().includes(seg === 'ringkasan' ? 'ringkasan' : 'total'));
    });
  };

  window.mobileSearchRiwayat = function (q) {
    riwayatSearchQuery = q;
    const container = document.getElementById('mobileMainContent');
    if (container && currentKaryawanTab === 'riwayat') {
      renderRiwayat(container);
    }
  };

  window.mobileDownloadQr = function (ticketId) {
    const container = document.getElementById('mobileQrCanvasContainer');
    if (!container) return;
    const canvas = container.querySelector('canvas');
    const img = container.querySelector('img');
    let dataUrl = '';
    if (canvas) {
      dataUrl = canvas.toDataURL('image/png');
    } else if (img && img.src) {
      dataUrl = img.src;
    }
    if (dataUrl) {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Tiket-QR-${ticketId || 'Permit'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (typeof window.showToast === 'function') {
        window.showToast('QR Code berhasil diunduh ke perangkat!', 'success');
      }
    } else {
      if (typeof window.showToast === 'function') {
        window.showToast('Menyiapkan gambar QR Code...', 'info');
      }
    }
  };

  window.mobileCloseSheet = function () {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (sheet) sheet.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  };

  // Expose module function
  window.renderMobileKaryawan = renderMobileKaryawan;

})();
