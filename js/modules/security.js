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

  // Ready to Exit (Disetujui) List for Pos 1 Gate
  if (badgeReadyExitCount) {
    badgeReadyExitCount.textContent = `${readyExitTickets.length} Karyawan`;
  }

  if (securityDashboardReadyExitList) {
    if (readyExitTickets.length === 0) {
      securityDashboardReadyExitList.innerHTML = `
        <div style="padding: 1.25rem; text-align: center; color: var(--text-secondary); font-size: 0.825rem;">
          Nihil: Belum ada izin baru yang disetujui untuk keluar saat ini.
        </div>
      `;
    } else {
      securityDashboardReadyExitList.innerHTML = readyExitTickets.map(t => {
        const isEmergency = t.isEmergency || (t.id && t.id.startsWith('TK-EMG'));
        return `
          <div class="feed-item" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 0.5rem; padding: 0.75rem 1rem;">
            <div class="feed-item-left">
              <div class="feed-item-icon" style="background: ${isEmergency ? '#ffe4e6' : '#dbeafe'}; color: ${isEmergency ? '#be123c' : '#1d4ed8'}; font-size: 1.1rem;">
                ${isEmergency ? '🚨' : '🚪'}
              </div>
              <div>
                <div class="feed-item-title" style="font-weight: 800; color: #0f172a;">${t.applicantName || 'Budi Pratama'} <span style="font-family: var(--font-mono); font-size: 0.75rem; color: #64748b;">(${t.id})</span></div>
                <div class="feed-item-sub" style="font-size: 0.75rem; color: #475569; margin-top: 2px;">
                  Tujuan: <strong>${t.destination}</strong> • Rencana Keluar: <span style="font-family: var(--font-mono); font-weight: 700;">${t.plannedExit ? t.plannedExit.replace('T', ' ') : 'Hari Ini'}</span>
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span class="status-pill-green" style="font-size: 0.7rem;">• Disetujui</span>
              <button class="btn-quick-scan-out" style="padding: 0.4rem 0.85rem; font-size: 0.75rem; font-weight: 800;" onclick="executeScanOut('${t.id}')" title="Proses Scan Out di Pos 1">
                ✓ Proses Scan Out
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
        <div style="background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 10px; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-size: 1.4rem;">🚨</div>
            <div>
              <div style="font-weight: 800; font-size: 0.9rem; color: #991b1b;">
                PERINGATAN GERBANG: Ada ${overdueTickets.length} Karyawan Terlambat Kembali ke Pabrik!
              </div>
              <div style="font-size: 0.775rem; color: #7f1d1d;">
                Karyawan telah melewati batas estimasi jam kembali. Pastikan segera memindai (Scan In) begitu tiba di Pos 1.
              </div>
            </div>
          </div>
          <button class="btn-quick-scan-in" style="background: #b91c1c; font-size: 0.775rem; padding: 0.45rem 0.85rem;" onclick="setSecurityNav('pelacakan')">
            Lihat Headcount Terlambat →
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
          Nihil: Tidak ada karyawan yang sedang di luar pabrik (Headcount aman).
        </div>
      `;
    } else {
      securityDashboardOutsideList.innerHTML = outsideTickets.map(t => {
        const isOverdue = t.status === 'Terlambat';
        return `
          <div class="feed-item" style="${isOverdue ? 'border-left: 3px solid var(--rose-danger); background: #fff5f5;' : ''}">
            <div class="feed-item-left">
              <div class="feed-item-icon" style="background: ${isOverdue ? 'var(--rose-light)' : '#e0f2fe'}; color: ${isOverdue ? 'var(--rose-danger)' : '#0284c7'};">
                ${isOverdue ? '⚠️' : '🚶‍♂️'}
              </div>
              <div>
                <div class="feed-item-title">${t.applicantName || 'Budi Pratama'} (${t.id})</div>
                <div class="feed-item-sub">
                  Tujuan: ${t.destination} • Rencana Kembali: <span style="font-family: var(--font-mono); font-weight: 700;">${t.estimatedReturn ? t.estimatedReturn.replace('T', ' ') : 'Pulang Hari Ini'}</span>
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              ${window.getStatusPill(t.status)}
              <button class="btn-quick-scan-in" style="padding: 0.35rem 0.65rem; font-size: 0.725rem; font-weight: 700;" onclick="executeScanIn('${t.id}')" title="Proses Scan In (Kembali Masuk Pabrik)">
                Scan In
              </button>
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
              <div class="feed-item-icon" style="background: ${isScanIn ? '#d1fae5' : '#e0f2fe'}; color: ${isScanIn ? '#059669' : '#0284c7'};">
                ${isScanIn ? '🏢' : '🚪'}
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

function renderSecurityCards(list, containerElement) {
  const containerSecurityQueue = document.getElementById('containerSecurityQueue');
  const target = containerElement || containerSecurityQueue;
  if (!target) return;

  target.innerHTML = `
    <div class="cards-grid">
      ${list.map(t => {
        const isReadyExit = t.status === 'Disetujui';
        const isOutside = t.status === 'Sedang di Luar';
        const isOverdue = t.status === 'Terlambat';
        const isExpired = t.status === 'Kedaluwarsa';
        const isDinas = t.category === 'Dinas Kantor';

        return `
          <div class="card-item" style="${isReadyExit ? 'border-left: 4px solid var(--corp-teal);' : (isOverdue ? 'border-left: 4px solid var(--rose-danger);' : (isOutside ? 'border-left: 4px solid #0891b2;' : (isExpired ? 'border-left: 4px solid #94a3b8;' : '')))}">
            <div class="card-top">
              <div>
                <span class="card-id-num">${t.id}</span>
                <div class="card-created-meta">Diajukan: ${t.createdAt}</div>
              </div>
              ${window.getStatusPill(t.status)}
            </div>

            <!-- Employee badge in gate view -->
            <div style="background:var(--bg-subtle); padding:0.6rem 0.85rem; border-radius:6px; display:flex; align-items:center; justify-content:space-between;">
              <div>
                <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary);">${t.applicantName || 'Budi Pratama, S.T.'}</div>
                <div style="font-size:0.725rem; color:var(--text-secondary);">NIP: ${t.applicantNip || 'PK-2024-8841'} • ${t.department || 'Rekayasa Mesin'}</div>
              </div>
              <span class="tag-badge ${isDinas ? 'tag-dinas' : 'tag-pribadi'}">${t.category}</span>
            </div>

            <div style="font-size:0.8rem; color:var(--text-secondary);">
              <strong>Tujuan:</strong> ${t.destination}
            </div>

            <div class="card-details-box">
              <div>
                <span style="font-size:0.675rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Rencana Keluar</span>
                <div style="font-weight:700; color:var(--text-primary); font-family:var(--font-mono); font-size:0.775rem;">${t.plannedExit.replace('T', ' ')}</div>
              </div>
              <div style="color:#cbd5e1;">→</div>
              <div style="text-align: right;">
                <span style="font-size:0.675rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Estimasi Kembali</span>
                <div style="font-weight:700; color:var(--text-primary); font-family:var(--font-mono); font-size:0.775rem;">${t.estimatedReturn ? t.estimatedReturn.replace('T', ' ') : 'Pulang Hari Ini'}</div>
              </div>
            </div>

            ${isOverdue ? `
              <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:0.45rem 0.65rem; font-size:0.75rem; color:#b91c1c; font-weight:700;">
                ⚠️ Karyawan terlambat kembali! Segera proses Scan In saat tiba di pos jaga.
              </div>
            ` : ''}

            ${isExpired ? `
              <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:0.45rem 0.65rem; font-size:0.75rem; color:#475569;">
                ⏱️ Tiket telah kedaluwarsa & hangus (+10 menit dari rencana keluar). Dilarang diproses keluar.
              </div>
            ` : ''}

            ${t.scanOutTime ? `<div style="font-size:0.75rem; color:#065f46;"><strong>Scan Out:</strong> ${t.scanOutTime}</div>` : ''}
            ${t.scanInTime ? `<div style="font-size:0.75rem; color:#0e7490;"><strong>Scan In:</strong> ${t.scanInTime}</div>` : ''}

            <!-- Quick Action Buttons for Satpam -->
            <div class="card-actions-bar">
              <div style="display:flex; gap:0.4rem; flex-wrap:wrap; align-items:center;">
                <button class="btn-card-qr" style="padding:0.4rem 0.75rem; font-size:0.75rem; min-height:34px;" onclick="openTicketDetail('${t.id}', 'qr')" title="Buka Tiket & QR Code">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  <span>Tiket & QR Code</span>
                </button>
                <button class="btn-card-detail" style="padding:0.4rem 0.75rem; font-size:0.75rem; min-height:34px;" onclick="openTicketDetail('${t.id}', 'detail')" title="Lihat Rincian">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                  <span>Lihat Rincian</span>
                </button>
              </div>

              <div style="display:flex; gap:0.4rem;">
                ${isReadyExit ? `
                  <button class="btn-quick-scan-out" onclick="executeScanOut('${t.id}')" title="Proses Scan Out (Meninggalkan Kawasan Pabrik)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    <span>Proses Scan Out</span>
                  </button>
                ` : ''}
                ${(isOutside || isOverdue) ? `
                  <button class="btn-quick-scan-in" onclick="executeScanIn('${t.id}')" title="Proses Scan In (Kembali Masuk Kawasan Pabrik)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    <span>Proses Scan In</span>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderSecurityView() {
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
      renderSecurityCards(filteredLog, containerSecurityLog);
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

  const query = searchSecurityLogInput ? searchSecurityLogInput.value.trim().toLowerCase() : '';
  const category = filterSecurityLogCategory ? filterSecurityLogCategory.value : 'all';
  const status = filterSecurityLogStatus ? filterSecurityLogStatus.value : 'all';
  const period = filterSecurityLogPeriod ? filterSecurityLogPeriod.value : 'all';

  const ACTORS = window.ACTORS || {};
  const currentActor = window.currentActor || 'security';
  const myNip = ACTORS.karyawan ? ACTORS.karyawan.nip : 'PK-2024-8841';

  return ticketsList.filter(t => {
    // Hak akses: jika peran adalah Karyawan, batasi riwayat hanya miliknya
    if (currentActor === 'karyawan') {
      const isMyTicket = t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841');
      if (!isMyTicket) return false;
    }

    // Hanya tiket yang relevan dengan transaksi pos gerbang atau selesai
    const hasLog = t.scanOutTime || t.scanInTime || t.status === 'Sedang di Luar' || t.status === 'Selesai' || t.status === 'Terlambat' || t.status === 'Disetujui';
    if (!hasLog) return false;

    // Filter Periode Waktu
    if (typeof window.matchesPeriodFilter === 'function' && !window.matchesPeriodFilter(t, period)) {
      return false;
    }

    // Filter Kategori
    if (category !== 'all' && t.category !== category) return false;

    // Filter Status
    if (status !== 'all' && t.status !== status) return false;

    // Search query
    if (query) {
      const matchId = (t.id || '').toLowerCase().includes(query);
      const matchName = (t.applicantName || '').toLowerCase().includes(query);
      const matchNip = (t.applicantNip || '').toLowerCase().includes(query);
      const matchDest = (t.destination || '').toLowerCase().includes(query);
      const matchReason = (t.reason || '').toLowerCase().includes(query);
      if (!matchId && !matchName && !matchNip && !matchDest && !matchReason) return false;
    }

    return true;
  });
}

function renderSecurityLogTable(list, containerElement) {
  if (!containerElement) return;

  containerElement.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nomor Tiket</th>
            <th>Pemohon & NIP</th>
            <th>Kategori & Tipe</th>
            <th>Waktu Scan Out</th>
            <th>Waktu Scan In</th>
            <th>Status</th>
            <th style="text-align: right;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(t => `
            <tr style="cursor: pointer;" onclick="openTicketDetail('${t.id}', 'detail')">
              <td>
                <span style="font-family:var(--font-mono); font-weight:700; color:var(--corp-teal);">${t.id}</span>
                <div style="font-size:0.7rem; color:var(--text-muted);">${(t.createdAt || '').slice(0,10)}</div>
              </td>
              <td>
                <div style="font-weight:700; color:var(--text-primary);">${t.applicantName || 'Budi Pratama'}</div>
                <div style="font-size:0.725rem; color:var(--text-secondary);">${t.applicantNip || 'PK-2024-8841'}</div>
              </td>
              <td>
                <span class="tag-badge ${t.category === 'Dinas Kantor' ? 'tag-dinas' : 'tag-pribadi'}">${t.category}</span>
                <div style="font-size:0.725rem; color:var(--text-secondary); margin-top:2px;">${t.type}</div>
              </td>
              <td style="font-family:var(--font-mono); font-size:0.775rem;">${t.scanOutTime || '-'}</td>
              <td style="font-family:var(--font-mono); font-size:0.775rem;">${t.scanInTime || '-'}</td>
              <td>${window.getStatusPill(t.status)}</td>
              <td style="text-align: right;">
                <button class="btn-card-detail" style="padding:0.35rem 0.65rem; font-size:0.725rem;" onclick="event.stopPropagation(); openTicketDetail('${t.id}', 'detail')">
                  Rincian Tiket
                </button>
              </td>
            </tr>
          `).join('')}
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
      window.showToast(`🚨 Akses Ditolak: Tiket Izin Darurat #${ticket.id} masih berstatus TERKUNCI! Belum dilakukan otorisasi darurat Atasan. Dilarang keluar!`, 'danger');
    }
  } else if (ticket.status === 'Kedaluwarsa') {
    if (typeof window.showToast === 'function') window.showToast(`Akses Ditolak: Tiket #${ticket.id} telah KEDALUWARSA dan hangus. Dilarang keluar pabrik!`, 'danger');
  } else if (ticket.status === 'Menunggu Persetujuan') {
    if (typeof window.showToast === 'function') window.showToast(`Akses Ditolak: Tiket #${ticket.id} belum disetujui Atasan. Dilarang keluar!`, 'warning');
  } else if (ticket.status === 'Sedang di Luar' || ticket.status === 'Terlambat') {
    if (typeof window.showToast === 'function') window.showToast(`Tiket #${ticket.id} sudah keluar pabrik. Siap diproses Scan In (Masuk Kembali).`, 'info');
  } else if (ticket.status === 'Disetujui') {
    if (ticket.isEmergency) {
      if (typeof window.showToast === 'function') {
        window.showToast(`🚨 PERINGATAN POS JAGA: Tiket Izin Darurat #${ticket.id} SAH (Diotorisasi: ${ticket.emergencyUnlockedBy || 'Resmi'}). Pastikan periksa kondisi fisik/kendaraan darurat sebelum Scan Out!`, 'warning');
      }
    } else {
      if (typeof window.showToast === 'function') window.showToast(`Tiket #${ticket.id} valid dan disetujui. Siap diproses Scan Out!`, 'success');
    }
  } else if (ticket.status === 'Selesai') {
    if (typeof window.showToast === 'function') window.showToast(`Tiket #${ticket.id} sudah selesai diproses.`, 'info');
  }

  // Langsung buka Rincian Tiket tanpa kartu perantara terpisah
  if (typeof window.openTicketDetail === 'function') {
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
  const gate = selectGateLocation ? (selectGateLocation.value || 'Pos 1 Gerbang Utama') : 'Pos 1 Gerbang Utama';
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

  const ACTORS = window.ACTORS || {};
  const securityName = (window.currentActor === 'security' && ACTORS.security) ? ACTORS.security.name : 'Sertu Agus (Pos 1)';

  ticket.scanOutTime = `${nowFormatted} (${gate})`;
  if (!ticket.timeline) ticket.timeline = [];

  if (ticket.isEmergency) {
    ticket.securityOfficerOut = `${securityName} (${gate})`;
    if (ticket.type === 'Pulang Mendahului') {
      ticket.status = 'Selesai';
      ticket.timeline.push({
        event: 'Scan Out Gerbang Darurat (Pulang)',
        time: nowFormatted,
        by: `${securityName} (${gate})`,
        desc: `Petugas Pos Jaga memvalidasi fisik karyawan/ambulans dan mencatat justifikasi kedaruratan. Izin pulang mendahului selesai diproses. Otorisasi sebelumnya: ${ticket.emergencyUnlockedBy || 'Resmi'}.`
      });
      if (typeof window.showToast === 'function') window.showToast(`🚨 Scan Out Darurat berhasil! Petugas (${securityName}) mencatat keberangkatan darurat #${ticket.id} (Pulang Mendahului).`, 'success');
    } else {
      ticket.status = 'Sedang di Luar';
      ticket.timeline.push({
        event: 'Scan Out Gerbang Darurat',
        time: nowFormatted,
        by: `${securityName} (${gate})`,
        desc: `Petugas Pos Jaga memvalidasi fisik karyawan/ambulans dan mencatat justifikasi kedaruratan di gerbang. Status: Sedang di Luar. Otorisasi sebelumnya: ${ticket.emergencyUnlockedBy || 'Resmi'}.`
      });
      if (typeof window.showToast === 'function') window.showToast(`🚨 Scan Out Darurat berhasil! Petugas (${securityName}) mencatat keberangkatan darurat #${ticket.id}. Gerbang dibuka.`, 'success');
    }
  } else if (ticket.type === 'Pulang Mendahului') {
    ticket.status = 'Selesai';
    ticket.timeline.push({
      event: 'Scan Out Pos Jaga (Pulang)',
      time: nowFormatted,
      by: `${securityName} (${gate})`,
      desc: `Karyawan meninggalkan pabrik (Pulang Mendahului). Tiket langsung berstatus Selesai.`
    });
    if (typeof window.showToast === 'function') window.showToast(`Scan Out berhasil! Tiket #${ticket.id} selesai diproses (Pulang Mendahului).`, 'success');
  } else {
    ticket.status = 'Sedang di Luar';
    ticket.timeline.push({
      event: 'Scan Out Pos Jaga',
      time: nowFormatted,
      by: `${securityName} (${gate})`,
      desc: `Karyawan berhasil diverifikasi keluar kawasan. Status: Sedang di Luar.`
    });
    if (typeof window.showToast === 'function') window.showToast(`Scan Out berhasil! Status tiket #${ticket.id} kini: Sedang di Luar.`, 'success');
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
      if (typeof window.showToast === 'function') window.showToast('Hanya tiket berstatus Sedang di Luar atau Terlambat yang dapat diproses Scan In!', 'danger');
      return;
    }
  }

  const selectGateLocation = document.getElementById('selectGateLocation');
  const gate = selectGateLocation ? (selectGateLocation.value || 'Pos 1 Gerbang Utama') : 'Pos 1 Gerbang Utama';
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

  const ACTORS = window.ACTORS || {};
  const securityName = (window.currentActor === 'security' && ACTORS.security) ? ACTORS.security.name : 'Sertu Agus (Pos 1)';

  // Periksa apakah ada perpanjangan waktu yang sedang aktif
  const hasPendingExt = ticket.pendingExtension && ticket.pendingExtension.status === 'Menunggu Persetujuan';
  let isCoveredByExtension = false;
  if (hasPendingExt && ticket.pendingExtension.newEstimatedReturn) {
    const extTime = new Date(ticket.pendingExtension.newEstimatedReturn);
    if (!isNaN(extTime.getTime()) && now.getTime() <= extTime.getTime()) {
      isCoveredByExtension = true;
    }
  }

  const wasOverdue = ticket.status === 'Terlambat' && !isCoveredByExtension;
  ticket.scanInTime = `${nowFormatted} (${gate})${wasOverdue ? ' [Terlambat]' : ''}`;
  ticket.status = 'Selesai';
  if (!ticket.timeline) ticket.timeline = [];
  ticket.timeline.push({
    event: wasOverdue ? 'Scan In (Kembali Terlambat)' : 'Scan In (Kembali Masuk)',
    time: nowFormatted,
    by: `${securityName} (${gate})`,
    desc: wasOverdue
      ? `Karyawan tiba kembali di kawasan pabrik MELEWATI estimasi waktu kembali (Terlambat). QR code dinonaktifkan permanen.`
      : (isCoveredByExtension 
          ? `Karyawan kembali tepat waktu sesuai permohonan perpanjangan waktu. Scan In berhasil, QR code dinonaktifkan.`
          : `Karyawan kembali tiba di kawasan pabrik. QR code dinonaktifkan permanen.`)
  });

  if (ticket.pendingExtension) {
    ticket.timeline.push({
      event: 'Perpanjangan Waktu Selesai Otomatis',
      time: nowFormatted,
      by: `${securityName} (${gate})`,
      desc: 'Karyawan telah kembali ke pabrik dan melakukan Scan In saat permohonan perpanjangan waktu masih berjalan. Tiket resmi selesai.'
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
        ? `Scan In berhasil! Tiket #${ticket.id} selesai dicatat (Catatan: Kembali Terlambat).` 
        : `Scan In berhasil! Karyawan telah tiba kembali. Tiket #${ticket.id} selesai.`,
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
  const cameraScanOverlay = document.getElementById('cameraScanOverlay');
  const cameraScanStatus = document.getElementById('cameraScanStatus');
  const btnStartCamera = document.getElementById('btnStartCamera');
  const btnStopCamera = document.getElementById('btnStopCamera');

  try {
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

    if (cameraIdlePlaceholder) cameraIdlePlaceholder.style.display = 'none';
    if (cameraScanOverlay) cameraScanOverlay.style.display = 'flex';
    if (cameraScanStatus) cameraScanStatus.textContent = '🟢 Kamera aktif: Arahkan ke QR Code tiket...';

    await html5QrScannerInstance.start(
      targetCamera,
      config,
      (decodedText) => {
        handleCameraQrSuccess(decodedText);
      },
      () => {}
    );

    isCameraScanningActive = true;
    if (btnStartCamera) btnStartCamera.style.display = 'none';
    if (btnStopCamera) btnStopCamera.style.display = 'inline-flex';
    if (typeof window.showToast === 'function') window.showToast('Kamera pemindai QR aktif!', 'success');
  } catch (err) {
    console.error('Camera Scanner Error:', err);
    if (cameraIdlePlaceholder) cameraIdlePlaceholder.style.display = 'flex';
    if (cameraScanOverlay) cameraScanOverlay.style.display = 'none';
    if (cameraScanStatus) cameraScanStatus.textContent = '⚠️ Izin kamera ditolak atau kamera tidak terdeteksi.';
    if (typeof window.showToast === 'function') window.showToast('Gagal mengaktifkan kamera: ' + (err.message || err), 'danger');
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
  const cameraIdlePlaceholder = document.getElementById('cameraIdlePlaceholder');
  const cameraScanOverlay = document.getElementById('cameraScanOverlay');
  const cameraScanStatus = document.getElementById('cameraScanStatus');

  if (btnStartCamera) btnStartCamera.style.display = 'inline-flex';
  if (btnStopCamera) btnStopCamera.style.display = 'none';
  if (cameraIdlePlaceholder) cameraIdlePlaceholder.style.display = 'flex';
  if (cameraScanOverlay) cameraScanOverlay.style.display = 'none';
  if (cameraScanStatus) cameraScanStatus.textContent = '💡 Arahkan kamera ke QR Code Tiket Izin Karyawan.';
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
  if (cameraScanStatus) cameraScanStatus.textContent = `✅ QR Terbaca: ${searchId}`;
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
        if (cameraScanStatus) cameraScanStatus.textContent = '⏳ Memindai berkas gambar QR...';

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
        if (cameraScanStatus) cameraScanStatus.textContent = '⚠️ QR Code tidak terdeteksi di dalam foto.';
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
  const btnSecurityLogViewCard = document.getElementById('btnSecurityLogViewCard');
  const btnSecurityLogViewTable = document.getElementById('btnSecurityLogViewTable');
  const btnSecurityLogExport = document.getElementById('btnSecurityLogExport');

  if (searchSecurityLogInput) searchSecurityLogInput.addEventListener('input', renderSecurityView);
  if (filterSecurityLogCategory) filterSecurityLogCategory.addEventListener('change', renderSecurityView);
  if (filterSecurityLogStatus) filterSecurityLogStatus.addEventListener('change', renderSecurityView);
  if (filterSecurityLogPeriod) filterSecurityLogPeriod.addEventListener('change', renderSecurityView);

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
window.startCameraScanner = startCameraScanner;
window.stopCameraScanner = stopCameraScanner;
window.handleCameraQrSuccess = handleCameraQrSuccess;
window.openScanMethodPicker = openScanMethodPicker;
window.closeScanMethodPicker = closeScanMethodPicker;

