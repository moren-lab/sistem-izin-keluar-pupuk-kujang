/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Karyawan Module: Dashboard, Pengajuan Saya, Riwayat, Metrics, and Card/Table Renderers
 */

function updateKaryawanMetrics() {
  const ticketsList = window.ticketsList || [];
  const total = ticketsList.length;
  const pending = ticketsList.filter(t => t.status === 'Menunggu Persetujuan').length;
  const approved = ticketsList.filter(t => t.status === 'Disetujui').length;
  const outside = ticketsList.filter(t => t.status === 'Sedang di Luar' || t.status === 'Terlambat').length;
  const completed = ticketsList.filter(t => t.status === 'Selesai').length;

  const statEmpTotal = document.getElementById('statEmpTotal');
  const statEmpPending = document.getElementById('statEmpPending');
  const statEmpApproved = document.getElementById('statEmpApproved');
  const statEmpOutside = document.getElementById('statEmpOutside');
  const statEmpCompleted = document.getElementById('statEmpCompleted');

  if (statEmpTotal) statEmpTotal.textContent = total;
  if (statEmpPending) statEmpPending.textContent = pending;
  if (statEmpApproved) statEmpApproved.textContent = approved;
  if (statEmpOutside) statEmpOutside.textContent = outside;
  if (statEmpCompleted) statEmpCompleted.textContent = completed;

  const sidebarPendingBadge = document.getElementById('sidebarPendingBadge');
  const sidebarOutsideBadge = document.getElementById('sidebarOutsideBadge');
  const headingPendingBadge = document.getElementById('headingPendingBadge');
  const sidebarEmpActiveBadge = document.getElementById('sidebarEmpActiveBadge');

  if (sidebarPendingBadge) sidebarPendingBadge.textContent = pending;
  if (sidebarOutsideBadge) sidebarOutsideBadge.textContent = outside;
  if (headingPendingBadge) headingPendingBadge.textContent = pending;

  // Active permit badge for Karyawan sidebar (Pengajuan Saya)
  const activeCount = ticketsList.filter(t => 
    t.status === 'Menunggu Persetujuan' || t.status === 'Disetujui' || t.status === 'Sedang di Luar' || t.status === 'Terlambat'
  ).length;
  if (sidebarEmpActiveBadge) {
    sidebarEmpActiveBadge.textContent = activeCount;
    sidebarEmpActiveBadge.style.display = activeCount > 0 ? 'inline-block' : 'none';
  }
}

function filterEmpTickets() {
  const ticketsList = window.ticketsList || [];
  const searchEmpInput = document.getElementById('searchEmpInput');
  const filterEmpCategory = document.getElementById('filterEmpCategory');
  const filterEmpType = document.getElementById('filterEmpType');
  const filterEmpStatus = document.getElementById('filterEmpStatus');
  const filterEmpPeriod = document.getElementById('filterEmpPeriod');

  const ACTORS = window.ACTORS || {};
  const myNip = ACTORS.karyawan ? ACTORS.karyawan.nip : 'PK-2024-8841';

  const query = searchEmpInput ? searchEmpInput.value.trim().toLowerCase() : '';
  const category = filterEmpCategory ? filterEmpCategory.value : 'all';
  const type = filterEmpType ? filterEmpType.value : 'all';
  const status = filterEmpStatus ? filterEmpStatus.value : 'all';
  const period = filterEmpPeriod ? filterEmpPeriod.value : 'all';
  const activeEmpStatusFilter = window.activeEmpStatusFilter || 'all';
  const currentKaryawanNav = window.currentKaryawanNav || 'dashboard';

  return ticketsList.filter(t => {
    // 0. Hak akses Karyawan: batasi data hanya milik karyawan login
    const isMyTicket = t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841');
    if (!isMyTicket) return false;

    // 1. Sidebar tab mode
    if (currentKaryawanNav === 'pengajuan') {
      const isActive = t.status === 'Menunggu Persetujuan' || t.status === 'Disetujui' || t.status === 'Sedang di Luar' || t.status === 'Terlambat';
      if (!isActive) return false;
    } else if (currentKaryawanNav === 'riwayat') {
      const isHistory = t.status === 'Selesai' || t.status === 'Kedaluwarsa' || t.status === 'Ditolak' || t.status === 'Dibatalkan';
      if (!isHistory) return false;
    }

    // 2. Dropdown filters
    if (category !== 'all' && t.category !== category) return false;
    if (type !== 'all' && t.type !== type) return false;
    if (status !== 'all' && t.status !== status) return false;
    if (activeEmpStatusFilter !== 'all' && t.status !== activeEmpStatusFilter) return false;

    // 2.5 Filter Periode Waktu (Hari Ini, Minggu Ini, Bulan Ini, Tahun Ini)
    if (typeof window.matchesPeriodFilter === 'function' && !window.matchesPeriodFilter(t, period)) {
      return false;
    }

    // 3. Search query
    if (query) {
      const matchId = t.id.toLowerCase().includes(query);
      const matchReason = (t.reason || '').toLowerCase().includes(query);
      const matchDest = (t.destination || '').toLowerCase().includes(query);
      if (!matchId && !matchReason && !matchDest) return false;
    }
    return true;
  });
}

function renderKaryawanDashboard() {
  updateKaryawanMetrics();
  const activeTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : null;
  const karyawanDashboardActiveWidget = document.getElementById('karyawanDashboardActiveWidget');
  const karyawanDashboardRecentList = document.getElementById('karyawanDashboardRecentList');
  const ticketsList = window.ticketsList || [];

  if (karyawanDashboardActiveWidget) {
    if (activeTicket) {
      const isOverdue = activeTicket.status === 'Terlambat';
      const canCancel = activeTicket.status === 'Menunggu Persetujuan' || activeTicket.status === 'Disetujui';

      karyawanDashboardActiveWidget.innerHTML = `
        <div class="active-permit-standout ${isOverdue ? 'overdue' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.85rem;">
              <div style="width: 48px; height: 48px; border-radius: 12px; background: ${isOverdue ? 'rgba(239,68,68,0.12)' : 'rgba(5,150,105,0.12)'}; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                ${isOverdue ? '⚠️' : '🎫'}
              </div>
              <div>
                <div style="font-size: 0.725rem; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; color: ${isOverdue ? 'var(--rose-danger)' : 'var(--corp-teal)'};">
                  ${isOverdue ? 'PERINGATAN: IZIN TERLAMBAT KEMBALI' : 'STATUS PERIZINAN AKTIF'}
                </div>
                <div style="font-size: 1.2rem; font-weight: 800; font-family: var(--font-mono); color: var(--text-primary); margin-top: 1px;">
                  ${activeTicket.id}
                </div>
              </div>
            </div>
            <div>${window.getStatusPill(activeTicket.status)}</div>
          </div>

          <div style="margin-top: 1rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; font-size: 0.825rem; background: rgba(255,255,255,0.85); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(0,0,0,0.05);">
            <div>
              <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display: block;">Kategori & Tipe</span>
              <strong style="color: var(--text-primary);">${activeTicket.category}</strong> (${activeTicket.type})
            </div>
            <div>
              <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display: block;">Tujuan</span>
              <strong style="color: var(--text-primary);">${activeTicket.destination}</strong>
            </div>
            <div>
              <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display: block;">Jadwal Keluar</span>
              <strong style="font-family: var(--font-mono);">${activeTicket.plannedExit.replace('T', ' ')}</strong>
            </div>
            <div>
              <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display: block;">Estimasi Kembali</span>
              <strong style="font-family: var(--font-mono);">${activeTicket.estimatedReturn ? activeTicket.estimatedReturn.replace('T', ' ') : 'Pulang Hari Ini'}</strong>
            </div>
          </div>

          <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
            <div style="font-size: 0.775rem; color: var(--text-secondary);">
              ${isOverdue 
                ? '<strong style="color: var(--rose-danger);">Segera kembali ke pabrik dan lakukan Scan In di Pos 1 Gerbang Utama!</strong>'
                : 'Tunjukkan QR Code pada petugas keamanan di Pos 1 saat melewati gerbang pabrik.'}
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              ${canCancel ? `
                <button class="btn-cancel-ticket" style="padding: 0.45rem 0.85rem; font-size: 0.775rem;" onclick="openCancelModal('${activeTicket.id}')">
                  Batalkan Izin
                </button>
              ` : ''}
              <button class="btn-card-detail" style="padding: 0.45rem 0.85rem; font-size: 0.775rem;" onclick="openTicketDetail('${activeTicket.id}', 'detail')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                <span>Lihat Rincian</span>
              </button>
              <button class="btn-card-qr" style="padding: 0.45rem 0.85rem; font-size: 0.775rem;" onclick="openTicketDetail('${activeTicket.id}', 'qr')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                <span>Buka Tiket & QR Code</span>
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      karyawanDashboardActiveWidget.innerHTML = `
        <div class="active-permit-standout" style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-color: #a7f3d0; box-shadow: 0 4px 12px rgba(16,185,129,0.06);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 44px; height: 44px; border-radius: 50%; background: #d1fae5; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
                ✨
              </div>
              <div>
                <div style="font-weight: 800; font-size: 0.95rem; color: #065f46;">Status: Tidak Ada Perizinan Aktif</div>
                <div style="font-size: 0.8rem; color: #047857; margin-top: 2px;">
                  Anda sedang berada di kawasan operasional pabrik. Ajukan izin baru jika hendak keluar kawasan.
                </div>
              </div>
            </div>
            <button class="btn-secondary" style="padding: 0.55rem 1.15rem; font-size: 0.825rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.45rem; background: #ffffff; border: 1.5px solid #10b981; color: #065f46; box-shadow: 0 2px 6px rgba(16,185,129,0.15); cursor: pointer;" onclick="setKaryawanNav('pengajuan')">
              <span>Pengajuan Saya</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
      `;
    }
  }

  // Render recent list in Dashboard
  if (karyawanDashboardRecentList) {
    const ACTORS = window.ACTORS || {};
    const myNip = ACTORS.karyawan ? ACTORS.karyawan.nip : 'PK-2024-8841';
    const myTickets = ticketsList.filter(t => t.applicantNip === myNip || !t.applicantNip);
    const recentItems = myTickets.slice(0, 4);
    if (recentItems.length === 0) {
      karyawanDashboardRecentList.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
          Belum ada pengajuan perizinan yang dibuat.
        </div>
      `;
    } else {
      karyawanDashboardRecentList.innerHTML = recentItems.map(t => `
        <div class="feed-item">
          <div class="feed-item-left">
            <div class="feed-item-icon" style="background: ${t.category === 'Dinas Kantor' ? 'var(--blue-subtle)' : 'var(--amber-light)'};">
              ${t.category === 'Dinas Kantor' ? '💼' : '👤'}
            </div>
            <div>
              <div class="feed-item-title">${t.id} • ${t.destination}</div>
              <div class="feed-item-sub">${t.category} • Diajukan: ${t.createdAt}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${window.getStatusPill(t.status)}
            <button class="btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.725rem;" onclick="openTicketDetail('${t.id}', 'detail')">
              Rincian
            </button>
          </div>
        </div>
      `).join('');
    }
  }

  if (typeof window.renderKaryawanDonutChart === 'function') {
    window.renderKaryawanDonutChart();
  }
}

function renderKaryawanView() {
  updateKaryawanMetrics();

  const activePermitBanner = document.getElementById('activePermitBanner');
  const bannerActiveTicketId = document.getElementById('bannerActiveTicketId');
  const bannerActiveStatus = document.getElementById('bannerActiveStatus');
  const btnBannerViewActive = document.getElementById('btnBannerViewActive');
  const btnOpenNewRequestModal = document.getElementById('btnOpenNewRequestModal');
  const containerEmpRequests = document.getElementById('containerEmpRequests');
  const emptyEmpBox = document.getElementById('emptyEmpBox');
  const containerEmpActiveRequests = document.getElementById('containerEmpActiveRequests');
  const emptyEmpActiveBox = document.getElementById('emptyEmpActiveBox');

  const currentKaryawanNav = window.currentKaryawanNav || 'dashboard';
  const ticketsList = window.ticketsList || [];
  const ACTORS = window.ACTORS || {};
  const myNip = ACTORS.karyawan ? ACTORS.karyawan.nip : 'PK-2024-8841';

  // CHECK ACTIVE TICKET
  const activeTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : null;
  if (activeTicket && currentKaryawanNav !== 'riwayat') {
    if (activePermitBanner) {
      activePermitBanner.style.display = 'flex';
      if (bannerActiveTicketId) bannerActiveTicketId.textContent = activeTicket.id;
      if (bannerActiveStatus) bannerActiveStatus.textContent = activeTicket.status;
      if (btnBannerViewActive) btnBannerViewActive.onclick = () => window.openTicketDetail(activeTicket.id, 'detail');
      const btnBannerViewQR = document.getElementById('btnBannerViewQR');
      if (btnBannerViewQR) {
        btnBannerViewQR.onclick = () => window.openTicketDetail(activeTicket.id, 'qr');
      }
    }

    if (btnOpenNewRequestModal) {
      btnOpenNewRequestModal.classList.add('has-active-permit');
      btnOpenNewRequestModal.title = 'Pengajuan ditangguhkan: Anda masih memiliki tiket aktif (' + activeTicket.id + ')';
      btnOpenNewRequestModal.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>Pengajuan Ditangguhkan</span>
      `;
    }
  } else {
    if (activePermitBanner) activePermitBanner.style.display = 'none';
    if (!activeTicket && btnOpenNewRequestModal) {
      btnOpenNewRequestModal.classList.remove('has-active-permit');
      btnOpenNewRequestModal.title = 'Buat Pengajuan Izin Baru';
      btnOpenNewRequestModal.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Buat Pengajuan Izin</span>
      `;
    }
  }

  // 1. DASHBOARD SUBPAGE
  if (currentKaryawanNav === 'dashboard') {
    renderKaryawanDashboard();
    return;
  }

  // 2. PENGAJUAN SAYA (ACTIVE TICKETS)
  if (currentKaryawanNav === 'pengajuan') {
    const activeList = ticketsList.filter(t => 
      (t.applicantNip === myNip || !t.applicantNip) && 
      (t.status === 'Menunggu Persetujuan' || t.status === 'Disetujui' || t.status === 'Sedang di Luar' || t.status === 'Terlambat')
    );

    if (activeList.length === 0) {
      if (containerEmpActiveRequests) containerEmpActiveRequests.innerHTML = '';
      if (emptyEmpActiveBox) emptyEmpActiveBox.style.display = 'flex';
    } else {
      if (emptyEmpActiveBox) emptyEmpActiveBox.style.display = 'none';
      renderEmpCards(activeList, containerEmpActiveRequests);
    }
    return;
  }

  // 3. RIWAYAT PENGAJUAN (ARCHIVE & ALL)
  if (currentKaryawanNav === 'riwayat') {
    const filtered = filterEmpTickets();

    if (filtered.length === 0) {
      if (containerEmpRequests) containerEmpRequests.innerHTML = '';
      if (emptyEmpBox) emptyEmpBox.style.display = 'flex';
      const emptyTitle = emptyEmpBox ? emptyEmpBox.querySelector('h3') : null;
      const emptyDesc = emptyEmpBox ? emptyEmpBox.querySelector('p') : null;
      if (emptyTitle && emptyDesc) {
        emptyTitle.textContent = 'Belum Ada Riwayat Perizinan';
        emptyDesc.textContent = 'Riwayat izin yang telah selesai, kedaluwarsa, atau ditolak akan tersimpan otomatis di sini.';
      }
      return;
    }

    if (emptyEmpBox) emptyEmpBox.style.display = 'none';

    if (window.currentEmpViewMode === 'table') {
      renderEmpTable(filtered, containerEmpRequests);
    } else {
      renderEmpCards(filtered, containerEmpRequests);
    }
  }
}

function renderEmpCards(list, containerElement) {
  const containerEmpRequests = document.getElementById('containerEmpRequests');
  const target = containerElement || containerEmpRequests;
  if (!target) return;

  target.innerHTML = `
    <div class="cards-grid">
      ${list.map(t => {
        const canCancel = t.status === 'Menunggu Persetujuan' || t.status === 'Disetujui';
        const isDinas = t.category === 'Dinas Kantor';

        return `
          <div class="card-item">
            <div class="card-top">
              <div>
                <span class="card-id-num">${t.id}</span>
                <div class="card-created-meta">Diajukan: ${t.createdAt}</div>
              </div>
              ${window.getStatusPill(t.status)}
            </div>

            <div style="display:flex; gap:0.4rem;">
              <span class="tag-badge ${isDinas ? 'tag-dinas' : 'tag-pribadi'}">${t.category}</span>
              <span class="tag-badge tag-type-neutral">${t.type}</span>
            </div>

            <div style="font-size:0.85rem; color:var(--text-primary); line-height:1.4;">
              <strong>Keperluan:</strong> ${t.reason}
            </div>

            <div style="font-size:0.8rem; color:var(--text-secondary); display:flex; align-items:center; gap:0.35rem;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span>${t.destination}</span>
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

            ${t.scanOutTime ? `
              <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:0.5rem 0.75rem; font-size:0.75rem; color:#166534;">
                <strong>Waktu Scan Out:</strong> ${t.scanOutTime}
              </div>
            ` : ''}

            ${t.status === 'Terlambat' ? `
              <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:0.5rem 0.75rem; font-size:0.75rem; color:#b91c1c; font-weight:700; display:flex; align-items:center; gap:0.4rem;">
                <span>⚠️ PERINGATAN: Melewati estimasi jam kembali! Segera ke Pos Jaga untuk Scan In.</span>
              </div>
            ` : ''}

            ${t.status === 'Kedaluwarsa' ? `
              <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:0.5rem 0.75rem; font-size:0.75rem; color:#475569;">
                <span>⏱️ Tiket hangus (Kedaluwarsa) karena tidak digunakan keluar melewati batas toleransi (+10 menit).</span>
              </div>
            ` : ''}

            ${t.approverNote ? `
              <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:0.5rem 0.75rem; font-size:0.75rem; color:#92400e;">
                <strong>Catatan Atasan:</strong> "${t.approverNote}"
              </div>
            ` : ''}

            <div class="card-actions-bar">
              <div style="display:flex; gap:0.4rem; flex-wrap:wrap; align-items:center;">
                <button class="btn-card-qr" onclick="openTicketDetail('${t.id}', 'qr')" title="Buka Tiket Digital & QR Code">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  <span>Tiket & QR Code</span>
                </button>

                <button class="btn-card-detail" onclick="openTicketDetail('${t.id}', 'detail')" title="Lihat Rincian Lengkap">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                  <span>Lihat Rincian</span>
                </button>
              </div>

              <div>
                ${canCancel ? `
                  <button class="btn-emergency" style="padding:0.45rem 0.75rem; font-size:0.75rem; min-height:34px;" onclick="openCancelModal('${t.id}')" title="Batalkan Mandiri">
                    Batalkan
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

function renderEmpTable(list, containerElement) {
  const containerEmpRequests = document.getElementById('containerEmpRequests');
  const target = containerElement || containerEmpRequests;
  if (!target) return;

  target.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nomor Tiket</th>
            <th>Kategori & Tipe</th>
            <th>Tujuan & Alasan</th>
            <th>Rencana Keluar</th>
            <th>Estimasi Kembali</th>
            <th>Status</th>
            <th style="text-align: right;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(t => {
            const canCancel = t.status === 'Menunggu Persetujuan' || t.status === 'Disetujui';
            return `
              <tr>
                <td>
                  <span style="font-family:var(--font-mono); font-weight:700;">${t.id}</span>
                  <div style="font-size:0.7rem; color:var(--text-muted);">${t.createdAt.slice(0,10)}</div>
                </td>
                <td>
                  <span class="tag-badge ${t.category === 'Dinas Kantor' ? 'tag-dinas' : 'tag-pribadi'}">${t.category}</span>
                  <div style="font-size:0.725rem; color:var(--text-secondary); margin-top:2px;">${t.type}</div>
                </td>
                <td>
                  <div style="font-weight:600; color:var(--text-primary);">${t.destination}</div>
                  <div style="font-size:0.75rem; color:var(--text-secondary); max-width:280px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${t.reason}</div>
                </td>
                <td style="font-family:var(--font-mono); font-size:0.775rem;">${window.formatDisplayDate(t.plannedExit)}</td>
                <td style="font-family:var(--font-mono); font-size:0.775rem;">${t.estimatedReturn ? window.formatDisplayDate(t.estimatedReturn) : 'Pulang Hari Ini'}</td>
                <td>${window.getStatusPill(t.status)}</td>
                <td style="text-align: right;">
                  <div style="display:inline-flex; gap:0.4rem; align-items:center;">
                    <button class="btn-card-qr" style="padding:0.35rem 0.65rem; font-size:0.725rem; min-height:30px;" onclick="openTicketDetail('${t.id}', 'qr')">
                      Tiket & QR Code
                    </button>
                    <button class="btn-card-detail" style="padding:0.35rem 0.65rem; font-size:0.725rem; min-height:30px;" onclick="openTicketDetail('${t.id}', 'detail')">
                      Lihat Rincian
                    </button>
                    ${canCancel ? `
                      <button class="btn-emergency" style="padding:0.35rem 0.55rem; font-size:0.725rem; min-height:30px;" onclick="openCancelModal('${t.id}')" title="Batalkan">✕</button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Expose globally
window.updateKaryawanMetrics = updateKaryawanMetrics;
window.filterEmpTickets = filterEmpTickets;
window.renderKaryawanDashboard = renderKaryawanDashboard;
window.renderKaryawanView = renderKaryawanView;
window.renderEmpCards = renderEmpCards;
window.renderEmpTable = renderEmpTable;
