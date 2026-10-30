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
    statEmpCompletedSub.textContent = `${onTimeCompleted} tepat waktu, ${lateCompleted} terlambat`;
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
    // Check if deleted by employee
    if (t.deletedByKaryawan) return false;

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

    // 3. Search input (multi-token matching for ID, destination, reason, approver name, category, type)
    if (query) {
      const matcher = typeof window.matchSearchTokens === 'function' ? window.matchSearchTokens : (typeof matchSearchTokens === 'function' ? matchSearchTokens : null);
      if (matcher) {
        if (!matcher(query, t.id, t.reason, t.destination, t.approverName, t.category, t.type, t.applicantName)) return false;
      } else {
        const matchId = (t.id || '').toLowerCase().includes(query);
        const matchReason = (t.reason || '').toLowerCase().includes(query);
        const matchDest = (t.destination || '').toLowerCase().includes(query);
        const matchApp = (t.approverName || '').toLowerCase().includes(query);
        if (!matchId && !matchReason && !matchDest && !matchApp) return false;
      }
    }


    return true;
  });

  // Sorting Riwayat (Terbaru / Terlama)
  const sortEmpEl = document.getElementById('sortEmpRiwayat');
  const sortEmpOrder = sortEmpEl ? sortEmpEl.value : 'desc';

  filtered.sort((a, b) => {
    const parseTime = (item) => {
      const raw = item.createdAt || item.plannedExit || 0;
      const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
      return (d && !isNaN(d.getTime())) ? d.getTime() : 0;
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
    desc: `${activeTicket.category} — ${activeTicket.type}`,
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
      badge: 'Disetujui',
      time: timeApproved,
      desc: `${activeTicket.approverName || 'Ir. Hendra Gunawan, M.T.'}${activeTicket.approverTitle ? ' — ' + activeTicket.approverTitle : ''}`,
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
      desc: 'Pos 1 — Karyawan meninggalkan area operasional',
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
        desc: activeTicket.isLate ? 'Karyawan kembali ke area pabrik via Tap In (Terlambat)' : 'Pos 1 — Karyawan kembali ke area pabrik tepat waktu via Tap In',
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
              ${st.badge ? `<span style="font-size: 0.72rem; font-weight: 700; color: #059669;">${st.badge}</span>` : ''}
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
    empHeroGreeting.textContent = `Selamat ${timeGreeting}, ${empActor.name} `;
  }
  const primaryApprover = (typeof window.getPrimaryApprover === 'function') 
    ? window.getPrimaryApprover() 
    : (window.ACTORS && window.ACTORS.karyawan && window.ACTORS.karyawan.approverName ? { name: window.ACTORS.karyawan.approverName } : null);

  if (empHeroSub) {
    const title = empActor.role || empActor.title || 'Staf Rekayasa Mesin';
    const dept = empActor.department || 'Departemen Rekayasa & Pemeliharaan';
    if (primaryApprover && primaryApprover.name) {
      empHeroSub.textContent = `${title} | ${dept} | Atasan: ${primaryApprover.name}`;
    } else {
      empHeroSub.textContent = `${title} | ${dept} | Atasan Anda tidak tersedia, jika ingin membuat pengajuan pilih atasan lain`;
    }
  }

  const empNoApproverNotice = document.getElementById('empNoApproverNotice');
  if (empNoApproverNotice) {
    empNoApproverNotice.style.display = primaryApprover ? 'none' : 'flex';
  }

  // 1.1 Hero Strip
  if (figmaHeroStrip) {
    if (activeTicket) {
      const statusPill = getCleanEmpStatus(activeTicket.status, activeTicket);
      let statusText = `Status: Izin Aktif — ${activeTicket.id}`;
      let statusSub = `${activeTicket.category} — Batas kembali ${activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : '13:00 WIB'}`;

      if (activeTicket.status === 'Menunggu Persetujuan' || activeTicket.status === 'Menunggu Otorisasi Darurat') {
        statusText = `Status: Izin Diajukan — ${activeTicket.id}`;
        statusSub = `${activeTicket.category} — Menunggu Persetujuan Atasan (${activeTicket.approverName || (primaryApprover ? primaryApprover.name : 'Atasan Langsung')})`;
      } else if (activeTicket.status === 'Disetujui') {
        statusText = `Status: Izin Disetujui — ${activeTicket.id}`;
        statusSub = `${activeTicket.category} — QR Siap Digunakan di Pos 1 — Jadwal Keluar ${activeTicket.plannedExit ? activeTicket.plannedExit.slice(11, 16) + ' WIB' : ''}`;
      } else if (activeTicket.status === 'Terlambat') {
        statusText = `Status: Terlambat Kembali — ${activeTicket.id}`;
        statusSub = `${activeTicket.category} — Batas waktu ${activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : ''} TELAH TERLEWAT! Segera Tap In Kartu Akses di Pos 1.`;
      } else if (activeTicket.status === 'Sedang di Luar') {
        statusText = `Status: Izin Aktif — ${activeTicket.id}`;
        statusSub = `${activeTicket.category} — Scan Out ${activeTicket.scanOutTime ? activeTicket.scanOutTime.replace(/ \(Pos 1.*\)/, '') : '10:05 WIB'} — Batas kembali ${activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : '13:00 WIB'}`;
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
          
          <span class="hero-strip-text">Status: Tidak Ada Perizinan Aktif</span>
          <span class="hero-strip-sub">Ajukan izin bila hendak meninggalkan area.</span>
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

      const col1Label = (isOutside && activeTicket.scanOutTime) ? 'Scan Out Pos 1' : 'Jadwal Keluar';
      const col1Val = (isOutside && activeTicket.scanOutTime) ? activeTicket.scanOutTime.replace(/ \(Pos 1.*\)/, '') : (activeTicket.plannedExit ? window.formatDisplayDate(activeTicket.plannedExit) : '-');
      const col2Label = activeTicket.type === 'Pulang Mendahului' ? 'Tipe Kepulangan' : 'Batas kembali';
      const col2Val = activeTicket.type === 'Pulang Mendahului' ? 'Pulang Lebih Awal' : (activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : '-');

      let actionButtonsHtml = '';
      if (isEmergLocked) {
        actionButtonsHtml = `
          <button class="btn-figma-primary" style="background:#be123c; border-color:#be123c; box-shadow: 0 4px 12px rgba(190, 18, 60, 0.35); font-weight: 700;" onclick="window.openEmergencyUnlockModal('${activeTicket.id}')">
            <span>Otorisasi Darurat (Input Sandi / Scan Wajah)</span>
          </button>
          <button class="btn-figma-secondary" onclick="window.openEditTicketModal('${activeTicket.id}')">
            <span>Edit Pengajuan</span>
          </button>
          <button class="btn-figma-secondary" onclick="openTicketDetail('${activeTicket.id}', 'detail')">
            <span>Detail pengajuan</span>
          </button>
          <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
            <span>Batalkan Izin</span>
          </button>
        `;
      } else if (isPending) {
        actionButtonsHtml = `
          <button class="btn-figma-secondary" onclick="window.openEditTicketModal('${activeTicket.id}')">
            <span>Edit Pengajuan</span>
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
            <span>Detail pengajuan</span>
          </button>
          <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
            <span>Batalkan</span>
          </button>
        `;
      } else if (isOutside) {
        const hasPendingExt = activeTicket.pendingExtension && activeTicket.pendingExtension.status === 'Menunggu Persetujuan';
        const hasUsedExtension = activeTicket.extensionApproved || (activeTicket.extensionCount && activeTicket.extensionCount >= 1);
        actionButtonsHtml = `
          ${hasPendingExt ? `
            <button class="btn-figma-secondary" disabled style="opacity: 0.9; cursor: not-allowed; background: #fffbeb; color: #92400e; border: 1.5px solid #fde68a; font-weight: 700;" title="Permohonan perpanjangan sedang ditinjau Atasan">
              <span>Menunggu Persetujuan Perpanjangan</span>
            </button>
          ` : (hasUsedExtension ? `
            <button class="btn-figma-secondary" disabled style="opacity: 0.6; cursor: not-allowed; background: #f8fafc;" title="Perpanjangan waktu hanya dapat diajukan maksimal 1 kali dan telah disetujui">
              <span>Perpanjangan Telah Digunakan (Maks. 1x)</span>
            </button>
          ` : `
            <button class="btn-figma-secondary" style="background:#ffffff; color:#0f172a; border: 1.5px solid #cbd5e1; font-weight: 700;" onclick="openExtendDurationModal('${activeTicket.id}')">
              <span>Ajukan Perpanjangan</span>
            </button>
          `)}
          <button class="btn-figma-secondary" style="background:#059669; color:#ffffff; border-color:#059669; font-weight: 700;" onclick="executeScanIn('${activeTicket.id}')">
            <span>✓ Tap In Kartu Akses (Masuk)</span>
          </button>
        `;
      }

      const isEmergency = activeTicket.isEmergency || (activeTicket.id && activeTicket.id.includes('-EMG-')) || activeTicket.status === 'Menunggu Otorisasi Darurat';

      cardActivePermitSummary.innerHTML = `
        <div class="figma-card-header">
          <h3 class="figma-card-title" style="display: flex; align-items: center; gap: 0.4rem;">
            <span>Izin aktif saya</span>
            ${isEmergency ? `<span style="color:#b91c1c; font-weight:800; font-size:0.75rem;">DARURAT</span>` : ''}
          </h3>
          <a href="#" class="figma-card-link" onclick="openTicketDetail('${activeTicket.id}', 'detail'); return false;">Detail pengajuan</a>
        </div>
        <div>
          <div style="font-size: 1.05rem; font-weight: 800; font-family: var(--font-mono); color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
            <span>${activeTicket.id}</span>
            ${isEmergency ? `<span style="font-size: 0.725rem; color: #be123c; font-weight: 700;">[IZIN DARURAT]</span>` : ''}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; font-weight: 600;">${activeTicket.category} — ${activeTicket.type}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${activeTicket.destination} — ${activeTicket.reason}">${activeTicket.destination} — ${activeTicket.reason}</div>
          <div style="margin-top: 6px; display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.775rem;">
            <span style="color: var(--text-muted); font-weight: 600;">status:</span>
            ${getCleanEmpStatus(activeTicket.status, activeTicket)}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid var(--border-color, #f1f5f9);">
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${col1Label}</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${col1Val}</div>
          </div>
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${col2Label}</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${col2Val}</div>
          </div>
        </div>

        ${isEmergLocked ? `
          <div style="margin-top: 0.85rem; font-size: 0.775rem; padding-top: 0.65rem; border-top: 1px solid #f1f5f9;">
            <div style="font-weight: 800; color: #b91c1c; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
              <span>Izin Darurat Menunggu Otorisasi</span>
              <span style="font-weight: 700; color: #b91c1c;">QR Terkunci</span>
            </div>
            <div style="color: #475569; margin-top: 0.25rem; line-height: 1.45;">
              Sesuai SOP K3, QR Code terkunci sampai diotorisasi. Hubungi Atasan untuk meminta <strong>Kode Sandi OTP</strong> atau gunakan <strong>Scan Wajah</strong> langsung.
            </div>
          </div>
        ` : ''}

        <div class="card-action-btns-wrap" style="display: flex; gap: 0.5rem; margin-top: 1.15rem; flex-wrap: wrap;">
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
        <div style="padding: 1.25rem 0; text-align: center; color: #94a3b8; font-size: 0.825rem;">
          Belum ada riwayat pengajuan selesai.
        </div>
      `;
    } else {
      karyawanDashboardRecentList.innerHTML = completedItems.map((t, idx) => {
        const exitHour = t.plannedExit ? t.plannedExit.slice(11, 16) : '09:00';
        const returnHour = t.estimatedReturn ? t.estimatedReturn.slice(11, 16) : '11:00';
        const timeSpan = `${exitHour}–${returnHour} WIB`;

        // Format tanggal secara akurat (hindari .slice(0,6) yang menghasilkan "2026-1")
        let dayMonth = 'Hari ini';
        if (t.createdAt) {
          const parsed = typeof window.parseTicketDateTime === 'function' ? window.parseTicketDateTime(t.createdAt) : new Date(t.createdAt);
          if (parsed && !isNaN(parsed.getTime())) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            dayMonth = `${parsed.getDate()} ${months[parsed.getMonth()]}`;
          } else {
            dayMonth = t.createdAt.split(',')[0].trim();
          }
        }

        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.9rem 0; ${idx < completedItems.length - 1 ? 'border-bottom: 1px solid #f1f5f9;' : ''} gap: 1rem; flex-wrap: wrap;">
            <!-- Kolom 1: ID Tiket & Kategori -->
            <div style="min-width: 170px; flex: 1;">
              <div style="font-size: 0.875rem; font-weight: 800; font-family: var(--font-mono); color: #0f172a; letter-spacing: -0.2px;">${t.id}</div>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 3px; font-weight: 500;">${dayMonth} — ${t.category}</div>
            </div>

            <!-- Kolom 2: Rentang Waktu (Kolom terpisah teratur agar waktu rapi sejajar) -->
            <div style="min-width: 125px; text-align: right;">
              <span style="font-size: 0.8rem; color: #334155; font-weight: 600; font-family: var(--font-mono);">${timeSpan}</span>
            </div>

            <!-- Kolom 3: Status Pill (Lebar teratur agar tidak menabrak waktu) -->
            <div style="min-width: 190px; text-align: left;">
              ${getCleanEmpStatus(t.status || 'Selesai', t)}
            </div>

            <!-- Kolom 4: Aksi Detail Pengajuan -->
            <div style="min-width: 110px; text-align: right;">
              <a href="#" class="figma-card-link" onclick="openTicketDetail('${t.id}', 'detail'); return false;">Detail pengajuan</a>
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
  const emptyEmpActiveBox = document.getElementById('emptyEmpActiveBox');
  const btnOpenEmergencyModal = document.getElementById('btnOpenEmergencyModal');
  const btnOpenNewRequestModal = document.getElementById('btnOpenNewRequestModal');

  if (btnOpenEmergencyModal) btnOpenEmergencyModal.style.display = activeTicket ? 'none' : 'inline-flex';
  if (btnOpenNewRequestModal) btnOpenNewRequestModal.style.display = activeTicket ? 'none' : 'inline-flex';

  if (!activeTicket) {
    if (colPengajuanLeft) colPengajuanLeft.style.display = 'none';
    if (colPengajuanRight) colPengajuanRight.style.display = 'none';
    if (emptyEmpActiveBox) emptyEmpActiveBox.style.display = 'flex';
    return;
  }

  if (emptyEmpActiveBox) emptyEmpActiveBox.style.display = 'none';
  if (colPengajuanLeft) colPengajuanLeft.style.display = 'flex';
  if (colPengajuanRight) colPengajuanRight.style.display = 'flex';

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

    const col1Label = (isOutside && activeTicket.scanOutTime) ? 'Scan Out Pos 1' : 'Jadwal Keluar';
    const col1Val = (isOutside && activeTicket.scanOutTime) ? activeTicket.scanOutTime.replace(/ \(Pos 1.*\)/, '') : (activeTicket.plannedExit ? window.formatDisplayDate(activeTicket.plannedExit) : '-');
    const col2Label = activeTicket.type === 'Pulang Mendahului' ? 'Tipe Kepulangan' : 'Batas kembali';
    const col2Val = activeTicket.type === 'Pulang Mendahului' ? 'Pulang Lebih Awal' : (activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : '-');

    let actionButtonsHtml = '';
    if (isEmergLocked) {
      actionButtonsHtml = `
        <button class="btn-figma-primary" style="background:#be123c; border-color:#be123c; box-shadow: 0 4px 12px rgba(190, 18, 60, 0.35); font-weight: 700;" onclick="window.openEmergencyUnlockModal('${activeTicket.id}')">
          <span>Otorisasi Darurat (Input Sandi / Scan Wajah)</span>
        </button>
        <button class="btn-figma-secondary" onclick="window.openEditTicketModal('${activeTicket.id}')">
          <span>Edit Pengajuan</span>
        </button>
        <button class="btn-figma-secondary" onclick="openTicketDetail('${activeTicket.id}', 'detail')">
          <span>Detail pengajuan</span>
        </button>
        <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
          <span>Batalkan Izin</span>
        </button>
      `;
    } else if (isPending) {
      actionButtonsHtml = `
        <button class="btn-figma-secondary" onclick="window.openEditTicketModal('${activeTicket.id}')">
          <span>Edit Pengajuan</span>
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
          <span>Detail pengajuan</span>
        </button>
        <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
          <span>Batalkan</span>
        </button>
      `;
    } else if (isOutside) {
      const hasPendingExt = activeTicket.pendingExtension && activeTicket.pendingExtension.status === 'Menunggu Persetujuan';
      const hasUsedExtension = activeTicket.extensionApproved || (activeTicket.extensionCount && activeTicket.extensionCount >= 1);
      actionButtonsHtml = `
        ${hasPendingExt ? '' : (hasUsedExtension ? `
          <button class="btn-figma-secondary" disabled style="opacity: 0.6; cursor: not-allowed; background: #f8fafc;" title="Perpanjangan waktu hanya dapat diajukan maksimal 1 kali dan telah disetujui">
            <span>Perpanjangan Telah Digunakan (Maks. 1x)</span>
          </button>
        ` : `
          <button class="btn-figma-secondary" style="background:#ffffff; color:#0f172a; border: 1.5px solid #cbd5e1; font-weight: 700;" onclick="openExtendDurationModal('${activeTicket.id}')">
            <span>Ajukan Perpanjangan</span>
          </button>
        `)}
        <button class="btn-figma-secondary" style="background:#059669; color:#ffffff; border-color:#059669; font-weight: 700;" onclick="executeScanIn('${activeTicket.id}')">
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
            ${isEmergency ? `<span style="color:#b91c1c; font-weight:800; font-size:0.75rem;">DARURAT</span>` : ''}
          </h3>
          <a href="#" class="figma-card-link" onclick="openTicketDetail('${activeTicket.id}', 'detail'); return false;">Detail pengajuan</a>
        </div>
        <div>
          <div style="font-size: 1.05rem; font-weight: 800; font-family: var(--font-mono); color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
            <span>${activeTicket.id}</span>
            ${isEmergency ? `<span style="font-size: 0.725rem; color: #be123c; font-weight: 700;">[IZIN DARURAT]</span>` : ''}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; font-weight: 600;">${activeTicket.category} — ${activeTicket.type}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">${activeTicket.destination} — ${activeTicket.reason}</div>
          <div style="margin-top: 6px; display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.775rem;">
            <span style="color: var(--text-muted); font-weight: 600;">status:</span>
            ${getCleanEmpStatus(activeTicket.status, activeTicket)}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid var(--border-color, #f1f5f9);">
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${col1Label}</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${col1Val}</div>
          </div>
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${col2Label}</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${col2Val}</div>
          </div>
        </div>

        ${isEmergLocked ? `
          <div style="margin-top: 0.85rem; font-size: 0.775rem; padding-top: 0.65rem; border-top: 1px solid var(--border-color, #f1f5f9);">
            <div style="font-weight: 800; color: #b91c1c; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
              <span>Izin Darurat Menunggu Otorisasi</span>
              <span style="font-weight: 700; color: #b91c1c;">QR Terkunci</span>
            </div>
            <div style="color: var(--text-secondary); margin-top: 0.25rem; line-height: 1.45;">
              Sesuai SOP K3, QR Code terkunci sampai diotorisasi. Hubungi Atasan untuk meminta <strong>Kode Sandi OTP</strong> atau gunakan <strong>Scan Wajah</strong> langsung.
            </div>
          </div>
        ` : ''}

        <div class="card-action-btns-wrap" style="display: flex; gap: 0.5rem; margin-top: 1.15rem; flex-wrap: wrap;">
          ${actionButtonsHtml}
        </div>
      </div>
      </div>

      <!-- Card 2: Atasan langsung -->
      <div class="figma-card">
        <div class="figma-card-header">
          <h3 class="figma-card-title">Atasan langsung</h3>
        </div>
        <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-primary);">${activeTicket.approverName || 'Ir. Hendra Gunawan, M.T.'}</div>
        <div style="font-size: 0.775rem; color: var(--text-secondary); margin-top: 2px;">${activeTicket.approverTitle || 'Manajer Rekayasa & Pemeliharaan'}</div>
        ${activeTicket.reassignedFrom ? `
          <div style="margin-top: 0.45rem; font-size: 0.75rem; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; padding: 0.3rem 0.65rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 600;">
            <span>↳ Dialihkan dari ${activeTicket.reassignedFrom}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Right Column
  if (colPengajuanRight) {
    const isOutside = (activeTicket.status === 'Sedang di Luar' || activeTicket.status === 'Terlambat');
    const hasPendingExt = isOutside && activeTicket.pendingExtension && activeTicket.pendingExtension.status === 'Menunggu Persetujuan';

    colPengajuanRight.innerHTML = `
      ${hasPendingExt ? `
        <!-- Status Permohonan Perpanjangan -->
        <div class="figma-card">
          <div class="figma-card-header">
            <h3 class="figma-card-title">Permohonan Perpanjangan Waktu</h3>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 0.9rem; margin-bottom: 0.85rem;">
            <div style="font-weight: 700; color: #0f172a; font-size: 0.8rem;">
              Permohonan Perpanjangan Sedang Ditinjau
            </div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px; line-height: 1.45;">
              Usulan jam kembali baru: <strong style="color: #0f172a;">${activeTicket.pendingExtension.newEstimatedReturn ? (window.formatDisplayDate ? window.formatDisplayDate(activeTicket.pendingExtension.newEstimatedReturn) : activeTicket.pendingExtension.newEstimatedReturn.replace('T', ' ')) : '-'}</strong>. Penandaan terlambat ditangguhkan sementara.
            </div>
          </div>
          <button class="btn-figma-secondary" style="background: #fef3c7; color: #92400e; border: 1.5px solid #fde68a; font-weight: 700; width: 100%; justify-content: center;" onclick="openPendingExtensionDetailModal('${activeTicket.id}')">
            <span>Detail Ajukan Perpanjangan</span>
          </button>
        </div>
      ` : ''}

      <!-- Card: Kronologi tercatat (Dynamic Timeline) -->
      <div class="figma-card">
        <div class="figma-card-header">
          <h3 class="figma-card-title">Kronologi tercatat</h3>
        </div>
        ${buildActivePermitTimeline(activeTicket)}
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
      figmaRiwayatCountMeta.textContent = '0 pengajuan ditemukan';
    }
    return;
  }

  if (emptyEmpBox) emptyEmpBox.style.display = 'none';
  if (figmaEmpPaginationBar) figmaEmpPaginationBar.style.display = 'flex';


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
 * Helpers for Clean Status Typography & Schedule with Day Name
 */
const DAYS_OF_WEEK_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS_SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatTicketScheduleWithDay(t) {
  if (!t) return '-';
  const dExit = (typeof window.parseTicketDateTime === 'function') 
    ? (window.parseTicketDateTime(t.plannedExit) || window.parseTicketDateTime(t.createdAt)) 
    : new Date(t.plannedExit || t.createdAt);

  let dayName = 'Senin';
  let dateFormatted = '';
  let plannedTimeStr = '10:00';

  if (dExit && !isNaN(dExit.getTime())) {
    dayName = DAYS_OF_WEEK_ID[dExit.getDay()];
    dateFormatted = `${dExit.getDate()} ${MONTHS_SHORT_ID[dExit.getMonth()]} ${dExit.getFullYear()}`;
    const pad = (n) => String(n).padStart(2, '0');
    plannedTimeStr = `${pad(dExit.getHours())}:${pad(dExit.getMinutes())}`;
  } else {
    const rawExit = t.plannedExit || t.createdAt || '';
    const match = rawExit.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (match) {
      dateFormatted = `${match[1]} ${match[2]} ${match[3]}`;
    } else {
      dateFormatted = t.createdAt ? t.createdAt.slice(0, 11) : '26 Okt 2026';
    }
    const tMatch = rawExit.match(/(\d{1,2})[:.](\d{2})/);
    plannedTimeStr = tMatch ? `${tMatch[1].padStart(2, '0')}:${tMatch[2]}` : '10:00';
    dayName = 'Senin';
  }

  let returnTimeStr = '';
  if (t.estimatedReturn) {
    const dReturn = (typeof window.parseTicketDateTime === 'function')
      ? window.parseTicketDateTime(t.estimatedReturn)
      : new Date(t.estimatedReturn);
    if (dReturn && !isNaN(dReturn.getTime())) {
      const pad = (n) => String(n).padStart(2, '0');
      if (dExit && !isNaN(dExit.getTime()) && dReturn.toDateString() !== dExit.toDateString()) {
        const retDay = DAYS_OF_WEEK_ID[dReturn.getDay()];
        returnTimeStr = `${retDay}, ${pad(dReturn.getHours())}:${pad(dReturn.getMinutes())} WIB`;
      } else {
        returnTimeStr = `${pad(dReturn.getHours())}:${pad(dReturn.getMinutes())} WIB`;
      }
    } else {
      const tMatch = String(t.estimatedReturn).match(/(\d{1,2})[:.](\d{2})/);
      returnTimeStr = tMatch ? `${tMatch[1].padStart(2, '0')}:${tMatch[2]} WIB` : `${t.estimatedReturn.slice(11, 16).replace('.', ':')} WIB`;
    }
  } else if (t.type === 'Pulang Mendahului' || t.type === 'Tidak Kembali (Pulang)') {
    returnTimeStr = '(Pulang)';
  }

  const timePart = returnTimeStr ? `${plannedTimeStr} – ${returnTimeStr}` : `${plannedTimeStr} WIB`;
  return `<div class="schedule-day-date" style="font-weight: 600; font-size: 0.72rem; line-height: 1.35; white-space: nowrap;">${dayName}, ${dateFormatted}</div><div class="schedule-time-text" style="font-size: 0.7rem; color: #64748b; font-family: var(--font-mono); font-weight: 500; margin-top: 1px; white-space: nowrap;">${timePart}</div>`;
}

function getCleanEmpStatus(status, ticket) {
  let label = status || 'Selesai';
  let color = '#059669'; // brand green
  let statusKey = 'selesai';

  if (status === 'Selesai') {
    if (ticket && (ticket.isLate || (ticket.scanInTime && ticket.scanInTime.includes('[Terlambat]')) || ticket.lateMinutes > 0)) {
      const lateStr = typeof window.formatLateDuration === 'function' ? window.formatLateDuration(ticket.lateMinutes || 10) : `${ticket.lateMinutes || 10} mnt`;
      label = `Selesai (Terlambat ${lateStr})`;
      color = '#b45309';
      statusKey = 'selesai-late';
    } else {
      label = 'Selesai';
      color = '#059669';
      statusKey = 'selesai';
    }
  } else if (status === 'Sedang di Luar') {
    label = 'Sedang di Luar';
    color = '#0284c7';
    statusKey = 'outside';
  } else if (status === 'Terlambat') {
    label = 'Terlambat';
    color = '#dc2626';
    statusKey = 'late';
  } else if (status === 'Disetujui') {
    label = 'Disetujui';
    color = '#059669';
    statusKey = 'approved';
  } else if (status === 'Menunggu Persetujuan') {
    label = 'Menunggu Persetujuan';
    color = '#d97706';
    statusKey = 'pending';
  } else if (status === 'Menunggu Otorisasi Darurat' || status === 'Darurat Terkunci') {
    label = 'Menunggu Otorisasi Darurat';
    color = '#be123c';
    statusKey = 'emergency';
  } else if (status === 'Ditolak') {
    label = 'Ditolak';
    color = '#dc2626';
    statusKey = 'rejected';
  } else if (status === 'Kedaluwarsa' || status === 'Kadaluwarsa') {
    label = 'Kedaluwarsa';
    color = '#64748b';
    statusKey = 'expired';
  } else if (status === 'Dibatalkan') {
    label = 'Dibatalkan';
    color = '#64748b';
    statusKey = 'cancelled';
  }

  // Pure clean text with semantic status class for perfect dark mode adaptation
  return `<span class="figma-clean-status status-${statusKey}" style="font-weight: 700; font-size: 0.8rem; color: ${color};">${label}</span>`;
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
        let catatanText = `✓ Tepat waktu — Disetujui ${t.approverName || 'Atasan'}`;
        let catatanColor = '#059669';
        let catatanBg = '#f0fdf4';
        let catatanBorder = '#dcfce7';
        let noteType = 'success';

        if (t.status === 'Terlambat') {
          catatanText = '⚠️ Melewati batas estimasi kembali — Belum Scan In di Pos 1';
          catatanColor = '#b91c1c';
          catatanBg = '#fef2f2';
          catatanBorder = '#fecaca';
          noteType = 'danger';
        } else if (t.isLate || (t.approverNote && t.approverNote.toLowerCase().includes('terlambat')) || (t.status === 'Selesai' && t.scanInTime && t.scanInTime.includes('[Terlambat]'))) {
          const lateFull = typeof window.formatLateDurationFull === 'function' ? window.formatLateDurationFull(t.lateMinutes || 10) : `${t.lateMinutes || 10} menit`;
          catatanText = `⏱️ Kembali ${t.actualReturnTime || (t.scanInTime ? t.scanInTime.slice(11, 16) + ' WIB' : '12.10 WIB')} — +${lateFull} dari estimasi`;
          catatanColor = '#b45309';
          catatanBg = '#fffbeb';
          catatanBorder = '#fde68a';
          noteType = 'warning';
        } else if (t.status === 'Ditolak' || (t.status || '').toLowerCase().includes('tolak')) {
          catatanText = `✕ ${t.rejectionReason || 'Ditolak: alasan tidak memadai'}`;
          catatanColor = '#b91c1c';
          catatanBg = '#fef2f2';
          catatanBorder = '#fecaca';
          noteType = 'danger';
        } else if (t.status === 'Kedaluwarsa' || t.status === 'Kadaluwarsa') {
          catatanText = '⏱️ Waktu berlaku izin habis sebelum verifikasi scan keluar';
          catatanColor = '#64748b';
          catatanBg = '#f8fafc';
          catatanBorder = '#e2e8f0';
          noteType = 'muted';
        } else if (t.status === 'Dibatalkan' || (t.status || '').toLowerCase().includes('batal')) {
          catatanText = '✕ Pengajuan izin dibatalkan oleh pemohon';
          catatanColor = '#64748b';
          catatanBg = '#f8fafc';
          catatanBorder = '#e2e8f0';
          noteType = 'muted';
        }

        // Format tanggal secara rapi & manusiawi (contoh: 26 Okt 2026)
        let dateStr = 'Hari ini';
        if (t.createdAt) {
          const parsed = typeof window.parseTicketDateTime === 'function' ? window.parseTicketDateTime(t.createdAt) : new Date(t.createdAt);
          if (parsed && !isNaN(parsed.getTime())) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            dateStr = `${parsed.getDate()} ${months[parsed.getMonth()]} ${parsed.getFullYear()}`;
          } else {
            dateStr = t.createdAt.split(',')[0].trim();
          }
        }

        const scheduleWithDay = formatTicketScheduleWithDay(t);
        const isDinas = t.category === 'Dinas Kantor';

        return `
          <div class="figma-grid-item" data-status="${t.status}">
            <!-- Header ID & Status -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
              <div>
                <div class="figma-ticket-id" style="font-size: 0.95rem; font-weight: 800; font-family: var(--font-mono); color: #0f172a; letter-spacing: -0.2px;">${t.id}</div>
                <div class="figma-ticket-date" style="font-size: 0.725rem; color: #64748b; margin-top: 2px; font-weight: 500;">Diajukan ${dateStr}</div>
              </div>
              <div style="text-align: right;">${getCleanEmpStatus(t.status, t)}</div>
            </div>

            <!-- Tags Kategori & Tipe Izin -->
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
              <span class="figma-tag-badge ${isDinas ? 'badge-dinas' : 'badge-pribadi'}">${t.category}</span>
              <span class="figma-tag-badge badge-type">${t.type}</span>
            </div>

            <!-- Detail Box (Tujuan, Keperluan, Rencana Waktu) -->
            <div class="figma-card-detail-box" style="display: flex; flex-direction: column; gap: 0.35rem; padding: 0.55rem 0.65rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 1.25rem;">
                <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; min-width: 95px; flex-shrink: 0; white-space: nowrap;">Tujuan keluar</span>
                <span class="detail-val" style="font-size: 0.75rem; color: #0f172a; font-weight: 600; text-align: right; line-height: 1.35;">${t.destination}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 1.25rem;">
                <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; min-width: 95px; flex-shrink: 0; white-space: nowrap;">Keperluan</span>
                <span class="detail-val" style="font-size: 0.75rem; color: #0f172a; font-weight: 500; text-align: right; max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.35;">${t.reason || '-'}</span>
              </div>
              <div class="detail-schedule-row" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; padding-top: 0.35rem; border-top: 1px dashed #e2e8f0;">
                <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; white-space: nowrap;">Rencana waktu</span>
                <div class="detail-schedule-val" style="text-align: right;">${scheduleWithDay}</div>
              </div>
            </div>

            <!-- Note Banner (Sesuai status) -->
            <div class="figma-note-banner note-${noteType}" style="font-size: 0.72rem; color: ${catatanColor}; background: ${catatanBg}; border: 1px solid ${catatanBorder}; border-radius: 6px; padding: 0.38rem 0.55rem; line-height: 1.35; font-weight: 600;">
              ${catatanText}
            </div>

            <!-- Action Buttons Footer -->
            <div class="figma-card-footer" style="display: flex; gap: 0.5rem; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 0.55rem; border-top: 1px solid #f1f5f9;">
              <div style="display: flex; gap: 0.65rem; align-items: center;">
                ${(t.status === 'Disetujui' && !t.scanOutTime) ? `
                  <button class="btn-figma-primary" style="padding: 0.3rem 0.65rem; font-size: 0.72rem;" onclick="openTicketDetail('${t.id}', 'qr')">
                    Buka QR Izin
                  </button>
                ` : ''}
                <a href="#" class="figma-card-link" style="font-size: 0.75rem; font-weight: 700; color: #0284c7;" onclick="openTicketDetail('${t.id}', 'detail'); return false;">Detail pengajuan →</a>
              </div>
              <button type="button" class="btn-figma-delete-single" style="background: none; border: 1px solid #fee2e2; color: #ef4444; font-size: 0.72rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.28rem 0.5rem; border-radius: 6px; transition: background 0.15s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='none'" onclick="deleteEmpTicket('${t.id}')" title="Hapus Pengajuan #${t.id}">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
    <div class="figma-table-card" style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
      <table class="figma-table" style="min-width: 950px;">
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
    const statusHtml = getCleanEmpStatus(t.status, t);
    let catatanHtml = `<span style="color: #475569;">Tepat waktu — Disetujui ${t.approverName || 'Hendra Gunawan'}</span>`;
    let tindakanHtml = `<a href="#" class="figma-card-link" onclick="openTicketDetail('${t.id}', 'detail'); return false;">Detail pengajuan</a>`;

    if (t.status === 'Terlambat') {
      catatanHtml = `<span style="color: #b91c1c; font-weight: 600;">Melewati batas waktu kembali — Belum Scan Masuk</span>`;
    } else if (t.isLate || (t.approverNote && t.approverNote.toLowerCase().includes('terlambat')) || (t.status === 'Selesai' && t.scanInTime && t.scanInTime.includes('[Terlambat]'))) {
      const lateStr = typeof window.formatLateDuration === 'function' ? window.formatLateDuration(t.lateMinutes || 10) : `${t.lateMinutes || 10} mnt`;
      catatanHtml = `<span style="color: #b45309; font-weight: 500;">Kembali ${t.actualReturnTime || (t.scanInTime ? t.scanInTime.slice(11, 16) + ' WIB' : '12.10 WIB')} (+${lateStr})</span>`;
    } else if (t.status === 'Ditolak' || (t.status || '').toLowerCase().includes('tolak')) {
      catatanHtml = `<span style="color: #b91c1c;">${t.rejectionReason || 'Ditolak: alasan tidak memadai'}</span>`;
    } else if (t.status === 'Kedaluwarsa' || t.status === 'Kadaluwarsa') {
      catatanHtml = `<span style="color: #64748b;">Kedaluwarsa sebelum scan keluar</span>`;
    } else if (t.status === 'Dibatalkan' || (t.status || '').toLowerCase().includes('batal')) {
      catatanHtml = `<span style="color: #64748b;">Pengajuan dibatalkan oleh pemohon</span>`;
    } else {
      catatanHtml = `<span style="color: #475569;">Tepat waktu — Disetujui ${t.approverName || 'Atasan'}</span>`;
    }

    tindakanHtml += `
      <button type="button" style="background: none; border: none; color: #ef4444; font-size: 0.75rem; font-weight: 600; cursor: pointer; margin-left: 0.65rem; display: inline-flex; align-items: center; gap: 0.2rem;" onclick="deleteEmpTicket('${t.id}')" title="Hapus Pengajuan #${t.id}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2"></path></svg>
        Hapus
      </button>
    `;

    const scheduleWithDay = formatTicketScheduleWithDay(t);

    return `
              <tr>
                <td>
                  <div style="font-weight: 800; font-family: var(--font-mono); color: #0f172a;">${t.id}</div>
                  <div style="font-size: 0.725rem; color: #64748b; margin-top: 2px;">${t.category} — ${t.type}</div>
                </td>
                <td>
                  <div style="font-weight: 700; color: #0f172a;">${t.destination}</div>
                  <div style="font-size: 0.725rem; color: #64748b; margin-top: 2px; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.reason || '-'}</div>
                </td>
                <td>${scheduleWithDay}</td>
                <td>${statusHtml}</td>
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

  // Render Mobile Container (PDF Hal 1 & 4)
  if (typeof renderKaryawanMobileDashboard === 'function') {
    renderKaryawanMobileDashboard();
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

// DELETE FEATURE FOR RIWAYAT PENGAJUAN (STRICT SERVER-LEVEL RULES)
const FINISHED_EMP_STATUSES = ['Selesai', 'Dibatalkan', 'Ditolak', 'Kedaluwarsa'];

function deleteEmpTicket(ticketId) {
  let ticketsList = window.ticketsList || [];
  const t = ticketsList.find(x => x.id === ticketId);
  const myNip = (window.getCurrentEmployeeActor ? window.getCurrentEmployeeActor().nip : null) || 'PK-2024-8841';

  if (!t) return;
  if (!FINISHED_EMP_STATUSES.includes(t.status)) {
    if (typeof window.showToast === 'function') window.showToast('Tiket yang masih berjalan tidak dapat dihapus.', 'error');
    return;
  }
  if (t.applicantNip && t.applicantNip !== myNip) {
    if (typeof window.showToast === 'function') window.showToast('Anda tidak berhak menghapus tiket karyawan lain.', 'error');
    return;
  }

  const handler = () => {
    t.deletedByKaryawan = true;
    window.saveTickets(ticketsList);

    renderRiwayatView();
    if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();

    if (typeof window.showToast === 'function') {
      window.showToast('1 riwayat dihapus', 'info');
    }
  };

  if (typeof window.openDeleteConfirmModal === 'function') {
    window.openDeleteConfirmModal({
      title: 'Hapus Riwayat Pengajuan',
      message: 'Apakah Anda yakin ingin menghapus pengajuan ini dari riwayat? Tiket yang masih berjalan tidak dapat dihapus.',
      onConfirm: handler
    });
  } else if (confirm('Apakah Anda yakin ingin menghapus pengajuan ini dari riwayat? Tindakan ini tidak dapat dibatalkan.')) {
    handler();
  }
}

function deleteAllEmpRiwayat() {
  const myNip = (window.getCurrentEmployeeActor ? window.getCurrentEmployeeActor().nip : null) || 'PK-2024-8841';
  const allFiltered = typeof filterEmpTickets === 'function' ? filterEmpTickets() : [];
  const filtered = allFiltered.filter(t => FINISHED_EMP_STATUSES.includes(t.status) && (t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841')));

  if (filtered.length === 0) {
    if (typeof window.showToast === 'function') {
      window.showToast('Tidak ada riwayat selesai untuk dihapus.', 'warning');
    }
    return;
  }

  const count = filtered.length;
  const handler = () => {
    const idsToDelete = new Set(filtered.map(t => t.id));
    let ticketsList = window.ticketsList || [];
    let deletedCount = 0;
    ticketsList.forEach(t => {
      if (idsToDelete.has(t.id) && FINISHED_EMP_STATUSES.includes(t.status) && (t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841'))) {
        t.deletedByKaryawan = true;
        deletedCount++;
      }
    });
    window.saveTickets(ticketsList);

    renderRiwayatView();
    if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();

    if (typeof window.showToast === 'function') {
      window.showToast(`${deletedCount} riwayat dihapus`, 'success');
    }
  };

  if (typeof window.openDeleteConfirmModal === 'function') {
    window.openDeleteConfirmModal({
      title: 'Hapus Riwayat Selesai',
      message: `Hapus <strong>${count}</strong> riwayat yang sudah selesai? Tiket yang masih berjalan tidak akan ikut terhapus.`,
      onConfirm: handler
    });
  } else if (confirm(`Hapus ${count} riwayat yang sudah selesai? Tiket yang masih berjalan tidak akan ikut terhapus.`)) {
    handler();
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
window.formatTicketScheduleWithDay = formatTicketScheduleWithDay;
window.getCleanEmpStatus = getCleanEmpStatus;

// ===================================================================
// KARYAWAN MOBILE DASHBOARD CONTROLLER (SESUAI PDF HALAMAN 1 & 4)
// ===================================================================
function renderKaryawanMobileDashboard() {
  const mobileContainer = document.getElementById('mobileAppContainer');
  if (!mobileContainer) return;

  const empActor = (typeof window.getCurrentEmployeeUser === 'function') 
    ? window.getCurrentEmployeeUser() 
    : { name: 'Budi Pratama, S.T.', nip: 'PK-2024-8841', role: 'Staf Rekayasa Mesin', dept: 'Departemen Rekayasa & Pemeliharaan' };

  // 1. Update Hero Greeting & Info
  const now = new Date();
  const nowH = now.getHours();
  let timeGreeting = 'pagi';
  if (nowH >= 11 && nowH < 15) timeGreeting = 'siang';
  else if (nowH >= 15 && nowH < 18) timeGreeting = 'sore';
  else if (nowH >= 18 || nowH < 5) timeGreeting = 'malam';

  const heroNameEl = document.getElementById('mobileHeroEmpName');
  if (heroNameEl) {
    heroNameEl.textContent = `${empActor.name} 👋`;
  }
  const heroRoleEl = document.getElementById('mobileHeroEmpRole');
  if (heroRoleEl) {
    heroRoleEl.textContent = empActor.role || 'Staf Rekayasa Mesin';
  }
  const heroDeptEl = document.getElementById('mobileHeroEmpDept');
  if (heroDeptEl) {
    heroDeptEl.textContent = empActor.dept || 'Departemen Rekayasa & Pemeliharaan';
  }
  const primaryApprover = (typeof window.getPrimaryApprover === 'function') 
    ? window.getPrimaryApprover() 
    : { name: 'Ir. Hendra Gunawan, M.T.' };
  const heroApproverEl = document.getElementById('mobileHeroEmpApprover');
  if (heroApproverEl) {
    heroApproverEl.textContent = `Atasan: ${primaryApprover.name}`;
  }

  // 2. Active Ticket Data
  const ticketsList = window.ticketsList || [];
  const empTickets = ticketsList.filter(t => !t.deletedByKaryawan && (t.employeeName === empActor.name || t.employeeNip === empActor.nip || (!t.employeeName && t.employeeId === 'EMP-001')));

  const activeTicket = empTickets.find(t => 
    t.status === 'Sedang di Luar' || 
    t.status === 'Disetujui' || 
    t.status === 'Menunggu Persetujuan' || 
    t.status === 'Menunggu Otorisasi Darurat' ||
    t.status === 'Terlambat'
  );

  // 3. Render Hero Active Strip
  const heroActiveStripWrap = document.getElementById('mobileHeroActiveStripWrap');
  if (heroActiveStripWrap) {
    if (activeTicket) {
      const isOutside = activeTicket.status === 'Sedang di Luar' || activeTicket.status === 'Terlambat';
      const scanOutStr = activeTicket.scanOutTime ? activeTicket.scanOutTime.replace(/ \(Pos 1.*\)/, '') : (activeTicket.plannedExit ? window.formatDisplayDate(activeTicket.plannedExit) : '-');
      const returnStr = activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : '-';

      heroActiveStripWrap.innerHTML = `
        <div class="mobile-hero-active-box">
          <div style="font-weight: 700; color: #a7f3d0; display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #34d399;"></span>
            <span>Izin Aktif · ${activeTicket.id}</span>
          </div>
          <div style="color: #ffffff; font-size: 0.775rem; margin-top: 3px; font-weight: 600;">
            ${activeTicket.category} • ${isOutside ? 'Scan Out ' + scanOutStr : 'Rencana ' + scanOutStr}
          </div>
          <div style="color: #d1fae5; font-size: 0.725rem; margin-top: 2px;">
            Estimasi kembali ${returnStr}
          </div>
        </div>
      `;
    } else {
      heroActiveStripWrap.innerHTML = `
        <div class="mobile-hero-active-box" style="background: rgba(255,255,255,0.05);">
          <div style="font-weight: 700; color: #a7f3d0;">Status: Tidak Ada Perizinan Aktif</div>
          <div style="color: #ecfdf5; font-size: 0.75rem; margin-top: 2px; opacity: 0.9;">
            Ajukan izin bila hendak meninggalkan area pabrik.
          </div>
        </div>
      `;
    }
  }

  // 4. Update 3-Column Stats (PDF Page 1)
  const completedTickets = empTickets.filter(t => t.status === 'Selesai');
  const lateTickets = completedTickets.filter(t => t.isLate || (t.scanInTime && t.scanInTime.includes('Terlambat')));
  const onTimeCount = completedTickets.length - lateTickets.length;

  const statTotalMonth = document.getElementById('mobileStatTotalMonth');
  if (statTotalMonth) statTotalMonth.textContent = empTickets.length || 8;

  const statCompleted = document.getElementById('mobileStatCompleted');
  if (statCompleted) statCompleted.textContent = completedTickets.length || 6;

  const statCompletedSub = document.getElementById('mobileStatCompletedSub');
  if (statCompletedSub) {
    statCompletedSub.innerHTML = `${Math.max(1, onTimeCount)} tepat waktu, ${lateTickets.length || 1} terlambat`;
  }

  const statActive = document.getElementById('mobileStatActive');
  if (statActive) statActive.textContent = activeTicket ? 1 : 0;

  const statActiveSub = document.getElementById('mobileStatActiveSub');
  if (statActiveSub) {
    statActiveSub.textContent = activeTicket ? (activeTicket.status === 'Sedang di Luar' ? 'Di luar area' : activeTicket.status) : 'Tidak ada izin';
  }

  // 5. Render Card: Izin Aktif Saya (PDF Page 1)
  const mobileCardActivePermit = document.getElementById('mobileCardActivePermit');
  if (mobileCardActivePermit) {
    if (activeTicket) {
      const isPending = activeTicket.status === 'Menunggu Persetujuan';
      const isApproved = activeTicket.status === 'Disetujui';
      const isOutside = activeTicket.status === 'Sedang di Luar' || activeTicket.status === 'Terlambat';
      const isEmergency = activeTicket.isEmergency || (activeTicket.id && activeTicket.id.includes('-EMG-')) || activeTicket.status === 'Menunggu Otorisasi Darurat';

      const col1Label = (isOutside && activeTicket.scanOutTime) ? 'Scan Out • Pos 1' : 'Rencana Keluar';
      const col1Val = (isOutside && activeTicket.scanOutTime) ? activeTicket.scanOutTime.replace(/ \(Pos 1.*\)/, '') : (activeTicket.plannedExit ? window.formatDisplayDate(activeTicket.plannedExit) : '-');
      const col2Label = activeTicket.type === 'Pulang Mendahului' ? 'Tipe Kepulangan' : 'Batas kembali';
      const col2Val = activeTicket.type === 'Pulang Mendahului' ? 'Pulang Lebih Awal' : (activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : '-');

      let mobileBtnsHtml = '';
      if (isApproved) {
        mobileBtnsHtml = `
          <button type="button" class="btn-mobile-primary" onclick="openTicketDetail('${activeTicket.id}', 'qr')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>Buka QR Izin</span>
          </button>
          <button type="button" class="btn-mobile-danger-outline" onclick="openCancelModal('${activeTicket.id}')">
            <span>Batalkan Izin</span>
          </button>
        `;
      } else if (isOutside) {
        const hasPendingExt = activeTicket.pendingExtension && activeTicket.pendingExtension.status === 'Menunggu Persetujuan';
        const hasUsedExtension = activeTicket.extensionApproved || (activeTicket.extensionCount && activeTicket.extensionCount >= 1);

        mobileBtnsHtml = `
          ${hasPendingExt ? `
            <button type="button" class="btn-mobile-secondary" disabled style="opacity: 0.7;">
              <span>Perpanjangan Sedang Ditinjau Atasan</span>
            </button>
          ` : (hasUsedExtension ? `
            <button type="button" class="btn-mobile-secondary" disabled style="opacity: 0.6; cursor: not-allowed;">
              <span>Perpanjangan Telah Digunakan (Maks. 1x)</span>
            </button>
          ` : `
            <button type="button" class="btn-mobile-secondary" onclick="openExtendDurationModal('${activeTicket.id}')">
              <span>Ajukan Perpanjangan</span>
            </button>
          `)}
          <button type="button" class="btn-mobile-primary" style="background: #047857;" onclick="executeScanIn('${activeTicket.id}')">
            <span>✓ Tap In Kartu Akses (Masuk)</span>
          </button>
        `;
      } else if (isPending) {
        mobileBtnsHtml = `
          <button type="button" class="btn-mobile-secondary" onclick="window.openEditTicketModal('${activeTicket.id}')">
            <span>Edit Pengajuan</span>
          </button>
          <button type="button" class="btn-mobile-danger-outline" onclick="openCancelModal('${activeTicket.id}')">
            <span>Batalkan Izin</span>
          </button>
        `;
      } else if (isEmergency) {
        mobileBtnsHtml = `
          <button type="button" class="btn-mobile-primary" style="background: #be123c;" onclick="window.openEmergencyUnlockModal('${activeTicket.id}')">
            <span>⚡ Otorisasi Darurat (Input Sandi / Wajah)</span>
          </button>
          <button type="button" class="btn-mobile-secondary" onclick="window.openEditTicketModal('${activeTicket.id}')">
            <span>Edit Data Darurat</span>
          </button>
          <button type="button" class="btn-mobile-danger-outline" onclick="openCancelModal('${activeTicket.id}')">
            <span>Batalkan Izin</span>
          </button>
        `;
      }

      mobileCardActivePermit.innerHTML = `
        <div class="mobile-card-header">
          <h3 class="mobile-card-title">Izin aktif saya</h3>
          <a href="#" class="figma-card-link" onclick="openTicketDetail('${activeTicket.id}', 'detail'); return false;">Detail pengajuan</a>
        </div>
        <div>
          <div style="font-size: 1.05rem; font-weight: 800; font-family: var(--font-mono); color: var(--text-primary);">${activeTicket.id}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px; font-weight: 600;">${activeTicket.category} • ${activeTicket.type}</div>
          <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-top: 10px;">Tujuan keluar</div>
          <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${activeTicket.destination}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${activeTicket.reason || ''}">${activeTicket.reason || '-'}</div>
          <div style="margin-top: 6px; display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.775rem;">
            <span style="color: var(--text-muted); font-weight: 600;">status:</span>
            ${getCleanEmpStatus(activeTicket.status, activeTicket)}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border-color, #f1f5f9);">
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${col1Label}</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${col1Val}</div>
          </div>
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${col2Label}</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${col2Val}</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px;">
          ${mobileBtnsHtml}
        </div>

        <a href="#" class="mobile-link-rincian" onclick="openTicketDetail('${activeTicket.id}', 'detail'); return false;">Rincian</a>
      `;
    } else {
      mobileCardActivePermit.innerHTML = `
        <div class="mobile-card-header">
          <h3 class="mobile-card-title">Izin aktif saya</h3>
        </div>
        <div style="padding: 1.25rem 0.5rem; text-align: center;">
          <div style="font-size: 1.8rem; margin-bottom: 0.4rem;">🏢</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a;">Tidak Ada Perizinan Aktif</div>
          <p style="font-size: 0.775rem; color: #64748b; margin: 4px auto 14px; max-width: 280px; line-height: 1.4;">
            Anda sedang berada di kawasan operasional pabrik.
          </p>
          <button type="button" class="btn-mobile-primary" onclick="window.setKaryawanNav('pengajuan')">
            Buat Pengajuan Izin Baru
          </button>
        </div>
      `;
    }
  }

  // 6. Render Card: Pengajuan Terbaru (PDF Page 1 - 2 items)
  const mobileRecentTicketsList = document.getElementById('mobileRecentTicketsList');
  if (mobileRecentTicketsList) {
    const pastTickets = empTickets.filter(t => !activeTicket || t.id !== activeTicket.id).slice(0, 2);
    if (pastTickets.length === 0) {
      mobileRecentTicketsList.innerHTML = `
        <div style="padding: 1rem 0; text-align: center; color: #94a3b8; font-size: 0.8rem;">
          Belum ada riwayat pengajuan sebelumnya.
        </div>
      `;
    } else {
      mobileRecentTicketsList.innerHTML = pastTickets.map((t, idx) => {
        const dateStr = t.createdAt ? t.createdAt.slice(0, 11) : '19 Okt 2026';
        const plannedStr = t.plannedExit ? t.plannedExit.slice(11, 16) : '10.00';
        const returnStr = t.estimatedReturn ? t.estimatedReturn.slice(11, 16) : '';
        const timeRange = returnStr ? `${plannedStr}–${returnStr} WIB` : `${plannedStr} WIB`;

        return `
          <div style="padding: 10px 0; ${idx < pastTickets.length - 1 ? 'border-bottom: 1px solid #f1f5f9;' : ''} display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <div style="font-size: 0.9rem; font-weight: 800; font-family: var(--font-mono); color: #0f172a;">${t.id}</div>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">
                ${dateStr} • ${t.category} • ${timeRange}
              </div>
              <a href="#" onclick="openTicketDetail('${t.id}', 'detail'); return false;" style="display: inline-block; margin-top: 4px; font-size: 0.775rem; font-weight: 700; color: #059669; text-decoration: underline;">Rincian</a>
            </div>
            <div>${getCleanEmpStatus(t.status, t)}</div>
          </div>
        `;
      }).join('');
    }
  }
}

// Mobile Segment Switcher (PDF Page 1 & 4)
function switchKaryawanMobileSegment(seg) {
  const btnRingkasan = document.getElementById('btnMobileSegRingkasan');
  const btnDonut = document.getElementById('btnMobileSegDonut');
  const ringkasanCard = document.getElementById('mobileStatsRingkasanWrap');
  const donutCard = document.getElementById('mobileDonutCardWrap');

  if (seg === 'ringkasan') {
    if (btnRingkasan) btnRingkasan.classList.add('active');
    if (btnDonut) btnDonut.classList.remove('active');
    if (ringkasanCard) ringkasanCard.style.display = 'grid';
    if (donutCard) donutCard.style.display = 'none';
  } else {
    if (btnDonut) btnDonut.classList.add('active');
    if (btnRingkasan) btnRingkasan.classList.remove('active');
    if (ringkasanCard) ringkasanCard.style.display = 'none';
    if (donutCard) donutCard.style.display = 'block';
    renderKaryawanMobileDonutChart();
  }
}

// Render Donut Chart Total Pengajuan Izin untuk Mobile (PDF Page 4)
function renderKaryawanMobileDonutChart() {
  const container = document.getElementById('mobileDonutChartContainer');
  if (!container) return;

  const tickets = (window.ticketsList || []).filter(t => !t.deletedByKaryawan);
  const total = tickets.length || 8;
  const selesaiCount = tickets.filter(t => t.status === 'Selesai').length || 6;
  const aktifCount = tickets.filter(t => t.status === 'Sedang di Luar' || t.status === 'Disetujui' || t.status === 'Menunggu Persetujuan').length || 1;
  const daruratCount = tickets.filter(t => t.isEmergency || (t.id && t.id.includes('-EMG-'))).length || 1;

  const selesaiPct = Math.round((selesaiCount / total) * 100);
  const aktifPct = Math.round((aktifCount / total) * 100);
  const daruratPct = Math.round((daruratCount / total) * 100);

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-around; gap: 14px; padding: 10px 0;">
      <!-- SVG Donut Chart -->
      <div style="position: relative; width: 110px; height: 110px; flex-shrink: 0;">
        <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" stroke-width="4"></circle>
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#059669" stroke-width="4" stroke-dasharray="${selesaiPct} ${100 - selesaiPct}" stroke-dashoffset="0"></circle>
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#d97706" stroke-width="4" stroke-dasharray="${aktifPct} ${100 - aktifPct}" stroke-dashoffset="-${selesaiPct}"></circle>
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#dc2626" stroke-width="4" stroke-dasharray="${daruratPct} ${100 - daruratPct}" stroke-dashoffset="-${selesaiPct + aktifPct}"></circle>
        </svg>
        <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
          <span style="font-size: 1.35rem; font-weight: 800; color: #0f172a; line-height: 1;">${total}</span>
          <span style="font-size: 0.65rem; color: #64748b; font-weight: 600; margin-top: 2px;">Total</span>
        </div>
      </div>

      <!-- Legend (PDF Page 4) -->
      <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
        <div>
          <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; color: #0f172a;">
            <span style="width: 9px; height: 9px; background: #059669; border-radius: 2px; flex-shrink: 0;"></span>
            <span>${selesaiCount} Selesai</span>
          </div>
          <div style="font-size: 0.7rem; color: #64748b; padding-left: 15px;">${selesaiPct}% dari total</div>
        </div>

        <div>
          <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; color: #0f172a;">
            <span style="width: 9px; height: 9px; background: #d97706; border-radius: 2px; flex-shrink: 0;"></span>
            <span>${aktifCount} Sedang Aktif</span>
          </div>
          <div style="font-size: 0.7rem; color: #64748b; padding-left: 15px;">${aktifPct}% dari total</div>
        </div>

        <div>
          <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; color: #0f172a;">
            <span style="width: 9px; height: 9px; background: #dc2626; border-radius: 2px; flex-shrink: 0;"></span>
            <span>${daruratCount} Izin Darurat</span>
          </div>
          <div style="font-size: 0.7rem; color: #64748b; padding-left: 15px;">${daruratPct}% dari total</div>
        </div>
      </div>
    </div>
  `;
}

// Mobile Dev Role Switcher Helpers (Delegated to mobile_app.js)
function openMobileRoleSheet() {
  if (typeof window.openMobileRoleSheet === 'function' && window.openMobileRoleSheet !== openMobileRoleSheet) {
    window.openMobileRoleSheet();
    return;
  }
  const sheet = document.getElementById('mobileRoleSheet');
  const backdrop = document.getElementById('mobileModalBackdrop') || document.getElementById('mobileRoleSheetBackdrop');
  if (sheet) sheet.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
}

function closeMobileRoleSheet() {
  if (typeof window.closeMobileRoleSheet === 'function' && window.closeMobileRoleSheet !== closeMobileRoleSheet) {
    window.closeMobileRoleSheet();
    return;
  }
  const sheet = document.getElementById('mobileRoleSheet');
  const backdrop = document.getElementById('mobileModalBackdrop') || document.getElementById('mobileRoleSheetBackdrop');
  if (sheet) sheet.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
}

function switchMobileRole(role) {
  if (typeof window.mobileSwitchRole === 'function') {
    window.mobileSwitchRole(role);
    return;
  }
  closeMobileRoleSheet();
}

// Expose mobile functions
window.renderKaryawanMobileDashboard = renderKaryawanMobileDashboard;
window.switchKaryawanMobileSegment = switchKaryawanMobileSegment;
window.renderKaryawanMobileDonutChart = renderKaryawanMobileDonutChart;
window.switchMobileRole = switchMobileRole;
