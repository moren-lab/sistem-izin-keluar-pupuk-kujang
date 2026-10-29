/**
 * Gate officers mapping & multi-gate support for Pos 1, Pos 2, Pos 3
 */
const GATE_OFFICERS = {
  'Pos 1 Gerbang Utama': {
    nip: 'SEC-2018-042',
    name: 'Sertu Agus',
    title: 'Petugas Pengamanan (Pos 1)',
    gateName: 'Pos 1 Gerbang Utama',
    gateShort: 'Pos 1',
    gateFull: 'Pos 1 Gerbang Utama (Utara)'
  },
  'Pos 2 Gerbang Barat': {
    nip: 'SEC-2019-088',
    name: 'Kopral Dani',
    title: 'Petugas Pengamanan (Pos 2)',
    gateName: 'Pos 2 Gerbang Barat',
    gateShort: 'Pos 2',
    gateFull: 'Pos 2 Gerbang Barat'
  },
  'Pos 3 Gerbang Timur': {
    nip: 'SEC-2020-105',
    name: 'Praka Ilham',
    title: 'Petugas Pengamanan (Pos 3)',
    gateName: 'Pos 3 Gerbang Timur',
    gateShort: 'Pos 3',
    gateFull: 'Pos 3 Gerbang Timur'
  }
};

function getActiveGateOfficer(gateKey) {
  const users = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
  const gateShort = gateKey && gateKey.includes('Pos 2') ? 'Pos 2' : (gateKey && gateKey.includes('Pos 3') ? 'Pos 3' : 'Pos 1');
  const matchedUser = users.find(u => 
    (u.roleKey === 'security' || (u.role && u.role.toLowerCase().includes('pengamanan'))) &&
    (u.role && u.role.includes(gateShort)) &&
    u.status === 'Aktif'
  );
  if (matchedUser) {
    const fullName = gateShort === 'Pos 2' ? 'Pos 2 Gerbang Barat' : (gateShort === 'Pos 3' ? 'Pos 3 Gerbang Timur' : 'Pos 1 Gerbang Utama');
    return {
      nip: matchedUser.nip,
      name: matchedUser.name,
      title: matchedUser.role || `Petugas Pengamanan (${gateShort})`,
      gateName: gateKey || fullName,
      gateShort: gateShort,
      gateFull: fullName
    };
  }
  const defaultGate = gateKey && GATE_OFFICERS[gateKey] ? GATE_OFFICERS[gateKey] : (GATE_OFFICERS[gateShort === 'Pos 2' ? 'Pos 2 Gerbang Barat' : (gateShort === 'Pos 3' ? 'Pos 3 Gerbang Timur' : 'Pos 1 Gerbang Utama')]);
  return defaultGate || GATE_OFFICERS['Pos 1 Gerbang Utama'];
}
window.getActiveGateOfficer = getActiveGateOfficer;

function getCurrentSecurityActor() {
  const currentGate = localStorage.getItem('KUJANG_ACTIVE_GATE') || 'Pos 1 Gerbang Utama';
  const officer = getActiveGateOfficer(currentGate);
  if (window.ACTORS && window.ACTORS.security) {
    window.ACTORS.security.name = officer.name;
    window.ACTORS.security.nip = officer.nip;
    window.ACTORS.security.gateName = officer.gateName;
    window.ACTORS.security.title = officer.title;
  }
  return officer;
}
window.getCurrentSecurityActor = getCurrentSecurityActor;

function updateActiveSecurityGate(gateValue, notify = false) {
  const officer = getActiveGateOfficer(gateValue);
  localStorage.setItem('KUJANG_ACTIVE_GATE', gateValue);

  if (window.ACTORS && window.ACTORS.security) {
    window.ACTORS.security.name = officer.name;
    window.ACTORS.security.nip = officer.nip;
    window.ACTORS.security.gateName = officer.gateName;
    window.ACTORS.security.title = officer.title;
  }

  const selectGateLocation = document.getElementById('selectGateLocation');
  if (selectGateLocation && selectGateLocation.value !== gateValue) {
    selectGateLocation.value = gateValue;
  }

  const securityOfficerBadge = document.getElementById('securityOfficerBadge');
  if (securityOfficerBadge) {
    securityOfficerBadge.textContent = `Petugas Jaga: ${officer.name} — ${officer.gateShort}`;
  }

  const sidebarUserName = document.getElementById('sidebarUserName');
  const sidebarUserSub = document.getElementById('sidebarUserSub');
  if (window.currentActor === 'security') {
    if (sidebarUserName) sidebarUserName.textContent = officer.name;
    if (sidebarUserSub) sidebarUserSub.textContent = `NIP: ${officer.nip} — ${officer.gateName}`;
  }

  const secHeroGreeting = document.getElementById('secHeroGreeting');
  const secHeroSub = document.getElementById('secHeroSub');
  if (secHeroGreeting) secHeroGreeting.textContent = `Selamat bertugas, ${officer.name}`;
  if (secHeroSub) {
    secHeroSub.textContent = `${officer.title} — ${officer.gateName} — Departemen Pengamanan & K3 — PT Pupuk Kujang`;
  }

  const figmaPelacakanCountMeta = document.getElementById('figmaPelacakanCountMeta');
  if (figmaPelacakanCountMeta) {
    figmaPelacakanCountMeta.textContent = `${officer.gateName} — PT Pupuk Kujang`;
  }

  if (notify && typeof window.showToast === 'function') {
    window.showToast(`Beralih ke pos jaga: ${officer.gateName} (${officer.name})`, 'info');
  }

  renderSecurityView();
}
window.updateActiveSecurityGate = updateActiveSecurityGate;

function getTicketGate(t) {
  if (t.scanOutGate) return t.scanOutGate;
  const str = `${t.scanOutTime || ''} ${t.scanInTime || ''} ${t.securityOfficerOut || ''}`;
  if (str.includes('Pos 2')) return 'Pos 2 Gerbang Barat';
  if (str.includes('Pos 3')) return 'Pos 3 Gerbang Timur';
  if (str.includes('Pos 1')) return 'Pos 1 Gerbang Utama';
  if (t.timeline && Array.isArray(t.timeline)) {
    for (const ev of t.timeline) {
      const evStr = `${ev.by || ''} ${ev.desc || ''} ${ev.gate || ''}`;
      if (evStr.includes('Pos 2')) return 'Pos 2 Gerbang Barat';
      if (evStr.includes('Pos 3')) return 'Pos 3 Gerbang Timur';
      if (evStr.includes('Pos 1')) return 'Pos 1 Gerbang Utama';
    }
  }
  return 'Pos 1 Gerbang Utama';
}
window.getTicketGate = getTicketGate;

function getGateBadgeHtml(gateName) {
  if (!gateName) gateName = 'Pos 1 Gerbang Utama';
  if (gateName.includes('Pos 2')) {
    return `<span class="gate-badge-pill pos-2">Pos 2 Gerbang Barat</span>`;
  } else if (gateName.includes('Pos 3')) {
    return `<span class="gate-badge-pill pos-3">Pos 3 Gerbang Timur</span>`;
  }
  return `<span class="gate-badge-pill pos-1">Pos 1 Gerbang Utama</span>`;
}
window.getGateBadgeHtml = getGateBadgeHtml;

function updateGateFilterCounts() {
  const ticketsList = (window.ticketsList || []).filter(t => !t.deletedBySecurity);
  const eligible = ticketsList.filter(t => t.scanOutTime || t.scanInTime || t.status === 'Sedang di Luar' || t.status === 'Selesai' || t.status === 'Terlambat' || t.status === 'Disetujui');

  let cAll = eligible.length;
  let cPos1 = 0;
  let cPos2 = 0;
  let cPos3 = 0;

  eligible.forEach(t => {
    const g = getTicketGate(t);
    if (g.includes('Pos 2')) cPos2++;
    else if (g.includes('Pos 3')) cPos3++;
    else cPos1++;
  });

  const countGateAll = document.getElementById('countGateAll');
  const countGatePos1 = document.getElementById('countGatePos1');
  const countGatePos2 = document.getElementById('countGatePos2');
  const countGatePos3 = document.getElementById('countGatePos3');

  if (countGateAll) countGateAll.textContent = cAll;
  if (countGatePos1) countGatePos1.textContent = cPos1;
  if (countGatePos2) countGatePos2.textContent = cPos2;
  if (countGatePos3) countGatePos3.textContent = cPos3;
}
window.updateGateFilterCounts = updateGateFilterCounts;

function setSecurityGateFilter(gate) {
  window.currentSecurityGateFilter = gate;
  const filterSecurityLogGate = document.getElementById('filterSecurityLogGate');
  if (filterSecurityLogGate) filterSecurityLogGate.value = gate;

  document.querySelectorAll('.btn-gate-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-gate') === gate);
  });

  const secTitle = document.getElementById('securityRiwayatSectionTitle');
  const secMeta = document.getElementById('securityRiwayatSectionMeta');
  if (secTitle) {
    if (gate === 'all') {
      secTitle.textContent = 'Log & Arsip Seluruh Gerbang Pos Jaga';
    } else {
      secTitle.textContent = `Log & Arsip Pemindaian Gerbang ${gate}`;
    }
  }
  if (secMeta) {
    const officer = gate === 'all' ? null : getActiveGateOfficer(gate);
    secMeta.textContent = officer ? `Petugas Bertugas: ${officer.name} (${officer.gateShort})` : 'Riwayat Scan Out & Kepulangan Personel di Seluruh Pos';
  }

  renderSecurityView();
}
window.setSecurityGateFilter = setSecurityGateFilter;

/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Security (Pos Jaga Satpam) Module: Dashboard, Scanner Engine, Headcount Pelacakan, Riwayat, Scan In / Scan Out
 */

let html5QrScannerInstance = null;
let isCameraScanningActive = false;
let cameraDevicesList = [];
let lastScannedCode = null;
let scanCooldownTimer = null;

function updateSecurityMetrics() {
  const ticketsList = window.ticketsList || [];
  const outsideCount = ticketsList.filter(t => t.status === 'Sedang di Luar' || t.status === 'Terlambat').length;
  const readyExitCount = ticketsList.filter(t => t.status === 'Disetujui').length;
  const scanOutCount = ticketsList.filter(t => t.scanOutTime).length;
  const scanInCount = ticketsList.filter(t => t.scanInTime).length;

  const statSecOutside = document.getElementById('statSecOutside');
  const statSecReadyExit = document.getElementById('statSecReadyExit');
  const statSecScanOutCount = document.getElementById('statSecScanOutCount');
  const statSecScanInCount = document.getElementById('statSecScanInCount');
  const sidebarOutsideBadge = document.getElementById('sidebarOutsideBadge');

  if (statSecOutside) statSecOutside.textContent = outsideCount;
  if (statSecReadyExit) statSecReadyExit.textContent = readyExitCount;
  if (statSecScanOutCount) statSecScanOutCount.textContent = scanOutCount;
  if (statSecScanInCount) statSecScanInCount.textContent = scanInCount;
  if (sidebarOutsideBadge) sidebarOutsideBadge.textContent = outsideCount;
}

function renderSecurityDashboard() {
  const ticketsList = window.ticketsList || [];
  const secActor = typeof getCurrentSecurityActor === 'function' ? getCurrentSecurityActor() : (window.ACTORS && window.ACTORS.security ? window.ACTORS.security : { name: 'Sertu Agus', role: 'Petugas Pengamanan', gateName: 'Pos 1 Gerbang Utama' });
  const secHeroGreeting = document.getElementById('secHeroGreeting');
  const secHeroSub = document.getElementById('secHeroSub');
  if (secHeroGreeting) {
    secHeroGreeting.textContent = `Selamat bertugas, ${secActor.name}`;
  }
  if (secHeroSub) {
    const title = secActor.role || secActor.title || 'Petugas Pengamanan';
    const dept = secActor.department || 'Departemen Pengamanan & K3';
    secHeroSub.textContent = `${title} — ${secActor.gateName || 'Pos 1 Gerbang Utama'} — ${dept} — PT Pupuk Kujang`;
  }
  updateSecurityMetrics();
  const readyExitTickets = ticketsList.filter(t => t.status === 'Disetujui');
  const overdueTickets = ticketsList.filter(t => t.status === 'Terlambat');
  const outsideTickets = ticketsList.filter(t => t.status === 'Sedang di Luar' || t.status === 'Terlambat');
  const recentTransactions = ticketsList
    .filter(t => t.scanOutTime || t.scanInTime)
    .slice(0, 5);

  const securityOverdueBanner = document.getElementById('securityOverdueBanner');
  const securityDashboardReadyExitList = document.getElementById('securityDashboardReadyExitList');
  const badgeReadyExitCount = document.getElementById('badgeReadyExitCount');
  const securityDashboardOutsideList = document.getElementById('securityDashboardOutsideList');
  const securityDashboardRecentFeed = document.getElementById('securityDashboardRecentFeed');

  // Ready to Exit (Disetujui) List for Pos Gate
  if (badgeReadyExitCount) {
    badgeReadyExitCount.textContent = `${readyExitTickets.length} Karyawan`;
  }

  if (securityDashboardReadyExitList) {
    if (readyExitTickets.length === 0) {
      securityDashboardReadyExitList.innerHTML = `
        <div style="padding: 1.25rem; text-align: center; color: var(--text-secondary); font-size: 0.825rem;">
          Belum ada izin baru yang disetujui untuk keluar saat ini.
        </div>
      `;
    } else {
      securityDashboardReadyExitList.innerHTML = readyExitTickets.map(t => {
        const isEmergency = t.isEmergency || (t.id && t.id.startsWith('TK-EMG'));
        return `
          <div class="feed-item" style="border-radius: 8px; margin-bottom: 0.5rem; padding: 0.75rem 1rem;">
            <div class="feed-item-left">
              <div class="feed-item-icon" style="background: ${isEmergency ? '#ffe4e6' : '#dbeafe'}; color: ${isEmergency ? '#be123c' : '#1d4ed8'}; font-size: 0.75rem; font-weight: 800;">
                ${isEmergency ? 'EMG' : 'REG'}
              </div>
              <div>
                <div class="feed-item-title" style="font-weight: 800; color: var(--text-primary);">${t.applicantName || 'Budi Pratama'} <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">(${t.id})</span></div>
                <div class="feed-item-sub" style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">
                  Tujuan: <strong>${t.destination}</strong> — Rencana Keluar: <span style="font-family: var(--font-mono); font-weight: 700;">${t.plannedExit ? t.plannedExit.replace('T', ' ') : 'Hari Ini'}</span>
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span class="status-pill-green" style="font-size: 0.7rem;">Disetujui</span>
              <button type="button" class="btn-card-detail" style="padding: 0.35rem 0.65rem; font-size: 0.725rem; font-weight: 600; min-height: 30px; display: inline-flex; align-items: center; gap: 0.3rem;" onclick="window.openTicketDetail('${t.id}', 'detail')" title="Lihat Rincian Pengajuan">
                <span>Detail</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Overdue Banner
  if (securityOverdueBanner) {
    if (overdueTickets.length > 0) {
      securityOverdueBanner.style.display = 'block';
      securityOverdueBanner.innerHTML = `
        <div class="security-overdue-alert" style="border-radius: 10px; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="security-overdue-icon-box" style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <div>
              <div class="security-overdue-title" style="font-weight: 800; font-size: 0.9rem;">
                PERINGATAN GERBANG: Ada ${overdueTickets.length} Karyawan Terlambat Kembali ke Pabrik!
              </div>
              <div class="security-overdue-sub" style="font-size: 0.775rem;">
                Karyawan telah melewati batas estimasi jam kembali. Pastikan segera memindai (Scan In) begitu tiba di Pos Jaga.
              </div>
            </div>
          </div>
          <button class="btn-quick-scan-in" style="background: #b91c1c; font-size: 0.775rem; padding: 0.45rem 0.85rem;" onclick="setSecurityNav('pelacakan')">
            Lihat Headcount Terlambat
          </button>
        </div>
      `;
    } else {
      securityOverdueBanner.style.display = 'none';
    }
  }

  // Outside headcount list with 1-click Scan In
  if (securityDashboardOutsideList) {
    if (outsideTickets.length === 0) {
      securityDashboardOutsideList.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
          Tidak ada karyawan yang sedang di luar pabrik.
        </div>
      `;
    } else {
      securityDashboardOutsideList.innerHTML = outsideTickets.map(t => {
        const isOverdue = t.status === 'Terlambat';
        return `
          <div class="feed-item ${isOverdue ? 'item-overdue' : ''}">
            <div class="feed-item-left">
              <div class="feed-item-icon" style="background: ${isOverdue ? 'var(--rose-light)' : '#e0f2fe'}; color: ${isOverdue ? 'var(--rose-danger)' : '#0284c7'}; font-size: 0.75rem; font-weight: 800;">
                ${isOverdue ? 'LATE' : 'OUT'}
              </div>
              <div>
                <div class="feed-item-title">${t.applicantName || 'Budi Pratama'} (${t.id})</div>
                <div class="feed-item-sub">
                  Tujuan: ${t.destination} — Rencana Kembali: <span style="font-family: var(--font-mono); font-weight: 700;">${t.estimatedReturn ? t.estimatedReturn.replace('T', ' ') : 'Pulang Hari Ini'}</span>
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              ${window.getStatusPill(t.status, t)}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Recent gate scan feed
  if (securityDashboardRecentFeed) {
    if (recentTransactions.length === 0) {
      securityDashboardRecentFeed.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
          Belum ada transaksi pemindaian gerbang yang tercatat pada sesi hari ini.
        </div>
      `;
    } else {
      securityDashboardRecentFeed.innerHTML = recentTransactions.map(t => {
        const isScanIn = !!t.scanInTime;
        return `
          <div class="feed-item">
            <div class="feed-item-left">
              <div class="feed-item-icon" style="background: ${isScanIn ? '#d1fae5' : '#e0f2fe'}; color: ${isScanIn ? '#059669' : '#0284c7'}; font-size: 0.75rem; font-weight: 800;">
                ${isScanIn ? 'IN' : 'OUT'}
              </div>
              <div>
                <div class="feed-item-title">${t.applicantName || 'Budi Pratama'} (${t.id})</div>
                <div class="feed-item-sub">
                  ${isScanIn ? `Scan In: ${t.scanInTime}` : `Scan Out: ${t.scanOutTime}`}
                </div>
              </div>
            </div>
            <span class="status-pill ${isScanIn ? 'completed' : 'outside'}" style="font-size: 0.7rem;">
              ${isScanIn ? 'Scan In Sukses' : 'Scan Out Sukses'}
            </span>
          </div>
        `;
      }).join('');
    }
  }
}

function renderSecurityCards(list, containerElement, isHistoryMode = false) {
  const containerSecurityQueue = document.getElementById('containerSecurityQueue');
  const target = containerElement || containerSecurityQueue;
  if (!target) return;

  target.innerHTML = `
    <div class="cards-grid">
      ${list.filter(t => !t.deletedBySecurity).map(t => {
        const isReadyExit = t.status === 'Disetujui';
        const isOutside = t.status === 'Sedang di Luar';
        const isOverdue = t.status === 'Terlambat';
        const isLateCompleted = (t.status === 'Selesai') && (t.isLate || (t.scanInTime && t.scanInTime.includes('[Terlambat]')) || (t.lateMinutes > 0));
        const isExpired = t.status === 'Kedaluwarsa';
        const isDinas = t.category === 'Dinas Kantor';

        const borderColor = isReadyExit ? 'var(--corp-teal)' 
                          : (isOverdue ? 'var(--rose-danger)' 
                          : (isLateCompleted ? '#d97706' 
                          : (isOutside ? '#0891b2' 
                          : (isExpired ? '#94a3b8' : ''))));

        const ticketGate = typeof getTicketGate === 'function' ? getTicketGate(t) : (t.scanOutGate || t.scanInGate || 'Pos 1 Gerbang Utama');
        const gateBadgeHtml = typeof getGateBadgeHtml === 'function' ? getGateBadgeHtml(ticketGate) : `<span class="gate-badge-pill pos-1">${ticketGate}</span>`;
        const scheduleWithDay = typeof window.formatTicketScheduleWithDay === 'function' 
          ? window.formatTicketScheduleWithDay(t) 
          : `<div style="font-weight: 600; color: var(--text-primary); font-size: 0.775rem; white-space: nowrap;">${(t.plannedExit || '').slice(0, 10)}</div><div style="font-size: 0.75rem; color: var(--text-secondary); font-family: var(--font-mono); margin-top: 2px; white-space: nowrap;">${(t.plannedExit || '').slice(11, 16)} WIB</div>`;

        // A. SPECIAL AIRY LAYOUT FOR RIWAYAT MODE (isHistoryMode === true)
        if (isHistoryMode) {
          return `
            <div class="card-item card-history-item" style="${borderColor ? `border-left: 4px solid ${borderColor};` : ''} display: flex; flex-direction: column;">
              <div class="card-top" style="margin-bottom: 0.65rem;">
                <div>
                  <span class="card-id-num">${t.id}</span>
                  <div class="card-created-meta">Diajukan: ${t.createdAt}</div>
                </div>
                ${window.getStatusPill(t.status, t)}
              </div>

              <!-- Employee badge -->
              <div style="background:var(--bg-subtle); padding:0.6rem 0.85rem; border-radius:6px; display:flex; align-items:center; justify-content:space-between; margin-bottom: 0.6rem;">
                <div>
                  <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary);">${t.applicantName || 'Budi Pratama'}</div>
                  <div style="font-size:0.725rem; color:var(--text-secondary);">NIP: ${t.applicantNip || 'PK-2024-8841'} — ${t.department || 'Departemen Terkait'}</div>
                </div>
                <span class="tag-badge ${isDinas ? 'tag-dinas' : 'tag-pribadi'}">${t.category}</span>
              </div>

              <!-- Detail Box (Tujuan keluar, Keperluan, Rencana waktu) Sesuai Gambar 2 -->
              <div class="figma-card-detail-box" style="display: flex; flex-direction: column; gap: 0.35rem; padding: 0.55rem 0.65rem; background: var(--bg-subtle, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: 6px; margin-bottom: 0.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem;">
                  <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; white-space: nowrap;">Tujuan keluar</span>
                  <span class="detail-val" style="font-size: 0.75rem; color: var(--text-primary, #0f172a); font-weight: 600; text-align: right; line-height: 1.35; max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${t.destination}">${t.destination}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem;">
                  <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; white-space: nowrap;">Keperluan</span>
                  <span class="detail-val" style="font-size: 0.75rem; color: var(--text-primary, #0f172a); font-weight: 500; text-align: right; max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.35;" title="${(t.reason || '').replace(/"/g, '&quot;')}">${t.reason || '-'}</span>
                </div>
                <div class="detail-schedule-row" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; padding-top: 0.35rem; border-top: 1px dashed var(--border-color, #e2e8f0);">
                  <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; white-space: nowrap;">Rencana waktu</span>
                  <div class="detail-schedule-val" style="text-align: right;">${scheduleWithDay}</div>
                </div>
              </div>


              <!-- Realization Summary Row (Scan Out & Scan In) -->
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.725rem; display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.75rem;">
                ${t.scanOutTime ? `<div style="color: #065f46;"><strong>Scan Out:</strong> ${t.scanOutTime}</div>` : ''}
                ${t.scanInTime ? `<div style="color: ${isLateCompleted ? '#b45309' : '#0e7490'}; font-weight: ${isLateCompleted ? '700' : 'normal'};"><strong>Scan In:</strong> ${t.scanInTime}</div>` : ''}
                ${(!t.scanOutTime && !t.scanInTime) ? `<div style="color: var(--text-muted);">Belum ada catatan pemindaian gerbang</div>` : ''}
              </div>

              ${isLateCompleted ? `
                <div class="sec-status-callout warning" style="border-radius:6px; padding:0.4rem 0.6rem; font-size:0.725rem; font-weight:700; margin-bottom: 0.6rem;">
                  Kembali melewati estimasi (+${typeof window.formatLateDurationFull === 'function' ? window.formatLateDurationFull(t.lateMinutes || 10) : `${t.lateMinutes || 10} menit`} terlambat).
                </div>
              ` : ''}

              <!-- Action Buttons (Single Symmetrical Row) -->
              <div class="card-actions-bar" style="display: flex; gap: 0.4rem; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 0.6rem; border-top: 1px solid var(--border-color); flex-wrap: nowrap;">
                <button class="btn-card-detail" style="flex: 1; min-width: 0; padding: 0.4rem 0.65rem; font-size: 0.75rem; font-weight: 600; min-height: 34px; justify-content: center; display: inline-flex; align-items: center; gap: 0.4rem; border-radius: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" onclick="window.openTicketDetail('${t.id}', 'detail')" title="Lihat Rincian Pengajuan">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                  <span>Detail pengajuan</span>
                </button>
                <button type="button" class="btn-figma-delete-single" style="background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.35); color: #ef4444; font-size: 0.725rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.4rem 0.6rem; border-radius: 6px; min-height: 34px; white-space: nowrap; flex-shrink: 0; transition: all 0.15s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.15)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.06)'" onclick="event.stopPropagation(); window.deleteSecurityTicket('${t.id}', 'riwayat')" title="Hapus Riwayat #${t.id}">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          `;
        }

        // B. STANDARD LAYOUT FOR PELACAKAN / HEADCOUNT QUEUE
        return `
          <div class="card-item" style="${borderColor ? `border-left: 4px solid ${borderColor};` : ''}">
            <div class="card-top">
              <div>
                <span class="card-id-num">${t.id}</span>
                <div class="card-created-meta">Diajukan: ${t.createdAt}</div>
              </div>
              ${window.getStatusPill(t.status, t)}
            </div>

            <!-- Employee badge in gate view -->
            <div style="background:var(--bg-subtle); padding:0.6rem 0.85rem; border-radius:6px; display:flex; align-items:center; justify-content:space-between;">
              <div>
                <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary);">${t.applicantName || 'Budi Pratama, S.T.'}</div>
                <div style="font-size:0.725rem; color:var(--text-secondary);">NIP: ${t.applicantNip || 'PK-2024-8841'} — ${t.department || 'Rekayasa Mesin'}</div>
              </div>
              <span class="tag-badge ${isDinas ? 'tag-dinas' : 'tag-pribadi'}">${t.category}</span>
            </div>

            <!-- Detail Box (Tujuan keluar, Keperluan, Rencana waktu) Sesuai Gambar 2 -->
            <div class="figma-card-detail-box" style="display: flex; flex-direction: column; gap: 0.35rem; padding: 0.55rem 0.65rem; background: var(--bg-subtle, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: 6px; margin: 0.4rem 0;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem;">
                <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; white-space: nowrap;">Tujuan keluar</span>
                <span class="detail-val" style="font-size: 0.75rem; color: var(--text-primary, #0f172a); font-weight: 600; text-align: right; line-height: 1.35; max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${t.destination}">${t.destination}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem;">
                <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; white-space: nowrap;">Keperluan</span>
                <span class="detail-val" style="font-size: 0.75rem; color: var(--text-primary, #0f172a); font-weight: 500; text-align: right; max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.35;" title="${(t.reason || '').replace(/"/g, '&quot;')}">${t.reason || '-'}</span>
              </div>
              <div class="detail-schedule-row" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; padding-top: 0.35rem; border-top: 1px dashed var(--border-color, #e2e8f0);">
                <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; white-space: nowrap;">Rencana waktu</span>
                <div class="detail-schedule-val" style="text-align: right;">${scheduleWithDay}</div>
              </div>
            </div>

            <!-- Pos Gate Badge -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 0.4rem;">
              ${gateBadgeHtml}
            </div>

            ${isOverdue ? `
              <div class="sec-status-callout danger" style="border-radius:6px; padding:0.45rem 0.65rem; font-size:0.75rem; font-weight:700;">
                Karyawan terlambat kembali! Wajib melakukan Tap In Kartu Akses saat tiba di kawasan.
              </div>
            ` : ''}

            ${isLateCompleted ? `
              <div class="sec-status-callout warning" style="border-radius:6px; padding:0.45rem 0.65rem; font-size:0.75rem; font-weight:700;">
                Karyawan kembali melewati estimasi waktu (+${typeof window.formatLateDurationFull === 'function' ? window.formatLateDurationFull(t.lateMinutes || 10) : `${t.lateMinutes || 10} menit`} terlambat).
              </div>
            ` : ''}

            ${isExpired ? `
              <div class="sec-status-callout neutral" style="border-radius:6px; padding:0.45rem 0.65rem; font-size:0.75rem;">
                Tiket telah kedaluwarsa & hangus (+10 menit dari rencana keluar). Dilarang diproses keluar.
              </div>
            ` : ''}

            ${t.scanOutTime ? `<div style="font-size:0.75rem; color:#065f46;"><strong>Scan Out:</strong> ${t.scanOutTime}</div>` : ''}
            ${t.scanInTime ? `<div style="font-size:0.75rem; color:${isLateCompleted ? '#b45309' : '#0e7490'}; font-weight:${isLateCompleted ? '700' : 'normal'};"><strong>Scan In:</strong> ${t.scanInTime}</div>` : ''}

            <!-- Quick Action Buttons for Satpam (Single Symmetrical Row) -->
            <div class="card-actions-bar" style="display: flex; gap: 0.4rem; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 0.6rem; border-top: 1px solid var(--border-color); flex-wrap: nowrap;">
              <button class="btn-card-detail" style="flex: 1; min-width: 0; padding: 0.4rem 0.65rem; font-size: 0.75rem; font-weight: 600; min-height: 34px; justify-content: center; display: inline-flex; align-items: center; gap: 0.4rem; border-radius: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" onclick="window.openTicketDetail('${t.id}', 'detail')" title="Lihat Rincian Pengajuan">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                <span>Detail pengajuan</span>
              </button>
              <button type="button" class="btn-figma-delete-single" style="background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.35); color: #ef4444; font-size: 0.725rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.4rem 0.6rem; border-radius: 6px; min-height: 34px; white-space: nowrap; flex-shrink: 0; transition: all 0.15s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.15)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.06)'" onclick="event.stopPropagation(); window.deleteSecurityTicket('${t.id}', '${isHistoryMode ? 'riwayat' : 'pelacakan'}')" title="Hapus Data #${t.id}">
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

function renderSecurityView() {
  if (typeof window.checkOverdueAndExpiredTickets === 'function') {
    window.checkOverdueAndExpiredTickets(true);
  }
  updateSecurityMetrics();
  const currentSecurityNav = window.currentSecurityNav || 'dashboard';
  const ticketsList = window.ticketsList || [];

  const containerSecurityQueue = document.getElementById('containerSecurityQueue');
  const emptySecurityBox = document.getElementById('emptySecurityBox');
  const containerSecurityLog = document.getElementById('containerSecurityLog');
  const emptySecurityLogBox = document.getElementById('emptySecurityLogBox');
  const filterSecurityQueueTab = document.getElementById('filterSecurityQueueTab');

  // 1. DASHBOARD SUBPAGE
  if (currentSecurityNav === 'dashboard') {
    renderSecurityDashboard();
    return;
  }

  // 2. SCANNER SUBPAGE
  if (currentSecurityNav === 'scanner') {
    return;
  }

  // 3. PELACAKAN KARYAWAN DI LUAR (HEADCOUNT)
  if (currentSecurityNav === 'pelacakan') {
    const queueMode = filterSecurityQueueTab ? filterSecurityQueueTab.value : 'outside';

    let list = ticketsList;
    if (queueMode === 'ready') {
      list = ticketsList.filter(t => t.status === 'Disetujui');
    } else if (queueMode === 'outside') {
      list = ticketsList.filter(t => t.status === 'Sedang di Luar' || t.status === 'Terlambat');
    } else if (queueMode === 'overdue') {
      list = ticketsList.filter(t => t.status === 'Terlambat');
    } else if (queueMode === 'emergency') {
      list = ticketsList.filter(t => t.isEmergency || (t.id && t.id.startsWith('TK-EMG')));
    }

    if (list.length === 0) {
      if (containerSecurityQueue) containerSecurityQueue.innerHTML = '';
      if (emptySecurityBox) emptySecurityBox.style.display = 'flex';
      return;
    }

    if (emptySecurityBox) emptySecurityBox.style.display = 'none';
    renderSecurityCards(list, containerSecurityQueue);
    return;
  }

  // 4. RIWAYAT PEMINDAIAN POS JAGA
  if (currentSecurityNav === 'riwayat') {
    const filteredLog = filterSecurityLogTickets();

    const btnSecurityLogViewCard = document.getElementById('btnSecurityLogViewCard');
    const btnSecurityLogViewTable = document.getElementById('btnSecurityLogViewTable');
    if (btnSecurityLogViewCard && btnSecurityLogViewTable) {
      btnSecurityLogViewCard.classList.toggle('active', window.currentSecurityLogViewMode === 'card');
      btnSecurityLogViewTable.classList.toggle('active', window.currentSecurityLogViewMode === 'table');
    }

    if (filteredLog.length === 0) {
      if (containerSecurityLog) containerSecurityLog.innerHTML = '';
      if (emptySecurityLogBox) emptySecurityLogBox.style.display = 'flex';
      return;
    }

    if (emptySecurityLogBox) emptySecurityLogBox.style.display = 'none';
    if (window.currentSecurityLogViewMode === 'table') {
      renderSecurityLogTable(filteredLog, containerSecurityLog);
    } else {
      renderSecurityCards(filteredLog, containerSecurityLog, true);
    }
    return;
  }
}

// RIWAYAT PEMINDAIAN GLOBAL STATE & HANDLERS
window.currentSecurityLogViewMode = window.currentSecurityLogViewMode || 'card';

function filterSecurityLogTickets() {
  const ticketsList = window.ticketsList || [];
  const searchSecurityLogInput = document.getElementById('searchSecurityLogInput');
  const filterSecurityLogCategory = document.getElementById('filterSecurityLogCategory');
  const filterSecurityLogStatus = document.getElementById('filterSecurityLogStatus');
  const filterSecurityLogPeriod = document.getElementById('filterSecurityLogPeriod');
  const filterSecurityLogGate = document.getElementById('filterSecurityLogGate');

  const query = searchSecurityLogInput ? searchSecurityLogInput.value.trim().toLowerCase() : '';
  const category = filterSecurityLogCategory ? filterSecurityLogCategory.value : 'all';
  const status = filterSecurityLogStatus ? filterSecurityLogStatus.value : 'all';
  const period = filterSecurityLogPeriod ? filterSecurityLogPeriod.value : 'all';
  const gateFilter = filterSecurityLogGate ? filterSecurityLogGate.value : (window.activeSecurityGateFilter || 'all');

  const ACTORS = window.ACTORS || {};
  const currentActor = window.currentActor || 'security';
  const myNip = ACTORS.karyawan ? ACTORS.karyawan.nip : 'PK-2024-8841';

  // Synchronize counts across tabs
  if (typeof updateGateFilterCounts === 'function') {
    updateGateFilterCounts();
  }

  const filtered = ticketsList.filter(t => {
    // Abaikan jika sudah dihapus dari pos jaga
    if (t.deletedBySecurity) return false;

    // Hak akses: jika peran adalah Karyawan, batasi riwayat hanya miliknya
    if (currentActor === 'karyawan') {
      const isMyTicket = t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841');
      if (!isMyTicket) return false;
    }

    // Hanya tiket yang relevan dengan transaksi pos gerbang atau selesai
    const hasLog = t.scanOutTime || t.scanInTime || t.status === 'Sedang di Luar' || t.status === 'Selesai' || t.status === 'Terlambat' || t.status === 'Disetujui';
    if (!hasLog) return false;

    // Filter Gerbang Pos (Multi-gate Pos 1, 2, 3)
    if (gateFilter && gateFilter !== 'all') {
      const ticketGate = typeof getTicketGate === 'function' ? getTicketGate(t) : (t.scanOutGate || t.scanInGate || 'Pos 1 Gerbang Utama');
      if (ticketGate !== gateFilter) return false;
    }

    // Filter Periode Waktu
    if (typeof window.matchesPeriodFilter === 'function' && !window.matchesPeriodFilter(t, period)) {
      return false;
    }

    // Filter Kategori
    if (category !== 'all' && t.category !== category) return false;

    // Filter Status
    if (status !== 'all') {
      if (status === 'Terlambat') {
        const isLate = t.status === 'Terlambat' || t.isLate || (t.scanInTime && t.scanInTime.includes('[Terlambat]'));
        if (!isLate) return false;
      } else if (status === 'Selesai') {
        if (t.status !== 'Selesai') return false;
      } else if (t.status !== status) {
        return false;
      }
    }

    // Search query (multi-token partial search matching)
    if (query) {
      const tGate = typeof getTicketGate === 'function' ? getTicketGate(t) : (t.scanOutGate || t.scanInGate || '');
      const matcher = typeof window.matchSearchTokens === 'function' ? window.matchSearchTokens : (typeof matchSearchTokens === 'function' ? matchSearchTokens : null);
      if (matcher) {
        if (!matcher(query, t.id, t.applicantName, t.applicantNip, t.destination, t.reason, tGate, t.approverName, t.department, t.category, t.type)) {
          return false;
        }
      } else {
        const matchId = (t.id || '').toLowerCase().includes(query);
        const matchName = (t.applicantName || '').toLowerCase().includes(query);
        const matchNip = (t.applicantNip || '').toLowerCase().includes(query);
        const matchDest = (t.destination || '').toLowerCase().includes(query);
        const matchReason = (t.reason || '').toLowerCase().includes(query);
        const matchGate = (tGate || '').toLowerCase().includes(query);
        if (!matchId && !matchName && !matchNip && !matchDest && !matchReason && !matchGate) return false;
      }
    }

    return true;
  });

  // Sorting Riwayat Pos Jaga (Terbaru / Terlama)
  const sortSecurityLog = document.getElementById('sortSecurityLog');
  const sortOrder = sortSecurityLog ? sortSecurityLog.value : 'desc';

  filtered.sort((a, b) => {
    const parseTime = (item) => {
      const raw = item.scanOutTime || item.createdAt || item.plannedExit || 0;
      const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
      return (d && !isNaN(d.getTime())) ? d.getTime() : 0;
    };
    const tA = parseTime(a);
    const tB = parseTime(b);
    return sortOrder === 'asc' ? tA - tB : tB - tA;
  });

  return filtered;
}

function renderSecurityLogTable(list, containerElement) {
  if (!containerElement) return;

  containerElement.innerHTML = `
    <div class="figma-table-card" style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
      <table class="figma-table" style="min-width: 980px;">
        <thead>
          <tr>
            <th style="min-width: 160px;">Nomor Tiket & Kategori</th>
            <th style="min-width: 140px;">Gerbang Pos</th>
            <th style="min-width: 200px;">Pemohon & Keperluan</th>
            <th style="white-space: nowrap; min-width: 140px;">Rencana Waktu</th>
            <th style="white-space: nowrap; min-width: 95px;">Status</th>
            <th style="min-width: 200px;">Catatan Pemindaian</th>
            <th style="text-align: right; white-space: nowrap; min-width: 90px;">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(t => {
            const statusHtml = typeof window.getCleanEmpStatus === 'function' ? window.getCleanEmpStatus(t.status, t) : window.getStatusPill(t.status, t);
            const ticketGate = typeof getTicketGate === 'function' ? getTicketGate(t) : (t.scanOutGate || t.scanInGate || 'Pos 1 Gerbang Utama');
            const gateBadge = typeof getGateBadgeHtml === 'function' ? getGateBadgeHtml(ticketGate) : `<span class="gate-badge-pill pos-1">${ticketGate}</span>`;
            
            let catatanHtml = `<span style="color: #475569;">Tepat waktu — Disetujui ${t.approverName || 'Atasan'}</span>`;
            if (t.scanInTime && t.scanOutTime) {
              const outSimple = t.scanOutTime.replace(/ \(Pos .*\)/, '');
              const inSimple = t.scanInTime.replace(/ \(Pos .*\)/, '');
              catatanHtml = `<span style="color: #047857; font-size: 0.725rem;">Scan Out: ${outSimple} — Scan In: ${inSimple}</span>`;
            } else if (t.scanOutTime) {
              const outSimple = t.scanOutTime.replace(/ \(Pos .*\)/, '');
              catatanHtml = `<span style="color: #0284c7; font-size: 0.725rem;">Sedang di Luar (Scan Out: ${outSimple})</span>`;
            } else if (t.status === 'Terlambat') {
              catatanHtml = `<span style="color: #b91c1c; font-weight: 600; font-size: 0.725rem;">Melewati batas waktu kembali — Belum Scan Masuk</span>`;
            } else if (t.isLate || (t.status === 'Selesai' && t.scanInTime && t.scanInTime.includes('[Terlambat]'))) {
              const lateStr = typeof window.formatLateDuration === 'function' ? window.formatLateDuration(t.lateMinutes || 10) : `${t.lateMinutes || 10} mnt`;
              catatanHtml = `<span style="color: #b45309; font-weight: 500; font-size: 0.725rem;">Kembali ${t.actualReturnTime || (t.scanInTime ? t.scanInTime.slice(11, 16) + ' WIB' : '12:10 WIB')} (+${lateStr})</span>`;
            } else if (t.status === 'Ditolak' || (t.status || '').toLowerCase().includes('tolak')) {
              catatanHtml = `<span style="color: #b91c1c; font-size: 0.725rem;">${t.rejectionReason || 'Ditolak: alasan tidak memadai'}</span>`;
            } else if (t.status === 'Kedaluwarsa') {
              catatanHtml = `<span style="color: #64748b; font-size: 0.725rem;">Kedaluwarsa sebelum scan keluar</span>`;
            } else if (t.status === 'Dibatalkan') {
              catatanHtml = `<span style="color: #64748b; font-size: 0.725rem;">Pengajuan dibatalkan oleh pemohon</span>`;
            }

            const scheduleWithDay = typeof window.formatTicketScheduleWithDay === 'function' 
              ? window.formatTicketScheduleWithDay(t) 
              : `<div style="font-weight: 600; color: #0f172a; font-size: 0.775rem; white-space: nowrap;">${(t.plannedExit || '').slice(0, 10)}</div><div style="font-size: 0.75rem; color: #475569; font-family: var(--font-mono); margin-top: 2px; white-space: nowrap;">${(t.plannedExit || '').slice(11, 16)} WIB</div>`;

            let tindakanHtml = `
              <a href="#" class="figma-card-link" style="font-size: 0.775rem;" onclick="event.stopPropagation(); window.openTicketDetail('${t.id}', 'detail'); return false;">Detail pengajuan</a>
              <button type="button" style="background: none; border: none; color: #ef4444; font-size: 0.75rem; font-weight: 600; cursor: pointer; margin-left: 0.65rem; display: inline-flex; align-items: center; gap: 0.2rem;" onclick="event.stopPropagation(); window.deleteSecurityTicket('${t.id}', 'riwayat')" title="Hapus Riwayat #${t.id}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Hapus
              </button>
            `;

            return `
              <tr>
                <td style="vertical-align: middle;">
                  <div style="font-weight: 700; font-family: var(--font-mono); color: var(--text-primary); font-size: 0.8rem; white-space: nowrap;">${t.id}</div>
                  <div style="font-size: 0.725rem; color: var(--text-muted); margin-top: 2px;">${t.category} — ${t.type}</div>
                </td>
                <td style="vertical-align: middle;">
                  ${gateBadge}
                </td>
                <td style="vertical-align: middle;">
                  <div style="font-weight: 600; color: var(--text-primary); font-size: 0.8rem; line-height: 1.35;">${t.applicantName || 'Budi Pratama'} <span style="font-weight: 500; color: var(--text-secondary);">(${t.destination})</span></div>
                  <div style="font-size: 0.725rem; color: var(--text-muted); margin-top: 3px; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${t.reason || ''}">${t.reason || '-'}</div>
                </td>
                <td style="white-space: nowrap; vertical-align: middle;">${scheduleWithDay}</td>
                <td style="white-space: nowrap; vertical-align: middle;">${statusHtml}</td>
                <td style="vertical-align: middle; line-height: 1.45;">${catatanHtml}</td>
                <td style="text-align: right; white-space: nowrap; vertical-align: middle;">${tindakanHtml}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// VERIFICATION ENGINE
function executeVerification(inputQuery) {
  const inputScanTicketCode = document.getElementById('inputScanTicketCode');
  const ticketsList = window.ticketsList || [];

  const query = (inputQuery || (inputScanTicketCode ? inputScanTicketCode.value : '')).trim().toUpperCase();
  if (!query) {
    if (typeof window.showToast === 'function') window.showToast('Masukkan nomor tiket, NIP karyawan, atau pindai kode QR!', 'danger');
    return;
  }

  // Parse if it's full QR payload e.g. KUJANG-PASS|TK-XXXX|...
  let searchId = query;
  if (query.includes('|')) {
    const parts = query.split('|');
    if (parts.length >= 2) searchId = parts[1];
  }

  const ticket = ticketsList.find(t => 
    t.id.toUpperCase() === searchId || 
    (t.applicantNip && t.applicantNip.toUpperCase() === query)
  );

  if (!ticket) {
    if (typeof window.showToast === 'function') window.showToast(`Tiket tidak ditemukan! Kode "${query}" tidak terdaftar di sistem.`, 'danger');
    return;
  }

  // Status feedback alerts:
  if (ticket.isEmergency && ticket.emergencyLocked) {
    if (typeof window.showToast === 'function') {
      window.showToast(`Akses Ditolak: Tiket Izin Darurat #${ticket.id} masih berstatus TERKUNCI! Belum dilakukan otorisasi darurat Atasan. Dilarang keluar!`, 'danger');
    }
  } else if (ticket.status === 'Kedaluwarsa') {
    if (typeof window.showToast === 'function') window.showToast(`Akses Ditolak: Tiket #${ticket.id} telah KEDALUWARSA dan hangus. Dilarang keluar pabrik!`, 'danger');
  } else if (ticket.status === 'Menunggu Persetujuan') {
    if (typeof window.showToast === 'function') window.showToast(`Akses Ditolak: Tiket #${ticket.id} belum disetujui Atasan. Dilarang keluar!`, 'warning');
  } else if (ticket.status === 'Sedang di Luar' || ticket.status === 'Terlambat') {
    if (typeof window.showToast === 'function') window.showToast(`Tiket #${ticket.id} sedang di luar kawasan. Tap In Masuk dilakukan oleh Karyawan bersangkutan.`, 'info');
  } else if (ticket.status === 'Disetujui') {
    if (ticket.isEmergency) {
      if (typeof window.showToast === 'function') {
        window.showToast(`PERINGATAN POS JAGA: Tiket Izin Darurat #${ticket.id} SAH (Diotorisasi: ${ticket.emergencyUnlockedBy || 'Resmi'}). Pastikan periksa kondisi fisik/kendaraan darurat sebelum Scan Out!`, 'warning');
      }
    } else {
      if (typeof window.showToast === 'function') window.showToast(`Tiket #${ticket.id} valid dan disetujui. Siap diproses Scan Out!`, 'success');
    }
  } else if (ticket.status === 'Selesai') {
    if (typeof window.showToast === 'function') window.showToast(`Tiket #${ticket.id} sudah selesai diproses.`, 'info');
  }

  // Langsung buka Rincian Tiket tanpa kartu perantara terpisah
  if (typeof window.openTicketDetail === 'function') {
    window._openedFromScannerTerminal = true;
    window.openTicketDetail(ticket.id, 'detail');
  }
}

// EXECUTE SCAN OUT
function executeScanOut(ticketId) {
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  if (ticket.isEmergency && ticket.emergencyLocked) {
    if (typeof window.showToast === 'function') {
      window.showToast(`Akses Ditolak: Tiket Darurat #${ticket.id} masih TERKUNCI! Diperlukan otorisasi Atasan terlebih dahulu.`, 'danger');
    }
    return;
  }

  if (ticket.scanOutTime) {
    if (typeof window.showToast === 'function') window.showToast(`Tiket #${ticket.id} sudah pernah tercatat Scan Out (${ticket.scanOutTime}). Tidak dapat diproses berulang!`, 'danger');
    return;
  }

  if (ticket.status === 'Kedaluwarsa') {
    // Toleransi revalidasi Pos Jaga agar tidak stuck
    ticket.status = 'Disetujui';
  }

  if (ticket.status !== 'Disetujui') {
    if (typeof window.showToast === 'function') window.showToast(`Akses Ditolak: Hanya tiket berstatus Disetujui yang dapat diproses Scan Out! (Status saat ini: ${ticket.status})`, 'danger');
    return;
  }

  const selectGateLocation = document.getElementById('selectGateLocation');
  let gate = (selectGateLocation && selectGateLocation.value && selectGateLocation.value !== 'all') 
    ? selectGateLocation.value 
    : (localStorage.getItem('KUJANG_ACTIVE_GATE') || 'Pos 1 Gerbang Utama');
  if (gate === 'all') gate = 'Pos 1 Gerbang Utama';
  const officer = typeof getActiveGateOfficer === 'function' ? getActiveGateOfficer(gate) : { name: 'Sertu Agus', nip: 'SEC-2018-042', gateShort: 'Pos 1' };
  const securityName = officer ? `${officer.name} (${officer.gateShort})` : 'Sertu Agus (Pos 1)';
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

  ticket.scanOutGate = gate;
  ticket.scanOutTime = `${nowFormatted} (${gate})`;
  ticket.securityOfficerOut = officer ? officer.name : 'Sertu Agus';
  ticket.securityNipOut = officer ? officer.nip : 'SEC-2018-042';
  if (!ticket.timeline) ticket.timeline = [];

  if (ticket.isEmergency) {
    if (ticket.type === 'Pulang Mendahului') {
      ticket.status = 'Selesai';
      ticket.timeline.push({
        event: 'Scan Out Gerbang Darurat (Pulang)',
        time: nowFormatted,
        by: `${securityName} (${gate})`,
        gate: gate,
        desc: `Petugas Pos Jaga memvalidasi fisik karyawan/ambulans dan mencatat justifikasi kedaruratan. Izin pulang mendahului selesai diproses. Otorisasi sebelumnya: ${ticket.emergencyUnlockedBy || 'Resmi'}.`
      });
      if (typeof window.showToast === 'function') window.showToast(`Scan Out Darurat berhasil di ${gate}! Petugas (${officer.name}) mencatat keberangkatan darurat #${ticket.id} (Pulang Mendahului).`, 'success');
    } else {
      ticket.status = 'Sedang di Luar';
      ticket.timeline.push({
        event: 'Scan Out Gerbang Darurat',
        time: nowFormatted,
        by: `${securityName} (${gate})`,
        gate: gate,
        desc: `Petugas Pos Jaga memvalidasi fisik karyawan/ambulans dan mencatat justifikasi kedaruratan di gerbang. Status: Sedang di Luar. Otorisasi sebelumnya: ${ticket.emergencyUnlockedBy || 'Resmi'}.`
      });
      if (typeof window.showToast === 'function') window.showToast(`Scan Out Darurat berhasil di ${gate}! Petugas (${officer.name}) mencatat keberangkatan darurat #${ticket.id}. Gerbang dibuka.`, 'success');
    }
  } else if (ticket.type === 'Pulang Mendahului') {
    ticket.status = 'Selesai';
    if (typeof window.createNotification === 'function') {
      window.createNotification({
        recipientRole: 'karyawan',
        recipientNip: ticket.applicantNip || 'PK-2024-8841',
        recipientName: ticket.applicantName || 'Budi Pratama, S.T.',
        actorSource: 'security',
        type: 'selesai',
        title: 'Izin Selesai Diproses',
        message: `Perjalanan izin keluar Anda (#${ticket.id}) telah selesai dicatat oleh Pos Jaga (Pulang Lebih Awal).`,
        ticketId: ticket.id,
        priority: 'normal',
        eventId: `completed_${ticket.id}`
      });
    }
    ticket.timeline.push({
      event: 'Scan Out Pos Jaga (Pulang)',
      time: nowFormatted,
      by: `${securityName} (${gate})`,
      gate: gate,
      desc: `Karyawan meninggalkan pabrik melalui ${gate} (Pulang Mendahului). Tiket langsung berstatus Selesai.`
    });
    if (typeof window.showToast === 'function') window.showToast(`Scan Out berhasil di ${gate}! Tiket #${ticket.id} selesai diproses oleh Petugas ${officer.name} (Pulang Mendahului).`, 'success');
  } else {
    ticket.status = 'Sedang di Luar';
    ticket.timeline.push({
      event: 'Scan Out Pos Jaga',
      time: nowFormatted,
      by: `${securityName} (${gate})`,
      gate: gate,
      desc: `Karyawan berhasil diverifikasi keluar kawasan melalui ${gate}. Status: Sedang di Luar.`
    });
    if (typeof window.showToast === 'function') window.showToast(`Scan Out berhasil di ${gate}! Petugas (${officer.name}) memverifikasi keberangkatan tiket #${ticket.id}.`, 'success');
  }

  if (typeof window.createNotification === 'function') {
    window.createNotification({
      recipientRole: 'karyawan',
      recipientNip: ticket.applicantNip || 'PK-2024-8841',
      recipientName: ticket.applicantName || 'Budi Pratama, S.T.',
      actorSource: 'security',
      type: 'selesai',
      title: 'Izin Selesai Diproses',
      message: `Kepulangan Anda (#${ticket.id}) telah diverifikasi di ${gate}. Tiket selesai.`,
      ticketId: ticket.id,
      priority: 'normal',
      eventId: `completed_${ticket.id}`
    });
  }
  window.saveTickets(ticketsList);
  const inputScanTicketCode = document.getElementById('inputScanTicketCode');
  if (inputScanTicketCode) inputScanTicketCode.value = '';

  // Tutup modal rincian tiket agar kartu langsung hilang dan tidak bisa langsung di-scan in
  const modalTicketDetail = document.getElementById('modalTicketDetail');
  if (modalTicketDetail) modalTicketDetail.classList.remove('open');

  renderSecurityView();
  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
  if (typeof window.renderApproverView === 'function') window.renderApproverView();
  if (typeof window.updateSecurityMetrics === 'function') window.updateSecurityMetrics();
  if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
  if (typeof window.updateApproverMetrics === 'function') window.updateApproverMetrics();
}

// EXECUTE SCAN IN
function executeScanIn(ticketId) {
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  if (ticket.status !== 'Sedang di Luar' && ticket.status !== 'Terlambat') {
    if (ticket.status === 'Disetujui' && !ticket.scanOutTime) {
      // Auto-proses scan out terlebih dahulu agar alur masuk tercatat lengkap
      executeScanOut(ticketId);
    } else if (ticket.status !== 'Sedang di Luar' && ticket.status !== 'Terlambat') {
      if (typeof window.showToast === 'function') window.showToast('Hanya tiket berstatus Sedang di Luar atau Terlambat yang dapat diproses Tap In Kartu Akses!', 'danger');
      return;
    }
  }

  const selectGateLocation = document.getElementById('selectGateLocation');
  let gate = (selectGateLocation && selectGateLocation.value && selectGateLocation.value !== 'all') 
    ? selectGateLocation.value 
    : (localStorage.getItem('KUJANG_ACTIVE_GATE') || 'Pos 1 Gerbang Utama');
  if (gate === 'all') gate = 'Pos 1 Gerbang Utama';
  const officer = typeof getActiveGateOfficer === 'function' ? getActiveGateOfficer(gate) : { name: 'Sertu Agus', nip: 'SEC-2018-042', gateShort: 'Pos 1' };
  const securityName = officer ? `${officer.name} (${officer.gateShort})` : 'Sertu Agus (Pos 1)';
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

  // Periksa apakah ada perpanjangan waktu yang sedang aktif
  const hasPendingExt = ticket.pendingExtension && ticket.pendingExtension.status === 'Menunggu Persetujuan';
  let isCoveredByExtension = false;
  if (hasPendingExt && ticket.pendingExtension.newEstimatedReturn) {
    const extTime = typeof window.parseTicketDateTime === 'function' ? window.parseTicketDateTime(ticket.pendingExtension.newEstimatedReturn) : new Date(ticket.pendingExtension.newEstimatedReturn);
    if (extTime && !isNaN(extTime.getTime()) && now.getTime() <= extTime.getTime()) {
      isCoveredByExtension = true;
    }
  }

  const returnTime = typeof window.parseTicketDateTime === 'function' ? window.parseTicketDateTime(ticket.estimatedReturn) : new Date(ticket.estimatedReturn);
  const isPastReturn = returnTime && !isNaN(returnTime.getTime()) && (now.getTime() > returnTime.getTime());
  const wasOverdue = (ticket.status === 'Terlambat' || isPastReturn) && !isCoveredByExtension;
  if (wasOverdue) {
    ticket.isLate = true;
    if (returnTime && !isNaN(returnTime.getTime())) {
      ticket.lateMinutes = Math.max(1, Math.round((now.getTime() - returnTime.getTime()) / 60000));
    }
  }

  ticket.scanInGate = gate;
  ticket.scanInTime = `${nowFormatted} (${gate})${wasOverdue ? ' [Terlambat]' : ''}`;
  ticket.securityOfficerIn = officer ? officer.name : 'Sertu Agus';
  ticket.securityNipIn = officer ? officer.nip : 'SEC-2018-042';
  ticket.actualReturnTime = `${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;
  ticket.status = 'Selesai';
  if (!ticket.timeline) ticket.timeline = [];
  ticket.timeline.push({
    event: wasOverdue ? 'Tap In Kartu (Kembali Terlambat)' : 'Tap In Kartu (Kembali Masuk)',
    time: nowFormatted,
    by: `${securityName} (${gate})`,
    gate: gate,
    desc: wasOverdue
      ? `Karyawan tiba kembali di kawasan pabrik melalui ${gate} MELEWATI estimasi waktu kembali (Terlambat). Petugas: ${officer.name}. QR code dinonaktifkan permanen.`
      : (isCoveredByExtension 
          ? `Karyawan kembali tepat waktu sesuai permohonan perpanjangan waktu di ${gate}. Tap In Kartu Akses berhasil, QR code dinonaktifkan.`
          : `Karyawan kembali tiba di kawasan pabrik melalui ${gate}. Diverifikasi oleh ${officer.name}. QR code dinonaktifkan permanen.`)
  });

  if (ticket.pendingExtension) {
    ticket.timeline.push({
      event: 'Perpanjangan Waktu Selesai Otomatis',
      time: nowFormatted,
      by: `${securityName} (${gate})`,
      gate: gate,
      desc: `Karyawan telah kembali ke pabrik dan melakukan Scan In di ${gate} saat permohonan perpanjangan waktu masih berjalan. Tiket resmi selesai.`
    });
    ticket.pendingExtension = null;
  }

  window.saveTickets(ticketsList);
  const inputScanTicketCode = document.getElementById('inputScanTicketCode');
  const scanResultContainer = document.getElementById('scanResultContainer');
  if (inputScanTicketCode) inputScanTicketCode.value = '';
  if (scanResultContainer) scanResultContainer.style.display = 'none';

  // Tutup modal rincian tiket jika terbuka
  const modalTicketDetail = document.getElementById('modalTicketDetail');
  if (modalTicketDetail) modalTicketDetail.classList.remove('open');

  if (typeof window.showToast === 'function') {
    window.showToast(
      wasOverdue 
        ? `Tap In Kartu Akses berhasil di ${gate}! Tiket #${ticket.id} selesai dicatat (Catatan: Kembali Terlambat).` 
        : `Tap In Kartu Akses berhasil di ${gate}! Karyawan telah tiba kembali. Petugas (${officer.name}) mencatat tiket #${ticket.id} selesai.`,
      wasOverdue ? 'warning' : 'success'
    );
  }

  renderSecurityView();
  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
  if (typeof window.renderApproverView === 'function') window.renderApproverView();
  if (typeof window.renderAdminView === 'function') window.renderAdminView();
  if (typeof window.updateSecurityMetrics === 'function') window.updateSecurityMetrics();
  if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
  if (typeof window.updateApproverMetrics === 'function') window.updateApproverMetrics();
}

// CAMERA CONTROLLER
async function startCameraScanner(selectedCameraId = null) {
  if (typeof Html5Qrcode === 'undefined') {
    if (typeof window.showToast === 'function') window.showToast('Library pemindai kamera (Html5Qrcode) tidak termuat.', 'danger');
    return;
  }

  const cameraDeviceSelect = document.getElementById('cameraDeviceSelect');
  const cameraIdlePlaceholder = document.getElementById('cameraIdlePlaceholder');
  const cameraLoadingPlaceholder = document.getElementById('cameraLoadingPlaceholder');
  const cameraScanOverlay = document.getElementById('cameraScanOverlay');
  const cameraScanStatus = document.getElementById('cameraScanStatus');
  const btnStartCamera = document.getElementById('btnStartCamera');
  const btnStopCamera = document.getElementById('btnStopCamera');

  try {
    // Tampilkan indikator loading saat kamera sedang diinisialisasi (Revisi 6)
    if (cameraIdlePlaceholder) cameraIdlePlaceholder.style.display = 'none';
    if (cameraScanOverlay) cameraScanOverlay.style.display = 'none';
    if (cameraLoadingPlaceholder) cameraLoadingPlaceholder.style.display = 'flex';
    if (cameraScanStatus) cameraScanStatus.textContent = 'Sedang membuka kamera, mohon tunggu...';

    if (!html5QrScannerInstance) {
      html5QrScannerInstance = new Html5Qrcode('cameraReaderView');
    }

    if (cameraDevicesList.length === 0) {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        cameraDevicesList = devices;
        if (cameraDeviceSelect) {
          cameraDeviceSelect.innerHTML = devices.map((d, idx) => `
            <option value="${d.id}">${d.label || 'Kamera ' + (idx + 1)}</option>
          `).join('');
          if (devices.length > 1) {
            cameraDeviceSelect.style.display = 'inline-block';
          }
        }
      }
    }

    const config = {
      fps: 15,
      qrbox: { width: 220, height: 220 },
      aspectRatio: 1.0
    };

    const targetCamera = selectedCameraId || ((cameraDeviceSelect && cameraDeviceSelect.value) ? cameraDeviceSelect.value : { facingMode: 'environment' });

    await html5QrScannerInstance.start(
      targetCamera,
      config,
      (decodedText) => {
        handleCameraQrSuccess(decodedText);
      },
      () => {}
    );

    // Kamera berhasil aktif
    if (cameraActiveToolbar) cameraActiveToolbar.style.display = 'flex';
    if (cameraLoadingPlaceholder) cameraLoadingPlaceholder.style.display = 'none';
    if (cameraIdlePlaceholder) cameraIdlePlaceholder.style.display = 'none';
    if (cameraScanOverlay) cameraScanOverlay.style.display = 'flex';
    if (cameraScanStatus) cameraScanStatus.textContent = 'Kamera aktif: Arahkan ke QR Code tiket...';

    isCameraScanningActive = true;
    if (btnStartCamera) btnStartCamera.style.display = 'none';
    if (btnStopCamera) btnStopCamera.style.display = 'inline-flex';
    if (typeof window.showToast === 'function') window.showToast('Kamera pemindai QR aktif!', 'success');
  } catch (err) {
    console.error('Camera Scanner Error:', err);
    if (cameraActiveToolbar) cameraActiveToolbar.style.display = 'none';
    if (cameraLoadingPlaceholder) cameraLoadingPlaceholder.style.display = 'none';
    if (cameraIdlePlaceholder) cameraIdlePlaceholder.style.display = 'flex';
    if (cameraScanOverlay) cameraScanOverlay.style.display = 'none';

    // Pesan error komunikatif dan bersahabat bagi pengguna (Revisi 6)
    let userErrorMsg = 'Kamera tidak dapat dibuka. Pastikan kamera terpasang dan izinkan browser mengakses kamera.';
    const errName = err ? (err.name || String(err)) : '';
    const errStr = String(err ? (err.message || err) : '').toLowerCase();

    if (errName === 'NotAllowedError' || errStr.includes('permission') || errStr.includes('denied') || errStr.includes('not allowed')) {
      userErrorMsg = 'Izin kamera ditolak. Silakan klik ikon gembok pada bilah browser Anda lalu izinkan kamera.';
    } else if (errName === 'NotFoundError' || errStr.includes('notfound') || errStr.includes('no camera') || errStr.includes('device not found')) {
      userErrorMsg = 'Tidak ditemukan perangkat kamera pada komputer ini. Silakan gunakan pemindai barcode eksternal atau input tiket manual.';
    } else if (errName === 'NotReadableError' || errStr.includes('already in use') || errStr.includes('busy')) {
      userErrorMsg = 'Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut dan coba kembali.';
    } else if (errStr.includes('secure') || errStr.includes('https')) {
      userErrorMsg = 'Akses kamera dibatasi peramban ke koneksi aman (HTTPS / localhost).';
    }

    if (cameraScanStatus) cameraScanStatus.innerHTML = `<span style="color: #ef4444; font-weight: 700;">⚠️ ${userErrorMsg}</span>`;
    if (typeof window.showToast === 'function') window.showToast(userErrorMsg, 'danger');
  }
}

async function stopCameraScanner() {
  if (html5QrScannerInstance && isCameraScanningActive) {
    try {
      await html5QrScannerInstance.stop();
    } catch (err) {
      console.warn('Error stopping camera:', err);
    }
  }
  isCameraScanningActive = false;

  const btnStartCamera = document.getElementById('btnStartCamera');
  const btnStopCamera = document.getElementById('btnStopCamera');
  const cameraActiveToolbar = document.getElementById('cameraActiveToolbar');
  const cameraIdlePlaceholder = document.getElementById('cameraIdlePlaceholder');
  const cameraLoadingPlaceholder = document.getElementById('cameraLoadingPlaceholder');
  const cameraScanOverlay = document.getElementById('cameraScanOverlay');
  const cameraScanStatus = document.getElementById('cameraScanStatus');

  if (cameraActiveToolbar) cameraActiveToolbar.style.display = 'none';
  if (btnStartCamera) btnStartCamera.style.display = 'inline-flex';
  if (btnStopCamera) btnStopCamera.style.display = 'none';
  if (cameraLoadingPlaceholder) cameraLoadingPlaceholder.style.display = 'none';
  if (cameraIdlePlaceholder) cameraIdlePlaceholder.style.display = 'flex';
  if (cameraScanOverlay) cameraScanOverlay.style.display = 'none';
  if (cameraScanStatus) cameraScanStatus.textContent = 'Arahkan kamera ke QR Code Tiket Izin Karyawan.';
}

function handleCameraQrSuccess(decodedText) {
  if (decodedText === lastScannedCode) return;
  lastScannedCode = decodedText;
  clearTimeout(scanCooldownTimer);
  scanCooldownTimer = setTimeout(() => { lastScannedCode = null; }, 2500);

  if (typeof window.playScannerBeep === 'function') window.playScannerBeep();
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

  let searchId = decodedText.trim();
  if (searchId.includes('|')) {
    const parts = searchId.split('|');
    if (parts.length >= 2) searchId = parts[1];
  }

  const inputScanTicketCode = document.getElementById('inputScanTicketCode');
  const cameraScanStatus = document.getElementById('cameraScanStatus');

  if (inputScanTicketCode) inputScanTicketCode.value = searchId;
  if (cameraScanStatus) cameraScanStatus.textContent = `QR Terbaca: ${searchId}`;
  if (typeof window.showToast === 'function') window.showToast(`QR Code Terbaca: ${searchId}!`, 'success');

  executeVerification(searchId);
}

document.addEventListener('DOMContentLoaded', () => {
  const btnModeCameraScan = document.getElementById('btnModeCameraScan');
  const btnModeManualScan = document.getElementById('btnModeManualScan');
  const scanModeSlider = document.getElementById('scanModeSlider');

  const cameraScannerBox = document.getElementById('cameraScannerBox');
  const manualScannerBox = document.getElementById('manualScannerBox');
  const btnStartCamera = document.getElementById('btnStartCamera');
  const btnStopCamera = document.getElementById('btnStopCamera');
  const cameraDeviceSelect = document.getElementById('cameraDeviceSelect');
  const btnTriggerFileScan = document.getElementById('btnTriggerFileScan');
  const inputScanQrFile = document.getElementById('inputScanQrFile');
  const btnExecuteScanSearch = document.getElementById('btnExecuteScanSearch');
  const inputScanTicketCode = document.getElementById('inputScanTicketCode');
  const filterSecurityQueueTab = document.getElementById('filterSecurityQueueTab');

  function setScannerMode(mode) {
    if (mode === 'camera') {
      if (btnModeCameraScan) btnModeCameraScan.classList.add('active');
      if (btnModeManualScan) btnModeManualScan.classList.remove('active');
      if (scanModeSlider) scanModeSlider.classList.remove('slider-manual');
      if (cameraScannerBox) cameraScannerBox.style.display = 'flex';
      if (manualScannerBox) manualScannerBox.style.display = 'none';
    } else {
      if (btnModeManualScan) btnModeManualScan.classList.add('active');
      if (btnModeCameraScan) btnModeCameraScan.classList.remove('active');
      if (scanModeSlider) scanModeSlider.classList.add('slider-manual');
      if (cameraScannerBox) cameraScannerBox.style.display = 'none';
      if (manualScannerBox) manualScannerBox.style.display = 'flex';
      stopCameraScanner();
      if (inputScanTicketCode) inputScanTicketCode.focus();
    }
  }

  if (btnModeCameraScan) btnModeCameraScan.addEventListener('click', () => setScannerMode('camera'));
  if (btnModeManualScan) btnModeManualScan.addEventListener('click', () => setScannerMode('manual'));

  if (btnStartCamera) {
    btnStartCamera.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startCameraScanner();
    });
  }

  if (btnStopCamera) {
    btnStopCamera.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      stopCameraScanner();
    });
  }

  // Klik gambar kamera atau area placeholder membuka pilihan metode pemindaian
  const btnClickCameraLens = document.getElementById('btnClickCameraLens');
  const cameraIdlePlaceholderEl = document.getElementById('cameraIdlePlaceholder');

  if (btnClickCameraLens) {
    btnClickCameraLens.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openScanMethodPicker();
    });
  }

  if (cameraIdlePlaceholderEl) {
    cameraIdlePlaceholderEl.addEventListener('click', (e) => {
      // Jika yang diklik adalah tombol direct, biarkan handler tombol berjalan
      if (e.target.closest('#btnStartCamera') || e.target.closest('#btnTriggerFileScan')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      openScanMethodPicker();
    });
  }

  // Event listener untuk Modal Pilih Metode Pemindaian QR
  const btnCloseScanMethodPicker = document.getElementById('btnCloseScanMethodPicker');
  const btnCancelScanMethodPicker = document.getElementById('btnCancelScanMethodPicker');
  const btnPickerStartCamera = document.getElementById('btnPickerStartCamera');
  const btnPickerUploadQr = document.getElementById('btnPickerUploadQr');

  if (btnCloseScanMethodPicker) btnCloseScanMethodPicker.addEventListener('click', closeScanMethodPicker);
  if (btnCancelScanMethodPicker) btnCancelScanMethodPicker.addEventListener('click', closeScanMethodPicker);

  if (btnPickerStartCamera) {
    btnPickerStartCamera.addEventListener('click', () => {
      closeScanMethodPicker();
      startCameraScanner();
    });
  }

  if (btnPickerUploadQr && inputScanQrFile) {
    btnPickerUploadQr.addEventListener('click', () => {
      closeScanMethodPicker();
      inputScanQrFile.click();
    });
  }

  if (cameraDeviceSelect) {
    cameraDeviceSelect.addEventListener('change', async () => {
      if (isCameraScanningActive) {
        await stopCameraScanner();
        await startCameraScanner(cameraDeviceSelect.value);
      }
    });
  }

  if (btnTriggerFileScan && inputScanQrFile) {
    btnTriggerFileScan.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      inputScanQrFile.click();
    });

    inputScanQrFile.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    inputScanQrFile.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const cameraScanStatus = document.getElementById('cameraScanStatus');
      try {
        if (cameraScanStatus) cameraScanStatus.textContent = 'Memindai berkas gambar QR...';

        if (isCameraScanningActive) {
          await stopCameraScanner();
        }

        if (!html5QrScannerInstance) {
          html5QrScannerInstance = new Html5Qrcode('cameraReaderView');
        }

        // scanFile(file, false) membaca QR code tanpa menyalakan webcam atau merusak DOM
        const decodedText = await html5QrScannerInstance.scanFile(file, false);
        if (decodedText) {
          handleCameraQrSuccess(decodedText);
        } else {
          throw new Error('QR Code tidak dapat dibaca dari berkas gambar');
        }
      } catch (err) {
        console.warn('QR file scan error:', err);
        if (cameraScanStatus) cameraScanStatus.textContent = 'QR Code tidak terdeteksi di dalam foto.';
        if (typeof window.showToast === 'function') window.showToast('Gagal memindai: QR Code tidak ditemukan di dalam gambar.', 'danger');
      } finally {
        inputScanQrFile.value = '';
      }
    });
  }

  if (btnExecuteScanSearch) btnExecuteScanSearch.addEventListener('click', () => executeVerification());
  if (inputScanTicketCode) {
    inputScanTicketCode.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') executeVerification();
    });
  }

  if (filterSecurityQueueTab) filterSecurityQueueTab.addEventListener('change', renderSecurityView);

  // Riwayat Pemindaian Pos Jaga event listeners
  const searchSecurityLogInput = document.getElementById('searchSecurityLogInput');
  const filterSecurityLogCategory = document.getElementById('filterSecurityLogCategory');
  const filterSecurityLogStatus = document.getElementById('filterSecurityLogStatus');
  const filterSecurityLogPeriod = document.getElementById('filterSecurityLogPeriod');
  const filterSecurityLogGate = document.getElementById('filterSecurityLogGate');
  const sortSecurityLog = document.getElementById('sortSecurityLog');
  const btnSecurityLogViewCard = document.getElementById('btnSecurityLogViewCard');
  const btnSecurityLogViewTable = document.getElementById('btnSecurityLogViewTable');
  const btnSecurityLogExport = document.getElementById('btnSecurityLogExport');

  if (searchSecurityLogInput) searchSecurityLogInput.addEventListener('input', renderSecurityView);
  if (filterSecurityLogCategory) filterSecurityLogCategory.addEventListener('change', renderSecurityView);
  if (filterSecurityLogStatus) filterSecurityLogStatus.addEventListener('change', renderSecurityView);
  if (filterSecurityLogPeriod) filterSecurityLogPeriod.addEventListener('change', renderSecurityView);
  if (sortSecurityLog) sortSecurityLog.addEventListener('change', renderSecurityView);

  if (filterSecurityLogGate) {
    filterSecurityLogGate.addEventListener('change', (e) => {
      if (typeof setSecurityGateFilter === 'function') {
        setSecurityGateFilter(e.target.value);
      } else {
        renderSecurityView();
      }
    });
  }

  // Pos Jaga Gate Terminal Selector
  const selectGateLocation = document.getElementById('selectGateLocation');
  if (selectGateLocation) {
    const savedGate = localStorage.getItem('KUJANG_ACTIVE_GATE') || 'Pos 1 Gerbang Utama';
    selectGateLocation.value = savedGate;
    selectGateLocation.addEventListener('change', (e) => {
      if (typeof updateActiveSecurityGate === 'function') {
        updateActiveSecurityGate(e.target.value, true);
      }
    });
    if (typeof updateActiveSecurityGate === 'function') {
      updateActiveSecurityGate(savedGate, false);
    }
  }

  if (typeof updateGateFilterCounts === 'function') {
    updateGateFilterCounts();
  }

  if (btnSecurityLogViewCard && btnSecurityLogViewTable) {
    btnSecurityLogViewCard.addEventListener('click', () => {
      window.currentSecurityLogViewMode = 'card';
      btnSecurityLogViewCard.classList.add('active');
      btnSecurityLogViewTable.classList.remove('active');
      renderSecurityView();
    });

    btnSecurityLogViewTable.addEventListener('click', () => {
      window.currentSecurityLogViewMode = 'table';
      btnSecurityLogViewTable.classList.add('active');
      btnSecurityLogViewCard.classList.remove('active');
      renderSecurityView();
    });
  }

  if (btnSecurityLogExport) {
    btnSecurityLogExport.addEventListener('click', () => {
      const filtered = filterSecurityLogTickets();
      if (filtered.length === 0) {
        if (typeof window.showToast === 'function') window.showToast('Tidak ada data riwayat pemindaian untuk diekspor.', 'danger');
        return;
      }

      let csv = "data:text/csv;charset=utf-8,";
      csv += "Nomor Tiket,Pemohon,NIP,Kategori,Tipe,Tujuan,Waktu Scan Out,Waktu Scan In,Status\n";

      filtered.forEach(t => {
        csv += [
          `"${t.id}"`,
          `"${t.applicantName || 'Budi Pratama'}"`,
          `"${t.applicantNip || 'PK-2024-8841'}"`,
          `"${t.category}"`,
          `"${t.type}"`,
          `"${(t.destination || '').replace(/"/g, '""')}"`,
          `"${t.scanOutTime || '-'}"`,
          `"${t.scanInTime || '-'}"`,
          `"${t.status}"`
        ].join(',') + "\n";
      });

      const uri = encodeURI(csv);
      const a = document.createElement('a');
      a.href = uri;
      a.download = `Riwayat-Pemindaian-Pos-Jaga-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (typeof window.showToast === 'function') window.showToast('Riwayat pemindaian berhasil diekspor ke CSV!', 'success');
    });
  }
});

// SCAN METHOD PICKER MODAL
function openScanMethodPicker() {
  const modalScanMethodPicker = document.getElementById('modalScanMethodPicker');
  if (modalScanMethodPicker) modalScanMethodPicker.classList.add('open');
}

function closeScanMethodPicker() {
  const modalScanMethodPicker = document.getElementById('modalScanMethodPicker');
  if (modalScanMethodPicker) modalScanMethodPicker.classList.remove('open');
}

// DELETE FUNCTION FOR SECURITY RIWAYAT & PELACAKAN (REQUIREMENT 6)
function deleteSecurityTicket(ticketId, source) {
  const isPelacakan = source === 'pelacakan';
  const label = isPelacakan ? 'data pelacakan pos jaga' : 'riwayat pos jaga';

  const handler = () => {
    let ticketsList = window.ticketsList || [];
    const t = ticketsList.find(x => x.id === ticketId);
    if (t) {
      t.deletedBySecurity = true;
      window.saveTickets(ticketsList);
    }

    renderSecurityView();

    if (typeof window.showToast === 'function') {
      window.showToast(`Pengajuan #${ticketId} berhasil dihapus dari ${label}.`, 'info');
    }
  };

  if (typeof window.openDeleteConfirmModal === 'function') {
    window.openDeleteConfirmModal({
      title: isPelacakan ? 'Hapus Data Pelacakan' : 'Hapus Riwayat Pos Jaga',
      message: 'Apakah Anda yakin ingin menghapus pengajuan ini dari riwayat? Tindakan ini tidak dapat dibatalkan.',
      onConfirm: handler
    });
  } else if (confirm('Apakah Anda yakin ingin menghapus pengajuan ini dari riwayat? Tindakan ini tidak dapat dibatalkan.')) {
    handler();
  }
}

// Expose globally
window.updateSecurityMetrics = updateSecurityMetrics;
window.renderSecurityDashboard = renderSecurityDashboard;
window.renderSecurityCards = renderSecurityCards;
window.renderSecurityView = renderSecurityView;
window.filterSecurityLogTickets = filterSecurityLogTickets;
window.renderSecurityLogTable = renderSecurityLogTable;
window.executeVerification = executeVerification;
window.executeScanOut = executeScanOut;
window.executeScanIn = executeScanIn;
window.executeTapIn = executeScanIn;
window.startCameraScanner = startCameraScanner;
window.stopCameraScanner = stopCameraScanner;
window.handleCameraQrSuccess = handleCameraQrSuccess;
window.openScanMethodPicker = openScanMethodPicker;
window.closeScanMethodPicker = closeScanMethodPicker;
window.deleteSecurityTicket = deleteSecurityTicket;

