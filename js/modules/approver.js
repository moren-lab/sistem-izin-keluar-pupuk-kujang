/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Approver (Atasan) Module: Dashboard, Antrian Persetujuan, Pelacakan Izin, Approve & Reject Decision Flow
 */

function getCurrentApproverActor() {
  const ACTORS = window.ACTORS || {};
  const isApprover2 = (window.currentActor === 'approver2');
  return isApprover2 
    ? (ACTORS.approver2 || { name: 'Dewi Sartika, S.T., M.M.', title: 'Supervisor Operasional Lapangan (Plt. Manager)', nip: 'PK-2012-0845' })
    : (ACTORS.approver || { name: 'Ir. Hendra Gunawan, M.T.', title: 'Manager Rekayasa & Pemeliharaan', nip: 'PK-2015-1002' });
}

function isTicketAssignedToCurrentApprover(ticket) {
  if (!ticket) return false;
  const currentActor = getCurrentApproverActor();
  const aName = (currentActor.name || '').toLowerCase();
  const tApprover = (ticket.approverName || '').toLowerCase();
  
  if (aName.includes('dewi')) {
    return tApprover.includes('dewi');
  } else {
    // Hendra Gunawan or default
    return tApprover.includes('hendra') || (!tApprover.includes('dewi'));
  }
}

function isTicketReassignedFromCurrentApprover(ticket) {
  if (!ticket || !ticket.reassignedFrom) return false;
  const currentActor = getCurrentApproverActor();
  const aName = (currentActor.name || '').toLowerCase();
  const fromName = (ticket.reassignedFrom || '').toLowerCase();
  
  if (aName.includes('dewi')) {
    return fromName.includes('dewi');
  } else {
    return fromName.includes('hendra');
  }
}

function updateApproverMetrics() {
  const ticketsList = window.ticketsList || [];
  const currentApprover = getCurrentApproverActor();

  const pendingInitial = ticketsList.filter(t => 
    t.status !== 'Dibatalkan' && 
    t.status !== 'Ditolak' && 
    (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat') &&
    isTicketAssignedToCurrentApprover(t)
  ).length;

  const pendingExtensions = ticketsList.filter(t => 
    t.pendingExtension && 
    t.pendingExtension.status === 'Menunggu Persetujuan' &&
    isTicketAssignedToCurrentApprover(t)
  ).length;

  const pending = pendingInitial + pendingExtensions;
  const approved = ticketsList.filter(t => t.status === 'Disetujui' && isTicketAssignedToCurrentApprover(t)).length;
  const rejected = ticketsList.filter(t => t.status === 'Ditolak' && isTicketAssignedToCurrentApprover(t)).length;
  const total = ticketsList.filter(t => isTicketAssignedToCurrentApprover(t) || isTicketReassignedFromCurrentApprover(t)).length;

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
  const bnavPendingBadge = document.getElementById('bnavPendingBadge');

  if (sidebarPendingBadge) sidebarPendingBadge.textContent = pending;
  if (headingPendingBadge) headingPendingBadge.textContent = pending;
  if (bnavPendingBadge) {
    bnavPendingBadge.textContent = pending;
    bnavPendingBadge.style.display = pending > 0 ? 'inline-block' : 'none';
  }
}

function renderApproverDashboard() {
  updateApproverMetrics();

  // Dynamic approver header based on active role (Ir. Hendra Gunawan vs Dewi Sartika)
  const approverHeroSub = document.getElementById('approverHeroSub');
  const approverProfilePill = document.getElementById('approverProfilePill');
  const ACTORS = window.ACTORS || {};
  const isApprover2 = (window.currentActor === 'approver2');
  const currentApproverActor = isApprover2 ? (ACTORS.approver2 || { name: 'Dewi Sartika, S.T., M.M.', title: 'Supervisor Operasional (Plt)' }) : (ACTORS.approver || { name: 'Ir. Hendra Gunawan, M.T.', title: 'Manager Rekayasa & Pemeliharaan' });

  if (approverHeroSub) {
    approverHeroSub.innerHTML = `${currentApproverActor.name} • ${currentApproverActor.title} • Prinsip: <strong>No Approval, No Exit</strong>`;
  }
  if (approverProfilePill) {
    approverProfilePill.textContent = `Approver: ${currentApproverActor.name} (${isApprover2 ? 'Atasan 2 / Delegasi' : 'Atasan 1 / Manager'})`;
  }

  const ticketsList = window.ticketsList || [];
  const pendingTickets = ticketsList.filter(t => t.status === 'Menunggu Persetujuan' && isTicketAssignedToCurrentApprover(t));
  const pendingExtensions = ticketsList.filter(t => t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan' && isTicketAssignedToCurrentApprover(t));
  const outsideTickets = ticketsList.filter(t => (t.status === 'Sedang di Luar' || t.status === 'Terlambat') && (isTicketAssignedToCurrentApprover(t) || isTicketReassignedFromCurrentApprover(t)));

  const approverUrgentBanner = document.getElementById('approverUrgentBanner');
  const approverDashboardPendingList = document.getElementById('approverDashboardPendingList');
  const approverDashboardOutsideList = document.getElementById('approverDashboardOutsideList');

  // Emergency tickets breakdown: Locked (Need Authorization) vs Active (Monitoring)
  const lockedEmergencyTickets = ticketsList.filter(t => t.isEmergency && t.status === 'Menunggu Otorisasi Darurat' && isTicketAssignedToCurrentApprover(t));
  const activeEmergencyTickets = ticketsList.filter(t => (t.isEmergency || (t.id && t.id.startsWith('TK-EMG'))) && !t.emergencyLocked && (t.status === 'Disetujui' || t.status === 'Sedang di Luar' || t.status === 'Terlambat') && isTicketAssignedToCurrentApprover(t));
  const emergencyTickets = ticketsList.filter(t => (t.isEmergency || (t.id && t.id.startsWith('TK-EMG'))) && t.status !== 'Selesai' && t.status !== 'Ditolak' && t.status !== 'Dibatalkan' && isTicketAssignedToCurrentApprover(t));

  // Pengajuan yang dialihkan dari atasan ini ke atasan lain (tetap dipantau selama belum selesai)
  const reassignedAwayTickets = ticketsList.filter(t => isTicketReassignedFromCurrentApprover(t) && t.status !== 'Selesai' && t.status !== 'Ditolak' && t.status !== 'Dibatalkan');

  // Urgent Attention Banner
  if (approverUrgentBanner) {
    let bannerHtml = '';

    // 0. INFORMASI PENGAJUAN DIALIHKAN KE ATASAN LAIN (JIKA ADA)
    if (reassignedAwayTickets.length > 0) {
      bannerHtml += `
        <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 12px; padding: 0.95rem 1.25rem; margin-bottom: 0.85rem; box-shadow: 0 2px 8px rgba(217, 119, 6, 0.1);">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
              <div style="font-size: 1.5rem;">↳</div>
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span style="font-weight: 800; font-size: 0.9rem; color: #92400e;">
                    ${reassignedAwayTickets.length} PENGAJUAN DIALIHKAN KE ATASAN LAIN
                  </span>
                  <span class="tag-badge" style="background: #fef3c7; color: #92400e; font-weight: 700; border: 1px solid #fde68a;">Dialihkan</span>
                </div>
                <div style="font-size: 0.8rem; color: #78350f; margin-top: 3px;">
                  ${reassignedAwayTickets.map(t => `Tiket <strong>${t.id}</strong> (${t.applicantName}) dialihkan ke <strong>${t.approverName}</strong>`).join(', ')}.
                </div>
                <div style="font-size: 0.75rem; color: #b45309; margin-top: 2px;">
                  Status pengajuan ini tetap dapat Anda pantau di menu Pelacakan Izin Karyawan.
                </div>
              </div>
            </div>
            <button type="button" class="btn-card-detail" style="padding: 0.4rem 0.8rem; font-size: 0.775rem; background: #ffffff; border: 1px solid #cbd5e1;" onclick="setApproverNav('pelacakan')">
              Lihat di Pelacakan →
            </button>
          </div>
        </div>
      `;
    }

    // 1. TIKET DARURAT BUTUH OTORISASI CEPAT (3 METODE)
    if (lockedEmergencyTickets.length > 0) {
      lockedEmergencyTickets.forEach(emg => {
        bannerHtml += `
          <div style="background: #fff1f2; border: 2px solid #e11d48; border-radius: 12px; padding: 1.1rem 1.35rem; margin-bottom: 0.85rem; box-shadow: 0 4px 14px rgba(225, 29, 72, 0.15);">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
              <div style="display: flex; align-items: flex-start; gap: 0.85rem;">
                <div style="font-size: 1.8rem;">🚨</div>
                <div>
                  <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <span style="font-weight: 800; font-size: 0.95rem; color: #9f1239;">
                      PERMOHONAN IZIN DARURAT (K3 / MEDIS)
                    </span>
                    <span class="status-pill emergency-locked" style="font-size: 0.65rem; padding: 2px 8px;">QR TERKUNCI</span>
                  </div>
                  <div style="font-size: 0.85rem; color: #881337; margin-top: 3px;">
                    <strong>${emg.applicantName}</strong> (${emg.id}) • Tujuan: <strong>${emg.destination}</strong>
                  </div>
                  <div style="font-size: 0.775rem; color: #9f1239; margin-top: 2px; font-style: italic;">
                    "Alasan Kedaruratan: ${emg.reason}"
                  </div>
                </div>
              </div>
              <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                <button type="button" class="btn-approve" style="padding: 0.5rem 1rem; font-size: 0.8rem; font-weight: 800; background: #059669; box-shadow: 0 2px 8px rgba(5,150,105,0.3);" onclick="window.emergencyDirectApprove('${emg.id}')">
                  ⚡ 1. Setujui Langsung di App
                </button>
                <button type="button" class="btn-card-detail" style="padding: 0.5rem 0.85rem; font-size: 0.8rem;" onclick="openTicketDetail('${emg.id}', 'detail')">
                  Lihat Tiket
                </button>
              </div>
            </div>

            <!-- Panel Opsi 2 & 3: Sandi Otorisasi & Scan Wajah -->
            <div style="margin-top: 0.85rem; padding-top: 0.85rem; border-top: 1px dashed #fca5a5; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; background: #ffe4e6; padding: 0.65rem 0.95rem; border-radius: 8px;">
              <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                <span style="font-size: 0.8rem; color: #881337; font-weight: 700;">🔑 2. Sandi Darurat:</span>
                <span style="font-family: var(--font-mono); font-size: 1.15rem; font-weight: 800; color: #9f1239; background: #ffffff; padding: 2px 10px; border-radius: 6px; border: 1px solid #f43f5e; letter-spacing: 2px;">
                  ${emg.emergencyPasscode || '849201'}
                </span>
                <button type="button" class="btn-card-detail" style="padding: 0.25rem 0.6rem; font-size: 0.725rem; background: #ffffff; border: 1px solid #fda4af;" onclick="navigator.clipboard.writeText('${emg.emergencyPasscode || '849201'}'); if (typeof window.showToast === 'function') window.showToast('Kode Sandi Darurat [${emg.emergencyPasscode || '849201'}] disalin! Berikan ke karyawan via Telp/WA.', 'info');">
                  📋 Salin Sandi
                </button>
                <span style="font-size: 0.7rem; color: #9f1239;">(Bisa diberikan via Telp/WA jika Anda di luar kantor)</span>
              </div>
              <div style="font-size: 0.75rem; color: #881337;">
                🤳 <strong>3. Scan Wajah:</strong> Tersedia di kamera ponsel pemohon jika Anda di tempat.
              </div>
            </div>
          </div>
        `;
      });
    }

    if (activeEmergencyTickets.length > 0) {
      const emg = activeEmergencyTickets[0];
      const liveStatusText = emg.status === 'Disetujui' ? 'Menuju Pos Gerbang (Belum Keluar)' : (emg.status === 'Sedang di Luar' ? `Sedang di Luar (Scan Out: ${emg.scanOutTime || '-'})` : emg.status);
      bannerHtml += `
        <div style="background: #fff1f2; border: 1.5px solid #fca5a5; border-radius: 10px; padding: 0.9rem 1.25rem; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-size: 1.4rem;">🚨</div>
            <div>
              <div style="font-weight: 800; font-size: 0.875rem; color: #9f1239;">
                Monitoring Izin Darurat Aktif (${activeEmergencyTickets.length} Karyawan)
              </div>
              <div style="font-size: 0.775rem; color: #881337;">
                ${emg.applicantName} • Tujuan: <strong>${emg.destination}</strong> • Status: <strong>${liveStatusText}</strong> • Otorisasi: <em>${emg.emergencyUnlockMethod || 'Resmi'}</em>
              </div>
            </div>
          </div>
          <button class="btn-card-detail" style="background: #be123c; color: #ffffff; border: none; padding: 0.4rem 0.85rem; font-size: 0.75rem; border-radius: 6px; cursor: pointer;" onclick="openTicketDetail('${emg.id}', 'detail')">
            Lacak Izin Darurat →
          </button>
        </div>
      `;
    }

    if (pendingExtensions.length > 0) {
      const extFirst = pendingExtensions[0];
      bannerHtml += `
        <div style="background: #fffdf7; border: 1.5px solid #f59e0b; border-radius: 10px; padding: 0.9rem 1.25rem; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-size: 1.4rem;">⏱️</div>
            <div>
              <div style="font-weight: 800; font-size: 0.875rem; color: #92400e;">
                Permohonan Perpanjangan Waktu Izin (${pendingExtensions.length} Karyawan Sedang di Luar)
              </div>
              <div style="font-size: 0.775rem; color: #78350f;">
                ${extFirst.applicantName} (${extFirst.id}) mengajukan perpanjangan kembali s/d <strong>${extFirst.pendingExtension.newEstimatedReturn.replace('T', ' ')}</strong>. Alasan: "${extFirst.pendingExtension.reason}"
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            <button class="btn-card-detail" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="openTicketDetail('${extFirst.id}', 'detail')">Rincian</button>
            <button class="btn-reject" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="openRejectExtensionModal('${extFirst.id}')">✕ Tolak</button>
            <button class="btn-approve" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="approveExtensionRequest('${extFirst.id}')">✓ Setujui</button>
          </div>
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
    } else if (lockedEmergencyTickets.length === 0 && activeEmergencyTickets.length === 0 && pendingExtensions.length === 0) {
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

  // Pending queue quick inline list (Initial approvals + Extension requests)
  if (approverDashboardPendingList) {
    if (pendingTickets.length === 0 && pendingExtensions.length === 0 && reassignedAwayTickets.length === 0) {
      approverDashboardPendingList.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
          Tidak ada antrian izin yang menunggu keputusan. Semua beres!
        </div>
      `;
    } else {
      let html = '';

      // Render perpanjangan waktu terlebih dahulu (urgent)
      pendingExtensions.forEach(t => {
        html += `
          <div class="feed-item" style="border-left: 3.5px solid #d97706; background: #fffdfa; flex-direction: column; align-items: stretch; gap: 0.65rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="card-id-num" style="font-size: 0.85rem;">${t.id}</span>
                <span class="tag-badge" style="background: #fef3c7; color: #92400e; font-weight: 800; font-size: 0.7rem;">⏱️ PERPANJANGAN WAKTU</span>
              </div>
              <span class="tag-badge" style="background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; font-weight: 700;">Sedang di Luar</span>
            </div>
            <div style="font-size: 0.825rem; color: var(--text-primary);">
              <strong>${t.applicantName || 'Budi Pratama'}</strong> (${t.applicantNip || 'PK-2024-8841'}) • Tujuan: <strong>${t.destination}</strong>
            </div>
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.775rem; color: #92400e; line-height: 1.45;">
              <div><strong>Estimasi Kembali Semula:</strong> ${t.estimatedReturn ? t.estimatedReturn.replace('T', ' ') : '-'}</div>
              <div><strong>Permohonan Waktu Baru:</strong> <strong style="color: #b45309;">${t.pendingExtension.newEstimatedReturn.replace('T', ' ')}</strong></div>
              <div style="margin-top: 2px;"><strong>Alasan:</strong> "${t.pendingExtension.reason}"</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; padding-top: 0.5rem; border-top: 1px solid #f1f5f9; flex-wrap: gap: 0.5rem;">
              <span style="font-size: 0.725rem; color: var(--text-muted);">
                Diajukan: ${t.pendingExtension.requestedAt}
              </span>
              <div style="display: flex; gap: 0.35rem;">
                <button class="btn-card-detail" style="padding: 0.3rem 0.6rem; font-size: 0.725rem;" onclick="openTicketDetail('${t.id}', 'detail')">Rincian</button>
                <button class="btn-reject" style="padding: 0.3rem 0.65rem; font-size: 0.725rem;" onclick="openRejectExtensionModal('${t.id}')">✕ Tolak</button>
                <button class="btn-approve" style="padding: 0.3rem 0.65rem; font-size: 0.725rem;" onclick="approveExtensionRequest('${t.id}')">✓ Setujui</button>
              </div>
            </div>
          </div>
        `;
      });

      // Render regular pending tickets
      pendingTickets.forEach(t => {
        html += `
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
        `;
      });

      // Render reassigned away tickets (so former approver can monitor them directly in feed)
      reassignedAwayTickets.forEach(t => {
        html += `
          <div class="feed-item" style="border-left: 3.5px solid #d97706; background: #fffdfa; flex-direction: column; align-items: stretch; gap: 0.65rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span class="card-id-num" style="font-size: 0.85rem;">${t.id}</span>
                <span class="tag-badge" style="background: #fef3c7; color: #92400e; font-weight: 800; font-size: 0.7rem;">↳ DIALIHKAN KE ${t.approverName.toUpperCase()}</span>
              </div>
              <span class="tag-badge" style="background: #f1f5f9; color: #475569; font-weight: 700;">Status: ${t.status}</span>
            </div>
            <div style="font-size: 0.825rem; color: var(--text-primary);">
              <strong>${t.applicantName || 'Budi Pratama'}</strong> (${t.applicantNip || 'PK-2024-8841'}) • Tujuan: <strong>${t.destination}</strong>
            </div>
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 0.45rem 0.75rem; font-size: 0.75rem; color: #92400e; line-height: 1.45;">
              Pengajuan ini dialihkan oleh pemohon ke <strong>${t.approverName}</strong> pada ${t.reassignedAt || 'hari ini'}. Anda tetap dapat memantau perkembangan statusnya.
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; padding-top: 0.5rem; border-top: 1px solid #f1f5f9; flex-wrap: wrap; gap: 0.5rem;">
              <span style="font-size: 0.725rem; color: var(--text-muted); font-family: var(--font-mono);">
                Rencana: ${t.plannedExit ? t.plannedExit.replace('T', ' ') : '-'}
              </span>
              <button class="btn-card-detail" style="padding: 0.3rem 0.65rem; font-size: 0.725rem;" onclick="openTicketDetail('${t.id}', 'detail')">Lihat Rincian Status</button>
            </div>
          </div>
        `;
      });

      approverDashboardPendingList.innerHTML = html;
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

function renderApproverCards(list, containerElement, isTracking = false) {
  const containerApproverRequests = document.getElementById('containerApproverRequests');
  const target = containerElement || containerApproverRequests;
  if (!target) return;
  const isTrackingView = isTracking || (window.currentApproverNav === 'pelacakan') || (target === containerApproverRequests);

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

            ${isTicketReassignedFromCurrentApprover(t) ? `
              <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 0.45rem 0.75rem; font-size: 0.75rem; color: #92400e; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                <span>↳ <strong>Status:</strong> Pengajuan ini dialihkan oleh pemohon ke <strong>${t.approverName}</strong></span>
                <span style="font-size: 0.7rem; color: #b45309;">${t.reassignedAt || ''}</span>
              </div>
            ` : (isTicketAssignedToCurrentApprover(t) && t.reassignedFrom ? `
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 0.45rem 0.75rem; font-size: 0.75rem; color: #1e40af; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                <span>↳ <strong>Status:</strong> Pengajuan ini dialihkan dari <strong>${t.reassignedFrom}</strong> ke Anda</span>
                <span style="font-size: 0.7rem; color: #3b82f6;">${t.reassignedAt || ''}</span>
              </div>
            ` : '')}

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

            ${t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan' ? `
              <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; padding: 0.65rem 0.85rem; font-size: 0.8rem; margin: 0.5rem 0;">
                <div style="font-weight: 800; color: #b45309; display: flex; align-items: center; justify-content: space-between;">
                  <span>⏱️ Permohonan Perpanjangan Waktu</span>
                  <span class="tag-badge" style="background:#fef3c7; color:#92400e;">Grace Period</span>
                </div>
                <div style="margin-top: 0.35rem; color: #78350f; font-size: 0.775rem; line-height: 1.4;">
                  <div><strong>Waktu Baru:</strong> <strong style="color: #b45309;">${t.pendingExtension.newEstimatedReturn.replace('T', ' ')}</strong></div>
                  <div><strong>Alasan:</strong> "${t.pendingExtension.reason}"</div>
                </div>
              </div>
            ` : ''}

            ${isEmergency && (t.status === 'Menunggu Otorisasi Darurat' || t.emergencyLocked) ? `
              <div style="background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 8px; padding: 0.75rem 0.95rem; font-size: 0.8rem; margin: 0.65rem 0;">
                <div style="font-weight: 800; color: #9f1239; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.4rem;">
                  <span>🚨 Hasil Penulisan Form Kedaruratan (K3/Medis)</span>
                  <span class="tag-badge" style="background: #ffe4e6; color: #9f1239; font-weight: 800;">
                    ${t.selectedMethod === 'passcode' ? '🔑 Cara: Sandi / OTP' : (t.selectedMethod === 'facescan' ? '🤳 Cara: Scan Wajah' : '📱 Cara: Persetujuan di App')}
                  </span>
                </div>
                <div style="margin-top: 0.35rem; font-size: 0.75rem; color: #881337; line-height: 1.45;">
                  <strong>Alasan:</strong> "${t.reason}" • <strong>Tujuan:</strong> ${t.destination}
                </div>
                ${t.selectedMethod === 'passcode' ? `
                  <div style="margin-top: 0.5rem; background: #ffffff; border: 1.5px solid #f43f5e; border-radius: 6px; padding: 0.5rem 0.75rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                      <div style="font-size: 0.7rem; color: #881337; font-weight: 700;">Kode Sandi Otorisasi (Boleh Diberikan ke Karyawan):</div>
                      <div style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 900; color: #9f1239; letter-spacing: 2.5px;">
                        ${t.emergencyPasscode || '849201'}
                      </div>
                    </div>
                    <button type="button" class="btn-card-detail" style="font-size: 0.725rem; background: #ffe4e6; color: #9f1239; border: 1px solid #fda4af; padding: 0.35rem 0.7rem;" onclick="navigator.clipboard.writeText('${t.emergencyPasscode || '849201'}'); if (typeof window.showToast === 'function') window.showToast('Kode Sandi Darurat [${t.emergencyPasscode || '849201'}] disalin! Berikan ke karyawan via Telp/WA.', 'info');">
                      📋 Salin Sandi
                    </button>
                  </div>
                ` : (t.selectedMethod === 'facescan' ? `
                  <div style="margin-top: 0.4rem; font-size: 0.75rem; color: #881337;">
                    🤳 Pemohon meminta scan wajah langsung di ponselnya. Atau klik tombol di bawah untuk menyetujui langsung.
                  </div>
                ` : `
                  <div style="margin-top: 0.4rem; font-size: 0.75rem; color: #881337;">
                    📱 Pemohon menunggu persetujuan langsung 1-klik Anda di aplikasi ini.
                  </div>
                `)}
              </div>
            ` : ''}

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
                ${isTrackingView ? `
                  <button type="button" class="btn-card-detail" style="padding:0.4rem 0.75rem; font-size:0.75rem; min-height:34px; color:#e11d48; border-color:#fecdd3; background:#fff1f2; display:inline-flex; align-items:center; gap:0.25rem;" onclick="window.deleteApproverTicket('${t.id}')" title="Hapus catatan izin dari pelacakan">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    <span>Hapus</span>
                  </button>
                ` : ''}
              </div>

              ${isTicketReassignedFromCurrentApprover(t) ? `
                <span style="font-size:0.75rem; color:#92400e; background:#fef3c7; border:1px solid #fde68a; padding:0.3rem 0.7rem; border-radius:6px; font-weight:700; display:inline-flex; align-items:center; gap:0.35rem;">
                  <span style="width:7px; height:7px; border-radius:50%; background:#d97706; display:inline-block;"></span>
                  Dialihkan ke ${t.approverName}
                </span>
              ` : (isTrackingView ? (
                (isPending || (isEmergency && (t.status === 'Menunggu Otorisasi Darurat' || t.emergencyLocked)) || (t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan')) ? `
                  <span style="font-size:0.75rem; color:#b45309; background:#fffbeb; border:1px solid #fde68a; padding:0.3rem 0.7rem; border-radius:6px; font-weight:700; display:inline-flex; align-items:center; gap:0.35rem;">
                    <span style="width:7px; height:7px; border-radius:50%; background:#d97706; display:inline-block;"></span>
                    Belum Diputuskan
                  </span>
                ` : `
                  <span style="font-size:0.75rem; color:#047857; background:#ecfdf5; border:1px solid #a7f3d0; padding:0.3rem 0.7rem; border-radius:6px; font-weight:700; display:inline-flex; align-items:center; gap:0.35rem;">
                    <span style="width:7px; height:7px; border-radius:50%; background:#059669; display:inline-block;"></span>
                    Sudah Diputuskan
                  </span>
                `
              ) : (
                t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan' ? `
                  <div class="approver-action-grid">
                    <button class="btn-reject" onclick="openRejectExtensionModal('${t.id}')">
                      ✕ Tolak Perpanjang
                    </button>
                    <button class="btn-approve" onclick="approveExtensionRequest('${t.id}')">
                      ✓ Setujui Perpanjang
                    </button>
                  </div>
                ` : (isEmergency && (t.status === 'Menunggu Otorisasi Darurat' || t.emergencyLocked) ? `
                  <div class="approver-action-grid">
                    <button class="btn-reject" onclick="openRejectModal('${t.id}')">
                      ✕ Tolak Darurat
                    </button>
                    <button class="btn-approve" style="background:#059669; font-weight:800;" onclick="window.emergencyDirectApprove('${t.id}')">
                      ✓ Validasi & Buka Kunci
                    </button>
                  </div>
                ` : (isPending ? `
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
                `))
              ))}
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

  // 2. ANTRIAN PERSETUJUAN (Termasuk Tiket Darurat Terkunci)
  if (currentApproverNav === 'antrian') {
    // 1. Pengajuan tertunda yang ditujukan ke atasan aktif saat ini
    const pendingList = ticketsList.filter(t => 
      t.status !== 'Dibatalkan' &&
      t.status !== 'Ditolak' &&
      t.status !== 'Selesai' &&
      isTicketAssignedToCurrentApprover(t) &&
      (t.status === 'Menunggu Persetujuan' || 
       t.status === 'Menunggu Otorisasi Darurat' || 
       (t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan'))
    );

    // 2. Pengajuan yang sebelumnya diajukan ke atasan ini tapi dialihkan ke atasan lain
    const reassignedAwayList = ticketsList.filter(t =>
      t.status !== 'Dibatalkan' &&
      t.status !== 'Ditolak' &&
      t.status !== 'Selesai' &&
      isTicketReassignedFromCurrentApprover(t) &&
      (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat')
    );

    if (pendingList.length === 0 && reassignedAwayList.length === 0) {
      if (containerApproverPendingQueue) containerApproverPendingQueue.innerHTML = '';
      if (emptyApproverPendingBox) emptyApproverPendingBox.style.display = 'flex';
    } else {
      if (emptyApproverPendingBox) emptyApproverPendingBox.style.display = 'none';
      if (containerApproverPendingQueue) {
        let queueHtml = '';
        if (pendingList.length > 0) {
          const tempDiv = document.createElement('div');
          renderApproverCards(pendingList, tempDiv);
          queueHtml += tempDiv.innerHTML;
        } else {
          queueHtml += `
            <div style="padding: 1.5rem; text-align: center; color: var(--text-secondary); font-size: 0.85rem; background: #ffffff; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
              Tidak ada antrean persetujuan baru yang ditujukan ke Anda saat ini.
            </div>
          `;
        }

        if (reassignedAwayList.length > 0) {
          const tempDivReassigned = document.createElement('div');
          renderApproverCards(reassignedAwayList, tempDivReassigned, true);
          queueHtml += `
            <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 2px dashed #fde68a;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <h4 style="font-size: 0.95rem; font-weight: 800; color: #92400e; display: flex; align-items: center; gap: 0.4rem; margin: 0;">
                  <span>↳ Pengajuan Dialihkan ke Atasan Lain</span>
                  <span style="font-size: 0.75rem; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 999px; border: 1px solid #fde68a;">${reassignedAwayList.length}</span>
                </h4>
                <span style="font-size: 0.75rem; color: #b45309; font-weight: 600;">Status pengajuan ini tetap dapat Anda pantau</span>
              </div>
              ${tempDivReassigned.innerHTML}
            </div>
          `;
        }

        containerApproverPendingQueue.innerHTML = queueHtml;
      }
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

    // Sorting Pelacakan (Terbaru / Terlama)
    const sortAppEl = document.getElementById('sortApproverTracking');
    const sortAppOrder = sortAppEl ? sortAppEl.value : 'desc';

    list = [...list];
    list.sort((a, b) => {
      const parseD = (t) => {
        const raw = t.createdAt || t.plannedExit || 0;
        const d = new Date(raw);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };
      const dA = parseD(a);
      const dB = parseD(b);
      return sortAppOrder === 'asc' ? dA - dB : dB - dA;
    });

    if (sortAppEl && !sortAppEl._bound) {
      sortAppEl._bound = true;
      sortAppEl.addEventListener('change', () => {
        renderApproverView();
      });
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

  const modalTicketDetail = document.getElementById('modalTicketDetail');
  if (modalTicketDetail) modalTicketDetail.classList.remove('open');

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

  const modalTicketDetail = document.getElementById('modalTicketDetail');
  if (modalTicketDetail) modalTicketDetail.classList.remove('open');

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

function confirmApproveDecision() {
  const ticketsList = window.ticketsList || [];
  const ticketId = window.currentDecisionTicketId;
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  const approveNoteInput = document.getElementById('approveNoteInput');
  const note = (approveNoteInput && approveNoteInput.value.trim()) || 'Disetujui oleh Atasan langsung.';
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const nowFormatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

  const ACTORS = window.ACTORS || {};
  const isApprover2 = (window.currentActor === 'approver2');
  const approverActor = isApprover2 ? (ACTORS.approver2 || { name: 'Dewi Sartika, S.T., M.M.', title: 'Supervisor Operasional (Plt)' }) : (ACTORS.approver || { name: 'Ir. Hendra Gunawan, M.T.', title: 'Manager Rekayasa & Pemeliharaan' });
  const approverName = approverActor.name;
  const approverTitle = approverActor.title || 'Atasan Peninjau';

  ticket.status = 'Disetujui';
  ticket.emergencyLocked = false;
  ticket.qrLocked = false;
  ticket.approverNote = note;
  ticket.approvedAt = nowFormatted;
  if (!ticket.timeline) ticket.timeline = [];
  ticket.timeline.push(
    {
      event: 'Disetujui Atasan',
      time: nowFormatted,
      by: `${approverName} (${approverTitle})`,
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
  
  const modalApproveDecision = document.getElementById('modalApproveDecision');
  if (modalApproveDecision) modalApproveDecision.classList.remove('open');
  
  const modalTicketDetail = document.getElementById('modalTicketDetail');
  if (modalTicketDetail) modalTicketDetail.classList.remove('open');

  if (typeof window.showToast === 'function') {
    window.showToast(`Tiket #${ticketId} berhasil disetujui oleh ${approverName}! QR Code otomatis terbit untuk karyawan.`, 'success');
  }

  // Immediately update counts and all views
  updateApproverMetrics();
  renderApproverDashboard();
  renderApproverView();
  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
  if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
  if (typeof window.renderSecurityView === 'function') window.renderSecurityView();
  if (typeof window.updateSecurityMetrics === 'function') window.updateSecurityMetrics();
}

function confirmRejectDecision() {
  const rejectReasonInput = document.getElementById('rejectReasonInput');
  const reason = (rejectReasonInput && rejectReasonInput.value.trim()) || 'Pengajuan tidak dapat disetujui saat ini sesuai pertimbangan operasional kerja.';

  const ticketsList = window.ticketsList || [];
  const ticketId = window.currentDecisionTicketId;
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const nowFormatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

  const ACTORS = window.ACTORS || {};
  const isApprover2 = (window.currentActor === 'approver2');
  const approverActor = isApprover2 ? (ACTORS.approver2 || { name: 'Dewi Sartika, S.T., M.M.', title: 'Supervisor Operasional (Plt)' }) : (ACTORS.approver || { name: 'Ir. Hendra Gunawan, M.T.', title: 'Manager Rekayasa & Pemeliharaan' });
  const approverName = approverActor.name;
  const approverTitle = approverActor.title || 'Atasan Peninjau';

  ticket.status = 'Ditolak';
  ticket.emergencyLocked = false;
  ticket.qrLocked = false;
  ticket.approverNote = `Ditolak: ${reason}`;
  ticket.rejectedAt = nowFormatted;
  if (!ticket.timeline) ticket.timeline = [];
  ticket.timeline.push({
    event: 'Ditolak Atasan',
    time: nowFormatted,
    by: `${approverName} (${approverTitle})`,
    desc: `Alasan penolakan: "${reason}"`
  });

  window.saveTickets(ticketsList);

  const modalRejectDecision = document.getElementById('modalRejectDecision');
  if (modalRejectDecision) modalRejectDecision.classList.remove('open');

  const modalTicketDetail = document.getElementById('modalTicketDetail');
  if (modalTicketDetail) modalTicketDetail.classList.remove('open');

  if (typeof window.showToast === 'function') {
    window.showToast(`Tiket #${ticketId} telah ditolak. Alasan tersimpan di riwayat pemohon.`, 'danger');
  }

  // Immediately update counts and all views
  updateApproverMetrics();
  renderApproverDashboard();
  renderApproverView();
  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
  if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
  if (typeof window.renderSecurityView === 'function') window.renderSecurityView();
  if (typeof window.updateSecurityMetrics === 'function') window.updateSecurityMetrics();
}

function quickApproveTicket(ticketId) {
  window.currentDecisionTicketId = ticketId;
  confirmApproveDecision();
}

window.confirmApproveDecision = confirmApproveDecision;
window.confirmRejectDecision = confirmRejectDecision;
window.quickApproveTicket = quickApproveTicket;

function initApproverDecisionListeners() {
  const modalApproveDecision = document.getElementById('modalApproveDecision');
  const btnCloseApproveModal = document.getElementById('btnCloseApproveModal');
  const btnCancelApproveModal = document.getElementById('btnCancelApproveModal');
  const btnConfirmApprove = document.getElementById('btnConfirmApprove');

  const modalRejectDecision = document.getElementById('modalRejectDecision');
  const btnCloseRejectModal = document.getElementById('btnCloseRejectModal');
  const btnCancelRejectModal = document.getElementById('btnCancelRejectModal');
  const btnConfirmReject = document.getElementById('btnConfirmReject');

  const isBound = (el) => el && (el.getAttribute ? el.getAttribute('data-bound') : (el.dataset ? el.dataset.bound : el._bound));
  const setBound = (el) => {
    if (!el) return;
    if (el.setAttribute) el.setAttribute('data-bound', 'true');
    if (el.dataset) el.dataset.bound = 'true';
    el._bound = true;
  };

  if (btnCloseApproveModal && !isBound(btnCloseApproveModal)) {
    setBound(btnCloseApproveModal);
    btnCloseApproveModal.addEventListener('click', () => modalApproveDecision && modalApproveDecision.classList.remove('open'));
  }
  if (btnCancelApproveModal && !isBound(btnCancelApproveModal)) {
    setBound(btnCancelApproveModal);
    btnCancelApproveModal.addEventListener('click', () => modalApproveDecision && modalApproveDecision.classList.remove('open'));
  }
  if (btnConfirmApprove && !isBound(btnConfirmApprove)) {
    setBound(btnConfirmApprove);
    btnConfirmApprove.addEventListener('click', confirmApproveDecision);
  }

  if (btnCloseRejectModal && !isBound(btnCloseRejectModal)) {
    setBound(btnCloseRejectModal);
    btnCloseRejectModal.addEventListener('click', () => modalRejectDecision && modalRejectDecision.classList.remove('open'));
  }
  if (btnCancelRejectModal && !isBound(btnCancelRejectModal)) {
    setBound(btnCancelRejectModal);
    btnCancelRejectModal.addEventListener('click', () => modalRejectDecision && modalRejectDecision.classList.remove('open'));
  }
  if (btnConfirmReject && !isBound(btnConfirmReject)) {
    setBound(btnConfirmReject);
    btnConfirmReject.addEventListener('click', confirmRejectDecision);
  }

  // Reject Extension Modal Elements & Listeners
  const modalRejectExtension = document.getElementById('modalRejectExtension');
  const btnCloseRejectExtModal = document.getElementById('btnCloseRejectExtModal');
  const btnCancelRejectExtModal = document.getElementById('btnCancelRejectExtModal');
  const btnConfirmRejectExt = document.getElementById('btnConfirmRejectExt');
  const rejectExtReasonInput = document.getElementById('rejectExtReasonInput');

  if (btnCloseRejectExtModal && !isBound(btnCloseRejectExtModal)) {
    setBound(btnCloseRejectExtModal);
    btnCloseRejectExtModal.addEventListener('click', () => modalRejectExtension && modalRejectExtension.classList.remove('open'));
  }
  if (btnCancelRejectExtModal && !isBound(btnCancelRejectExtModal)) {
    setBound(btnCancelRejectExtModal);
    btnCancelRejectExtModal.addEventListener('click', () => modalRejectExtension && modalRejectExtension.classList.remove('open'));
  }

  if (btnConfirmRejectExt && !isBound(btnConfirmRejectExt)) {
    setBound(btnConfirmRejectExt);
    btnConfirmRejectExt.addEventListener('click', () => {
      const reason = rejectExtReasonInput ? rejectExtReasonInput.value.trim() : '';
      if (!reason) {
        if (typeof window.showToast === 'function') window.showToast('Alasan penolakan perpanjangan waktu wajib diisi!', 'danger');
        return;
      }
      rejectExtensionRequest(window.currentRejectExtTicketId, reason);
      if (modalRejectExtension) modalRejectExtension.classList.remove('open');
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApproverDecisionListeners);
} else {
  initApproverDecisionListeners();
}

// DECISION FUNCTIONS FOR EXTENSION REQUESTS
function approveExtensionRequest(ticketId) {
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket || !ticket.pendingExtension) return;

  const newReturn = ticket.pendingExtension.newEstimatedReturn;
  const ACTORS = window.ACTORS || {};
  const approverName = ACTORS.approver ? ACTORS.approver.name : 'Ir. Hendra Gunawan, M.T.';
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

  ticket.estimatedReturn = newReturn;
  if (ticket.status === 'Terlambat') {
    ticket.status = 'Sedang di Luar';
  }

  if (!ticket.timeline) ticket.timeline = [];
  ticket.timeline.push({
    event: 'Perpanjangan Waktu Disetujui',
    time: nowFormatted,
    by: `${approverName} (Manager)`,
    desc: `Perpanjangan waktu hingga ${window.formatDisplayDate ? window.formatDisplayDate(newReturn) : newReturn} telah disetujui. Estimasi jam kembali resmi diperbarui.`
  });

  ticket.pendingExtension = null;
  ticket.extensionApproved = true;

  window.saveTickets(ticketsList);
  if (typeof window.showToast === 'function') {
    window.showToast(`Perpanjangan waktu tiket #${ticket.id} berhasil disetujui!`, 'success');
  }
  renderApproverView();
  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
  const modalTicketDetail = document.getElementById('modalTicketDetail');
  if (modalTicketDetail && modalTicketDetail.classList.contains('open')) {
    window.openTicketDetail(ticket.id, 'detail');
  }
}

function openRejectExtensionModal(ticketId) {
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket || !ticket.pendingExtension) return;

  window.currentRejectExtTicketId = ticketId;
  const rejectExtEmployeeName = document.getElementById('rejectExtEmployeeName');
  const rejectExtTicketId = document.getElementById('rejectExtTicketId');
  const rejectExtReasonInput = document.getElementById('rejectExtReasonInput');
  const modalRejectExtension = document.getElementById('modalRejectExtension');

  if (rejectExtEmployeeName) rejectExtEmployeeName.textContent = ticket.applicantName || 'Budi Pratama';
  if (rejectExtTicketId) rejectExtTicketId.textContent = ticket.id;
  if (rejectExtReasonInput) rejectExtReasonInput.value = '';
  if (modalRejectExtension) modalRejectExtension.classList.add('open');
}

function rejectExtensionRequest(ticketId, reason) {
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket || !ticket.pendingExtension) return;

  const rejectReason = reason || 'Karyawan diminta segera kembali sesuai jadwal semula.';
  const ACTORS = window.ACTORS || {};
  const approverName = ACTORS.approver ? ACTORS.approver.name : 'Ir. Hendra Gunawan, M.T.';
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

  if (!ticket.timeline) ticket.timeline = [];
  ticket.timeline.push({
    event: 'Perpanjangan Waktu Ditolak',
    time: nowFormatted,
    by: `${approverName} (Manager)`,
    desc: `Permohonan perpanjangan ditolak: "${rejectReason}". Estimasi kembali tetap mengacu pada jadwal semula.`
  });

  ticket.pendingExtension = null;
  ticket.extensionRejected = true;

  window.saveTickets(ticketsList);
  if (typeof window.showToast === 'function') {
    window.showToast(`Permohonan perpanjangan tiket #${ticket.id} ditolak.`, 'info');
  }
  renderApproverView();
  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
  const modalTicketDetail = document.getElementById('modalTicketDetail');
  if (modalTicketDetail && modalTicketDetail.classList.contains('open')) {
    window.openTicketDetail(ticket.id, 'detail');
  }
}

// FITUR HAPUS DI PELACAKAN KARYAWAN (HAK AKSES ATASAN)
function deleteApproverTicket(ticketId) {
  if (!confirm(`Apakah Anda yakin ingin menghapus catatan permohonan izin #${ticketId} dari pelacakan?`)) {
    return;
  }
  let tickets = window.ticketsList || [];
  const idx = tickets.findIndex(t => t.id === ticketId);
  if (idx !== -1) {
    const deleted = tickets[idx];
    tickets.splice(idx, 1);
    window.ticketsList = tickets;
    if (typeof window.saveTickets === 'function') {
      window.saveTickets(tickets);
    }
    if (typeof window.showToast === 'function') {
      window.showToast(`Catatan izin #${ticketId} (${deleted.applicantName || 'Karyawan'}) berhasil dihapus dari pelacakan.`, 'info');
    }
    renderApproverView();
  }
}

function clearApproverTrackingHistory() {
  let tickets = window.ticketsList || [];
  const finishedTickets = tickets.filter(t => t.status === 'Selesai' || t.status === 'Dibatalkan' || t.status === 'Ditolak' || t.status === 'Kedaluwarsa');
  if (finishedTickets.length === 0) {
    alert('Tidak ada riwayat permohonan selesai atau ditolak untuk dibersihkan.');
    return;
  }
  if (!confirm(`Hapus ${finishedTickets.length} riwayat izin yang sudah selesai/diputuskan dari pelacakan? Permohonan yang sedang aktif/berjalan tidak akan dihapus.`)) {
    return;
  }
  tickets = tickets.filter(t => !(t.status === 'Selesai' || t.status === 'Dibatalkan' || t.status === 'Ditolak' || t.status === 'Kedaluwarsa'));
  window.ticketsList = tickets;
  if (typeof window.saveTickets === 'function') {
    window.saveTickets(tickets);
  }
  if (typeof window.showToast === 'function') {
    window.showToast(`${finishedTickets.length} riwayat permohonan selesai telah dihapus dari pelacakan.`, 'info');
  }
  renderApproverView();
}

// Expose globally
window.updateApproverMetrics = updateApproverMetrics;
window.renderApproverDashboard = renderApproverDashboard;
window.renderApproverCards = renderApproverCards;
window.renderApproverView = renderApproverView;
window.openApproveModal = openApproveModal;
window.openRejectModal = openRejectModal;
window.approveExtensionRequest = approveExtensionRequest;
window.openRejectExtensionModal = openRejectExtensionModal;
window.rejectExtensionRequest = rejectExtensionRequest;
window.deleteApproverTicket = deleteApproverTicket;
window.clearApproverTrackingHistory = clearApproverTrackingHistory;
