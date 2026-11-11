/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Approver (Atasan) Module: Dashboard, Antrian Persetujuan, Pelacakan Izin, Approve & Reject Decision Flow
 */

function cleanPersonName(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/^(ir\.|drs\.|dra\.|dr\.|sertu|kopda|praka|kopral)\s*/gi, '')
    .replace(/,\s*(s\.t\.|m\.t\.|m\.m\.|s\.tr\.|s\.tr\.t\.|s\.si\.|s\.e\.|s\.kom\.|a\.md\.)/gi, '')
    .trim();
}

function getCurrentApproverActor() {
  if (window.activeApproverUser && (window.currentActor === 'approver' || window.currentActor === 'approver2')) {
    return window.activeApproverUser;
  }
  try {
    const savedApprNip = localStorage.getItem('KUJANG_ACTIVE_APPR_NIP');
    if (savedApprNip) {
      const users = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
      const found = users.find(u => u.nip === savedApprNip);
      if (found) {
        window.activeApproverUser = found;
        return found;
      }
    }
  } catch(e) {}
  const ACTORS = window.ACTORS || {};
  const isApprover2 = (window.currentActor === 'approver2');
  return isApprover2 
    ? (ACTORS.approver2 || { name: 'Dewi Sartika, S.T., M.M.', title: 'Supervisor Operasional Lapangan (Plt. Manager)', nip: 'PK-2012-0845' })
    : (ACTORS.approver || { name: 'Ir. Hendra Gunawan, M.T.', title: 'Manager Rekayasa & Pemeliharaan', nip: 'PK-2015-1002' });
}

function isTicketAssignedToCurrentApprover(ticket) {
  if (!ticket) return false;
  const currentActor = getCurrentApproverActor();
  const aName = (currentActor.name || '').trim();
  const aNip = (currentActor.nip || '').trim();
  const cActorName = cleanPersonName(aName);

  // Jika tiket telah dialihkan/dilimpahkan persetujuannya (reassignedTo):
  // HANYA atasan yang dituju pelimpahan (reassignedTo) yang berhak menyetujui di Antrian Persetujuan.
  // Atasan langsung pemohon TIDAK BISA memutuskan izin jika sudah dialihkan, melainkan hanya memantau status di menu Pelacakan.
  if (ticket.reassignedTo) {
    if (ticket.reassignedToNip && aNip && ticket.reassignedToNip === aNip) return true;
    const cReassignedTo = cleanPersonName(ticket.reassignedTo);
    if (cReassignedTo && cActorName && (cReassignedTo === cActorName || cReassignedTo.includes(cActorName) || cActorName.includes(cReassignedTo))) {
      return true;
    }
    return false;
  }

  // Jika tidak dialihkan, cek apakah tiket ditujukan ke Atasan ini:
  // 1. Direct NIP match (Paling presisi & terisolasi singular)
  if (ticket.approverNip && aNip) {
    return ticket.approverNip === aNip;
  }

  // 2. Direct name match (hanya untuk tiket legacy tanpa approverNip)
  const cTargetApprover = cleanPersonName(ticket.approverName);
  if (cTargetApprover && cActorName) {
    if (cTargetApprover === cActorName || cTargetApprover.includes(cActorName) || cActorName.includes(cTargetApprover)) {
      return true;
    }
  }

  // Akun terisolasi presisi: tidak ada fallback lintas akun (misal Ahmad Subagja tidak boleh masuk ke Dewi Sartika)
  return false;
}

function isTicketReassignedFromCurrentApprover(ticket) {
  if (!ticket) return false;
  const currentActor = getCurrentApproverActor();
  const aName = (currentActor.name || '').trim();
  const aNip = (currentActor.nip || '').trim();
  const cActorName = cleanPersonName(aName);
  const cFromName = cleanPersonName(ticket.reassignedFrom);

  // 1. Jika tiket memiliki catatan pengalihan resmi (reassignedFrom)
  if (ticket.reassignedFrom) {
    if (ticket.reassignedFromNip && aNip && ticket.reassignedFromNip === aNip) return true;
    if (cFromName && cActorName && (cFromName === cActorName || cFromName.includes(cActorName) || cActorName.includes(cFromName))) {
      return true;
    }
  }

  // 2. Jika tiket diajukan oleh bawahan langsung, tetapi pemohon memilih atasan lain (dialihkan sejak awal):
  if (!isTicketAssignedToCurrentApprover(ticket)) {
    if (ticket.directSupervisorNip && aNip && ticket.directSupervisorNip === aNip) return true;
    const cDirectSup = cleanPersonName(ticket.directSupervisor);
    if (cDirectSup && cActorName && (cDirectSup === cActorName || cDirectSup.includes(cActorName) || cActorName.includes(cDirectSup))) {
      return true;
    }
  }

  return false;
}

// Helper check: apakah anggota rombongan dinas merupakan bawahan atasan aktif saat ini
function isMemberMySubordinate(m, aNip, cActorName) {
  if (!m || m.status === 'batal') return false;
  if (m.supervisorNip && aNip && m.supervisorNip === aNip) return true;
  if (m.supervisor) {
    const cSup = cleanPersonName(m.supervisor);
    if (cSup && cActorName && (cSup === cActorName || cSup.includes(cActorName) || cActorName.includes(cSup))) return true;
  }
  const allUsers = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
  const u = allUsers.find(x => x.nip === m.nip);
  if (u) {
    if (u.directSupervisorNip && aNip && u.directSupervisorNip === aNip) return true;
    const uSup = cleanPersonName(u.directSupervisor || u.supervisor || '');
    if (uSup && cActorName && (uSup === cActorName || uSup.includes(cActorName) || cActorName.includes(uSup))) return true;
  }
  return false;
}
window.isMemberMySubordinate = isMemberMySubordinate;

// Cek apakah tiket ini berada di bawah naungan atasan aktif saat ini (Menu Pelacakan & Riwayat)
// Setiap akun tunggal terisolasi presisi: Atasan Langsung HANYA bisa memantau status bawahannya
function isTicketUnderMySupervision(ticket) {
  if (!ticket) return false;
  const currentActor = getCurrentApproverActor();
  const aName = (currentActor.name || '').trim();
  const aNip = (currentActor.nip || '').trim();
  const cActorName = cleanPersonName(aName);

  // 1. Jika tiket memang ditugaskan langsung untuk diputuskan atasan ini
  if (isTicketAssignedToCurrentApprover(ticket)) return true;

  // 2. Karyawan bawahan langsung berdasarkan ticket.directSupervisor
  // Jika dialihkan ke atasan lain, Atasan Langsung tetap berhak memantau perjalanan status bawahannya di Pelacakan/Riwayat
  if (ticket.directSupervisorNip && aNip && ticket.directSupervisorNip === aNip) {
    return true;
  }
  const cSupervisor = cleanPersonName(ticket.directSupervisor);
  if (cSupervisor && cActorName && (cSupervisor === cActorName || cSupervisor.includes(cActorName) || cActorName.includes(cSupervisor))) {
    return true;
  }

  // 3. Jika permohonan pernah dialihkan dari atasan ini
  if (isTicketReassignedFromCurrentApprover(ticket)) {
    return true;
  }

  // 4. Jika salah satu anggota rombongan dinas aktif adalah bawahan langsung atasan ini (Tembusan Pengawasan)
  if (ticket.isGroupDinas && Array.isArray(ticket.members) && ticket.members.length > 0) {
    const hasMySubordinateMember = ticket.members.some(m => isMemberMySubordinate(m, aNip, cActorName));
    if (hasMySubordinateMember) return true;
  }

  return false;
}
window.isTicketUnderMySupervision = isTicketUnderMySupervision;

// Cek apakah tiket dihapus khusus oleh atasan yang sedang aktif (riwayat terpisah dinamis per NIP atasan)
function isDeletedByCurrentApprover(ticket) {
  if (!ticket) return false;
  const currentApprover = (typeof getCurrentApproverActor === 'function') ? getCurrentApproverActor() : null;
  const nip = currentApprover ? currentApprover.nip : null;
  if (nip && Array.isArray(ticket.deletedByApproverNips)) {
    if (ticket.deletedByApproverNips.includes(nip)) return true;
  }
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
    (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat' || t.status === 'Menunggu Verifikasi Atasan') &&
    isTicketAssignedToCurrentApprover(t)
  ).length;

  const pendingExtensions = ticketsList.filter(t => 
    t.pendingExtension && 
    t.pendingExtension.status === 'Menunggu Persetujuan' &&
    t.status !== 'Menunggu Verifikasi Atasan' &&
    isTicketAssignedToCurrentApprover(t)
  ).length;

  // Tiket bawahan langsung yang dialihkan ke atasan lain
  const reassignedAwayCount = ticketsList.filter(t =>
    t.status !== 'Dibatalkan' &&
    t.status !== 'Ditolak' &&
    t.status !== 'Selesai' &&
    isTicketReassignedFromCurrentApprover(t) &&
    (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat')
  ).length;

  const aNip = (currentApprover.nip || '').trim();
  const cActorName = cleanPersonName(currentApprover.name || '');

  // Tiket dinas kantor bersama di mana salah satu anggota aktif adalah bawahan langsung atasan ini (tembusan pengawasan)
  const memberDinasPendingCount = ticketsList.filter(t =>
    t.status !== 'Dibatalkan' &&
    t.status !== 'Ditolak' &&
    t.status !== 'Selesai' &&
    !isTicketAssignedToCurrentApprover(t) &&
    !isTicketReassignedFromCurrentApprover(t) &&
    (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat') &&
    t.isGroupDinas &&
    Array.isArray(t.members) &&
    t.members.some(m => isMemberMySubordinate(m, aNip, cActorName))
  ).length;

  const directPending = pendingInitial + pendingExtensions;
  const totalQueue = directPending + reassignedAwayCount + memberDinasPendingCount;

  const approved = ticketsList.filter(t => t.status === 'Disetujui' && isTicketAssignedToCurrentApprover(t)).length;
  const rejected = ticketsList.filter(t => t.status === 'Ditolak' && isTicketAssignedToCurrentApprover(t)).length;
  const total = ticketsList.filter(t => isTicketAssignedToCurrentApprover(t)).length;

  const statAppPending = document.getElementById('statAppPending');
  const statAppApproved = document.getElementById('statAppApproved');
  const statAppRejected = document.getElementById('statAppRejected');
  const statAppTotal = document.getElementById('statAppTotal');

  if (statAppPending) statAppPending.textContent = totalQueue;
  if (statAppApproved) statAppApproved.textContent = approved;
  if (statAppRejected) statAppRejected.textContent = rejected;
  if (statAppTotal) statAppTotal.textContent = total;

  const sidebarPendingBadge = document.getElementById('sidebarPendingBadge');
  const headingPendingBadge = document.getElementById('headingPendingBadge');
  const bnavPendingBadge = document.getElementById('bnavPendingBadge');

  if (sidebarPendingBadge) {
    sidebarPendingBadge.textContent = totalQueue;
    sidebarPendingBadge.style.display = totalQueue > 0 ? 'inline-block' : 'none';
  }
  if (headingPendingBadge) {
    headingPendingBadge.textContent = directPending;
    headingPendingBadge.style.display = directPending > 0 ? 'inline-flex' : 'none';
  }
  if (bnavPendingBadge) {
    bnavPendingBadge.textContent = totalQueue;
    bnavPendingBadge.style.display = totalQueue > 0 ? 'inline-block' : 'none';
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

  const appHeroGreeting = document.getElementById('appHeroGreeting');
  if (appHeroGreeting) {
    const nowH = new Date().getHours();
    let timeGreeting = 'pagi';
    if (nowH >= 11 && nowH < 15) timeGreeting = 'siang';
    else if (nowH >= 15 && nowH < 18) timeGreeting = 'sore';
    else if (nowH >= 18 || nowH < 5) timeGreeting = 'malam';
    appHeroGreeting.innerHTML = `Selamat ${timeGreeting}, ${window.renderUserPhoto(currentApproverActor.name, 32)} <span>${currentApproverActor.name}</span>`;
  }

  if (approverHeroSub) {
    const roleLabel = isApprover2 ? 'Atasan 2 (Supervisor / Plt)' : 'Atasan 1 (Manager)';
    const dept = currentApproverActor.department || 'Departemen Rekayasa & Pemeliharaan';
    approverHeroSub.textContent = `${roleLabel} | ${dept} | Prinsip: No Approval, No Exit`;
  }
  if (approverProfilePill) {
    approverProfilePill.textContent = `Approver: ${currentApproverActor.name} (${isApprover2 ? 'Atasan 2 / Supervisor' : 'Atasan 1 / Manager'})`;
  }

  const ticketsList = window.ticketsList || [];
  const waitingVerificationTickets = ticketsList.filter(t => t.status === 'Menunggu Verifikasi Atasan' && isTicketAssignedToCurrentApprover(t));
  const pendingTickets = ticketsList.filter(t => !t.isEmergency && !(t.id && t.id.startsWith('TK-EMG-')) && t.status === 'Menunggu Persetujuan' && isTicketAssignedToCurrentApprover(t));
  const pendingExtensions = ticketsList.filter(t => t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan' && t.status !== 'Menunggu Verifikasi Atasan' && isTicketAssignedToCurrentApprover(t));
  const outsideTickets = ticketsList.filter(t => !isDeletedByCurrentApprover(t) && (t.status === 'Sedang di Luar' || t.status === 'Terlambat') && isTicketUnderMySupervision(t));
  const lockedEmergencyTickets = ticketsList.filter(t => t.isEmergency && t.status === 'Menunggu Otorisasi Darurat' && isTicketAssignedToCurrentApprover(t));
  const activeEmergencyTickets = ticketsList.filter(t => (t.isEmergency || (t.id && t.id.startsWith('TK-EMG'))) && !t.emergencyLocked && (t.status === 'Disetujui' || t.status === 'Sedang di Luar' || t.status === 'Terlambat') && isTicketAssignedToCurrentApprover(t));
  const emergencyTickets = ticketsList.filter(t => (t.isEmergency || (t.id && t.id.startsWith('TK-EMG'))) && t.status !== 'Selesai' && t.status !== 'Ditolak' && t.status !== 'Dibatalkan' && isTicketAssignedToCurrentApprover(t));

  // Update Hero Strip (Identik Gambar 1 Karyawan)
  const appHeroStripStatus = document.getElementById('appHeroStripStatus');
  const appHeroStripSub = document.getElementById('appHeroStripSub');
  if (appHeroStripStatus && appHeroStripSub) {
    const pendingCount = pendingTickets.length + pendingExtensions.length + lockedEmergencyTickets.length + waitingVerificationTickets.length;
    if (pendingCount > 0) {
      appHeroStripStatus.textContent = `Status Antrean: ${pendingCount} Pengajuan Menunggu Keputusan`;
      appHeroStripSub.textContent = `Tinjau dan berikan keputusan perizinan karyawan bawahan.`;
    } else {
      appHeroStripStatus.textContent = `Status Antrean: Tidak Ada Pengajuan Menunggu`;
      appHeroStripSub.textContent = `Semua pengajuan izin bawahan telah diproses secara tepat waktu.`;
    }
  }

  const approverUrgentBanner = document.getElementById('approverUrgentBanner');
  const approverDashboardPendingList = document.getElementById('approverDashboardPendingList');
  const approverDashboardOutsideList = document.getElementById('approverDashboardOutsideList');

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

    // 0b. INFORMASI TEMBUSAN PENGAJUAN DINAS STAF (JIKA ADA)
    const currentAct = getCurrentApproverActor();
    const currNip = (currentAct.nip || '').trim();
    const currActorName = cleanPersonName(currentAct.name || '');

    const memberDinasPendingTickets = ticketsList.filter(t =>
      t.status !== 'Dibatalkan' &&
      t.status !== 'Ditolak' &&
      t.status !== 'Selesai' &&
      !isTicketAssignedToCurrentApprover(t) &&
      !isTicketReassignedFromCurrentApprover(t) &&
      (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat') &&
      t.isGroupDinas &&
      Array.isArray(t.members) &&
      t.members.some(m => isMemberMySubordinate(m, currNip, currActorName))
    );

    if (memberDinasPendingTickets.length > 0) {
      bannerHtml += `
        <div style="background: #ffffff; border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; padding: 0.95rem 1.25rem; margin-bottom: 0.85rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span style="font-weight: 800; font-size: 0.9rem; color: var(--text-primary, #0f172a);">
                    ${memberDinasPendingTickets.length} TEMBUSAN PENGAJUAN DINAS STAF ANDA
                  </span>
                  <span class="tag-badge" style="background: #ffffff; color: #334155; font-weight: 700; border: 1px solid #cbd5e1;">Tembusan</span>
                </div>
                <div style="font-size: 0.8rem; color: #475569; margin-top: 3px;">
                  Staf Anda terdaftar dalam tim tugas dinas kantor (Menunggu persetujuan Atasan Utama).
                </div>
                <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">
                  Anda dapat memantau rincian penugasan, jadwal, dan lampiran surat tugas di menu Antrean.
                </div>
              </div>
            </div>
            <button type="button" class="btn-card-detail" style="padding: 0.4rem 0.8rem; font-size: 0.775rem; background: #ffffff; border-color: #cbd5e1; color: #334155;" onclick="setApproverNav('antrian')">
              Lihat di Antrean →
            </button>
          </div>
        </div>
      `;
    }

    // Permohonan izin darurat kini dipindahkan langsung ke dalam Antrean Persetujuan Cepat

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
            <button class="btn-card-detail" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="openTicketDetail('${extFirst.id}', 'detail')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg><span>Detail Pengajuan</span></button>
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

  // Pending queue quick inline list (Verifikasi Tiba + Permohonan Darurat + Initial approvals + Extension requests)
  if (approverDashboardPendingList) {
    if (waitingVerificationTickets.length === 0 && lockedEmergencyTickets.length === 0 && pendingTickets.length === 0 && pendingExtensions.length === 0 && reassignedAwayTickets.length === 0) {
      approverDashboardPendingList.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
          Tidak ada antrian izin yang menunggu keputusan. Semua beres!
        </div>
      `;
    } else {
      let html = '';

      // Render Verifikasi Kedatangan (Tap In Gerbang / Bukti Foto Karyawan)
      waitingVerificationTickets.forEach(t => {
        const hasProofPhoto = Boolean(t.arrivalProofPhoto);
        html += `
          <div class="feed-item" style="border: 1px solid var(--border-color, #e2e8f0); border-left: 4px solid #2563eb; background: #ffffff; flex-direction: column; align-items: stretch; gap: 0.65rem; padding: 0.85rem; border-radius: 8px; margin-bottom: 0.65rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.4rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="card-id-num" style="font-size: 0.85rem;">${t.id}</span>
                ${window.getStatusPill(t.status, t)}
              </div>
              <span style="font-size: 0.72rem; color: #475569; font-weight: 700;">Tap In: ${t.tapInTime || t.arrivalReportedTime || 'Terkunci'}</span>
            </div>
            <div style="font-size: 0.825rem; color: var(--text-primary);">
              <strong>${t.applicantName || 'Pemohon'}</strong> (${t.applicantNip || '-'}) — Tujuan: <strong>${t.destination || '-'}</strong>
            </div>
            <div style="font-size: 0.775rem; color: #334155; line-height: 1.4;">
              ${hasProofPhoto
                ? `Karyawan mengirim ulang <strong>Foto Bukti Kedatangan (Putaran #${t.arrivalRejectionRound || 1})</strong>. Periksa foto &amp; konfirmasi kembali:`
                : `Personel telah melakukan Tap In di gerbang. Periksa kehadiran fisik di ruangan kerja:`}
            </div>
            ${hasProofPhoto ? `
              <div class="proof-photo-review-card" style="display: flex; gap: 0.65rem; align-items: center; padding: 0.55rem 0.65rem; border-radius: 8px; background: #ffffff; border: 1px solid var(--border-color, #e2e8f0);">
                <img src="${t.arrivalProofPhoto}" alt="Foto Bukti Kedatangan" class="proof-photo-thumb" onclick="event.stopPropagation(); if(typeof window.viewArrivalProofPhoto==='function') window.viewArrivalProofPhoto('${t.id}')" title="Klik untuk perbesar foto bukti">
                <div style="flex: 1; min-width: 0; font-size: 0.72rem; line-height: 1.4;">
                  <div style="font-weight: 800; color: var(--text-primary, #0f172a);">Foto Bukti Real-Time</div>
                  <div style="color: #64748b;">Oleh: <strong>${t.arrivalProofBy || t.applicantName || 'Karyawan'}</strong></div>
                  <div style="color: #059669; font-weight: 700;">${t.arrivalProofAt || '-'}</div>
                </div>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: flex-end; gap: 0.45rem; flex-wrap: wrap; padding-top: 0.45rem; border-top: 1px solid rgba(59, 130, 246, 0.25);">
              <button type="button" class="btn-card-detail" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="openTicketDetail('${t.id}', 'detail')">Detail Pengajuan</button>
              <button type="button" class="btn-reject" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; font-weight: 700; background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; border-radius: 6px;" onclick="window.rejectArrivalByApprover('${t.id}')">✕ Belum Tiba</button>
              <button type="button" class="btn-approve" style="padding: 0.35rem 0.85rem; font-size: 0.75rem; font-weight: 800;" onclick="window.confirmArrivalByApprover('${t.id}')">✓ Ya, Sudah Tiba</button>
            </div>
          </div>
        `;
      });

      // Render Permohonan Izin Darurat di paling atas Antrean Persetujuan Cepat (Priority 1)
      lockedEmergencyTickets.forEach(emg => {
        const isFaceScanMethod = (emg.selectedMethod === 'facescan');
        html += `
          <div class="feed-item" style="border-left: 4px solid #e11d48; background: #fff1f2; flex-direction: column; align-items: stretch; gap: 0.65rem; padding: 0.85rem; border-radius: 8px; margin-bottom: 0.65rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.4rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="card-id-num" style="font-size: 0.85rem; color: #9f1239; font-weight: 800;">${emg.id}</span>
                <span class="tag-badge" style="background: #fee2e2; color: #b91c1c; font-weight: 800; font-size: 0.7rem; border: 1px solid #fca5a5;">🚨 PERMOHONAN IZIN DARURAT</span>
              </div>
              <span class="status-pill emergency-locked" style="font-size: 0.65rem; padding: 2px 8px;">QR TERKUNCI</span>
            </div>
            <div style="font-size: 0.825rem; color: #881337;">
              <span style="display:inline-flex; align-items:center; gap:6px;">${window.renderUserPhoto(emg.applicantName, 22)} <strong>${emg.applicantName}</strong></span> (${emg.applicantNip || 'PK-2024-8841'}) — Tujuan: <strong>${emg.destination}</strong>
            </div>
            <div style="font-size: 0.775rem; color: #9f1239; background: #ffe4e6; padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid #fecdd3; line-height: 1.4;">
              <strong>Alasan Kedaruratan:</strong> "${emg.reason || '-'}"
            </div>
            <div style="font-size: 0.75rem; color: ${isFaceScanMethod ? '#7e22ce' : '#047857'}; font-weight: 700;">
              ${isFaceScanMethod ? '🤳 Metode: Scan Wajah Atasan di Tempat (Karyawan akan memindai wajah Anda)' : '📱 Metode: Persetujuan Langsung Atasan di App'}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; padding-top: 0.5rem; border-top: 1px solid #fecdd3; flex-wrap: wrap; gap: 0.5rem;">
              <span style="font-size: 0.725rem; color: #9f1239; font-family: var(--font-mono);">
                Diajukan: ${typeof window.formatDisplayCreatedDate === 'function' ? window.formatDisplayCreatedDate(emg.createdAt) : emg.createdAt}
              </span>
              <div style="display: flex; gap: 0.35rem; align-items: center;">
                <button class="btn-card-detail" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="openTicketDetail('${emg.id}', 'detail')">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                  <span>Detail Pengajuan</span>
                </button>
                ${!isFaceScanMethod ? `
                  <button class="btn-reject" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; font-weight: 700; background: #dc2626; color: #ffffff; border: 1px solid #dc2626; border-radius: 6px; cursor: pointer;" onclick="openRejectModal('${emg.id}')">✕ Tolak</button>
                  <button class="btn-approve" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; background: #059669; font-weight: 800; border-radius: 6px;" onclick="window.emergencyDirectApprove('${emg.id}')">⚡ Setujui</button>
                ` : `
                  <span style="font-size: 0.72rem; color: #7e22ce; background: #faf5ff; border: 1px solid #e9d5ff; padding: 4px 8px; border-radius: 6px; font-weight: 700;">
                    Menunggu Scan Wajah
                  </span>
                `}
              </div>
            </div>
          </div>
        `;
      });

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
              <strong>${t.applicantName || 'Budi Pratama'}</strong> (${t.applicantNip || 'PK-2024-8841'}) — Tujuan: <strong style="max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; vertical-align: bottom;" title="${t.destination}">${t.destination}</strong>
            </div>
            <div class="approver-detail-callout warning" style="border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.775rem; line-height: 1.45;">
              <div><strong>Estimasi Kembali Semula:</strong> ${t.estimatedReturn ? t.estimatedReturn.replace('T', ' ') : '-'}</div>
              <div><strong>Permohonan Waktu Baru:</strong> <strong class="callout-highlight">${t.pendingExtension.newEstimatedReturn.replace('T', ' ')}</strong></div>
              <div style="margin-top: 2px; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(t.pendingExtension.reason || '').replace(/"/g, '&quot;')}"><strong>Alasan:</strong> "${t.pendingExtension.reason}"</div>
            </div>
            <div class="approver-feed-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; padding-top: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <span style="font-size: 0.725rem; color: var(--text-muted);">
                Diajukan: ${t.pendingExtension.requestedAt}
              </span>
              <div style="display: flex; gap: 0.35rem;">
                <button class="btn-card-detail" style="padding: 0.3rem 0.6rem; font-size: 0.725rem;" onclick="openTicketDetail('${t.id}', 'detail')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg><span>Detail Pengajuan</span></button>
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
              <strong>${t.applicantName || 'Budi Pratama'}</strong> (${t.applicantNip || 'PK-2024-8841'}) — Tujuan: <strong style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; vertical-align: bottom;" title="${(t.destination || '').replace(/"/g, '&quot;')}">${(t.destination || '-').replace(/\r?\n+/g, ' ')}</strong>
            </div>
            <div style="font-size: 0.775rem; color: var(--text-secondary); line-height: 1.4; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(t.reason || '').replace(/"/g, '&quot;')}">
              "${t.reason}"
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; padding-top: 0.5rem; border-top: 1px solid #f1f5f9; flex-wrap: wrap; gap: 0.5rem;">
              <span style="font-size: 0.725rem; color: var(--text-muted); font-family: var(--font-mono);">
                Keluar: ${t.plannedExit.replace('T', ' ')}
              </span>
              <div style="display: flex; gap: 0.35rem;">
                <button class="btn-card-detail" style="padding: 0.3rem 0.6rem; font-size: 0.725rem;" onclick="openTicketDetail('${t.id}', 'detail')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg><span>Detail Pengajuan</span></button>
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
                <span class="reassign-tag-text">Dialihkan ke ${t.approverName}</span>
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
              <button class="btn-card-detail" style="padding: 0.3rem 0.65rem; font-size: 0.725rem;" onclick="openTicketDetail('${t.id}', 'detail')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg><span>Detail Pengajuan</span></button>
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
                  ${isEmergency ? '<span style="color:#b91c1c; font-weight:800; font-size:0.75rem;">DARURAT</span>' : ''}
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
    const isEmergency = Boolean(t.isEmergency || (t.id && t.id.startsWith('TK-EMG')) || (t.category && t.category.toLowerCase().includes('darurat')));
    let displayCategory = t.category;
    if (!displayCategory || displayCategory === 'Izin Darurat' || displayCategory === 'Darurat') {
      displayCategory = (t.type === 'Pulang Mendahului' || (t.reason && t.reason.toLowerCase().includes('keluarga'))) ? 'Urusan Pribadi' : 'Dinas Kantor';
    }
    const isDinas = displayCategory === 'Dinas Kantor';
    const isGroupDinas = Boolean((t.isGroupDinas || (Array.isArray(t.members) && t.members.length > 0)) && isDinas);

    return `
          <div class="card-item" style="${isEmergency ? 'border-left: 4px solid var(--rose-danger);' : ''}">
            <div class="card-top">
              <div>
                <span class="card-id-num">${t.id}</span>
                <div class="card-created-meta">Diajukan: ${typeof window.formatDisplayCreatedDate === 'function' ? window.formatDisplayCreatedDate(t.createdAt) : t.createdAt}</div>
              </div>
              ${window.getStatusPill(t.status, t)}
            </div>

            <div style="background:var(--bg-subtle); padding:0.6rem 0.85rem; border-radius:6px; display:flex; align-items:flex-start; justify-content:space-between; gap: 0.75rem;">
              <div style="display: flex; align-items: flex-start; gap: 0.65rem;">
                ${window.renderUserPhoto(t.applicantName || 'Budi Pratama, S.T.', 36)}
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary); line-height: 1.3;">${t.applicantName || 'Budi Pratama, S.T.'}</div>
                  <div style="font-size:0.72rem; color:var(--text-secondary); font-family: var(--font-mono, monospace); line-height: 1.25;">NIP: ${t.applicantNip || 'PK-2024-8841'}</div>
                  <div style="font-size:0.72rem; color:var(--text-muted); line-height: 1.25;">${t.department || 'Departemen Rekayasa & Pemeliharaan'}</div>
                </div>
              </div>
              <div style="text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
                <span style="font-weight: 700; font-size: 0.75rem; color: ${isDinas ? '#059669' : '#d97706'}; white-space: nowrap;">${displayCategory}</span>
                ${isEmergency ? `<span style="font-size: 0.68rem; font-weight: 800; color: #be123c; background: #ffe4e6; padding: 1px 6px; border-radius: 4px; border: 1px solid #fecdd3; letter-spacing: 0.2px; white-space: nowrap;">🚨 Darurat</span>` : ''}
                ${isGroupDinas ? (() => {
                  const groupCount = (t.initiatorCancelled ? 0 : 1) + (Array.isArray(t.members) ? t.members.filter(m => m.status !== 'batal').length : (t.memberCount || 2));
                  return `<span style="font-size: 0.68rem; font-weight: 700; color: #334155; background: #ffffff; padding: 1px 6px; border-radius: 4px; border: 1px solid #cbd5e1; letter-spacing: 0.2px; white-space: nowrap;" title="Tim Dinas (${groupCount} Orang)">Tim (${groupCount})</span>`;
                })() : ''}
              </div>
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
            ` : (() => {
              if (t.isGroupDinas && Array.isArray(t.members)) {
                const currentActor = getCurrentApproverActor();
                const aNip = (currentActor.nip || '').trim();
                const cActorName = cleanPersonName(currentActor.name || '');
                const myMembers = t.members.filter(m => isMemberMySubordinate(m, aNip, cActorName));
                if (myMembers.length > 0 && !isTicketAssignedToCurrentApprover(t)) {
                  const names = myMembers.map(m => m.name.split(',')[0]).join(', ');
                  return `
                    <div class="approver-alert-banner" style="background: #ffffff; border: 1px solid var(--border-color, #e2e8f0); border-radius: 6px; padding: 0.45rem 0.75rem; font-size: 0.75rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                      <span style="color: #334155;"><strong>Tembusan Pengawasan:</strong> Staf Anda (<strong>${names}</strong>) terdaftar dalam tim dinas ini</span>
                      <span style="font-size: 0.7rem; color: #475569; font-weight: 700;">Peninjau: ${t.approverName}</span>
                    </div>
                  `;
                }
              }
              return '';
            })())}

            <!-- Detail Box (Tujuan keluar, Keperluan, Rencana waktu) Sesuai Gambar 2 -->
            <div class="figma-card-detail-box" style="display: flex; flex-direction: column; gap: 0.35rem; padding: 0.55rem 0.65rem; background: var(--bg-subtle, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: 6px; margin: 0.4rem 0;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 1.25rem;">
                <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; min-width: 95px; flex-shrink: 0; white-space: nowrap;">Tujuan keluar</span>
                <span class="detail-val" style="font-size: 0.75rem; color: var(--text-primary, #0f172a); font-weight: 600; text-align: right; line-height: 1.35; max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(t.destination || '').replace(/"/g, '&quot;')}">${(t.destination || '-').replace(/\r?\n+/g, ' ')}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 1.25rem;">
                <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; min-width: 95px; flex-shrink: 0; white-space: nowrap;">Keperluan</span>
                <span class="detail-val" style="font-size: 0.75rem; color: var(--text-primary, #0f172a); font-weight: 500; text-align: right; max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.35;" title="${(t.reason || '').replace(/"/g, '&quot;')}">${(t.reason || '-').replace(/\r?\n+/g, ' ')}</span>
              </div>
              <div class="detail-schedule-row" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; padding-top: 0.35rem; border-top: 1px dashed var(--border-color, #e2e8f0);">
                <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; white-space: nowrap;">Rencana waktu</span>
                <div class="detail-schedule-val" style="text-align: right;">${typeof window.formatTicketScheduleWithDay === 'function' ? window.formatTicketScheduleWithDay(t) : `<div class="schedule-time-text">${t.plannedExit.replace('T', ' ')} s/d ${t.estimatedReturn ? t.estimatedReturn.replace('T', ' ') : 'Pulang'}</div>`}</div>
              </div>
            </div>

            ${t.suratPerintah ? `
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; background: #ffffff; border: 1px solid var(--border-color, #e2e8f0); border-radius: 6px; padding: 0.35rem 0.65rem; font-size: 0.725rem; margin-bottom: 0.4rem;">
                <div style="display: flex; align-items: center; gap: 0.4rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;">
                  <span style="color: #334155; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(t.suratPerintah.name || 'Surat Perintah Dinas').replace(/"/g, '&quot;')}">${t.suratPerintah.name || 'Surat_Perintah_Dinas.pdf'}</span>
                </div>
                <button type="button" onclick="event.stopPropagation(); window.viewSuratPerintahDetail('${t.id}')" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 8px; font-size: 0.7rem; font-weight: 700; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0;">
                  Lihat Dokumen
                </button>
              </div>
            ` : ''}

            ${t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan' && t.status !== 'Menunggu Verifikasi Atasan' ? `
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

            ${isEmergency && (t.status === 'Menunggu Otorisasi Darurat' || (t.emergencyLocked && t.status !== 'Disetujui' && !['Selesai', 'Ditolak', 'Dibatalkan', 'Kedaluwarsa'].includes(t.status))) ? `
              <div class="approver-alert-banner emergency" style="border-radius: 8px; padding: 0.75rem 0.95rem; font-size: 0.8rem; margin: 0.65rem 0;">
                <div style="font-weight: 800; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.4rem;">
                  <span>Hasil Penulisan Form Kedaruratan (K3/Medis)</span>
                  <span style="font-weight: 800; font-size: 0.75rem;">
                    ${t.selectedMethod === 'passcode' ? '🔑 Cara: Sandi / OTP' : (t.selectedMethod === 'facescan' ? '🤳 Cara: Scan Wajah' : '📱 Cara: Persetujuan di App')}
                  </span>
                </div>
                <div style="margin-top: 0.35rem; font-size: 0.75rem; line-height: 1.45; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="Alasan: ${t.reason} — Tujuan: ${t.destination}">
                  <strong>Alasan:</strong> "${t.reason}" — <strong>Tujuan:</strong> ${t.destination}
                </div>
                ${(t.selectedMethod === 'facescan' ? `
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

            ${(() => {
              const isReassignedAway = isTicketReassignedFromCurrentApprover(t);
              const isAssigned = isTicketAssignedToCurrentApprover(t);
              const canDecide = !isTrackingView && isAssigned && !isReassignedAway;
              const isEmergDeciding = isEmergency && (t.status === 'Menunggu Otorisasi Darurat' || (t.emergencyLocked && t.status !== 'Disetujui' && !['Selesai', 'Ditolak', 'Dibatalkan', 'Kedaluwarsa'].includes(t.status)));

              if (canDecide && (isPending || isEmergDeciding || (t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan'))) {
                // Decision Mode (Exclusive to Officially Assigned Approver)
                return `
                <div class="card-actions-bar" style="display: flex; flex-direction: column; gap: 0.45rem; width: 100%; margin-top: auto; padding-top: 0.6rem; border-top: 1px solid var(--border-color);">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; width: 100%;">
                    ${t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan' && t.status !== 'Menunggu Verifikasi Atasan' ? `
                      <button class="btn-reject" style="width: 100%; min-height: 34px; justify-content: center; font-size: 0.75rem; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem;" onclick="openRejectExtensionModal('${t.id}')">
                        ✕ Tolak Perpanjang
                      </button>
                      <button class="btn-approve" style="width: 100%; min-height: 34px; justify-content: center; font-size: 0.75rem; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem;" onclick="approveExtensionRequest('${t.id}')">
                        ✓ Setujui Perpanjang
                      </button>
                    ` : (isEmergDeciding ? (
                      t.selectedMethod === 'facescan' ? `
                        <div style="grid-column: span 2; display: flex; align-items: center; justify-content: center; background: #faf5ff; border: 1px solid #e9d5ff; padding: 0.4rem 0.65rem; border-radius: 6px;">
                          <span style="font-size: 0.725rem; color: #7e22ce; font-weight: 700;">🤳 Otorisasi Scan Wajah di Tempat (Menunggu Pemohon)</span>
                        </div>
                      ` : `
                        <button class="btn-reject" style="width: 100%; min-height: 34px; justify-content: center; font-size: 0.75rem; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem;" onclick="openRejectModal('${t.id}')">
                          ✕ Tolak Darurat
                        </button>
                        <button class="btn-approve" style="width: 100%; min-height: 34px; justify-content: center; font-size: 0.75rem; font-weight: 800; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem; background: #059669;" onclick="window.emergencyDirectApprove('${t.id}')">
                          ✓ Setujui
                        </button>
                      `
                    ) : `
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
                    <span>Detail Pengajuan</span>
                  </button>
                </div>`;
              }

              // Monitoring / Read-Only Mode (Subordinate pending with other approver OR Reassigned Away)
              if (!isTrackingView && (isReassignedAway || !isAssigned) && (isPending || isEmergDeciding || (t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan'))) {
                return `
                <div class="card-actions-bar" style="display: flex; flex-direction: column; gap: 0.45rem; width: 100%; margin-top: auto; padding-top: 0.6rem; border-top: 1px solid var(--border-color);">
                  <div style="display: flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.6rem; background: #ffffff; border: 1px solid var(--border-color, #e2e8f0); border-radius: 6px; font-size: 0.725rem; color: #334155; font-weight: 600;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
                    <span>${isReassignedAway ? `Dialihkan ke: <strong>${t.approverName || 'Pejabat Terkait'}</strong>` : `Menunggu keputusan dari: <strong>${t.approverName || 'Pejabat Terkait'}</strong>`}</span>
                  </div>
                  <button class="btn-card-detail" style="width: 100%; padding: 0.45rem 0.65rem; font-size: 0.75rem; font-weight: 600; min-height: 34px; justify-content: center; display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 6px;" onclick="openTicketDetail('${t.id}', 'detail')" title="Lihat Rincian Lengkap">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    <span>Detail Pengajuan</span>
                  </button>
                </div>`;
              }

              // Standard Tracking View (Pelacakan) & Antrean
              if (t.status === 'Menunggu Bukti Kedatangan') {
                return `
                <div class="card-actions-bar" style="display: flex; flex-direction: column; gap: 0.45rem; width: 100%; margin-top: auto; padding-top: 0.6rem; border-top: 1px solid var(--border-color);">
                  <div class="proof-reason-alert-box" style="padding: 0.5rem 0.7rem; border-radius: 6px; font-size: 0.725rem; line-height: 1.4; background: #ffffff; border: 1px solid var(--border-color, #e2e8f0); color: #0f172a;">
                    <strong>Menunggu Foto Bukti Kedatangan (Putaran #${t.arrivalRejectionRound || 1}):</strong><br>
                    Alasan Anda: "${t.arrivalRejectReason || '-'}"<br>
                    <span style="opacity: 0.9; color: #475569;">Tap In Gerbang (${t.tapInTime || t.arrivalReportedTime || 'Terkunci'}) tetap terkunci sampai bukti diunggah karyawan.</span>
                  </div>
                  <button class="btn-card-detail" style="width: 100%; padding: 0.35rem 0.5rem; font-size: 0.75rem; font-weight: 600; min-height: 32px; justify-content: center; display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 6px;" onclick="openTicketDetail('${t.id}', 'detail')" title="Lihat Rincian Lengkap">
                    <span>Detail Pengajuan</span>
                  </button>
                </div>`;
              }

              if (t.status === 'Menunggu Verifikasi Atasan') {
                const isPrimary = isTicketAssignedToCurrentApprover(t);
                if (!isPrimary) {
                  return `
                  <div class="card-actions-bar" style="display: flex; gap: 0.5rem; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 0.6rem; border-top: 1px solid var(--border-color); width: 100%;">
                    <span style="font-size: 0.72rem; color: #475569; font-weight: 600;">Tap In gerbang tercatat (Menunggu konfirmasi ${t.approverName})</span>
                    <button type="button" class="btn-pill-action btn-pill-detail" onclick="openTicketDetail('${t.id}', 'detail')" title="Lihat Detail Pengajuan">
                      <span>Detail Pengajuan</span>
                    </button>
                  </div>`;
                }

                // KHUSUS MENU PELACAKAN: Hanya pemantauan status (read-only), DILARANG menampilkan tombol konfirmasi kedatangan
                if (window.currentApproverNav === 'pelacakan' || window.currentApproverNav === 'tim') {
                  return `
                  <div class="card-actions-bar" style="display: flex; gap: 0.5rem; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 0.6rem; border-top: 1px solid var(--border-color); width: 100%;">
                    <span style="font-size: 0.725rem; color: #475569; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                      <span>Tap In gerbang tercatat (${t.tapInTime || t.arrivalReportedTime || 'Terkunci'}) — Menunggu konfirmasi di Antrean</span>
                    </span>
                    <button type="button" class="btn-pill-action btn-pill-detail" onclick="openTicketDetail('${t.id}', 'detail')" title="Lihat Detail Pengajuan">
                      <span>Detail Pengajuan</span>
                    </button>
                  </div>`;
                }

                // MENU ANTREAN PERSETUJUAN & DASHBOARD ATASAN: Tampilkan foto bukti (jika ada) & tombol aksi konfirmasi
                const hasProofPhoto = Boolean(t.arrivalProofPhoto);
                return `
                <div class="card-actions-bar" style="display: flex; flex-direction: column; gap: 0.45rem; width: 100%; margin-top: auto; padding-top: 0.6rem; border-top: 1px solid var(--border-color);">
                  <div style="padding: 0.45rem 0.65rem; background: #ffffff; border: 1px solid var(--border-color, #e2e8f0); border-radius: 6px; font-size: 0.725rem; color: #334155; line-height: 1.4;">
                    <strong style="color: #0f172a;">Tap In Gerbang Masuk (${t.tapInTime || t.arrivalReportedTime || 'Terkunci'}):</strong><br>
                    ${hasProofPhoto
                      ? `Karyawan mengirim ulang <strong>Foto Bukti Kedatangan (Putaran #${t.arrivalRejectionRound || 1})</strong>. Periksa foto & konfirmasi kembali:`
                      : `Personel ${t.isGroupDinas ? 'tim dinas ' : ''}telah tap in di gerbang. Periksa kehadiran fisik di ruangan kerja dan berikan konfirmasi:`}
                  </div>
                  ${hasProofPhoto ? `
                    <div class="proof-photo-review-card" style="display: flex; gap: 0.65rem; align-items: center; padding: 0.55rem 0.65rem; border-radius: 8px; background: #ffffff; border: 1px solid var(--border-color, #e2e8f0);">
                      <img src="${t.arrivalProofPhoto}" alt="Foto Bukti Kedatangan" class="proof-photo-thumb" onclick="event.stopPropagation(); if(typeof window.viewArrivalProofPhoto==='function') window.viewArrivalProofPhoto('${t.id}')" title="Klik untuk perbesar foto bukti">
                      <div style="flex: 1; min-width: 0; font-size: 0.72rem; line-height: 1.4;">
                        <div style="font-weight: 800; color: var(--text-primary, #0f172a);">Foto Bukti Real-Time</div>
                        <div style="color: #64748b;">Oleh: <strong>${t.arrivalProofBy || t.applicantName || 'Karyawan'}</strong></div>
                        <div style="color: #059669; font-weight: 700;">${t.arrivalProofAt || '-'}</div>
                        ${t.arrivalProofNote ? `<div style="color: #334155; font-style: italic; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${String(t.arrivalProofNote).replace(/"/g, '&quot;')}">"${t.arrivalProofNote}"</div>` : ''}
                      </div>
                    </div>
                  ` : ''}
                  <div style="display: flex; gap: 0.45rem; width: 100%;">
                    <button type="button" class="btn-reject" style="flex: 1; min-height: 34px; justify-content: center; font-size: 0.75rem; font-weight: 700; background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem;" onclick="window.rejectArrivalByApprover('${t.id}')">
                      ✕ Belum Tiba
                    </button>
                    <button type="button" class="btn-approve" style="flex: 1.3; min-height: 34px; justify-content: center; font-size: 0.75rem; font-weight: 800; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem;" onclick="window.confirmArrivalByApprover('${t.id}')">
                      ✓ Ya, Sudah Tiba
                    </button>
                  </div>
                  <button class="btn-card-detail" style="width: 100%; padding: 0.35rem 0.5rem; font-size: 0.75rem; font-weight: 600; min-height: 32px; justify-content: center; display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 6px;" onclick="openTicketDetail('${t.id}', 'detail')" title="Lihat Rincian Lengkap">
                    <span>Detail Pengajuan</span>
                  </button>
                </div>`;
              }

              const isRiwayatView = (window.currentApproverNav === 'riwayat');
              return `
              <div class="card-actions-bar" style="display: flex; gap: 0.5rem; align-items: center; justify-content: flex-end; margin-top: auto; padding-top: 0.6rem; border-top: 1px solid var(--border-color); flex-wrap: nowrap; width: 100%;">
                <button type="button" class="btn-pill-action btn-pill-detail" onclick="openTicketDetail('${t.id}', 'detail')" title="Lihat Detail Pengajuan">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                  <span>Detail Pengajuan</span>
                </button>
                ${isRiwayatView ? `
                <button type="button" class="btn-pill-action btn-pill-delete" onclick="event.stopPropagation(); window.deleteApproverTicket('${t.id}')" title="Hapus Riwayat #${t.id}">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>Hapus</span>
                </button>
                ` : ''}
              </div>`;
            })()}
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
            <th style="white-space: nowrap; min-width: 170px;">Nomor Tiket & Kategori</th>
            <th style="white-space: nowrap; min-width: 180px;">Pemohon & Departemen</th>
            <th style="white-space: nowrap; min-width: 200px;">Tujuan & Keperluan</th>
            <th style="white-space: nowrap; min-width: 140px;">Rencana Waktu</th>
            <th style="white-space: nowrap; min-width: 95px;">Status</th>
            <th style="white-space: nowrap; min-width: 180px;">Catatan Keputusan</th>
            <th style="white-space: nowrap; min-width: 175px;">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(t => {
            const isEmergency = Boolean(t.isEmergency || (t.id && t.id.startsWith('TK-EMG')) || (t.category && t.category.toLowerCase().includes('darurat')));
            let displayCategory = t.category;
            if (!displayCategory || displayCategory === 'Izin Darurat' || displayCategory === 'Darurat') {
              displayCategory = (t.type === 'Pulang Mendahului' || (t.reason && t.reason.toLowerCase().includes('keluarga'))) ? 'Urusan Pribadi' : 'Dinas Kantor';
            }
            const isDinas = displayCategory === 'Dinas Kantor';
            const isGroupDinas = Boolean((t.isGroupDinas || (Array.isArray(t.members) && t.members.length > 0)) && isDinas);
            const statusHtml = typeof window.getCleanEmpStatus === 'function' ? window.getCleanEmpStatus(t.status, t) : window.getStatusPill(t.status, t);
            const scheduleWithDay = typeof window.formatTicketScheduleWithDay === 'function'
              ? window.formatTicketScheduleWithDay(t)
              : `<div style="font-weight: 600; color: var(--text-primary); font-size: 0.775rem; white-space: nowrap;">${(t.plannedExit || '').slice(0, 10)}</div><div style="font-size: 0.75rem; color: var(--text-secondary); font-family: var(--font-mono); margin-top: 2px; white-space: nowrap;">${(t.plannedExit || '').slice(11, 16)} WIB</div>`;

            let catatanHtml = `<span style="color: var(--text-muted); font-size: 0.75rem;">-</span>`;
            if (t.approverNote) {
              let noteText = t.approverNote;
              if (noteText.includes('[Otorisasi Darurat Sah]: QR Code dibuka melalui "Scan Wajah Atasan (Face Scan Biometrik)"') || (noteText.includes('[Otorisasi') && noteText.includes('Face Scan'))) {
                noteText = `[Otorisasi Sah]: QR Code dibuka via Face Scan Biometrik oleh ${t.approverName || 'Ir. Hendra Gunawan, M.T.'}.`;
              } else if (noteText.includes('[Otorisasi Darurat Sah]:')) {
                noteText = noteText.replace(/\[Otorisasi Darurat Sah\]:?\s*/gi, '[Otorisasi Sah]: ')
                                   .replace(/melalui\s*"([^"]+)"/gi, 'via $1')
                                   .replace(/Verifikasi wajah biometrik berhasil dilakukan langsung di tempat kejadian\./gi, '')
                                   .replace(/Disetujui 1-Klik melalui Dashboard Atasan\./gi, '')
                                   .replace(/Verifikasi kode sandi otorisasi.*cocok secara sah\./gi, '')
                                   .replace(/\s{2,}/g, ' ')
                                   .trim();
              }
              catatanHtml = `<span style="color: var(--text-primary); font-size: 0.75rem; font-style: normal;" title="${(t.approverNote || '').replace(/"/g, '&quot;')}">"${noteText}"</span>`;
            } else if (t.rejectionReason) {
              catatanHtml = `<span style="color: #ef4444; font-size: 0.75rem;" title="${(t.rejectionReason || '').replace(/"/g, '&quot;')}">${t.rejectionReason}</span>`;
            } else if (t.reassignedTo) {
              catatanHtml = `<span style="color: #f59e0b; font-size: 0.725rem;">Dialihkan ke ${t.reassignedTo}</span>`;
            }

            const isRiwayatView = (window.currentApproverNav === 'riwayat');
            let tindakanHtml = `
              <div class="action-pills-row">
                <button type="button" class="btn-pill-action btn-pill-detail" onclick="event.stopPropagation(); window.openTicketDetail('${t.id}', 'detail')" title="Lihat Detail Pengajuan">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                  <span>Detail Pengajuan</span>
                </button>
                ${isRiwayatView ? `
                <button type="button" class="btn-pill-action btn-pill-delete" onclick="event.stopPropagation(); window.deleteApproverTicket('${t.id}')" title="Hapus Riwayat #${t.id}">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>Hapus</span>
                </button>
                ` : ''}
              </div>
            `;

            return `
              <tr style="${isEmergency ? 'border-left: 4px solid var(--rose-danger, #e11d48); background-color: rgba(225, 29, 72, 0.035);' : ''}">
                <td style="vertical-align: middle;">
                  <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                    <span style="font-weight: 700; font-family: var(--font-mono); color: var(--text-primary); font-size: 0.8rem; white-space: nowrap;">${t.id}</span>
                    ${isEmergency ? `<span style="font-size: 0.68rem; font-weight: 800; color: #be123c; background: #ffe4e6; padding: 1px 6px; border-radius: 4px; border: 1px solid #fecdd3; letter-spacing: 0.2px;">🚨 Darurat</span>` : ''}
                    ${isGroupDinas ? (() => {
                      const groupCount = (t.initiatorCancelled ? 0 : 1) + (Array.isArray(t.members) ? t.members.filter(m => m.status !== 'batal').length : (t.memberCount || 2));
                      return `<span style="font-size: 0.68rem; font-weight: 800; color: #0284c7; background: #e0f2fe; padding: 1px 6px; border-radius: 4px; border: 1px solid #bae6fd; letter-spacing: 0.2px;" title="Tim Dinas (${groupCount} Orang)">👥 Tim (${groupCount})</span>`;
                    })() : ''}
                  </div>
                  <div style="font-size: 0.725rem; color: var(--text-muted); margin-top: 3px; line-height: 1.35;">
                    <div>${displayCategory}</div>
                    <div>${t.type}</div>
                  </div>
                </td>
                <td style="vertical-align: middle;">
                  <div style="display: flex; align-items: flex-start; gap: 0.65rem;">
                    ${window.renderUserPhoto(t.applicantName || 'Budi Pratama', 32)}
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                      <div style="font-weight: 700; color: var(--text-primary); font-size: 0.8rem; line-height: 1.3;">${t.applicantName || 'Budi Pratama'}</div>
                      <div style="font-size: 0.72rem; color: var(--text-secondary); font-family: var(--font-mono, monospace); line-height: 1.25;">NIP: ${t.applicantNip || 'PK-2024-8841'}</div>
                      <div style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.25;">${t.department || '-'}</div>
                    </div>
                  </div>
                </td>
                <td style="vertical-align: middle;">
                  <div style="font-weight: 600; color: var(--text-primary); font-size: 0.8rem; line-height: 1.35; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(t.destination || '').replace(/"/g, '&quot;')}">${(t.destination || '-').replace(/\r?\n+/g, ' ')}</div>
                  <div style="font-size: 0.725rem; color: var(--text-muted); margin-top: 3px; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(t.reason || '').replace(/"/g, '&quot;')}">${(t.reason || '-').replace(/\r?\n+/g, ' ')}</div>
                </td>
                <td style="white-space: nowrap; vertical-align: middle;">${scheduleWithDay}</td>
                <td style="white-space: nowrap; vertical-align: middle;">${statusHtml}</td>
                <td style="vertical-align: middle; line-height: 1.45;">${catatanHtml}</td>
                <td style="white-space: nowrap; vertical-align: middle;">${tindakanHtml}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  const card = target.querySelector('.figma-table-card');
  if (card && typeof window.enableDragScroll === 'function') {
    window.enableDragScroll(card);
  }
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
    const isEmgTicket = (t) => Boolean(
      t.isEmergency || 
      (t.id && (t.id.includes('-EMG-') || t.id.startsWith('TK-EMG'))) || 
      t.status === 'Menunggu Otorisasi Darurat'
    );

    // Comparator: Izin Darurat SELALU diprioritaskan di paling awal antrean
    const priorityEmergencyComparator = (a, b) => {
      const aIsEmg = isEmgTicket(a);
      const bIsEmg = isEmgTicket(b);
      if (aIsEmg && !bIsEmg) return -1;
      if (!aIsEmg && bIsEmg) return 1;

      // Sekunder: terbaru diajukan tampil lebih dulu
      const parseTime = (ticket) => {
        const val = ticket.submittedAt || ticket.createdAt || ticket.plannedExit || 0;
        const d = typeof window.parseTicketDateTime === 'function' ? window.parseTicketDateTime(val) : new Date(val);
        return (d && !isNaN(d.getTime())) ? d.getTime() : 0;
      };
      return parseTime(b) - parseTime(a);
    };

    // 1. Pengajuan tertunda yang ditujukan ke atasan aktif saat ini
    const pendingListAll = ticketsList.filter(t => 
      t.status !== 'Dibatalkan' &&
      t.status !== 'Ditolak' &&
      t.status !== 'Selesai' &&
      isTicketAssignedToCurrentApprover(t) &&
      (t.status === 'Menunggu Persetujuan' || 
       t.status === 'Menunggu Otorisasi Darurat' || 
       t.status === 'Menunggu Verifikasi Atasan' || 
       (t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan'))
    );
    pendingListAll.sort(priorityEmergencyComparator);

    // 2. Pengajuan yang sebelumnya diajukan ke atasan ini tapi dialihkan ke atasan lain
    const reassignedAwayListAll = ticketsList.filter(t =>
      t.status !== 'Dibatalkan' &&
      t.status !== 'Ditolak' &&
      t.status !== 'Selesai' &&
      isTicketReassignedFromCurrentApprover(t) &&
      (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat')
    );
    reassignedAwayListAll.sort(priorityEmergencyComparator);

    // 3. Pengajuan dinas kantor bersama di mana salah satu anggota aktif adalah bawahan langsung atasan ini (tembusan pengawasan)
    const currentApproverForQueue = getCurrentApproverActor();
    const currApproverNip = (currentApproverForQueue.nip || '').trim();
    const currApproverName = cleanPersonName(currentApproverForQueue.name || '');

    const memberDinasListAll = ticketsList.filter(t =>
      t.status !== 'Dibatalkan' &&
      t.status !== 'Ditolak' &&
      t.status !== 'Selesai' &&
      !isTicketAssignedToCurrentApprover(t) &&
      !isTicketReassignedFromCurrentApprover(t) &&
      (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat') &&
      t.isGroupDinas &&
      Array.isArray(t.members) &&
      t.members.some(m => isMemberMySubordinate(m, currApproverNip, currApproverName))
    );
    memberDinasListAll.sort(priorityEmergencyComparator);

    // Hitung counter untuk badge filter antrean
    const totalCount = pendingListAll.length;
    const emgCount = pendingListAll.filter(isEmgTicket).length;
    const regCount = pendingListAll.filter(t => !isEmgTicket(t)).length;

    const countAntrianAll = document.getElementById('countAntrianAll');
    const countAntrianEmergency = document.getElementById('countAntrianEmergency');
    const countAntrianRegular = document.getElementById('countAntrianRegular');
    const headingPendingBadge = document.getElementById('headingPendingBadge');

    if (countAntrianAll) countAntrianAll.textContent = totalCount;
    if (countAntrianEmergency) countAntrianEmergency.textContent = emgCount;
    if (countAntrianRegular) countAntrianRegular.textContent = regCount;
    if (headingPendingBadge) headingPendingBadge.textContent = totalCount;

    // Filter Sifat Izin Aktif: 'all', 'emergency', 'regular'
    const activeNature = window.currentApproverAntrianFilter || 'all';

    const btnFilterAntrianAll = document.getElementById('btnFilterAntrianAll');
    const btnFilterAntrianEmergency = document.getElementById('btnFilterAntrianEmergency');
    const btnFilterAntrianRegular = document.getElementById('btnFilterAntrianRegular');

    if (btnFilterAntrianAll) btnFilterAntrianAll.classList.toggle('active', activeNature === 'all');
    if (btnFilterAntrianEmergency) btnFilterAntrianEmergency.classList.toggle('active', activeNature === 'emergency');
    if (btnFilterAntrianRegular) btnFilterAntrianRegular.classList.toggle('active', activeNature === 'regular');

    let pendingList = pendingListAll;
    let reassignedAwayList = reassignedAwayListAll;
    let memberDinasList = memberDinasListAll;

    if (activeNature === 'emergency') {
      pendingList = pendingListAll.filter(isEmgTicket);
      reassignedAwayList = reassignedAwayListAll.filter(isEmgTicket);
      memberDinasList = memberDinasListAll.filter(isEmgTicket);
    } else if (activeNature === 'regular') {
      pendingList = pendingListAll.filter(t => !isEmgTicket(t));
      reassignedAwayList = reassignedAwayListAll.filter(t => !isEmgTicket(t));
      memberDinasList = memberDinasListAll.filter(t => !isEmgTicket(t));
    }

    if (pendingList.length === 0 && reassignedAwayList.length === 0 && memberDinasList.length === 0) {
      if (containerApproverPendingQueue) containerApproverPendingQueue.innerHTML = '';
      if (emptyApproverPendingBox) {
        emptyApproverPendingBox.style.display = 'flex';
        const emptyMsg = emptyApproverPendingBox.querySelector('p');
        if (emptyMsg) {
          if (activeNature === 'emergency') {
            emptyMsg.textContent = 'Tidak ada permohonan izin darurat yang menunggu persetujuan Anda saat ini.';
          } else if (activeNature === 'regular') {
            emptyMsg.textContent = 'Tidak ada permohonan izin reguler yang menunggu persetujuan Anda saat ini.';
          } else {
            emptyMsg.textContent = 'Tidak ada permohonan izin baru yang menunggu persetujuan Anda saat ini.';
          }
        }
      }
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

        if (memberDinasList.length > 0) {
          const tempDivMemberDinas = document.createElement('div');
          renderApproverCards(memberDinasList, tempDivMemberDinas, true);
          queueHtml += `
            <div class="approver-reassigned-section" style="margin-top: 1.5rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <h4 class="approver-reassigned-heading" style="color: #1e40af;">
                  <span>📋 Tembusan Pengajuan Dinas Staf Anda</span>
                  <span class="approver-reassigned-badge" style="background: #dbeafe; color: #1e40af;">${memberDinasList.length}</span>
                </h4>
                <span class="approver-reassigned-sub">Staf Anda terdaftar dalam tim dinas kantor</span>
              </div>
              ${tempDivMemberDinas.innerHTML}
            </div>
          `;
        }

        containerApproverPendingQueue.innerHTML = queueHtml;
      }
    }
    return;
  }

  // 3. PELACAKAN IZIN KARYAWAN (HANYA IZIN AKTIF / BERJALAN)
  if (currentApproverNav === 'pelacakan' || currentApproverNav === 'tim') {
    const activeStatuses = ['Sedang di Luar', 'Terlambat', 'Disetujui', 'Menunggu Verifikasi Atasan', 'Menunggu Bukti Kedatangan'];
    let list = ticketsList.filter(t => 
      !isDeletedByCurrentApprover(t) && 
      isTicketUnderMySupervision(t) &&
      activeStatuses.includes(t.status)
    );

    // Filter Pencarian (Cari tiket, alasan, tujuan, pemohon, NIP, departemen)
    const searchAppInput = document.getElementById('searchApproverInput');
    const searchVal = searchAppInput ? searchAppInput.value.trim().toLowerCase() : '';
    if (searchVal) {
      const matcher = typeof window.matchSearchTokens === 'function' ? window.matchSearchTokens : null;
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

    // Filter Status (Hanya status aktif)
    const filterAppStatus = document.getElementById('filterApproverStatus');
    const statusVal = filterAppStatus ? filterAppStatus.value : 'all';
    if (statusVal === 'emergency') {
      list = list.filter(t => t.isEmergency || (t.id && t.id.startsWith('TK-EMG')));
    } else if (statusVal === 'outside') {
      list = list.filter(t => t.status === 'Sedang di Luar' || t.status === 'Terlambat');
    } else if (statusVal !== 'all') {
      list = list.filter(t => t.status === statusVal);
    }

    // Sorting Pelacakan
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

    // View toggle state
    const btnApproverViewCard = document.getElementById('btnApproverViewCard');
    const btnApproverViewTable = document.getElementById('btnApproverViewTable');
    if (btnApproverViewCard && btnApproverViewTable) {
      btnApproverViewCard.classList.toggle('active', window.currentApproverViewMode !== 'table');
      btnApproverViewTable.classList.toggle('active', window.currentApproverViewMode === 'table');
    }

    const totalItems = list.length;
    const pageSize = 6;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    window.appPelacakanCurrentPage = window.appPelacakanCurrentPage || 1;
    if (window.appPelacakanCurrentPage > totalPages) window.appPelacakanCurrentPage = totalPages;
    const currentPage = window.appPelacakanCurrentPage;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const pageItems = list.slice(startIndex, endIndex);

    const metaEl = document.getElementById('figmaApproverPelacakanMeta');
    const btnsEl = document.getElementById('figmaApproverPelacakanBtns');
    const barEl = document.getElementById('figmaApproverPelacakanPagination');
    if (barEl) barEl.style.display = totalItems === 0 ? 'none' : 'flex';
    if (metaEl) metaEl.textContent = totalItems === 0 ? 'Menampilkan 0 dari 0 data' : `Menampilkan ${startIndex + 1}–${endIndex} dari ${totalItems} data`;
    if (btnsEl && typeof window.renderGenericPaginationButtons === 'function') {
      window.renderGenericPaginationButtons(btnsEl, totalPages, currentPage, (newPage) => {
        window.appPelacakanCurrentPage = newPage;
        renderApproverView();
      });
    }

    if (totalItems === 0) {
      if (containerApproverRequests) containerApproverRequests.innerHTML = '';
      if (emptyApproverBox) emptyApproverBox.style.display = 'flex';
      return;
    }

    if (emptyApproverBox) emptyApproverBox.style.display = 'none';
    if (window.currentApproverViewMode === 'table') {
      renderApproverTable(pageItems, containerApproverRequests);
    } else {
      renderApproverCards(pageItems, containerApproverRequests, true);
    }
    return;
  }

  // 4. RIWAYAT IZIN KARYAWAN (HANYA STATUS FINAL: SELESAI, DITOLAK, DIBATALKAN, KEDALUWARSA)
  if (currentApproverNav === 'riwayat') {
    const finalStatuses = ['Selesai', 'Ditolak', 'Dibatalkan', 'Kedaluwarsa'];
    let list = ticketsList.filter(t =>
      !isDeletedByCurrentApprover(t) &&
      isTicketUnderMySupervision(t) &&
      finalStatuses.includes(t.status)
    );

    // Filter Pencarian
    const searchRiwayatInput = document.getElementById('searchApproverRiwayatInput');
    const searchVal = searchRiwayatInput ? searchRiwayatInput.value.trim().toLowerCase() : '';
    if (searchVal) {
      const matcher = typeof window.matchSearchTokens === 'function' ? window.matchSearchTokens : null;
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
    const filterRiwayatPeriod = document.getElementById('filterApproverRiwayatPeriod');
    const period = filterRiwayatPeriod ? filterRiwayatPeriod.value : 'all';
    if (period !== 'all' && typeof window.matchesPeriodFilter === 'function') {
      list = list.filter(t => window.matchesPeriodFilter(t, period));
    }

    // Filter Kategori
    const filterRiwayatCat = document.getElementById('filterApproverRiwayatCategory');
    const catVal = filterRiwayatCat ? filterRiwayatCat.value : 'all';
    if (catVal !== 'all') {
      list = list.filter(t => t.category === catVal);
    }

    // Filter Tipe Izin
    const filterRiwayatType = document.getElementById('filterApproverRiwayatType');
    const typeVal = filterRiwayatType ? filterRiwayatType.value : 'all';
    if (typeVal !== 'all') {
      list = list.filter(t => t.type === typeVal);
    }

    // Filter Status Final
    const filterRiwayatStatus = document.getElementById('filterApproverRiwayatStatus');
    const statusVal = filterRiwayatStatus ? filterRiwayatStatus.value : 'all';
    if (statusVal === 'emergency') {
      list = list.filter(t => t.isEmergency || (t.id && t.id.startsWith('TK-EMG')));
    } else if (statusVal !== 'all') {
      list = list.filter(t => t.status === statusVal);
    }

    // Sorting Riwayat
    const sortRiwayatEl = document.getElementById('sortApproverRiwayat');
    const sortOrder = sortRiwayatEl ? sortRiwayatEl.value : 'desc';

    list = [...list];
    list.sort((a, b) => {
      const parseD = (t) => {
        const raw = t.approvedAt || t.rejectedAt || t.createdAt || t.plannedExit || 0;
        const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
        return (d && !isNaN(d.getTime())) ? d.getTime() : 0;
      };
      const dA = parseD(a);
      const dB = parseD(b);
      return sortOrder === 'asc' ? dA - dB : dB - dA;
    });

    const containerApproverRiwayatRequests = document.getElementById('containerApproverRiwayatRequests');
    const emptyApproverRiwayatBox = document.getElementById('emptyApproverRiwayatBox');

    // View toggle state
    const btnApproverRiwayatViewCard = document.getElementById('btnApproverRiwayatViewCard');
    const btnApproverRiwayatViewTable = document.getElementById('btnApproverRiwayatViewTable');
    if (btnApproverRiwayatViewCard && btnApproverRiwayatViewTable) {
      btnApproverRiwayatViewCard.classList.toggle('active', window.currentApproverRiwayatViewMode !== 'table');
      btnApproverRiwayatViewTable.classList.toggle('active', window.currentApproverRiwayatViewMode === 'table');
    }

    const totalItems = list.length;
    const pageSize = 6;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    window.appRiwayatCurrentPage = window.appRiwayatCurrentPage || 1;
    if (window.appRiwayatCurrentPage > totalPages) window.appRiwayatCurrentPage = totalPages;
    const currentPage = window.appRiwayatCurrentPage;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const pageItems = list.slice(startIndex, endIndex);

    const metaEl = document.getElementById('figmaApproverRiwayatMeta');
    const btnsEl = document.getElementById('figmaApproverRiwayatBtns');
    const barEl = document.getElementById('figmaApproverRiwayatPagination');
    if (barEl) barEl.style.display = totalItems === 0 ? 'none' : 'flex';
    if (metaEl) metaEl.textContent = totalItems === 0 ? 'Menampilkan 0 dari 0 data' : `Menampilkan ${startIndex + 1}–${endIndex} dari ${totalItems} data`;
    if (btnsEl && typeof window.renderGenericPaginationButtons === 'function') {
      window.renderGenericPaginationButtons(btnsEl, totalPages, currentPage, (newPage) => {
        window.appRiwayatCurrentPage = newPage;
        renderApproverView();
      });
    }

    if (totalItems === 0) {
      if (containerApproverRiwayatRequests) containerApproverRiwayatRequests.innerHTML = '';
      if (emptyApproverRiwayatBox) emptyApproverRiwayatBox.style.display = 'flex';
      return;
    }

    if (emptyApproverRiwayatBox) emptyApproverRiwayatBox.style.display = 'none';
    if (window.currentApproverRiwayatViewMode === 'table') {
      renderApproverTable(pageItems, containerApproverRiwayatRequests);
    } else {
      renderApproverCards(pageItems, containerApproverRiwayatRequests, true);
    }
    return;
  }
}
// APPROVAL & REJECTION MODALS
function openApproveModal(ticketId) {
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  if (!isTicketAssignedToCurrentApprover(ticket)) {
    if (typeof window.showToast === 'function') {
      window.showToast('Wewenang ditolak: Anda bukan atasan yang ditugaskan untuk menyetujui izin ini.', 'danger');
    }
    return;
  }

  if (!['Menunggu Persetujuan', 'Menunggu Otorisasi Darurat'].includes(ticket.status)) {
    if (typeof window.showToast === 'function') {
      window.showToast('Tiket ini sudah diproses dan tidak dapat disetujui ulang.', 'warning');
    }
    return;
  }

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

  if (!isTicketAssignedToCurrentApprover(ticket)) {
    if (typeof window.showToast === 'function') {
      window.showToast('Wewenang ditolak: Anda bukan atasan yang ditugaskan untuk menolak izin ini.', 'danger');
    }
    return;
  }

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
  const btn = document.getElementById('btnConfirmApprove');
  if (btn && btn.disabled) return;
  if (btn) btn.disabled = true;
  setTimeout(() => { if (btn) btn.disabled = false; }, 800);

  const ticketsList = window.ticketsList || [];
  const ticketId = window.currentDecisionTicketId;
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket || ticket.status === 'Disetujui') return;
  if (!isTicketAssignedToCurrentApprover(ticket)) {
    if (typeof window.showToast === 'function') {
      window.showToast('Wewenang ditolak: Anda bukan atasan yang ditugaskan untuk menyetujui izin ini.', 'danger');
    }
    return;
  }

  const approveNoteInput = document.getElementById('approveNoteInput');
  const note = (approveNoteInput && approveNoteInput.value.trim()) || 'Disetujui';
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

    if (ticket.isGroupDinas && Array.isArray(ticket.members)) {
      const activeMembers = ticket.members.filter(m => m.status !== 'batal');
      
      // 1. Notifikasi ke masing-masing anggota aktif
      activeMembers.forEach(m => {
        window.createNotification({
          recipientRole: 'karyawan',
          recipientNip: m.nip,
          recipientName: m.name,
          actorSource: 'approver',
          type: 'disetujui',
          title: 'Pengajuan Dinas Disetujui',
          message: `Pengajuan dinas bersama (#${ticket.id}) telah disetujui oleh ${approverName}. Siap scan out bersama di Pos Jaga.`,
          ticketId: ticket.id,
          priority: 'normal',
          eventId: `approved_${ticket.id}_${m.nip}`
        });
      });

      // 2. Poin 4: Tembusan Otomatis (FYI) ke Atasan Masing-Masing Anggota
      const allUsers = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
      const currentApproverNip = approverActor.nip || ticket.approverNip;
      const supGroupMap = {}; // { [supNip]: { nip, name, members: [] } }

      activeMembers.forEach(m => {
        const u = allUsers.find(x => x.nip === m.nip);
        const supName = (u && (u.directSupervisor || u.supervisor)) || m.supervisor;
        if (!supName) return;

        // Cari profil atasan dari master data
        const supUser = allUsers.find(x => x.name === supName || (supName.includes('Dewi') && x.nip === 'PK-2012-0845') || (supName.includes('Subagja') && x.nip === 'PK-2012-0543') || (supName.includes('Hendra') && x.nip === 'PK-2015-1002'));
        const supNip = supUser ? supUser.nip : null;

        // Jika atasan anggota berbeda dengan atasan yang menyetujui tiket ini
        if (supNip && supNip !== currentApproverNip) {
          if (!supGroupMap[supNip]) {
            supGroupMap[supNip] = {
              nip: supNip,
              name: (supUser && supUser.name) || supName,
              members: []
            };
          }
          // Ambil nama untuk notifikasi (misal "Bima" atau "Bima Arya")
          const shortName = m.name.split(',')[0].trim();
          supGroupMap[supNip].members.push(shortName);
        }
      });

      // Kirim notifikasi tembusan terkelompok per atasan
      const exitSchedule = ticket.plannedExit ? (typeof window.formatDisplayDate === 'function' ? window.formatDisplayDate(ticket.plannedExit) : ticket.plannedExit.replace('T', ' ')) : '08.30';
      const returnSchedule = ticket.estimatedReturn ? (typeof window.formatDisplayDate === 'function' ? window.formatDisplayDate(ticket.estimatedReturn) : ticket.estimatedReturn.replace('T', ' ')) : '13.00';
      const destStr = ticket.destination || 'Lokasi Dinas';

      Object.values(supGroupMap).forEach(supObj => {
        let formattedMembers = '';
        if (supObj.members.length === 1) {
          formattedMembers = supObj.members[0];
        } else if (supObj.members.length === 2) {
          formattedMembers = `${supObj.members[0]} dan ${supObj.members[1]}`;
        } else {
          formattedMembers = supObj.members.slice(0, -1).join(', ') + ' dan ' + supObj.members[supObj.members.length - 1];
        }

        const initiatorShort = (ticket.applicantName || 'Inisiator').split(',')[0].trim();
        const fyiMessage = `ℹ️ Informasi Tugas Dinas Staf: Staf Anda (${formattedMembers}) terdaftar dalam Perjalanan Dinas Luar bersama tim (Inisiator: ${initiatorShort}) ke ${destStr}, jadwal ${exitSchedule} - ${returnSchedule}. Izin telah disahkan oleh ${approverName}.`;

        window.createNotification({
          recipientRole: 'approver',
          recipientNip: supObj.nip,
          recipientName: supObj.name,
          actorSource: 'approver',
          type: 'info_tembusan',
          title: 'Informasi Tugas Dinas Staf (Tembusan)',
          message: fyiMessage,
          ticketId: ticket.id,
          priority: 'normal',
          eventId: `fyi_dinas_${ticket.id}_${supObj.nip}`
        });

        ticket.timeline.push({
          event: 'Tembusan Notifikasi Atasan',
          time: nowFormatted,
          by: 'Sistem Gatepass Otomatis',
          desc: `Tembusan informasi tugas dinas staf dikirim ke ${supObj.name} untuk: ${formattedMembers}.`
        });
      });
    }
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
  if (window._isSubmittingRejectDecision) return;

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
  if (!ticket || ticket.status === 'Ditolak') return;
  if (!isTicketAssignedToCurrentApprover(ticket)) {
    if (typeof window.showToast === 'function') {
      window.showToast('Wewenang ditolak: Anda bukan atasan yang ditugaskan untuk menolak izin ini.', 'danger');
    }
    return;
  }

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
  if (!ticket || !ticket.pendingExtension) {
    if (typeof window.closeAllModals === 'function') window.closeAllModals();
    if (typeof window.showToast === 'function') {
      window.showToast('Permohonan perpanjangan sudah tidak aktif atau karyawan telah kembali ke area pabrik.', 'warning');
    }
    renderApproverView();
    return;
  }

  if (!isTicketAssignedToCurrentApprover(ticket)) {
    if (typeof window.showToast === 'function') {
      window.showToast('Wewenang ditolak: Anda bukan atasan yang ditugaskan untuk menyetujui perpanjangan waktu ini.', 'danger');
    }
    return;
  }

  const currentActor = getCurrentApproverActor();
  const approverName = currentActor ? currentActor.name : 'Ir. Hendra Gunawan, M.T.';

  let newReturn = ticket.pendingExtension.newEstimatedReturn;
  if (typeof window.normalizeReturnDateTime === 'function') {
    newReturn = window.normalizeReturnDateTime(newReturn);
  } else if (newReturn && (newReturn.match(/\d{4}-\d{2}-\d{2}/g) || []).length > 1) {
    const lastIdx = newReturn.lastIndexOf('20');
    if (lastIdx > 0) newReturn = newReturn.slice(lastIdx);
  }
  // approverName resolved from currentActor above
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
  if (!ticket || !ticket.pendingExtension) {
    if (typeof window.closeAllModals === 'function') window.closeAllModals();
    if (typeof window.showToast === 'function') {
      window.showToast('Permohonan perpanjangan sudah tidak aktif atau karyawan telah kembali ke area pabrik.', 'warning');
    }
    renderApproverView();
    return;
  }

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
  let tickets = window.ticketsList || [];
  const target = tickets.find(t => t.id === ticketId);
  if (!target) return;

  // Approver can delete/hide any ticket from tracking

  if (typeof isTicketUnderMySupervision === 'function' && !isTicketUnderMySupervision(target)) {
    if (typeof window.showToast === 'function') {
      window.showToast('Anda tidak memiliki wewenang atas tiket ini.', 'error');
    }
    return;
  }

  const handler = () => {
    let tickets = window.ticketsList || [];
    const target = tickets.find(t => t.id === ticketId);
    if (target) {
      const currentApprover = (typeof getCurrentApproverActor === 'function') ? getCurrentApproverActor() : null;
      const nip = currentApprover ? currentApprover.nip : null;
      if (!Array.isArray(target.deletedByApproverNips)) {
        target.deletedByApproverNips = [];
      }
      if (nip && !target.deletedByApproverNips.includes(nip)) {
        target.deletedByApproverNips.push(nip);
      }
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
        const who = currentApprover ? currentApprover.name : (isApprover2 ? 'Atasan 2 (Dewi Sartika)' : 'Atasan 1 (Ir. Hendra Gunawan)');
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
    const currentApprover = (typeof getCurrentApproverActor === 'function') ? getCurrentApproverActor() : null;
    const nip = currentApprover ? currentApprover.nip : null;
    finishedTickets.forEach(t => {
      if (!Array.isArray(t.deletedByApproverNips)) {
        t.deletedByApproverNips = [];
      }
      if (nip && !t.deletedByApproverNips.includes(nip)) {
        t.deletedByApproverNips.push(nip);
      }
      if (isApprover2) {
        t.deletedByApprover2 = true;
      } else {
        t.deletedByApprover1 = true;
      }
      t.deletedByApprover = true;
    });
    if (typeof window.saveTickets === 'function') {
      window.saveTickets(tickets);
    }
    if (typeof window.showToast === 'function') {
      const who = currentApprover ? currentApprover.name : (isApprover2 ? 'Atasan 2' : 'Atasan 1');
      window.showToast(`${finishedTickets.length} riwayat permohonan selesai telah dibersihkan dari riwayat ${who}.`, 'info');
    }
    renderApproverView();
  };

  if (typeof window.openDeleteConfirmModal === 'function') {
    window.openDeleteConfirmModal({
      title: 'Hapus Riwayat Selesai',
      message: `Hapus <strong>${finishedTickets.length}</strong> riwayat izin yang sudah selesai/diputuskan dari riwayat Atasan? Permohonan yang sedang aktif/berjalan tidak akan dihapus.`,
      onConfirm: handler
    });
  } else if (confirm(`Hapus ${finishedTickets.length} riwayat izin yang sudah selesai/diputuskan dari riwayat? Permohonan yang sedang aktif/berjalan tidak akan dihapus.`)) {
    handler();
  }
}

// Global View Switcher handlers for Approver
function setApproverViewMode(mode) {
  window.currentApproverViewMode = mode;
  const btnApproverViewCard = document.getElementById('btnApproverViewCard');
  const btnApproverViewTable = document.getElementById('btnApproverViewTable');
  if (btnApproverViewCard) btnApproverViewCard.classList.toggle('active', mode !== 'table');
  if (btnApproverViewTable) btnApproverViewTable.classList.toggle('active', mode === 'table');
  renderApproverView();
}

function setApproverRiwayatViewMode(mode) {
  window.currentApproverRiwayatViewMode = mode;
  const btnApproverRiwayatViewCard = document.getElementById('btnApproverRiwayatViewCard');
  const btnApproverRiwayatViewTable = document.getElementById('btnApproverRiwayatViewTable');
  if (btnApproverRiwayatViewCard) btnApproverRiwayatViewCard.classList.toggle('active', mode !== 'table');
  if (btnApproverRiwayatViewTable) btnApproverRiwayatViewTable.classList.toggle('active', mode === 'table');
  renderApproverView();
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
window.clearApproverRiwayatHistory = clearApproverTrackingHistory;
window.setApproverViewMode = setApproverViewMode;
window.setApproverRiwayatViewMode = setApproverRiwayatViewMode;
window.setApproverAntrianFilter = function (filterNature) {
  window.currentApproverAntrianFilter = filterNature || 'all';
  if (typeof window.renderApproverView === 'function') {
    window.renderApproverView();
  }
};

// Wire Filter and View Switcher listeners for Approver Pelacakan & Riwayat
document.addEventListener('DOMContentLoaded', () => {
  // 1. Pelacakan View Mode Switcher
  const btnApproverViewCard = document.getElementById('btnApproverViewCard');
  const btnApproverViewTable = document.getElementById('btnApproverViewTable');

  if (btnApproverViewCard) {
    btnApproverViewCard.addEventListener('click', () => {
      setApproverViewMode('card');
    });
  }

  if (btnApproverViewTable) {
    btnApproverViewTable.addEventListener('click', () => {
      setApproverViewMode('table');
    });
  }

  // 2. Riwayat View Mode Switcher
  const btnApproverRiwayatViewCard = document.getElementById('btnApproverRiwayatViewCard');
  const btnApproverRiwayatViewTable = document.getElementById('btnApproverRiwayatViewTable');

  if (btnApproverRiwayatViewCard) {
    btnApproverRiwayatViewCard.addEventListener('click', () => {
      setApproverRiwayatViewMode('card');
    });
  }

  if (btnApproverRiwayatViewTable) {
    btnApproverRiwayatViewTable.addEventListener('click', () => {
      setApproverRiwayatViewMode('table');
    });
  }

  // 3. Pelacakan Filter Listeners
  const searchApproverInput = document.getElementById('searchApproverInput');
  const filterApproverPeriod = document.getElementById('filterApproverPeriod');
  const sortApproverTracking = document.getElementById('sortApproverTracking');
  const filterApproverCategory = document.getElementById('filterApproverCategory');
  const filterApproverType = document.getElementById('filterApproverType');
  const filterApproverStatus = document.getElementById('filterApproverStatus');

  [searchApproverInput, filterApproverPeriod, sortApproverTracking, filterApproverCategory, filterApproverType, filterApproverStatus].forEach(el => {
    if (el) {
      el.addEventListener('input', () => {
        window.appPelacakanCurrentPage = 1;
        renderApproverView();
      });
      el.addEventListener('change', () => {
        window.appPelacakanCurrentPage = 1;
        renderApproverView();
      });
    }
  });

  // 4. Riwayat Filter Listeners
  const searchApproverRiwayatInput = document.getElementById('searchApproverRiwayatInput');
  const filterApproverRiwayatPeriod = document.getElementById('filterApproverRiwayatPeriod');
  const sortApproverRiwayat = document.getElementById('sortApproverRiwayat');
  const filterApproverRiwayatCategory = document.getElementById('filterApproverRiwayatCategory');
  const filterApproverRiwayatType = document.getElementById('filterApproverRiwayatType');
  const filterApproverRiwayatStatus = document.getElementById('filterApproverRiwayatStatus');

  [searchApproverRiwayatInput, filterApproverRiwayatPeriod, sortApproverRiwayat, filterApproverRiwayatCategory, filterApproverRiwayatType, filterApproverRiwayatStatus].forEach(el => {
    if (el) {
      el.addEventListener('input', () => {
        window.appRiwayatCurrentPage = 1;
        renderApproverView();
      });
      el.addEventListener('change', () => {
        window.appRiwayatCurrentPage = 1;
        renderApproverView();
      });
    }
  });
});

// ==========================================
// ATASAN RETURN / ARRIVAL VERIFICATION
// ==========================================
window.confirmArrivalByApprover = function(ticketId) {
  const ticketsList = window.ticketsList || [];
  const t = ticketsList.find(x => x.id === ticketId);
  if (!t) return;

  const currentApprover = (typeof getCurrentApproverActor === 'function' ? getCurrentApproverActor() : null) || { name: t.approverName || 'Atasan Peninjau' };
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

  const arrivalTime = t.tapInTime || t.arrivalReportedTime || t.arrivalReportedAt || t.reportedReturnTime || nowFormatted;

  let wasOverdue = false;
  if (t.estimatedReturn) {
    try {
      const estD = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(t.estimatedReturn) : new Date(t.estimatedReturn);
      // Validasi keterlambatan membandingkan waktu tap in yang terkunci di gerbang, BUKAN waktu atasan membuka aplikasi
      const tapInD = (t.tapInTime && typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(t.tapInTime) : now;
      if (tapInD && estD && !isNaN(tapInD.getTime()) && !isNaN(estD.getTime())) {
        if (tapInD.getTime() > estD.getTime()) wasOverdue = true;
      }
    } catch(e) {}
  }

  t.status = 'Selesai';
  t.scanInTime = `${arrivalTime} (Dikonfirmasi Atasan: ${currentApprover.name})${wasOverdue ? ' [Terlambat]' : ''}`;
  if (wasOverdue) t.isLate = true;

  if (!t.timeline) t.timeline = [];
  t.timeline.push({
    event: 'Kedatangan Dikonfirmasi Atasan (Selesai)',
    time: nowFormatted,
    by: `${currentApprover.name} (Atasan)`,
    desc: `Kehadiran fisik karyawan di area kerja telah diverifikasi langsung oleh Atasan (${currentApprover.name}) dengan waktu Tap In gerbang terkunci (${arrivalTime}). Izin resmi selesai.`
  });

  if (typeof window.saveTickets === 'function') window.saveTickets(ticketsList);

  if (typeof window.createNotification === 'function') {
    if (!t.initiatorCancelled && t.applicantNip) {
      window.createNotification({
        recipientRole: 'karyawan',
        recipientNip: t.applicantNip,
        recipientName: t.applicantName || 'Pemohon',
        actorSource: 'approver',
        type: 'selesai',
        title: 'Izin Resmi Selesai',
        message: `Atasan (${currentApprover.name}) telah memverifikasi kehadiran Anda di ruangan. Tiket #${t.id} resmi selesai.`,
        ticketId: t.id,
        priority: 'normal',
        eventId: `arr_conf_${t.id}_${Date.now()}`
      });
    }

    if (t.isGroupDinas && Array.isArray(t.members)) {
      t.members.filter(m => m.status !== 'batal' && m.status !== 'cancelled' && m.nip).forEach(m => {
        window.createNotification({
          recipientRole: 'karyawan',
          recipientNip: m.nip,
          recipientName: m.name,
          actorSource: 'approver',
          type: 'selesai',
          title: 'Izin Dinas Selesai',
          message: `Atasan (${currentApprover.name}) telah memverifikasi kepulangan tim dinas Anda. Tiket #${t.id} resmi selesai.`,
          ticketId: t.id,
          priority: 'normal',
          eventId: `arr_conf_${t.id}_${m.nip}_${Date.now()}`
        });
      });
    }
  }

  if (typeof window.showToast === 'function') {
    window.showToast(`Kehadiran ${t.applicantName || 'karyawan'} berhasil diverifikasi! Tiket #${t.id} resmi Selesai.`, 'success');
  }

  if (typeof window.renderApproverView === 'function') window.renderApproverView();
  if (typeof window.updateApproverMetrics === 'function') window.updateApproverMetrics();
  if (typeof window.renderMobileApprover === 'function') window.renderMobileApprover();
  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
};

function formatArrivalRealtimeWib(dateObj) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const pad = n => String(n).padStart(2, '0');
  const d = dateObj || new Date();
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())} WIB`;
}

window.rejectArrivalByApprover = function(ticketId) {
  const ticketsList = window.ticketsList || [];
  const t = ticketsList.find(x => x.id === ticketId);
  if (!t) return;

  window._pendingRejectArrivalTicketId = ticketId;
  const modal = document.getElementById('modalRejectArrivalReason');
  if (!modal) return;

  const tkEl = document.getElementById('rejectArrivalTicketId');
  const nameEl = document.getElementById('rejectArrivalEmployeeName');
  const lockEl = document.getElementById('rejectArrivalLockedTime');
  const inputEl = document.getElementById('rejectArrivalReasonInput');
  const errEl = document.getElementById('rejectArrivalReasonError');

  if (tkEl) tkEl.textContent = `#${t.id}`;
  if (nameEl) nameEl.textContent = t.applicantName || 'Pemohon';
  if (lockEl) lockEl.textContent = t.tapInTime || t.arrivalReportedTime || t.arrivalReportedAt || t.reportedReturnTime || 'Terkunci';
  if (inputEl) inputEl.value = '';
  if (errEl) errEl.style.display = 'none';

  modal.classList.add('open');
  setTimeout(() => { if (inputEl) inputEl.focus(); }, 60);
};

window.closeRejectArrivalReasonModal = function() {
  const modal = document.getElementById('modalRejectArrivalReason');
  if (modal) modal.classList.remove('open');
  window._pendingRejectArrivalTicketId = null;
};

window.submitRejectArrivalReason = function() {
  const ticketId = window._pendingRejectArrivalTicketId;
  if (!ticketId) return;

  const inputEl = document.getElementById('rejectArrivalReasonInput');
  const errEl = document.getElementById('rejectArrivalReasonError');
  const reason = inputEl ? inputEl.value.trim() : '';

  if (!reason) {
    if (errEl) errEl.style.display = 'block';
    if (inputEl) inputEl.focus();
    if (typeof window.showToast === 'function') {
      window.showToast('Alasan wajib diisi sebelum mengirim permintaan bukti foto.', 'warning');
    }
    return;
  }
  if (errEl) errEl.style.display = 'none';

  executeRejectArrivalByApprover(ticketId, reason);
};

function executeRejectArrivalByApprover(ticketId, reason) {
  const ticketsList = window.ticketsList || [];
  const t = ticketsList.find(x => x.id === ticketId);
  if (!t) return;

  const currentApprover = (typeof getCurrentApproverActor === 'function' ? getCurrentApproverActor() : null) || { name: t.approverName || 'Atasan Peninjau' };
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;
  const nowRealtimeFull = formatArrivalRealtimeWib(now);
  const lockedGateTime = t.tapInTime || t.arrivalReportedTime || t.arrivalReportedAt || t.reportedReturnTime || nowFormatted;

  // KUNCI WAKTU & HARI TETAP PERTAHANKAN (Dilarang menghapus t.tapInTime / t.timeFrozen)
  t.timeFrozen = true;
  if (!t.tapInTime && lockedGateTime) t.tapInTime = lockedGateTime;
  t.arrivalRejectionRound = (t.arrivalRejectionRound || 0) + 1;
  t.status = 'Menunggu Bukti Kedatangan';
  t.arrivalRejectReason = reason;
  t.arrivalRejectBy = currentApprover.name;
  t.arrivalRejectAt = nowRealtimeFull;
  t.arrivalProofSubmitted = false;

  if (!Array.isArray(t.arrivalVerificationHistory)) t.arrivalVerificationHistory = [];
  t.arrivalVerificationHistory.push({
    round: t.arrivalRejectionRound,
    type: 'rejected_by_approver',
    by: currentApprover.name,
    reason,
    time: nowRealtimeFull,
    lockedTapInTime: lockedGateTime
  });

  if (!t.timeline) t.timeline = [];
  t.timeline.push({
    event: `Konfirmasi Belum Tiba (Putaran #${t.arrivalRejectionRound})`,
    time: nowFormatted,
    by: `${currentApprover.name} (Atasan)`,
    desc: `Atasan menandai personel belum tiba dengan alasan: "${reason}". Waktu Tap In (${lockedGateTime}) tetap terkunci & sistem meminta karyawan mengunggah foto bukti real-time.`
  });

  if (typeof window.saveTickets === 'function') window.saveTickets(ticketsList);

  if (typeof window.createNotification === 'function') {
    if (!t.initiatorCancelled && t.applicantNip) {
      window.createNotification({
        recipientRole: 'karyawan',
        recipientNip: t.applicantNip,
        recipientName: t.applicantName || 'Pemohon',
        actorSource: 'approver',
        type: 'peringatan',
        title: 'Diminta Upload Foto Bukti Kedatangan',
        message: `${currentApprover.name} menandai belum tiba: "${reason}". Buka Pengajuan Saya & unggah foto bukti real-time untuk mengirim kembali ke Atasan.`,
        ticketId: t.id,
        priority: 'urgent',
        eventId: `arr_req_proof_${t.id}_r${t.arrivalRejectionRound}_${Date.now()}`
      });
    }

    if (t.isGroupDinas && Array.isArray(t.members)) {
      t.members.filter(m => m.status !== 'batal' && m.status !== 'cancelled' && m.nip).forEach(m => {
        window.createNotification({
          recipientRole: 'karyawan',
          recipientNip: m.nip,
          recipientName: m.name,
          actorSource: 'approver',
          type: 'peringatan',
          title: 'Diminta Upload Foto Bukti Kedatangan',
          message: `${currentApprover.name} menandai tim dinas #${t.id} belum tiba: "${reason}". Salah satu personel tim wajib mengunggah foto bukti real-time di Pengajuan Saya.`,
          ticketId: t.id,
          priority: 'urgent',
          eventId: `arr_req_proof_${t.id}_r${t.arrivalRejectionRound}_${m.nip}_${Date.now()}`
        });
      });
    }
  }

  window.closeRejectArrivalReasonModal();
  const detailModal = document.getElementById('modalTicketDetail');
  if (detailModal && detailModal.classList.contains('open')) {
    if (typeof window.openTicketDetail === 'function') window.openTicketDetail(t.id, 'detail');
  }

  if (typeof window.showToast === 'function') {
    window.showToast(`Alasan terkirim! Karyawan diminta mengunggah foto bukti untuk #${t.id}. Waktu Tap In tetap terkunci.`, 'warning');
  }

  if (typeof window.renderApproverView === 'function') window.renderApproverView();
  if (typeof window.updateApproverMetrics === 'function') window.updateApproverMetrics();
  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
  if (typeof window.renderMobileActiveView === 'function') {
    window.renderMobileActiveView();
  } else {
    if (typeof window.renderMobileApprover === 'function') window.renderMobileApprover();
    if (typeof window.renderMobileKaryawan === 'function') window.renderMobileKaryawan();
  }
}
