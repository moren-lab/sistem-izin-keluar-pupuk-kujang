/**
 * SISTEM PERIZINAN KELUAR AREA - PT PUPUK KUJANG CIKAMPEK
 * MODULE: MOBILE KARYAWAN (Ref: Figma PDF Karyawan Hal 1 - 14)
 * 100% PARITAS LOGIKA & ALUR SISTEM DENGAN PC (DESKTOP)
 */

(function () {
  'use strict';

  let currentKaryawanTab = 'dashboard'; // 'dashboard' | 'pengajuan' | 'riwayat'
  let currentSegment = 'ringkasan';
  let mobileDonutPeriod = 'month'; // 'month' | 'today' | 'all' // 'ringkasan' | 'donut'
  let riwayatSearchQuery = '';
  let riwayatStatusFilter = 'all';
  let currentRiwayatView = 'card';
  let isRiwayatFilterOpen = false;
  let currentRiwayatPage = 1;
  const riwayatPageSize = 6;
  let riwayatSearchDebounceTimer = null;
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
    } catch (e) {}
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
              ${activeTicket.category || 'Dinas Kantor'} — QR Siap Digunakan di Pos 1 — Jadwal Keluar ${activeTicket.plannedExit ? formatTimeOnly(activeTicket.plannedExit) : ''}
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

    const emergencyTickets = tickets.filter(t => t.isEmergency || (t.id && t.id.includes('-EMG-')) || t.category === 'Izin Darurat' || t.status === 'Menunggu Otorisasi Darurat');
    const emergencyActive = emergencyTickets.filter(t => t.status !== 'Selesai' && t.status !== 'Ditolak' && t.status !== 'Dibatalkan').length;
    const emergencyFinished = emergencyTickets.filter(t => t.status === 'Selesai').length;

    let recentHtml = recentTickets.map(t => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
        <div>
          <div style="font-size: 0.8rem; font-weight: 800; color: #0f172a;">${t.id} <span class="mobile-badge ${getBadgeClass(t.status)}" style="margin-left: 4px;">${t.status}</span></div>
          <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">${t.category} • ${t.destination || 'Area Pabrik'}</div>
        </div>
        <button type="button" class="mobile-btn-secondary" style="padding: 5px 10px; font-size: 0.725rem; width: auto; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; border-radius: 8px; min-height: 36px; flex-shrink: 0; cursor: pointer;" onclick="window.mobileOpenTicketDetail('${t.id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span>Detail Pengajuan</span>
        </button>
      </div>
    `).join('');

    // Donut SVG calculations with dynamic period filtering (Bulan Ini, Hari Ini, Semua)
    const isEmg = (item) => Boolean(item.isEmergency || (item.id && (item.id.includes('-EMG-') || item.id.startsWith('TK-EMG'))) || (item.category && item.category.toLowerCase().includes('darurat')));
    const donutFilteredTickets = tickets.filter(item => {
      if (typeof window.matchesPeriodFilter === 'function') {
        return window.matchesPeriodFilter(item, mobileDonutPeriod);
      }
      return true;
    });

    const donutTotal = donutFilteredTickets.length;
    const donutSelesai = donutFilteredTickets.filter(item => item.status === 'Selesai' && !isEmg(item)).length;
    const donutActive = donutFilteredTickets.filter(item => (item.status === 'Sedang di Luar' || item.status === 'Disetujui' || item.status === 'Menunggu Persetujuan' || item.status === 'Terlambat') && !isEmg(item)).length;
    const donutEmg = donutFilteredTickets.filter(isEmg).length;

    const strokeDash = 239; // 2 * PI * 38
    const selesaiPct = donutTotal ? Math.round((donutSelesai / donutTotal) * 1000) / 10 : 0;
    const activePct = donutTotal ? Math.round((donutActive / donutTotal) * 1000) / 10 : 0;
    const emgPct = donutTotal ? Math.round((donutEmg / donutTotal) * 1000) / 10 : 0;

    let selesaiLen = donutTotal ? Math.round((donutSelesai / donutTotal) * strokeDash) : 0;
    let activeLen = donutTotal ? Math.round((donutActive / donutTotal) * strokeDash) : 0;
    let emgLen = donutTotal ? Math.round((donutEmg / donutTotal) * strokeDash) : 0;

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
      <div id="mobileSecDonut" class="mobile-card" style="display: ${currentSegment === 'donut' ? 'block' : 'none'}; margin-bottom: 14px; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; background: #ffffff;">
        <h3 style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">Total Pengajuan Izin</h3>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Periode laporan</span>
          <select id="mSelectDonutPeriod" style="padding: 4px 10px; font-size: 0.75rem; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; color: #1e293b; cursor: pointer; outline: none;" onchange="window.mobileSwitchDonutPeriod(this.value)">
            <option value="month" ${mobileDonutPeriod === 'month' ? 'selected' : ''}>Bulan Ini</option>
            <option value="today" ${mobileDonutPeriod === 'today' ? 'selected' : ''}>Hari Ini</option>
            <option value="all" ${mobileDonutPeriod === 'all' ? 'selected' : ''}>Semua Periode</option>
          </select>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-around; gap: 12px;">
          <!-- SVG Donut Chart -->
          <div style="position: relative; width: 110px; height: 110px; flex-shrink: 0;">
            <svg width="110" height="110" viewBox="0 0 100 100" style="transform: rotate(-90deg);">
              <!-- Base Circle -->
              <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" stroke-width="14" />
              <!-- Selesai (Hijau) -->
              <circle cx="50" cy="50" r="38" fill="transparent" stroke="#059669" stroke-width="14" stroke-dasharray="${selesaiLen} ${strokeDash}" stroke-dashoffset="0" />
              <!-- Sedang Aktif (Kuning) -->
              <circle cx="50" cy="50" r="38" fill="transparent" stroke="#eab308" stroke-width="14" stroke-dasharray="${activeLen} ${strokeDash}" stroke-dashoffset="${-selesaiLen}" />
              <!-- Izin Darurat (Merah) -->
              <circle cx="50" cy="50" r="38" fill="transparent" stroke="#dc2626" stroke-width="14" stroke-dasharray="${emgLen} ${strokeDash}" stroke-dashoffset="${-(selesaiLen + activeLen)}" />
            </svg>
            <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
              <span style="font-size: 1.35rem; font-weight: 900; color: #0f172a; line-height: 1;">${donutTotal}</span>
              <span style="font-size: 0.65rem; color: #64748b; font-weight: 700; margin-top: 2px;">Total</span>
            </div>
          </div>

          <!-- Legend -->
          <div style="display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 0;">
            <div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 2px; background: #059669; flex-shrink: 0;"></span>
                <span style="font-size: 0.8rem; font-weight: 800; color: #0f172a;">${donutSelesai} Selesai</span>
              </div>
              <div style="font-size: 0.7rem; color: #64748b; margin-left: 14px;">${selesaiPct}% dari total</div>
            </div>

            <div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 2px; background: #eab308; flex-shrink: 0;"></span>
                <span style="font-size: 0.8rem; font-weight: 800; color: #0f172a;">${donutActive} Sedang Aktif</span>
              </div>
              <div style="font-size: 0.7rem; color: #64748b; margin-left: 14px;">${activePct}% dari total</div>
            </div>

            <div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 2px; background: #dc2626; flex-shrink: 0;"></span>
                <span style="font-size: 0.8rem; font-weight: 800; color: #0f172a;">${donutEmg} Izin Darurat</span>
              </div>
              <div style="font-size: 0.7rem; color: #64748b; margin-left: 14px;">${emgPct}% dari total</div>
            </div>
          </div>
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

      <!-- Card: Ketentuan Izin Keluar -->
      <section class="mobile-card" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h3 class="mobile-card-title" style="margin-bottom: 6px;">Ketentuan Izin Keluar</h3>
        <ul style="margin: 0; padding-left: 18px; font-size: 0.75rem; color: #475569; line-height: 1.45;">
          <li>Izin reguler memerlukan persetujuan Atasan. Maksimal satu tiket aktif.</li>
          <li>Tunjukkan QR kepada petugas satpam saat keluar dan kembali.</li>
          <li>Ajukan perpanjangan waktu sebelum batas jam kembali jika terjadi kendala dinas.</li>
        </ul>
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
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <span>Izin Darurat</span>
          </button>

          <!-- Kolom 2 (Kanan): Buat Pengajuan (Hijau Utama #059669, Teks Putih) -->
          <button type="button" class="mobile-btn-primary" style="margin: 0; min-height: 44px; padding: 0 10px; font-size: 0.8125rem; font-weight: 700; background: #059669; color: #ffffff; border: 1.5px solid #059669; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 6px rgba(5, 150, 105, 0.2); cursor: pointer;" onclick="window.mobileOpenCreateModal(false)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="12" y2="12"></line></svg>
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
  function renderRiwayat(container) {
    const emp = getActiveEmp();
    let allEmpTickets = getEmpTickets();

    const myActorNip = (emp && emp.nip) ? emp.nip : 'PK-2024-8841';
    const hasDeletableTickets = (window.ticketsList || []).some(t =>
      !t.deletedByKaryawan &&
      (t.applicantNip === myActorNip || (!t.applicantNip && myActorNip === 'PK-2024-8841')) &&
      (t.status === 'Selesai' || t.status === 'Dibatalkan' || t.status === 'Ditolak' || t.status === 'Kedaluwarsa')
    );

    // 1. Filter by Status
    let filtered = allEmpTickets;
    if (riwayatStatusFilter !== 'all') {
      filtered = filtered.filter(t => {
        if (riwayatStatusFilter === 'Terlambat') {
          return t.status === 'Terlambat' || t.isLate || (t.approverNote && t.approverNote.toLowerCase().includes('terlambat'));
        }
        return t.status === riwayatStatusFilter;
      });
    }

    // 2. Filter by Search Query (ID, destination, reason, category, approver, type)
    if (riwayatSearchQuery && riwayatSearchQuery.trim()) {
      const q = riwayatSearchQuery.trim().toLowerCase();
      filtered = filtered.filter(t => {
        const idStr = (t.id || '').toLowerCase();
        const destStr = (t.destination || '').toLowerCase();
        const reasonStr = (t.reason || '').toLowerCase();
        const catStr = (t.category || '').toLowerCase();
        const appStr = (t.approverName || '').toLowerCase();
        const typeStr = (t.type || t.returnType || '').toLowerCase();
        return idStr.includes(q) || destStr.includes(q) || reasonStr.includes(q) || catStr.includes(q) || appStr.includes(q) || typeStr.includes(q);
      });
    }

    // 3. Pagination calculations
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / riwayatPageSize) || 1;
    if (currentRiwayatPage > totalPages) currentRiwayatPage = 1;
    if (currentRiwayatPage < 1) currentRiwayatPage = 1;

    const startIndex = (currentRiwayatPage - 1) * riwayatPageSize;
    const pageTickets = filtered.slice(startIndex, startIndex + riwayatPageSize);

    // 4. Card View HTML (Points 1, 2, 4, 5, 6, 7, 8, 9, 10)
    const cardsHtml = pageTickets.map(t => {
      const isPulang = (t.type === 'Pulang Mendahului' || t.type === 'Pulang Lebih Awal' || t.returnType === 'Pulang Mendahului');
      const destText = (t.destination && t.destination.trim()) ? t.destination.trim() : 'Tanpa tujuan';
      const typeDisplay = formatTipeKepulanganDisplay(t.type || t.returnType);
      const dateStr = formatDisplayDate(t.createdAt).split(',')[0];

      return `
        <div class="mobile-ticket-card">
          <!-- Baris 1: ID Tiket & Tanggal (Kiri) + Status Badge (Kanan) -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <div style="font-family: monospace; font-size: 0.875rem; font-weight: 800; color: #0f172a;">${t.id}</div>
              <div style="font-size: 0.725rem; font-weight: 600; color: #334155; margin-top: 1px;">Diajukan ${dateStr}</div>
            </div>
            <span class="mobile-badge ${getBadgeClass(t.status)}">${t.status}</span>
          </div>

          <!-- Baris 2: Lokasi / Tujuan Keluar (Judul Utama) -->
          <div style="font-size: 0.9rem; font-weight: 800; color: #0f172a; margin-bottom: 4px; line-height: 1.35;">
            ${destText}
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
            <!-- Perubahan 1: Detail Pengajuan (Pil Putih Border Tipis + Icon Dokumen) -->
            <button type="button" class="mobile-btn-secondary" style="padding: 5px 10px; font-size: 0.725rem; width: auto; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; border-radius: 8px; min-height: 36px; cursor: pointer;" onclick="window.mobileOpenTicketDetail('${t.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              <span>Detail Pengajuan</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // 5. List View HTML (Points 1, 2, 4, 5, 6, 7, 8, 9, 10)
    const listHtml = pageTickets.map(t => {
      const isPulang = (t.type === 'Pulang Mendahului' || t.type === 'Pulang Lebih Awal' || t.returnType === 'Pulang Mendahului');
      const destText = (t.destination && t.destination.trim()) ? t.destination.trim() : 'Tanpa tujuan';
      const typeDisplay = formatTipeKepulanganDisplay(t.type || t.returnType);
      const dateStr = formatDisplayDate(t.createdAt).split(',')[0];

      return `
        <div class="mobile-ticket-list-row">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div>
              <div style="font-family: monospace; font-size: 0.85rem; font-weight: 800; color: #0f172a;">${t.id}</div>
              <div style="font-size: 0.725rem; font-weight: 600; color: #334155; margin-top: 1px;">Diajukan ${dateStr}</div>
            </div>
            <span class="mobile-badge ${getBadgeClass(t.status)}">${t.status}</span>
          </div>

          <div style="font-size: 0.85rem; font-weight: 800; color: #0f172a; margin-bottom: 3px;">
            ${destText}
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
            <!-- Perubahan 1: Detail Pengajuan (Pil Putih Border Tipis + Icon Dokumen) -->
            <button type="button" class="mobile-btn-secondary" style="padding: 5px 10px; font-size: 0.725rem; width: auto; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; border-radius: 8px; min-height: 36px; cursor: pointer;" onclick="window.mobileOpenTicketDetail('${t.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              <span>Detail Pengajuan</span>
            </button>
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

    // Dynamic Pagination Buttons
    let paginationHtml = '';
    if (totalPages > 1) {
      let pageBtns = '';
      for (let p = 1; p <= totalPages; p++) {
        const isActive = (p === currentRiwayatPage);
        pageBtns += `
          <button type="button" style="min-width: 36px; height: 36px; padding: 0 8px; border-radius: 8px; border: 1px solid ${isActive ? '#2563eb' : '#cbd5e1'}; background: ${isActive ? '#2563eb' : '#ffffff'}; color: ${isActive ? '#ffffff' : '#334155'}; font-size: 0.8rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileSetRiwayatPage(${p})">
            ${p}
          </button>
        `;
      }
      paginationHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin: 18px 0 8px 0; gap: 8px;">
          <div style="font-size: 0.725rem; color: #64748b; font-weight: 600;">
            Menampilkan ${startIndex + 1}–${Math.min(startIndex + riwayatPageSize, totalItems)} dari ${totalItems} tiket
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-left: auto;">
            ${pageBtns}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <!-- 1. Search Bar (Point 11.c) -->
      <div style="display: flex; align-items: center; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 0 12px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.2" style="flex-shrink: 0; margin-right: 8px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="mRiwayatLiveSearch" placeholder="Cari nomor tiket, tujuan, alasan, kategori..." value="${riwayatSearchQuery}" style="flex: 1; border: none; background: transparent; font-size: 0.825rem; color: #0f172a; padding: 11px 0; outline: none; min-width: 0;" oninput="window.mobileDebounceRiwayatSearch(this.value)">
        <button type="button" id="mBtnClearRiwayatSearch" aria-label="Hapus teks pencarian" style="display: ${riwayatSearchQuery ? 'inline-flex' : 'none'}; border: none; background: #e2e8f0; color: #475569; width: 24px; height: 24px; border-radius: 50%; align-items: center; justify-content: center; font-size: 11px; cursor: pointer; flex-shrink: 0; margin-left: 6px;" onclick="window.mobileClearRiwayatSearch()">✕</button>
      </div>

      <!-- 2. Toolbar (Perubahan 2: Toggle Dihapus; Perubahan 3: Filter & Hapus Riwayat Berdampingan di Kanan Bawah Kolom Pencarian) -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; width: 100%; box-sizing: border-box;">
        <div style="font-size: 0.75rem; font-weight: 700; color: #475569;">
          ${totalItems} tiket riwayat
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <!-- Tombol Filter (36x36px visual, Hit Area >= 44x44px) -->
          <button type="button" class="mobile-filter-toggle-btn mobile-touch-hit-44 ${isRiwayatFilterOpen ? 'active' : ''}" style="width: 36px; height: 36px; min-width: 36px; min-height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; border: 1.5px solid ${isRiwayatFilterOpen ? '#059669' : '#cbd5e1'}; background: ${isRiwayatFilterOpen ? '#ecfdf5' : '#ffffff'}; color: ${isRiwayatFilterOpen ? '#047857' : '#334155'}; cursor: pointer; box-sizing: border-box; position: relative;" onclick="window.mobileToggleRiwayatFilter()" title="Filter Status Riwayat" aria-label="Filter Status Riwayat">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            ${(riwayatStatusFilter !== 'all') ? '<span style="position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; border-radius: 50%; background: #059669;"></span>' : ''}
          </button>
          <!-- Tombol Merah Solid Sampah (36x36px visual, Hit Area >= 44x44px) -->
          <button type="button" class="mobile-btn-clear-history mobile-touch-hit-44" ${hasDeletableTickets ? '' : 'disabled'} title="Hapus Riwayat Selesai" aria-label="Hapus Riwayat Selesai" style="width: 36px; height: 36px; min-width: 36px; min-height: 36px; padding: 0; border-radius: 10px; background: #dc2626; border: 1.5px solid #dc2626; color: #ffffff; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(220, 38, 38, 0.2);" onclick="window.mobileClearRiwayat('karyawan')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      </div>

      <!-- 3. Collapsible Filter Panel -->
      <div id="mRiwayatFilterCard" class="mobile-filter-panel" style="display: ${isRiwayatFilterOpen ? 'block' : 'none'}; margin-bottom: 12px;">
        <div class="mobile-filter-panel-title">
          <span>Filter Status Pengajuan</span>
          <button type="button" style="border:none; background:none; font-size:0.75rem; color:#64748b; cursor:pointer;" onclick="window.mobileToggleRiwayatFilter()">✕</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
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
          <div style="margin-top: 4px;">
            <button type="button" class="mobile-btn-secondary" style="width: 100%; padding: 8px 12px; font-size: 0.75rem; font-weight: 700;" onclick="window.mobileResetRiwayatFilterKaryawan()">
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      <!-- 4. Items Container (Card View or List View) -->
      <div id="mRiwayatItemsContainer">
        ${totalItems === 0 ? emptyHtml : listHtml}
      </div>

      <!-- 5. Dynamic Pagination (Point 11.c) -->
      ${paginationHtml}
    `;
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
    renderMobileKaryawan(null, 'riwayat');
  };

  window.mobileDebounceRiwayatSearch = function (val) {
    clearTimeout(riwayatSearchDebounceTimer);
    riwayatSearchDebounceTimer = setTimeout(() => {
      riwayatSearchQuery = val ? val.trim() : '';
      currentRiwayatPage = 1;
      renderMobileKaryawan(null, 'riwayat');
      const input = document.getElementById('mRiwayatLiveSearch');
      if (input) {
        input.focus();
        if (typeof input.setSelectionRange === 'function') input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 200);
  };

  window.mobileClearRiwayatSearch = function () {
    riwayatSearchQuery = '';
    currentRiwayatPage = 1;
    renderMobileKaryawan(null, 'riwayat');
  };

  window.mobileSetRiwayatPage = function (p) {
    currentRiwayatPage = p;
    renderMobileKaryawan(null, 'riwayat');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.mobileResetRiwayatFilterKaryawan = function () {
    riwayatSearchQuery = '';
    riwayatStatusFilter = 'all';
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

    const col1Label = (isOutside && t.scanOutTime) ? 'Scan Out • Pos 1' : 'Jadwal Keluar';
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
            <a href="#" class="mobile-link-rincian" onclick="window.mobileOpenTicketDetail('${t.id}'); return false;">Detail Pengajuan</a>
          </div>
        `;
      }
    } else if (isApproved) {
      actionButtonsHtml = `
        <div class="mobile-btn-group-stacked" style="margin-top: 12px;">
          <button type="button" class="mobile-btn-primary" style="background: #059669; border-color: #059669; font-weight: 700;" onclick="window.mobileOpenQrModal('${t.id}')">
            <span>Buka QR Izin</span>
          </button>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button type="button" class="mobile-btn-secondary" style="font-weight: 600; min-height: 44px;" onclick="window.mobileOpenTicketDetail('${t.id}')">
              <span>Detail Pengajuan</span>
            </button>
            <button type="button" class="mobile-btn-danger mobile-btn-cancel-solid" style="background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; font-weight: 700; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileOpenCancelSheet('${t.id}')">
              <span>Batalkan Izin</span>
            </button>
          </div>
        </div>
      `;
    } else if (isOutside) {
      const hasPendingExt = Boolean(t.hasExtensionPending || (t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan'));
      const hasUsedExt = Boolean(t.extensionApproved || (t.extensionCount && t.extensionCount >= 1));

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

      actionButtonsHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px;">
          ${extButtonHtml}
          <button type="button" class="mobile-btn-primary" style="background: #059669; color: #ffffff; border: 1.5px solid #059669; font-weight: 700; min-height: 44px; font-size: 0.8rem; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; text-align: center;" onclick="window.mobileExecuteTapIn('${t.id}')">
            <span>✓ Tap In Kartu Akses</span>
          </button>
        </div>
        <div style="text-align: center; margin-top: 8px;">
          <a href="#" class="mobile-link-rincian" onclick="window.mobileOpenTicketDetail('${t.id}'); return false;">Detail Pengajuan</a>
        </div>
      `;
    }

    return `
      <section class="mobile-card" style="background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
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
        <div style="font-size: 0.85rem; font-weight: 800; color: #0f172a; margin: 3px 0 2px 0;">${t.destination || 'Area Cikampek'}</div>
        <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 8px; font-style: normal;">"${t.reason || 'Keperluan dinas kantor'}"</div>

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
          <div class="mobile-timeline-time">${t.createdAt ? formatTimeOnly(t.createdAt) : '09.20 WIB'}</div>
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
          <div class="mobile-timeline-time">${t.scanOutTime ? formatTimeOnly(t.scanOutTime) : 'Menunggu Keluar'}</div>
          <div class="mobile-timeline-title">${isScanOut ? 'Scan Out Tercatat' : 'Verifikasi Gerbang Keluar'}</div>
          <div class="mobile-timeline-desc">${isScanOut ? (t.scanOutGate || 'Pos 1') + ' • Karyawan meninggalkan area' : 'Tunjukkan QR di pos jaga'}</div>
        </div>
      </div>

      <div class="mobile-timeline-item">
        <div class="mobile-timeline-track">
          <div class="mobile-timeline-dot ${isScanIn ? 'done' : ''}"></div>
        </div>
        <div class="mobile-timeline-content">
          <div class="mobile-timeline-time">${t.scanInTime ? formatTimeOnly(t.scanInTime) : 'Menunggu Kembali'}</div>
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
        ${(t.status === 'Ditolak') ? `
          <div style="background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 10px; padding: 12px; margin-bottom: 12px; text-align: left;">
            <div style="font-size: 0.775rem; font-weight: 800; color: #991b1b; display: flex; align-items: center; gap: 5px;">
              <span>⚠️ Pengajuan Ditolak oleh Atasan</span>
            </div>
            <div style="font-size: 0.75rem; color: #7f1d1d; margin-top: 4px; line-height: 1.45;">
              <strong>Alasan Penolakan:</strong> "${t.rejectionReason || t.rejectReason || t.approverNote || 'Alasan dinas belum memenuhi ketentuan operasional.'}"
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
            <button type="button" class="mobile-btn-secondary mobile-btn-edit-solid" style="background: #2563eb; color: #ffffff; border: 1.5px solid #2563eb; font-weight: 700; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileCloseSheet(); window.mobileOpenEditSheet('${activeTicket.id}')">
              Edit Pengajuan Ini
            </button>
            <button type="button" class="mobile-btn-danger mobile-btn-cancel-solid" style="background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; font-weight: 700; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileCloseSheet(); window.mobileOpenCancelSheet('${activeTicket.id}')">
              Batalkan Izin Ini
            </button>
          ` : ''}
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
    // Guard: Izin Darurat pun tidak bisa dibuat jika masih ada izin aktif
    if (isEmergency && activeTicket && !prefillData && !window.editingTicketId) {
      if (typeof window.showToast === 'function') {
        window.showToast('Anda masih memiliki izin aktif. Selesaikan atau batalkan terlebih dahulu.', 'warning');
      } else {
        alert('Anda masih memiliki izin aktif. Selesaikan atau batalkan terlebih dahulu.');
      }
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
    } else if (isEditing) {
      selectedApproverData = approvers[0];
    } else {
      selectedApproverData = null; // Kosongkan saat membuat pengajuan baru
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
            ${isEditing ? `Edit Pengajuan Izin — ${window.editingTicketId}` : (isEmergency ? 'Formulir Izin Darurat (Emergency Pass)' : 'Formulir Pengajuan Izin Keluar')}
          </h3>
          <p style="font-size: 0.775rem; color: #64748b; margin: 3px 0 0 0;">
            ${isEditing ? 'Perbarui data formulir izin keluar Anda sebelum disetujui Atasan' : (isEmergency ? 'Penerbitan izin darurat untuk evakuasi/keadaan mendesak' : 'Lengkapi detail perizinan Anda di bawah ini')}
          </p>
        </div>
        <button type="button" class="mobile-sheet-close" onclick="window.mobileCloseSheet()" title="Tutup">✕</button>
      </div>

      <div class="mobile-sheet-body">
        ${isEmergency ? `
          <div class="mobile-emergency-banner" style="margin-bottom: 14px; background: #fff5f5; border: 1.5px solid #fca5a5; border-radius: 10px; padding: 12px;">
            <div class="mobile-emergency-banner-title" style="color: #b91c1c; font-weight: 800; font-size: 0.825rem; display: flex; align-items: center; gap: 6px;">
              <span>PERHATIAN: JALUR IZIN DARURAT (EMERGENCY PASS)</span>
            </div>
            
          </div>
        ` : ''}

        <form id="mobileCreatePermitForm" onsubmit="window.mobileSubmitPermitForm(event, ${!!isEmergency})">
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
            </div>
          </div>

          <!-- 2. Kategori Keperluan & Tipe Kepulangan (Side-by-side Dropdowns) -->
          <div class="mobile-form-grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div class="mobile-form-group" style="margin: 0;">
              <label class="mobile-form-label">Kategori Keperluan <span class="req">*</span></label>
              <select class="mobile-select" id="mFormCategory" required onchange="window.mobileHandleCategoryChange(this.value)">
                <option value="">-- Pilih Kategori --</option>
                <option value="Dinas Kantor" ${initialCat === 'Dinas Kantor' || !initialCat ? 'selected' : ''}>Dinas Kantor</option>
                <option value="Urusan Pribadi" ${initialCat === 'Urusan Pribadi' ? 'selected' : ''}>Urusan Pribadi</option>
              </select>
            </div>

            <div class="mobile-form-group" style="margin: 0;">
              <label class="mobile-form-label">Tipe Kepulangan <span class="req">*</span></label>
              <select class="mobile-select" id="mFormReturnType" required onchange="window.mobileToggleReturnType(this.value)">
                <option value="">-- Pilih Tipe Kepulangan --</option>
                <option value="Kembali ke Area" ${initialType === 'Kembali ke Area' || !initialType ? 'selected' : ''}>Kembali ke Area</option>
                <option value="Pulang Mendahului" ${initialType === 'Pulang Mendahului' ? 'selected' : ''}>Pulang Lebih Awal</option>
              </select>
            </div>
          </div>

          <!-- 3. Lokasi / Tujuan Keluar -->
          <div class="mobile-form-group" style="margin-bottom: 12px;">
            <label class="mobile-form-label">Lokasi / Tujuan Keluar <span class="req">*</span></label>
            <input type="text" class="mobile-input" id="mFormDestination" placeholder="Masukkan lokasi / tujuan keluar..." value="${initialDest}" required>
          </div>

          <!-- 4. Alasan Keperluan Izin -->
          <div class="mobile-form-group" style="margin-bottom: 12px;">
            <label class="mobile-form-label">${isEmergency ? 'Alasan Kondisi Kedaruratan' : 'Alasan Keperluan Izin'} <span class="req">*</span></label>
            <textarea class="mobile-textarea" id="mFormReason" placeholder="${isEmergency ? 'Masukkan alasan kondisi kedaruratan...' : 'Masukkan alasan keperluan izin...'}" required style="min-height: 65px;">${initialReason}</textarea>
          </div>

          <!-- 5. Rencana Waktu Keluar & Perkiraan Waktu Kembali (Anti Waktu Lampau) -->
          <div class="mobile-form-grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 6px;">
            <div class="mobile-form-group" style="margin: 0;">
              <label class="mobile-form-label">Rencana Waktu Keluar <span class="req">*</span></label>
              <input type="datetime-local" class="mobile-input" id="mFormPlannedExit" min="${formatDateTimeLocal(now)}" ${initialCat === 'Urusan Pribadi' ? `max="${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T23:59"` : ''} value="${defaultExit}" required oninput="window.mobileHandleExitChange(this.value)" onchange="window.mobileHandleExitChange(this.value)">
            </div>
            <div class="mobile-form-group" id="mFormWrapReturn" style="margin: 0; display: ${initialType === 'Pulang Mendahului' ? 'none' : 'block'};">
              <label class="mobile-form-label">Perkiraan Waktu Kembali <span class="req">*</span></label>
              <input type="datetime-local" class="mobile-input" id="mFormEstimatedReturn" min="${formatDateTimeLocal(now)}" ${initialCat === 'Urusan Pribadi' ? `max="${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T23:59"` : ''} value="${defaultReturn}" ${initialType === 'Pulang Mendahului' ? '' : 'required'} oninput="window.mobileHandleReturnChange(this.value)" onchange="window.mobileHandleReturnChange(this.value)">
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
                  <input type="radio" name="mEmgMethod" value="passcode">
                  <div>
                    <strong>Input Kode Sandi / OTP (6 Digit)</strong>
                    <div style="color: #64748b; font-size: 0.675rem;">Minta kode sandi otorisasi dari Atasan</div>
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

          <!-- Footer Actions (Batal & Lanjutkan Konfirmasi) -->
          <div style="display: flex; justify-content: flex-end; gap: 10px; padding-top: 14px; margin-top: 14px; border-top: 1px solid #f1f5f9;">
            <button type="button" class="mobile-btn-secondary" style="width: auto; padding: 10px 20px; font-weight: 600;" onclick="window.mobileCloseSheet()">
              Batal
            </button>
            <button type="submit" class="mobile-btn-primary" style="width: auto; padding: 10px 24px; font-weight: 700; background: ${isEmergency ? '#dc2626' : '#059669'}; border-color: ${isEmergency ? '#dc2626' : '#059669'}; display: inline-flex; align-items: center; gap: 6px;">
              <span>${isEditing ? 'Lanjutkan & Simpan' : (isEmergency ? 'Lanjutkan Konfirmasi Darurat' : 'Lanjutkan Konfirmasi')}</span>
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
          <textarea class="mobile-textarea" id="mCancelReason" placeholder="Masukkan alasan pembatalan izin..." style="min-height: 75px;"></textarea>
        </div>

        <div style="margin-top: 18px; padding-top: 12px; border-top: 1px solid #f1f5f9;">
          <button type="button" class="mobile-btn-danger" style="width: 100%; padding: 11px; font-weight: 700; background: #dc2626; border-color: #dc2626; color: #ffffff;" onclick="window.mobileConfirmCancelTicket('${t.id}')">
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
      <div class="mobile-approver-item" onclick="window.mobileSelectApprover('${a.name.replace(/'/g, "\\'")}', '${(a.title || '').replace(/'/g, "\\'")}', '${(a.initials || 'HG')}')">
        <div class="mobile-approver-item-avatar" style="background: ${a.avatarBg || 'linear-gradient(135deg, #059669 0%, #0d9488 100%)'};">
          ${a.initials || 'HG'}
        </div>
        <div class="mobile-approver-item-info">
          <div class="mobile-approver-item-name">${a.name}</div>
          <div class="mobile-approver-item-role">${a.title || 'Manajer'} • ${a.department || 'Rekayasa'}</div>
        </div>
        <span style="color: #059669; font-size: 0.75rem; font-weight: 700;">Pilih</span>
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
      window.mobileSelectApprover(match.name, match.title || 'Manajer', match.initials || 'HG');
    }
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

    if (typeof window.showToast === 'function') {
      window.showToast(`Atasan terpilih: ${name}`, 'info');
    }
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
    const exitInput = document.getElementById('mFormPlannedExit');
    const retInput = document.getElementById('mFormEstimatedReturn');
    if (!val) return;

    const now = new Date();
    // VALIDASI KETAT ANTI MASA LALU (Toleransi 30 detik)
    if (new Date(val).getTime() < now.getTime() - 30000) {
      if (typeof window.showToast === 'function') {
        window.showToast('Rencana waktu keluar tidak boleh memilih waktu atau jam yang sudah berlalu! Disesuaikan otomatis.', 'warning');
      }
      const adjusted = new Date(now.getTime() + 5 * 60000);
      if (exitInput) {
        exitInput.value = formatDateTimeLocal(adjusted);
        val = exitInput.value;
      }
    }

    if (retInput && val) {
      retInput.min = val;
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
      emergencyMethod,
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
            <span class="mobile-summary-value" style="font-style: normal; color: #334155;">"${data.reason}"</span>
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
              <span class="mobile-summary-value" style="color: #64748b;">Pulang Lebih Awal</span>
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
    const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

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
    // BRULE-22 Enforcement: Maksimal 1 tiket aktif
    const existingActive = getActiveTicket();
    if (existingActive) {
      if (typeof window.showToast === 'function') {
        window.showToast('Gagal: Anda masih memiliki tiket aktif! Sesuai aturan BRULE-22, Anda hanya dapat memiliki maksimal 1 izin aktif.', 'danger');
      }
      window.mobileCloseSheet();
      renderMobileKaryawan(null, 'pengajuan');
      return;
    }

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
      emergencyPasscode: data.isEmergency ? String(Math.floor(100000 + Math.random() * 900000)) : undefined,
      emergencyMethod: data.emergencyMethod || 'app',
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

    if (typeof window.createNotification === 'function') {
      if (data.isEmergency) {
        window.createNotification({
          recipientRole: 'approver',
          recipientName: newTicket.approverName || 'Ir. Hendra Gunawan, M.T.',
          actorSource: 'karyawan',
          type: 'darurat_baru',
          title: '🚨 IZIN DARURAT BARU',
          message: `PERINGATAN: ${newTicket.applicantName} (${newTicket.applicantNip}) mengajukan izin kedaruratan #${newTicket.id}. Memerlukan otorisasi segera.`,
          ticketId: newTicket.id,
          priority: 'high',
          eventId: `emg_alert_${newTicket.id}`
        });
        window.createNotification({
          recipientRole: 'security',
          actorSource: 'system',
          type: 'security_darurat',
          title: '🚨 Tiket Darurat Melewati Gerbang',
          message: `Izin darurat baru #${newTicket.id} (${newTicket.applicantName}) akan segera melewati pos pemeriksaan gerbang.`,
          ticketId: newTicket.id,
          priority: 'high',
          eventId: `emg_sec_${newTicket.id}`
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
      }
    }

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

    renderMobileKaryawan(null, currentKaryawanTab);
    if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
    if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
    if (typeof window.renderApproverView === 'function') window.renderApproverView();
  };

  // -------------------------------------------------------------------
  // TAP IN KARTU AKSES (ALUR KEMBALI KE PABRIK)
  // -------------------------------------------------------------------
  window.mobileExecuteTapIn = function (ticketId) {
    if (typeof window.executeScanIn === 'function') {
      window.executeScanIn(ticketId);
      renderMobileKaryawan(null, currentKaryawanTab);
      if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
      if (typeof window.renderSecurityView === 'function') window.renderSecurityView();
      return;
    }
    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;
    const wasOverdue = (t.status === 'Terlambat');

    t.status = 'Selesai';
    t.scanInTime = `${nowFormatted} (Pos 1 Gerbang Utama)`;
    t.scanInGate = 'Pos 1 Gerbang Utama';
    if (!t.timeline) t.timeline = [];
    t.timeline.push({
      event: wasOverdue ? 'Tap In Kartu (Kembali Terlambat)' : 'Tap In Kartu (Kembali Tepat Waktu)',
      time: nowFormatted,
      by: `${t.applicantName || 'Budi Pratama'} (Karyawan)`,
      desc: `Tap In Kartu Akses berhasil di Pos 1 Gerbang Utama. Karyawan kembali ke area pabrik. Tiket #${t.id} resmi selesai.`
    });

    if (typeof window.saveTickets === 'function') window.saveTickets(tickets);
    else localStorage.setItem('kujang_tickets', JSON.stringify(tickets));

    if (typeof window.showToast === 'function') {
      window.showToast(`Tap In Kartu Akses berhasil! Anda telah kembali ke area pabrik. Tiket #${t.id} selesai.`, wasOverdue ? 'warning' : 'success');
    }

    renderMobileKaryawan(null, currentKaryawanTab);
    if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
    if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
    if (typeof window.renderSecurityView === 'function') window.renderSecurityView();
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
        <!-- 3 Tabs Navigation -->
        <div style="display: flex; gap: 4px; background: #f1f5f9; padding: 4px; border-radius: 10px; margin-bottom: 14px;">
          <button type="button" id="mTabBtnEmgApp" class="mobile-seg-btn active" style="flex:1; padding: 7px 4px; font-size: 0.725rem; font-weight: 700;" onclick="window.mobileSwitchEmgTab('app')">
            App Atasan
          </button>
          <button type="button" id="mTabBtnEmgPass" class="mobile-seg-btn" style="flex:1; padding: 7px 4px; font-size: 0.725rem; font-weight: 700;" onclick="window.mobileSwitchEmgTab('passcode')">
            Kode OTP
          </button>
          <button type="button" id="mTabBtnEmgFace" class="mobile-seg-btn" style="flex:1; padding: 7px 4px; font-size: 0.725rem; font-weight: 700;" onclick="window.mobileSwitchEmgTab('facescan')">
            Scan Wajah
          </button>
        </div>

        <!-- Tab 1: Persetujuan App -->
        <div id="mPaneEmgApp" style="display: block; text-align: center; padding: 6px 0;">
          <div style="margin-bottom: 6px; color: #64748b;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg></div>
          <div style="font-size: 0.9rem; font-weight: 800; color: #0f172a;">Persetujuan 1-Click di Aplikasi Atasan</div>
          <p style="font-size: 0.75rem; color: #64748b; line-height: 1.45; margin: 6px 0 14px 0;">
            Notifikasi prioritas darurat telah diteruskan ke perangkat <strong>${t.approverName}</strong>. Atasan dapat menyetujui langsung dari HP atau sistem web.
          </p>
          <button type="button" class="mobile-btn-primary" style="background: #059669; border-color: #059669; font-weight: 800; padding: 11px;" onclick="window.mobileSimulateApproverUnlock('${t.id}')">
            <span>Simulasikan Persetujuan Atasan</span>
          </button>
        </div>

        <!-- Tab 2: Passcode OTP -->
        <div id="mPaneEmgPass" style="display: none; text-align: center; padding: 6px 0;">
          <div style="margin-bottom: 6px; color: #64748b;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>
          <div style="font-size: 0.9rem; font-weight: 800; color: #0f172a;">Masukkan 6-Digit Sandi Otorisasi</div>
          <p style="font-size: 0.75rem; color: #64748b; margin: 4px 0 10px 0;">
            Minta 6-digit kode OTP darurat dari Atasan Anda:
          </p>
      
          <div style="margin-bottom: 14px;">
            <input type="text" id="mInputEmgPasscode" class="mobile-input" maxlength="6" placeholder="______" style="text-align: center; font-size: 1.4rem; letter-spacing: 8px; font-weight: 900; font-family: monospace; width: 190px; margin: 0 auto;">
          </div>
          <button type="button" class="mobile-btn-primary" style="font-weight: 800; padding: 11px;" onclick="window.mobileVerifyPasscodeUnlock('${t.id}')">
            <span>Verifikasi Sandi & Buka QR</span>
          </button>
        </div>

        <!-- Tab 3: Face Scan -->
        <div id="mPaneEmgFace" style="display: none; text-align: center; padding: 6px 0;">
          <div style="position: relative; width: 140px; height: 160px; margin: 0 auto 12px auto; border-radius: 50%; border: 3px dashed #059669; display: flex; align-items: center; justify-content: center; background: #0f172a; overflow: hidden;" id="mFaceScanRing">
            <div style="color: #64748b;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
            <div id="mFaceScanOverlay" style="position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(5,150,105,0.25); display:none;"></div>
          </div>
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
    const btnPass = document.getElementById('mTabBtnEmgPass');
    const btnFace = document.getElementById('mTabBtnEmgFace');
    const paneApp = document.getElementById('mPaneEmgApp');
    const panePass = document.getElementById('mPaneEmgPass');
    const paneFace = document.getElementById('mPaneEmgFace');

    if (btnApp) btnApp.classList.toggle('active', tab === 'app');
    if (btnPass) btnPass.classList.toggle('active', tab === 'passcode');
    if (btnFace) btnFace.classList.toggle('active', tab === 'facescan');

    if (paneApp) paneApp.style.display = tab === 'app' ? 'block' : 'none';
    if (panePass) panePass.style.display = tab === 'passcode' ? 'block' : 'none';
    if (paneFace) paneFace.style.display = tab === 'facescan' ? 'block' : 'none';
  };

  window.mobileAutoFillPasscode = function (code) {
    const input = document.getElementById('mInputEmgPasscode');
    if (input) {
      input.value = code;
      input.focus();
    }
  };

  function completeEmergencyUnlock(ticketId, method) {
    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;

    t.status = 'Disetujui';
    t.emergencyLocked = false;
    t.qrLocked = false;
    t.emergencyUnlockMethod = method;

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

  window.mobileVerifyPasscodeUnlock = function (ticketId) {
    const input = document.getElementById('mInputEmgPasscode');
    const val = (input?.value || '').trim();
    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;
    const targetCode = t.emergencyPasscode || '849201';

    if (!val || val !== targetCode) {
      if (typeof window.showToast === 'function') {
        window.showToast('Kode sandi tidak valid! Pastikan 6 digit kode dari Atasan sesuai.', 'danger');
      }
      if (input) input.focus();
      return;
    }

    completeEmergencyUnlock(ticketId, 'Input Kode Sandi / OTP');
  };

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
      <div class="mobile-sheet-header" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px;">
        <div>
          <span style="font-size: 0.675rem; color: #059669; font-weight: 700; text-transform: uppercase;">RINCIAN TIKET</span>
          <h3 class="mobile-sheet-title" style="font-family: monospace; font-size: 1rem; margin: 0; color: #0f172a;">${t.id}</h3>
        </div>
        <button type="button" aria-label="Tutup" class="mobile-sheet-close" style="width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; background: #f1f5f9; border: none; border-radius: 50%; font-size: 1.1rem; color: #64748b; cursor: pointer; padding: 0;" onclick="window.mobileCloseSheet()">✕</button>
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
    const isFinished = (t.status === 'Selesai' || t.status === 'Ditolak' || t.status === 'Dibatalkan' || t.status === 'Kedaluwarsa');
    const isPulang = (t.type === 'Pulang Mendahului' || t.returnType === 'Pulang Mendahului' || t.type === 'Pulang Lebih Awal');

    // BRULE-08 & BRULE-12: Hanya Karyawan pemilik tiket yang melihat tombol aksi pemilik
    const emp = getActiveEmp();
    const myActorNip = (emp && emp.nip) ? emp.nip : 'PK-2024-8841';
    const isOwner = (window.currentActor === 'karyawan' || !window.currentActor) && 
      (t.applicantNip === myActorNip || (!t.applicantNip && myActorNip === 'PK-2024-8841'));

    // Push state for Android / hardware back gesture
    try {
      window.history.pushState({ modalOpen: true, modalType: 'karyawanDetail', ticketId: t.id }, '');
    } catch (e) {}

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
        <div>
          <span style="font-size: 0.675rem; color: #059669; font-weight: 700; text-transform: uppercase;">RINCIAN TIKET</span>
          <h3 class="mobile-sheet-title" style="font-family: monospace; font-size: 1rem; margin: 0; color: #0f172a;">${t.id}</h3>
        </div>
        <button type="button" aria-label="Tutup" class="mobile-sheet-close" style="width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; background: #f1f5f9; border: none; border-radius: 50%; font-size: 1.1rem; color: #64748b; cursor: pointer; padding: 0;" onclick="window.mobileCloseSheet()">✕</button>
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
            <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; margin-bottom: 4px;">${isPulang ? 'WAKTU KELUAR' : 'WAKTU KELUAR & KEMBALI'}</div>
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

          ${t.approverNote ? `
           
          ` : ''}
        </div>

        <div id="mDetailSecJejak" style="display: none;">
          <div class="mobile-timeline">
            ${renderTimelineHtml(t)}
          </div>
        </div>

        <!-- Action buttons according to ticket status & role (Perubahan 5: Hanya Pemilik Karyawan yang melihat tombol aksi) -->
        ${isOwner ? `
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 8px;">
          ${isPending ? `
            <button type="button" class="mobile-btn-secondary mobile-btn-edit-solid" style="background: #2563eb; color: #ffffff; border: 1.5px solid #2563eb; min-height: 44px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileCloseSheet(); window.mobileOpenEditSheet('${t.id}')">
              Edit Pengajuan Ini
            </button>
            <button type="button" class="mobile-btn-danger mobile-btn-cancel-solid" style="background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; min-height: 44px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileCloseSheet(); window.mobileOpenCancelSheet('${t.id}')">
              Batalkan Izin Ini
            </button>
          ` : ''}
          ${isApproved || isOutside ? `
            <button type="button" class="mobile-btn-primary" style="background:#059669; border-color:#059669; min-height: 44px; font-weight: 700;" onclick="window.mobileCloseSheet(); window.mobileOpenQrModal('${t.id}')">
              Tampilkan QR Code Resmi
            </button>
          ` : ''}
          ${isApproved ? `
            <button type="button" class="mobile-btn-danger mobile-btn-cancel-solid" style="background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; min-height: 44px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileCloseSheet(); window.mobileOpenCancelSheet('${t.id}')">
              Batalkan Izin
            </button>
          ` : ''}
          ${isOutside ? `
            ${(t.extensionApproved || (t.extensionCount && t.extensionCount >= 1)) ? `
              <button type="button" class="mobile-btn-secondary" disabled style="background: #f8fafc; color: #94a3b8; border: 1.5px solid #e2e8f0; min-height: 44px; font-weight: 700; opacity: 0.85; cursor: not-allowed; border-radius: 8px; text-align: center;">
                Perpanjangan Telah Digunakan (Maks. 1x)
              </button>
            ` : (t.hasExtensionPending || (t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan')) ? `
              <button type="button" class="mobile-btn-secondary" disabled style="background: #fffbeb; color: #92400e; border: 1.5px solid #fde68a; min-height: 44px; font-weight: 700; opacity: 0.95; cursor: not-allowed; border-radius: 8px; text-align: center;">
                Menunggu Persetujuan Perpanjangan
              </button>
            ` : `
              <button type="button" class="mobile-btn-secondary mobile-btn-extend-solid" style="background: #d97706; color: #ffffff; border: 1.5px solid #d97706; min-height: 44px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileCloseSheet(); window.mobileOpenPerpanjanganModal('${t.id}')">
                Ajukan Perpanjangan Waktu
              </button>
            `}
            <button type="button" class="mobile-btn-primary" style="background: #059669; color: #ffffff; border: 1.5px solid #059669; min-height: 44px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 8px;" onclick="window.mobileCloseSheet(); window.mobileExecuteTapIn('${t.id}')">
              ✓ Tap In Kartu Akses (Masuk)
            </button>
          ` : ''}
          ${isFinished ? `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 0.75rem; color: #64748b; text-align: center; font-weight: 600;">
              Tiket selesai • QR Code tidak aktif
            </div>
            <button type="button" class="mobile-btn-danger" style="background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; font-weight: 700; min-height: 44px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.825rem; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.25); width: 100%; margin-top: 4px;" onclick="window.mobileDeleteTicketItem('${t.id}', 'karyawan')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              <span>Hapus Riwayat</span>
            </button>
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

    if (t.extensionApproved || (t.extensionCount && t.extensionCount >= 1)) {
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
            <input type="datetime-local" class="mobile-input" id="mPerpanjangNewTime" value="${defaultNewTime}" min="${formatDateTimeLocal(new Date(Math.max(Date.now(), currentReturn ? new Date(currentReturn).getTime() : Date.now()) + 5 * 60000))}" required onchange="const minVal = this.getAttribute('min'); if (this.value && minVal && this.value < minVal) { this.value = minVal; if (typeof window.showToast === 'function') window.showToast('Waktu perpanjangan tidak boleh di masa lampau!', 'warning'); }">
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
    const newTime = document.getElementById('mPerpanjangNewTime')?.value || '';
    const reason = (document.getElementById('mPerpanjangReason')?.value || '').trim();

    if (!newTime || !reason) {
      if (typeof window.showToast === 'function') window.showToast('Harap lengkapi waktu dan alasan perpanjangan!', 'warning');
      return;
    }

    const selDate = new Date(newTime);
    const nowTime = new Date();
    if (isNaN(selDate.getTime()) || selDate.getTime() <= nowTime.getTime()) {
      if (typeof window.showToast === 'function') {
        window.showToast('Waktu perpanjangan tidak boleh di masa lampau!', 'warning');
      } else {
        alert('Waktu perpanjangan tidak boleh di masa lampau!');
      }
      return;
    }

    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;

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

  window.mobileSwitchDonutPeriod = function (period) {
    mobileDonutPeriod = period;
    renderMobileKaryawan(null, 'dashboard');
  };
