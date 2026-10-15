/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Approver (Atasan) Module: Dashboard, Antrian Persetujuan, Pelacakan Izin, Approve & Reject Decision Flow
 */

function updateApproverMetrics() {
  const ticketsList = window.ticketsList || [];
  const pending = ticketsList.filter(t => t.status === 'Menunggu Persetujuan').length;
  const approved = ticketsList.filter(t => t.status === 'Disetujui').length;
  const rejected = ticketsList.filter(t => t.status === 'Ditolak').length;
  const total = ticketsList.length;

  const statAppPending = document.getElementById('statAppPending');
  const statAppApproved = document.getElementById('statAppApproved');
  const statAppRejected = document.getElementById('statAppRejected');
  const statAppTotal = document.getElementById('statAppTotal');

  if (statAppPending) statAppPending.textContent = pending;
  if (statAppApproved) statAppApproved.textContent = approved;
  if (statAppRejected) statAppRejected.textContent = rejected;
  if (statAppTotal) statAppTotal.textContent = total;

  const sidebarPendingBadge = document.getElementById('sidebarPendingBadge');
  const headingPendingBadge = document.getElementById('headingPendingBadge');

  if (sidebarPendingBadge) sidebarPendingBadge.textContent = pending;
  if (headingPendingBadge) headingPendingBadge.textContent = pending;
}

function renderApproverDashboard() {
  updateApproverMetrics();
  const ticketsList = window.ticketsList || [];
  const pendingTickets = ticketsList.filter(t => t.status === 'Menunggu Persetujuan');
  const outsideTickets = ticketsList.filter(t => t.status === 'Sedang di Luar' || t.status === 'Terlambat');

  const approverUrgentBanner = document.getElementById('approverUrgentBanner');
  const approverDashboardPendingList = document.getElementById('approverDashboardPendingList');
  const approverDashboardOutsideList = document.getElementById('approverDashboardOutsideList');

  const emergencyTickets = ticketsList.filter(t => (t.isEmergency || (t.id && t.id.startsWith('TK-EMG'))) && (t.status === 'Disetujui' || t.status === 'Sedang di Luar' || t.status === 'Terlambat'));

  // Urgent Attention Banner
  if (approverUrgentBanner) {
    let bannerHtml = '';

    if (emergencyTickets.length > 0) {
      const emg = emergencyTickets[0];
      const liveStatusText = emg.status === 'Disetujui' ? 'Menuju Pos Gerbang (Belum Keluar)' : (emg.status === 'Sedang di Luar' ? `Sedang di Luar (Scan Out: ${emg.scanOutTime || '-'})` : emg.status);
      bannerHtml += `
        <div style="background: #fff1f2; border: 1.5px solid #fca5a5; border-radius: 10px; padding: 0.9rem 1.25rem; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-size: 1.4rem;">🚨</div>
            <div>
              <div style="font-weight: 800; font-size: 0.875rem; color: #9f1239;">
                Monitoring Izin Darurat / Bypass Atasan (${emergencyTickets.length} Karyawan)
              </div>
              <div style="font-size: 0.775rem; color: #881337;">
                ${emg.applicantName} • Tujuan: <strong>${emg.destination}</strong> • Status: <strong>${liveStatusText}</strong>
              </div>
            </div>
          </div>
          <button class="btn-card-detail" style="background: #be123c; color: #ffffff; border: none; padding: 0.4rem 0.85rem; font-size: 0.75rem; border-radius: 6px; cursor: pointer;" onclick="openTicketDetail('${emg.id}', 'detail')">
            Lacak Izin Darurat →
          </button>
        </div>
      `;
    }

    if (pendingTickets.length > 0) {
      bannerHtml += `
        <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 10px; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-size: 1.4rem;">⚡</div>
            <div>
              <div style="font-weight: 800; font-size: 0.9rem; color: #92400e;">
                Ada ${pendingTickets.length} Permohonan Izin Bawahan Menunggu Keputusan Anda!
              </div>
              <div style="font-size: 0.775rem; color: #78350f;">
                Sesuai SOP "No Approval, No Exit", bawahan tidak dapat meninggalkan pabrik sebelum Anda menyetujui tiket ini.
              </div>
            </div>
          </div>
          <button class="btn-primary-action" style="padding: 0.45rem 0.9rem; font-size: 0.775rem; background: #b45309;" onclick="setApproverNav('antrian')">
            Buka Antrian Persetujuan →
          </button>
        </div>
      `;
    } else if (emergencyTickets.length === 0) {
      bannerHtml += `
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 0.85rem 1.25rem; display: flex; align-items: center; gap: 0.75rem;">
          <div style="font-size: 1.2rem;">✅</div>
          <div style="font-size: 0.825rem; color: #166534; font-weight: 600;">
            Semua antrean izin bawahan telah diputuskan. Tidak ada pengajuan yang tertunda saat ini.
          </div>
        </div>
      `;
    }

    approverUrgentBanner.innerHTML = bannerHtml;
  }

  // Pending queue quick inline list
  if (approverDashboardPendingList) {
    if (pendingTickets.length === 0) {
      approverDashboardPendingList.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
          Tidak ada antrian izin yang menunggu keputusan. Semua beres!
        </div>
      `;
    } else {
      approverDashboardPendingList.innerHTML = pendingTickets.map(t => `
        <div class="feed-item" style="border-left: 3px solid var(--amber-warning); flex-direction: column; align-items: stretch; gap: 0.65rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="card-id-num" style="font-size: 0.85rem;">${t.id}</span>
              <span class="tag-badge ${t.category === 'Dinas Kantor' ? 'tag-dinas' : 'tag-pribadi'}">${t.category}</span>
            </div>
            ${window.getStatusPill(t.status)}
          </div>
          <div style="font-size: 0.825rem; color: var(--text-primary);">
            <strong>${t.applicantName || 'Budi Pratama'}</strong> (${t.applicantNip || 'PK-2024-8841'}) • Tujuan: <strong>${t.destination}</strong>
          </div>
          <div style="font-size: 0.775rem; color: var(--text-secondary); line-height: 1.4;">
            "${t.reason}"
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; padding-top: 0.5rem; border-top: 1px solid #f1f5f9; flex-wrap: wrap; gap: 0.5rem;">
            <span style="font-size: 0.725rem; color: var(--text-muted); font-family: var(--font-mono);">
              Keluar: ${t.plannedExit.replace('T', ' ')}
            </span>
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn-card-detail" style="padding: 0.3rem 0.6rem; font-size: 0.725rem;" onclick="openTicketDetail('${t.id}', 'detail')">Rincian</button>
              <button class="btn-reject" style="padding: 0.3rem 0.65rem; font-size: 0.725rem;" onclick="openRejectModal('${t.id}')">✕ Tolak</button>
              <button class="btn-approve" style="padding: 0.3rem 0.65rem; font-size: 0.725rem;" onclick="openApproveModal('${t.id}')">✓ Setujui</button>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // Outside subordinates list
  if (approverDashboardOutsideList) {
    if (outsideTickets.length === 0) {
      approverDashboardOutsideList.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
          Semua staf/bawahan saat ini berada di dalam kawasan pabrik.
        </div>
      `;
    } else {
      approverDashboardOutsideList.innerHTML = outsideTickets.map(t => {
        const isOverdue = t.status === 'Terlambat';
        const isEmergency = t.isEmergency || (t.id && t.id.startsWith('TK-EMG'));
        return `
          <div class="feed-item" style="${isEmergency ? 'border-left: 3.5px solid var(--rose-danger); background: #fff1f2;' : (isOverdue ? 'border-left: 3.5px solid var(--rose-danger); background: #fff5f5;' : '')}">
            <div class="feed-item-left">
              <div class="feed-item-icon" style="background: ${isEmergency ? '#ffe4e6' : (isOverdue ? 'var(--rose-light)' : '#e0f2fe')}; color: ${isEmergency ? '#b91c1c' : (isOverdue ? 'var(--rose-danger)' : '#0284c7')};">
                ${isEmergency ? '🚨' : (isOverdue ? '⚠️' : '🚗')}
              </div>
              <div>
                <div class="feed-item-title" style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                  <span>${t.applicantName} • ${t.destination}</span>
                  ${isEmergency ? '<span class="tag-badge" style="background:#ffe4e6; color:#b91c1c; font-weight:800; font-size:0.65rem;">🚨 DARURAT</span>' : ''}
                </div>
                <div class="feed-item-sub">
                  ${t.id} • Est. Kembali: <span style="font-family: var(--font-mono); font-weight: 700;">${t.estimatedReturn ? t.estimatedReturn.replace('T', ' ') : 'Pulang Hari Ini'}</span>
                  ${t.emergencyContact ? ` • Kontak: <strong style="color: #9f1239;">${t.emergencyContact}</strong>` : ''}
                </div>
              </div>
            </div>
            <div>${window.getStatusPill(t.status)}</div>
          </div>
        `;
      }).join('');
    }
  }

  if (typeof window.renderApproverBarChart === 'function') {
    window.renderApproverBarChart();
  }
}

function renderApproverCards(list, containerElement) {
  const containerApproverRequests = document.getElementById('containerApproverRequests');
  const target = containerElement || containerApproverRequests;
  if (!target) return;

  target.innerHTML = `
    <div class="cards-grid">
      ${list.map(t => {
        const isPending = t.status === 'Menunggu Persetujuan';
        const isEmergency = t.isEmergency || (t.id && t.id.startsWith('TK-EMG'));
        const isDinas = t.category === 'Dinas Kantor';

        return `
          <div class="card-item" style="${isEmergency ? 'border-left: 4px solid var(--rose-danger);' : (isPending ? 'border-left: 4px solid var(--amber-warning);' : '')}">
            <div class="card-top">
              <div>
                <span class="card-id-num">${t.id}</span>
                <div class="card-created-meta">Diajukan: ${t.createdAt}</div>
              </div>
              ${window.getStatusPill(t.status)}
            </div>

            <div style="background:var(--bg-subtle); padding:0.6rem 0.85rem; border-radius:6px; display:flex; align-items:center; justify-content:space-between;">
              <div>
                <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary);">${t.applicantName || 'Budi Pratama, S.T.'}</div>
                <div style="font-size:0.725rem; color:var(--text-secondary);">NIP: ${t.applicantNip || 'PK-2024-8841'} • ${t.department || 'Rekayasa Mesin'}</div>
              </div>
              <span class="tag-badge ${isEmergency ? '' : (isDinas ? 'tag-dinas' : 'tag-pribadi')}" style="${isEmergency ? 'background:#ffe4e6; color:#b91c1c; font-weight:800;' : ''}">${isEmergency ? '🚨 ' + t.category : t.category}</span>
            </div>

            <div style="font-size:0.85rem; color:var(--text-primary); line-height:1.4;">
              <strong>Alasan Izin:</strong> "${t.reason}"
            </div>

            <div style="font-size:0.8rem; color:var(--text-secondary); display:flex; align-items:center; gap:0.35rem;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span><strong>Tujuan:</strong> ${t.destination}</span>
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

            ${t.approverNote ? `
              <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:6px; padding:0.5rem 0.75rem; font-size:0.75rem;">
                <strong>Catatan Keputusan:</strong> "${t.approverNote}"
              </div>
            ` : ''}

            <div class="card-actions-bar">
              <div style="display:flex; gap:0.4rem; flex-wrap:wrap; align-items:center;">
                <button class="btn-card-qr" style="padding:0.4rem 0.75rem; font-size:0.75rem; min-height:34px;" onclick="openTicketDetail('${t.id}', 'qr')" title="Buka Tiket Digital & QR Code">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  <span>Tiket & QR Code</span>
                </button>
                <button class="btn-card-detail" style="padding:0.4rem 0.75rem; font-size:0.75rem; min-height:34px;" onclick="openTicketDetail('${t.id}', 'detail')" title="Lihat Rincian Lengkap">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                  <span>Lihat Rincian</span>
                </button>
              </div>

              ${isPending ? `
                <div class="approver-action-grid">
                  <button class="btn-reject" onclick="openRejectModal('${t.id}')">
                    ✕ Tolak
                  </button>
                  <button class="btn-approve" onclick="openApproveModal('${t.id}')">
                    ✓ Setujui
                  </button>
                </div>
              ` : `
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">Sudah Diputuskan</span>
              `}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderApproverView() {
  updateApproverMetrics();
  const currentApproverNav = window.currentApproverNav || 'dashboard';
  const ticketsList = window.ticketsList || [];

  const containerApproverPendingQueue = document.getElementById('containerApproverPendingQueue');
  const emptyApproverPendingBox = document.getElementById('emptyApproverPendingBox');
  const containerApproverRequests = document.getElementById('containerApproverRequests');
  const emptyApproverBox = document.getElementById('emptyApproverBox');
  const filterAppViewMode = document.getElementById('filterAppViewMode');

  // 1. DASHBOARD SUBPAGE
  if (currentApproverNav === 'dashboard') {
    renderApproverDashboard();
    return;
  }

  // 2. ANTRIAN PERSETUJUAN
  if (currentApproverNav === 'antrian') {
    const pendingList = ticketsList.filter(t => t.status === 'Menunggu Persetujuan');

    if (pendingList.length === 0) {
      if (containerApproverPendingQueue) containerApproverPendingQueue.innerHTML = '';
      if (emptyApproverPendingBox) emptyApproverPendingBox.style.display = 'flex';
    } else {
      if (emptyApproverPendingBox) emptyApproverPendingBox.style.display = 'none';
      renderApproverCards(pendingList, containerApproverPendingQueue);
    }
    return;
  }

  // 3. PELACAKAN IZIN KARYAWAN
  if (currentApproverNav === 'pelacakan') {
    const mode = filterAppViewMode ? filterAppViewMode.value : 'all';
    let list = ticketsList;
    if (mode === 'pending') {
      list = ticketsList.filter(t => t.status === 'Menunggu Persetujuan');
    } else if (mode === 'emergency') {
      list = ticketsList.filter(t => t.isEmergency || (t.id && t.id.startsWith('TK-EMG')));
    } else if (mode === 'outside') {
      list = ticketsList.filter(t => t.status === 'Sedang di Luar' || t.status === 'Terlambat');
    }

    if (list.length === 0) {
      if (containerApproverRequests) containerApproverRequests.innerHTML = '';
      if (emptyApproverBox) emptyApproverBox.style.display = 'flex';
      return;
    }

    if (emptyApproverBox) emptyApproverBox.style.display = 'none';
    renderApproverCards(list, containerApproverRequests);
  }
}

// APPROVAL & REJECTION MODALS
function openApproveModal(ticketId) {
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  window.currentDecisionTicketId = ticketId;
  const approveTicketId = document.getElementById('approveTicketId');
  const approveEmployeeName = document.getElementById('approveEmployeeName');
  const approveNoteInput = document.getElementById('approveNoteInput');
  const modalApproveDecision = document.getElementById('modalApproveDecision');

  if (approveTicketId) approveTicketId.textContent = ticket.id;
  if (approveEmployeeName) approveEmployeeName.textContent = ticket.applicantName || 'Budi Pratama';
  if (approveNoteInput) approveNoteInput.value = '';
  if (modalApproveDecision) modalApproveDecision.classList.add('open');
}

function openRejectModal(ticketId) {
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  window.currentDecisionTicketId = ticketId;
  const rejectTicketId = document.getElementById('rejectTicketId');
  const rejectEmployeeName = document.getElementById('rejectEmployeeName');
  const rejectReasonInput = document.getElementById('rejectReasonInput');
  const modalRejectDecision = document.getElementById('modalRejectDecision');

  if (rejectTicketId) rejectTicketId.textContent = ticket.id;
  if (rejectEmployeeName) rejectEmployeeName.textContent = ticket.applicantName || 'Budi Pratama';
  if (rejectReasonInput) rejectReasonInput.value = '';
  if (modalRejectDecision) modalRejectDecision.classList.add('open');
}

document.addEventListener('DOMContentLoaded', () => {
  const modalApproveDecision = document.getElementById('modalApproveDecision');
  const btnCloseApproveModal = document.getElementById('btnCloseApproveModal');
  const btnCancelApproveModal = document.getElementById('btnCancelApproveModal');
  const btnConfirmApprove = document.getElementById('btnConfirmApprove');
  const approveNoteInput = document.getElementById('approveNoteInput');

  const modalRejectDecision = document.getElementById('modalRejectDecision');
  const btnCloseRejectModal = document.getElementById('btnCloseRejectModal');
  const btnCancelRejectModal = document.getElementById('btnCancelRejectModal');
  const btnConfirmReject = document.getElementById('btnConfirmReject');
  const rejectReasonInput = document.getElementById('rejectReasonInput');

  if (btnCloseApproveModal) btnCloseApproveModal.addEventListener('click', () => modalApproveDecision.classList.remove('open'));
  if (btnCancelApproveModal) btnCancelApproveModal.addEventListener('click', () => modalApproveDecision.classList.remove('open'));

  if (btnConfirmApprove) {
    btnConfirmApprove.addEventListener('click', () => {
      const ticketsList = window.ticketsList || [];
      const ticket = ticketsList.find(t => t.id === window.currentDecisionTicketId);
      if (!ticket) return;

      const note = approveNoteInput.value.trim() || 'Disetujui oleh Atasan langsung.';
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const nowFormatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

      const ACTORS = window.ACTORS || {};
      const approverName = ACTORS.approver ? ACTORS.approver.name : 'Ir. Hendra Gunawan, M.T.';

      ticket.status = 'Disetujui';
      ticket.approverNote = note;
      if (!ticket.timeline) ticket.timeline = [];
      ticket.timeline.push(
        {
          event: 'Disetujui Atasan',
          time: nowFormatted,
          by: `${approverName} (Manager)`,
          desc: `Persetujuan diberikan. Catatan: "${note}"`
        },
        {
          event: 'QR Code Diterbitkan',
          time: nowFormatted,
          by: 'Sistem Gerbang Digital',
          desc: 'Tiket QR aktif resmi siap dipindai di Pos Jaga Utama.'
        }
      );

      window.saveTickets(ticketsList);
      if (modalApproveDecision) modalApproveDecision.classList.remove('open');
      if (typeof window.showToast === 'function') {
        window.showToast(`Tiket #${window.currentDecisionTicketId} berhasil disetujui! QR Code otomatis terbit untuk karyawan.`, 'success');
      }
      renderApproverView();
      if (typeof window.renderSecurityView === 'function') window.renderSecurityView();
    });
  }

  if (btnCloseRejectModal) btnCloseRejectModal.addEventListener('click', () => modalRejectDecision.classList.remove('open'));
  if (btnCancelRejectModal) btnCancelRejectModal.addEventListener('click', () => modalRejectDecision.classList.remove('open'));

  if (btnConfirmReject) {
    btnConfirmReject.addEventListener('click', () => {
      const reason = rejectReasonInput.value.trim();
      if (!reason) {
        if (typeof window.showToast === 'function') window.showToast('Alasan penolakan wajib diisi sesuai aturan bisnis!', 'danger');
        return;
      }

      const ticketsList = window.ticketsList || [];
      const ticket = ticketsList.find(t => t.id === window.currentDecisionTicketId);
      if (!ticket) return;

      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const nowFormatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

      const ACTORS = window.ACTORS || {};
      const approverName = ACTORS.approver ? ACTORS.approver.name : 'Ir. Hendra Gunawan, M.T.';

      ticket.status = 'Ditolak';
      ticket.approverNote = `Ditolak: ${reason}`;
      if (!ticket.timeline) ticket.timeline = [];
      ticket.timeline.push({
        event: 'Ditolak Atasan',
        time: nowFormatted,
        by: `${approverName} (Manager)`,
        desc: `Alasan penolakan: "${reason}"`
      });

      window.saveTickets(ticketsList);
      if (modalRejectDecision) modalRejectDecision.classList.remove('open');
      if (typeof window.showToast === 'function') {
        window.showToast(`Tiket #${window.currentDecisionTicketId} telah ditolak. Alasan tersimpan di riwayat pemohon.`, 'danger');
      }
      renderApproverView();
    });
  }
});

// Expose globally
window.updateApproverMetrics = updateApproverMetrics;
window.renderApproverDashboard = renderApproverDashboard;
window.renderApproverCards = renderApproverCards;
window.renderApproverView = renderApproverView;
window.openApproveModal = openApproveModal;
window.openRejectModal = openRejectModal;
