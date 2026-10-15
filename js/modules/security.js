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
  const ticketsList = window.ticketsList || [];
  const overdueTickets = ticketsList.filter(t => t.status === 'Terlambat');
  const outsideTickets = ticketsList.filter(t => t.status === 'Sedang di Luar' || t.status === 'Terlambat');
  const recentTransactions = ticketsList
    .filter(t => t.scanOutTime || t.scanInTime)
    .slice(0, 5);

  const securityOverdueBanner = document.getElementById('securityOverdueBanner');
  const securityDashboardOutsideList = document.getElementById('securityDashboardOutsideList');
  const securityDashboardRecentFeed = document.getElementById('securityDashboardRecentFeed');

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
              <button class="btn-quick-scan-in" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; ${isOverdue ? 'background: #dc2626;' : ''}" onclick="executeScanIn('${t.id}')">
                ✓ Scan In
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
                  <button class="btn-quick-scan-out" onclick="executeScanOut('${t.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    Proses Scan Out
                  </button>
                ` : ''}

                ${(isOutside || isOverdue) ? `
                  <button class="btn-quick-scan-in" style="${isOverdue ? 'background:#dc2626;' : ''}" onclick="executeScanIn('${t.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    Proses Scan In ${isOverdue ? '(Terlambat)' : ''}
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
    const logList = ticketsList.filter(t => t.scanOutTime || t.scanInTime || t.status === 'Selesai');

    if (logList.length === 0) {
      if (containerSecurityLog) containerSecurityLog.innerHTML = '';
      if (emptySecurityLogBox) emptySecurityLogBox.style.display = 'flex';
      return;
    }

    if (emptySecurityLogBox) emptySecurityLogBox.style.display = 'none';
    renderSecurityCards(logList, containerSecurityLog);
  }
}

// VERIFICATION ENGINE
function executeVerification(inputQuery) {
  const inputScanTicketCode = document.getElementById('inputScanTicketCode');
  const scanResultContainer = document.getElementById('scanResultContainer');
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
    if (scanResultContainer) {
      scanResultContainer.style.display = 'block';
      scanResultContainer.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.75rem; color:#fca5a5;">
          <span style="font-size:1.5rem;">✕</span>
          <div>
            <strong style="font-size:0.95rem;">Tiket Tidak Ditemukan!</strong>
            <p style="font-size:0.8rem; color:#e2e8f0;">Kode "${query}" tidak terdaftar di pangkalan data perizinan aktif.</p>
          </div>
        </div>
      `;
    }
    if (typeof window.showToast === 'function') window.showToast('Tiket tidak terdaftar di sistem pengamanan.', 'danger');
    return;
  }

  // Render Found Ticket Card in Scanner Panel
  const isApproved = ticket.status === 'Disetujui';
  const isOutside = ticket.status === 'Sedang di Luar';
  const isOverdue = ticket.status === 'Terlambat';
  const isExpired = ticket.status === 'Kedaluwarsa';
  const isPending = ticket.status === 'Menunggu Persetujuan';
  const isFinished = ticket.status === 'Selesai';

  if (scanResultContainer) {
    scanResultContainer.style.display = 'block';
    scanResultContainer.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem;">
        <div>
          <div style="font-size:1.1rem; font-weight:800; color:#ffffff; font-family:var(--font-mono);">${ticket.id}</div>
          <div style="font-size:0.9rem; font-weight:700; color:#e0f2fe; margin-top:2px;">
            ${ticket.applicantName || 'Budi Pratama'} (${ticket.applicantNip || 'PK-2024-8841'})
          </div>
          <div style="font-size:0.775rem; color:#93c5fd;">${ticket.category} • ${ticket.type} • Tujuan: ${ticket.destination}</div>
          <div style="font-size:0.775rem; color:#cbd5e1; margin-top:4px;">Rencana Keluar: ${ticket.plannedExit.replace('T', ' ')}</div>
        </div>

        <div style="text-align: right;">
          ${window.getStatusPill(ticket.status)}
        </div>
      </div>

      <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem;">
        <div style="font-size:0.8rem; color:#e2e8f0;">
          ${isApproved ? 'Status: Izin sah & disetujui. Siap diproses keluar (Scan Out).' : ''}
          ${isOutside ? 'Status: Karyawan sedang di luar. Siap diproses kembali (Scan In).' : ''}
          ${isOverdue ? '<strong style="color:#f87171;">⚠️ PERINGATAN: Karyawan TERLAMBAT kembali! Segera proses Scan In.</strong>' : ''}
          ${isExpired ? '<strong style="color:#f87171;">✕ DITOLAK: Tiket telah KEDALUWARSA dan hangus. Dilarang keluar!</strong>' : ''}
          ${isPending ? 'PERINGATAN: Pengajuan belum disetujui Atasan! Dilarang keluar.' : ''}
          ${isFinished ? 'INFORMASI: Izin ini telah selesai diproses.' : ''}
        </div>

        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          ${isApproved ? `
            <button class="btn-quick-scan-out" style="padding:0.6rem 1.25rem; font-size:0.85rem;" onclick="executeScanOut('${ticket.id}')">
              ✓ Konfirmasi Scan Out (Keluar)
            </button>
          ` : ''}

          ${(isOutside || isOverdue) ? `
            <button class="btn-quick-scan-in" style="padding:0.6rem 1.25rem; font-size:0.85rem; ${isOverdue ? 'background:#dc2626;' : ''}" onclick="executeScanIn('${ticket.id}')">
              ✓ Konfirmasi Scan In (Masuk Kembali) ${isOverdue ? '- Terlambat' : ''}
            </button>
          ` : ''}

          <button class="btn-secondary" style="background:rgba(255,255,255,0.15); color:#fff; border:none; padding:0.5rem 0.85rem; font-size:0.8rem;" onclick="openTicketDetail('${ticket.id}', 'detail')">
            Buka Rincian
          </button>
        </div>
      </div>
    `;

    scanResultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// EXECUTE SCAN OUT
function executeScanOut(ticketId) {
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  if (ticket.status === 'Kedaluwarsa') {
    if (typeof window.showToast === 'function') window.showToast('Akses Ditolak: Tiket telah KEDALUWARSA dan hangus. Dilarang keluar!', 'danger');
    return;
  }

  if (ticket.status !== 'Disetujui') {
    if (typeof window.showToast === 'function') window.showToast('Hanya tiket berstatus Disetujui yang dapat diproses Scan Out!', 'danger');
    return;
  }

  const selectGateLocation = document.getElementById('selectGateLocation');
  const gate = selectGateLocation ? (selectGateLocation.value || 'Pos 1 Gerbang Utama') : 'Pos 1 Gerbang Utama';
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

  const ACTORS = window.ACTORS || {};
  const securityName = ACTORS.security ? ACTORS.security.name : 'Sertu Agus';

  ticket.scanOutTime = `${nowFormatted} (${gate})`;
  if (!ticket.timeline) ticket.timeline = [];

  if (ticket.type === 'Pulang Mendahului') {
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
  const scanResultContainer = document.getElementById('scanResultContainer');
  if (inputScanTicketCode) inputScanTicketCode.value = '';
  if (scanResultContainer) scanResultContainer.style.display = 'none';

  renderSecurityView();
  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
}

// EXECUTE SCAN IN
function executeScanIn(ticketId) {
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  if (ticket.status !== 'Sedang di Luar' && ticket.status !== 'Terlambat') {
    if (typeof window.showToast === 'function') window.showToast('Hanya tiket berstatus Sedang di Luar atau Terlambat yang dapat diproses Scan In!', 'danger');
    return;
  }

  const selectGateLocation = document.getElementById('selectGateLocation');
  const gate = selectGateLocation ? (selectGateLocation.value || 'Pos 1 Gerbang Utama') : 'Pos 1 Gerbang Utama';
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

  const ACTORS = window.ACTORS || {};
  const securityName = ACTORS.security ? ACTORS.security.name : 'Sertu Agus';

  const wasOverdue = ticket.status === 'Terlambat';
  ticket.scanInTime = `${nowFormatted} (${gate})${wasOverdue ? ' [Terlambat]' : ''}`;
  ticket.status = 'Selesai';
  if (!ticket.timeline) ticket.timeline = [];
  ticket.timeline.push({
    event: wasOverdue ? 'Scan In (Kembali Terlambat)' : 'Scan In (Kembali Masuk)',
    time: nowFormatted,
    by: `${securityName} (${gate})`,
    desc: wasOverdue
      ? `Karyawan tiba kembali di kawasan pabrik MELEWATI estimasi waktu kembali (Terlambat). QR code dinonaktifkan permanen.`
      : `Karyawan kembali tiba di kawasan pabrik. QR code dinonaktifkan permanen.`
  });

  window.saveTickets(ticketsList);
  const inputScanTicketCode = document.getElementById('inputScanTicketCode');
  const scanResultContainer = document.getElementById('scanResultContainer');
  if (inputScanTicketCode) inputScanTicketCode.value = '';
  if (scanResultContainer) scanResultContainer.style.display = 'none';

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

  if (btnModeCameraScan && btnModeManualScan) {
    btnModeCameraScan.addEventListener('click', () => {
      btnModeCameraScan.classList.add('active');
      btnModeManualScan.classList.remove('active');
      if (cameraScannerBox) cameraScannerBox.style.display = 'flex';
      if (manualScannerBox) manualScannerBox.style.display = 'none';
    });

    btnModeManualScan.addEventListener('click', () => {
      btnModeManualScan.classList.add('active');
      btnModeCameraScan.classList.remove('active');
      if (cameraScannerBox) cameraScannerBox.style.display = 'none';
      if (manualScannerBox) manualScannerBox.style.display = 'flex';
      stopCameraScanner();
    });
  }

  if (btnStartCamera) btnStartCamera.addEventListener('click', () => startCameraScanner());
  if (btnStopCamera) btnStopCamera.addEventListener('click', () => stopCameraScanner());

  if (cameraDeviceSelect) {
    cameraDeviceSelect.addEventListener('change', async () => {
      if (isCameraScanningActive) {
        await stopCameraScanner();
        await startCameraScanner(cameraDeviceSelect.value);
      }
    });
  }

  if (btnTriggerFileScan && inputScanQrFile) {
    btnTriggerFileScan.addEventListener('click', () => inputScanQrFile.click());
    inputScanQrFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!html5QrScannerInstance) {
        html5QrScannerInstance = new Html5Qrcode('cameraReaderView');
      }

      const cameraScanStatus = document.getElementById('cameraScanStatus');
      try {
        if (cameraScanStatus) cameraScanStatus.textContent = 'Memindai berkas gambar QR...';
        const decodedText = await html5QrScannerInstance.scanFile(file, true);
        handleCameraQrSuccess(decodedText);
      } catch (err) {
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
});

// Expose globally
window.updateSecurityMetrics = updateSecurityMetrics;
window.renderSecurityDashboard = renderSecurityDashboard;
window.renderSecurityCards = renderSecurityCards;
window.renderSecurityView = renderSecurityView;
window.executeVerification = executeVerification;
window.executeScanOut = executeScanOut;
window.executeScanIn = executeScanIn;
window.startCameraScanner = startCameraScanner;
window.stopCameraScanner = stopCameraScanner;
window.handleCameraQrSuccess = handleCameraQrSuccess;
