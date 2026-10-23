/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Karyawan Module: Figma Exact Redesign with Dynamic Audit Trail & Timeline
 * - Dashboard Karyawan
 * - Pengajuan Saya
 * - Riwayat Pengajuan (List / Tabel)
 * - Riwayat Pengajuan (Card / Grid)
 */

window.empCurrentPage = 1;
window.empPageSize = 6;
window.currentEmpViewMode = window.currentEmpViewMode || 'card';

/**
 * Mendapatkan profil Karyawan yang sedang aktif dari master MOCK_USERS
 * Menyelesaikan bug sinkronisasi akun baru/pergantian pengguna (Moreno dsb.)
 */
function getCurrentEmployeeActor() {
  const users = window.MOCK_USERS || [];
  const activeEmp = users.find(u => (u.roleKey === 'karyawan' || (u.role && u.role.toLowerCase().includes('karyawan'))) && u.status === 'Aktif');
  if (activeEmp) {
    if (window.ACTORS && window.ACTORS.karyawan) {
      window.ACTORS.karyawan.name = activeEmp.name;
      window.ACTORS.karyawan.nip = activeEmp.nip;
      if (activeEmp.department) window.ACTORS.karyawan.department = activeEmp.department;
      if (activeEmp.role) window.ACTORS.karyawan.title = activeEmp.role;
    }
    return activeEmp;
  }
  return (window.ACTORS && window.ACTORS.karyawan) || {
    nip: 'PK-2024-8841',
    name: 'Budi Pratama, S.T.',
    title: 'Staf Rekayasa Mesin',
    department: 'Departemen Rekayasa & Pemeliharaan',
    approverName: 'Ir. Hendra Gunawan, M.T.'
  };
}
window.getCurrentEmployeeActor = getCurrentEmployeeActor;

function updateKaryawanMetrics() {
  const ticketsList = window.ticketsList || [];
  const empActor = getCurrentEmployeeActor();
  const myNip = empActor.nip || 'PK-2024-8841';

  // Batasi hanya tiket milik akun yang sedang aktif
  const myTickets = ticketsList.filter(t => t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841') || (myNip === 'PK-2024-8841' && (!t.applicantNip || t.applicantNip === 'PK-2024-8841')));
  const totalMonth = myTickets.length;

  const completedTickets = myTickets.filter(t => t.status === 'Selesai');
  const completedCount = completedTickets.length;
  const lateCompleted = completedTickets.filter(t => t.isLate || (t.approverNote && t.approverNote.toLowerCase().includes('terlambat'))).length;
  const onTimeCompleted = Math.max(0, completedCount - lateCompleted);

  const activeTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : null;
  const activeCount = activeTicket ? 1 : 0;

  const statEmpTotalMonth = document.getElementById('statEmpTotalMonth');
  const statEmpCompletedCount = document.getElementById('statEmpCompletedCount');
  const statEmpCompletedSub = document.getElementById('statEmpCompletedSub');
  const statEmpActiveCount = document.getElementById('statEmpActiveCount');
  const statEmpActiveSub = document.getElementById('statEmpActiveSub');

  if (statEmpTotalMonth) statEmpTotalMonth.textContent = totalMonth;
  if (statEmpCompletedCount) statEmpCompletedCount.textContent = completedCount;
  if (statEmpCompletedSub) {
    statEmpCompletedSub.textContent = `${onTimeCompleted} tepat waktu • ${lateCompleted} terlambat`;
  }
  if (statEmpActiveCount) statEmpActiveCount.textContent = activeCount;
  if (statEmpActiveSub) {
    if (activeCount > 0) {
      if (activeTicket.status === 'Terlambat') {
        statEmpActiveSub.innerHTML = '<span style="color:#b91c1c; font-weight:800;">⚠️ Terlambat Kembali</span>';
      } else {
        statEmpActiveSub.textContent = activeTicket.status === 'Sedang di Luar' ? 'Sedang di luar area' : activeTicket.status;
      }
    } else {
      statEmpActiveSub.textContent = 'Tidak ada izin aktif';
    }
  }

  // Sidebar Badge
  const sidebarEmpActiveBadge = document.getElementById('sidebarEmpActiveBadge');
  if (sidebarEmpActiveBadge) {
    sidebarEmpActiveBadge.textContent = activeCount;
    sidebarEmpActiveBadge.style.display = activeCount > 0 ? 'inline-block' : 'none';
  }
  const bnavEmpActiveBadge = document.getElementById('bnavEmpActiveBadge');
  if (bnavEmpActiveBadge) {
    bnavEmpActiveBadge.textContent = activeCount;
    bnavEmpActiveBadge.style.display = activeCount > 0 ? 'inline-block' : 'none';
  }
}

function filterEmpTickets() {
  const ticketsList = window.ticketsList || [];
  const searchEmpInput = document.getElementById('searchEmpInput');
  const filterEmpPeriod = document.getElementById('filterEmpPeriod');
  const filterEmpCategory = document.getElementById('filterEmpCategory');
  const filterEmpType = document.getElementById('filterEmpType');
  const filterEmpStatus = document.getElementById('filterEmpStatus');

  const empActor = getCurrentEmployeeActor();
  const myNip = empActor.nip || 'PK-2024-8841';

  const query = searchEmpInput ? searchEmpInput.value.trim().toLowerCase() : '';
  const period = filterEmpPeriod ? filterEmpPeriod.value : 'all';
  const category = filterEmpCategory ? filterEmpCategory.value : 'all';
  const type = filterEmpType ? filterEmpType.value : 'all';
  const status = filterEmpStatus ? filterEmpStatus.value : 'all';

  // Status resmi yang diizinkan untuk Riwayat Pengajuan
  const RIWAYAT_STATUSES = ['selesai', 'terlambat', 'ditolak', 'kedaluwarsa', 'kadaluwarsa', 'dibatalkan'];

  const filtered = ticketsList.filter(t => {
    // 0. Batasi ke akun yang sedang aktif
    const isMyTicket = t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841') || (myNip === 'PK-2024-8841' && (!t.applicantNip || t.applicantNip === 'PK-2024-8841'));
    if (!isMyTicket) return false;

    // HANYA tiket berstatus riwayat yang diizinkan (mengecualikan status aktif seperti Menunggu Persetujuan, Menunggu Otorisasi Darurat, Disetujui, Sedang di Luar)
    const tStatusNorm = (t.status || '').toLowerCase().trim();
    const isRiwayat = RIWAYAT_STATUSES.includes(tStatusNorm) || !!t.isLate;
    if (!isRiwayat) return false;

    // 1. Dropdown Filters
    if (category !== 'all' && t.category !== category) return false;
    if (type !== 'all' && t.type !== type) return false;

    // Status Filter:
    if (status !== 'all') {
      if (status === 'Terlambat') {
        const isLate = t.status === 'Terlambat' || !!t.isLate || (t.approverNote && t.approverNote.toLowerCase().includes('terlambat'));
        if (!isLate) return false;
      } else if (status === 'Kedaluwarsa') {
        if (tStatusNorm !== 'kedaluwarsa' && tStatusNorm !== 'kadaluwarsa') return false;
      } else if (status === 'Ditolak') {
        if (!tStatusNorm.includes('tolak')) return false;
      } else if (status === 'Dibatalkan') {
        if (!tStatusNorm.includes('batal')) return false;
      } else if (status === 'Selesai') {
        if (tStatusNorm !== 'selesai' || t.isLate) return false;
      } else {
        if (t.status !== status) return false;
      }
    }

    // 2. Period Filter
    if (typeof window.matchesPeriodFilter === 'function' && !window.matchesPeriodFilter(t, period)) {
      return false;
    }

    // 3. Search input
    if (query) {
      const matchId = (t.id || '').toLowerCase().includes(query);
      const matchReason = (t.reason || '').toLowerCase().includes(query);
      const matchDest = (t.destination || '').toLowerCase().includes(query);
      if (!matchId && !matchReason && !matchDest) return false;
    }


    return true;
  });

  // Sorting Riwayat (Terbaru / Terlama)
  const sortEmpEl = document.getElementById('sortEmpRiwayat');
  const sortEmpOrder = sortEmpEl ? sortEmpEl.value : 'desc';

  filtered.sort((a, b) => {
    const parseTime = (item) => {
      const raw = item.createdAt || item.plannedExit || 0;
      const d = new Date(raw);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };
    const tA = parseTime(a);
    const tB = parseTime(b);
    return sortEmpOrder === 'asc' ? tA - tB : tB - tA;
  });

  return filtered;
}

/**
 * Dynamic Timeline Builder based on real ticket lifecycle
 */
function buildActivePermitTimeline(activeTicket) {
  if (!activeTicket) return '';

  const status = activeTicket.status;
  const isEmergency = activeTicket.isEmergency || (activeTicket.id && activeTicket.id.startsWith('TK-EMG'));
  const plannedTimeStr = activeTicket.plannedExit ? activeTicket.plannedExit.slice(11, 16) + ' WIB' : '10.00 WIB';
  const returnTimeStr = activeTicket.estimatedReturn ? activeTicket.estimatedReturn.slice(11, 16) + ' WIB' : '13.00 WIB';
  const isOneWay = activeTicket.type === 'Pulang Mendahului';

  // Extract events if recorded in activeTicket.timeline
  const timelineList = activeTicket.timeline || [];
  const eventDibuat = timelineList.find(e => e.event && (e.event.toLowerCase().includes('diajukan') || e.event.toLowerCase().includes('dibuat')));
  const eventDisetujui = timelineList.find(e => e.event && (e.event.toLowerCase().includes('disetujui') || e.event.toLowerCase().includes('otorisasi')));
  const eventScanOut = timelineList.find(e => e.event && e.event.toLowerCase().includes('scan out'));
  const eventScanIn = timelineList.find(e => e.event && e.event.toLowerCase().includes('scan in'));

  const timeCreated = eventDibuat ? eventDibuat.time : (activeTicket.createdAt || 'Baru saja diajukan');
  const timeApproved = eventDisetujui ? eventDisetujui.time : (activeTicket.approvedAt || 'Menunggu verifikasi');
  const timeScanOut = eventScanOut ? eventScanOut.time : (activeTicket.scanOutTime ? activeTicket.scanOutTime.replace(/ \(Pos 1.*\)/, '') : `Rencana ${plannedTimeStr}`);
  const timeScanIn = eventScanIn ? eventScanIn.time : (activeTicket.scanInTime ? activeTicket.scanInTime.replace(/ \(Pos 1.*\)/, '') : `Batas ${returnTimeStr}`);

  // Status flags
  const isPending = (status === 'Menunggu Persetujuan' || status === 'Menunggu Otorisasi Darurat');
  const isApproved = (status === 'Disetujui');
  const isOutside = (status === 'Sedang di Luar' || status === 'Terlambat');
  const isCompleted = (status === 'Selesai');
  const isRejected = (status === 'Ditolak');

  let steps = [];

  // STEP 1: Pengajuan diajukan
  steps.push({
    title: isEmergency ? 'Pengajuan Darurat diajukan' : 'Pengajuan diajukan',
    time: timeCreated,
    desc: `${activeTicket.category} • ${activeTicket.type}`,
    state: 'completed'
  });

  // STEP 2: Persetujuan Atasan
  if (isPending) {
    steps.push({
      title: isEmergency ? 'Menunggu Otorisasi Darurat' : 'Menunggu persetujuan atasan',
      time: 'Sedang berlangsung',
      desc: `Menunggu tinjauan & keputusan dari ${activeTicket.approverName || 'Atasan Langsung'}`,
      state: 'active_pending'
    });
  } else if (isRejected) {
    steps.push({
      title: 'Pengajuan Ditolak Atasan',
      time: timeApproved,
      desc: activeTicket.rejectionReason || activeTicket.approverNote || 'Alasan tidak disetujui',
      state: 'rejected'
    });
  } else {
    steps.push({
      title: isEmergency ? 'Otorisasi Darurat Disetujui' : 'Disetujui oleh atasan',
      badge: '• Disetujui',
      time: timeApproved,
      desc: `${activeTicket.approverName || 'Ir. Hendra Gunawan, M.T.'}${activeTicket.approverTitle ? ' • ' + activeTicket.approverTitle : ''}`,
      state: 'completed'
    });
  }

  // STEP 3: Scan Out Pos Jaga
  if (isPending || isRejected) {
    steps.push({
      title: 'Scan Out tercatat di Pos 1',
      time: `Rencana ${plannedTimeStr}`,
      desc: isRejected ? 'Dibatalkan karena izin ditolak' : 'Menunggu persetujuan atasan sebelum scan gerbang',
      state: 'upcoming'
    });
  } else if (isApproved) {
    steps.push({
      title: 'Siap Scan Out di Pos 1 Gerbang Utama',
      time: `Jadwal: ${plannedTimeStr}`,
      desc: 'Tunjukkan QR Code digital kepada petugas satpam di gerbang',
      state: 'active_ready'
    });
  } else {
    steps.push({
      title: 'Scan Out tercatat',
      time: timeScanOut,
      desc: 'Pos 1 • Karyawan meninggalkan area operasional',
      state: 'completed'
    });
  }

  // STEP 4: Tap In Kembali (or Pulang Mendahului)
  if (isOneWay) {
    steps.push({
      title: 'Pulang Mendahului',
      time: plannedTimeStr,
      desc: 'Izin pulang selesai jam kerja, tidak perlu kembali ke area pabrik',
      state: (isOutside || isCompleted) ? 'completed' : 'upcoming'
    });
  } else {
    if (isCompleted) {
      steps.push({
        title: 'Tap In Kartu Akses tercatat',
        time: timeScanIn,
        desc: activeTicket.isLate ? 'Karyawan kembali ke area pabrik via Tap In (Terlambat)' : 'Pos 1 • Karyawan kembali ke area pabrik tepat waktu via Tap In',
        state: 'completed'
      });
    } else if (isOutside) {
      steps.push({
        title: status === 'Terlambat' ? 'Tap In Terlambat (Segera ke Pos 1)' : 'Batas kembali ' + returnTimeStr,
        time: status === 'Terlambat' ? '⚠️ Melewati batas estimasi' : 'Tap In Kartu di Pos 1',
        desc: status === 'Terlambat' ? 'Segera lakukan Tap In Kartu Akses di Pos 1 Gerbang Utama!' : 'Belum kembali ke area',
        state: status === 'Terlambat' ? 'active_overdue' : 'active_outside'
      });
    } else {
      steps.push({
        title: 'Batas kembali ' + returnTimeStr,
        time: 'Tap In Kartu di Pos 1',
        desc: 'Belum kembali ke area',
        state: 'upcoming'
      });
    }
  }

  // Render steps to HTML with dynamic dots and lines
  return `
    <div style="display: flex; flex-direction: column; gap: 1.15rem; position: relative; padding-left: 1.5rem; margin-top: 0.5rem;">
      <div style="position: absolute; left: 6px; top: 8px; bottom: 8px; width: 2px; background: #e2e8f0;"></div>
      ${steps.map((st) => {
    let dotStyle = 'background: #1d68d8; border: 2.5px solid #ffffff;';
    let opacity = '1';
    let titleColor = '#0f172a';

    if (st.state === 'completed') {
      dotStyle = 'background: #10b981; border: 2.5px solid #ffffff; box-shadow: 0 0 0 2px #10b981;';
    } else if (st.state === 'active_pending') {
      dotStyle = 'background: #f59e0b; border: 2.5px solid #ffffff; box-shadow: 0 0 0 2px #f59e0b;';
      titleColor = '#b45309';
    } else if (st.state === 'active_ready') {
      dotStyle = 'background: #1d68d8; border: 2.5px solid #ffffff; box-shadow: 0 0 0 2px #1d68d8;';
      titleColor = '#1d68d8';
    } else if (st.state === 'active_outside') {
      dotStyle = 'background: #9333ea; border: 2.5px solid #ffffff; box-shadow: 0 0 0 2px #9333ea;';
      titleColor = '#7e22ce';
    } else if (st.state === 'active_overdue' || st.state === 'rejected') {
      dotStyle = 'background: #dc2626; border: 2.5px solid #ffffff; box-shadow: 0 0 0 2px #dc2626;';
      titleColor = '#dc2626';
    } else if (st.state === 'upcoming') {
      dotStyle = 'background: #ffffff; border: 2.5px solid #cbd5e1;';
      opacity = '0.55';
    }

    return `
          <div style="position: relative; opacity: ${opacity};">
            <div style="position: absolute; left: -1.5rem; top: 4px; width: 14px; height: 14px; border-radius: 50%; ${dotStyle}"></div>
            <div style="font-size: 0.7rem; color: #64748b; font-weight: 600;">${st.time}</div>
            <div style="display: flex; align-items: center; gap: 0.4rem; margin-top: 1px;">
              <span style="font-size: 0.825rem; font-weight: 800; color: ${titleColor};">${st.title}</span>
              ${st.badge ? `<span class="status-pill-green" style="font-size: 0.65rem; padding: 1px 6px;">${st.badge}</span>` : ''}
            </div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px; line-height: 1.35;">${st.desc}</div>
          </div>
        `;
  }).join('')}
    </div>
  `;
}

/**
 * 1. DASHBOARD KARYAWAN (FIGMA SCREEN 1)
 */
function renderKaryawanDashboard() {
  updateKaryawanMetrics();

  const activeTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : null;
  const figmaHeroStrip = document.getElementById('figmaHeroStrip');
  const cardActivePermitSummary = document.getElementById('cardActivePermitSummary');
  const karyawanDashboardRecentList = document.getElementById('karyawanDashboardRecentList');
  const ticketsList = window.ticketsList || [];
  const empActor = getCurrentEmployeeActor();
  const myNip = empActor.nip || 'PK-2024-8841';

  // Perbarui ucapan selamat datang di banner hero secara dinamis (sesuai akun login aktif)
  const empHeroGreeting = document.getElementById('empHeroGreeting');
  const empHeroSub = document.getElementById('empHeroSub');
  if (empHeroGreeting) {
    const nowH = new Date().getHours();
    let timeGreeting = 'pagi';
    if (nowH >= 11 && nowH < 15) timeGreeting = 'siang';
    else if (nowH >= 15 && nowH < 18) timeGreeting = 'sore';
    else if (nowH >= 18 || nowH < 5) timeGreeting = 'malam';
    empHeroGreeting.textContent = `Selamat ${timeGreeting}, ${empActor.name} 👋`;
  }
  if (empHeroSub) {
    const title = empActor.role || empActor.title || 'Staf Rekayasa Mesin';
    const dept = empActor.department || 'Departemen Rekayasa & Pemeliharaan';
    const approver = (window.ACTORS && window.ACTORS.karyawan && window.ACTORS.karyawan.approverName) || 'Ir. Hendra Gunawan, M.T.';
    empHeroSub.textContent = `${title} • ${dept} • Atasan: ${approver}`;
  }

  // 1.1 Hero Strip
  if (figmaHeroStrip) {
    if (activeTicket) {
      let statusPill = `<span class="status-pill-purple">• ${activeTicket.status}</span>`;
      let statusText = `Status: Izin Aktif - ${activeTicket.id}`;
      let statusSub = `${activeTicket.category} • Batas kembali ${activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : '13.00 WIB'}`;

      if (activeTicket.status === 'Menunggu Persetujuan' || activeTicket.status === 'Menunggu Otorisasi Darurat') {
        statusPill = `<span class="status-pill-amber">• Menunggu Persetujuan</span>`;
        statusText = `Status: Izin Diajukan - ${activeTicket.id}`;
        statusSub = `${activeTicket.category} • Menunggu Persetujuan Atasan (${activeTicket.approverName || 'Ir. Hendra Gunawan, M.T.'})`;
      } else if (activeTicket.status === 'Disetujui') {
        statusPill = `<span class="status-pill-green">• Disetujui</span>`;
        statusText = `Status: Izin Disetujui - ${activeTicket.id}`;
        statusSub = `${activeTicket.category} • QR Siap Digunakan di Pos 1 • Jadwal Keluar ${activeTicket.plannedExit ? activeTicket.plannedExit.slice(11, 16) + ' WIB' : ''}`;
      } else if (activeTicket.status === 'Terlambat') {
        statusPill = `<span class="status-pill-red" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-weight:800; padding:2px 8px; border-radius:999px;">⚠️ Terlambat</span>`;
        statusText = `Status: Terlambat Kembali - ${activeTicket.id}`;
        statusSub = `${activeTicket.category} • Batas waktu ${activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : ''} TELAH TERLEWAT! Segera Tap In Kartu Akses di Pos 1.`;
      } else if (activeTicket.status === 'Sedang di Luar') {
        statusPill = `<span class="status-pill-purple">• Sedang di Luar</span>`;
        statusText = `Status: Izin Aktif - ${activeTicket.id}`;
        statusSub = `${activeTicket.category} • Scan Out ${activeTicket.scanOutTime ? activeTicket.scanOutTime.replace(/ \(Pos 1.*\)/, '') : '10.05 WIB'} • Batas kembali ${activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : '13.00 WIB'}`;
      }

      figmaHeroStrip.innerHTML = `
        <div class="hero-strip-left">
          ${statusPill}
          <span class="hero-strip-text">${statusText}</span>
          <span class="hero-strip-sub">${statusSub}</span>
        </div>
        <button class="btn-hero-action" onclick="setKaryawanNav('pengajuan')">
          Pengajuan Saya →
        </button>
      `;
    } else {
      figmaHeroStrip.innerHTML = `
        <div class="hero-strip-left">
          <span class="status-pill-green">• Siap Beroperasi</span>
          <span class="hero-strip-text">Status: Tidak Ada Perizinan Aktif</span>
          <span class="hero-strip-sub">
          
          Ajukan izin bila hendak meninggalkan area.</span>
        </div>
        <button class="btn-hero-action" onclick="setKaryawanNav('pengajuan')">
          + Buat Pengajuan
        </button>
      `;
    }
  }

  // 1.2 Card: Izin aktif saya
  if (cardActivePermitSummary) {
    if (activeTicket) {
      const isEmergTicket = Boolean(
        activeTicket.isEmergency ||
        activeTicket.status === 'Menunggu Otorisasi Darurat' ||
        (activeTicket.id && (activeTicket.id.includes('-EMG-') || activeTicket.id.startsWith('TK-EMG-')))
      );
      const isEmergLocked = isEmergTicket && (
        activeTicket.status === 'Menunggu Otorisasi Darurat' ||
        activeTicket.emergencyLocked === true ||
        activeTicket.qrLocked === true ||
        (activeTicket.status !== 'Disetujui' && activeTicket.status !== 'Sedang di Luar' && activeTicket.status !== 'Selesai')
      );
      const isPending = (activeTicket.status === 'Menunggu Persetujuan' || activeTicket.status === 'Menunggu Otorisasi Darurat');
      const isApproved = (activeTicket.status === 'Disetujui');
      const isOutside = (activeTicket.status === 'Sedang di Luar' || activeTicket.status === 'Terlambat');

      const col1Label = (isOutside && activeTicket.scanOutTime) ? 'Scan Out • Pos 1' : 'Jadwal Keluar';
      const col1Val = (isOutside && activeTicket.scanOutTime) ? activeTicket.scanOutTime.replace(/ \(Pos 1.*\)/, '') : (activeTicket.plannedExit ? window.formatDisplayDate(activeTicket.plannedExit) : '-');
      const col2Label = activeTicket.type === 'Pulang Mendahului' ? 'Tipe Kepulangan' : 'Batas kembali';
      const col2Val = activeTicket.type === 'Pulang Mendahului' 
        ? 'Pulang Mendahului' 
        : (activeTicket.estimatedReturn 
            ? (activeTicket.status === 'Terlambat' 
                ? `<span style="color:#dc2626; font-weight:800;">${window.formatDisplayDate(activeTicket.estimatedReturn)} (Terlewat)</span>` 
                : window.formatDisplayDate(activeTicket.estimatedReturn)) 
            : '-');

      let actionButtonsHtml = '';
      if (isEmergLocked) {
        actionButtonsHtml = `
          <button class="btn-figma-primary" style="background:#be123c; border-color:#be123c; box-shadow: 0 4px 12px rgba(190, 18, 60, 0.35); font-weight: 700;" onclick="window.openEmergencyUnlockModal('${activeTicket.id}')">
            <span>⚡ Otorisasi Darurat (Input Sandi / Scan Wajah)</span>
          </button>
          <button class="btn-figma-secondary" onclick="window.openEditTicketModal('${activeTicket.id}')">
            <span>✏️ Edit Pengajuan</span>
          </button>
          <button class="btn-figma-secondary" onclick="openTicketDetail('${activeTicket.id}', 'detail')">
            <span>Lihat Rincian</span>
          </button>
          <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
            <span>Batalkan Izin</span>
          </button>
        `;
      } else if (isPending) {
        actionButtonsHtml = `
          <button class="btn-figma-secondary" onclick="window.openEditTicketModal('${activeTicket.id}')">
            <span>✏️ Edit Pengajuan</span>
          </button>
          <button class="btn-figma-primary" onclick="openTicketDetail('${activeTicket.id}', 'detail')">
            <span>Lihat Rincian</span>
          </button>
          <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
            <span>Batalkan Izin</span>
          </button>
        `;
      } else if (isApproved) {
        actionButtonsHtml = `
          <button class="btn-figma-primary" onclick="openTicketDetail('${activeTicket.id}', 'qr')">
            <span>Buka QR Izin</span>
          </button>
          <button class="btn-figma-secondary" onclick="openTicketDetail('${activeTicket.id}', 'detail')">
            <span>Lihat Rincian</span>
          </button>
          <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
            <span>Batalkan</span>
          </button>
        `;
      } else if (isOutside) {
        const hasPendingExt = activeTicket.pendingExtension && activeTicket.pendingExtension.status === 'Menunggu Persetujuan';
        actionButtonsHtml = `
          <button class="btn-figma-primary" onclick="openTicketDetail('${activeTicket.id}', 'qr')">
            <span>Buka QR Izin</span>
          </button>
          ${hasPendingExt ? `
            <button class="btn-figma-secondary" style="background:#fef3c7; color:#92400e; border-color:#fde68a; font-weight:700;" onclick="openPendingExtensionDetailModal('${activeTicket.id}')">
              <span>⏱️ Detail Ajukan Perpanjangan</span>
            </button>
          ` : `
            <button class="btn-figma-secondary" onclick="openExtendDurationModal('${activeTicket.id}')">
              <span>Ajukan Perpanjangan</span>
            </button>
          `}
          <button class="btn-figma-secondary" style="background:#059669; color:#ffffff; border-color:#059669;" onclick="executeScanIn('${activeTicket.id}')">
            <span>✓ Tap In Kartu Akses (Masuk)</span>
          </button>
        `;
      }

      const isEmergency = activeTicket.isEmergency || (activeTicket.id && activeTicket.id.includes('-EMG-')) || activeTicket.status === 'Menunggu Otorisasi Darurat';

      cardActivePermitSummary.innerHTML = `
        <div class="figma-card-header">
          <h3 class="figma-card-title" style="display: flex; align-items: center; gap: 0.4rem;">
            <span>Izin aktif saya</span>
            ${isEmergency ? `<span class="tag-badge" style="background:#ffe4e6; color:#9f1239; border:1.5px solid #fecdd3; font-weight:800; font-size:0.7rem; padding:2px 8px; border-radius:999px;">🚨 DARURAT</span>` : ''}
          </h3>
          <a href="#" class="figma-card-link" onclick="openTicketDetail('${activeTicket.id}', 'detail'); return false;">Rincian</a>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;">
          <div>
            <div style="font-size: 1.05rem; font-weight: 800; font-family: var(--font-mono); color: #0f172a; display: flex; align-items: center; gap: 0.4rem;">
              <span>${activeTicket.id}</span>
              ${isEmergency ? `<span style="font-size: 0.725rem; color: #be123c; font-weight: 700;">[IZIN DARURAT]</span>` : ''}
            </div>
            <div style="font-size: 0.8rem; color: #475569; margin-top: 4px; font-weight: 600;">${activeTicket.category} • ${activeTicket.type}</div>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">${activeTicket.destination} • ${activeTicket.reason}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            ${isEmergency ? `<span class="tag-badge" style="background:#fee2e2; color:#b91c1c; font-weight:800; font-size:0.7rem; border:1px solid #fca5a5;">🚨 DARURAT</span>` : ''}
            ${window.getStatusPill(activeTicket.status)}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid #f1f5f9;">
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${col1Label}</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${col1Val}</div>
          </div>
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${col2Label}</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${col2Val}</div>
          </div>
        </div>

        ${isEmergLocked ? `
          <div style="background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 8px; padding: 0.75rem 0.95rem; margin-top: 0.85rem; font-size: 0.775rem;">
            <div style="font-weight: 800; color: #9f1239; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
              <span>🚨 Izin Darurat Menunggu Otorisasi</span>
              <span class="tag-badge" style="background: #ffe4e6; color: #9f1239; font-weight: 800; border: 1px solid #fecdd3;">QR Terkunci</span>
            </div>
            <div style="color: #881337; margin-top: 0.3rem; line-height: 1.45;">
              Sesuai SOP K3, QR Code terkunci sampai diotorisasi. Hubungi Atasan untuk meminta <strong>Kode Sandi OTP</strong> atau gunakan <strong>Scan Wajah</strong> langsung.
            </div>
          </div>
        ` : ''}

        ${activeTicket.status === 'Terlambat' ? `
          <div style="background: #fef2f2; border: 1.5px solid #fecdd3; border-radius: 8px; padding: 0.75rem 0.95rem; margin-top: 0.85rem; font-size: 0.775rem;">
            <div style="font-weight: 800; color: #991b1b; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
              <span>⚠️ PERINGATAN KETERLAMBATAN</span>
              <span class="tag-badge" style="background: #fee2e2; color: #b91c1c; font-weight: 800; border: 1px solid #fca5a5;">Status: Terlambat</span>
            </div>
            <div style="color: #7f1d1d; margin-top: 0.3rem; line-height: 1.45;">
              Waktu perkiraan kembali telah terlampaui. Segera lakukan <strong>Tap In Kartu Akses di Pos 1 Gerbang Utama</strong> atau ajukan <strong>Perpanjangan Waktu</strong> jika masih memerlukan durasi dinas tambahan.
            </div>
          </div>
        ` : ''}

        <div style="display: flex; gap: 0.5rem; margin-top: 1.15rem; flex-wrap: wrap;">
          ${actionButtonsHtml}
        </div>
      `;
    } else {
      cardActivePermitSummary.innerHTML = `
        <div class="figma-card-header">
          <h3 class="figma-card-title">Izin aktif saya</h3>
        </div>
        <div style="padding: 1.5rem 0.5rem; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🏢</div>
          <div style="font-size: 0.95rem; font-weight: 700; color: #0f172a;">Tidak Ada Perizinan Aktif</div>
          <p style="font-size: 0.8rem; color: #64748b; margin-top: 4px; max-width: 320px; margin-left: auto; margin-right: auto; margin-bottom: 1.25rem;">
            Anda sedang berada di kawasan operasional pabrik.
          </p>
          <button class="btn-figma-primary" onclick="setKaryawanNav('pengajuan')" style="font-size: 0.825rem; padding: 0.5rem 1rem;">
            Buka Pengajuan Saya →
          </button>
        </div>
      `;
    }
  }

  // 1.3 Card: Pengajuan terbaru (2 Completed recent tickets)
  if (karyawanDashboardRecentList) {
    const completedItems = ticketsList.filter(t =>
      (t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841')) &&
      t.status === 'Selesai'
    ).slice(0, 2);

    if (completedItems.length === 0) {
      karyawanDashboardRecentList.innerHTML = `
        <div style="padding: 1rem 0; text-align: center; color: #94a3b8; font-size: 0.8rem;">
          Belum ada riwayat pengajuan selesai.
        </div>
      `;
    } else {
      karyawanDashboardRecentList.innerHTML = completedItems.map((t, idx) => {
        const exitHour = t.plannedExit ? t.plannedExit.slice(11, 16) : '09.00';
        const returnHour = t.estimatedReturn ? t.estimatedReturn.slice(11, 16) : '11.00';
        const timeSpan = `${exitHour}–${returnHour} WIB`;
        const dayMonth = t.createdAt ? t.createdAt.slice(0, 6) : '16 Okt';

        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 0; ${idx < completedItems.length - 1 ? 'border-bottom: 1px solid #f1f5f9;' : ''} gap: 0.75rem; flex-wrap: wrap;">
            <div>
              <div style="font-size: 0.85rem; font-weight: 800; font-family: var(--font-mono); color: #0f172a;">${t.id}</div>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">${dayMonth} • ${t.category}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-size: 0.775rem; color: #475569; font-weight: 600;">${timeSpan}</span>
              <span class="status-pill-green">• Selesai</span>
              <a href="#" class="figma-card-link" onclick="openTicketDetail('${t.id}', 'detail'); return false;">Rincian</a>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 1.4 Donut Chart: Status Izin Saya
  renderKaryawanDonutChart();
}

/**
 * Render Donut Chart SVG matching Figma Screen 1 & User Screenshot
 */
function renderKaryawanDonutChart() {
  if (typeof window.renderKaryawanDonutChart === 'function' && window.renderKaryawanDonutChart !== renderKaryawanDonutChart) {
    return window.renderKaryawanDonutChart();
  }
}

/**
 * 2. PENGAJUAN SAYA (FIGMA SCREEN 2)
 */
function renderPengajuanSayaView() {
  const activeTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : null;
  const colPengajuanLeft = document.getElementById('colPengajuanLeft');
  const colPengajuanRight = document.getElementById('colPengajuanRight');
  const activePermitBanner = document.getElementById('activePermitBanner');
  const activePermitBannerText = document.getElementById('activePermitBannerText');
  const emptyEmpActiveBox = document.getElementById('emptyEmpActiveBox');

  if (!activeTicket) {
    if (activePermitBanner) activePermitBanner.style.display = 'none';
    if (colPengajuanLeft) colPengajuanLeft.style.display = 'none';
    if (colPengajuanRight) colPengajuanRight.style.display = 'none';
    if (emptyEmpActiveBox) emptyEmpActiveBox.style.display = 'flex';
    return;
  }

  if (emptyEmpActiveBox) emptyEmpActiveBox.style.display = 'none';
  if (colPengajuanLeft) colPengajuanLeft.style.display = 'flex';
  if (colPengajuanRight) colPengajuanRight.style.display = 'flex';

  // Dynamic Banner text based on ticket status
  if (activePermitBanner) {
    activePermitBanner.style.display = 'flex';
    if (activePermitBannerText) {
      if (activeTicket.status === 'Menunggu Persetujuan' || activeTicket.status === 'Menunggu Otorisasi Darurat') {
        activePermitBannerText.textContent = `Pengajuan izin baru sedang menunggu persetujuan atasan. Pengajuan baru ditangguhkan selama ada perizinan aktif.`;
      } else if (activeTicket.status === 'Disetujui') {
        activePermitBannerText.textContent = `Izin Anda telah disetujui atasan. Tunjukkan QR Code pada petugas di Pos 1 saat hendak meninggalkan kawasan pabrik.`;
      } else if (activeTicket.status === 'Sedang di Luar') {
        activePermitBannerText.textContent = `Anda sedang di luar area. Pengajuan baru dikunci selama izin aktif. Batas kembali ${activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : '13.00 WIB'}.`;
      } else if (activeTicket.status === 'Terlambat') {
        activePermitBannerText.textContent = `⚠️ PERINGATAN: Melewati batas jam estimasi kembali! Segera ke Pos 1 untuk melakukan Scan In.`;
      } else {
        activePermitBannerText.textContent = `Status izin aktif: ${activeTicket.status} (${activeTicket.id}).`;
      }
    }
  }

  // Left Column
  if (colPengajuanLeft) {
    const isEmergTicket = Boolean(
      activeTicket.isEmergency ||
      activeTicket.status === 'Menunggu Otorisasi Darurat' ||
      (activeTicket.id && (activeTicket.id.includes('-EMG-') || activeTicket.id.startsWith('TK-EMG-')))
    );
    const isEmergLocked = isEmergTicket && (
      activeTicket.status === 'Menunggu Otorisasi Darurat' ||
      activeTicket.emergencyLocked === true ||
      activeTicket.qrLocked === true ||
      (activeTicket.status !== 'Disetujui' && activeTicket.status !== 'Sedang di Luar' && activeTicket.status !== 'Selesai')
    );
    const isPending = (activeTicket.status === 'Menunggu Persetujuan' || activeTicket.status === 'Menunggu Otorisasi Darurat');
    const isApproved = (activeTicket.status === 'Disetujui');
    const isOutside = (activeTicket.status === 'Sedang di Luar' || activeTicket.status === 'Terlambat');

    const col1Label = (isOutside && activeTicket.scanOutTime) ? 'Scan Out • Pos 1' : 'Jadwal Keluar';
    const col1Val = (isOutside && activeTicket.scanOutTime) ? activeTicket.scanOutTime.replace(/ \(Pos 1.*\)/, '') : (activeTicket.plannedExit ? window.formatDisplayDate(activeTicket.plannedExit) : '-');
    const col2Label = activeTicket.type === 'Pulang Mendahului' ? 'Tipe Kepulangan' : 'Batas kembali';
    const col2Val = activeTicket.type === 'Pulang Mendahului' ? 'Pulang Mendahului' : (activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : '-');

    let actionButtonsHtml = '';
    if (isEmergLocked) {
      actionButtonsHtml = `
        <button class="btn-figma-primary" style="background:#be123c; border-color:#be123c; box-shadow: 0 4px 12px rgba(190, 18, 60, 0.35); font-weight: 700;" onclick="window.openEmergencyUnlockModal('${activeTicket.id}')">
          <span>⚡ Otorisasi Darurat (Input Sandi / Scan Wajah)</span>
        </button>
        <button class="btn-figma-secondary" onclick="window.openEditTicketModal('${activeTicket.id}')">
          <span>✏️ Edit Pengajuan</span>
        </button>
        <button class="btn-figma-secondary" onclick="openTicketDetail('${activeTicket.id}', 'detail')">
          <span>Lihat Rincian</span>
        </button>
        <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
          <span>Batalkan Izin</span>
        </button>
      `;
    } else if (isPending) {
      actionButtonsHtml = `
        <button class="btn-figma-secondary" onclick="window.openEditTicketModal('${activeTicket.id}')">
          <span>✏️ Edit Pengajuan</span>
        </button>
        <button class="btn-figma-primary" onclick="openTicketDetail('${activeTicket.id}', 'detail')">
          <span>Lihat Rincian</span>
        </button>
        <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
          <span>Batalkan Izin</span>
        </button>
      `;
    } else if (isApproved) {
      actionButtonsHtml = `
        <button class="btn-figma-primary" onclick="openTicketDetail('${activeTicket.id}', 'qr')">
          <span>Buka QR Izin</span>
        </button>
        <button class="btn-figma-secondary" onclick="openTicketDetail('${activeTicket.id}', 'detail')">
          <span>Lihat Rincian</span>
        </button>
        <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
          <span>Batalkan</span>
        </button>
      `;
    } else if (isOutside) {
      const hasPendingExt = activeTicket.pendingExtension && activeTicket.pendingExtension.status === 'Menunggu Persetujuan';
      actionButtonsHtml = `
        <button class="btn-figma-primary" onclick="openTicketDetail('${activeTicket.id}', 'qr')">
          <span>Buka QR Izin</span>
        </button>
        ${hasPendingExt ? `
          <button class="btn-figma-secondary" style="background:#fef3c7; color:#92400e; border-color:#fde68a; font-weight:700;" onclick="openPendingExtensionDetailModal('${activeTicket.id}')">
            <span>⏱️ Detail Ajukan Perpanjangan</span>
          </button>
        ` : `
          <button class="btn-figma-secondary" onclick="openExtendDurationModal('${activeTicket.id}')">
            <span>Ajukan Perpanjangan</span>
          </button>
        `}
        <button class="btn-figma-secondary" style="background:#059669; color:#ffffff; border-color:#059669;" onclick="executeScanIn('${activeTicket.id}')">
          <span>✓ Tap In Kartu Akses (Masuk)</span>
        </button>
      `;
    }

    const isEmergency = activeTicket.isEmergency || (activeTicket.id && activeTicket.id.includes('-EMG-')) || activeTicket.status === 'Menunggu Otorisasi Darurat';

    colPengajuanLeft.innerHTML = `
      <!-- Card 1: Izin aktif saya -->
      <div class="figma-card">
        <div class="figma-card-header">
          <h3 class="figma-card-title" style="display: flex; align-items: center; gap: 0.4rem;">
            <span>Izin aktif saya</span>
            ${isEmergency ? `<span class="tag-badge" style="background:#ffe4e6; color:#9f1239; border:1.5px solid #fecdd3; font-weight:800; font-size:0.7rem; padding:2px 8px; border-radius:999px;">🚨 DARURAT</span>` : ''}
          </h3>
          <a href="#" class="figma-card-link" onclick="openTicketDetail('${activeTicket.id}', 'detail'); return false;">Rincian</a>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;">
          <div>
            <div style="font-size: 1.05rem; font-weight: 800; font-family: var(--font-mono); color: #0f172a; display: flex; align-items: center; gap: 0.4rem;">
              <span>${activeTicket.id}</span>
              ${isEmergency ? `<span style="font-size: 0.725rem; color: #be123c; font-weight: 700;">[IZIN DARURAT]</span>` : ''}
            </div>
            <div style="font-size: 0.8rem; color: #475569; margin-top: 4px; font-weight: 600;">${activeTicket.category} • ${activeTicket.type}</div>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">${activeTicket.destination} • ${activeTicket.reason}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            ${isEmergency ? `<span class="tag-badge" style="background:#fee2e2; color:#b91c1c; font-weight:800; font-size:0.7rem; border:1px solid #fca5a5;">🚨 DARURAT</span>` : ''}
            ${window.getStatusPill(activeTicket.status)}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid #f1f5f9;">
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${col1Label}</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${col1Val}</div>
          </div>
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${col2Label}</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${col2Val}</div>
          </div>
        </div>

        ${isEmergLocked ? `
          <div style="background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 8px; padding: 0.75rem 0.95rem; margin-top: 0.85rem; font-size: 0.775rem;">
            <div style="font-weight: 800; color: #9f1239; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
              <span>🚨 Izin Darurat Menunggu Otorisasi</span>
              <span class="tag-badge" style="background: #ffe4e6; color: #9f1239; font-weight: 800; border: 1px solid #fecdd3;">QR Terkunci</span>
            </div>
            <div style="color: #881337; margin-top: 0.3rem; line-height: 1.45;">
              Sesuai SOP K3, QR Code terkunci sampai diotorisasi. Hubungi Atasan untuk meminta <strong>Kode Sandi OTP</strong> atau gunakan <strong>Scan Wajah</strong> langsung.
            </div>
          </div>
        ` : ''}

        <div style="display: flex; gap: 0.5rem; margin-top: 1.15rem; flex-wrap: wrap;">
          ${actionButtonsHtml}
        </div>
      </div>

      <!-- Card 2: Atasan langsung -->
      <div class="figma-card">
        <div class="figma-card-header">
          <h3 class="figma-card-title">Atasan langsung</h3>
        </div>
        <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a;">${activeTicket.approverName || 'Ir. Hendra Gunawan, M.T.'}</div>
        <div style="font-size: 0.775rem; color: #64748b; margin-top: 2px;">${activeTicket.approverTitle || 'Manajer Rekayasa & Pemeliharaan'}</div>
        ${activeTicket.reassignedFrom ? `
          <div style="margin-top: 0.45rem; font-size: 0.75rem; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; padding: 0.3rem 0.65rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 600;">
            <span>↳ Dialihkan dari ${activeTicket.reassignedFrom}</span>
          </div>
        ` : ''}
      </div>

      <!-- Card 3: Informasi pengajuan -->
      <div class="figma-card">
        <div class="figma-card-header">
          <h3 class="figma-card-title">Informasi pengajuan</h3>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700;">Nama karyawan</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${activeTicket.applicantName || 'Budi Pratama, S.T.'}</div>
          </div>
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700;">NIP</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${activeTicket.applicantNip || 'PK-2024-8841'}</div>
          </div>
        </div>
        <div style="font-size: 0.775rem; color: #64748b; margin-top: 0.85rem; padding-top: 0.75rem; border-top: 1px solid #f1f5f9;">
          Catatan atasan: ${activeTicket.approverNote || '(Menunggu catatan atasan)'}
        </div>
      </div>
    `;
  }

  // Right Column
  if (colPengajuanRight) {
    const isOutside = (activeTicket.status === 'Sedang di Luar' || activeTicket.status === 'Terlambat');

    colPengajuanRight.innerHTML = `
      <!-- Card 1: Perlu tambahan waktu? -->
      <div class="figma-card">
        <div class="figma-card-header">
          <h3 class="figma-card-title">Perlu tambahan waktu?</h3>
        </div>
        ${isOutside ? (activeTicket.pendingExtension && activeTicket.pendingExtension.status === 'Menunggu Persetujuan' ? `
          <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; padding: 0.75rem 0.9rem; margin-bottom: 0.85rem;">
            <div style="display: flex; align-items: center; gap: 0.4rem; font-weight: 800; color: #92400e; font-size: 0.8rem;">
              <span>⏳</span>
              <span>Permohonan Perpanjangan Sedang Ditinjau</span>
            </div>
            <div style="font-size: 0.75rem; color: #b45309; margin-top: 3px;">
              Usulan jam kembali baru: <strong>${activeTicket.pendingExtension.newEstimatedReturn ? activeTicket.pendingExtension.newEstimatedReturn.replace('T', ' ') : '-'}</strong>. Penandaan terlambat ditangguhkan sementara.
            </div>
          </div>
          <button class="btn-figma-secondary" style="background:#fef3c7; color:#92400e; border-color:#fde68a; font-weight:700; width: 100%; justify-content: center;" onclick="openPendingExtensionDetailModal('${activeTicket.id}')">
            <span>⏱️ Detail Ajukan Perpanjangan</span>
          </button>
        ` : `
          <p style="font-size: 0.8rem; color: #334155; line-height: 1.5; margin: 0 0 0.65rem 0;">
            Sampaikan kendala di lapangan dan usulan jam kembali baru sebelum pukul ${activeTicket.estimatedReturn ? activeTicket.estimatedReturn.slice(11, 16) + ' WIB' : '13.00 WIB'}.
          </p>
          <p style="font-size: 0.725rem; color: #64748b; line-height: 1.4; margin: 0 0 1rem 0;">
            Hanya dapat diajukan hari ini sebelum jam pulang kerja (Senin-Kamis 16:00 WIB, Jumat 16:30 WIB).
          </p>
          <button class="btn-figma-secondary" onclick="openExtendDurationModal('${activeTicket.id}')">
            <span>Ajukan Perpanjangan</span>
          </button>
        `) : `
          <p style="font-size: 0.8rem; color: #64748b; line-height: 1.5; margin: 0 0 0.75rem 0;">
            Perpanjangan waktu hanya dapat diajukan setelah Anda melakukan Scan Out di pos gerbang dan sedang berada di luar area.
          </p>
          <button class="btn-figma-secondary" style="opacity: 0.5; cursor: not-allowed;" disabled title="Hanya aktif saat sedang berada di luar">
            <span>Ajukan Perpanjangan</span>
          </button>
        `}
      </div>

      <!-- Card 2: Kronologi tercatat (Dynamic Timeline) -->
      <div class="figma-card">
        <div class="figma-card-header">
          <h3 class="figma-card-title">Kronologi tercatat</h3>
        </div>
        ${buildActivePermitTimeline(activeTicket)}
      </div>

      <!-- Card 3: Alert Bawah -->
      <div class="figma-info-banner" style="margin-top: 0;">
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span style="font-size: 0.775rem;">QR hanya berlaku untuk tiket ini. Tiket selesai dapat dilihat di Riwayat Pengajuan dan tidak bisa digunakan kembali.</span>
        </div>
      </div>
    `;
  }
}

/**
 * 3. RIWAYAT PENGAJUAN (FIGMA SCREEN 3 - TABLE & SCREEN 4 - CARD)
 */
function renderRiwayatView() {
  const filtered = filterEmpTickets();
  const containerEmpRequests = document.getElementById('containerEmpRequests');
  const emptyEmpBox = document.getElementById('emptyEmpBox');
  const figmaRiwayatCountMeta = document.getElementById('figmaRiwayatCountMeta');
  const figmaEmpPaginationBar = document.getElementById('figmaEmpPaginationBar');
  const figmaEmpPaginationMeta = document.getElementById('figmaEmpPaginationMeta');

  if (!containerEmpRequests) return;

  if (filtered.length === 0) {
    containerEmpRequests.innerHTML = '';
    if (emptyEmpBox) emptyEmpBox.style.display = 'flex';
    if (figmaEmpPaginationBar) figmaEmpPaginationBar.style.display = 'none';
    if (figmaRiwayatCountMeta) {
      figmaRiwayatCountMeta.textContent = '0 hasil • Semua waktu • Terbaru lebih dulu • QR hanya untuk izin aktif';
    }
    return;
  }

  if (emptyEmpBox) emptyEmpBox.style.display = 'none';
  if (figmaEmpPaginationBar) figmaEmpPaginationBar.style.display = 'flex';

  if (figmaRiwayatCountMeta) {
    figmaRiwayatCountMeta.textContent = `${filtered.length} hasil • Semua waktu • Terbaru lebih dulu • QR hanya untuk izin aktif`;
  }

  // Pagination calculation
  const totalItems = filtered.length;
  const pageSize = window.empPageSize || 6;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  let currentPage = window.empCurrentPage || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  window.empCurrentPage = currentPage;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pageItems = filtered.slice(startIndex, endIndex);

  if (figmaEmpPaginationMeta) {
    figmaEmpPaginationMeta.textContent = `Menampilkan ${startIndex + 1}–${endIndex} dari ${totalItems} pengajuan`;
  }

  // Update pagination buttons
  renderPaginationButtons(totalPages, currentPage);

  // Render Card or Table
  if (window.currentEmpViewMode === 'table') {
    renderEmpTable(pageItems, containerEmpRequests);
  } else {
    renderEmpCards(pageItems, containerEmpRequests);
  }
}

function renderPaginationButtons(totalPages, currentPage) {
  const btnsContainer = document.querySelector('.figma-pagination-btns');
  if (!btnsContainer) return;

  let html = `<button class="btn-figma-page" id="btnEmpPagePrev" ${currentPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>Sebelumnya</button>`;

  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="btn-figma-page ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  html += `<button class="btn-figma-page" id="btnEmpPageNext" ${currentPage === totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>Berikutnya</button>`;

  btnsContainer.innerHTML = html;

  // Event handlers
  const prevBtn = document.getElementById('btnEmpPagePrev');
  const nextBtn = document.getElementById('btnEmpPageNext');

  if (prevBtn) {
    prevBtn.onclick = () => {
      if (window.empCurrentPage > 1) {
        window.empCurrentPage--;
        renderRiwayatView();
      }
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (window.empCurrentPage < totalPages) {
        window.empCurrentPage++;
        renderRiwayatView();
      }
    };
  }

  btnsContainer.querySelectorAll('[data-page]').forEach(btn => {
    btn.onclick = () => {
      window.empCurrentPage = parseInt(btn.getAttribute('data-page'), 10);
      renderRiwayatView();
    };
  });
}

/**
 * Render Figma Card Grid (Screen 4) - WITHOUT Moda Transportasi
 */
function renderEmpCards(list, containerElement) {
  const target = containerElement || document.getElementById('containerEmpRequests');
  if (!target) return;

  target.innerHTML = `
    <div class="figma-card-grid">
      ${list.map(t => {
    // Border color and status styling for Riwayat
    let topBorderColor = '#059669'; // green default (Selesai)
    let statusPillHtml = `<span class="status-pill-green">• Selesai</span>`;
    let calloutBoxHtml = `
          <div style="background: #ecfdf5; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.75rem; color: #065f46; font-weight: 600;">
            Tepat waktu • Disetujui ${t.approverName || 'Atasan'}
          </div>
        `;

    if (t.status === 'Terlambat') {
      topBorderColor = '#dc2626'; // red
      statusPillHtml = `<span class="status-pill-red" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-weight:800; font-size:0.75rem; padding:0.2rem 0.55rem; border-radius:999px;">• Terlambat</span>`;
      calloutBoxHtml = `
            <div style="background: #fef2f2; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.75rem; color: #991b1b; font-weight: 600;">
              ⚠️ Melewati batas estimasi kembali • Belum Scan In di Pos 1
            </div>
          `;
    } else if (t.isLate || (t.approverNote && t.approverNote.toLowerCase().includes('terlambat')) || (t.status === 'Selesai' && t.scanInTime && t.scanInTime.includes('[Terlambat]'))) {
      topBorderColor = '#d97706'; // amber
      statusPillHtml = `<span class="status-pill-amber">• Selesai • Terlambat ${t.lateMinutes || 10} mnt</span>`;
      calloutBoxHtml = `
            <div style="background: #fffbeb; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.75rem; color: #b45309; font-weight: 600;">
              Kembali ${t.actualReturnTime || (t.scanInTime ? t.scanInTime.slice(11, 16) + ' WIB' : '12.10 WIB')} • +${t.lateMinutes || 10} menit dari estimasi
            </div>
          `;
    } else if (t.status === 'Ditolak' || (t.status || '').toLowerCase().includes('tolak')) {
      topBorderColor = '#dc2626'; // red
      statusPillHtml = `<span class="status-pill-red">• Ditolak</span>`;
      calloutBoxHtml = `
            <div style="background: #fef2f2; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.75rem; color: #b91c1c; font-weight: 600;">
              ${t.rejectionReason || 'Ditolak: alasan tidak memadai'}
            </div>
          `;
    } else if (t.status === 'Kedaluwarsa' || t.status === 'Kadaluwarsa') {
      topBorderColor = '#64748b'; // slate
      statusPillHtml = `<span class="status-pill-gray" style="background:#f1f5f9; color:#475569; padding:0.2rem 0.55rem; border-radius:999px; font-weight:700; font-size:0.75rem;">• Kedaluwarsa</span>`;
      calloutBoxHtml = `
            <div style="background: #f8fafc; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.75rem; color: #64748b; font-weight: 600;">
              Waktu berlaku izin habis sebelum verifikasi scan keluar
            </div>
          `;
    } else if (t.status === 'Dibatalkan' || (t.status || '').toLowerCase().includes('batal')) {
      topBorderColor = '#64748b'; // slate
      statusPillHtml = `<span class="status-pill-gray" style="background:#f1f5f9; color:#64748b; padding:0.2rem 0.55rem; border-radius:999px; font-weight:700; font-size:0.75rem;">• Dibatalkan</span>`;
      calloutBoxHtml = `
            <div style="background: #f8fafc; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.75rem; color: #64748b; font-weight: 600;">
              Pengajuan izin dibatalkan oleh pemohon
            </div>
          `;
    }

    const dateStr = t.createdAt ? t.createdAt.slice(0, 11) : '19 Okt 2026';
    const plannedStr = t.plannedExit ? t.plannedExit.slice(11, 16) : '10.00';
    const returnStr = t.estimatedReturn ? t.estimatedReturn.slice(11, 16) : '';
    const timeRange = returnStr ? `${dateStr} • ${plannedStr} – ${returnStr} WIB` : `${dateStr} • ${plannedStr} WIB`;

    return `
          <div class="figma-grid-item" style="border-top-color: ${topBorderColor};">
            <!-- Header ID & Status -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
              <div>
                <div style="font-size: 0.95rem; font-weight: 800; font-family: var(--font-mono); color: #0f172a;">${t.id}</div>
                <div style="font-size: 0.725rem; color: #94a3b8; margin-top: 2px;">Diajukan ${dateStr}</div>
              </div>
              <div>${statusPillHtml}</div>
            </div>

            <!-- Tags -->
            <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
              <span class="figma-tag-badge">${t.category}</span>
              <span class="figma-tag-badge">${t.type}</span>
            </div>

            <!-- Fields without Moda Transportasi -->
            <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.775rem; margin-top: 0.25rem;">
              <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                <span style="color: #64748b;">Tujuan keluar</span>
                <span style="color: #0f172a; font-weight: 700; text-align: right;">${t.destination}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                <span style="color: #64748b;">Keperluan</span>
                <span style="color: #0f172a; font-weight: 700; text-align: right; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.reason || '-'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                <span style="color: #64748b;">Rencana waktu</span>
                <span style="color: #0f172a; font-weight: 700; text-align: right;">${timeRange}</span>
              </div>
            </div>

            <!-- Callout Box -->
            ${calloutBoxHtml}

            <!-- Action Buttons -->
            <div style="display: flex; gap: 0.5rem; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 0.5rem;">
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                ${(t.status === 'Sedang di Luar' || t.status === 'Disetujui' || t.status === 'Terlambat') ? `
                  <button class="btn-figma-primary" style="padding: 0.45rem 1rem; font-size: 0.775rem;" onclick="openTicketDetail('${t.id}', 'qr')">
                    Buka QR Izin
                  </button>
                ` : ''}
                <a href="#" class="figma-card-link" style="font-size: 0.775rem;" onclick="openTicketDetail('${t.id}', 'detail'); return false;">Rincian</a>
              </div>
              <button type="button" class="btn-figma-delete-single" style="background: none; border: none; color: #ef4444; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.3rem 0.5rem; border-radius: 4px; transition: background 0.15s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='none'" onclick="deleteEmpTicket('${t.id}')" title="Hapus Pengajuan #${t.id}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                <span>Hapus</span>
              </button>
            </div>
          </div>
        `;
  }).join('')}
    </div>
  `;
}

/**
 * Render Figma List / Table (Screen 3) - WITHOUT Moda Transportasi
 */
function renderEmpTable(list, containerElement) {
  const target = containerElement || document.getElementById('containerEmpRequests');
  if (!target) return;

  target.innerHTML = `
    <div class="figma-table-card">
      <table class="figma-table">
        <thead>
          <tr>
            <th>Nomor tiket / kategori & tipe</th>
            <th>Tujuan & Keperluan</th>
            <th>Rencana waktu</th>
            <th>Status</th>
            <th>Catatan</th>
            <th style="text-align: right;">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(t => {
    let statusPillHtml = `<span class="status-pill-green">• Selesai</span>`;
    let catatanHtml = `<span style="color: #475569;">Tepat waktu • Disetujui Hendra Gunawan</span>`;
    let tindakanHtml = `<a href="#" class="figma-card-link" onclick="openTicketDetail('${t.id}', 'detail'); return false;">Rincian</a>`;

    if (t.status === 'Terlambat') {
      statusPillHtml = `<span class="status-pill-red" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-weight:800; font-size:0.75rem; padding:0.2rem 0.55rem; border-radius:999px;">• Terlambat</span>`;
      catatanHtml = `<span style="color: #b91c1c; font-weight:700;">⚠️ Melewati estimasi kembali • Belum Scan In</span>`;
    } else if (t.isLate || (t.approverNote && t.approverNote.toLowerCase().includes('terlambat')) || (t.status === 'Selesai' && t.scanInTime && t.scanInTime.includes('[Terlambat]'))) {
      statusPillHtml = `<span class="status-pill-amber">• Selesai • Terlambat ${t.lateMinutes || 10} mnt</span>`;
      catatanHtml = `<span style="color: #b45309;">Kembali ${t.actualReturnTime || (t.scanInTime ? t.scanInTime.slice(11, 16) + ' WIB' : '12.10 WIB')} • +${t.lateMinutes || 10} menit</span>`;
    } else if (t.status === 'Ditolak' || (t.status || '').toLowerCase().includes('tolak')) {
      statusPillHtml = `<span class="status-pill-red">• Ditolak</span>`;
      catatanHtml = `<span style="color: #b91c1c;">${t.rejectionReason || 'Ditolak: alasan tidak memadai'}</span>`;
    } else if (t.status === 'Kedaluwarsa' || t.status === 'Kadaluwarsa') {
      statusPillHtml = `<span class="status-pill-gray" style="background:#f1f5f9; color:#475569; padding:0.2rem 0.55rem; border-radius:999px; font-weight:700; font-size:0.75rem;">• Kedaluwarsa</span>`;
      catatanHtml = `<span style="color: #64748b;">Kedaluwarsa sebelum scan keluar</span>`;
    } else if (t.status === 'Dibatalkan' || (t.status || '').toLowerCase().includes('batal')) {
      statusPillHtml = `<span class="status-pill-gray" style="background:#f1f5f9; color:#64748b; padding:0.2rem 0.55rem; border-radius:999px; font-weight:700; font-size:0.75rem;">• Dibatalkan</span>`;
      catatanHtml = `<span style="color: #64748b;">Pengajuan dibatalkan oleh pemohon</span>`;
    } else {
      statusPillHtml = `<span class="status-pill-green">• Selesai</span>`;
      catatanHtml = `<span style="color: #475569;">Tepat waktu • Disetujui ${t.approverName || 'Atasan'}</span>`;
    }

    tindakanHtml += `
      <button type="button" style="background: none; border: none; color: #ef4444; font-size: 0.75rem; font-weight: 600; cursor: pointer; margin-left: 0.65rem; display: inline-flex; align-items: center; gap: 0.2rem;" onclick="deleteEmpTicket('${t.id}')" title="Hapus Pengajuan #${t.id}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2"></path></svg>
        Hapus
      </button>
    `;

    const dateStr = t.createdAt ? t.createdAt.slice(0, 11) : '19 Okt 2026';
    const plannedStr = t.plannedExit ? t.plannedExit.slice(11, 16) : '10.00';
    const returnStr = t.estimatedReturn ? t.estimatedReturn.slice(11, 16) : '';
    const timeRange = returnStr ? `${plannedStr} – ${returnStr} WIB` : `${plannedStr} WIB`;

    return `
              <tr>
                <td>
                  <div style="font-weight: 800; font-family: var(--font-mono); color: #0f172a;">${t.id}</div>
                  <div style="font-size: 0.725rem; color: #64748b; margin-top: 2px;">${t.category} • ${t.type}</div>
                </td>
                <td>
                  <div style="font-weight: 700; color: #0f172a;">${t.destination}</div>
                  <div style="font-size: 0.725rem; color: #64748b; margin-top: 2px; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.reason || '-'}</div>
                </td>
                <td>
                  <div style="font-weight: 600; color: #0f172a;">${dateStr}</div>
                  <div style="font-size: 0.725rem; color: #64748b; margin-top: 2px;">${timeRange}</div>
                </td>
                <td>${statusPillHtml}</td>
                <td style="font-size: 0.75rem;">${catatanHtml}</td>
                <td style="text-align: right;">${tindakanHtml}</td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Main Karyawan View Router
 */
function renderKaryawanView() {
  if (typeof window.checkOverdueAndExpiredTickets === 'function') {
    window.checkOverdueAndExpiredTickets(true);
  }
  updateKaryawanMetrics();
  const currentKaryawanNav = window.currentKaryawanNav || 'dashboard';

  if (currentKaryawanNav === 'dashboard') {
    renderKaryawanDashboard();
  } else if (currentKaryawanNav === 'pengajuan') {
    renderPengajuanSayaView();
  } else if (currentKaryawanNav === 'riwayat') {
    renderRiwayatView();
  }
}

// Wire Filter and View Switcher listeners
document.addEventListener('DOMContentLoaded', () => {
  const btnEmpViewCard = document.getElementById('btnEmpViewCard');
  const btnEmpViewTable = document.getElementById('btnEmpViewTable');

  if (btnEmpViewCard) {
    btnEmpViewCard.addEventListener('click', () => {
      window.currentEmpViewMode = 'card';
      btnEmpViewCard.classList.add('active');
      if (btnEmpViewTable) btnEmpViewTable.classList.remove('active');
      renderRiwayatView();
    });
  }

  if (btnEmpViewTable) {
    btnEmpViewTable.addEventListener('click', () => {
      window.currentEmpViewMode = 'table';
      btnEmpViewTable.classList.add('active');
      if (btnEmpViewCard) btnEmpViewCard.classList.remove('active');
      renderRiwayatView();
    });
  }

  const searchEmpInput = document.getElementById('searchEmpInput');
  const filterEmpPeriod = document.getElementById('filterEmpPeriod');
  const filterEmpCategory = document.getElementById('filterEmpCategory');
  const filterEmpType = document.getElementById('filterEmpType');
  const filterEmpStatus = document.getElementById('filterEmpStatus');

  [searchEmpInput, filterEmpPeriod, filterEmpCategory, filterEmpType, filterEmpStatus, document.getElementById('sortEmpRiwayat')].forEach(el => {
    if (el) {
      el.addEventListener('input', () => {
        window.empCurrentPage = 1;
        renderRiwayatView();
      });
      el.addEventListener('change', () => {
        window.empCurrentPage = 1;
        renderRiwayatView();
      });
    }
  });

  const filterEmpChartPeriod = document.getElementById('filterEmpChartPeriod');
  if (filterEmpChartPeriod) {
    filterEmpChartPeriod.addEventListener('change', () => {
      renderKaryawanDonutChart();
    });
  }
});

// DELETE FEATURE FOR RIWAYAT PENGAJUAN
function deleteEmpTicket(ticketId) {
  if (!confirm(`Apakah Anda yakin ingin menghapus pengajuan #${ticketId} dari riwayat? Tindakan ini tidak dapat dibatalkan.`)) {
    return;
  }

  let ticketsList = window.ticketsList || [];
  ticketsList = ticketsList.filter(t => t.id !== ticketId);
  window.saveTickets(ticketsList);

  renderRiwayatView();
  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
  if (typeof window.renderApproverView === 'function') window.renderApproverView();
  if (typeof window.renderSecurityView === 'function') window.renderSecurityView();

  if (typeof window.showToast === 'function') {
    window.showToast(`Pengajuan #${ticketId} berhasil dihapus dari riwayat.`, 'info');
  }
}

function deleteAllEmpRiwayat() {
  const filtered = typeof filterEmpTickets === 'function' ? filterEmpTickets() : [];
  if (filtered.length === 0) {
    if (typeof window.showToast === 'function') {
      window.showToast('Tidak ada pengajuan di riwayat yang dapat dihapus.', 'warning');
    }
    return;
  }

  const count = filtered.length;
  if (!confirm(`Apakah Anda yakin ingin menghapus ${count} pengajuan dari riwayat? Tindakan ini tidak dapat dibatalkan.`)) {
    return;
  }

  const idsToDelete = new Set(filtered.map(t => t.id));
  let ticketsList = window.ticketsList || [];
  ticketsList = ticketsList.filter(t => !idsToDelete.has(t.id));
  window.saveTickets(ticketsList);

  renderRiwayatView();
  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
  if (typeof window.renderApproverView === 'function') window.renderApproverView();
  if (typeof window.renderSecurityView === 'function') window.renderSecurityView();

  if (typeof window.showToast === 'function') {
    window.showToast(`${count} pengajuan berhasil dihapus dari riwayat.`, 'success');
  }
}

// Expose globally
window.updateKaryawanMetrics = updateKaryawanMetrics;
window.filterEmpTickets = filterEmpTickets;
window.renderKaryawanDashboard = renderKaryawanDashboard;
window.renderPengajuanSayaView = renderPengajuanSayaView;
window.renderRiwayatView = renderRiwayatView;
window.renderKaryawanView = renderKaryawanView;
window.renderEmpCards = renderEmpCards;
window.renderEmpTable = renderEmpTable;
window.buildActivePermitTimeline = buildActivePermitTimeline;
window.deleteEmpTicket = deleteEmpTicket;
window.deleteAllEmpRiwayat = deleteAllEmpRiwayat;
