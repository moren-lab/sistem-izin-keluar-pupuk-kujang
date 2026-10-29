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

// Cek apakah tiket ini berada di bawah naungan atasan aktif saat ini
// (Karyawan naungan Atasan 1 tetap terpantau meskipun mengajukan izin ke Atasan 2 atau lainnya)
function isTicketUnderMySupervision(ticket) {
  if (!ticket) return false;
  const currentActor = getCurrentApproverActor();
  const aName = (currentActor.name || '').toLowerCase();
  
  // 1. Jika tiket memang ditugaskan langsung ke atasan ini
  if (isTicketAssignedToCurrentApprover(ticket)) return true;

  // 2. Karyawan yang dinaungi Atasan 1 (Ir. Hendra Gunawan, M.T.):
  // - Berdasarkan ticket.directSupervisor
  // - Atau pemohon Budi Pratama (PK-2024-8841) / divisi Rekayasa & Pemeliharaan
  const supervisor = (ticket.directSupervisor || '').toLowerCase();
  if (aName.includes('hendra')) {
    const isUnderHendra = supervisor.includes('hendra') || 
      (!supervisor && (ticket.applicantNip === 'PK-2024-8841' || (ticket.department || '').toLowerCase().includes('rekayasa')));
    if (isUnderHendra) return true;
  }

  // 3. Karyawan yang dinaungi Atasan 2 (Dewi Sartika):
  if (aName.includes('dewi')) {
    if (supervisor.includes('dewi')) return true;
  }

  return false;
}
window.isTicketUnderMySupervision = isTicketUnderMySupervision;

// Cek apakah tiket dihapus khusus oleh atasan yang sedang aktif (riwayat terpisah Atasan 1 & Atasan 2)
function isDeletedByCurrentApprover(ticket) {
  if (!ticket) return false;
  const isApprover2 = (window.currentActor === 'approver2');
  return isApprover2 ? Boolean(ticket.deletedByApprover2) : Boolean(ticket.deletedByApprover1);
}
window.isDeletedByCurrentApprover = isDeletedByCurrentApprover;

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
  const total = ticketsList.filter(t => isTicketAssignedToCurrentApprover(t)).length;

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
  const currentApproverActor = isApprover2 ? (ACTORS.approver2 || { name: 'Dewi Sartika, S.T., M.M.', title: 'Supervisor Operasional Lapangan (Plt. Manager)' }) : (ACTORS.approver || { name: 'Ir. Hendra Gunawan, M.T.', title: 'Manager Rekayasa & Pemeliharaan' });

  if (approverHeroSub) {
    approverHeroSub.innerHTML = `${currentApproverActor.name} — ${currentApproverActor.title} — Prinsip: <strong>No Approval, No Exit</strong>`;
  }
  if (approverProfilePill) {
    approverProfilePill.textContent = `Approver: ${currentApproverActor.name} (${isApprover2 ? 'Atasan 2 / Supervisor' : 'Atasan 1 / Manager'})`;
  }

  const ticketsList = window.ticketsList || [];
  const pendingTickets = ticketsList.filter(t => !t.isEmergency && !(t.id && t.id.startsWith('TK-EMG-')) && t.status === 'Menunggu Persetujuan' && isTicketAssignedToCurrentApprover(t));
  const pendingExtensions = ticketsList.filter(t => t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan' && isTicketAssignedToCurrentApprover(t));
  const outsideTickets = ticketsList.filter(t => !isDeletedByCurrentApprover(t) && (t.status === 'Sedang di Luar' || t.status === 'Terlambat') && isTicketUnderMySupervision(t));

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
            <button type="button" class="btn-card-detail" style="padding: 0.4rem 0.8rem; font-size: 0.775rem;" onclick="setApproverNav('pelacakan')">
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
                    <strong>${emg.applicantName}</strong> (${emg.id}) — Tujuan: <strong>${emg.destination}</strong>
                  </div>
                  <div style="font-size: 0.775rem; color: #9f1239; margin-top: 2px; font-style: normal;">
                    "Alasan Kedaruratan: ${emg.reason}"
                  </div>
                </div>
              </div>
              <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                <button type="button" class="btn-approve" style="padding: 0.5rem 1rem; font-size: 0.8rem; font-weight: 800; background: #059669; box-shadow: 0 2px 8px rgba(5,150,105,0.3);" onclick="window.emergencyDirectApprove('${emg.id}')">
                  ⚡ 1. Setujui Langsung di App
                </button>
                <button type="button" class="btn-reject" style="padding: 0.5rem 0.85rem; font-size: 0.8rem; font-weight: 700; background: #dc2626; color: #fff; border: 1px solid #dc2626; border-radius: 6px; cursor: pointer;" onclick="openRejectModal('${emg.id}')">
                  ✕ Tolak Darurat
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
                <span class="emergency-passcode-display" style="font-family: var(--font-mono); font-size: 1.15rem; font-weight: 800; color: #9f1239; padding: 2px 10px; border-radius: 6px; border: 1px solid #f43f5e; letter-spacing: 2px;">
                  ${emg.emergencyPasscode || '849201'}
                </span>
                <button type="button" class="btn-card-detail" style="padding: 0.25rem 0.6rem; font-size: 0.725rem; border: 1px solid #fda4af;" onclick="navigator.clipboard.writeText('${emg.emergencyPasscode || '849201'}'); if (typeof window.showToast === 'function') window.showToast('Kode Sandi Darurat [${emg.emergencyPasscode || '849201'}] disalin! Berikan ke karyawan via Telp/WA.', 'info');">
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
                ${emg.applicantName} — Tujuan: <strong>${emg.destination}</strong> — Status: <strong>${liveStatusText}</strong> — Otorisasi: <em>${emg.emergencyUnlockMethod || 'Resmi'}</em>
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
            <button class="btn-card-detail" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="openTicketDetail('${extFirst.id}', 'detail')">Detail pengajuan</button>
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
          <div class="feed-item approver-feed-warning" style="flex-direction: column; align-items: stretch; gap: 0.65rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="card-id-num" style="font-size: 0.85rem;">${t.id}</span>
                <span class="tag-badge badge-warning" style="font-weight: 800; font-size: 0.7rem;">⏱️ PERPANJANGAN WAKTU</span>
              </div>
              <span class="tag-badge badge-outside" style="font-weight: 700;">Sedang di Luar</span>
            </div>
            <div style="font-size: 0.825rem; color: var(--text-primary);">
              <strong>${t.applicantName || 'Budi Pratama'}</strong> (${t.applicantNip || 'PK-2024-8841'}) — Tujuan: <strong>${t.destination}</strong>
            </div>
            <div class="approver-detail-callout warning" style="border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.775rem; line-height: 1.45;">
              <div><strong>Estimasi Kembali Semula:</strong> ${t.estimatedReturn ? t.estimatedReturn.replace('T', ' ') : '-'}</div>
              <div><strong>Permohonan Waktu Baru:</strong> <strong class="callout-highlight">${t.pendingExtension.newEstimatedReturn.replace('T', ' ')}</strong></div>
              <div style="margin-top: 2px;"><strong>Alasan:</strong> "${t.pendingExtension.reason}"</div>
            </div>
            <div class="approver-feed-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; padding-top: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <span style="font-size: 0.725rem; color: var(--text-muted);">
                Diajukan: ${t.pendingExtension.requestedAt}
              </span>
              <div style="display: flex; gap: 0.35rem;">
                <button class="btn-card-detail" style="padding: 0.3rem 0.6rem; font-size: 0.725rem;" onclick="openTicketDetail('${t.id}', 'detail')">Detail pengajuan</button>
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
                <span style="font-weight: 700; font-size: 0.75rem; color: ${t.category === 'Dinas Kantor' ? '#059669' : '#d97706'};">${t.category}</span>
              </div>
              ${window.getStatusPill(t.status, t)}
            </div>
            <div style="font-size: 0.825rem; color: var(--text-primary);">
              <strong>${t.applicantName || 'Budi Pratama'}</strong> (${t.applicantNip || 'PK-2024-8841'}) — Tujuan: <strong>${t.destination}</strong>
            </div>
            <div style="font-size: 0.775rem; color: var(--text-secondary); line-height: 1.4; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(t.reason || '').replace(/"/g, '&quot;')}">
              "${t.reason}"
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; padding-top: 0.5rem; border-top: 1px solid #f1f5f9; flex-wrap: wrap; gap: 0.5rem;">
              <span style="font-size: 0.725rem; color: var(--text-muted); font-family: var(--font-mono);">
                Keluar: ${t.plannedExit.replace('T', ' ')}
              </span>
              <div style="display: flex; gap: 0.35rem;">
                <button class="btn-card-detail" style="padding: 0.3rem 0.6rem; font-size: 0.725rem;" onclick="openTicketDetail('${t.id}', 'detail')">Detail pengajuan</button>
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
          <div class="feed-item approver-feed-reassign" style="flex-direction: column; align-items: stretch; gap: 0.65rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span class="card-id-num" style="font-size: 0.85rem;">${t.id}</span>
                <span class="reassign-tag-text">↳ Dialihkan ke ${t.approverName}</span>
              </div>
              <div>${window.getStatusPill(t.status, t)}</div>
            </div>
            <div style="font-size: 0.825rem; color: var(--text-primary);">
              <strong>${t.applicantName || 'Budi Pratama'}</strong> (${t.applicantNip || 'PK-2024-8841'}) — Tujuan: <strong>${t.destination}</strong>
            </div>
            <div class="approver-detail-callout info" style="border-radius: 6px; padding: 0.45rem 0.75rem; font-size: 0.75rem; line-height: 1.45;">
              Pengajuan ini dialihkan oleh pemohon ke <strong>${t.approverName}</strong> pada ${t.reassignedAt || 'hari ini'}. Anda tetap dapat memantau perkembangan statusnya.
            </div>
            <div class="approver-feed-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; padding-top: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <span style="font-size: 0.725rem; color: var(--text-muted); font-family: var(--font-mono);">
                Rencana: ${t.plannedExit ? t.plannedExit.replace('T', ' ') : '-'}
              </span>
              <button class="btn-card-detail" style="padding: 0.3rem 0.65rem; font-size: 0.725rem;" onclick="openTicketDetail('${t.id}', 'detail')">Detail pengajuan</button>
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
                  <span>${t.applicantName} — ${t.destination}</span>
                  ${isEmergency ? '<span style="color:#b91c1c; font-weight:800; font-size:0.75rem;">🚨 DARURAT</span>' : ''}
                </div>
                <div class="feed-item-sub">
                  ${t.id} — Est. Kembali: <span style="font-family: var(--font-mono); font-weight: 700;">${t.estimatedReturn ? t.estimatedReturn.replace('T', ' ') : 'Pulang Hari Ini'}</span>
                  ${t.emergencyContact ? ` — Kontak: <strong style="color: #9f1239;">${t.emergencyContact}</strong>` : ''}
                </div>
              </div>
            </div>
            <div>${window.getStatusPill(t.status, t)}</div>
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
              ${window.getStatusPill(t.status, t)}
            </div>

            <div style="background:var(--bg-subtle); padding:0.6rem 0.85rem; border-radius:6px; display:flex; align-items:center; justify-content:space-between;">
              <div>
                <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary);">${t.applicantName || 'Budi Pratama, S.T.'}</div>
                <div style="font-size:0.725rem; color:var(--text-secondary);">NIP: ${t.applicantNip || 'PK-2024-8841'} — ${t.department || 'Rekayasa Mesin'}</div>
              </div>
              <span style="font-weight: 700; font-size: 0.75rem; color: ${isEmergency ? '#b91c1c' : (isDinas ? '#059669' : '#d97706')};">${isEmergency ? '🚨 ' + t.category : t.category}</span>
            </div>

            ${isTicketReassignedFromCurrentApprover(t) ? `
              <div class="approver-alert-banner reassign-away" style="border-radius: 6px; padding: 0.45rem 0.75rem; font-size: 0.75rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                <span>↳ <strong>Status:</strong> Pengajuan ini dialihkan oleh pemohon ke <strong>${t.approverName}</strong></span>
                <span style="font-size: 0.7rem; opacity: 0.85;">${t.reassignedAt || ''}</span>
              </div>
            ` : (isTicketAssignedToCurrentApprover(t) && t.reassignedFrom ? `
              <div class="approver-alert-banner reassign-to" style="border-radius: 6px; padding: 0.45rem 0.75rem; font-size: 0.75rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                <span>↳ <strong>Status:</strong> Pengajuan ini dialihkan dari <strong>${t.reassignedFrom}</strong> ke Anda</span>
                <span style="font-size: 0.7rem; opacity: 0.85;">${t.reassignedAt || ''}</span>
              </div>
            ` : '')}

            <!-- Detail Box (Tujuan keluar, Keperluan, Rencana waktu) Sesuai Gambar 2 -->
            <div class="figma-card-detail-box" style="display: flex; flex-direction: column; gap: 0.35rem; padding: 0.55rem 0.65rem; background: var(--bg-subtle, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: 6px; margin: 0.4rem 0;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 1.25rem;">
                <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; min-width: 95px; flex-shrink: 0; white-space: nowrap;">Tujuan keluar</span>
                <span class="detail-val" style="font-size: 0.75rem; color: var(--text-primary, #0f172a); font-weight: 600; text-align: right; line-height: 1.35; max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${t.destination}">${t.destination}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 1.25rem;">
                <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; min-width: 95px; flex-shrink: 0; white-space: nowrap;">Keperluan</span>
                <span class="detail-val" style="font-size: 0.75rem; color: var(--text-primary, #0f172a); font-weight: 500; text-align: right; max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.35;" title="${(t.reason || '').replace(/"/g, '&quot;')}">${t.reason || '-'}</span>
              </div>
              <div class="detail-schedule-row" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; padding-top: 0.35rem; border-top: 1px dashed var(--border-color, #e2e8f0);">
                <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; white-space: nowrap;">Rencana waktu</span>
                <div class="detail-schedule-val" style="text-align: right;">${typeof window.formatTicketScheduleWithDay === 'function' ? window.formatTicketScheduleWithDay(t) : `<div class="schedule-time-text">${t.plannedExit.replace('T', ' ')} → ${t.estimatedReturn ? t.estimatedReturn.replace('T', ' ') : 'Pulang'}</div>`}</div>
              </div>
            </div>

            ${t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan' ? `
              <div class="approver-alert-banner extension" style="border-radius: 8px; padding: 0.65rem 0.85rem; font-size: 0.8rem; margin: 0.5rem 0;">
                <div style="font-weight: 800; display: flex; align-items: center; justify-content: space-between;">
                  <span>⏱️ Permohonan Perpanjangan Waktu</span>
                  <span style="font-size:0.75rem; font-weight:700;">Grace Period</span>
                </div>
                <div style="margin-top: 0.35rem; font-size: 0.775rem; line-height: 1.4;">
                  <div><strong>Waktu Baru:</strong> <strong>${t.pendingExtension.newEstimatedReturn.replace('T', ' ')}</strong></div>
                  <div><strong>Alasan:</strong> "${t.pendingExtension.reason}"</div>
                </div>
              </div>
            ` : ''}

            ${isEmergency && (t.status === 'Menunggu Otorisasi Darurat' || t.emergencyLocked) ? `
              <div class="approver-alert-banner emergency" style="border-radius: 8px; padding: 0.75rem 0.95rem; font-size: 0.8rem; margin: 0.65rem 0;">
                <div style="font-weight: 800; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.4rem;">
                  <span>🚨 Hasil Penulisan Form Kedaruratan (K3/Medis)</span>
                  <span style="font-weight: 800; font-size: 0.75rem;">
                    ${t.selectedMethod === 'passcode' ? '🔑 Cara: Sandi / OTP' : (t.selectedMethod === 'facescan' ? '🤳 Cara: Scan Wajah' : '📱 Cara: Persetujuan di App')}
                  </span>
                </div>
                <div style="margin-top: 0.35rem; font-size: 0.75rem; line-height: 1.45;">
                  <strong>Alasan:</strong> "${t.reason}" — <strong>Tujuan:</strong> ${t.destination}
                </div>
                ${t.selectedMethod === 'passcode' ? `
                  <div class="emergency-passcode-box" style="margin-top: 0.5rem; border: 1.5px solid #f43f5e; border-radius: 6px; padding: 0.5rem 0.75rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                      <div style="font-size: 0.7rem; font-weight: 700;">Kode Sandi Otorisasi (Boleh Diberikan ke Karyawan):</div>
                      <div class="emergency-passcode-code-text" style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 900; letter-spacing: 2.5px;">
                        ${t.emergencyPasscode || '849201'}
                      </div>
                    </div>
                    <button type="button" class="btn-card-detail approver-passcode-copy-btn" style="font-size: 0.725rem; padding: 0.35rem 0.7rem;" onclick="navigator.clipboard.writeText('${t.emergencyPasscode || '849201'}'); if (typeof window.showToast === 'function') window.showToast('Kode Sandi Darurat [${t.emergencyPasscode || '849201'}] disalin! Berikan ke karyawan via Telp/WA.', 'info');">
                      📋 Salin Sandi
                    </button>
                  </div>
                ` : (t.selectedMethod === 'facescan' ? `
                  <div style="margin-top: 0.4rem; font-size: 0.75rem;">
                    🤳 Pemohon meminta scan wajah langsung di ponselnya. Atau klik tombol di bawah untuk menyetujui langsung.
                  </div>
                ` : `
                  <div style="margin-top: 0.4rem; font-size: 0.75rem;">
                    📱 Pemohon menunggu persetujuan langsung 1-klik Anda di aplikasi ini.
                  </div>
                `)}
              </div>
            ` : ''}

            ${t.approverNote ? `
              <div style="background:var(--bg-subtle, #f8fafc); border:1px solid var(--border-color); border-radius:6px; padding:0.45rem 0.65rem; font-size:0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="Catatan Keputusan: ${(t.approverNote || '').replace(/"/g, '&quot;')}">
                <strong>Catatan Keputusan:</strong> "${t.approverNote}"
              </div>
            ` : ''}

            ${isTicketReassignedFromCurrentApprover(t) ? `
              <div class="card-actions-bar" style="display: flex; gap: 0.4rem; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 0.6rem; border-top: 1px solid var(--border-color); flex-wrap: nowrap; width: 100%;">
                <button class="btn-card-detail" style="flex: 1; min-width: 0; padding: 0.4rem 0.65rem; font-size: 0.75rem; font-weight: 600; min-height: 34px; justify-content: center; display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" onclick="openTicketDetail('${t.id}', 'detail')" title="Lihat Rincian Lengkap">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                  <span>Detail pengajuan</span>
                </button>
                <span style="font-size:0.72rem; color:#92400e; font-weight:700; white-space: nowrap; padding-left: 0.3rem;">
                  Dialihkan ke ${t.approverName}
                </span>
              </div>
            ` : (
              (!isTrackingView && (isPending || (isEmergency && (t.status === 'Menunggu Otorisasi Darurat' || t.emergencyLocked)) || (t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan'))) ? `
                <!-- Tiered Action Grid: Row 1 Decision (50%-50%), Row 2 Inspection (50%-50%) -->
                <div class="card-actions-bar" style="display: flex; flex-direction: column; gap: 0.45rem; width: 100%; margin-top: auto; padding-top: 0.6rem; border-top: 1px solid var(--border-color);">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; width: 100%;">
                    ${t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan' ? `
                      <button class="btn-reject" style="width: 100%; min-height: 34px; justify-content: center; font-size: 0.75rem; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem;" onclick="openRejectExtensionModal('${t.id}')">
                        ✕ Tolak Perpanjang
                      </button>
                      <button class="btn-approve" style="width: 100%; min-height: 34px; justify-content: center; font-size: 0.75rem; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem;" onclick="approveExtensionRequest('${t.id}')">
                        ✓ Setujui Perpanjang
                      </button>
                    ` : (isEmergency && (t.status === 'Menunggu Otorisasi Darurat' || t.emergencyLocked) ? `
                      <button class="btn-reject" style="width: 100%; min-height: 34px; justify-content: center; font-size: 0.75rem; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem;" onclick="openRejectModal('${t.id}')">
                        ✕ Tolak Darurat
                      </button>
                      <button class="btn-approve" style="width: 100%; min-height: 34px; justify-content: center; font-size: 0.75rem; font-weight: 800; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem; background: #059669;" onclick="window.emergencyDirectApprove('${t.id}')">
                        ✓ Buka Kunci
                      </button>
                    ` : `
                      <button class="btn-reject" style="width: 100%; min-height: 34px; justify-content: center; font-size: 0.775rem; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.35rem;" onclick="openRejectModal('${t.id}')">
                        ✕ Tolak
                      </button>
                      <button class="btn-approve" style="width: 100%; min-height: 34px; justify-content: center; font-size: 0.775rem; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.35rem;" onclick="openApproveModal('${t.id}')">
                        ✓ Setujui
                      </button>
                    `)}
                  </div>
                  <button class="btn-card-detail" style="width: 100%; padding: 0.4rem 0.5rem; font-size: 0.75rem; font-weight: 600; min-height: 34px; justify-content: center; display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 6px;" onclick="openTicketDetail('${t.id}', 'detail')" title="Lihat Rincian Lengkap">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    <span>Detail pengajuan</span>
                  </button>
                </div>
              ` : `
                <!-- Single Balanced Row for Decided Tickets -->
                <div class="card-actions-bar" style="display: flex; gap: 0.4rem; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 0.6rem; border-top: 1px solid var(--border-color); flex-wrap: nowrap; width: 100%;">
                  <button class="btn-card-detail" style="flex: 1; min-width: 0; padding: 0.4rem 0.65rem; font-size: 0.75rem; font-weight: 600; min-height: 34px; justify-content: center; display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" onclick="openTicketDetail('${t.id}', 'detail')" title="Lihat Rincian Lengkap">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    <span>Detail pengajuan</span>
                  </button>
                  ${(t.status === 'Selesai' || t.status === 'Dibatalkan' || t.status === 'Ditolak' || t.status === 'Kedaluwarsa') ? `
                    <button type="button" class="btn-figma-delete-single" style="background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.35); color: #ef4444; font-size: 0.725rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.4rem 0.6rem; border-radius: 6px; min-height: 34px; white-space: nowrap; flex-shrink: 0; transition: all 0.15s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.15)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.06)'" onclick="event.stopPropagation(); window.deleteApproverTicket('${t.id}')" title="Hapus dari Pelacakan #${t.id}">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                     
                    </button>
                  ` : `
                    <span style="font-size:0.72rem; color:var(--text-muted); font-weight:600; white-space: nowrap; padding-left: 0.3rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Diputuskan
                    </span>
                  `}
                </div>
              `
            )}
          </div>
        `;
  }).join('')}
    </div>
  `;
}

window.currentApproverViewMode = window.currentApproverViewMode || 'card';

/**
 * Render Figma List / Table untuk Pelacakan Izin Karyawan di Atasan
 */
function renderApproverTable(list, containerElement) {
  const target = containerElement || document.getElementById('containerApproverRequests');
  if (!target) return;

  target.innerHTML = `
    <div class="figma-table-card" style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
      <table class="figma-table" style="min-width: 980px;">
        <thead>
          <tr>
            <th style="min-width: 160px;">Nomor Tiket & Kategori</th>
            <th style="min-width: 180px;">Pemohon & Departemen</th>
            <th style="min-width: 200px;">Tujuan & Keperluan</th>
            <th style="white-space: nowrap; min-width: 140px;">Rencana Waktu</th>
            <th style="white-space: nowrap; min-width: 95px;">Status</th>
            <th style="min-width: 180px;">Catatan Keputusan</th>
            <th style="text-align: right; white-space: nowrap; min-width: 100px;">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(t => {
            const statusHtml = typeof window.getCleanEmpStatus === 'function' ? window.getCleanEmpStatus(t.status, t) : window.getStatusPill(t.status, t);
            const scheduleWithDay = typeof window.formatTicketScheduleWithDay === 'function'
              ? window.formatTicketScheduleWithDay(t)
              : `<div style="font-weight: 600; color: var(--text-primary); font-size: 0.775rem; white-space: nowrap;">${(t.plannedExit || '').slice(0, 10)}</div><div style="font-size: 0.75rem; color: var(--text-secondary); font-family: var(--font-mono); margin-top: 2px; white-space: nowrap;">${(t.plannedExit || '').slice(11, 16)} WIB</div>`;

            let catatanHtml = `<span style="color: var(--text-muted); font-size: 0.75rem;">-</span>`;
            if (t.approverNote) {
              catatanHtml = `<span style="color: var(--text-primary); font-size: 0.75rem; font-style: normal;" title="${(t.approverNote || '').replace(/"/g, '&quot;')}">"${t.approverNote}"</span>`;
            } else if (t.rejectionReason) {
              catatanHtml = `<span style="color: #ef4444; font-size: 0.75rem;" title="${(t.rejectionReason || '').replace(/"/g, '&quot;')}">${t.rejectionReason}</span>`;
            } else if (t.reassignedTo) {
              catatanHtml = `<span style="color: #f59e0b; font-size: 0.725rem;">Dialihkan ke ${t.reassignedTo}</span>`;
            }

            const canDelete = t.status === 'Selesai' || t.status === 'Dibatalkan' || t.status === 'Ditolak' || t.status === 'Kedaluwarsa';
            let tindakanHtml = `
              <a href="#" class="figma-card-link" style="font-size: 0.775rem;" onclick="event.stopPropagation(); window.openTicketDetail('${t.id}', 'detail'); return false;">Detail pengajuan</a>
              ${canDelete ? `
                <button type="button" style="background: none; border: none; color: #ef4444; font-size: 0.75rem; font-weight: 600; cursor: pointer; margin-left: 0.65rem; display: inline-flex; align-items: center; gap: 0.2rem;" onclick="event.stopPropagation(); window.deleteApproverTicket('${t.id}')" title="Hapus dari Pelacakan #${t.id}">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  Hapus
                </button>
              ` : ''}
            `;

            return `
              <tr>
                <td style="vertical-align: middle;">
                  <div style="font-weight: 700; font-family: var(--font-mono); color: var(--text-primary); font-size: 0.8rem; white-space: nowrap;">${t.id}</div>
                  <div style="font-size: 0.725rem; color: var(--text-muted); margin-top: 2px;">${t.category} — ${t.type}</div>
                </td>
                <td style="vertical-align: middle;">
                  <div style="font-weight: 600; color: var(--text-primary); font-size: 0.8rem; line-height: 1.35;">${t.applicantName || 'Budi Pratama'}</div>
                  <div style="font-size: 0.725rem; color: var(--text-muted); margin-top: 2px;">NIP: ${t.applicantNip || 'PK-2024-8841'} — ${t.department || '-'}</div>
                </td>
                <td style="vertical-align: middle;">
                  <div style="font-weight: 600; color: var(--text-primary); font-size: 0.8rem; line-height: 1.35;">${t.destination}</div>
                  <div style="font-size: 0.725rem; color: var(--text-muted); margin-top: 3px; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(t.reason || '').replace(/"/g, '&quot;')}">${t.reason || '-'}</div>
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

    // 3. Pengajuan bawahan naungan atasan aktif yang saat diajukan, karyawan memilih atasan lain
    const supervisedOtherList = ticketsList.filter(t =>
      t.status !== 'Dibatalkan' &&
      t.status !== 'Ditolak' &&
      t.status !== 'Selesai' &&
      !isTicketAssignedToCurrentApprover(t) &&
      !isTicketReassignedFromCurrentApprover(t) &&
      isTicketUnderMySupervision(t) &&
      (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat')
    );

    if (pendingList.length === 0 && reassignedAwayList.length === 0 && supervisedOtherList.length === 0) {
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
            <div style="padding: 1.5rem; text-align: center; color: var(--text-secondary); font-size: 0.85rem; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
              Tidak ada antrean persetujuan baru yang ditujukan ke Anda saat ini.
            </div>
          `;
        }

        if (reassignedAwayList.length > 0) {
          const tempDivReassigned = document.createElement('div');
          renderApproverCards(reassignedAwayList, tempDivReassigned, true);
          queueHtml += `
            <div class="approver-reassigned-section">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <h4 class="approver-reassigned-heading">
                  <span>↳ Pengajuan Dialihkan ke Atasan Lain</span>
                  <span class="approver-reassigned-badge">${reassignedAwayList.length}</span>
                </h4>
                <span class="approver-reassigned-sub">Status pengajuan ini tetap dapat Anda pantau</span>
              </div>
              ${tempDivReassigned.innerHTML}
            </div>
          `;
        }

        if (supervisedOtherList.length > 0) {
          queueHtml += `
            <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 2px dashed #cbd5e1;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem;">
                <div style="font-size: 0.9rem; font-weight: 800; color: #0369a1; display: inline-flex; align-items: center; gap: 6px;">
                  <span>👥 Pengajuan Karyawan Naungan Anda (Menunggu Persetujuan Atasan Lain)</span>
                </div>
                <span style="font-size: 0.725rem; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 99px;">${supervisedOtherList.length} Pengajuan</span>
              </div>
              <div style="font-size: 0.775rem; color: #64748b; margin-bottom: 0.75rem;">
                Karyawan di bawah naungan divisi Anda mengajukan izin ke pejabat atasan lain. Anda tetap dapat memantau perkembangan statusnya secara real-time.
              </div>
          `;
          const tempDivSup = document.createElement('div');
          renderApproverCards(supervisedOtherList, tempDivSup);
          queueHtml += tempDivSup.innerHTML + `</div>`;
        }

        containerApproverPendingQueue.innerHTML = queueHtml;
      }
    }
    return;
  }

  // 3. PELACAKAN IZIN KARYAWAN
  if (currentApproverNav === 'pelacakan') {
    let list = ticketsList.filter(t => 
      !isDeletedByCurrentApprover(t) && 
      isTicketUnderMySupervision(t) &&
      t.status !== 'Menunggu Persetujuan' &&
      t.status !== 'Menunggu Otorisasi Darurat'
    );

    // Filter Pencarian (Cari tiket, alasan, tujuan, pemohon, NIP, departemen)
    const searchAppInput = document.getElementById('searchApproverInput');
    const searchVal = searchAppInput ? searchAppInput.value.trim().toLowerCase() : '';
    if (searchVal) {
      const matcher = typeof window.matchSearchTokens === 'function' ? window.matchSearchTokens : (typeof matchSearchTokens === 'function' ? matchSearchTokens : null);
      if (matcher) {
        list = list.filter(t => matcher(searchVal, t.id, t.applicantName, t.applicantNip, t.destination, t.reason, t.department, t.approverName, t.category, t.type));
      } else {
        list = list.filter(t => 
          (t.id && t.id.toLowerCase().includes(searchVal)) ||
          (t.applicantName && t.applicantName.toLowerCase().includes(searchVal)) ||
          (t.applicantNip && t.applicantNip.toLowerCase().includes(searchVal)) ||
          (t.destination && t.destination.toLowerCase().includes(searchVal)) ||
          (t.reason && t.reason.toLowerCase().includes(searchVal)) ||
          (t.department && t.department.toLowerCase().includes(searchVal))
        );
      }
    }

    // Filter Periode Tanggal
    const filterAppPeriod = document.getElementById('filterApproverPeriod');
    const period = filterAppPeriod ? filterAppPeriod.value : 'all';
    if (period !== 'all' && typeof window.matchesPeriodFilter === 'function') {
      list = list.filter(t => window.matchesPeriodFilter(t, period));
    }

    // Filter Kategori
    const filterAppCat = document.getElementById('filterApproverCategory');
    const catVal = filterAppCat ? filterAppCat.value : 'all';
    if (catVal !== 'all') {
      list = list.filter(t => t.category === catVal);
    }

    // Filter Tipe Izin
    const filterAppType = document.getElementById('filterApproverType');
    const typeVal = filterAppType ? filterAppType.value : 'all';
    if (typeVal !== 'all') {
      list = list.filter(t => t.type === typeVal);
    }

    // Filter Status
    const filterAppStatus = document.getElementById('filterApproverStatus');
    const statusVal = filterAppStatus ? filterAppStatus.value : 'all';
    if (statusVal === 'emergency') {
      list = list.filter(t => t.isEmergency || (t.id && t.id.startsWith('TK-EMG')));
    } else if (statusVal === 'outside') {
      list = list.filter(t => t.status === 'Sedang di Luar' || t.status === 'Terlambat');
    } else if (statusVal !== 'all') {
      list = list.filter(t => t.status === statusVal);
    }

    // Sorting Pelacakan (Terbaru / Terlama)
    const sortAppEl = document.getElementById('sortApproverTracking');
    const sortAppOrder = sortAppEl ? sortAppEl.value : 'desc';

    list = [...list];
    list.sort((a, b) => {
      const parseD = (t) => {
        const raw = t.createdAt || t.plannedExit || 0;
        const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
        return (d && !isNaN(d.getTime())) ? d.getTime() : 0;
      };
      const dA = parseD(a);
      const dB = parseD(b);
      return sortAppOrder === 'asc' ? dA - dB : dB - dA;
    });

    // Sinkronisasi status aktif tombol toggle Card vs List
    const btnApproverViewCard = document.getElementById('btnApproverViewCard');
    const btnApproverViewTable = document.getElementById('btnApproverViewTable');
    if (btnApproverViewCard && btnApproverViewTable) {
      btnApproverViewCard.classList.toggle('active', window.currentApproverViewMode !== 'table');
      btnApproverViewTable.classList.toggle('active', window.currentApproverViewMode === 'table');
    }

    if (list.length === 0) {
      if (containerApproverRequests) containerApproverRequests.innerHTML = '';
      if (emptyApproverBox) emptyApproverBox.style.display = 'flex';
      return;
    }

    if (emptyApproverBox) emptyApproverBox.style.display = 'none';
    if (window.currentApproverViewMode === 'table') {
      renderApproverTable(list, containerApproverRequests);
    } else {
      renderApproverCards(list, containerApproverRequests, true);
    }
    return;
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
  const approverActor = isApprover2 ? (ACTORS.approver2 || { name: 'Dewi Sartika, S.T., M.M.', title: 'Supervisor Operasional Lapangan (Plt. Manager)' }) : (ACTORS.approver || { name: 'Ir. Hendra Gunawan, M.T.', title: 'Manager Rekayasa & Pemeliharaan' });
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

  if (typeof window.createNotification === 'function') {
    window.createNotification({
      recipientRole: 'karyawan',
      recipientNip: ticket.applicantNip || 'PK-2024-8841',
      recipientName: ticket.applicantName || 'Budi Pratama, S.T.',
      actorSource: 'approver',
      type: 'disetujui',
      title: 'Pengajuan Disetujui',
      message: `Pengajuan izin Anda (#${ticket.id}) telah disetujui oleh ${approverName}. QR Code resmi siap digunakan.`,
      ticketId: ticket.id,
      priority: 'normal',
      eventId: `approved_${ticket.id}`
    });
    window.createNotification({
      recipientRole: 'security',
      actorSource: 'approver',
      type: 'security_siap_keluar',
      title: 'Tiket Disetujui - Siap Keluar',
      message: `Tiket #${ticket.id} (${ticket.applicantName} - ${ticket.category}) telah disetujui dan siap dipindai keluar di gerbang.`,
      ticketId: ticket.id,
      priority: 'normal',
      eventId: `ready_sec_${ticket.id}`
    });
  }
  
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
  const reason = (rejectReasonInput && rejectReasonInput.value.trim()) || '';

  if (!reason || reason.length < 5) {
    if (typeof window.showToast === 'function') {
      window.showToast('Alasan penolakan wajib diisi (minimal 5 karakter)!', 'danger');
    }
    return;
  }

  const ticketsList = window.ticketsList || [];
  const ticketId = window.currentDecisionTicketId;
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const nowFormatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

  const ACTORS = window.ACTORS || {};
  const isApprover2 = (window.currentActor === 'approver2');
  const approverActor = isApprover2 ? (ACTORS.approver2 || { name: 'Dewi Sartika, S.T., M.M.', title: 'Supervisor Operasional Lapangan (Plt. Manager)' }) : (ACTORS.approver || { name: 'Ir. Hendra Gunawan, M.T.', title: 'Manager Rekayasa & Pemeliharaan' });
  const approverName = approverActor.name;
  const approverTitle = approverActor.title || 'Atasan Peninjau';

  ticket.status = 'Ditolak';
  ticket.emergencyLocked = true;
  ticket.qrLocked = true;
  ticket.rejectionReason = reason;
  ticket.rejectReason = reason;
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

  if (typeof window.createNotification === 'function') {
    window.createNotification({
      recipientRole: 'karyawan',
      recipientNip: ticket.applicantNip || 'PK-2024-8841',
      recipientName: ticket.applicantName || 'Budi Pratama, S.T.',
      actorSource: 'approver',
      type: 'ditolak',
      title: 'Pengajuan Ditolak',
      message: `Pengajuan izin Anda (#${ticket.id}) ditolak oleh ${approverName}. Alasan: "${reason}".`,
      ticketId: ticket.id,
      priority: 'normal',
      eventId: `rejected_${ticket.id}`
    });
  }

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

  let newReturn = ticket.pendingExtension.newEstimatedReturn;
  if (typeof window.normalizeReturnDateTime === 'function') {
    newReturn = window.normalizeReturnDateTime(newReturn);
  } else if (newReturn && (newReturn.match(/\d{4}-\d{2}-\d{2}/g) || []).length > 1) {
    const lastIdx = newReturn.lastIndexOf('20');
    if (lastIdx > 0) newReturn = newReturn.slice(lastIdx);
  }
  const ACTORS = window.ACTORS || {};
  const approverName = ACTORS.approver ? ACTORS.approver.name : 'Ir. Hendra Gunawan, M.T.';
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

  ticket.estimatedReturn = newReturn;
  ticket.plannedReturn = newReturn;
  ticket.hasExtensionPending = false;
  if (ticket.status === 'Terlambat') {
    ticket.status = 'Sedang di Luar';
  }

  if (!ticket.timeline) ticket.timeline = [];
  if (typeof window.createNotification === 'function') {
    window.createNotification({
      recipientRole: 'karyawan',
      recipientNip: ticket.applicantNip || 'PK-2024-8841',
      recipientName: ticket.applicantName || 'Budi Pratama, S.T.',
      actorSource: 'approver',
      type: 'perpanjangan_disetujui',
      title: 'Perpanjangan Waktu Disetujui',
      message: `Permohonan perpanjangan waktu untuk tiket #${ticket.id} telah disetujui.`,
      ticketId: ticket.id,
      priority: 'normal',
      eventId: `ext_appr_${ticket.id}_${ticket.pendingExtension ? ticket.pendingExtension.newEstimatedReturn : ''}`
    });
  }

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
  if (typeof window.createNotification === 'function') {
    window.createNotification({
      recipientRole: 'karyawan',
      recipientNip: ticket.applicantNip || 'PK-2024-8841',
      recipientName: ticket.applicantName || 'Budi Pratama, S.T.',
      actorSource: 'approver',
      type: 'perpanjangan_ditolak',
      title: 'Perpanjangan Waktu Ditolak',
      message: `Permohonan perpanjangan waktu untuk tiket #${ticket.id} ditolak. Alasan: "${reason}".`,
      ticketId: ticket.id,
      priority: 'normal',
      eventId: `ext_rej_${ticket.id}`
    });
  }

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

// FITUR HAPUS DI PELACAKAN KARYAWAN (HAK AKSES ATASAN - TERPISAH ATASAN 1 & ATASAN 2)
function deleteApproverTicket(ticketId) {
  const handler = () => {
    let tickets = window.ticketsList || [];
    const target = tickets.find(t => t.id === ticketId);
    if (target) {
      const isApprover2 = (window.currentActor === 'approver2');
      if (isApprover2) {
        target.deletedByApprover2 = true;
      } else {
        target.deletedByApprover1 = true;
      }
      if (typeof window.saveTickets === 'function') {
        window.saveTickets(tickets);
      }
      if (typeof window.showToast === 'function') {
        const who = isApprover2 ? 'Atasan 2 (Dewi Sartika)' : 'Atasan 1 (Ir. Hendra Gunawan)';
        window.showToast(`Catatan izin #${ticketId} berhasil dihapus dari riwayat ${who}.`, 'info');
      }
      renderApproverView();
    }
  };

  if (typeof window.openDeleteConfirmModal === 'function') {
    window.openDeleteConfirmModal({
      title: 'Hapus dari Pelacakan',
      message: 'Apakah Anda yakin ingin menghapus pengajuan ini dari riwayat? Tindakan ini tidak dapat dibatalkan.',
      onConfirm: handler
    });
  } else if (confirm('Apakah Anda yakin ingin menghapus pengajuan ini dari riwayat? Tindakan ini tidak dapat dibatalkan.')) {
    handler();
  }
}

function clearApproverTrackingHistory() {
  let tickets = window.ticketsList || [];
  const isApprover2 = (window.currentActor === 'approver2');
  const finishedTickets = tickets.filter(t => !isDeletedByCurrentApprover(t) && isTicketUnderMySupervision(t) && (t.status === 'Selesai' || t.status === 'Dibatalkan' || t.status === 'Ditolak' || t.status === 'Kedaluwarsa'));
  if (finishedTickets.length === 0) {
    if (typeof window.showToast === 'function') {
      window.showToast('Tidak ada riwayat permohonan selesai atau ditolak untuk dibersihkan.', 'warning');
    } else {
      alert('Tidak ada riwayat permohonan selesai atau ditolak untuk dibersihkan.');
    }
    return;
  }

  const handler = () => {
    finishedTickets.forEach(t => {
      t.deletedByApprover = true;
    });
    if (typeof window.saveTickets === 'function') {
      window.saveTickets(tickets);
    }
    if (typeof window.showToast === 'function') {
      window.showToast(`${finishedTickets.length} riwayat permohonan selesai telah dihapus dari pelacakan Atasan.`, 'info');
    }
    renderApproverView();
  };

  if (typeof window.openDeleteConfirmModal === 'function') {
    window.openDeleteConfirmModal({
      title: 'Hapus Riwayat Selesai',
      message: `Hapus <strong>${finishedTickets.length}</strong> riwayat izin yang sudah selesai/diputuskan dari pelacakan Atasan? Permohonan yang sedang aktif/berjalan tidak akan dihapus.`,
      onConfirm: handler
    });
  } else if (confirm(`Hapus ${finishedTickets.length} riwayat izin yang sudah selesai/diputuskan dari pelacakan? Permohonan yang sedang aktif/berjalan tidak akan dihapus.`)) {
    handler();
  }
}

// Expose globally
window.updateApproverMetrics = updateApproverMetrics;
window.renderApproverDashboard = renderApproverDashboard;
window.renderApproverCards = renderApproverCards;
window.renderApproverTable = renderApproverTable;
window.renderApproverView = renderApproverView;
window.openApproveModal = openApproveModal;
window.openRejectModal = openRejectModal;
window.approveExtensionRequest = approveExtensionRequest;
window.openRejectExtensionModal = openRejectExtensionModal;
window.rejectExtensionRequest = rejectExtensionRequest;
window.deleteApproverTicket = deleteApproverTicket;
window.clearApproverTrackingHistory = clearApproverTrackingHistory;

// Wire Filter and View Switcher listeners for Approver Pelacakan
document.addEventListener('DOMContentLoaded', () => {
  const btnApproverViewCard = document.getElementById('btnApproverViewCard');
  const btnApproverViewTable = document.getElementById('btnApproverViewTable');

  if (btnApproverViewCard) {
    btnApproverViewCard.addEventListener('click', () => {
      window.currentApproverViewMode = 'card';
      btnApproverViewCard.classList.add('active');
      if (btnApproverViewTable) btnApproverViewTable.classList.remove('active');
      renderApproverView();
    });
  }

  if (btnApproverViewTable) {
    btnApproverViewTable.addEventListener('click', () => {
      window.currentApproverViewMode = 'table';
      btnApproverViewTable.classList.add('active');
      if (btnApproverViewCard) btnApproverViewCard.classList.remove('active');
      renderApproverView();
    });
  }

  const searchApproverInput = document.getElementById('searchApproverInput');
  const filterApproverPeriod = document.getElementById('filterApproverPeriod');
  const sortApproverTracking = document.getElementById('sortApproverTracking');
  const filterApproverCategory = document.getElementById('filterApproverCategory');
  const filterApproverType = document.getElementById('filterApproverType');
  const filterApproverStatus = document.getElementById('filterApproverStatus');

  [searchApproverInput, filterApproverPeriod, sortApproverTracking, filterApproverCategory, filterApproverType, filterApproverStatus].forEach(el => {
    if (el) {
      el.addEventListener('input', () => renderApproverView());
      el.addEventListener('change', () => renderApproverView());
    }
  });
});
