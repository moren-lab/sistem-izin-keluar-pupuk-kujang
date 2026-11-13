
// Collapsible Detail Content Toggle (Identik Gambar 1 Pengguna)
window.toggleDetailExpand = function (targetId, btn) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const isExpanded = el.getAttribute('data-expanded') === 'true';
  if (isExpanded) {
    el.setAttribute('data-expanded', 'false');
    el.style.display = '-webkit-box';
    el.style.webkitLineClamp = '3';
    el.style.webkitBoxOrient = 'vertical';
    el.style.overflow = 'hidden';
    if (btn) btn.innerHTML = 'Lihat selengkapnya ∨';
  } else {
    el.setAttribute('data-expanded', 'true');
    el.style.display = 'block';
    el.style.webkitLineClamp = 'none';
    el.style.overflow = 'visible';
    if (btn) btn.innerHTML = 'Tutup ∧';
  }
};

// Deteksi overflow DOM nyata untuk teks panjang (Hanya muncul jika benar-benar terpotong vertikal)
function checkAndApplyTextExpand(elementId, buttonId) {
  const el = document.getElementById(elementId);
  const btn = document.getElementById(buttonId);
  if (!el) return;

  // Reset awal ke status ter-clamp 3 baris
  el.setAttribute('data-expanded', 'false');
  el.style.display = '-webkit-box';
  el.style.webkitLineClamp = '3';
  el.style.webkitBoxOrient = 'vertical';
  el.style.overflow = 'hidden';
  if (btn) btn.style.display = 'none';

  // Ukur setelah siklus render DOM selesai
  setTimeout(() => {
    // Jika modal tidak tampak atau elemen belum memiliki tinggi (0px), jangan tampilkan tombol
    if (el.clientHeight === 0) {
      if (btn) btn.style.display = 'none';
      return;
    }

    // scrollHeight > clientHeight menandakan teks benar-benar melebihi kapasitas 3 baris
    const isOverflowing = el.scrollHeight > (el.clientHeight + 2);
    if (isOverflowing) {
      if (btn) {
        btn.style.display = 'inline-block';
        btn.innerHTML = 'Lihat selengkapnya ∨';
      }
    } else {
      // Teks muat sepenuhnya dalam kotak tanpa terpotong
      el.style.display = 'block';
      el.style.webkitLineClamp = 'none';
      el.style.overflow = 'visible';
      if (btn) {
        btn.style.display = 'none';
      }
    }
  }, 40);
}
window.checkAndApplyTextExpand = checkAndApplyTextExpand;
// Helper untuk mendapatkan identitas Karyawan aktif pembuat aksi / pengajuan
function getActiveEmployeeActorInfo() {
  if (typeof window.getCurrentEmployeeActor === 'function') {
    const act = window.getCurrentEmployeeActor();
    if (act) return act;
  }
  const isK2 = (window.currentActor === 'karyawan2');
  if (isK2 && window.ACTORS && window.ACTORS.karyawan2) {
    return window.ACTORS.karyawan2;
  }
  return (window.ACTORS && window.ACTORS.karyawan) || { name: 'Budi Pratama, S.T.', nip: 'PK-2024-8841', approverName: 'Ir. Hendra Gunawan, M.T.' };
}
window.getActiveEmployeeActorInfo = getActiveEmployeeActorInfo;

/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Modals Controller: New Request (Option C Enforcement), Active Blocked Modal,
 * Digital Pass & QR Code Generator, Ticket Detail Modal, Cancel Request, Emergency Pass
 */

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

// OPTION C: INTERCEPT NEW REQUEST IF EMPLOYEE ALREADY HAS AN ACTIVE TICKET
function handleOpenNewRequest() {
  const activeTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : null;
  const modalActiveBlocked = document.getElementById('modalActiveBlocked');
  const modalNewRequest = document.getElementById('modalNewRequest');

  if (activeTicket) {
    const blockedTicketId = document.getElementById('blockedTicketId');
    const blockedContainer = document.getElementById('blockedTicketStatusContainer');
    const btnBlockedViewTicket = document.getElementById('btnBlockedViewTicket');
    const btnBlockedEditTicket = document.getElementById('btnBlockedEditTicket');
    const btnBlockedCancelTicket = document.getElementById('btnBlockedCancelTicket');
    const modalBlockedTitle = modalActiveBlocked ? modalActiveBlocked.querySelector('.modal-header h3') : null;
    const modalBlockedDesc = modalActiveBlocked ? modalActiveBlocked.querySelector('.modal-header p') : null;

    if (modalBlockedTitle) modalBlockedTitle.textContent = 'Pengajuan Baru Ditangguhkan';
    if (modalBlockedDesc) modalBlockedDesc.textContent = 'Ketentuan Pembatasan Izin Aktif Karyawan';
    if (blockedTicketId) blockedTicketId.textContent = activeTicket.id;
    if (blockedContainer) {
      blockedContainer.innerHTML = window.getStatusPill(activeTicket.status);
    }

    if (btnBlockedViewTicket) {
      btnBlockedViewTicket.onclick = () => {
        if (modalActiveBlocked) modalActiveBlocked.classList.remove('open');
        if (activeTicket.isEmergency && activeTicket.emergencyLocked) {
          window.openEmergencyUnlockModal(activeTicket.id, activeTicket.selectedMethod || 'app');
        } else {
          openTicketDetail(activeTicket.id, 'detail');
        }
      };
    }

    const isEmergLocked = activeTicket.isEmergency && (activeTicket.emergencyLocked || activeTicket.status === 'Menunggu Otorisasi Darurat');
    const canCancel = activeTicket.status === 'Menunggu Persetujuan' || activeTicket.status === 'Menunggu Otorisasi Darurat' || isEmergLocked || (activeTicket.status === 'Disetujui' && !activeTicket.scanOutTime) || activeTicket.status === 'Kedaluwarsa';
    const canEdit = (activeTicket.status === 'Menunggu Persetujuan' || activeTicket.status === 'Menunggu Otorisasi Darurat' || isEmergLocked) && !activeTicket.scanOutTime && activeTicket.status !== 'Disetujui';

    if (btnBlockedEditTicket) {
      if (canEdit) {
        btnBlockedEditTicket.style.display = 'inline-flex';
        btnBlockedEditTicket.onclick = () => {
          if (modalActiveBlocked) modalActiveBlocked.classList.remove('open');
          openEditTicketModal(activeTicket.id);
        };
      } else {
        btnBlockedEditTicket.style.display = 'none';
        btnBlockedEditTicket.onclick = null;
      }
    }

    if (btnBlockedCancelTicket) {
      btnBlockedCancelTicket.style.display = 'inline-flex';
      if (canCancel) {
        btnBlockedCancelTicket.textContent = 'Batalkan Izin Ini';
        btnBlockedCancelTicket.onclick = () => {
          if (modalActiveBlocked) modalActiveBlocked.classList.remove('open');
          openCancelModal(activeTicket.id);
        };
      } else {
        btnBlockedCancelTicket.textContent = 'Selesaikan Izin (Tap In Kartu Akses)';
        btnBlockedCancelTicket.onclick = () => {
          if (modalActiveBlocked) modalActiveBlocked.classList.remove('open');
          if (typeof window.executeScanIn === 'function') {
            window.executeScanIn(activeTicket.id);
          }
        };
      }
    }

    const btnBlockedCancelAndNew = document.getElementById('btnBlockedCancelAndNew');
    if (btnBlockedCancelAndNew) {
      if (canCancel) {
        btnBlockedCancelAndNew.style.display = 'inline-flex';
        btnBlockedCancelAndNew.onclick = () => {
          if (modalActiveBlocked) modalActiveBlocked.classList.remove('open');
          activeTicket.status = 'Dibatalkan';
          if (!activeTicket.timeline) activeTicket.timeline = [];
          const now = new Date();
          const pad = (n) => String(n).padStart(2, '0');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
          const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;
          activeTicket.timeline.unshift({
            event: 'Izin Dibatalkan (Buat Baru)',
            time: nowFormatted,
            by: `${getActiveEmployeeActorInfo().name} (Karyawan)`,
            desc: `Izin dibatalkan oleh pemohon agar dapat mengajukan izin baru.`
          });
          window.saveTickets(window.ticketsList || []);
          if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
          if (typeof window.showToast === 'function') {
            window.showToast(`Izin #${activeTicket.id} telah dibatalkan. Membuka formulir pengajuan baru...`, 'info');
          }
          setTimeout(() => {
            handleOpenNewRequest();
          }, 100);
        };
      } else {
        btnBlockedCancelAndNew.style.display = 'none';
        btnBlockedCancelAndNew.onclick = null;
      }
    }

    if (modalActiveBlocked) modalActiveBlocked.classList.add('open');
    if (typeof window.showToast === 'function') {
      window.showToast(`Pengajuan baru ditangguhkan: Anda masih memiliki izin aktif (${activeTicket.id})!`, 'danger');
    }
    return;
  }

  // Bersihkan mode edit untuk pengajuan baru
  window.editingTicketId = null;
  const btnCancelFormRegular = document.getElementById('btnCancelFormRegular');
  if (btnCancelFormRegular) btnCancelFormRegular.style.display = 'none';
  const modalTitle = modalNewRequest ? modalNewRequest.querySelector('.modal-header h3') : null;
  const modalDesc = modalNewRequest ? modalNewRequest.querySelector('.modal-header p') : null;
  const btnSubmitNewRequest = document.getElementById('btnSubmitNewRequest');
  if (modalTitle) modalTitle.textContent = 'Formulir Pengajuan Izin Keluar';
  if (modalDesc) modalDesc.textContent = 'Lengkapi detail perizinan Anda di bawah ini';
  if (btnSubmitNewRequest) btnSubmitNewRequest.textContent = 'Lanjutkan';

  const formNewRequest = document.getElementById('formNewRequest');
  if (formNewRequest) formNewRequest.reset();

  const modalNewSubtitle = document.getElementById('modalNewSubtitle');
  if (modalNewSubtitle) {
    const curEmp = (typeof window.getCurrentEmployeeActor === 'function') ? window.getCurrentEmployeeActor() : null;
    if (curEmp) {
      modalNewSubtitle.textContent = `${curEmp.name} — ${curEmp.nip} — ${curEmp.department || 'Rekayasa & Pemeliharaan'}`;
    }
  }

  // Reset dropdowns & fields agar form benar-benar kosong saat pertama kali dibuka
  const selectReqCategory = document.getElementById('selectReqCategory');
  const selectReqType = document.getElementById('selectReqType');
  const inputDestination = document.getElementById('inputDestination');
  const inputReason = document.getElementById('inputReason');
  const groupEstimatedReturn = document.getElementById('groupEstimatedReturn');
  const groupDinasWrapper = document.getElementById('groupDinasMembersWrapper');
  if (groupDinasWrapper) groupDinasWrapper.style.display = 'none';
  if (typeof window.resetAllDinasUploadState === 'function') {
    window.resetAllDinasUploadState();
  }
  if (selectReqCategory) selectReqCategory.value = '';
  if (selectReqType) {
    selectReqType.value = '';
    selectReqType.dispatchEvent(new Event('change'));
  }
  if (inputDestination) { inputDestination.value = ''; const c = document.getElementById('countInputDestination'); if (c) c.textContent = '0'; }
  if (inputReason) inputReason.value = '';
  if (groupEstimatedReturn) groupEstimatedReturn.style.display = 'block';

  initFormDates();
  if (typeof window.syncApproversToForms === 'function') {
    window.syncApproversToForms();
  }
  // Tidak memilih atasan secara default agar form bersih sebelum diisi pengguna
  if (typeof window.resetApproverSearch === 'function') {
    window.resetApproverSearch();
  }

  const primaryApprover = typeof window.getPrimaryApprover === 'function' ? window.getPrimaryApprover() : null;
  const approverDirectNotice = document.getElementById('approverDirectNotice');
  if (approverDirectNotice) {
    if (primaryApprover && primaryApprover.name) {
      approverDirectNotice.style.background = '#eff6ff';
      approverDirectNotice.style.borderColor = '#dbeafe';
      approverDirectNotice.style.color = '#1d4ed8';
      approverDirectNotice.innerHTML = `
        <span style="font-size: 0.95rem;">ℹ️</span>
        <span>Pengajuan diteruskan kepada atasan (<strong>${primaryApprover.name}</strong>) atau pilih atasan peninjau aktif di bawah. QR terbit setelah izin disetujui.</span>
      `;
    } else {
      approverDirectNotice.style.background = '#fff1f2';
      approverDirectNotice.style.borderColor = '#fecdd3';
      approverDirectNotice.style.color = '#9f1239';
      approverDirectNotice.innerHTML = `
        <span style="font-size: 0.95rem;">⚠️</span>
        <span>Silakan ketik dan pilih salah satu atasan peninjau aktif di bawah untuk memproses izin keluar area.</span>
      `;
    }
  }

  if (modalNewRequest) modalNewRequest.classList.add('open');
}

// ===================================================================
// FITUR EDIT PENGAJUAN (BIASA & DARURAT SEBELUM DISETUJUI ATASAN)
// ===================================================================

function openEditTicketModal(ticketId) {
  const isKaryawanActor = (window.currentActor === 'karyawan' || window.currentActor === 'karyawan2' || !window.currentActor);
  if (!isKaryawanActor) {
    if (typeof window.showToast === 'function') {
      window.showToast('Pengajuan izin hanya dapat diedit oleh Karyawan (pemohon).', 'warning');
    }
    return;
  }

  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) {
    if (typeof window.showToast === 'function') window.showToast('Data tiket tidak ditemukan.', 'danger');
    return;
  }

  // Jika izin dinas bersama, hanya inisiator utama yang berhak mengubah rincian pengajuan
  const activeEmpActor = typeof getCurrentEmployeeActor === 'function' ? getCurrentEmployeeActor() : null;
  const myEmpNip = activeEmpActor ? activeEmpActor.nip : 'PK-2024-8841';
  if (ticket.isGroupDinas && ticket.applicantNip !== myEmpNip && (ticket.initiatorNip && ticket.initiatorNip !== myEmpNip)) {
    if (typeof window.showToast === 'function') {
      window.showToast('Hanya inisiator pengajuan yang berhak mengubah rincian izin dinas tim.', 'warning');
    }
    return;
  }

  // Tiket yang sudah berada di riwayat (status final) tidak boleh diedit sama sekali
  const FINISHED_STATUSES = ['Selesai', 'Dibatalkan', 'Ditolak', 'Kedaluwarsa'];
  if (FINISHED_STATUSES.includes(ticket.status)) {
    if (typeof window.showToast === 'function') {
      window.showToast(`Tiket berstatus "${ticket.status}" sudah berada di riwayat dan tidak dapat diedit lagi!`, 'warning');
    }
    return;
  }

  // Hanya boleh diedit sebelum disetujui atasan dan sebelum scan out di pos jaga
  const isPending = (ticket.status === 'Menunggu Persetujuan' || ticket.status === 'Menunggu Otorisasi Darurat' || (ticket.isEmergency && ticket.emergencyLocked && !FINISHED_STATUSES.includes(ticket.status)));
  if (!isPending || ticket.scanOutTime || ticket.status === 'Disetujui') {
    if (typeof window.showToast === 'function') {
      window.showToast('Tiket ini sudah disetujui / diproses dan tidak dapat diedit lagi!', 'warning');
    }
    return;
  }

  // Tutup modal detail atau unlock jika sedang terbuka
  const modalTicketDetail = document.getElementById('modalTicketDetail');
  if (modalTicketDetail) modalTicketDetail.classList.remove('open');
  const modalEmergencyUnlock = document.getElementById('modalEmergencyUnlock');
  if (modalEmergencyUnlock) modalEmergencyUnlock.classList.remove('open');

  if (ticket.isEmergency || (ticket.id && ticket.id.includes('-EMG-'))) {
    openEditEmergencyModal(ticket);
  } else {
    openEditNormalModal(ticket);
  }
}

function openEditNormalModal(ticket) {
  window.editingTicketId = ticket.id;

  const karyawanFullFormContainer = document.getElementById('karyawanFullFormContainer');
  const karyawanActiveTicketWrapper = document.getElementById('karyawanActiveTicketWrapper');
  if (karyawanFullFormContainer && karyawanActiveTicketWrapper) {
    karyawanActiveTicketWrapper.style.display = 'none';
    karyawanFullFormContainer.style.display = 'block';
    const btnRegular = document.getElementById('btnFullTypeRegular');
    const btnEmergency = document.getElementById('btnFullTypeEmergency');
    const panelRegular = document.getElementById('panelFullRegular');
    const panelEmergency = document.getElementById('panelFullEmergency');
    if (btnRegular) btnRegular.classList.add('active');
    if (btnEmergency) btnEmergency.classList.remove('active', 'emergency');
    if (panelRegular) panelRegular.style.display = 'block';
    if (panelEmergency) panelEmergency.style.display = 'none';
  }

  const modalNewRequest = document.getElementById('modalNewRequest');
  const modalTitle = modalNewRequest ? modalNewRequest.querySelector('.modal-header h3') : null;
  const modalDesc = modalNewRequest ? modalNewRequest.querySelector('.modal-header p') : null;
  const btnSubmitNewRequest = document.getElementById('btnSubmitNewRequest');
  const btnCancelFormRegular = document.getElementById('btnCancelFormRegular');
  if (btnCancelFormRegular) btnCancelFormRegular.style.display = 'inline-flex';

  if (modalTitle) modalTitle.textContent = `Edit Pengajuan Izin — ${ticket.id}`;
  if (modalDesc) modalDesc.textContent = 'Perbarui data formulir izin keluar Anda sebelum disetujui Atasan';
  if (btnSubmitNewRequest) btnSubmitNewRequest.textContent = 'Lanjutkan & Simpan Perubahan';

  // 1. Pilih atasan langsung (combobox)
  if (typeof window.syncApproversToForms === 'function') {
    window.syncApproversToForms();
  }
  const activeAppsForEdit = typeof window.getActiveApprovers === 'function' ? window.getActiveApprovers() : [];
  const targetApp = activeAppsForEdit.find(a => a.name === ticket.approverName) || activeAppsForEdit[0];
  if (targetApp && typeof window.chooseApproverByName === 'function') {
    window.chooseApproverByName(targetApp.name, true);
  }

  // 2. Kategori Keperluan & Tipe Kepulangan
  const selectReqCategory = document.getElementById('selectReqCategory');
  const selectReqType = document.getElementById('selectReqType');
  const groupEstimatedReturn = document.getElementById('groupEstimatedReturn');
  if (selectReqCategory) selectReqCategory.value = ticket.category || 'Dinas Perusahaan';
  if (selectReqType) {
    selectReqType.value = ticket.type || 'Kembali ke Area';
    selectReqType.dispatchEvent(new Event('change'));
    if (groupEstimatedReturn) {
      groupEstimatedReturn.style.display = ticket.type === 'Pulang Mendahului' ? 'none' : 'block';
    }
  }

  // 3. Lokasi / Tujuan Keluar & 4. Alasan Keperluan Izin
  const inputDestination = document.getElementById('inputDestination');
  const inputReason = document.getElementById('inputReason');
  if (inputDestination) { inputDestination.value = ticket.destination || ''; const c = document.getElementById('countInputDestination'); if (c) c.textContent = inputDestination.value.length; }
  if (inputReason) inputReason.value = ticket.reason || '';

  // 5. Rencana Waktu Keluar & 6. Perkiraan Waktu Kembali
  const inputPlannedExit = document.getElementById('inputPlannedExit');
  const inputEstimatedReturn = document.getElementById('inputEstimatedReturn');
  if (inputPlannedExit && ticket.plannedExit) {
    inputPlannedExit.value = ticket.plannedExit;
  }
  if (inputEstimatedReturn && ticket.estimatedReturn) {
    inputEstimatedReturn.value = ticket.estimatedReturn;
  }

  // 7. Anggota Rombongan & Surat Perintah (Khusus Dinas Kantor)
  window._selectedGroupMembers = (ticket.isGroupDinas && Array.isArray(ticket.members))
    ? ticket.members.filter(m => m.status !== 'batal').map(m => ({ ...m }))
    : [];
  window._currentSuratPerintah = ticket.suratPerintah ? { ...ticket.suratPerintah } : null;

  if (typeof window.initGroupDinasMembersForm === 'function') {
    window.initGroupDinasMembersForm();
  }
  if (typeof window.renderSelectedGroupMembers === 'function') {
    window.renderSelectedGroupMembers();
  }
  if (typeof window.renderSuratPerintahPreview === 'function') {
    window.renderSuratPerintahPreview();
  }

  if (modalNewRequest) modalNewRequest.classList.add('open');
}

function openEditEmergencyModal(ticket) {
  window.editingEmergencyTicketId = ticket.id;

  const karyawanFullFormContainer = document.getElementById('karyawanFullFormContainer');
  const karyawanActiveTicketWrapper = document.getElementById('karyawanActiveTicketWrapper');
  if (karyawanFullFormContainer && karyawanActiveTicketWrapper) {
    karyawanActiveTicketWrapper.style.display = 'none';
    karyawanFullFormContainer.style.display = 'block';
    const btnRegular = document.getElementById('btnFullTypeRegular');
    const btnEmergency = document.getElementById('btnFullTypeEmergency');
    const panelRegular = document.getElementById('panelFullRegular');
    const panelEmergency = document.getElementById('panelFullEmergency');
    if (btnEmergency) btnEmergency.classList.add('active', 'emergency');
    if (btnRegular) btnRegular.classList.remove('active');
    if (panelRegular) panelRegular.style.display = 'none';
    if (panelEmergency) panelEmergency.style.display = 'block';
  }

  const modalEmergency = document.getElementById('modalEmergency');
  const modalTitle = document.getElementById('modalEmergencyTitle');
  const modalSubtitle = document.getElementById('modalEmergencySubtitle');
  const btnSubmitEmergency = document.getElementById('btnSubmitEmergency');
  const btnCancelFormEmergency = document.getElementById('btnCancelFormEmergency');
  if (btnCancelFormEmergency) btnCancelFormEmergency.style.display = 'inline-flex';

  if (modalTitle) {
    modalTitle.innerHTML = `<span>Edit Formulir Izin Darurat — ${ticket.id}</span>`;
  }
  if (modalSubtitle) {
    modalSubtitle.textContent = 'Perbarui detail kedaruratan & metode otorisasi sebelum disetujui Atasan';
  }
  if (btnSubmitEmergency) {
    btnSubmitEmergency.textContent = 'Simpan Perubahan Darurat';
  }

  // 1. Pilih atasan untuk Notifikasi & Pelacakan
  if (typeof window.syncApproversToForms === 'function') {
    window.syncApproversToForms();
  }
  const activeEmergAppsForEdit = typeof window.getActiveApprovers === 'function' ? window.getActiveApprovers() : [];
  const targetEmergApp = activeEmergAppsForEdit.find(a => a.name === ticket.approverName) || activeEmergAppsForEdit[0];
  if (targetEmergApp && typeof window.chooseEmergApproverByName === 'function') {
    window.chooseEmergApproverByName(targetEmergApp.name, true);
  }

  // 2. Kategori Keperluan & Tipe Kepulangan
  const selectEmergCategory = document.getElementById('selectEmergCategory');
  const selectEmergType = document.getElementById('selectEmergType');
  const emergGroupEstimatedReturn = document.getElementById('emergGroupEstimatedReturn');
  if (selectEmergCategory) selectEmergCategory.value = ticket.category || 'Dinas Kantor';
  if (selectEmergType) {
    selectEmergType.value = ticket.type || 'Kembali ke Area';
    selectEmergType.dispatchEvent(new Event('change'));
    if (emergGroupEstimatedReturn) {
      emergGroupEstimatedReturn.style.display = ticket.type === 'Pulang Mendahului' ? 'none' : 'block';
    }
  }

  // 3. Lokasi / Tujuan Keluar & 4. Alasan Kedaruratan
  const emergDest = document.getElementById('emergDest');
  const emergReason = document.getElementById('emergReason');
  if (emergDest) { emergDest.value = ticket.destination || ''; const c = document.getElementById('countEmergDest'); if (c) c.textContent = emergDest.value.length; }
  if (emergReason) emergReason.value = ticket.reason || '';

  // 5. Rencana Waktu Keluar & 6. Perkiraan Waktu Kembali
  const emergPlannedExit = document.getElementById('emergPlannedExit');
  const emergEstimatedReturn = document.getElementById('emergEstimatedReturn');
  if (emergPlannedExit && ticket.plannedExit) {
    emergPlannedExit.value = ticket.plannedExit;
  }
  if (emergEstimatedReturn && ticket.estimatedReturn) {
    emergEstimatedReturn.value = ticket.estimatedReturn;
  }

  // 7. Pilih Metode Otorisasi Buka Kunci QR (Tepat satu metode)
  const method = ticket.selectedMethod || 'app';
  const optEmergMethodApp = document.getElementById('optEmergMethodApp');
  const optEmergMethodFaceScan = document.getElementById('optEmergMethodFaceScan');
  [optEmergMethodApp, optEmergMethodFaceScan].forEach(c => c && c.classList.remove('selected'));
  if (method === 'facescan' && optEmergMethodFaceScan) {
    optEmergMethodFaceScan.click();
  } else if (optEmergMethodApp) {
    optEmergMethodApp.click();
  }

  if (modalEmergency) modalEmergency.classList.add('open');
}

function setupRadioToggles() {
  // Dropdown Kategori Keperluan (Form Pengajuan Biasa)
  const selectReqCategory = document.getElementById('selectReqCategory');
  if (selectReqCategory) {
    selectReqCategory.addEventListener('change', () => {
      const isDinas = isDinasCategory(selectReqCategory.value);
      const inputPlannedExit = document.getElementById('inputPlannedExit');
      const inputEstimatedReturn = document.getElementById('inputEstimatedReturn');
      const groupDinasWrapper = document.getElementById('groupDinasMembersWrapper');

      if (selectReqCategory.value === 'Dinas Kantor') {
        if (groupDinasWrapper) groupDinasWrapper.style.display = 'block';
        if (typeof window.initGroupDinasMembersForm === 'function') {
          window.initGroupDinasMembersForm();
        }
      } else {
        if (groupDinasWrapper) groupDinasWrapper.style.display = 'none';
        window._selectedGroupMembers = [];
        const containerGroupSelected = document.getElementById('selectedGroupMembersContainer');
        if (containerGroupSelected) containerGroupSelected.innerHTML = '';
      }

      if (isDinas) {
        // Dinas Kantor: Bebaskan pemilihan tanggal hari ini, besok, atau hari kerja selanjutnya
        if (inputPlannedExit) inputPlannedExit.removeAttribute('max');
        if (inputEstimatedReturn) inputEstimatedReturn.removeAttribute('max');
      } else if (selectReqCategory.value === 'Urusan Pribadi') {
        // Urusan Pribadi: Kunci batas ke hari ini saja
        const now = new Date();
        setInputMaxByDate(inputPlannedExit, now);
        setInputMaxByDate(inputEstimatedReturn, now);
        if (inputPlannedExit && inputPlannedExit.value) {
          const d = new Date(inputPlannedExit.value);
          if (d.getDate() !== now.getDate() || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) {
            inputPlannedExit.value = '';
            if (inputEstimatedReturn) inputEstimatedReturn.value = '';
            if (typeof window.showToast === 'function') {
              window.showToast('Untuk Urusan Pribadi, perizinan hanya berlaku untuk hari ini.', 'info');
            }
          }
        }
      }
    });
  }

  // Dropdown Kategori Keperluan (Form Izin Darurat)
  const selectEmergCategory = document.getElementById('selectEmergCategory');
  if (selectEmergCategory) {
    selectEmergCategory.addEventListener('change', () => {
      const isDinas = isDinasCategory(selectEmergCategory.value);
      const emergPlannedExit = document.getElementById('emergPlannedExit');
      const emergEstimatedReturn = document.getElementById('emergEstimatedReturn');
      const emergGroupDinasWrapper = document.getElementById('emergGroupDinasMembersWrapper');

      if (selectEmergCategory.value === 'Dinas Kantor') {
        if (emergGroupDinasWrapper) emergGroupDinasWrapper.style.display = 'block';
        if (typeof window.initEmergGroupDinasMembersForm === 'function') {
          window.initEmergGroupDinasMembersForm();
        }
      } else {
        if (emergGroupDinasWrapper) emergGroupDinasWrapper.style.display = 'none';
        window._selectedEmergGroupMembers = [];
        window._currentEmergSuratPerintah = null;
        if (typeof window.removeEmergSuratPerintahFile === 'function') {
          window.removeEmergSuratPerintahFile();
        }
        const containerGroupSelected = document.getElementById('listSelectedEmergGroupMembers');
        if (containerGroupSelected) {
          containerGroupSelected.innerHTML = '<span style="font-size: 0.72rem; color: #94a3b8; font-style: italic;">Belum ada anggota tim yang ditambahkan. Pengajuan ini bersifat perorangan jika kosong.</span>';
        }
      }

      if (isDinas) {
        // Izin Darurat Dinas: Bebaskan pemilihan tanggal besok dan selanjutnya
        if (emergPlannedExit) emergPlannedExit.removeAttribute('max');
        if (emergEstimatedReturn) emergEstimatedReturn.removeAttribute('max');
      } else if (selectEmergCategory.value === 'Urusan Pribadi') {
        const now = new Date();
        setInputMaxByDate(emergPlannedExit, now);
        setInputMaxByDate(emergEstimatedReturn, now);
      }
    });
  }

  function syncReasonFieldByReturnType(typeValue, labelId, inputId, defaultLabelText, defaultPlaceholder) {
    const labelEl = document.getElementById(labelId);
    const inputEl = document.getElementById(inputId);
    const isPulangAwal = (typeValue === 'Pulang Mendahului');
    if (labelEl) {
      const text = isPulangAwal
        ? 'Alasan Keperluan Izin dan memilih pulang lebih awal'
        : defaultLabelText;
      labelEl.innerHTML = `${text} <span style="color: var(--rose-danger, #dc2626);">*</span>`;
    }
    if (inputEl) {
      inputEl.placeholder = isPulangAwal
        ? 'Masukkan alasan keperluan izin dan memilih pulang lebih awal...'
        : defaultPlaceholder;
    }
  }

  // Dropdown Tipe Kepulangan (Form Pengajuan Biasa)
  const selectReqType = document.getElementById('selectReqType');
  const groupEstimatedReturn = document.getElementById('groupEstimatedReturn');
  const inputEstimatedReturn = document.getElementById('inputEstimatedReturn');
  if (selectReqType) {
    const syncReqTypeUI = () => {
      if (selectReqType.value === 'Pulang Mendahului') {
        if (groupEstimatedReturn) groupEstimatedReturn.style.display = 'none';
        if (inputEstimatedReturn) inputEstimatedReturn.required = false;
      } else {
        if (groupEstimatedReturn) groupEstimatedReturn.style.display = 'block';
        if (inputEstimatedReturn) inputEstimatedReturn.required = true;
      }
      syncReasonFieldByReturnType(
        selectReqType.value,
        'labelInputReason',
        'inputReason',
        'Alasan Keperluan Izin',
        'Masukkan alasan keperluan izin...'
      );
    };
    selectReqType.addEventListener('change', syncReqTypeUI);
    syncReqTypeUI();
  }

  // Dropdown Tipe Kepulangan (Form Izin Darurat)
  const selectEmergType = document.getElementById('selectEmergType');
  const emergGroupEstimatedReturn = document.getElementById('emergGroupEstimatedReturn');
  const emergEstimatedReturn = document.getElementById('emergEstimatedReturn');
  if (selectEmergType) {
    const syncEmergTypeUI = () => {
      if (selectEmergType.value === 'Pulang Mendahului') {
        if (emergGroupEstimatedReturn) emergGroupEstimatedReturn.style.display = 'none';
        if (emergEstimatedReturn) emergEstimatedReturn.required = false;
      } else {
        if (emergGroupEstimatedReturn) emergGroupEstimatedReturn.style.display = 'block';
        if (emergEstimatedReturn) emergEstimatedReturn.required = true;
      }
      syncReasonFieldByReturnType(
        selectEmergType.value,
        'labelEmergReason',
        'emergReason',
        'Alasan Kedaruratan',
        'Masukkan alasan kondisi kedaruratan...'
      );
    };
    selectEmergType.addEventListener('change', syncEmergTypeUI);
    syncEmergTypeUI();
  }

  // Backwards compatibility for legacy radio buttons if present
  const optCatDinas = document.getElementById('optCatDinas');
  const optCatPribadi = document.getElementById('optCatPribadi');
  const optTypeKembali = document.getElementById('optTypeKembali');
  const optTypePulang = document.getElementById('optTypePulang');

  if (optCatDinas && optCatPribadi) {
    optCatDinas.addEventListener('click', () => {
      optCatDinas.classList.add('selected');
      optCatPribadi.classList.remove('selected');
      const input = optCatDinas.querySelector('input[type="radio"]');
      if (input) input.checked = true;
    });

    optCatPribadi.addEventListener('click', () => {
      optCatPribadi.classList.add('selected');
      optCatDinas.classList.remove('selected');
      const input = optCatPribadi.querySelector('input[type="radio"]');
      if (input) input.checked = true;
    });
  }

  if (optTypeKembali && optTypePulang) {
    optTypeKembali.addEventListener('click', () => {
      optTypeKembali.classList.add('selected');
      optTypePulang.classList.remove('selected');
      const input = optTypeKembali.querySelector('input[type="radio"]');
      if (input) input.checked = true;
      if (groupEstimatedReturn) groupEstimatedReturn.style.display = 'block';
      if (inputEstimatedReturn) inputEstimatedReturn.required = true;
    });

    optTypePulang.addEventListener('click', () => {
      optTypePulang.classList.add('selected');
      optTypeKembali.classList.remove('selected');
      const input = optTypePulang.querySelector('input[type="radio"]');
      if (input) input.checked = true;
      if (groupEstimatedReturn) groupEstimatedReturn.style.display = 'none';
      if (inputEstimatedReturn) inputEstimatedReturn.required = false;
    });
  }

  // Emergency radio toggles (Kategori: Dinas vs Pribadi)
  const optEmergCatDinas = document.getElementById('optEmergCatDinas');
  const optEmergCatPribadi = document.getElementById('optEmergCatPribadi');
  if (optEmergCatDinas && optEmergCatPribadi) {
    optEmergCatDinas.addEventListener('click', () => {
      optEmergCatDinas.classList.add('selected');
      optEmergCatPribadi.classList.remove('selected');
      const input = optEmergCatDinas.querySelector('input[type="radio"]');
      if (input) input.checked = true;
    });

    optEmergCatPribadi.addEventListener('click', () => {
      optEmergCatPribadi.classList.add('selected');
      optEmergCatDinas.classList.remove('selected');
      const input = optEmergCatPribadi.querySelector('input[type="radio"]');
      if (input) input.checked = true;
    });
  }

  // Emergency radio toggles (Tipe: Kembali vs Pulang Mendahului)
  const optEmergTypeKembali = document.getElementById('optEmergTypeKembali');
  const optEmergTypePulang = document.getElementById('optEmergTypePulang');
  if (optEmergTypeKembali && optEmergTypePulang) {
    optEmergTypeKembali.addEventListener('click', () => {
      optEmergTypeKembali.classList.add('selected');
      optEmergTypePulang.classList.remove('selected');
      const input = optEmergTypeKembali.querySelector('input[type="radio"]');
      if (input) input.checked = true;
      if (emergGroupEstimatedReturn) emergGroupEstimatedReturn.style.display = 'block';
      if (emergEstimatedReturn) emergEstimatedReturn.required = true;
    });

    optEmergTypePulang.addEventListener('click', () => {
      optEmergTypePulang.classList.add('selected');
      optEmergTypeKembali.classList.remove('selected');
      const input = optEmergTypePulang.querySelector('input[type="radio"]');
      if (input) input.checked = true;
      if (emergGroupEstimatedReturn) emergGroupEstimatedReturn.style.display = 'none';
      if (emergEstimatedReturn) emergEstimatedReturn.required = false;
    });
  }
}

// ===================================================================
// FITUR SEARCH NAMA ATASAN DI PENGAJUAN KARYAWAN
// ===================================================================

function getApproverInitials(name) {
  if (!name) return 'AT';
  const cleaned = name.replace(/^(Ir\.|Dr\.|Drs\.|Prof\.)\s+/i, '').replace(/,\s*[A-Z\.\s]+$/i, '');
  const parts = cleaned.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

function highlightApproverMatch(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark class="approver-highlight">$1</mark>');
}

function setupSingleApproverCombobox(cfg) {
  const searchInput = document.getElementById(cfg.searchInputId);
  const selectApprover = document.getElementById(cfg.selectApproverId);
  const btnClear = document.getElementById(cfg.btnClearId);
  const btnToggle = document.getElementById(cfg.btnToggleId);
  const dropdown = document.getElementById(cfg.dropdownId);
  const beforeSearchBanner = document.getElementById(cfg.beforeSearchBannerId);
  const itemsList = document.getElementById(cfg.itemsListId);
  const emptyState = document.getElementById(cfg.emptyStateId);
  const emptySearchTerm = document.getElementById(cfg.emptySearchTermId);
  const foundBadge = document.getElementById(cfg.foundBadgeId);
  const dropdownSubtitle = document.getElementById(cfg.dropdownSubtitleId);
  const selectedPreview = document.getElementById(cfg.selectedPreviewId);
  const selectedAvatar = document.getElementById(cfg.selectedAvatarId);
  const selectedName = document.getElementById(cfg.selectedNameId);
  const selectedTitle = document.getElementById(cfg.selectedTitleId);
  const btnChangeChoice = document.getElementById(cfg.btnChangeChoiceId);
  const comboboxWrapper = document.getElementById(cfg.comboboxWrapperId);

  if (!searchInput || !selectApprover || !dropdown) return null;

  let currentKeyboardIndex = -1;

  function getApprovers() {
    if (typeof window.getActiveApprovers === 'function') {
      return window.getActiveApprovers();
    }
    return window.MOCK_APPROVERS || [];
  }

  function syncSelectOptions() {
    if (!selectApprover) return;
    const currentVal = selectApprover.value;
    const approvers = getApprovers();
    selectApprover.innerHTML = `<option value="">-- Belum Memilih Atasan --</option>` +
      approvers.map(a => `<option value="${a.name}">${a.name} — ${a.title}</option>`).join('');
    if (approvers.some(a => a.name === currentVal)) {
      selectApprover.value = currentVal;
    }
  }

  function renderList(query = '') {
    currentKeyboardIndex = -1;
    const cleanQuery = query.toLowerCase().trim();
    const approvers = getApprovers();

    if (!cleanQuery) {
      if (beforeSearchBanner) beforeSearchBanner.style.display = 'flex';
      if (dropdownSubtitle) dropdownSubtitle.textContent = 'Daftar Atasan Peninjau';
      if (foundBadge) foundBadge.textContent = `${approvers.length} Atasan`;
      if (emptyState) emptyState.style.display = 'none';
      if (itemsList) itemsList.style.display = 'block';

      renderItems(approvers, '');
      return;
    }

    if (beforeSearchBanner) beforeSearchBanner.style.display = 'none';
    const filtered = approvers.filter(a => {
      const matcher = typeof window.matchSearchTokens === 'function' ? window.matchSearchTokens : (typeof matchSearchTokens === 'function' ? matchSearchTokens : null);
      if (matcher) {
        return matcher(cleanQuery, a.name, a.title, a.department, a.nip, a.role);
      }
      return (
        a.name.toLowerCase().includes(cleanQuery) ||
        a.title.toLowerCase().includes(cleanQuery) ||
        a.department.toLowerCase().includes(cleanQuery) ||
        (a.nip && a.nip.toLowerCase().includes(cleanQuery))
      );
    });

    if (filtered.length > 0) {
      if (dropdownSubtitle) dropdownSubtitle.textContent = 'Hasil Pencarian Atasan';
      if (foundBadge) foundBadge.textContent = `${filtered.length} Ditemukan`;
      if (emptyState) emptyState.style.display = 'none';
      if (itemsList) itemsList.style.display = 'block';
      renderItems(filtered, cleanQuery);
    } else {
      if (dropdownSubtitle) dropdownSubtitle.textContent = 'Pencarian Atasan';
      if (foundBadge) foundBadge.textContent = '0 Ditemukan';
      if (itemsList) {
        itemsList.innerHTML = '';
        itemsList.style.display = 'none';
      }
      if (emptyState) {
        emptyState.style.display = 'flex';
        if (emptySearchTerm) emptySearchTerm.textContent = query;
      }
    }
  }

  function renderItems(list, cleanQuery) {
    if (!itemsList) return;
    itemsList.innerHTML = '';

    list.forEach((approver, idx) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'approver-item';
      if (selectApprover.value === approver.name) {
        itemEl.classList.add('is-selected');
      }
      itemEl.dataset.index = idx;
      itemEl.dataset.name = approver.name;

      const initials = getApproverInitials(approver.name);
      const nameText = approver.displayName || approver.name;
      const highlightedName = highlightApproverMatch(nameText, cleanQuery);
      const highlightedTitle = highlightApproverMatch(approver.title, cleanQuery);
      const highlightedDept = highlightApproverMatch(approver.department, cleanQuery);
      const avatarBg = approver.avatarBg || 'linear-gradient(135deg, #059669 0%, #0d9488 100%)';

      const isUnavailable = Boolean(approver.isUnavailable);
      const statusTag = isUnavailable
        ? `<span class="approver-item-tag" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-weight: 700; font-size: 0.675rem; padding: 2px 8px; border-radius: 9999px;">Tidak tersedia</span>`
        : `<span class="approver-item-tag" style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-weight: 700; font-size: 0.675rem; padding: 2px 8px; border-radius: 9999px;">Aktif</span>`;
      let directTag = '';
      if (approver.isDirectSupervisor && !isUnavailable) {
        directTag = `<span class="approver-item-tag" style="background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; font-weight: 700; font-size: 0.675rem; padding: 2px 8px; border-radius: 9999px;" title="Atasan langsung divisi Anda">Atasan Langsung</span>`;
      }

      if (approver.isUnavailable) {
        itemEl.classList.add('is-unavailable');
        itemEl.style.opacity = '0.65';
        itemEl.style.cursor = 'not-allowed';
      }

      itemEl.innerHTML = `
        <div class="approver-item-avatar" style="background: ${avatarBg};">
          ${initials}
        </div>
        <div class="approver-item-info">
          <div class="approver-item-name-row">
            <span class="approver-item-name">${highlightedName}</span>
            <span class="approver-item-nip">${approver.nip || ''}</span>
            <div class="approver-item-tags-wrap">
              ${statusTag}
              ${directTag}
            </div>
          </div>
          <div class="approver-item-role">${highlightedTitle}</div>
          <div class="approver-item-dept">${highlightedDept}</div>
        </div>
        <div class="approver-item-cta">
          <span>${approver.isUnavailable ? 'Tidak Tersedia' : 'Pilih'}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      `;

      itemEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (approver.isUnavailable) {
          if (typeof window.showToast === 'function') {
            window.showToast(`Atasan ${approver.name} saat ini Tidak Tersedia karena hak aksesnya sedang dicabut oleh Administrator.`, 'warning');
          }
          return;
        }
        chooseApprover(approver);
      });

      itemsList.appendChild(itemEl);
    });
  }

  function chooseApprover(approver, silent = false) {
    selectApprover.value = approver.name;
    searchInput.value = approver.name;

    if (selectedName) selectedName.textContent = approver.name;
    if (selectedTitle) selectedTitle.textContent = `${approver.title} — ${approver.department}`;
    if (selectedAvatar) {
      selectedAvatar.textContent = getApproverInitials(approver.name);
      selectedAvatar.style.background = approver.avatarBg || 'linear-gradient(135deg, #059669 0%, #0d9488 100%)';
    }
    if (selectedPreview) selectedPreview.style.display = 'flex';
    if (btnClear) btnClear.style.display = 'flex';

    closeDropdown();
    selectApprover.dispatchEvent(new Event('change', { bubbles: true }));

    if (!silent && typeof window.showToast === 'function') {
      window.showToast(`Atasan peninjau dipilih: ${approver.name}`, 'info');
    }
  }

  function resetApproverSelection() {
    selectApprover.value = '';
    searchInput.value = '';
    if (selectedPreview) selectedPreview.style.display = 'none';
    if (btnClear) btnClear.style.display = 'none';
    renderList('');
    selectApprover.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function openDropdown() {
    dropdown.style.display = 'flex';
    if (comboboxWrapper) comboboxWrapper.style.zIndex = '1050';
    if (btnToggle) btnToggle.classList.add('open');
    renderList(searchInput.value === selectApprover.value ? '' : searchInput.value);
  }

  function closeDropdown() {
    dropdown.style.display = 'none';
    if (comboboxWrapper) comboboxWrapper.style.zIndex = '';
    if (btnToggle) btnToggle.classList.remove('open');
    currentKeyboardIndex = -1;
  }

  searchInput.addEventListener('focus', () => {
    openDropdown();
  });

  searchInput.addEventListener('input', () => {
    if (searchInput.value.trim().length > 0) {
      if (btnClear) btnClear.style.display = 'flex';
    } else {
      if (btnClear) btnClear.style.display = 'none';
      selectApprover.value = '';
      if (selectedPreview) selectedPreview.style.display = 'none';
    }
    openDropdown();
    renderList(searchInput.value);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (dropdown.style.display !== 'flex') {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        openDropdown();
        e.preventDefault();
        return;
      }
    }

    const items = itemsList ? itemsList.querySelectorAll('.approver-item') : [];
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      currentKeyboardIndex = (currentKeyboardIndex + 1) % items.length;
      updateKeyboardFocus(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      currentKeyboardIndex = (currentKeyboardIndex - 1 + items.length) % items.length;
      updateKeyboardFocus(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentKeyboardIndex >= 0 && currentKeyboardIndex < items.length) {
        items[currentKeyboardIndex].click();
      } else if (items.length === 1) {
        items[0].click();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
    }
  });

  function updateKeyboardFocus(items) {
    items.forEach((it, i) => {
      if (i === currentKeyboardIndex) {
        it.classList.add('keyboard-focus');
        it.scrollIntoView({ block: 'nearest' });
      } else {
        it.classList.remove('keyboard-focus');
      }
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', (e) => {
      e.stopPropagation();
      resetApproverSelection();
      searchInput.focus();
      openDropdown();
    });
  }

  if (btnToggle) {
    btnToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdown.style.display === 'flex') {
        closeDropdown();
      } else {
        searchInput.focus();
        openDropdown();
      }
    });
  }

  if (btnChangeChoice) {
    btnChangeChoice.addEventListener('click', (e) => {
      e.stopPropagation();
      searchInput.focus();
      searchInput.select();
      openDropdown();
    });
  }

  document.addEventListener('click', (e) => {
    if (comboboxWrapper && !comboboxWrapper.contains(e.target)) {
      closeDropdown();
    }
  });

  syncSelectOptions();
  renderList('');

  return {
    chooseApproverByName: (name, silent = false) => {
      const app = getApprovers().find(a => a.name === name);
      if (app) {
        chooseApprover(app, silent);
      } else {
        const approvers = getApprovers();
        if (approvers.length > 0) {
          chooseApprover(approvers[0], silent);
        } else {
          resetApproverSelection();
        }
      }
    },
    resetApproverSelection,
    refresh: () => {
      syncSelectOptions();
      const currentSelected = selectApprover.value;
      const approvers = getApprovers();
      const stillActive = approvers.find(a => a.name === currentSelected);
      if (currentSelected && !stillActive) {
        if (approvers.length > 0) {
          chooseApprover(approvers[0], true);
        } else {
          resetApproverSelection();
        }
      }
      renderList(searchInput.value === selectApprover.value ? '' : searchInput.value);
    }
  };
}

let regApproverComboboxInstance = null;
let emgApproverComboboxInstance = null;

function setupApproverSearch() {
  regApproverComboboxInstance = setupSingleApproverCombobox({
    searchInputId: 'searchReqApproverInput',
    selectApproverId: 'selectApprover',
    btnClearId: 'btnClearApproverSearch',
    btnToggleId: 'btnToggleApproverList',
    dropdownId: 'approverFloatingDropdown',
    beforeSearchBannerId: 'approverBeforeSearchBanner',
    itemsListId: 'approverItemsList',
    emptyStateId: 'approverEmptyState',
    emptySearchTermId: 'emptySearchTerm',
    foundBadgeId: 'approverFoundBadge',
    dropdownSubtitleId: 'approverDropdownSubtitle',
    selectedPreviewId: 'approverSelectedPreview',
    selectedAvatarId: 'selectedApproverAvatar',
    selectedNameId: 'selectedApproverName',
    selectedTitleId: 'selectedApproverTitle',
    btnChangeChoiceId: 'btnChangeApproverChoice',
    comboboxWrapperId: 'approverComboboxWrapper'
  });

  if (regApproverComboboxInstance) {
    window.resetApproverSearch = regApproverComboboxInstance.resetApproverSelection;
    window.chooseApproverByName = regApproverComboboxInstance.chooseApproverByName;
  }

  emgApproverComboboxInstance = setupSingleApproverCombobox({
    searchInputId: 'searchEmergApproverInput',
    selectApproverId: 'emergApprover',
    btnClearId: 'btnClearEmergApproverSearch',
    btnToggleId: 'btnToggleEmergApproverList',
    dropdownId: 'emergApproverFloatingDropdown',
    beforeSearchBannerId: 'emergApproverBeforeSearchBanner',
    itemsListId: 'emergApproverItemsList',
    emptyStateId: 'emergApproverEmptyState',
    emptySearchTermId: 'emergEmptySearchTerm',
    foundBadgeId: 'emergApproverFoundBadge',
    dropdownSubtitleId: 'emergApproverDropdownSubtitle',
    selectedPreviewId: 'emergApproverSelectedPreview',
    selectedAvatarId: 'selectedEmergApproverAvatar',
    selectedNameId: 'selectedEmergApproverName',
    selectedTitleId: 'selectedEmergApproverTitle',
    btnChangeChoiceId: 'btnChangeEmergApproverChoice',
    comboboxWrapperId: 'emergApproverComboboxWrapper'
  });

  if (emgApproverComboboxInstance) {
    window.resetEmergApproverSearch = emgApproverComboboxInstance.resetApproverSelection;
    window.chooseEmergApproverByName = emgApproverComboboxInstance.chooseEmergApproverByName;
  }
}

function syncApproversToForms() {
  if (regApproverComboboxInstance && typeof regApproverComboboxInstance.refresh === 'function') {
    regApproverComboboxInstance.refresh();
  }
  if (emgApproverComboboxInstance && typeof emgApproverComboboxInstance.refresh === 'function') {
    emgApproverComboboxInstance.refresh();
  }
}
window.syncApproversToForms = syncApproversToForms;

function getFormattedDateTimeLocal(dt = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

// ===================================================================
// VALIDASI BATAS MAKSIMAL PENGAJUAN (SEBELUM JAM PULANG KANTOR)
// Hari biasa (Senin - Kamis): 07:00 - 16:00 WIB
// Hari Jumat: 07:00 - 16:30 WIB
// ===================================================================

function getClosingTimeForDate(date) {
  const d = (typeof date === 'string') ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return null;
  const day = d.getDay(); // 0: Minggu, 1: Senin, ..., 4: Kamis, 5: Jumat, 6: Sabtu

  if (day === 5) {
    return {
      day,
      dayName: 'Jumat',
      hour: 16,
      minute: 30,
      totalMinutes: 16 * 60 + 30,
      closingStr: '16:30 WIB',
      scheduleText: 'Jumat pukul 07:00 - 16:30 WIB'
    };
  }

  if (day >= 1 && day <= 4) {
    const dayNames = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis'];
    return {
      day,
      dayName: dayNames[day] || 'Senin - Kamis',
      hour: 16,
      minute: 0,
      totalMinutes: 16 * 60,
      closingStr: '16:00 WIB',
      scheduleText: 'Senin - Kamis pukul 07:00 - 16:00 WIB'
    };
  }

  return {
    day,
    dayName: day === 6 ? 'Sabtu' : 'Minggu',
    hour: 0,
    minute: 0,
    totalMinutes: 0,
    closingStr: 'Hari Libur',
    scheduleText: 'Hari Libur Akhir Pekan (Sabtu / Minggu)'
  };
}

function validateWorkingHours(dateInput, label = 'Waktu', isDinas = false) {
  if (!dateInput) return { valid: false, message: `${label} wajib diisi!` };
  const d = (typeof dateInput === 'string') ? new Date(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return { valid: false, message: `Format ${label} tidak valid!` };

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const day = d.getDay();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // 1. Akhir Pekan (Sabtu & Minggu): Libur Pabrik
  if (day === 0 || day === 6) {
    return {
      valid: false,
      message: `${label} tidak dapat memilih hari libur akhir pekan (${dayNames[day]})!`
    };
  }

  // 2. Minimal jam mulai kerja reguler 07:00 WIB
  if (totalMinutes < 7 * 60) {
    return {
      valid: false,
      message: `${label} tidak boleh sebelum jam masuk kantor (07:00 WIB)!`
    };
  }

  // 3. Batas jam kerja reguler pabrik
  if (day === 5) {
    // Hari Jumat: maks 16:30 WIB
    if (totalMinutes > 16 * 60 + 30) {
      return {
        valid: false,
        message: `${label} hari Jumat tidak boleh melebihi jam kerja reguler (maksimal 16:30 WIB)!`
      };
    }
  } else if (day >= 1 && day <= 4) {
    // Senin - Kamis: maks 16:00 WIB
    if (totalMinutes > 16 * 60) {
      return {
        valid: false,
        message: `${label} hari ${dayNames[day]} tidak boleh melebihi jam kerja reguler (maksimal 16:00 WIB)!`
      };
    }
  }

  const closing = getClosingTimeForDate(d);
  return {
    valid: true,
    closingInfo: closing
  };
}

function setInputMaxByDate(inputEl, baseDate = new Date()) {
  if (!inputEl) return;
  const d = (typeof baseDate === 'string') ? new Date(baseDate) : baseDate;
  if (!d || isNaN(d.getTime())) return;
  const pad = n => String(n).padStart(2, '0');
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const day = d.getDay();
  const maxHourStr = (day === 5) ? '16:30' : '16:00';
  inputEl.max = `${dateStr}T${maxHourStr}`;
}

function isWithinOperationalHours(date = new Date()) {
  if (typeof window !== 'undefined' && window.isWithinOperationalHours && window.isWithinOperationalHours !== isWithinOperationalHours) {
    return window.isWithinOperationalHours(date);
  }
  const d = (typeof date === 'string') ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return { allowed: false, message: 'Format waktu tidak valid!' };

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const day = d.getDay();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const totalMins = hours * 60 + minutes;

  // 1. Akhir Pekan (Sabtu & Minggu): Libur Pabrik
  if (day === 0 || day === 6) {
    return {
      allowed: false,
      scheduleText: 'Hari Libur Akhir Pekan (Sabtu / Minggu)',
      closingHour: 'Hari Libur',
      message: 'Pengajuan izin tidak dapat dikirim pada hari libur akhir pekan (Sabtu & Minggu).'
    };
  }

  // 2. Hari Jumat: 07:00 - 16:30 WIB
  if (day === 5) {
    if (totalMins >= 16 * 60 + 30) {
      return {
        allowed: false,
        scheduleText: 'Jumat maksimal 16:30 WIB',
        closingHour: '16:30 WIB',
        message: 'Pengajuan izin tidak dapat dikirim karena jam kerja reguler hari Jumat telah berakhir (maksimal 16:30 WIB).'
      };
    }
    if (totalMins < 7 * 60) {
      return {
        allowed: false,
        scheduleText: 'Jumat pukul 07:00 - 16:30 WIB',
        closingHour: '07:00 WIB',
        message: 'Pengajuan izin hanya dapat dikirim saat jam kerja reguler (mulai pukul 07:00 WIB).'
      };
    }
    return {
      allowed: true,
      scheduleText: 'Jumat pukul 07:00 - 16:30 WIB',
      closingHour: '16:30 WIB'
    };
  }

  // 3. Senin s.d. Kamis: 07:00 - 16:00 WIB
  if (day >= 1 && day <= 4) {
    if (totalMins >= 16 * 60) {
      return {
        allowed: false,
        scheduleText: 'Senin - Kamis maksimal 16:00 WIB',
        closingHour: '16:00 WIB',
        message: `Pengajuan izin tidak dapat dikirim karena jam kerja reguler hari ${dayNames[day]} telah berakhir (maksimal 16:00 WIB).`
      };
    }
    if (totalMins < 7 * 60) {
      return {
        allowed: false,
        scheduleText: 'Senin - Kamis pukul 07:00 - 16:00 WIB',
        closingHour: '07:00 WIB',
        message: 'Pengajuan izin hanya dapat dikirim saat jam kerja reguler (mulai pukul 07:00 WIB).'
      };
    }
    return {
      allowed: true,
      scheduleText: 'Senin - Kamis pukul 07:00 - 16:00 WIB',
      closingHour: '16:00 WIB'
    };
  }

  return { allowed: false, message: 'Di luar jam kerja reguler pabrik.' };
}

function isDinasCategory(category) {
  if (!category) return false;
  const cat = String(category).toLowerCase();
  return cat.includes('dinas');
}

window.getClosingTimeForDate = getClosingTimeForDate;
window.validateWorkingHours = validateWorkingHours;
window.setInputMaxByDate = setInputMaxByDate;
window.isWithinOperationalHours = isWithinOperationalHours;
window.isDinasCategory = isDinasCategory;

function initFormDates() {
  const inputPlannedExit = document.getElementById('inputPlannedExit');
  const inputEstimatedReturn = document.getElementById('inputEstimatedReturn');
  if (!inputPlannedExit) return;

  const now = new Date();
  const currentMinStr = getFormattedDateTimeLocal(now);
  inputPlannedExit.min = currentMinStr;
  inputPlannedExit.value = ''; // Kosongkan saat form pertama kali dibuka
  inputPlannedExit.removeAttribute('max'); // Bebaskan agar dapat memilih hari besok dan selanjutnya untuk Dinas Kantor

  if (inputEstimatedReturn) {
    inputEstimatedReturn.min = currentMinStr;
    inputEstimatedReturn.value = ''; // Kosongkan saat form pertama kali dibuka
    inputEstimatedReturn.removeAttribute('max');
  }
}

// TAB SWITCHER IN DETAIL MODAL (INFORMASI TIKET vs RIWAYAT AKTIVITAS)
function switchDetailTab(tab) {
  const tabNavInfo = document.getElementById('tabNavInfo');
  const tabNavTimeline = document.getElementById('tabNavTimeline');
  const paneDetailInfo = document.getElementById('paneDetailInfo');
  const paneDetailTimeline = document.getElementById('paneDetailTimeline');

  if (tab === 'timeline') {
    if (tabNavTimeline) tabNavTimeline.classList.add('active');
    if (tabNavInfo) tabNavInfo.classList.remove('active');
    if (paneDetailTimeline) paneDetailTimeline.style.display = 'flex';
    if (paneDetailInfo) paneDetailInfo.style.display = 'none';
  } else {
    if (tabNavInfo) tabNavInfo.classList.add('active');
    if (tabNavTimeline) tabNavTimeline.classList.remove('active');
    if (paneDetailInfo) paneDetailInfo.style.display = 'flex';
    if (paneDetailTimeline) paneDetailTimeline.style.display = 'none';
    if (typeof window.checkAndApplyTextExpand === 'function') {
      window.checkAndApplyTextExpand('infoDestination', 'btnToggleDestExpand');
      window.checkAndApplyTextExpand('infoReason', 'btnToggleReasonExpand');
    }
  }
}

// OPEN DIGITAL PASS QR MODAL (FIGMA SCREEN 4)
function openDigitalPassModal(ticketId) {
  if (typeof window.checkOverdueAndExpiredTickets === 'function') {
    window.checkOverdueAndExpiredTickets(true);
  }

  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId) || (typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : null);
  if (!ticket) return;

  const modal = document.getElementById('modalDigitalPassQR');
  if (!modal) return;

  const digitalPassSubtitle = document.getElementById('digitalPassSubtitle');
  if (digitalPassSubtitle) {
    digitalPassSubtitle.textContent = `${ticket.id} — ${ticket.category} — ${ticket.type}`;
  }

  const digitalPassStatusBadge = document.getElementById('digitalPassStatusBadge');
  if (digitalPassStatusBadge) {
    digitalPassStatusBadge.textContent = ticket.status;
    digitalPassStatusBadge.className = ticket.status === 'Terlambat'
      ? 'status-pill-red'
      : (ticket.status === 'Sedang di Luar'
        ? 'status-pill-purple'
        : (ticket.status === 'Disetujui' ? 'status-pill-blue' : 'status-pill-green'));
    digitalPassStatusBadge.style.background = 'transparent';
    digitalPassStatusBadge.style.border = 'none';
    digitalPassStatusBadge.style.padding = '0';
  }

  const digitalPassTicketId = document.getElementById('digitalPassTicketId');
  if (digitalPassTicketId) digitalPassTicketId.textContent = ticket.id;

  const digitalPassApplicant = document.getElementById('digitalPassApplicant');
  if (digitalPassApplicant) digitalPassApplicant.textContent = ticket.applicantName || 'Budi Pratama, S.T.';

  const digitalPassEstReturn = document.getElementById('digitalPassEstReturn');
  if (digitalPassEstReturn) {
    const rawRet = ticket.estimatedReturn || '19 Okt 2026 | 13.00 WIB';
    digitalPassEstReturn.textContent = window.formatDisplayDate ? window.formatDisplayDate(rawRet) : rawRet;
  }

  const digitalPassNoticeText = document.getElementById('digitalPassNoticeText');
  if (digitalPassNoticeText) {
    if (ticket.status === 'Terlambat') {
      digitalPassNoticeText.innerHTML = `<span style="color:#b91c1c; font-weight:800;">⚠️ TERLAMBAT: Melewati batas estimasi kembali (${ticket.estimatedReturn ? (window.formatDisplayDate ? window.formatDisplayDate(ticket.estimatedReturn) : ticket.estimatedReturn) : ''}). Segera kembali ke Pos 1 untuk melakukan Tap In Kartu Akses.</span>`;
    } else {
      const timeReturn = ticket.estimatedReturn ? ticket.estimatedReturn.slice(11, 16) + ' WIB' : '13.00 WIB';
      digitalPassNoticeText.textContent = `Jangan bagikan QR. Batas kembali ${timeReturn}; QR dinonaktifkan setelah Tap In Kartu Akses.`;
    }
  }

  // QR Code Generation
  const qrContainer = document.getElementById('digitalPassQrContainer');
  if (qrContainer) {
    qrContainer.innerHTML = '';
    qrContainer.style.background = '#ffffff';
    qrContainer.style.padding = '14px';
    qrContainer.style.borderRadius = '12px';
    qrContainer.style.display = 'inline-flex';
    qrContainer.style.alignItems = 'center';
    qrContainer.style.justifyContent = 'center';

    const qrPayload = `KUJANG-PASS|${ticket.id}|${ticket.applicantNip || 'PK-2024-8841'}|${ticket.category}|${ticket.plannedExit}`;
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrContainer, {
        text: qrPayload,
        width: 170,
        height: 170,
        colorDark: ticket.status === 'Terlambat' ? '#b91c1c' : '#0f2b48',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      qrContainer.innerHTML = `<strong>QR: ${ticket.id}</strong>`;
    }
  }

  const printTicketDateTime = document.getElementById('printTicketDateTime');
  if (printTicketDateTime) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    printTicketDateTime.textContent = `Dicetak: ${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()} pukul ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;
  }

  const elDept = document.getElementById('digitalPassDepartment');
  if (elDept) elDept.textContent = ticket.department || 'Departemen Rekayasa & Pemeliharaan';

  const elPurpose = document.getElementById('digitalPassPurpose');
  if (elPurpose) elPurpose.textContent = `${ticket.category || 'Dinas Kantor'} (${ticket.type || 'Kembali ke Area'})`;

  const elPlannedExit = document.getElementById('digitalPassPlannedExit');
  if (elPlannedExit) {
    const rawExit = ticket.plannedExit || '19 Okt 2026, 10.00 WIB';
    elPlannedExit.textContent = window.formatDisplayDate ? window.formatDisplayDate(rawExit) : rawExit;
  }

  const elApprover = document.getElementById('digitalPassApprover');
  if (elApprover) {
    const appTitle = ticket.approverTitle ? ` — ${ticket.approverTitle}` : '';
    elApprover.textContent = `${ticket.approverName || 'Ir. Hendra Gunawan, M.T.'}${appTitle}`;
  }

  // Button actions - Direct file download via Blob (Mencegah pop-up Save As yang mengganggu)
  const btnDownload = document.getElementById('btnDownloadDigitalQRPng') || document.getElementById('btnDownloadQRPng');
  if (btnDownload) {
    btnDownload.onclick = (e) => {
      if (e) e.stopImmediatePropagation();
      if (btnDownload.dataset.downloading === '1') return;
      btnDownload.dataset.downloading = '1';
      const resetLock = () => {
        setTimeout(() => {
          delete btnDownload.dataset.downloading;
        }, 800);
      };

      const targetContainer = qrContainer || document.getElementById('digitalPassQrContainer') || document.getElementById('qrCodeContainer');
      const canvas = targetContainer ? targetContainer.querySelector('canvas') : null;
      const img = targetContainer ? targetContainer.querySelector('img') : null;
      const ticketId = ticket.id || (document.getElementById('digitalPassTicketId') || document.getElementById('passTicketId') || {}).textContent || 'KUJANG';

      let downloaded = false;
      const triggerBlobDownload = (blob) => {
        if (downloaded || !blob) {
          resetLock();
          return;
        }
        downloaded = true;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `Tiket-QR-${ticketId}.png`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 150);
        if (typeof window.showToast === 'function') window.showToast('QR Code berhasil diunduh ke folder Downloads!', 'success');
        resetLock();
      };

      const makePaddedBlob = (sourceEl, cb) => {
        try {
          const pad = 24;
          const pc = document.createElement('canvas');
          const w = sourceEl.width || 170;
          const h = sourceEl.height || 170;
          pc.width = w + pad * 2;
          pc.height = h + pad * 2;
          const ctx = pc.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pc.width, pc.height);
          ctx.drawImage(sourceEl, pad, pad, w, h);
          pc.toBlob(cb, 'image/png');
        } catch (err) {
          if (typeof sourceEl.toBlob === 'function') sourceEl.toBlob(cb, 'image/png');
          else resetLock();
        }
      };

      if (canvas) {
        makePaddedBlob(canvas, (blob) => {
          if (blob) {
            triggerBlobDownload(blob);
          } else if (typeof canvas.toBlob === 'function') {
            canvas.toBlob(triggerBlobDownload, 'image/png');
          } else {
            resetLock();
          }
        });
      } else if (img && img.src) {
        const tempImg = new Image();
        tempImg.onload = () => makePaddedBlob(tempImg, triggerBlobDownload);
        tempImg.onerror = () => fetch(img.src).then(r => r.blob()).then(triggerBlobDownload).catch(resetLock);
        tempImg.src = img.src;
      } else {
        if (typeof window.showToast === 'function') window.showToast('Menyiapkan gambar QR Code...', 'info');
        resetLock();
      }
    };
  }

  const btnPrint = document.getElementById('btnPrintDigitalPass');
  if (btnPrint) {
    btnPrint.onclick = () => {
      document.body.classList.add('printing-digital-pass');
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-digital-pass');
      }, 1000);
    };
  }

  window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing-digital-pass');
  }, { once: true });

  modal.classList.add('open');
}
window.openDigitalPassModal = openDigitalPassModal;

// OPEN TICKET DETAIL & AUDIT TRAIL MODAL (FIGMA SCREEN 2 & 3)
function openTicketDetail(ticketId, defaultTab = 'info', options = {}) {
  if (typeof window.checkOverdueAndExpiredTickets === 'function') {
    window.checkOverdueAndExpiredTickets(true);
  }

  if (defaultTab === 'qr') {
    openDigitalPassModal(ticketId);
    return;
  }

  let cleanId = String(ticketId || '').trim();
  if (cleanId.startsWith('#')) {
    cleanId = cleanId.substring(1).trim();
  }

  let ticketsList = window.ticketsList || [];
  let ticket = ticketsList.find(t => t.id === cleanId || String(t.id).trim().toUpperCase() === cleanId.toUpperCase() || String(t.id).replace(/^#/, '').trim().toUpperCase() === cleanId.toUpperCase());

  if (!ticket && typeof window.loadTickets === 'function') {
    ticketsList = window.loadTickets() || [];
    window.ticketsList = ticketsList;
    ticket = ticketsList.find(t => t.id === cleanId || String(t.id).trim().toUpperCase() === cleanId.toUpperCase() || String(t.id).replace(/^#/, '').trim().toUpperCase() === cleanId.toUpperCase());
  }

  if (!ticket) {
    if (typeof window.showToast === 'function') {
      window.showToast(`Tiket #${cleanId} tidak ditemukan di sistem.`, 'warning');
    }
    return;
  }

  window.currentDetailTicketId = ticket.id;
  window.currentModalTicketId = ticket.id;

  const ACTORS = window.ACTORS || {};
  const modalTicketDetail = document.getElementById('modalTicketDetail');

  // Header Title & Subtitle
  const modalDetailHeading = document.getElementById('modalDetailHeading');
  if (modalDetailHeading) {
    modalDetailHeading.textContent = `Detail Pengajuan — ${ticket.id}`;
  }

  const isTicketEmerg = Boolean(ticket.isEmergency || (ticket.id && ticket.id.includes('-EMG-')) || ticket.status === 'Menunggu Otorisasi Darurat');

  const modalDetailSubtitle = document.getElementById('modalDetailSubtitle');
  if (modalDetailSubtitle) {
    modalDetailSubtitle.style.display = 'none';
  }

  // Status Badge on Top Right (Menyatu dengan info menit terlambat jika status terlambat/selesai terlambat)
  const detailStatusPillTop = document.getElementById('detailStatusPillTop');
  if (detailStatusPillTop) {
    const isLateCompleted = (ticket.status === 'Selesai') && Boolean(ticket.isLate || (ticket.scanInTime && ticket.scanInTime.includes('[Terlambat]')) || (ticket.lateMinutes > 0));
    const isOutLate = (ticket.status === 'Terlambat');

    if (isLateCompleted) {
      const lateMins = Number(ticket.lateMinutes) || 15;
      detailStatusPillTop.innerHTML = `<span class="figma-clean-status" style="font-weight: 700; font-size: 0.85rem; color: #b45309;">Selesai (Terlambat ${lateMins} Menit)</span>`;
    } else if (isOutLate) {
      // Real-time counter menit terlambat saat sedang di luar
      const calcLateMins = () => {
        let retDate = null;
        if (ticket.estimatedReturn) {
          retDate = typeof window.parseTicketDateTime === 'function' ? window.parseTicketDateTime(ticket.estimatedReturn) : new Date(ticket.estimatedReturn);
        }
        if (!retDate || isNaN(retDate.getTime())) {
          return Number(ticket.lateMinutes) || 1;
        }
        const diffMs = Date.now() - retDate.getTime();
        return Math.max(1, Math.floor(diffMs / 60000));
      };

      const renderRealtimeLate = () => {
        const curMins = calcLateMins();
        detailStatusPillTop.innerHTML = `<span class="figma-clean-status" style="font-weight: 700; font-size: 0.85rem; color: #dc2626;">Sedang di Luar (Terlambat ${curMins} Menit)</span>`;
      };

      renderRealtimeLate();
      if (window._detailRealtimeLateTimer) {
        clearInterval(window._detailRealtimeLateTimer);
      }
      window._detailRealtimeLateTimer = setInterval(renderRealtimeLate, 30000); // refresh realtime
    } else {
      if (window._detailRealtimeLateTimer) {
        clearInterval(window._detailRealtimeLateTimer);
        window._detailRealtimeLateTimer = null;
      }
      if (typeof window.getCleanEmpStatus === 'function') {
        detailStatusPillTop.innerHTML = window.getCleanEmpStatus(ticket.status, ticket);
      } else {
        let color = '#d97706';
        if (ticket.status === 'Disetujui' || ticket.status === 'Selesai') color = '#059669';
        else if (ticket.status === 'Sedang di Luar') color = '#0284c7';
        else if (ticket.status === 'Ditolak' || ticket.status === 'Menunggu Otorisasi Darurat') color = '#dc2626';
        else if (ticket.status === 'Kedaluwarsa' || ticket.status === 'Dibatalkan') color = '#64748b';
        detailStatusPillTop.innerHTML = `<span class="figma-clean-status" style="font-weight: 700; font-size: 0.85rem; color: ${color};">${ticket.status}</span>`;
      }
    }
  }

  // --- TAB 1: INFORMASI TIKET ---
  const infoEmergencyBadge = document.getElementById('infoEmergencyBadge');
  if (infoEmergencyBadge) {
    if (isTicketEmerg) {
      infoEmergencyBadge.innerHTML = `<strong style="display:inline-flex; align-items:center; color:#b91c1c; font-weight:800; font-size:0.825rem;">Darurat (Evakuasi / Mendesak)</strong>`;
    } else {
      infoEmergencyBadge.innerHTML = `<strong style="display:inline-flex; align-items:center; color:#0f172a; font-weight:700; font-size:0.825rem;">Biasa (Reguler)</strong>`;
    }
  }

  const infoApplicantAvatar = document.getElementById('infoApplicantAvatar');
  if (infoApplicantAvatar) {
    infoApplicantAvatar.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
  }

  const infoEmployeeName = document.getElementById('infoEmployeeName');
  if (infoEmployeeName) infoEmployeeName.textContent = ticket.applicantName || (ACTORS.karyawan ? ACTORS.karyawan.name : "Budi Pratama, S.T.");

  const infoEmployeeNip = document.getElementById('infoEmployeeNip');
  if (infoEmployeeNip) infoEmployeeNip.textContent = ticket.applicantNip || (ACTORS.karyawan ? ACTORS.karyawan.nip : 'PK-2024-8841');

  const infoEmployeeDept = document.getElementById('infoEmployeeDept');
  if (infoEmployeeDept) infoEmployeeDept.textContent = ticket.department || 'Rekayasa & Pemeliharaan';

  // Section 1b: Rombongan Dinas (Tampil jika Izin Dinas Bersama)
  const secGroup = document.getElementById('sectionGroupMembersDetail');
  const badgeGroupCount = document.getElementById('badgeGroupMembersCount');
  const containerGroupList = document.getElementById('containerGroupMembersDetailList');
  if (secGroup && containerGroupList) {
    if (ticket.isGroupDinas && Array.isArray(ticket.members) && ticket.members.length > 0) {
      secGroup.style.display = 'block';
      const activeMembers = ticket.members.filter(m => m.status !== 'batal');
      const totalActive = (ticket.initiatorCancelled ? 0 : 1) + activeMembers.length;
      if (badgeGroupCount) badgeGroupCount.textContent = `${totalActive} Karyawan Aktif`;

      let membersHtml = '';
      const initiatorCancelled = Boolean(ticket.initiatorCancelled);
      membersHtml += `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color, #f1f5f9);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: #f1f5f9; color: #475569; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;">
              ${(ticket.applicantName || 'I').charAt(0)}
            </div>
            <div>
              <div style="font-size: 0.8rem; font-weight: 700; color: ${initiatorCancelled ? '#94a3b8' : '#0f172a'}; ${initiatorCancelled ? 'text-decoration: line-through;' : ''}">
                ${ticket.applicantName || 'Pemohon'} <span style="font-size: 0.72rem; font-weight: 700; color: #d97706; margin-left: 4px;">(Inisiator)</span>
              </div>
              <div style="font-size: 0.7rem; color: #64748b;">NIP: ${ticket.applicantNip || '-'}</div>
            </div>
          </div>
          <div>
            ${initiatorCancelled
              ? '<span style="font-size: 0.75rem; font-weight: 700; color: #dc2626;">Batal Ikut</span>'
              : '<span style="font-size: 0.75rem; font-weight: 700; color: #16a34a;">Aktif Ikut</span>'}
          </div>
        </div>
      `;

      ticket.members.forEach(m => {
        const isBatal = m.status === 'batal';
        membersHtml += `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color, #f1f5f9);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: #f1f5f9; color: #475569; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;">
                ${(m.name || 'M').charAt(0)}
              </div>
              <div>
                <div style="font-size: 0.8rem; font-weight: 700; color: ${isBatal ? '#94a3b8' : '#0f172a'}; ${isBatal ? 'text-decoration: line-through;' : ''}">
                  ${m.name}
                </div>
                <div style="font-size: 0.7rem; color: #64748b;">NIP: ${m.nip} • ${m.department || ''}</div>
              </div>
            </div>
            <div>
              ${isBatal
                ? '<span style="font-size: 0.75rem; font-weight: 700; color: #dc2626;">Batal Ikut</span>'
                : '<span style="font-size: 0.75rem; font-weight: 700; color: #16a34a;">Aktif Ikut</span>'}
            </div>
          </div>
        `;
      });
      containerGroupList.innerHTML = membersHtml;
    } else {
      secGroup.style.display = 'none';
    }
  }

  // Section 1c: Verifikasi Kedatangan & Bukti Foto Real-Time
  const secProofDetail = document.getElementById('sectionArrivalProofDetail');
  if (secProofDetail) {
    const historyArr = Array.isArray(ticket.arrivalVerificationHistory) ? ticket.arrivalVerificationHistory : [];
    const hasArrivalProofData = Boolean(ticket.arrivalRejectReason || ticket.arrivalProofPhoto || historyArr.length > 0);
    if (hasArrivalProofData) {
      secProofDetail.style.display = 'flex';
      secProofDetail.style.flexDirection = 'column';
      secProofDetail.style.gap = '0.55rem';
      const isEmpViewer = (typeof window.isEmployeeRole === 'function' ? window.isEmployeeRole(window.currentActor) : (!window.currentActor || String(window.currentActor).startsWith('karyawan')));
      const canCurrentEmployeeUpload = isEmpViewer && ticket.status === 'Menunggu Bukti Kedatangan';
      secProofDetail.innerHTML = `
        <div style="font-size: 0.85rem; font-weight: 800; color: var(--text-primary, #0f172a);">
          Riwayat Verifikasi Kedatangan &amp; Foto Bukti Real-Time
        </div>
        ${ticket.arrivalRejectReason ? `
          <div class="proof-reason-alert-box" style="padding: 0.65rem 0.85rem; border-radius: 8px; font-size: 0.78rem; line-height: 1.45; background: #ffffff; border: 1px solid var(--border-color, #e2e8f0); color: #0f172a;">
            <div style="font-weight: 800; margin-bottom: 2px;">Alasan Belum Tiba (${ticket.arrivalRejectBy || 'Atasan'} • Putaran #${ticket.arrivalRejectionRound || 1}):</div>
            <div>"${ticket.arrivalRejectReason}"</div>
            ${ticket.arrivalRejectAt ? `<div style="font-size: 0.7rem; opacity: 0.85; margin-top: 3px; color: #64748b;">Dikirim pada: ${ticket.arrivalRejectAt}</div>` : ''}
          </div>
        ` : ''}
        ${ticket.arrivalProofPhoto ? `
          <div class="proof-photo-review-card" style="display: flex; gap: 0.75rem; align-items: center; padding: 0.65rem 0.85rem; border-radius: 8px; background: #ffffff; border: 1px solid var(--border-color, #e2e8f0);">
            <img src="${ticket.arrivalProofPhoto}" alt="Foto Bukti Kedatangan" class="proof-photo-thumb" onclick="if(typeof window.viewArrivalProofPhoto==='function') window.viewArrivalProofPhoto('${ticket.id}')" title="Klik untuk memperbesar foto">
            <div style="flex: 1; min-width: 0; font-size: 0.76rem; line-height: 1.45;">
              <div style="font-weight: 800; color: #0f172a;">Foto Bukti Real-Time Terbaru</div>
              <div>Diunggah oleh: <strong>${ticket.arrivalProofBy || ticket.applicantName || 'Karyawan'}</strong></div>
              <div style="color: #059669; font-weight: 700;">Stempel Waktu: ${ticket.arrivalProofAt || '-'}</div>
              ${ticket.arrivalProofNote ? `<div style="margin-top: 2px; font-style: italic;">"${ticket.arrivalProofNote}"</div>` : ''}
            </div>
          </div>
        ` : ''}
        ${canCurrentEmployeeUpload ? `
          <button type="button" class="btn-danger-solid" style="background: #dc2626; border-color: #dc2626; color: #ffffff; font-weight: 800; width: 100%; justify-content: center;" onclick="document.getElementById('modalTicketDetail').classList.remove('open'); if(typeof window.openUploadArrivalProofModal==='function') window.openUploadArrivalProofModal('${ticket.id}');">
            Upload Foto Bukti Sekarang
          </button>
        ` : ''}
      `;
    } else {
      secProofDetail.style.display = 'none';
      secProofDetail.innerHTML = '';
    }
  }

  // Section 4B: Surat Perintah / Tugas Dinas
  const secSurat = document.getElementById('sectionSuratPerintahDetail');
  const detailSuratName = document.getElementById('detailSuratName');
  const detailSuratMeta = document.getElementById('detailSuratMeta');
  const detailSuratIcon = document.getElementById('detailSuratIcon');
  if (secSurat) {
    if (ticket.suratPerintah) {
      secSurat.style.display = 'block';
      if (detailSuratName) detailSuratName.textContent = ticket.suratPerintah.name || 'Surat_Perintah_Dinas.pdf';
      if (detailSuratMeta) {
        const kbSize = Math.round((ticket.suratPerintah.size || 142000) / 1024);
        detailSuratMeta.textContent = `${kbSize} KB • Dokumen Perintah Resmi Unit Kerja`;
      }
      if (detailSuratIcon) {
        detailSuratIcon.textContent = (ticket.suratPerintah.type && ticket.suratPerintah.type.includes('image')) ? 'IMG' : 'PDF';
      }
      const btnViewSurat = document.getElementById('btnViewSuratPerintah');
      if (btnViewSurat) {
        btnViewSurat.onclick = (e) => {
          if (e) e.stopPropagation();
          window.viewSuratPerintahDetail(ticket.id);
        };
      }
    } else {
      secSurat.style.display = 'none';
    }
  }

  const infoCategory = document.getElementById('infoCategory');
  if (infoCategory) infoCategory.textContent = ticket.category;

  const infoType = document.getElementById('infoType');
  if (infoType) infoType.textContent = ticket.type;

  const infoDestination = document.getElementById('infoDestination');
  if (infoDestination) {
    infoDestination.textContent = ticket.destination || '-';
  }

  const infoReason = document.getElementById('infoReason');
  if (infoReason) {
    infoReason.textContent = ticket.reason || '-';
  }

  const infoTimeSectionTitle = document.getElementById('infoTimeSectionTitle');
  if (infoTimeSectionTitle) {
    infoTimeSectionTitle.textContent = 'Jadwal Keluar & Kembali';
  }

  const infoScheduleDate = document.getElementById('infoScheduleDate');
  if (infoScheduleDate) {
    const dayStr = typeof window.formatDisplayDateOnly === 'function' ? window.formatDisplayDateOnly(ticket.plannedExit || ticket.createdAt) : (ticket.createdAt || '06-11-2026');
    infoScheduleDate.textContent = dayStr;
  }

  const infoTablePlanExit = document.getElementById('infoTablePlanExit');
  if (infoTablePlanExit) {
    infoTablePlanExit.textContent = ticket.plannedExit ? `${ticket.plannedExit.slice(11, 16).replace(':', '.')} WIB` : '09.00 WIB';
    infoTablePlanExit.style.fontWeight = '700';
    infoTablePlanExit.style.color = '#0f172a';
  }

  const infoTableActualExit = document.getElementById('infoTableActualExit');
  if (infoTableActualExit) {
    const scanOutStr = ticket.scanOutTime ? (ticket.scanOutTime.includes('WIB') ? ticket.scanOutTime : `${ticket.scanOutTime} WIB`) : '';
    infoTableActualExit.textContent = scanOutStr || (ticket.status === 'Selesai' ? '09.03 WIB' : '-');
    infoTableActualExit.style.fontWeight = '700';
    infoTableActualExit.style.color = 'var(--text-primary, #0f172a)';
  }

  const infoTablePlanReturn = document.getElementById('infoTablePlanReturn');
  if (infoTablePlanReturn) {
    infoTablePlanReturn.textContent = ticket.estimatedReturn ? `${ticket.estimatedReturn.slice(11, 16).replace(':', '.')} WIB` : '-';
    infoTablePlanReturn.style.fontWeight = '700';
    infoTablePlanReturn.style.color = '#0f172a';
  }

  const infoTableActualReturn = document.getElementById('infoTableActualReturn');
  if (infoTableActualReturn) {
    const isLateTicket = ticket.isLate || ticket.status === 'Terlambat' || (ticket.scanInTime && ticket.scanInTime.includes('[Terlambat]'));
    let scanInStr = ticket.scanInTime
      ? (ticket.scanInTime.includes('WIB') ? ticket.scanInTime : `${ticket.scanInTime} WIB`)
      : '';
    scanInStr = scanInStr.replace(/\s*\[Terlambat\]/gi, '').trim();
    const lateFormatted = typeof window.formatLateDuration === 'function' ? window.formatLateDuration(ticket.lateMinutes) : `${ticket.lateMinutes} mnt`;
    infoTableActualReturn.textContent = scanInStr
      ? `${scanInStr} — ${isLateTicket ? `Terlambat${ticket.lateMinutes ? ` (+${lateFormatted})` : ''}` : 'Tepat Waktu'}`
      : (ticket.status === 'Selesai'
        ? (ticket.isLate ? '10.52 WIB — Terlambat' : '10.52 WIB — Tepat Waktu')
        : (ticket.status === 'Terlambat' ? '⚠️ Belum Tap In (Terlambat)' : '-'));
    infoTableActualReturn.style.fontWeight = '700';
    infoTableActualReturn.style.color = 'var(--text-primary, #0f172a)';
  }

  // Late Callout Box under Jadwal Keluar & Kembali: Dihilangkan sesuai instruksi pengguna (menit keterlambatan langsung ditampilkan di status badge)
  const infoLateNoticeBox = document.getElementById('infoLateNoticeBox');
  if (infoLateNoticeBox) {
    infoLateNoticeBox.style.display = 'none';
  }

  const approverName = ticket.approverName || 'Arthur Morgan, S.Tr.T.';
  const infoApproverAvatar = document.getElementById('infoApproverAvatar');
  if (infoApproverAvatar) {
    if (typeof window.renderUserPhoto === 'function') {
      infoApproverAvatar.innerHTML = window.renderUserPhoto(approverName, 34);
    } else {
      infoApproverAvatar.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
    }
  }

  const infoApproverLbl = document.getElementById('infoApproverLbl');
  if (infoApproverLbl) {
    if (ticket.reassignedFrom) {
      infoApproverLbl.innerHTML = `
        <div style="font-size:0.85rem; font-weight:800; color:var(--text-primary, #0f172a); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.3;">${approverName}</div>
        <div style="font-size:0.725rem; color:#b45309; font-weight:600; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">↳ Dialihkan dari ${ticket.reassignedFrom}</div>
      `;
    } else {
      infoApproverLbl.innerHTML = `
        <div style="font-size:0.85rem; font-weight:800; color:var(--text-primary, #0f172a); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.3;">${approverName}</div>
      `;
    }
  }

  const infoApproverBadgeContainer = document.getElementById('infoApproverBadgeContainer');
  const infoApproverNoteText = document.getElementById('infoApproverNoteText');
  if (infoApproverBadgeContainer) {
    if (ticket.status === 'Disetujui' || ticket.status === 'Sedang di Luar' || ticket.status === 'Selesai' || ticket.status === 'Terlambat') {
      infoApproverBadgeContainer.style.display = 'block';
      infoApproverBadgeContainer.innerHTML = '<span class="status-pill-green" style="background:#dcfce7; color:#15803d; font-weight:700; font-size:0.75rem; padding:3px 10px; border-radius:9999px;">Disetujui</span>';
    } else if (ticket.status === 'Ditolak') {
      infoApproverBadgeContainer.style.display = 'block';
      infoApproverBadgeContainer.innerHTML = '<span class="status-pill-red" style="background:#fee2e2; color:#b91c1c; font-weight:700; font-size:0.75rem; padding:3px 10px; border-radius:9999px;">Ditolak</span>';
    } else {
      // Hilangkan badge 'Menunggu' dari baris atasan sesuai permintaan
      infoApproverBadgeContainer.style.display = 'none';
      infoApproverBadgeContainer.innerHTML = '';
    }
  } else if (infoApproverNoteText) {
    infoApproverNoteText.textContent = ticket.approverNote || 'Disetujui';
  }

  const infoSecurityAvatar = document.getElementById('infoSecurityAvatar');
  const infoSecurityLbl = document.getElementById('infoSecurityLbl');
  const infoSecurityNoteText = document.getElementById('infoSecurityNoteText');
  const hasScannedOut = Boolean(ticket.scanOutTime);

  if (hasScannedOut) {
    const officerName = ticket.securityOfficerOut || 'Sertu Agus';
    const gateUsed = ticket.scanOutGate || 'Pos 1 (Gerbang Utama)';
    const scanOutSimple = (ticket.scanOutTime || '').replace(/\s*\(Pos.*?\)/gi, '');

    if (infoSecurityAvatar) {
      if (typeof window.renderUserPhoto === 'function') {
        infoSecurityAvatar.innerHTML = window.renderUserPhoto(officerName, 34);
      } else {
        infoSecurityAvatar.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';
      }
    }
    if (infoSecurityLbl) {
      infoSecurityLbl.innerHTML = `
        <div style="font-size:0.85rem; font-weight:800; color:var(--text-primary, #0f172a); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.3;">${officerName}</div>
      `;
    }
    if (infoSecurityNoteText) {
      infoSecurityNoteText.innerHTML = `
        <div style="font-size:0.725rem; color:#047857; font-weight:600; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${gateUsed} • Tap Out ${scanOutSimple}</div>
      `;
    }
  } else {
    if (infoSecurityAvatar) {
      infoSecurityAvatar.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';
    }
    if (infoSecurityLbl) {
      infoSecurityLbl.innerHTML = `
        <div style="font-size:0.85rem; font-weight:800; color:var(--text-primary, #0f172a); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.3;">Belum Scan Out</div>
      `;
    }
    if (infoSecurityNoteText) {
      infoSecurityNoteText.innerHTML = `
        <div style="font-size:0.725rem; color:#64748b; font-style:italic; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Identitas & QR belum dipindai di pos gerbang</div>
      `;
    }
  }

  const infoNoticeText = document.getElementById('infoNoticeText');
  if (infoNoticeText) {
    if (ticket.reassignedFrom && (ticket.status === 'Menunggu Persetujuan' || ticket.status === 'Menunggu Otorisasi Darurat')) {
      infoNoticeText.innerHTML = `Pengajuan ini dialihkan oleh pemohon ke <strong>${ticket.approverName}</strong> pada ${ticket.reassignedAt || 'hari ini'} dan menunggu keputusan persetujuan.`;
    } else if (ticket.status === 'Selesai') {
      infoNoticeText.textContent = `Perjalanan selesai pukul ${ticket.scanInTime || '10.52'} WIB. QR tiket ini tidak berlaku lagi.`;
    } else if (ticket.status === 'Terlambat') {
      infoNoticeText.innerHTML = `<span style="color:#b91c1c; font-weight:800;">⚠️ PERINGATAN: Karyawan telah melewati batas waktu estimasi kembali (${ticket.estimatedReturn ? (window.formatDisplayDate ? window.formatDisplayDate(ticket.estimatedReturn) : ticket.estimatedReturn) : ''}). Segera kembali ke Pos 1 untuk melakukan Tap In Kartu Akses.</span>`;
    } else if (ticket.status === 'Sedang di Luar') {
      infoNoticeText.textContent = `Karyawan sedang di luar kawasan. Wajib kembali dan Tap In Kartu Akses sebelum ${ticket.estimatedReturn ? ticket.estimatedReturn.slice(11, 16).replace(':', '.') : '13.00'} WIB.`;
    } else if (ticket.status === 'Disetujui') {
      infoNoticeText.textContent = `Tiket telah disetujui. Tunjukkan QR Code digital kepada Petugas di Pos 1 untuk Scan Out.`;
    } else if (ticket.status === 'Menunggu Persetujuan') {
      infoNoticeText.textContent = `Tiket sedang menunggu persetujuan dari Atasan langsung (${ticket.approverName || 'Ir. Hendra Gunawan, M.T.'}). QR belum aktif.`;
    } else if (ticket.status === 'Ditolak') {
      const rejReason = ticket.rejectionReason || ticket.rejectReason || ticket.approverNote || 'Alasan dinas belum memenuhi ketentuan operasional.';
      infoNoticeText.innerHTML = `<span style="color:#dc2626; font-weight:800;">✕ PENGAJUAN DITOLAK ATASAN:</span> "${rejReason}"`;
    } else {
      infoNoticeText.textContent = `Status tiket: ${ticket.status}. Catatan tersimpan dalam audit trail sistem.`;
    }
  }

  // --- TAB 2: RIWAYAT AKTIVITAS (CONNECTED TIMELINE) ---
  const figmaDetailTimelineList = document.getElementById('figmaDetailTimelineList');
  if (figmaDetailTimelineList) {
    if (ticket.timeline && Array.isArray(ticket.timeline) && ticket.timeline.length > 0) {
      figmaDetailTimelineList.innerHTML = ticket.timeline.map((item, idx) => {
        let dotColor = '#059669'; // default green
        const evLower = (item.event || '').toLowerCase();
        if (evLower.includes('dibuat') || evLower.includes('diajukan')) {
          dotColor = '#2563eb';
        } else if (evLower.includes('dialihkan')) {
          dotColor = '#d97706';
        } else if (evLower.includes('tolak') || evLower.includes('batal')) {
          dotColor = '#dc2626';
        } else if (evLower.includes('darurat') || evLower.includes('terkunci')) {
          dotColor = '#e11d48';
        }

        let photoUrl = item.photoDataUrl || '';
        let historyIdx = -1;
        if (evLower.includes('foto bukti') || evLower.includes('bukti kedatangan')) {
          const roundMatch = (item.event || '').match(/Putaran\s*#?(\d+)/i);
          const roundNum = roundMatch ? parseInt(roundMatch[1], 10) : 1;
          if (!photoUrl && Array.isArray(ticket.arrivalVerificationHistory)) {
            const hIndex = ticket.arrivalVerificationHistory.findIndex(h => h.round === roundNum && h.photoDataUrl);
            if (hIndex >= 0) {
              photoUrl = ticket.arrivalVerificationHistory[hIndex].photoDataUrl;
              historyIdx = hIndex;
            }
          }
          if (!photoUrl && ticket.arrivalProofPhoto) {
            photoUrl = ticket.arrivalProofPhoto;
          }
        }

        return `
          <div class="figma-timeline-item">
            <div class="figma-timeline-dot" style="background: ${dotColor};"></div>
            <div class="figma-timeline-top" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="figma-timeline-event" style="${idx === 0 ? 'font-weight: 800; color: #0f172a;' : ''}">${item.event}</span>
                ${photoUrl ? `
                  <span style="display: inline-flex; align-items: center; gap: 5px; cursor: pointer; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1; background: #ffffff;" onclick="event.stopPropagation(); if(typeof window.viewArrivalProofPhoto==='function') window.viewArrivalProofPhoto('${ticket.id}', ${historyIdx >= 0 ? historyIdx : "''"})" title="Klik untuk lihat foto bukti">
                    <img src="${photoUrl}" alt="Foto Bukti" style="width: 24px; height: 18px; border-radius: 2px; object-fit: cover; vertical-align: middle;">
                    <span style="font-size: 0.7rem; color: #2563eb; font-weight: 700;">Lihat Foto</span>
                  </span>
                ` : ''}
              </div>
              <span class="figma-timeline-time">${item.time}</span>
            </div>
            <div class="figma-timeline-actor">${item.by || 'Sistem'}</div>
            <div class="figma-timeline-desc">${item.desc || ''}</div>
          </div>
        `;
      }).join('');
    } else {
      const isApproved = ticket.status === 'Disetujui' || ticket.status === 'Sedang di Luar' || ticket.status === 'Terlambat' || ticket.status === 'Selesai';
      const isScanOut = ticket.status === 'Sedang di Luar' || ticket.status === 'Terlambat' || ticket.status === 'Selesai' || ticket.scanOutTime;
      const isDone = ticket.status === 'Selesai';

      const dayStr = typeof window.formatDisplayDateOnly === 'function' ? window.formatDisplayDateOnly(ticket.plannedExit || ticket.createdAt) : '16 Okt 2026';
      const exitHour = ticket.plannedExit ? ticket.plannedExit.slice(11, 16) : '08.15';

      let timelineHtml = `
        <!-- Step 1: Pengajuan Dibuat -->
        <div class="figma-timeline-item">
          <div class="figma-timeline-dot"></div>
          <div class="figma-timeline-top">
            <span class="figma-timeline-event">Pengajuan Dibuat</span>
            <span class="figma-timeline-time">${dayStr} — ${exitHour} WIB</span>
          </div>
          <div class="figma-timeline-actor" style="display:flex; align-items:center; gap:6px;">${window.renderUserPhoto(ticket.applicantName || 'Budi Pratama, S.T.', 20)} <span>${ticket.applicantName || 'Budi Pratama, S.T.'} — ${ticket.applicantNip || 'PK-2024-8841'}</span></div>
          <div class="figma-timeline-desc">${ticket.category} — ${ticket.destination}</div>
        </div>
      `;

      if (isApproved) {
        timelineHtml += `
          <!-- Step 2: Disetujui Atasan -->
          <div class="figma-timeline-item">
            <div class="figma-timeline-dot"></div>
            <div class="figma-timeline-top">
              <span class="figma-timeline-event">Disetujui Atasan</span>
              <span class="figma-timeline-time">${dayStr} — 08.32 WIB</span>
            </div>
            <div class="figma-timeline-actor" style="display:flex; align-items:center; gap:6px;">${window.renderUserPhoto(ticket.approverName || 'Ir. Hendra Gunawan, M.T.', 20)} <span>${ticket.approverName || 'Ir. Hendra Gunawan, M.T.'}</span></div>
            <div class="figma-timeline-desc">"${ticket.approverNote || 'Disetujui. Sampaikan hasil pemeriksaan setelah kembali.'}"</div>
          </div>
        `;
      }

      if (isScanOut) {
        timelineHtml += `
          <!-- Step 3: Scan Out Pos Jaga -->
          <div class="figma-timeline-item">
            <div class="figma-timeline-dot"></div>
            <div class="figma-timeline-top">
              <span class="figma-timeline-event">Scan Out Pos Jaga</span>
              <span class="figma-timeline-time">${dayStr} — ${ticket.scanOutTime || '09.03'} WIB</span>
            </div>
            <div class="figma-timeline-actor" style="display:flex; align-items:center; gap:6px;">${window.renderUserPhoto(ticket.securityName || 'Agus Setiawan', 20)} <span>Pos 1 — ${ticket.securityName || 'Agus Setiawan'}</span></div>
            <div class="figma-timeline-desc">Identitas dan QR sesuai. Karyawan keluar area.</div>
          </div>
        `;
      }

      if (isDone) {
        timelineHtml += `
          <!-- Step 4: Tap In (Kartu Akses) -->
          <div class="figma-timeline-item">
            <div class="figma-timeline-dot green"></div>
            <div class="figma-timeline-top">
              <span class="figma-timeline-event">Tap In (Kartu Akses)</span>
              <span class="figma-timeline-time">${dayStr} — ${ticket.scanInTime || '10.52'} WIB</span>
            </div>
            <div class="figma-timeline-actor">Pos 1 — ${ticket.securityName || 'Agus Setiawan'}</div>
            <div class="figma-timeline-desc">Tepat Waktu — 8 menit sebelum batas kembali pukul 11.00 WIB.</div>
          </div>
        `;
      }

      figmaDetailTimelineList.innerHTML = timelineHtml;
    }
  }

  const FINISHED_STATUSES = ['Selesai', 'Dibatalkan', 'Ditolak', 'Kedaluwarsa'];
  const isFinished = FINISHED_STATUSES.includes(ticket.status);

  // Footer Metadata & Buttons
  const detailFooterMeta = document.getElementById('detailFooterMeta');
  if (detailFooterMeta) {
    if (ticket.status === 'Selesai') {
      detailFooterMeta.textContent = 'Selesai — Riwayat izin telah selesai';
    } else if (ticket.status === 'Sedang di Luar') {
      detailFooterMeta.textContent = 'Sedang di Luar — Dalam pantauan pos jaga';
    } else if (ticket.status === 'Disetujui' || ticket.status === 'Setuju') {
      detailFooterMeta.textContent = 'Disetujui — QR aktif siap digunakan';
    } else if (ticket.status === 'Ditolak') {
      detailFooterMeta.textContent = 'Ditolak — Pengajuan tidak disetujui';
    } else if (ticket.status === 'Dibatalkan') {
      detailFooterMeta.textContent = 'Dibatalkan — Pengajuan dibatalkan pemohon';
    } else if (ticket.status === 'Kedaluwarsa') {
      detailFooterMeta.textContent = 'Kedaluwarsa — Izin telah hangus';
    } else if (ticket.status === 'Terlambat') {
      detailFooterMeta.textContent = 'Terlambat — Waktu izin telah terlampaui';
    } else {
      detailFooterMeta.textContent = 'Menunggu — QR belum aktif';
    }
  }

  // Button: Buka Tiket QR (Hanya untuk Karyawan dan hanya SEBELUM scan out)
  const btnDetailOpenQR = document.getElementById('btnDetailOpenQR');
  if (btnDetailOpenQR) {
    const isKaryawan = (window.currentActor === 'karyawan' || window.currentActor === 'karyawan2');
    const canShowQR = isKaryawan && (ticket.status === 'Disetujui') && !ticket.scanOutTime;
    if (canShowQR) {
      btnDetailOpenQR.style.display = 'inline-flex';
      btnDetailOpenQR.onclick = () => {
        if (modalTicketDetail) modalTicketDetail.classList.remove('open');
        openDigitalPassModal(ticket.id);
      };
    } else {
      btnDetailOpenQR.style.display = 'none';
      btnDetailOpenQR.onclick = null;
    }
  }

  // Emergency Unlock Action Buttons, Top Banner & Info Box directly inside detail modal
  const topEmergencyAuthBanner = document.getElementById('topEmergencyAuthBanner');
  const btnBannerOpenPasscode = document.getElementById('btnBannerOpenPasscode');
  const btnBannerOpenFaceScan = document.getElementById('btnBannerOpenFaceScan');
  const btnBannerOpenAllMethods = document.getElementById('btnBannerOpenAllMethods');
  const btnDetailEmergencyUnlock = document.getElementById('btnDetailEmergencyUnlock');
  const infoEmergencyDetailBox = document.getElementById('infoEmergencyDetailBox');
  const btnDetailOpenUnlockBox = document.getElementById('btnDetailOpenUnlockBox');

  // Robust check: any emergency ticket waiting for authorization
  const isEmergencyTicket = Boolean(
    ticket.isEmergency === true ||
    ticket.status === 'Menunggu Otorisasi Darurat' ||
    (ticket.id && (ticket.id.includes('-EMG-') || ticket.id.startsWith('TK-EMG-')))
  );
  const isEmergLockedInDetail = !isFinished && isEmergencyTicket && (
    ticket.status === 'Menunggu Otorisasi Darurat' ||
    ticket.emergencyLocked === true ||
    ticket.qrLocked === true ||
    (ticket.status !== 'Disetujui' && ticket.status !== 'Sedang di Luar')
  );

  // 1. Top Prominent Banner (Always visible at the top of detail modal)
  if (topEmergencyAuthBanner) {
    if (isEmergLockedInDetail) {
      topEmergencyAuthBanner.style.display = 'block';
      if (btnBannerOpenPasscode) {
        btnBannerOpenPasscode.onclick = () => window.openEmergencyUnlockModal(ticket.id, 'passcode');
      }
      if (btnBannerOpenFaceScan) {
        btnBannerOpenFaceScan.onclick = () => window.openEmergencyUnlockModal(ticket.id, 'facescan');
      }
      if (btnBannerOpenAllMethods) {
        btnBannerOpenAllMethods.onclick = () => window.openEmergencyUnlockModal(ticket.id, 'app');
      }
      const isKaryawanActor = (window.currentActor === 'karyawan' || window.currentActor === 'karyawan2' || !window.currentActor);
      const isApproverOrSecurityOrAdmin = (window.currentActor === 'approver' || window.currentActor === 'approver2' || window.currentActor === 'security' || window.currentActor === 'admin');
      const canEditEmergency = !isFinished && isKaryawanActor && !isApproverOrSecurityOrAdmin;

      const btnBannerEditEmergency = document.getElementById('btnBannerEditEmergency');
      if (btnBannerEditEmergency) {
        if (canEditEmergency) {
          btnBannerEditEmergency.style.setProperty('display', 'inline-flex', 'important');
          btnBannerEditEmergency.onclick = () => openEditTicketModal(ticket.id);
        } else {
          btnBannerEditEmergency.style.setProperty('display', 'none', 'important');
          btnBannerEditEmergency.onclick = null;
        }
      }
    } else {
      topEmergencyAuthBanner.style.display = 'none';
      if (btnBannerOpenPasscode) btnBannerOpenPasscode.onclick = null;
      if (btnBannerOpenFaceScan) btnBannerOpenFaceScan.onclick = null;
      if (btnBannerOpenAllMethods) btnBannerOpenAllMethods.onclick = null;
    }
  }

  // 2. Middle Info Box
  if (infoEmergencyDetailBox) {
    if (isEmergLockedInDetail) {
      infoEmergencyDetailBox.style.display = 'block';
      const elApproverName = document.getElementById('infoEmgApproverName');
      if (elApproverName) elApproverName.textContent = ticket.approverName || 'Ir. Hendra Gunawan / Dewi Sartika';
      if (btnDetailOpenUnlockBox) {
        btnDetailOpenUnlockBox.onclick = () => window.openEmergencyUnlockModal(ticket.id);
      }
    } else {
      infoEmergencyDetailBox.style.display = 'none';
      if (btnDetailOpenUnlockBox) btnDetailOpenUnlockBox.onclick = null;
    }
  }

  // 3. Footer Button (⚡ Otorisasi Darurat)
  if (btnDetailEmergencyUnlock) { btnDetailEmergencyUnlock.style.display = "none"; btnDetailEmergencyUnlock.onclick = null; }

  // Edit Action Button directly inside detail modal (STRICTLY DISABLED IF IN RIWAYAT / FINISHED STATUS, OR IF TAGGED MEMBER IN GROUP DINAS)
  const btnDetailEditTicket = document.getElementById('btnDetailEditTicket');
  const activeEmpInfo = typeof getCurrentEmployeeActor === 'function' ? getCurrentEmployeeActor() : null;
  const myNipInfo = activeEmpInfo ? activeEmpInfo.nip : 'PK-2024-8841';
  const isInitiatorOfGroup = !ticket.isGroupDinas || (ticket.applicantNip === myNipInfo || (ticket.initiatorNip && ticket.initiatorNip === myNipInfo));

  const canEditTicketInDetail = !isFinished && (ticket.status === 'Menunggu Persetujuan' || ticket.status === 'Menunggu Otorisasi Darurat' || isEmergLockedInDetail) && !ticket.scanOutTime && ticket.status !== 'Disetujui' && isInitiatorOfGroup;
  if (btnDetailEditTicket) {
    if (canEditTicketInDetail && (window.currentActor === 'karyawan' || window.currentActor === 'karyawan2' || !window.currentActor)) {
      btnDetailEditTicket.style.display = 'inline-flex';
      btnDetailEditTicket.onclick = () => {
        openEditTicketModal(ticket.id);
      };
    } else {
      btnDetailEditTicket.style.display = 'none';
      btnDetailEditTicket.onclick = null;
    }
  }

  // Cancel Action Button directly inside detail modal (STRICTLY DISABLED IF IN RIWAYAT / FINISHED STATUS)
  const isKaryawanActor = (window.currentActor === 'karyawan' || window.currentActor === 'karyawan2' || !window.currentActor);
  const btnDetailCancelTicket = document.getElementById('btnDetailCancelTicket');
  const canCancelInDetail = !isFinished && isKaryawanActor && (ticket.status === 'Menunggu Persetujuan' || ticket.status === 'Menunggu Otorisasi Darurat' || ticket.status === 'Disetujui') && !ticket.scanOutTime;
  if (btnDetailCancelTicket) {
    if (canCancelInDetail) {
      btnDetailCancelTicket.style.display = 'inline-flex';
      btnDetailCancelTicket.onclick = () => {
        openCancelModal(ticket.id);
      };
    } else {
      btnDetailCancelTicket.style.display = 'none';
      btnDetailCancelTicket.onclick = null;
    }
  }

  // Approver Action Buttons (Tolak / Setujui) directly inside detail modal
  const btnDetailRejectTicket = document.getElementById('btnDetailRejectTicket');
  const btnDetailApproveTicket = document.getElementById('btnDetailApproveTicket');
  const isApproverActor = (window.currentActor === 'approver' || window.currentActor === 'approver2');
  const isPendingDecision = (ticket.status === 'Menunggu Persetujuan' || ticket.status === 'Menunggu Otorisasi Darurat');

  const isApprover2 = (window.currentActor === 'approver2');
  const myApproverName = isApprover2 ? (ACTORS.approver2 ? ACTORS.approver2.name : 'Dewi Sartika') : (ACTORS.approver ? ACTORS.approver.name : 'Hendra Gunawan');
  const tApprover = (ticket.approverName || '').toLowerCase();
  const tFrom = (ticket.reassignedFrom || '').toLowerCase();
  const myApproverLower = myApproverName.toLowerCase();

  const isAssignedToMe = (myApproverLower.includes('dewi') && tApprover.includes('dewi')) || (myApproverLower.includes('hendra') && (tApprover.includes('hendra') || !tApprover.includes('dewi')));
  const isReassignedFromMe = Boolean(tFrom && ((myApproverLower.includes('dewi') && tFrom.includes('dewi')) || (myApproverLower.includes('hendra') && tFrom.includes('hendra'))));

  if (btnDetailRejectTicket && btnDetailApproveTicket) {
    const isEmergFaceScan = Boolean(ticket.isEmergency || (ticket.id && ticket.id.includes('-EMG-'))) && (ticket.selectedMethod === 'facescan') && (ticket.status === 'Menunggu Otorisasi Darurat' || ticket.emergencyLocked);
    if (isApproverActor && isPendingDecision && isAssignedToMe && !isEmergFaceScan) {
      btnDetailRejectTicket.style.display = 'inline-flex';
      btnDetailApproveTicket.style.display = 'inline-flex';
      btnDetailRejectTicket.onclick = () => {
        if (typeof window.openRejectModal === 'function') {
          window.openRejectModal(ticket.id);
        }
      };
      btnDetailApproveTicket.onclick = () => {
        if (typeof window.openApproveModal === 'function') {
          window.openApproveModal(ticket.id);
        }
      };
    } else {
      btnDetailRejectTicket.style.display = 'none';
      btnDetailApproveTicket.style.display = 'none';
      btnDetailRejectTicket.onclick = null;
      btnDetailApproveTicket.onclick = null;
    }
  }

  // Approver Return Actions: Konfirmasi Tiba / Belum Tiba / Tap In Atasan
  const btnDetailConfirmArrival = document.getElementById('btnDetailConfirmArrival');
  const btnDetailRejectArrival = document.getElementById('btnDetailRejectArrival');
  const btnDetailReportArrival = document.getElementById('btnDetailReportArrival');

  if (btnDetailConfirmArrival && btnDetailRejectArrival) {
    const isPrimaryApprover = (typeof isTicketAssignedToCurrentApprover === 'function')
      ? isTicketAssignedToCurrentApprover(ticket)
      : Boolean(ticket.approverName && (ACTORS.approver?.name?.includes(ticket.approverName) || ACTORS.approver2?.name?.includes(ticket.approverName)));

    if (isApproverActor && isPrimaryApprover && ticket.status === 'Menunggu Verifikasi Atasan') {
      btnDetailConfirmArrival.style.display = 'inline-flex';
      btnDetailConfirmArrival.textContent = '✓ Ya, Sudah Tiba (Selesai)';
      btnDetailConfirmArrival.onclick = () => {
        if (modalTicketDetail) modalTicketDetail.classList.remove('open');
        if (typeof window.confirmArrivalByApprover === 'function') {
          window.confirmArrivalByApprover(ticket.id);
        }
      };

      btnDetailRejectArrival.style.display = 'inline-flex';
      btnDetailRejectArrival.style.background = '#dc2626';
      btnDetailRejectArrival.style.color = '#ffffff';
      btnDetailRejectArrival.style.borderColor = '#dc2626';
      btnDetailRejectArrival.textContent = '✕ Belum Tiba';
      btnDetailRejectArrival.onclick = () => {
        if (modalTicketDetail) modalTicketDetail.classList.remove('open');
        if (typeof window.rejectArrivalByApprover === 'function') {
          window.rejectArrivalByApprover(ticket.id);
        }
      };
    } else {
      btnDetailConfirmArrival.style.display = 'none';
      btnDetailRejectArrival.style.display = 'none';
      btnDetailConfirmArrival.onclick = null;
      btnDetailRejectArrival.onclick = null;
    }
  }

  const isGroupDinasActiveForTapIn = Boolean((ticket.isGroupDinas || (Array.isArray(ticket.members) && ticket.members.length > 0)) && (ticket.category === 'Dinas Kantor' || ticket.category === 'Dinas Perusahaan'));

  if (btnDetailReportArrival) {
    const isMyActiveDinas = isKaryawanActor && ticket.category === 'Dinas Kantor' && (ticket.status === 'Sedang di Luar' || ticket.status === 'Terlambat') && isGroupDinasActiveForTapIn;
    if (isMyActiveDinas) {
      btnDetailReportArrival.style.display = 'inline-flex';
      btnDetailReportArrival.textContent = '💳 Simulasi Tap In Gerbang';
      btnDetailReportArrival.onclick = () => {
        if (modalTicketDetail) modalTicketDetail.classList.remove('open');
        if (typeof window.openSimulasiTapInModal === 'function') {
          window.openSimulasiTapInModal(ticket.id);
        } else if (typeof window.reportArrivalAtOffice === 'function') {
          window.reportArrivalAtOffice(ticket.id);
        }
      };
    } else {
      btnDetailReportArrival.style.display = 'none';
      btnDetailReportArrival.onclick = null;
    }
  }

  // Security Action Buttons (Scan Out / Tap In) directly inside detail modal
  const btnDetailScanOut = document.getElementById('btnDetailScanOut');
  const btnDetailScanIn = document.getElementById('btnDetailScanIn');
  const activeRole = (typeof window.getCurrentRole === 'function' ? window.getCurrentRole() : window.currentActor) || '';
  const isSecurity = (activeRole === 'security');

  // Scan Out HANYA DAN MUTLAK di Pos Jaga, HANYA saat melalui terminal pemindaian (kamera scan, input tiket manual, atau upload QR scan)
  // TIDAK BOLEH muncul di atasan, notifikasi, karyawan, admin, atau riwayat
  const fromScanner = Boolean(window._openedFromScannerTerminal) && !window._openedFromNotification;
  const canScanOut = isSecurity &&
    fromScanner &&
    (ticket.status === 'Disetujui') &&
    !ticket.scanOutTime &&
    !(ticket.isEmergency && ticket.emergencyLocked);

  // Selalu reset flag scanner segera setelah evaluasi
  window._openedFromScannerTerminal = false;

  if (canScanOut) {
    if (modalTicketDetail) modalTicketDetail.classList.add('from-scanner-terminal');
    if (btnDetailScanOut) {
      btnDetailScanOut.style.display = 'inline-flex';
      btnDetailScanOut.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
        <span>Verifikasi Keluar (Scan Out)</span>
      `;
      btnDetailScanOut.onclick = function () {
        if (typeof window.executeScanOut === 'function') {
          window.executeScanOut(ticket.id);
        }
        if (typeof window.closeTicketDetailModal === 'function') {
          window.closeTicketDetailModal();
        } else if (modalTicketDetail) {
          modalTicketDetail.classList.remove('open');
          modalTicketDetail.classList.remove('from-scanner-terminal');
          modalTicketDetail.style.display = 'none';
        }
      };
    }
  } else {
    if (modalTicketDetail) modalTicketDetail.classList.remove('from-scanner-terminal');
    if (btnDetailScanOut) {
      btnDetailScanOut.style.setProperty('display', 'none', 'important');
      btnDetailScanOut.onclick = null;
    }
  }

  if (btnDetailScanIn) {
    const isOutsideToReturn = (ticket.status === 'Sedang di Luar' || ticket.status === 'Terlambat') && !ticket.scanInTime;
    const isKaryawan = (window.currentActor === 'karyawan');
    
    // Hapus button tap in saat ada button "💳 Simulasi Tap In Gerbang" khusus jika dinas kantor pakai Tim.
    // Jika perorangan / biasa, tetap tampilkan Tap In biasa.
    if (isOutsideToReturn && isKaryawan && !isGroupDinasActiveForTapIn) {
      btnDetailScanIn.style.display = 'inline-flex';
      btnDetailScanIn.onclick = function () {
        if (typeof window.executeScanIn === 'function') {
          window.executeScanIn(ticket.id);
        }
        if (modalTicketDetail) modalTicketDetail.classList.remove('open');
      };
    } else {
      btnDetailScanIn.style.display = 'none';
      btnDetailScanIn.onclick = null;
    }
  }

  // Pending Extension Info
  const infoPendingExtensionBox = document.getElementById('infoPendingExtensionBox');
  const infoExtNewReturn = document.getElementById('infoExtNewReturn');
  const infoExtReason = document.getElementById('infoExtReason');
  const approverExtActionBtns = document.getElementById('approverExtActionBtns');
  const btnDetailRejectExt = document.getElementById('btnDetailRejectExt');
  const btnDetailApproveExt = document.getElementById('btnDetailApproveExt');

  const hasPendingExt = ticket.pendingExtension && ticket.pendingExtension.status === 'Menunggu Persetujuan';
  if (infoPendingExtensionBox) {
    if (hasPendingExt) {
      infoPendingExtensionBox.style.display = 'block';
      if (infoExtNewReturn) {
        infoExtNewReturn.textContent = window.formatDisplayDate
          ? window.formatDisplayDate(ticket.pendingExtension.newEstimatedReturn)
          : ticket.pendingExtension.newEstimatedReturn;
      }
      if (infoExtReason) infoExtReason.textContent = ticket.pendingExtension.reason;

      if (approverExtActionBtns) {
        if (window.currentActor === 'approver') {
          approverExtActionBtns.style.display = 'flex';
          if (btnDetailApproveExt) {
            btnDetailApproveExt.onclick = () => {
              if (typeof window.approveExtensionRequest === 'function') {
                window.approveExtensionRequest(ticket.id);
              }
            };
          }
          if (btnDetailRejectExt) {
            btnDetailRejectExt.onclick = () => {
              if (typeof window.openRejectExtensionModal === 'function') {
                window.openRejectExtensionModal(ticket.id);
              }
            };
          }
        } else {
          approverExtActionBtns.style.display = 'none';
        }
      }
    } else {
      infoPendingExtensionBox.style.display = 'none';
    }
  }

  // Employee "Ajukan Perpanjangan" button in detail modal footer
  const btnDetailExtend = document.getElementById('btnDetailExtend');
  if (btnDetailExtend) {
    const isOutsideKembali = (ticket.status === 'Sedang di Luar') && ticket.type === 'Kembali ke Area';
    const hasUsedExtension = ticket.extensionApproved || (ticket.extensionCount && ticket.extensionCount >= 1);
    if (window.currentActor === 'karyawan' && isOutsideKembali && !hasPendingExt && !hasUsedExtension) {
      btnDetailExtend.style.display = 'inline-flex';
      btnDetailExtend.onclick = function () {
        if (modalTicketDetail) modalTicketDetail.classList.remove('open');
        openExtendDurationModal(ticket.id);
      };
    } else {
      btnDetailExtend.style.display = 'none';
      btnDetailExtend.onclick = null;
    }
  }

  // Individual ticket history delete button in detail modal footer
  // Tiket riwayat strictly read-only tanpa button aksi apapun (hapus hanya di tabel/kartu riwayat)
  const btnDetailDeleteTicket = document.getElementById('btnDetailDeleteTicket');
  if (btnDetailDeleteTicket) {
    btnDetailDeleteTicket.style.display = 'none';
    btnDetailDeleteTicket.onclick = null;
  }

  const activeTabName = (defaultTab === 'timeline' || defaultTab === 'riwayat') ? 'timeline' : 'info';
  switchDetailTab(activeTabName);

  // STRICT READ-ONLY MODE FOR FINISHED / RIWAYAT TICKETS OR NOTIFICATION PREVIEW
  const isReadOnlyFromNotif = (defaultTab === 'readonly' || (typeof options === 'object' && options && options.readOnlyFromNotif) || window._openedFromNotification);
  if (isFinished || isReadOnlyFromNotif) {
    const topEmergencyAuthBanner = document.getElementById('topEmergencyAuthBanner');
    if (topEmergencyAuthBanner) topEmergencyAuthBanner.style.setProperty('display', 'none', 'important');
    const infoEmergencyDetailBox = document.getElementById('infoEmergencyDetailBox');
    if (infoEmergencyDetailBox) infoEmergencyDetailBox.style.setProperty('display', 'none', 'important');

    const btnDetailEditTicket = document.getElementById('btnDetailEditTicket');
    if (btnDetailEditTicket) { btnDetailEditTicket.style.setProperty('display', 'none', 'important'); btnDetailEditTicket.onclick = null; }
    const btnDetailCancelTicket = document.getElementById('btnDetailCancelTicket');
    if (btnDetailCancelTicket) { btnDetailCancelTicket.style.setProperty('display', 'none', 'important'); btnDetailCancelTicket.onclick = null; }
    const btnDetailRejectTicket = document.getElementById('btnDetailRejectTicket');
    if (btnDetailRejectTicket) { btnDetailRejectTicket.style.setProperty('display', 'none', 'important'); btnDetailRejectTicket.onclick = null; }
    const btnDetailApproveTicket = document.getElementById('btnDetailApproveTicket');
    if (btnDetailApproveTicket) { btnDetailApproveTicket.style.setProperty('display', 'none', 'important'); btnDetailApproveTicket.onclick = null; }
    const btnDetailScanOut = document.getElementById('btnDetailScanOut');
    if (btnDetailScanOut) { btnDetailScanOut.style.setProperty('display', 'none', 'important'); btnDetailScanOut.onclick = null; }
    const btnDetailScanIn = document.getElementById('btnDetailScanIn');
    if (btnDetailScanIn) { btnDetailScanIn.style.setProperty('display', 'none', 'important'); btnDetailScanIn.onclick = null; }
    const btnDetailExtend = document.getElementById('btnDetailExtend');
    if (btnDetailExtend) { btnDetailExtend.style.setProperty('display', 'none', 'important'); btnDetailExtend.onclick = null; }
    const btnDetailDeleteTicket = document.getElementById('btnDetailDeleteTicket');
    if (btnDetailDeleteTicket) { btnDetailDeleteTicket.style.setProperty('display', 'none', 'important'); btnDetailDeleteTicket.onclick = null; }
    const btnDetailEmergencyUnlock = document.getElementById('btnDetailEmergencyUnlock');
    if (btnDetailEmergencyUnlock) { btnDetailEmergencyUnlock.style.setProperty('display', 'none', 'important'); btnDetailEmergencyUnlock.onclick = null; }
    const approverExtActionBtns = document.getElementById('approverExtActionBtns');
    if (approverExtActionBtns) { approverExtActionBtns.style.setProperty('display', 'none', 'important'); }

    // Make status badge on top right purely static if waiting for authorization
    const detailStatusPillTop = document.getElementById('detailStatusPillTop');
    if (detailStatusPillTop && !isFinished) {
      const isEmergBadge = ticket.status === 'Menunggu Otorisasi Darurat' || (ticket.id && ticket.id.includes('-EMG-') && ticket.status !== 'Disetujui' && ticket.status !== 'Sedang di Luar' && ticket.status !== 'Selesai');
      if (isEmergBadge) {
        detailStatusPillTop.innerHTML = `<span style="color: #b91c1c; font-weight: 800; font-size: 0.8rem;">Menunggu Otorisasi Darurat</span>`;
      }
    }

    if (isReadOnlyFromNotif && !isFinished) {
      const detailFooterMeta = document.getElementById('detailFooterMeta');
      if (detailFooterMeta) {
        detailFooterMeta.textContent = 'Mode Pratinjau Notifikasi — Hanya melihat rincian izin';
        detailFooterMeta.style.color = '#64748b';
      }
    }
  }

  if (modalTicketDetail) {
    modalTicketDetail.style.display = 'flex';
    modalTicketDetail.classList.add('open');
    if (typeof window.checkAndApplyTextExpand === 'function') {
      window.checkAndApplyTextExpand('infoDestination', 'btnToggleDestExpand');
      window.checkAndApplyTextExpand('infoReason', 'btnToggleReasonExpand');
    }
  }
}

function closeTicketDetailModal() {
  if (window._detailRealtimeLateTimer) {
    clearInterval(window._detailRealtimeLateTimer);
    window._detailRealtimeLateTimer = null;
  }
  const wasFromNotif = Boolean(window._openedFromNotification);
  const notifSource = window._openedFromNotificationSource || 'dropdown';
  const notifTab = window._openedFromNotificationTab || 'all';

  const modalTicketDetail = document.getElementById('modalTicketDetail');
  if (modalTicketDetail) {
    modalTicketDetail.classList.remove('open');
    modalTicketDetail.classList.remove('from-scanner-terminal');
    modalTicketDetail.style.display = 'none';
  }
  const btnDetailScanOut = document.getElementById('btnDetailScanOut');
  if (btnDetailScanOut) {
    btnDetailScanOut.style.setProperty('display', 'none', 'important');
    btnDetailScanOut.onclick = null;
  }
  window._openedFromScannerTerminal = false;
  window._openedFromNotification = false;
  window._openedFromNotificationSource = null;
  window._openedFromNotificationTab = null;
  document.body.classList.remove('modal-open');

  // JIKA DIBUKA DARI NOTIFIKASI: Kembalikan pengguna ke daftar notifikasi agar tidak perlu klik ikon notifikasi lagi
  if (wasFromNotif) {
    if (notifSource === 'dropdown') {
      setTimeout(() => {
        const dropdown = document.getElementById('desktopNotifDropdown');
        if (dropdown) {
          if (typeof window.renderDesktopNotifDropdownContent === 'function') {
            window.renderDesktopNotifDropdownContent();
          }
          dropdown.style.display = 'block';
        }
      }, 50);
    } else if (notifSource === 'mobile') {
      setTimeout(() => {
        if (typeof window.openMobileNotificationSheet === 'function') {
          window.openMobileNotificationSheet(notifTab);
        }
      }, 50);
    } else if (notifSource === 'fullpage') {
      if (typeof window.renderDesktopFullNotifikasiPage === 'function') {
        window.renderDesktopFullNotifikasiPage(notifTab);
      }
    }
  }
}
window.closeTicketDetailModal = closeTicketDetailModal;

// CANCELLATION FLOW
function openCancelModal(ticketId, callback) {
  if (typeof window.guardActiveFeatureAccess === 'function' && !window.guardActiveFeatureAccess()) return;
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  const isEmergLocked = ticket.isEmergency && (ticket.emergencyLocked || ticket.status === 'Menunggu Otorisasi Darurat');
  const isOutside = (ticket.status === 'Sedang di Luar' || ticket.status === 'Terlambat');
  const isFinished = (ticket.status === 'Selesai' || ticket.status === 'Dibatalkan' || ticket.status === 'Ditolak' || ticket.status === 'Kedaluwarsa');
  const canCancel = !isOutside && !isFinished;

  if (!canCancel) {
    if (typeof window.showToast === 'function') {
      window.showToast('Tiket ini tidak dapat dibatalkan karena karyawan telah meninggalkan kawasan pabrik (Scan Out). Silakan lakukan Tap In di Pos 1 untuk menyelesaikan izin.', 'danger');
    }
    return;
  }

  if (ticket && (ticket.scanOutTime || ticket.status === 'Sedang di Luar' || ticket.status === 'Terlambat' || ticket.status === 'Selesai')) {
    if (typeof window.showToast === 'function') {
      window.showToast(`Akses Ditolak: Tiket #${ticketId} tidak dapat dibatalkan karena sudah aktif di luar area atau telah selesai.`, 'danger');
    }
    return;
  }

  const myNip = (window.getCurrentEmployeeActor ? window.getCurrentEmployeeActor().nip : null) || 'PK-2024-8841';
  const isInitiator = ticket.applicantNip === myNip || (!ticket.applicantNip && myNip === 'PK-2024-8841');
  const isTaggedMember = Boolean(ticket.isGroupDinas && Array.isArray(ticket.members) && ticket.members.some(m => m.nip === myNip && m.status !== 'batal'));

  if (!isInitiator && !isTaggedMember && (window.currentActor === 'karyawan' || window.currentActor === 'karyawan2' || !window.currentActor)) {
    if (typeof window.showToast === 'function') {
      window.showToast('Anda tidak berhak membatalkan izin milik karyawan lain.', 'danger');
    }
    return;
  }

  // Close other modals so cancel modal is cleanly visible
  const modalTicketDetail = document.getElementById('modalTicketDetail');
  if (modalTicketDetail) modalTicketDetail.classList.remove('open');
  const modalActiveBlocked = document.getElementById('modalActiveBlocked');
  if (modalActiveBlocked) modalActiveBlocked.classList.remove('open');

  window.currentCancelTicketId = ticketId;
  window.cancelTicketCallback = (typeof callback === 'function') ? callback : null;
  const cancelTicketId = document.getElementById('cancelTicketId');
  const cancelReasonInput = document.getElementById('cancelReasonInput');
  const modalCancelRequest = document.getElementById('modalCancelRequest');
  const cancelPromptText = document.getElementById('cancelPromptText');
  const cancelGroupDinasNotice = document.getElementById('cancelGroupDinasNotice');
  const btnCancelOnlyMe = document.getElementById('btnCancelOnlyMe');
  const btnConfirmCancelTicket = document.getElementById('btnConfirmCancelTicket');

  if (cancelTicketId) cancelTicketId.textContent = ticketId;
  if (cancelReasonInput) cancelReasonInput.value = '';

  if (ticket.isGroupDinas) {
    if (cancelGroupDinasNotice) cancelGroupDinasNotice.style.display = 'block';
    if (isTaggedMember) {
      if (cancelPromptText) {
        cancelPromptText.innerHTML = `Batalkan keikutsertaan Anda dalam izin tim dinas tiket <strong id="cancelTicketId">${ticketId}</strong>? Rekan tim lain dan inisiator tetap dapat melanjutkan dinas.`;
      }
      if (btnCancelOnlyMe) btnCancelOnlyMe.style.display = 'none';
      if (btnConfirmCancelTicket) {
        btnConfirmCancelTicket.textContent = 'Ya, Batalkan Keikutsertaan Saya';
      }
    } else if (isInitiator) {
      const activeMembers = (ticket.members || []).filter(m => m.status !== 'batal');
      if (cancelPromptText) {
        cancelPromptText.innerHTML = `Anda adalah <strong>Inisiator Pengajuan</strong> tim dinas <strong id="cancelTicketId">${ticketId}</strong>. Silakan tentukan tindakan pembatalan:`;
      }
      if (activeMembers.length > 0) {
        if (btnCancelOnlyMe) {
          btnCancelOnlyMe.style.display = 'inline-flex';
          btnCancelOnlyMe.onclick = () => {
            if (modalCancelRequest) modalCancelRequest.classList.remove('open');
            if (typeof window.cancelGroupForInitiatorOnly === 'function') {
              window.cancelGroupForInitiatorOnly(ticketId);
            }
          };
        }
        if (btnConfirmCancelTicket) {
          btnConfirmCancelTicket.textContent = 'Batalkan Seluruh Pengajuan Tim';
        }
      } else {
        if (btnCancelOnlyMe) btnCancelOnlyMe.style.display = 'none';
        if (btnConfirmCancelTicket) {
          btnConfirmCancelTicket.textContent = 'Ya, Batalkan Izin';
        }
      }
    }
  } else {
    if (cancelGroupDinasNotice) cancelGroupDinasNotice.style.display = 'none';
    if (btnCancelOnlyMe) btnCancelOnlyMe.style.display = 'none';
    if (cancelPromptText) {
      cancelPromptText.innerHTML = `Apakah Anda yakin ingin membatalkan tiket izin <strong id="cancelTicketId">${ticketId}</strong>?`;
    }
    if (btnConfirmCancelTicket) {
      btnConfirmCancelTicket.textContent = 'Ya, Batalkan Izin';
    }
  }

  if (modalCancelRequest) modalCancelRequest.classList.add('open');
}

function confirmCancelTicket() {
  const cancelReasonInput = document.getElementById('cancelReasonInput');
  const reason = (cancelReasonInput && cancelReasonInput.value.trim()) || 'Dibatalkan mandiri oleh pemohon.';

  const ticketsList = window.ticketsList || [];
  const ticketId = window.currentCancelTicketId;
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (ticket) {
    const myNip = (window.getCurrentEmployeeActor ? window.getCurrentEmployeeActor().nip : null) || 'PK-2024-8841';
    const isInitiator = ticket.applicantNip === myNip || (!ticket.applicantNip && myNip === 'PK-2024-8841');
    const memberObj = (ticket.isGroupDinas && Array.isArray(ticket.members)) ? ticket.members.find(m => m.nip === myNip) : null;

    // Jika yang membatalkan adalah anggota rombongan (bukan inisiator), hanya batalkan keikutsertaan anggota tersebut
    if (memberObj && !isInitiator) {
      if (typeof window.cancelMemberParticipation === 'function') {
        window.cancelMemberParticipation(ticketId, myNip);
      }
      const modalCancelRequest = document.getElementById('modalCancelRequest');
      if (modalCancelRequest) modalCancelRequest.classList.remove('open');
      return;
    }

    if (ticket.scanOutTime || ticket.status === 'Sedang di Luar' || ticket.status === 'Terlambat' || ticket.status === 'Selesai') {
      if (typeof window.showToast === 'function') {
        window.showToast(`Akses Ditolak: Tiket #${ticketId} tidak dapat dibatalkan karena sudah aktif di luar area atau telah selesai.`, 'danger');
      }
      const modalCancelRequest = document.getElementById('modalCancelRequest');
      if (modalCancelRequest) modalCancelRequest.classList.remove('open');
      return;
    }
    const ACTORS = window.ACTORS || {};
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const nowFormatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

    ticket.status = 'Dibatalkan';
    ticket.scanOutTime = null;
    ticket.scanInTime = null;
    ticket.emergencyLocked = false;
    ticket.qrLocked = false;
    if (!ticket.timeline) ticket.timeline = [];
    ticket.timeline.push({
      event: 'Pengajuan Dibatalkan',
      time: nowFormatted,
      by: `${getActiveEmployeeActorInfo().name} (Karyawan)`,
      desc: `Dibatalkan mandiri. Alasan: "${reason}".`
    });

    window.saveTickets(ticketsList);

    const modalCancelRequest = document.getElementById('modalCancelRequest');
    if (modalCancelRequest) modalCancelRequest.classList.remove('open');
    const modalTicketDetail = document.getElementById('modalTicketDetail');
    if (modalTicketDetail) modalTicketDetail.classList.remove('open');
    const modalActiveBlocked = document.getElementById('modalActiveBlocked');
    if (modalActiveBlocked) modalActiveBlocked.classList.remove('open');

    if (typeof window.showToast === 'function') {
      window.showToast(`Tiket #${ticketId} berhasil dibatalkan. Anda kini dapat mengajukan izin baru.`, 'success');
    }
    if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
    if (typeof window.renderApproverView === 'function') window.renderApproverView();
    if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
    if (typeof window.updateApproverMetrics === 'function') window.updateApproverMetrics();
    if (typeof window.renderSecurityView === 'function') window.renderSecurityView();
    if (typeof window.updateSecurityMetrics === 'function') window.updateSecurityMetrics();

    if (typeof window.cancelTicketCallback === 'function') {
      const cb = window.cancelTicketCallback;
      window.cancelTicketCallback = null;
      cb();
    }
  }
}

window.openCancelModal = openCancelModal;
window.openCancelTicketModal = openCancelModal;
window.confirmCancelTicket = confirmCancelTicket;

// EMERGENCY PASS
function handleOpenEmergency() {
  window.editingEmergencyTicketId = null;

  // Intercept if employee already has an active permit
  const activeTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : null;
  if (activeTicket) {
    const modalActiveBlocked = document.getElementById('modalActiveBlocked');
    const blockedTicketId = document.getElementById('blockedTicketId');
    const blockedContainer = document.getElementById('blockedTicketStatusContainer');
    const btnBlockedViewTicket = document.getElementById('btnBlockedViewTicket');
    const btnBlockedEditTicket = document.getElementById('btnBlockedEditTicket');
    const btnBlockedCancelTicket = document.getElementById('btnBlockedCancelTicket');
    const modalBlockedTitle = modalActiveBlocked ? modalActiveBlocked.querySelector('.modal-header h3') : null;
    const modalBlockedDesc = modalActiveBlocked ? modalActiveBlocked.querySelector('.modal-header p') : null;

    if (modalBlockedTitle) modalBlockedTitle.textContent = 'Pengajuan Izin Darurat Ditangguhkan';
    if (modalBlockedDesc) modalBlockedDesc.textContent = 'Ketentuan Pembatasan Izin Aktif Karyawan';
    if (blockedTicketId) blockedTicketId.textContent = activeTicket.id;
    if (blockedContainer) {
      blockedContainer.innerHTML = typeof window.getCleanEmpStatus === 'function'
        ? window.getCleanEmpStatus(activeTicket.status, activeTicket)
        : activeTicket.status;
    }

    if (btnBlockedViewTicket) {
      btnBlockedViewTicket.onclick = () => {
        if (modalActiveBlocked) modalActiveBlocked.classList.remove('open');
        if (activeTicket.isEmergency && activeTicket.emergencyLocked) {
          window.openEmergencyUnlockModal(activeTicket.id, activeTicket.selectedMethod || 'app');
        } else {
          openTicketDetail(activeTicket.id, 'detail');
        }
      };
    }

    const isEmergLocked = activeTicket.isEmergency && (activeTicket.emergencyLocked || activeTicket.status === 'Menunggu Otorisasi Darurat');
    const canCancel = activeTicket.status === 'Menunggu Persetujuan' || activeTicket.status === 'Menunggu Otorisasi Darurat' || isEmergLocked || (activeTicket.status === 'Disetujui' && !activeTicket.scanOutTime) || activeTicket.status === 'Kedaluwarsa';

    if (btnBlockedCancelTicket) {
      if (canCancel) {
        btnBlockedCancelTicket.style.display = 'inline-flex';
        btnBlockedCancelTicket.textContent = 'Batalkan Izin Ini untuk Buat Izin Darurat';
        btnBlockedCancelTicket.onclick = () => {
          if (modalActiveBlocked) modalActiveBlocked.classList.remove('open');
          openCancelModal(activeTicket.id, () => {
            setTimeout(() => {
              handleOpenEmergency();
            }, 250);
          });
        };
      } else {
        btnBlockedCancelTicket.style.display = 'none';
        btnBlockedCancelTicket.onclick = null;
      }
    }

    if (btnBlockedEditTicket) btnBlockedEditTicket.style.display = 'none';

    if (modalActiveBlocked) modalActiveBlocked.classList.add('open');
    if (typeof window.showToast === 'function') {
      window.showToast(`Izin Darurat tidak dapat diajukan: Anda masih memiliki izin aktif (${activeTicket.id}). Batalkan izin terlebih dahulu!`, 'danger');
    }
    return;
  }

  const modalEmergency = document.getElementById('modalEmergency');
  if (!modalEmergency) return;

  const modalTitle = document.getElementById('modalEmergencyTitle');
  const modalSubtitle = document.getElementById('modalEmergencySubtitle');
  const btnSubmitEmergency = document.getElementById('btnSubmitEmergency');
  const btnCancelFormEmergency = document.getElementById('btnCancelFormEmergency');
  if (btnCancelFormEmergency) btnCancelFormEmergency.style.display = 'none';
  if (modalTitle) {
    modalTitle.innerHTML = `<span>Formulir Izin Darurat — Rancangan</span>`;
  }
  if (modalSubtitle) {
    modalSubtitle.textContent = 'Gunakan hanya untuk evakuasi atau keadaan mendesak — Semua data wajib diisi';
  }
  if (btnSubmitEmergency) {
    btnSubmitEmergency.textContent = 'Terbitkan QR Darurat';
  }

  if (typeof window.syncApproversToForms === 'function') {
    window.syncApproversToForms();
  }
  // Tidak memilih atasan secara default agar form kosong saat dibuka
  if (typeof window.resetEmergApproverSearch === 'function') {
    window.resetEmergApproverSearch();
  }
  const emergApprover = document.getElementById('emergApprover');
  if (emergApprover) emergApprover.value = '';

  const primaryApprover = typeof window.getPrimaryApprover === 'function' ? window.getPrimaryApprover() : null;
  const emergNoApproverNotice = document.getElementById('emergNoApproverNotice');
  if (emergNoApproverNotice) {
    emergNoApproverNotice.style.display = primaryApprover ? 'none' : 'flex';
  }

  const emergDest = document.getElementById('emergDest');
  const emergReason = document.getElementById('emergReason');
  const emergPlannedExit = document.getElementById('emergPlannedExit');
  const emergEstimatedReturn = document.getElementById('emergEstimatedReturn');
  const emergGroupEstimatedReturn = document.getElementById('emergGroupEstimatedReturn');
  const selectEmergCategory = document.getElementById('selectEmergCategory');
  const selectEmergType = document.getElementById('selectEmergType');

  if (emergDest) { emergDest.value = ''; const c = document.getElementById('countEmergDest'); if (c) c.textContent = '0'; }
  if (emergReason) emergReason.value = '';
  if (selectEmergCategory) selectEmergCategory.value = '';
  if (selectEmergType) {
    selectEmergType.value = '';
    selectEmergType.dispatchEvent(new Event('change'));
  }
  if (emergGroupEstimatedReturn) emergGroupEstimatedReturn.style.display = 'block';
  const emergGroupDinasWrapper = document.getElementById('emergGroupDinasMembersWrapper');
  if (emergGroupDinasWrapper) emergGroupDinasWrapper.style.display = 'none';
  if (typeof window.resetAllDinasUploadState === 'function') {
    window.resetAllDinasUploadState();
  }

  // Reset emergency authorization method to default (app)
  const optEmergMethodApp = document.getElementById('optEmergMethodApp');
  const optEmergMethodFaceScan = document.getElementById('optEmergMethodFaceScan');
  if (optEmergMethodApp && optEmergMethodFaceScan) {
    optEmergMethodApp.classList.add('selected');
    optEmergMethodFaceScan.classList.remove('selected');
    const input = optEmergMethodApp.querySelector('input[type="radio"]');
    if (input) input.checked = true;
  }

  // Tanggal dan waktu dikosongkan (hanya diberi batasan minimum hari ini)
  const now = new Date();
  const currentMinStr = getFormattedDateTimeLocal(now);

  if (emergPlannedExit) {
    emergPlannedExit.min = currentMinStr;
    emergPlannedExit.value = '';
    emergPlannedExit.removeAttribute('max');
  }
  if (emergEstimatedReturn) {
    emergEstimatedReturn.min = currentMinStr;
    emergEstimatedReturn.value = '';
    emergEstimatedReturn.removeAttribute('max');
  }

  if (modalEmergency) modalEmergency.classList.add('open');
}

document.addEventListener('DOMContentLoaded', () => {
  setupRadioToggles();
  initFormDates();
  setupApproverSearch();

  // Setup batasan tanggal/waktu minimum dan jam operasional kerja
  const inputPlannedExit = document.getElementById('inputPlannedExit');
  const inputEstimatedReturn = document.getElementById('inputEstimatedReturn');
  const emergPlannedExit = document.getElementById('emergPlannedExit');
  const emergEstimatedReturn = document.getElementById('emergEstimatedReturn');

  function handleDateTimeInputValidation(inputEl, label, companionReturnEl) {
    if (!inputEl || !inputEl.value) return;

    const currentMin = getFormattedDateTimeLocal(new Date());
    inputEl.min = currentMin;

    if (inputEl.value < currentMin) {
      inputEl.value = currentMin;
      if (typeof window.showToast === 'function') {
        window.showToast('Hari atau tanggal sebelumnya tidak dapat dipilih!', 'warning');
      }
    }

    // Identifikasi kategori pengajuan (Dinas Kantor vs Urusan Pribadi)
    let catVal = '';
    if (inputEl.id === 'emergPlannedExit' || inputEl.id === 'emergEstimatedReturn') {
      const selectEmergCategory = document.getElementById('selectEmergCategory');
      catVal = selectEmergCategory ? selectEmergCategory.value : '';
    } else {
      const selectReqCategory = document.getElementById('selectReqCategory');
      catVal = selectReqCategory ? selectReqCategory.value : '';
    }
    const isDinas = isDinasCategory(catVal);

    const d = new Date(inputEl.value);
    const now = new Date();

    if (isDinas || !catVal) {
      // Dinas Kantor (atau form baru dibuka sebelum memilih kategori): Bebaskan pemilihan hari besok dan selanjutnya
      inputEl.removeAttribute('max');
      if (companionReturnEl) {
        companionReturnEl.removeAttribute('max');
        companionReturnEl.min = inputEl.value;
      }
    } else {
      // Urusan Pribadi: Kunci batas tanggal ke hari ini saja
      setInputMaxByDate(inputEl, now);
      if (companionReturnEl) {
        setInputMaxByDate(companionReturnEl, now);
        companionReturnEl.min = inputEl.value;
      }

      if (!isNaN(d.getTime())) {
        if (d.getDate() !== now.getDate() || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) {
          inputEl.value = currentMin;
          if (typeof window.showToast === 'function') {
            window.showToast('Untuk Urusan Pribadi, perizinan hanya berlaku untuk hari ini.', 'warning');
          }
        }
      }
    }

    const check = validateWorkingHours(inputEl.value, label);
    if (!check.valid) {
      if (typeof window.showToast === 'function') {
        window.showToast(check.message, 'danger');
      }
      inputEl.style.borderColor = '#e11d48';
    } else {
      inputEl.style.borderColor = '';
    }

    // Perbarui perkiraan kembali otomatis jika ada dan lebih kecil dari rencana keluar
    if (companionReturnEl && inputEl.value) {
      companionReturnEl.min = inputEl.value;
      if (companionReturnEl.value && companionReturnEl.value <= inputEl.value) {
        const exitDt = new Date(inputEl.value);
        const newReturn = new Date(exitDt.getTime() + 60 * 60000);
        companionReturnEl.value = getFormattedDateTimeLocal(newReturn);
        companionReturnEl.removeAttribute('max');
      }
    }
  }

  function handleReturnInputValidation(returnEl, exitEl, label) {
    if (!returnEl || !returnEl.value) return;

    const minReturn = exitEl && exitEl.value ? exitEl.value : getFormattedDateTimeLocal(new Date());
    returnEl.min = minReturn;

    if (returnEl.value < minReturn) {
      returnEl.value = minReturn;
      if (typeof window.showToast === 'function') {
        window.showToast('Perkiraan waktu kembali tidak boleh sebelum rencana waktu keluar!', 'warning');
      }
    }

    // Identifikasi kategori pengajuan
    let catVal = '';
    if (returnEl.id === 'emergPlannedExit' || returnEl.id === 'emergEstimatedReturn') {
      const selectEmergCategory = document.getElementById('selectEmergCategory');
      catVal = selectEmergCategory ? selectEmergCategory.value : '';
    } else {
      const selectReqCategory = document.getElementById('selectReqCategory');
      catVal = selectReqCategory ? selectReqCategory.value : '';
    }
    const isDinas = isDinasCategory(catVal);

    const d = new Date(returnEl.value);
    const now = new Date();

    if (isDinas || !catVal) {
      returnEl.removeAttribute('max');
    } else {
      setInputMaxByDate(returnEl, now);
      if (!isNaN(d.getTime())) {
        if (d.getDate() !== now.getDate() || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) {
          returnEl.value = minReturn;
          if (typeof window.showToast === 'function') {
            window.showToast('Untuk Urusan Pribadi, perizinan hanya berlaku untuk hari ini.', 'warning');
          }
        }
      }
    }

    const check = validateWorkingHours(returnEl.value, label);
    if (!check.valid) {
      if (typeof window.showToast === 'function') {
        window.showToast(check.message, 'danger');
      }
      returnEl.style.borderColor = '#e11d48';
    } else {
      returnEl.style.borderColor = '';
    }
  }

  if (inputPlannedExit) {
    inputPlannedExit.addEventListener('change', () => handleDateTimeInputValidation(inputPlannedExit, 'Rencana waktu keluar', inputEstimatedReturn));
    inputPlannedExit.addEventListener('blur', () => handleDateTimeInputValidation(inputPlannedExit, 'Rencana waktu keluar', inputEstimatedReturn));
    inputPlannedExit.addEventListener('input', () => {
      if (inputEstimatedReturn && inputPlannedExit.value) {
        inputEstimatedReturn.min = inputPlannedExit.value;
      }
    });
  }

  if (inputEstimatedReturn) {
    inputEstimatedReturn.addEventListener('change', () => handleReturnInputValidation(inputEstimatedReturn, inputPlannedExit, 'Perkiraan waktu kembali'));
    inputEstimatedReturn.addEventListener('blur', () => handleReturnInputValidation(inputEstimatedReturn, inputPlannedExit, 'Perkiraan waktu kembali'));
  }

  if (emergPlannedExit) {
    emergPlannedExit.addEventListener('change', () => handleDateTimeInputValidation(emergPlannedExit, 'Rencana waktu keluar darurat', emergEstimatedReturn));
    emergPlannedExit.addEventListener('blur', () => handleDateTimeInputValidation(emergPlannedExit, 'Rencana waktu keluar darurat', emergEstimatedReturn));
    emergPlannedExit.addEventListener('input', () => {
      if (emergEstimatedReturn && emergPlannedExit.value) {
        emergEstimatedReturn.min = emergPlannedExit.value;
      }
    });
  }

  if (emergEstimatedReturn) {
    emergEstimatedReturn.addEventListener('change', () => handleReturnInputValidation(emergEstimatedReturn, emergPlannedExit, 'Perkiraan waktu kembali darurat'));
    emergEstimatedReturn.addEventListener('blur', () => handleReturnInputValidation(emergEstimatedReturn, emergPlannedExit, 'Perkiraan waktu kembali darurat'));
  }

  const btnOpenNewRequestModal = document.getElementById('btnOpenNewRequestModal');
  const menuQuickNew = document.getElementById('menuQuickNew');
  const btnCloseBlockedModal = document.getElementById('btnCloseBlockedModal');
  const btnDismissBlockedModal = document.getElementById('btnDismissBlockedModal');
  const modalActiveBlocked = document.getElementById('modalActiveBlocked');
  const modalNewRequest = document.getElementById('modalNewRequest');
  const formNewRequest = document.getElementById('formNewRequest');
  const modalConfirmSummary = document.getElementById('modalConfirmSummary');

  // btnOpenNewRequestModal uses inline onclick="handleOpenNewRequest()"
  if (btnOpenNewRequestModal && !btnOpenNewRequestModal.getAttribute('onclick')) {
    btnOpenNewRequestModal.addEventListener('click', handleOpenNewRequest);
  }
  if (menuQuickNew) {
    menuQuickNew.addEventListener('click', () => {
      if (window.currentActor !== 'karyawan' && typeof window.switchRole === 'function') {
        window.switchRole('karyawan');
      }
      handleOpenNewRequest();
    });
  }

  if (btnCloseBlockedModal) btnCloseBlockedModal.addEventListener('click', () => modalActiveBlocked.classList.remove('open'));
  if (btnDismissBlockedModal) btnDismissBlockedModal.addEventListener('click', () => modalActiveBlocked.classList.remove('open'));

  const btnCloseNewModal = document.getElementById('btnCloseNewModal');
  const btnCancelNewModal = document.getElementById('btnCancelNewModal');
  if (btnCloseNewModal) btnCloseNewModal.addEventListener('click', () => modalNewRequest.classList.remove('open'));
  if (btnCancelNewModal) btnCancelNewModal.addEventListener('click', () => modalNewRequest.classList.remove('open'));

  // Form submission to confirm summary
  if (formNewRequest) {
    formNewRequest.addEventListener('submit', (e) => {
      e.preventDefault();

      // Validasi Batas Maksimal Pengajuan (Sebelum Jam Pulang Kantor)
      // Hari biasa: 07:00 - 16:00, Jumat: 07:00 - 16:30
      const workHoursCheck = isWithinOperationalHours(new Date());
      if (!workHoursCheck.allowed) {
        if (typeof window.showToast === 'function') {
          window.showToast(`Pengajuan izin hanya dapat dilakukan sebelum jam pulang kantor (${workHoursCheck.scheduleText})!`, 'danger');
        }
        return;
      }

      if (!window.editingTicketId && typeof window.getActiveTicket === 'function' && window.getActiveTicket()) {
        if (typeof window.showToast === 'function') window.showToast('Gagal mengajukan: Anda masih memiliki tiket izin yang sedang aktif!', 'danger');
        modalNewRequest.classList.remove('open');
        return;
      }

      const inputDestination = document.getElementById('inputDestination');
      const inputReason = document.getElementById('inputReason');
      const inputPlannedExit = document.getElementById('inputPlannedExit');
      const inputEstimatedReturn = document.getElementById('inputEstimatedReturn');
      const selectReqCategory = document.getElementById('selectReqCategory');
      const selectReqType = document.getElementById('selectReqType');

      const category = selectReqCategory ? selectReqCategory.value : (formNewRequest.reqCategory ? formNewRequest.reqCategory.value : '');
      const type = selectReqType ? selectReqType.value : (formNewRequest.reqType ? formNewRequest.reqType.value : '');
      const destination = inputDestination ? inputDestination.value.trim().slice(0, 300) : '';
      const reason = inputReason ? inputReason.value.trim() : '';
      const plannedExit = inputPlannedExit ? inputPlannedExit.value : '';
      const estimatedReturn = type === 'Kembali ke Area' ? (inputEstimatedReturn ? inputEstimatedReturn.value : null) : null;

      if (!category) {
        if (typeof window.showToast === 'function') window.showToast('Harap pilih kategori keperluan!', 'warning');
        if (selectReqCategory) selectReqCategory.focus();
        return;
      }
      if (!type) {
        if (typeof window.showToast === 'function') window.showToast('Harap pilih tipe kepulangan!', 'warning');
        if (selectReqType) selectReqType.focus();
        return;
      }
      if (!destination || !reason) {
        if (typeof window.showToast === 'function') window.showToast('Harap lengkapi lokasi tujuan dan alasan keperluan izin!', 'warning');
        return;
      }
      if (!plannedExit) {
        if (typeof window.showToast === 'function') window.showToast('Harap isi rencana waktu keluar!', 'warning');
        if (inputPlannedExit) inputPlannedExit.focus();
        return;
      }
      if (type === 'Kembali ke Area' && !estimatedReturn) {
        if (typeof window.showToast === 'function') window.showToast('Harap isi perkiraan waktu kembali!', 'warning');
        if (inputEstimatedReturn) inputEstimatedReturn.focus();
        return;
      }

      // Validasi proteksi tanggal masa lampau (hari/tanggal sebelumnya tidak dapat dipilih)
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      if (plannedExit && new Date(plannedExit) < oneMinuteAgo) {
        if (typeof window.showToast === 'function') {
          window.showToast('Hari atau tanggal sebelumnya tidak dapat dipilih sebagai rencana waktu keluar!', 'danger');
        }
        if (inputPlannedExit) inputPlannedExit.focus();
        return;
      }

      // Validasi: Urusan Pribadi hanya berlaku untuk hari ini
      if (!isDinasCategory(category)) {
        const exitD = new Date(plannedExit);
        if (exitD.getDate() !== now.getDate() || exitD.getMonth() !== now.getMonth() || exitD.getFullYear() !== now.getFullYear()) {
          if (typeof window.showToast === 'function') {
            window.showToast('Untuk keperluan Urusan Pribadi, izin keluar hanya berlaku untuk hari ini!', 'warning');
          }
          if (inputPlannedExit) inputPlannedExit.focus();
          return;
        }
      }

      // Reset border merah saat pengguna mengetik/memperbaiki tanggal/jam
      if (inputPlannedExit && !inputPlannedExit._borderResetBound) {
        inputPlannedExit.addEventListener('input', () => { inputPlannedExit.style.borderColor = ''; });
        inputPlannedExit._borderResetBound = true;
      }
      if (inputEstimatedReturn && !inputEstimatedReturn._borderResetBound) {
        inputEstimatedReturn.addEventListener('input', () => { inputEstimatedReturn.style.borderColor = ''; });
        inputEstimatedReturn._borderResetBound = true;
      }

      // Validasi Rencana Waktu Keluar terhadap jam kerja kantor (Senin - Kamis max 16:00, Jumat max 16:30, minimal 07:00)
      const exitWorkCheck = validateWorkingHours(plannedExit, 'Rencana waktu keluar');
      if (!exitWorkCheck.valid) {
        if (typeof window.showToast === 'function') {
          window.showToast(exitWorkCheck.message, 'danger');
        }
        if (inputPlannedExit) {
          inputPlannedExit.focus();
          inputPlannedExit.style.borderColor = '#e11d48';
        }
        return;
      }

      if (type === 'Kembali ke Area') {
        if (estimatedReturn && new Date(estimatedReturn) <= new Date(plannedExit)) {
          if (typeof window.showToast === 'function') window.showToast('Perkiraan jam kembali harus lebih besar dari rencana jam keluar!', 'danger');
          if (inputEstimatedReturn) inputEstimatedReturn.focus();
          return;
        }

        // Validasi: Urusan Pribadi perkiraan kembali harus hari ini
        if (!isDinasCategory(category)) {
          const retD = new Date(estimatedReturn);
          if (retD.getDate() !== now.getDate() || retD.getMonth() !== now.getMonth() || retD.getFullYear() !== now.getFullYear()) {
            if (typeof window.showToast === 'function') {
              window.showToast('Untuk keperluan Urusan Pribadi, perkiraan waktu kembali harus pada hari ini!', 'warning');
            }
            if (inputEstimatedReturn) inputEstimatedReturn.focus();
            return;
          }
        }

        // Validasi Perkiraan Waktu Kembali terhadap jam kerja kantor (Senin - Kamis max 16:00, Jumat max 16:30, minimal 07:00)
        const returnWorkCheck = validateWorkingHours(estimatedReturn, 'Perkiraan waktu kembali');
        if (!returnWorkCheck.valid) {
          if (typeof window.showToast === 'function') {
            window.showToast(returnWorkCheck.message, 'danger');
          }
          if (inputEstimatedReturn) {
            inputEstimatedReturn.focus();
            inputEstimatedReturn.style.borderColor = '#e11d48';
          }
          return;
        }
      }

      const selectApprover = document.getElementById('selectApprover');
      if (!selectApprover || !selectApprover.value || selectApprover.value.trim() === '') {
        if (typeof window.showToast === 'function') {
          window.showToast('Harap cari dan pilih nama atasan Anda terlebih dahulu!', 'warning');
        }
        const searchInput = document.getElementById('searchApproverInput');
        if (searchInput) {
          searchInput.focus();
          const dropdown = document.getElementById('approverFloatingDropdown');
          if (dropdown) dropdown.style.display = 'flex';
        }
        return;
      }
      const approverName = selectApprover.value;
      const members = (category === 'Dinas Kantor' && Array.isArray(window._selectedGroupMembers)) ? [...window._selectedGroupMembers] : [];

      // Validasi Anggota: pastikan tidak ada anggota yang memiliki izin aktif
      if (category === 'Dinas Kantor' && members.length > 0) {
        for (const m of members) {
          const actTik = typeof window.getActiveTicket === 'function' ? window.getActiveTicket(m.nip) : null;
          if (actTik && (!window.editingTicketId || actTik.id !== window.editingTicketId)) {
            if (typeof window.showToast === 'function') {
              window.showToast(`Anggota (${m.name}) masih memiliki izin aktif (#${actTik.id}). Harap hapus anggota ini dari tim terlebih dahulu.`, 'warning');
            }
            return;
          }
        }
      }

      if (category === 'Dinas Kantor' && !window._currentSuratPerintah) {
        if (typeof window.showToast === 'function') {
          window.showToast('Surat Perintah / Tugas Dinas wajib diunggah untuk kategori Dinas Kantor!', 'danger');
        }
        const dropzone = document.getElementById('dropzoneSuratPerintah');
        if (dropzone) {
          dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
          dropzone.style.borderColor = '#e11d48';
          setTimeout(() => {
            if (dropzone) dropzone.style.borderColor = '';
          }, 3500);
        }
        return;
      }
      const suratPerintah = (category === 'Dinas Kantor' && window._currentSuratPerintah) ? { ...window._currentSuratPerintah } : null;

      window.pendingFormData = { category, type, destination, reason, plannedExit, estimatedReturn, approverName, members, suratPerintah };

      const sumApprover = document.getElementById('sumApprover');
      const sumCategory = document.getElementById('sumCategory');
      const sumType = document.getElementById('sumType');
      const sumDestination = document.getElementById('sumDestination');
      const sumReason = document.getElementById('sumReason');
      const sumExitTime = document.getElementById('sumExitTime');
      const sumReturnRow = document.getElementById('sumReturnRow');
      const sumReturnTime = document.getElementById('sumReturnTime');
      const sumMembersRow = document.getElementById('sumMembersRow');
      const sumMembersVal = document.getElementById('sumMembersVal');
      const sumSuratRow = document.getElementById('sumSuratRow');
      const sumSuratVal = document.getElementById('sumSuratVal');

      if (sumApprover) sumApprover.textContent = approverName;
      if (sumCategory) sumCategory.textContent = category;
      if (sumType) sumType.textContent = type;
      if (sumDestination) sumDestination.textContent = destination;
      if (sumReason) sumReason.textContent = reason;
      if (sumExitTime) sumExitTime.textContent = window.formatDisplayDate(plannedExit);

      if (sumMembersRow && sumMembersVal) {
        if (members && members.length > 0) {
          sumMembersRow.style.display = 'flex';
          sumMembersRow.style.alignItems = 'flex-start';
          sumMembersVal.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 3px; font-weight: 600; color: #2563eb; line-height: 1.45;">
              ${members.map(m => `<div>- ${escapeHtml(m.name)}</div>`).join('')}
              <div style="font-size: 0.72rem; color: #64748b; font-weight: 500; margin-top: 3px;">(${members.length} Orang)</div>
            </div>
          `;
        } else {
          sumMembersRow.style.display = 'none';
        }
      }

      if (sumSuratRow && sumSuratVal) {
        if (suratPerintah) {
          sumSuratRow.style.display = 'flex';
          sumSuratVal.textContent = suratPerintah.name;
        } else {
          sumSuratRow.style.display = 'none';
        }
      }

      if (sumReturnRow) {
        if (type === 'Kembali ke Area') {
          sumReturnRow.style.display = 'flex';
          if (sumReturnTime) sumReturnTime.textContent = window.formatDisplayDate(estimatedReturn);
        } else {
          sumReturnRow.style.display = 'none';
        }
      }

      if (window.editingTicketId) {
        const modalConfirmHeading = modalConfirmSummary ? modalConfirmSummary.querySelector('.modal-header h3') : null;
        const modalConfirmSubtitle = modalConfirmSummary ? modalConfirmSummary.querySelector('.modal-header p') : null;
        if (modalConfirmHeading) modalConfirmHeading.textContent = `Konfirmasi Perubahan — ${window.editingTicketId}`;
        if (modalConfirmSubtitle) modalConfirmSubtitle.textContent = 'Pastikan data revisi izin sudah benar sebelum disimpan';
        if (btnFinalSubmitRequest) btnFinalSubmitRequest.textContent = 'Simpan & Perbarui Izin';
      } else {
        const modalConfirmHeading = modalConfirmSummary ? modalConfirmSummary.querySelector('.modal-header h3') : null;
        const modalConfirmSubtitle = modalConfirmSummary ? modalConfirmSummary.querySelector('.modal-header p') : null;
        if (modalConfirmHeading) modalConfirmHeading.textContent = 'Konfirmasi Pengajuan Izin Keluar';
        if (modalConfirmSubtitle) modalConfirmSubtitle.textContent = 'Pastikan data berikut sudah benar sebelum dikirim ke Atasan';
        if (btnFinalSubmitRequest) btnFinalSubmitRequest.textContent = 'Kirim Pengajuan';
      }

      modalNewRequest.classList.remove('open');
      if (modalConfirmSummary) modalConfirmSummary.classList.add('open');
    });
  }

  const btnCloseConfirmModal = document.getElementById('btnCloseConfirmModal');
  const btnBackToForm = document.getElementById('btnBackToForm');
  const btnFinalSubmitRequest = document.getElementById('btnFinalSubmitRequest');

  if (btnCloseConfirmModal) btnCloseConfirmModal.addEventListener('click', () => modalConfirmSummary.classList.remove('open'));
  if (btnBackToForm) {
    btnBackToForm.addEventListener('click', () => {
      modalConfirmSummary.classList.remove('open');
      modalNewRequest.classList.add('open');
    });
  }

  if (btnFinalSubmitRequest) {
    btnFinalSubmitRequest.addEventListener('click', () => {
      if (btnFinalSubmitRequest.disabled) return;
      btnFinalSubmitRequest.disabled = true;
      setTimeout(() => { if (btnFinalSubmitRequest) btnFinalSubmitRequest.disabled = false; }, 1000);
      if (!window.pendingFormData) return;

      if (window.editingTicketId) {
        const ticketsList = window.ticketsList || [];
        const ticket = ticketsList.find(t => t.id === window.editingTicketId);
        if (ticket) {
          const oldApprover = ticket.approverName;
          const newApprover = window.pendingFormData.approverName;
          const isApproverChanged = Boolean(oldApprover && newApprover && oldApprover !== newApprover);

          ticket.category = window.pendingFormData.category;
          ticket.type = window.pendingFormData.type;
          ticket.destination = window.pendingFormData.destination;
          ticket.reason = window.pendingFormData.reason;
          ticket.plannedExit = window.pendingFormData.plannedExit;
          ticket.estimatedReturn = window.pendingFormData.estimatedReturn;
          ticket.approverName = newApprover;

          if (ticket.category === 'Dinas Kantor' && Array.isArray(window.pendingFormData.members)) {
            ticket.members = window.pendingFormData.members.map(m => ({
              nip: m.nip,
              name: m.name,
              department: m.department || ticket.department,
              supervisor: m.supervisor || ticket.approverName,
              supervisorNip: m.supervisorNip || null,
              status: m.status || 'aktif'
            }));
            ticket.isGroupDinas = ticket.members.length > 0;
            ticket.suratPerintah = window.pendingFormData.suratPerintah || null;
          } else {
            ticket.members = [];
            ticket.isGroupDinas = false;
            ticket.suratPerintah = null;
          }

          const ACTORS = window.ACTORS || {};
          const isDewi = Boolean(newApprover && newApprover.toLowerCase().includes('dewi'));
          const targetApproverActor = isDewi
            ? (ACTORS.approver2 || { name: 'Dewi Sartika, S.T., M.M.', title: 'Supervisor Operasional Lapangan (Plt. Manager)' })
            : (ACTORS.approver || { name: 'Ir. Hendra Gunawan, M.T.', title: 'Manager Rekayasa & Pemeliharaan' });
          ticket.approverTitle = targetApproverActor.title;

          const now = new Date();
          const pad = (n) => String(n).padStart(2, '0');
          const nowFormatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

          if (!ticket.timeline) ticket.timeline = [];

          if (isApproverChanged) {
            ticket.reassignedFrom = oldApprover;
            ticket.reassignedTo = newApprover;
            ticket.reassignedAt = nowFormatted;
            ticket.reassignedBy = `${getActiveEmployeeActorInfo().name} (Karyawan)`;

            ticket.timeline.unshift({
              event: 'Persetujuan Dialihkan',
              time: nowFormatted,
              by: `${getActiveEmployeeActorInfo().name} (Karyawan)`,
              desc: `Peninjauan persetujuan izin dialihkan dari ${oldApprover} ke ${newApprover}.`
            });

            // Kirim notifikasi pengalihan izin ke Atasan Baru
            if (typeof window.createNotification === 'function') {
              const allUsers = window.MOCK_USERS || [];
              const newAppUser = allUsers.find(u => u.name && newApprover && (u.name.toLowerCase() === newApprover.toLowerCase() || newApprover.toLowerCase().includes(u.name.toLowerCase())));
              const newAppNip = (newAppUser && newAppUser.nip) || (newApprover.includes('Dewi') ? 'PK-2012-0845' : 'PK-2015-1002');
              window.createNotification({
                recipientRole: 'approver',
                recipientNip: newAppNip,
                recipientName: newApprover,
                actorSource: 'karyawan',
                type: 'pengalihan_izin',
                title: 'Pelimpahan Persetujuan Izin',
                message: `${ticket.applicantName} (${ticket.applicantNip}) mengalihkan peninjauan izin #${ticket.id} kepada Anda. Menunggu keputusan.`,
                ticketId: ticket.id,
                priority: 'normal',
                eventId: `reassign_${ticket.id}_${Date.now()}`
              });
            }
          } else {
            ticket.timeline.unshift({
              event: 'Pengajuan Diperbarui (Diedit)',
              time: nowFormatted,
              by: `${getActiveEmployeeActorInfo().name} (Karyawan)`,
              desc: `Data pengajuan izin diperbarui sebelum persetujuan Atasan (${ticket.approverName}).`
            });
          }

          window.saveTickets(ticketsList);
          modalConfirmSummary.classList.remove('open');
          if (formNewRequest) formNewRequest.reset();
          if (typeof window.resetApproverSearch === 'function') {
            window.resetApproverSearch();
          }
          window.pendingFormData = null;
          const editedId = window.editingTicketId;
          window.editingTicketId = null;

          if (typeof window.showToast === 'function') {
            if (isApproverChanged) {
              window.showToast(`Pengajuan #${editedId} berhasil dialihkan ke ${newApprover}!`, 'success');
            } else {
              window.showToast(`Pengajuan #${editedId} berhasil diperbarui!`, 'success');
            }
          }
          if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
          if (typeof window.renderApproverView === 'function') window.renderApproverView();
          if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
          if (typeof window.updateApproverMetrics === 'function') window.updateApproverMetrics();
          return;
        }
      }

      if (typeof window.getActiveTicket === 'function' && window.getActiveTicket()) {
        if (typeof window.showToast === 'function') window.showToast('Gagal: Anda masih memiliki izin aktif!', 'danger');
        modalConfirmSummary.classList.remove('open');
        return;
      }

      const ACTORS = window.ACTORS || {};
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dateCode = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const ticketId = `TK-${dateCode}-${randomSuffix}`;
      const nowFormatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

      const activeEmp = (typeof window.getCurrentEmployeeActor === 'function') ? window.getCurrentEmployeeActor() : ((window.currentActor === 'karyawan2' && ACTORS.karyawan2) ? ACTORS.karyawan2 : ACTORS.karyawan);
      const allUsers = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
      const empAccount = allUsers.find(acc => acc.nip === (activeEmp ? activeEmp.nip : 'PK-2024-8841')) || (window.KUJANG_ACCOUNTS || []).find(acc => acc.nip === (activeEmp ? activeEmp.nip : 'PK-2024-8841'));
      const directSup = (empAccount && (empAccount.directSupervisor || empAccount.supervisor)) || (activeEmp ? (activeEmp.directSupervisor || activeEmp.supervisor || activeEmp.approverName) : 'Ir. Hendra Gunawan, M.T.');
      const directSupUser = allUsers.find(u => u.name && directSup && (u.name.toLowerCase() === directSup.toLowerCase() || u.name.toLowerCase().includes(directSup.toLowerCase()) || directSup.toLowerCase().includes(u.name.toLowerCase())));
      const directSupNip = (directSupUser && directSupUser.nip) || (directSup.includes('Subagja') ? 'PK-2012-0543' : (directSup.includes('Dewi') ? 'PK-2012-0845' : 'PK-2015-1002'));

      const chosenApproverName = (window.pendingFormData && window.pendingFormData.approverName) || directSup;
      const apprUser = allUsers.find(u => u.name && chosenApproverName && (u.name.toLowerCase() === chosenApproverName.toLowerCase() || u.name.toLowerCase().includes(chosenApproverName.toLowerCase()) || chosenApproverName.toLowerCase().includes(u.name.toLowerCase())));
      const approverNip = (apprUser && apprUser.nip) || (chosenApproverName.includes('Subagja') ? 'PK-2012-0543' : (chosenApproverName.includes('Dewi') ? 'PK-2012-0845' : 'PK-2015-1002'));

      const isReassignedFromStart = Boolean(directSup && chosenApproverName && (typeof window.cleanPersonName === 'function' ? window.cleanPersonName(chosenApproverName) !== window.cleanPersonName(directSup) : chosenApproverName.toLowerCase().trim() !== directSup.toLowerCase().trim()));

      const newTicket = {
        id: ticketId,
        applicantName: activeEmp ? activeEmp.name : 'Budi Pratama, S.T.',
        directSupervisor: directSup,
        directSupervisorNip: directSupNip,
        applicantNip: activeEmp ? activeEmp.nip : 'PK-2024-8841',
        department: activeEmp ? (activeEmp.department || 'Departemen Rekayasa & Pemeliharaan') : 'Departemen Rekayasa & Pemeliharaan',
        category: window.pendingFormData.category,
        type: window.pendingFormData.type,
        destination: window.pendingFormData.destination,
        reason: window.pendingFormData.reason,
        plannedExit: window.pendingFormData.plannedExit,
        estimatedReturn: window.pendingFormData.estimatedReturn,
        status: 'Menunggu Persetujuan',
        createdAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
        approverName: chosenApproverName,
        approverNip: approverNip,
        approverNote: null,
        reassignedFrom: isReassignedFromStart ? directSup : null,
        reassignedFromNip: isReassignedFromStart ? directSupNip : null,
        reassignedTo: isReassignedFromStart ? chosenApproverName : null,
        reassignedToNip: isReassignedFromStart ? approverNip : null,
        reassignedAt: isReassignedFromStart ? nowFormatted : null,
        scanOutTime: null,
        scanInTime: null,
        timeline: [
          {
            event: 'Pengajuan Dibuat',
            time: nowFormatted,
            by: `${getActiveEmployeeActorInfo().name} (Karyawan)`,
            desc: isReassignedFromStart
              ? `Pengajuan tiket dibuat dan dialihkan ke ${chosenApproverName} untuk ditinjau (Atasan Langsung: ${directSup}).`
              : 'Pengajuan tiket izin keluar area berhasil dikirim ke antrean Atasan.'
          }
        ]
      };

      if (window.pendingFormData && window.pendingFormData.category === 'Dinas Kantor' && !window.pendingFormData.suratPerintah) {
        if (typeof window.showToast === 'function') {
          window.showToast('Surat Perintah / Tugas Dinas wajib diunggah untuk kategori Dinas Kantor!', 'danger');
        }
        return;
      }

      const isGroupDinas = window.pendingFormData.category === 'Dinas Kantor' && Array.isArray(window.pendingFormData.members) && window.pendingFormData.members.length > 0;
      if (isGroupDinas) {
        newTicket.isGroupDinas = true;
        newTicket.initiatorNip = activeEmp ? activeEmp.nip : 'PK-2024-8841';
        newTicket.initiatorName = activeEmp ? activeEmp.name : 'Budi Pratama, S.T.';
        newTicket.members = window.pendingFormData.members.map(m => {
          const u = allUsers.find(x => x.nip === m.nip);
          const supName = (u && (u.directSupervisor || u.supervisor)) || m.supervisor || null;
          let supNip = m.supervisorNip || (u && (u.directSupervisorNip || u.supervisorNip)) || null;
          if (!supNip && supName) {
            const supUser = allUsers.find(x => x.name === supName || (supName.includes('Dewi') && x.nip === 'PK-2012-0845') || (supName.includes('Subagja') && x.nip === 'PK-2012-0543') || (supName.includes('Hendra') && x.nip === 'PK-2015-1002'));
            if (supUser) supNip = supUser.nip;
          }
          return {
            nip: m.nip,
            name: m.name,
            department: m.department || (u ? u.department : newTicket.department),
            supervisor: supName,
            supervisorNip: supNip,
            status: 'aktif'
          };
        });
        const memberNames = newTicket.members.map(m => m.name).join(', ');
        newTicket.timeline[0].desc += ` (Izin Dinas Bersama: ${newTicket.applicantName} mengikutsertakan ${memberNames}).`;
      }

      if (window.pendingFormData.suratPerintah) {
        newTicket.suratPerintah = window.pendingFormData.suratPerintah;
      }

      const ticketsList = window.ticketsList || [];
      ticketsList.unshift(newTicket);
      if (typeof window.createNotification === 'function') {
        window.createNotification({
          recipientRole: 'approver',
          recipientNip: approverNip,
          recipientName: chosenApproverName,
          actorSource: 'karyawan',
          type: 'pengajuan_baru',
          title: isReassignedFromStart ? 'Pengajuan Izin Dialihkan ke Anda' : 'Pengajuan Izin Baru',
          message: isReassignedFromStart
            ? `${newTicket.applicantName} (${newTicket.applicantNip}) mengajukan izin ${newTicket.category} yang dialihkan ke Anda (Atasan Langsung: ${directSup}). Menunggu persetujuan Anda.`
            : `${newTicket.applicantName} (${newTicket.applicantNip}) mengajukan izin ${newTicket.category}. Menunggu persetujuan Anda.`,
          ticketId: newTicket.id,
          priority: 'normal',
          eventId: `new_sub_${newTicket.id}`
        });

        if (isGroupDinas && Array.isArray(newTicket.members)) {
          newTicket.members.forEach(m => {
            window.createNotification({
              recipientRole: 'karyawan',
              recipientNip: m.nip,
              recipientName: m.name,
              actorSource: 'karyawan',
              type: 'pengajuan_dinas_bersama',
              title: 'Izin Dinas Kantor Bersama',
              message: `Anda ditambahkan oleh ${newTicket.applicantName} ke pengajuan izin Dinas Kantor (${newTicket.destination}). Izin ini aktif bersama tim.`,
              ticketId: newTicket.id,
              priority: 'normal',
              eventId: `grp_notif_${newTicket.id}_${m.nip}`
            });
          });

          // Kirim notifikasi tembusan pengajuan awal ke atasan langsung masing-masing anggota (jika berbeda dari atasan peninjau)
          const supGroupMap = {};
          newTicket.members.forEach(m => {
            const supNip = m.supervisorNip;
            const supName = m.supervisor;
            if (supNip && supNip !== approverNip) {
              if (!supGroupMap[supNip]) {
                supGroupMap[supNip] = { nip: supNip, name: supName, members: [] };
              }
              supGroupMap[supNip].members.push(m.name.split(',')[0].trim());
            }
          });

          Object.values(supGroupMap).forEach(supObj => {
            const formattedMembers = supObj.members.join(' dan ');
            window.createNotification({
              recipientRole: 'approver',
              recipientNip: supObj.nip,
              recipientName: supObj.name,
              actorSource: 'karyawan',
              type: 'info_tembusan',
              title: 'Tembusan Pengajuan Dinas Staf',
              message: `Staf Anda (${formattedMembers}) terdaftar dalam pengajuan Dinas Kantor bersama tim (Inisiator: ${newTicket.applicantName}) ke ${newTicket.destination}. Menunggu persetujuan ${chosenApproverName}.`,
              ticketId: newTicket.id,
              priority: 'normal',
              eventId: `fyi_submitted_${newTicket.id}_${supObj.nip}`
            });
          });
        }

        if (isReassignedFromStart && directSupNip) {
          window.createNotification({
            recipientRole: 'approver',
            recipientNip: directSupNip,
            recipientName: directSup,
            actorSource: 'karyawan',
            type: 'pengajuan_dialihkan',
            title: 'Izin Bawahan Dialihkan',
            message: `Bawahan langsung Anda, ${newTicket.applicantName}, mengajukan izin ${newTicket.category} (#${newTicket.id}) yang dialihkan ke ${chosenApproverName}. Anda dapat memantau statusnya di menu Antrian / Pelacakan.`,
            ticketId: newTicket.id,
            priority: 'normal',
            eventId: `reassign_notice_${newTicket.id}`
          });
        }
      }
      window.saveTickets(ticketsList);

      modalConfirmSummary.classList.remove('open');
      if (formNewRequest) formNewRequest.reset();
      window._selectedGroupMembers = [];
      const containerGroupSelected = document.getElementById('selectedGroupMembersContainer');
      if (containerGroupSelected) containerGroupSelected.innerHTML = '';
      if (typeof window.resetApproverSearch === 'function') {
        window.resetApproverSearch();
      }
      window.pendingFormData = null;

      if (typeof window.showToast === 'function') {
        window.showToast(`Tiket #${ticketId} berhasil diajukan! Sistem kini mengunci pengajuan baru hingga tiket ini diproses.`, 'success');
      }
      if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
    });
  }

  // TAB NAV LISTENERS IN DETAIL MODAL
  const tabNavInfo = document.getElementById('tabNavInfo');
  const tabNavTimeline = document.getElementById('tabNavTimeline');
  if (tabNavInfo) tabNavInfo.addEventListener('click', () => switchDetailTab('info'));
  if (tabNavTimeline) tabNavTimeline.addEventListener('click', () => switchDetailTab('timeline'));

  const btnCloseDigitalPassModal = document.getElementById('btnCloseDigitalPassModal');
  const modalDigitalPassQR = document.getElementById('modalDigitalPassQR');
  if (btnCloseDigitalPassModal && modalDigitalPassQR) {
    btnCloseDigitalPassModal.addEventListener('click', () => modalDigitalPassQR.classList.remove('open'));
  }

  const btnCloseDetailModal = document.getElementById('btnCloseDetailModal');
  const btnCloseDetailBottom = document.getElementById('btnCloseDetailBottom');
  const modalTicketDetail = document.getElementById('modalTicketDetail');
  if (btnCloseDetailModal) btnCloseDetailModal.addEventListener('click', closeTicketDetailModal);
  if (btnCloseDetailBottom) btnCloseDetailBottom.addEventListener('click', closeTicketDetailModal);
  if (modalTicketDetail) {
    modalTicketDetail.addEventListener('click', (e) => {
      if (e.target === modalTicketDetail) {
        closeTicketDetailModal();
      }
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModals = document.querySelectorAll('.modal-overlay.open, .modal.open');
      if (activeModals.length > 0) {
        if (typeof window.closeAllModals === 'function') {
          window.closeAllModals();
        } else {
          activeModals.forEach(m => m.classList.remove('open'));
        }
      }
    }
  });
  if (btnCloseDetailBottom) btnCloseDetailBottom.addEventListener('click', () => {
    modalTicketDetail.classList.remove('open');
    window._openedFromScannerTerminal = false;
  });

  // Handler Unduh QR (.png) ditangani secara tunggal di openDigitalPassModal via btnDownload.onclick untuk mencegah double download

  const btnPrintPassPdf = document.getElementById('btnPrintPassPdf');
  if (btnPrintPassPdf) btnPrintPassPdf.addEventListener('click', () => window.print());

  // CANCEL MODAL LISTENERS
  const btnCloseCancelModal = document.getElementById('btnCloseCancelModal');
  const btnAbortCancel = document.getElementById('btnAbortCancel');
  const btnConfirmCancelTicket = document.getElementById('btnConfirmCancelTicket');
  const modalCancelRequest = document.getElementById('modalCancelRequest');

  if (btnCloseCancelModal) btnCloseCancelModal.addEventListener('click', () => modalCancelRequest.classList.remove('open'));
  if (btnAbortCancel) btnAbortCancel.addEventListener('click', () => modalCancelRequest.classList.remove('open'));

  if (btnConfirmCancelTicket) {
    btnConfirmCancelTicket.addEventListener('click', confirmCancelTicket);
  }

  // EMERGENCY PASS LISTENERS
  const btnOpenEmergencyModal = document.getElementById('btnOpenEmergencyModal');
  const btnCloseEmergencyModal = document.getElementById('btnCloseEmergencyModal');
  const btnAbortEmergency = document.getElementById('btnAbortEmergency');
  const btnSubmitEmergency = document.getElementById('btnSubmitEmergency');
  const modalEmergency = document.getElementById('modalEmergency');

  // btnOpenEmergencyModal uses inline onclick="handleOpenEmergency()"
  if (btnOpenEmergencyModal && !btnOpenEmergencyModal.getAttribute('onclick')) {
    btnOpenEmergencyModal.addEventListener('click', handleOpenEmergency);
  }
  if (btnCloseEmergencyModal) btnCloseEmergencyModal.addEventListener('click', () => modalEmergency.classList.remove('open'));
  if (btnAbortEmergency) btnAbortEmergency.addEventListener('click', () => modalEmergency.classList.remove('open'));

  // Setup toggle cards for emergency method selection
  const optEmergMethodApp = document.getElementById('optEmergMethodApp');
  const optEmergMethodPasscode = document.getElementById('optEmergMethodPasscode');
  const optEmergMethodFaceScan = document.getElementById('optEmergMethodFaceScan');
  [optEmergMethodApp, optEmergMethodFaceScan].forEach(card => {
    if (card) {
      card.addEventListener('click', () => {
        [optEmergMethodApp, optEmergMethodFaceScan].forEach(c => c && c.classList.remove('selected'));
        card.classList.add('selected');
        const r = card.querySelector('input[type="radio"]');
        if (r) r.checked = true;
      });
    }
  });

  if (btnSubmitEmergency) {
    btnSubmitEmergency.addEventListener('click', () => {
      // Validasi Batas Maksimal Pengajuan Darurat (Sebelum Jam Pulang Kantor)
      const workHoursCheck = isWithinOperationalHours(new Date());
      if (!workHoursCheck.allowed) {
        if (typeof window.showToast === 'function') {
          window.showToast(`Pengajuan izin darurat hanya dapat dilakukan sebelum jam pulang kantor (${workHoursCheck.scheduleText})!`, 'danger');
        }
        return;
      }

      const emergApprover = document.getElementById('emergApprover');
      const selectEmergCategory = document.getElementById('selectEmergCategory');
      const selectEmergType = document.getElementById('selectEmergType');
      const emergDest = document.getElementById('emergDest');
      const emergReason = document.getElementById('emergReason');
      const emergPlannedExit = document.getElementById('emergPlannedExit');
      const emergEstimatedReturn = document.getElementById('emergEstimatedReturn');
      const checkedMethodInput = document.querySelector('input[name="emergMethod"]:checked');
      const selectedMethod = checkedMethodInput ? checkedMethodInput.value : 'app';

      const approverVal = emergApprover ? emergApprover.value.trim() : '';
      const categoryVal = selectEmergCategory ? selectEmergCategory.value : '';
      const typeVal = selectEmergType ? selectEmergType.value : '';

      if (!approverVal) {
        if (typeof window.showToast === 'function') {
          window.showToast('Harap cari dan pilih nama atasan peninjau darurat!', 'danger');
        }
        return;
      }

      if (!categoryVal) {
        if (typeof window.showToast === 'function') {
          window.showToast('Harap pilih kategori keperluan darurat!', 'danger');
        }
        if (selectEmergCategory) selectEmergCategory.focus();
        return;
      }

      if (!typeVal) {
        if (typeof window.showToast === 'function') {
          window.showToast('Harap pilih tipe kepulangan darurat!', 'danger');
        }
        if (selectEmergType) selectEmergType.focus();
        return;
      }

      const isKembali = typeVal === 'Kembali ke Area';
      const dest = emergDest ? emergDest.value.trim().slice(0, 300) : '';
      const reason = emergReason ? emergReason.value.trim() : '';
      const plannedExitVal = emergPlannedExit ? emergPlannedExit.value : '';
      const estimatedReturnVal = isKembali ? (emergEstimatedReturn ? emergEstimatedReturn.value : null) : null;

      if (!dest || !reason) {
        if (typeof window.showToast === 'function') {
          window.showToast('Harap lengkapi lokasi tujuan dan alasan keperluan izin!', 'danger');
        }
        return;
      }

      if (!plannedExitVal) {
        if (typeof window.showToast === 'function') {
          window.showToast('Harap isi rencana waktu keluar!', 'danger');
        }
        return;
      }

      const nowCheck = new Date();
      const oneMinuteAgo = new Date(nowCheck.getTime() - 60000);
      if (plannedExitVal && new Date(plannedExitVal) < oneMinuteAgo) {
        if (typeof window.showToast === 'function') {
          window.showToast('Hari atau tanggal sebelumnya tidak dapat dipilih sebagai rencana waktu keluar!', 'danger');
        }
        if (emergPlannedExit) emergPlannedExit.focus();
        return;
      }

      // Validasi: Urusan Pribadi darurat hanya berlaku untuk hari ini
      if (!isDinasCategory(categoryVal)) {
        const exitD = new Date(plannedExitVal);
        if (exitD.getDate() !== nowCheck.getDate() || exitD.getMonth() !== nowCheck.getMonth() || exitD.getFullYear() !== nowCheck.getFullYear()) {
          if (typeof window.showToast === 'function') {
            window.showToast('Untuk keperluan Urusan Pribadi, izin darurat hanya berlaku untuk hari ini!', 'warning');
          }
          if (emergPlannedExit) emergPlannedExit.focus();
          return;
        }
      }

      // Validasi Rencana Waktu Keluar Darurat terhadap jam kerja kantor (Senin - Kamis max 16:00, Jumat max 16:30, minimal 07:00)
      const emergExitCheck = validateWorkingHours(plannedExitVal, 'Rencana waktu keluar darurat');
      if (!emergExitCheck.valid) {
        if (typeof window.showToast === 'function') {
          window.showToast(emergExitCheck.message, 'danger');
        }
        if (emergPlannedExit) {
          emergPlannedExit.focus();
          emergPlannedExit.style.borderColor = '#e11d48';
        }
        return;
      }

      if (isKembali) {
        if (!estimatedReturnVal) {
          if (typeof window.showToast === 'function') {
            window.showToast('Harap isi perkiraan waktu kembali!', 'danger');
          }
          if (emergEstimatedReturn) emergEstimatedReturn.focus();
          return;
        }

        if (new Date(estimatedReturnVal) <= new Date(plannedExitVal)) {
          if (typeof window.showToast === 'function') {
            window.showToast('Perkiraan jam kembali harus lebih besar dari rencana jam keluar!', 'danger');
          }
          if (emergEstimatedReturn) emergEstimatedReturn.focus();
          return;
        }

        // Validasi: Urusan Pribadi perkiraan kembali darurat harus hari ini
        if (!isDinasCategory(categoryVal)) {
          const retD = new Date(estimatedReturnVal);
          if (retD.getDate() !== nowCheck.getDate() || retD.getMonth() !== nowCheck.getMonth() || retD.getFullYear() !== nowCheck.getFullYear()) {
            if (typeof window.showToast === 'function') {
              window.showToast('Untuk keperluan Urusan Pribadi, perkiraan waktu kembali darurat harus pada hari ini!', 'warning');
            }
            if (emergEstimatedReturn) emergEstimatedReturn.focus();
            return;
          }
        }

        // Validasi Perkiraan Waktu Kembali Darurat terhadap jam kerja kantor (Senin - Kamis max 16:00, Jumat max 16:30, minimal 07:00)
        const emergReturnCheck = validateWorkingHours(estimatedReturnVal, 'Perkiraan waktu kembali darurat');
        if (!emergReturnCheck.valid) {
          if (typeof window.showToast === 'function') {
            window.showToast(emergReturnCheck.message, 'danger');
          }
          if (emergEstimatedReturn) {
            emergEstimatedReturn.focus();
            emergEstimatedReturn.style.borderColor = '#e11d48';
          }
          return;
        }
      }

      // Validasi Khusus Dinas Kantor (Surat Perintah Wajib & Anggota Tanpa Izin Aktif)
      if (categoryVal === 'Dinas Kantor' && !window._currentEmergSuratPerintah) {
        if (typeof window.showToast === 'function') {
          window.showToast('Surat Perintah / Tugas Dinas wajib diunggah untuk kategori Dinas Kantor!', 'danger');
        }
        const dropzone = document.getElementById('dropzoneEmergSuratPerintah');
        if (dropzone) {
          dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
          dropzone.style.borderColor = '#e11d48';
          setTimeout(() => { if (dropzone) dropzone.style.borderColor = ''; }, 3500);
        }
        return;
      }

      const emergMembers = (categoryVal === 'Dinas Kantor' && Array.isArray(window._selectedEmergGroupMembers)) ? [...window._selectedEmergGroupMembers] : [];
      if (categoryVal === 'Dinas Kantor' && emergMembers.length > 0) {
        for (const m of emergMembers) {
          const actTik = typeof window.getActiveTicket === 'function' ? window.getActiveTicket(m.nip) : null;
          if (actTik && (!window.editingEmergencyTicketId || actTik.id !== window.editingEmergencyTicketId)) {
            if (typeof window.showToast === 'function') {
              window.showToast(`Anggota (${m.name}) masih memiliki izin aktif (#${actTik.id}). Harap hapus anggota ini dari tim terlebih dahulu.`, 'warning');
            }
            return;
          }
        }
      }

      // FITUR EDIT PENGAJUAN DARURAT
      if (window.editingEmergencyTicketId) {
        const ticketsList = window.ticketsList || [];
        const ticket = ticketsList.find(t => t.id === window.editingEmergencyTicketId);
        if (ticket) {
          const oldApprover = ticket.approverName;
          const newApprover = approverVal;
          const isApproverChanged = Boolean(oldApprover && newApprover && oldApprover !== newApprover);

          ticket.approverName = newApprover;
          const ACTORS = window.ACTORS || {};
          const isDewi = Boolean(newApprover && newApprover.toLowerCase().includes('dewi'));
          const targetApproverActor = isDewi
            ? (ACTORS.approver2 || { name: 'Dewi Sartika, S.T., M.M.', title: 'Supervisor Operasional Lapangan (Plt. Manager)' })
            : (ACTORS.approver || { name: 'Ir. Hendra Gunawan, M.T.', title: 'Manager Rekayasa & Pemeliharaan' });
          ticket.approverTitle = targetApproverActor.title;

          ticket.category = categoryVal;
          ticket.type = typeVal;
          ticket.destination = dest;
          ticket.reason = reason;
          ticket.plannedExit = plannedExitVal;
          ticket.estimatedReturn = estimatedReturnVal;
          ticket.selectedMethod = selectedMethod;
          ticket.approverNote = selectedMethod === 'facescan'
            ? `[Izin Darurat - QR Terkunci]: Menunggu pemohon melakukan Scan Wajah Atasan (${newApprover}) di tempat.`
            : `[Izin Darurat - QR Terkunci]: Menunggu Persetujuan Langsung Atasan (${newApprover}) di App.`;

          const now = new Date();
          const pad = (n) => String(n).padStart(2, '0');
          const nowFormatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

          if (!ticket.timeline) ticket.timeline = [];

          if (isApproverChanged) {
            ticket.reassignedFrom = oldApprover;
            ticket.reassignedTo = newApprover;
            ticket.reassignedAt = nowFormatted;
            ticket.reassignedBy = `${getActiveEmployeeActorInfo().name} (Karyawan)`;

            ticket.timeline.unshift({
              event: 'Persetujuan Dialihkan',
              time: nowFormatted,
              by: `${getActiveEmployeeActorInfo().name} (Karyawan)`,
              desc: `Peninjauan izin darurat dialihkan dari ${oldApprover} ke ${newApprover}.`
            });

            // Kirim notifikasi pengalihan darurat ke Atasan Baru
            if (typeof window.createNotification === 'function') {
              const allUsers = window.MOCK_USERS || [];
              const newAppUser = allUsers.find(u => u.name && newApprover && (u.name.toLowerCase() === newApprover.toLowerCase() || newApprover.toLowerCase().includes(u.name.toLowerCase())));
              const newAppNip = (newAppUser && newAppUser.nip) || (newApprover.includes('Dewi') ? 'PK-2012-0845' : 'PK-2015-1002');
              window.createNotification({
                recipientRole: 'approver',
                recipientNip: newAppNip,
                recipientName: newApprover,
                actorSource: 'karyawan',
                type: 'pengalihan_izin',
                title: 'Pelimpahan Otorisasi Darurat',
                message: `${ticket.applicantName} (${ticket.applicantNip}) mengalihkan otorisasi darurat izin #${ticket.id} kepada Anda.`,
                ticketId: ticket.id,
                priority: 'urgent',
                eventId: `reassign_emg_${ticket.id}_${Date.now()}`
              });
            }
          } else {
            ticket.timeline.unshift({
              event: 'Pengajuan Darurat Diperbarui (Diedit)',
              time: nowFormatted,
              by: `${getActiveEmployeeActorInfo().name} (Karyawan)`,
              desc: `Formulir izin darurat berhasil diperbarui untuk Atasan: ${newApprover} (Metode Otorisasi: ${selectedMethod}).`
            });
          }

          window.saveTickets(ticketsList);
          modalEmergency.classList.remove('open');
          const editedEmergId = window.editingEmergencyTicketId;
          window.editingEmergencyTicketId = null;

          if (typeof window.showToast === 'function') {
            if (isApproverChanged) {
              window.showToast(`Izin Darurat #${editedEmergId} berhasil dialihkan ke ${newApprover}!`, 'info');
            } else {
              window.showToast(`Formulir Izin Darurat #${editedEmergId} berhasil diperbarui!`, 'success');
            }
          }
          if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
          if (typeof window.renderSecurityView === 'function') window.renderSecurityView();
          if (typeof window.renderApproverView === 'function') window.renderApproverView();

          if (typeof window.openEmergencyUnlockModal === 'function') {
            window.openEmergencyUnlockModal(editedEmergId, selectedMethod);
          }
          return;
        }
      }

      // Pastikan karyawan tidak bisa membuat izin darurat jika masih ada izin aktif
      const existingActiveTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : null;
      if (existingActiveTicket && !window.editingEmergencyTicketId) {
        if (typeof window.showToast === 'function') {
          window.showToast(`Pengajuan Darurat Ditolak: Anda masih memiliki izin aktif (${existingActiveTicket.id}). Batalkan izin aktif terlebih dahulu!`, 'danger');
        }
        return;
      }

      const ACTORS = window.ACTORS || {};
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dateCode = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const ticketId = `TK-EMG-${dateCode}-${randomSuffix}`;
      const nowFormatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

      const emergencyPasscode = (typeof window.generateEmergencyPasscode === 'function')
        ? window.generateEmergencyPasscode()
        : String(Math.floor(100000 + Math.random() * 900000));

      const activeEmergEmp = (typeof window.getCurrentEmployeeActor === 'function') ? window.getCurrentEmployeeActor() : ((window.currentActor === 'karyawan2' && ACTORS.karyawan2) ? ACTORS.karyawan2 : ACTORS.karyawan);
      const allUsersEmerg = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
      const emergEmpAccount = allUsersEmerg.find(acc => acc.nip === (activeEmergEmp ? activeEmergEmp.nip : 'PK-2024-8841')) || (window.KUJANG_ACCOUNTS || []).find(acc => acc.nip === (activeEmergEmp ? activeEmergEmp.nip : 'PK-2024-8841'));
      const emergDirectSup = (emergEmpAccount && (emergEmpAccount.directSupervisor || emergEmpAccount.supervisor)) || (activeEmergEmp ? (activeEmergEmp.directSupervisor || activeEmergEmp.supervisor || activeEmergEmp.approverName) : 'Ir. Hendra Gunawan, M.T.');
      const emergDirectSupUser = allUsersEmerg.find(u => u.name && emergDirectSup && (u.name.toLowerCase() === emergDirectSup.toLowerCase() || u.name.toLowerCase().includes(emergDirectSup.toLowerCase()) || emergDirectSup.toLowerCase().includes(u.name.toLowerCase())));
      const emergDirectSupNip = (emergDirectSupUser && emergDirectSupUser.nip) || (emergDirectSup.includes('Subagja') ? 'PK-2012-0543' : (emergDirectSup.includes('Dewi') ? 'PK-2012-0845' : 'PK-2015-1002'));

      const chosenEmergApprover = approverVal || emergDirectSup;
      const emergApprUser = allUsersEmerg.find(u => u.name && chosenEmergApprover && (u.name.toLowerCase() === chosenEmergApprover.toLowerCase() || u.name.toLowerCase().includes(chosenEmergApprover.toLowerCase()) || chosenEmergApprover.toLowerCase().includes(u.name.toLowerCase())));
      const emergApproverNip = (emergApprUser && emergApprUser.nip) || (chosenEmergApprover.includes('Subagja') ? 'PK-2012-0543' : (chosenEmergApprover.includes('Dewi') ? 'PK-2012-0845' : 'PK-2015-1002'));

      const isEmergReassigned = Boolean(emergDirectSup && chosenEmergApprover && (typeof window.cleanPersonName === 'function' ? window.cleanPersonName(chosenEmergApprover) !== window.cleanPersonName(emergDirectSup) : chosenEmergApprover.toLowerCase().trim() !== emergDirectSup.toLowerCase().trim()));

      const emergencyTicket = {
        id: ticketId,
        applicantName: activeEmergEmp ? activeEmergEmp.name : 'Budi Pratama, S.T.',
        applicantNip: activeEmergEmp ? activeEmergEmp.nip : 'PK-2024-8841',
        directSupervisor: emergDirectSup,
        directSupervisorNip: emergDirectSupNip,
        department: activeEmergEmp ? (activeEmergEmp.department || 'Departemen Rekayasa & Pemeliharaan') : 'Departemen Rekayasa & Pemeliharaan',
        category: categoryVal,
        type: typeVal,
        destination: dest,
        reason: reason,
        plannedExit: plannedExitVal,
        estimatedReturn: estimatedReturnVal,
        status: 'Menunggu Otorisasi Darurat',
        isEmergency: true,
        emergencyLocked: true,
        qrLocked: true,
        emergencyPasscode: emergencyPasscode,
        selectedMethod: selectedMethod,
        emergencyUnlockMethod: null,
        emergencyUnlockedBy: null,
        createdAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
        approverName: chosenEmergApprover,
        approverNip: emergApproverNip,
        approverNote: `[Izin Darurat - QR Terkunci]: Menunggu otorisasi Atasan (${chosenEmergApprover}) melalui 3 metode: (1) Persetujuan di App, (2) Kode Sandi, atau (3) Scan Wajah.`,
        reassignedFrom: isEmergReassigned ? emergDirectSup : null,
        reassignedFromNip: isEmergReassigned ? emergDirectSupNip : null,
        reassignedTo: isEmergReassigned ? chosenEmergApprover : null,
        reassignedToNip: isEmergReassigned ? emergApproverNip : null,
        reassignedAt: isEmergReassigned ? nowFormatted : null,
        scanOutTime: null,
        scanInTime: null,
        timeline: [
          {
            event: 'Izin Darurat Diajukan (QR Terkunci)',
            time: nowFormatted,
            by: `${getActiveEmployeeActorInfo().name} (Karyawan)`,
            desc: isEmergReassigned
              ? `Tiket darurat dibuat dan dialihkan ke ${chosenEmergApprover} (Atasan Langsung: ${emergDirectSup}). QR Code terkunci sesuai SOP "No Approval, No Exit" sampai diotorisasi Atasan.`
              : `Tiket darurat dibuat. QR Code terkunci sesuai SOP "No Approval, No Exit" sampai diotorisasi Atasan.`
          },
          {
            event: 'Kode Sandi Darurat Diterbitkan',
            time: nowFormatted,
            by: 'Sistem Kedaruratan K3',
            desc: `Sandi Otorisasi Darurat telah digenerate untuk Atasan: ${chosenEmergApprover}.`
          }
        ]
      };

      const isEmergGroup = categoryVal === 'Dinas Kantor' && emergMembers.length > 0;
      if (isEmergGroup) {
        emergencyTicket.isGroupDinas = true;
        emergencyTicket.initiatorNip = activeEmergEmp ? activeEmergEmp.nip : 'PK-2024-8841';
        emergencyTicket.initiatorName = activeEmergEmp ? activeEmergEmp.name : 'Budi Pratama, S.T.';
        const allUsers = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
        emergencyTicket.members = emergMembers.map(m => {
          const u = allUsers.find(x => x.nip === m.nip);
          const supName = (u && (u.directSupervisor || u.supervisor)) || m.supervisor || null;
          let supNip = m.supervisorNip || (u && (u.directSupervisorNip || u.supervisorNip)) || null;
          if (!supNip && supName) {
            const supUser = allUsers.find(x => x.name === supName || (supName.includes('Dewi') && x.nip === 'PK-2012-0845') || (supName.includes('Subagja') && x.nip === 'PK-2012-0543') || (supName.includes('Hendra') && x.nip === 'PK-2015-1002'));
            if (supUser) supNip = supUser.nip;
          }
          return {
            nip: m.nip,
            name: m.name,
            department: m.department || emergencyTicket.department,
            supervisor: supName,
            supervisorNip: supNip,
            status: 'aktif'
          };
        });
        emergencyTicket.suratPerintah = { ...window._currentEmergSuratPerintah };
      } else if (categoryVal === 'Dinas Kantor' && window._currentEmergSuratPerintah) {
        emergencyTicket.suratPerintah = { ...window._currentEmergSuratPerintah };
        emergencyTicket.isGroupDinas = false;
        emergencyTicket.members = [];
      }

      const ticketsList = window.ticketsList || [];
      ticketsList.unshift(emergencyTicket);

      // Notifikasi tembusan FYI ke atasan masing-masing anggota rombongan darurat
      if (isEmergGroup && typeof window.createNotification === 'function') {
        const supervisorMap = {};
        emergencyTicket.members.forEach(m => {
          const supName = m.supervisor || emergencyTicket.approverName;
          const supNip = m.supervisorNip;
          if (supName && supName !== emergencyTicket.approverName) {
            if (!supervisorMap[supName]) {
              supervisorMap[supName] = { supNip, members: [] };
            }
            supervisorMap[supName].members.push(m.name);
          }
        });
        Object.keys(supervisorMap).forEach(supName => {
          const supObj = supervisorMap[supName];
          const memberNames = supObj.members.join(', ');
          window.createNotification({
            recipientRole: 'approver',
            recipientNip: supObj.supNip,
            recipientName: supName,
            actorSource: 'karyawan',
            type: 'tembusan_dinas_rombongan',
            title: 'ℹ️ Informasi Izin Darurat Staf Dinas',
            message: `Staf Anda (${memberNames}) terdaftar dalam Izin Darurat Dinas bersama tim (Inisiator: ${emergencyTicket.applicantName}) ke ${emergencyTicket.destination}. Menunggu otorisasi ${emergencyTicket.approverName}.`,
            ticketId: emergencyTicket.id,
            priority: 'urgent',
            eventId: `fyi_emg_${emergencyTicket.id}_${Date.now()}`
          });
        });
      }

      window._selectedEmergGroupMembers = [];
      window._currentEmergSuratPerintah = null;

      // SEDANG-01: Notifikasi Prioritas Tinggi K3 Kedaruratan
      if (typeof window.createNotification === 'function') {
        const targetApprNip = emergApproverNip;

        // Notifikasi ke Atasan
        window.createNotification({
          recipientRole: 'approver',
          recipientNip: targetApprNip,
          recipientName: emergencyTicket.approverName || 'Atasan Peninjau',
          actorSource: 'karyawan',
          type: 'izin_darurat',
          title: '🚨 PERMOHONAN IZIN DARURAT K3',
          message: `${emergencyTicket.applicantName} (${emergencyTicket.applicantNip}) mengajukan izin darurat keluar area (${emergencyTicket.category}). Membutuhkan otorisasi segera!`,
          ticketId: emergencyTicket.id,
          priority: 'urgent',
          eventId: `emg_sub_${emergencyTicket.id}`
        });
      }

      window.saveTickets(ticketsList);

      modalEmergency.classList.remove('open');

      // Pindahkan tampilan langsung ke subhalaman 'Pengajuan Saya' agar kartu aktif langsung terlihat
      if (typeof window.setKaryawanNav === 'function') {
        window.setKaryawanNav('pengajuan');
      }

      if (typeof window.showToast === 'function') {
        window.showToast(`Tiket Darurat #${ticketId} diterbitkan! Sistem kini menangguhkan pengajuan baru hingga tiket ini diotorisasi.`, 'warning');
      }
      if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
      if (typeof window.renderSecurityView === 'function') window.renderSecurityView();
      if (typeof window.renderApproverView === 'function') window.renderApproverView();

      // Langsung buka modal otorisasi 3 opsi sesuai pilihan awal karyawan
      if (typeof window.openEmergencyUnlockModal === 'function') {
        window.openEmergencyUnlockModal(ticketId, selectedMethod);
      } else {
        openTicketDetail(ticketId);
      }
    });
  }

  // TIME EXTENSION SUBMIT & CLOSE LISTENERS
  const modalExtendDuration = document.getElementById('modalExtendDuration');
  const btnCloseExtendModal = document.getElementById('btnCloseExtendModal');
  const btnCancelExtendModal = document.getElementById('btnCancelExtendModal');
  const btnSubmitExtendDuration = document.getElementById('btnSubmitExtendDuration');
  const inputExtendNewReturn = document.getElementById('inputExtendNewReturn');
  const inputExtendReason = document.getElementById('inputExtendReason');

  if (btnCloseExtendModal) btnCloseExtendModal.addEventListener('click', () => modalExtendDuration && modalExtendDuration.classList.remove('open'));
  if (btnCancelExtendModal) btnCancelExtendModal.addEventListener('click', () => modalExtendDuration && modalExtendDuration.classList.remove('open'));

  if (btnSubmitExtendDuration) {
    btnSubmitExtendDuration.addEventListener('click', () => {
      if (window._isSubmittingExtension) return;
      window._isSubmittingExtension = true;
      try {
        const ticketsList = window.ticketsList || [];
        const ticket = ticketsList.find(t => t.id === window.currentExtendTicketId) || (typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : null);
        if (!ticket) {
          if (typeof window.showToast === 'function') window.showToast('Data perizinan aktif tidak ditemukan.', 'warning');
          if (modalExtendDuration) modalExtendDuration.classList.remove('open');
          return;
        }

        if (ticket.status !== 'Sedang di Luar') {
          if (typeof window.showToast === 'function') {
            window.showToast('Perpanjangan waktu hanya dapat diajukan saat Anda sedang berada di luar area!', 'warning');
          }
          if (modalExtendDuration) modalExtendDuration.classList.remove('open');
          return;
        }

        if (ticket.pendingExtension && ticket.pendingExtension.status === 'Menunggu Persetujuan') {
          if (typeof window.showToast === 'function') {
            window.showToast('Anda sudah memiliki permohonan perpanjangan waktu yang sedang menunggu persetujuan Atasan!', 'warning');
          }
          if (modalExtendDuration) modalExtendDuration.classList.remove('open');
          return;
        }

        const newReturnVal = inputExtendNewReturn ? inputExtendNewReturn.value : '';
        const reasonVal = inputExtendReason ? inputExtendReason.value.trim() : '';

        if (ticket.status === 'Terlambat' || ticket.isLate) {
          if (typeof window.showToast === 'function') {
            window.showToast('Izin telah berstatus Terlambat! Anda tidak dapat mengajukan perpanjangan dan wajib melakukan Tap In di Pos Jaga.', 'danger');
          } else {
            alert('Izin telah berstatus Terlambat! Anda tidak dapat mengajukan perpanjangan dan wajib melakukan Tap In di Pos Jaga.');
          }
          if (modalExtendDuration) modalExtendDuration.classList.remove('open');
          return;
        }

        if (!newReturnVal) {
          if (typeof window.showToast === 'function') window.showToast('Harap pilih perkiraan waktu kembali baru!', 'danger');
          return;
        }

        const newReturnDate = new Date(newReturnVal);
        const now = new Date();

        // 1. Validasi Jam Operasional Kantor (Hanya bisa diajukan sebelum jam pulang saat pengajuan perpanjangan dibuat)
        const workHoursCheck = isWithinOperationalHours(now);
        if (!workHoursCheck.allowed) {
          if (typeof window.showToast === 'function') {
            window.showToast(`Ajukan perpanjangan hanya bisa sebelum jam pulang (${workHoursCheck.scheduleText})!`, 'danger');
          }
          return;
        }

        const isDinas = isDinasCategory(ticket.category);

        if (!isDinas) {
          // 2. Validasi Tanggal untuk Urusan Pribadi: Hanya boleh HARI INI
          const returnDay = newReturnDate.getDate();
          const returnMonth = newReturnDate.getMonth();
          const returnYear = newReturnDate.getFullYear();
          if (returnDay !== now.getDate() || returnMonth !== now.getMonth() || returnYear !== now.getFullYear()) {
            if (typeof window.showToast === 'function') {
              window.showToast('Perpanjangan waktu Urusan Pribadi hanya dapat diajukan untuk hari ini!', 'danger');
            }
            return;
          }

          // 3. Validasi Jam Kembali: Tidak boleh melewati batas jam pulang kantor hari ini
          const dayOfWeek = now.getDay();
          const returnHours = newReturnDate.getHours();
          const returnMins = newReturnDate.getMinutes();
          const returnTotalMins = returnHours * 60 + returnMins;
          const maxAllowedMins = (dayOfWeek === 5) ? (16 * 60 + 30) : (16 * 60);
          const closingStr = (dayOfWeek === 5) ? '16:30 WIB' : '16:00 WIB';

          if (returnTotalMins > maxAllowedMins) {
            if (typeof window.showToast === 'function') {
              window.showToast(`Perpanjangan waktu tidak boleh melebihi batas jam pulang kantor (${closingStr})!`, 'danger');
            }
            return;
          }
        } else {
          // Dinas Kantor: Boleh memilih hari besok dan hari-hari kerja selanjutnya sesuai rencana
          const extendWorkCheck = validateWorkingHours(newReturnVal, 'Perkiraan waktu kembali perpanjangan');
          if (!extendWorkCheck.valid) {
            if (typeof window.showToast === 'function') {
              window.showToast(extendWorkCheck.message, 'danger');
            }
            return;
          }
        }

        if (isNaN(newReturnDate.getTime()) || newReturnDate.getTime() <= now.getTime()) {
          if (typeof window.showToast === 'function') window.showToast('Perkiraan waktu kembali baru harus lebih lambat dari waktu saat ini!', 'danger');
          return;
        }

        if (ticket.estimatedReturn) {
          const oldReturnDate = new Date(ticket.estimatedReturn);
          if (!isNaN(oldReturnDate.getTime()) && newReturnDate.getTime() <= oldReturnDate.getTime()) {
            if (typeof window.showToast === 'function') window.showToast('Waktu kembali baru harus lebih lama dari estimasi kembali semula!', 'danger');
            return;
          }
        }

        if (!reasonVal || reasonVal.length < 5) {
          if (typeof window.showToast === 'function') window.showToast('Alasan perpanjangan waktu wajib diisi (minimal 5 karakter)!', 'danger');
          return;
        }

        const pad = (n) => String(n).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

        ticket.pendingExtension = {
          requestedAt: nowFormatted,
          requestedAtIso: now.toISOString(),
          oldEstimatedReturn: ticket.estimatedReturn,
          newEstimatedReturn: newReturnVal,
          reason: reasonVal,
          status: 'Menunggu Persetujuan'
        };

        if (!ticket.timeline) ticket.timeline = [];
        ticket.timeline.push({
          event: 'Pengajuan Perpanjangan Waktu',
          time: nowFormatted,
          by: `${ticket.applicantName || 'Budi Pratama'} (Karyawan)`,
          desc: `Mengajukan perpanjangan waktu kembali hingga ${window.formatDisplayDate ? window.formatDisplayDate(newReturnVal) : newReturnVal}. Alasan: "${reasonVal}". Grace Period aktif.`
        });

        if (typeof window.createNotification === 'function') {
          const ticketForExt = ticket;
          if (ticketForExt) {
            window.createNotification({
              recipientRole: 'approver',
              recipientNip: (() => {
                const allUsers = window.MOCK_USERS || [];
                const found = allUsers.find(u => u.name && ticketForExt.approverName && (u.name.toLowerCase() === ticketForExt.approverName.toLowerCase() || ticketForExt.approverName.toLowerCase().includes(u.name.toLowerCase())));
                return (found && found.nip) || (ticketForExt.approverName && ticketForExt.approverName.includes('Dewi') ? 'PK-2012-0845' : 'PK-2015-1002');
              })(),
              recipientName: ticketForExt.approverName || 'Ir. Hendra Gunawan, M.T.',
              actorSource: 'karyawan',
              type: 'permohonan_perpanjangan',
              title: 'Permohonan Perpanjangan Waktu',
              message: `${ticketForExt.applicantName} (${ticketForExt.applicantNip}) mengajukan perpanjangan waktu untuk tiket #${ticketForExt.id}. Menunggu persetujuan Anda.`,
              ticketId: ticketForExt.id,
              priority: 'normal',
              eventId: `ext_req_${ticketForExt.id}_${ticketForExt.pendingExtension ? ticketForExt.pendingExtension.newEstimatedReturn : Date.now()}`
            });
          }
        }
        window.saveTickets(ticketsList);
        if (modalExtendDuration) modalExtendDuration.classList.remove('open');

        if (typeof window.showToast === 'function') {
          window.showToast(`Pengajuan perpanjangan waktu tiket #${ticket.id} berhasil dikirim ke Atasan. Grace Period aktif!`, 'success');
        }

        if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
        if (typeof window.renderApproverView === 'function') window.renderApproverView();
        const modalTicketDetail = document.getElementById('modalTicketDetail');
        if (modalTicketDetail && modalTicketDetail.classList.contains('open')) {
          window.openTicketDetail(ticket.id, 'detail');
        }
      } finally {
        window._isSubmittingExtension = false;
      }
    });
  }

  // MODAL DETAIL AJUKAN PERPANJANGAN & PEMBATALAN
  const modalPendingExtensionDetail = document.getElementById('modalPendingExtensionDetail');
  const btnClosePendingExtModal = document.getElementById('btnClosePendingExtModal');
  const btnDismissPendingExtModal = document.getElementById('btnDismissPendingExtModal');
  const btnCancelExtensionAction = document.getElementById('btnCancelExtensionAction');

  if (btnClosePendingExtModal) {
    btnClosePendingExtModal.addEventListener('click', closePendingExtensionDetailModal);
  }
  if (btnDismissPendingExtModal) {
    btnDismissPendingExtModal.addEventListener('click', closePendingExtensionDetailModal);
  }
  if (btnCancelExtensionAction) {
    btnCancelExtensionAction.addEventListener('click', executeCancelPendingExtension);
  }

  window.addEventListener('resize', () => {
    const modalDetail = document.getElementById('modalTicketDetail');
    if (modalDetail && (modalDetail.classList.contains('open') || modalDetail.style.display === 'flex')) {
      if (typeof window.checkAndApplyTextExpand === 'function') {
        window.checkAndApplyTextExpand('infoDestination', 'btnToggleDestExpand');
        window.checkAndApplyTextExpand('infoReason', 'btnToggleReasonExpand');
      }
    }
  });
});

// TIME EXTENSION MODAL TRIGGER FUNCTION
function openExtendDurationModal(ticketId) {
  const ticketsList = window.ticketsList || [];
  let ticket = ticketId ? ticketsList.find(t => t.id === ticketId) : null;
  if (!ticket && typeof window.getActiveTicket === 'function') {
    ticket = window.getActiveTicket();
  }
  if (!ticket && ticketsList.length > 0) {
    ticket = ticketsList.find(t => t.status === 'Sedang di Luar');
  }
  if (!ticket || ticket.status !== 'Sedang di Luar') {
    if (typeof window.showToast === 'function') {
      window.showToast('Tidak ada perizinan aktif yang sedang berada di luar area untuk diperpanjang.', 'warning');
    }
    return;
  }

  // Jika tiket sudah terlambat, tolak perpanjangan dan instruksikan Tap In
  if (ticket.status === 'Terlambat' || ticket.isLate) {
    if (typeof window.showToast === 'function') {
      window.showToast('Izin telah berstatus Terlambat! Anda tidak dapat mengajukan perpanjangan dan wajib melakukan Tap In di Pos Jaga.', 'danger');
    } else {
      alert('Izin telah berstatus Terlambat! Anda tidak dapat mengajukan perpanjangan dan wajib melakukan Tap In di Pos Jaga.');
    }
    return;
  }

  // Jika sudah mengajukan perpanjangan dan masih menunggu persetujuan, langsung arahkan ke modal detail perpanjangan
  if (ticket.pendingExtension && ticket.pendingExtension.status === 'Menunggu Persetujuan') {
    openPendingExtensionDetailModal(ticket.id);
    return;
  }

  // Ajukan perpanjangan hanya bisa dipakai maksimal 1 kali jika sudah disetujui atasan
  if (ticket.extensionApproved || (ticket.extensionCount && ticket.extensionCount >= 1)) {
    if (typeof window.showToast === 'function') {
      window.showToast('Pengajuan perpanjangan hanya dapat digunakan maksimal 1 kali per izin dan sudah disetujui Atasan!', 'warning');
    }
    return;
  }

  // Cek jam operasional saat ini
  const now = new Date();
  const workHoursCheck = isWithinOperationalHours(now);
  if (!workHoursCheck.allowed) {
    if (typeof window.showToast === 'function') {
      window.showToast(`Ajukan perpanjangan hanya bisa sebelum jam pulang (${workHoursCheck.scheduleText})!`, 'danger');
    }
    return;
  }

  window.currentExtendTicketId = ticket.id;
  const extendTicketId = document.getElementById('extendTicketId');
  const extendTicketDest = document.getElementById('extendTicketDest');
  const extendCurrentReturnDisplay = document.getElementById('extendCurrentReturnDisplay');
  const inputExtendNewReturn = document.getElementById('inputExtendNewReturn');
  const inputExtendReason = document.getElementById('inputExtendReason');
  const modalExtendDuration = document.getElementById('modalExtendDuration');

  if (extendTicketId) extendTicketId.textContent = ticket.id;
  if (extendTicketDest) extendTicketDest.textContent = `${ticket.destination || '-'} — "${ticket.reason || '-'}"`;
  if (extendCurrentReturnDisplay) {
    extendCurrentReturnDisplay.textContent = ticket.estimatedReturn
      ? (window.formatDisplayDate ? window.formatDisplayDate(ticket.estimatedReturn) : ticket.estimatedReturn)
      : '14.00 WIB';
  }

  // Kunci batas waktu: HANYA HARI INI untuk Urusan Pribadi, BEBAS HARI BESOK & SETERUSNYA untuk Dinas Kantor
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const dayOfWeek = now.getDay();
  const closingHourStr = (dayOfWeek === 5) ? '16:30' : '16:00';
  const minVal = `${todayStr}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (inputExtendNewReturn) {
    inputExtendNewReturn.min = minVal;
    inputExtendNewReturn.addEventListener('change', () => {
      const curNow = new Date();
      const selVal = new Date(inputExtendNewReturn.value);
      if (!isNaN(selVal.getTime()) && selVal.getTime() <= curNow.getTime()) {
        if (typeof window.showToast === 'function') {
          window.showToast('Waktu perpanjangan tidak boleh di masa lampau!', 'danger');
        }
        inputExtendNewReturn.value = minVal;
      }
    });
  }
  const maxVal = `${todayStr}T${closingHourStr}`;

  const isDinas = isDinasCategory(ticket.category);

  // Usulkan default return (+30 menit dari sekarang atau estimasi lama)
  let baseTime = now.getTime();
  if (ticket.estimatedReturn) {
    const oldD = new Date(ticket.estimatedReturn);
    if (!isNaN(oldD.getTime()) && oldD.getTime() > baseTime) {
      baseTime = oldD.getTime();
    }
  }
  let proposedDate = new Date(baseTime + 30 * 60000);
  let defaultVal = `${proposedDate.getFullYear()}-${pad(proposedDate.getMonth() + 1)}-${pad(proposedDate.getDate())}T${pad(proposedDate.getHours())}:${pad(proposedDate.getMinutes())}`;

  if (inputExtendNewReturn) {
    inputExtendNewReturn.min = minVal;
    if (isDinas) {
      // Dinas Kantor: Bebaskan pemilihan tanggal hari ini, besok, atau hari kerja selanjutnya
      inputExtendNewReturn.removeAttribute('max');
      inputExtendNewReturn.value = defaultVal;
      inputExtendNewReturn.onchange = () => {
        if (!inputExtendNewReturn.value) return;
        const check = validateWorkingHours(inputExtendNewReturn.value, 'Perkiraan waktu kembali perpanjangan');
        if (!check.valid) {
          if (typeof window.showToast === 'function') {
            window.showToast(check.message, 'danger');
          }
          const selD = new Date(inputExtendNewReturn.value);
          if (!isNaN(selD.getTime())) {
            const closing = getClosingTimeForDate(selD);
            if (closing) {
              inputExtendNewReturn.value = `${selD.getFullYear()}-${pad(selD.getMonth() + 1)}-${pad(selD.getDate())}T${pad(closing.hour)}:${pad(closing.minute)}`;
            }
          }
        }
      };
    } else {
      // Urusan Pribadi: Kunci batas waktu ke hari ini sebelum jam pulang kantor
      if (defaultVal > maxVal) defaultVal = maxVal;
      inputExtendNewReturn.max = maxVal;
      inputExtendNewReturn.value = defaultVal;
      inputExtendNewReturn.onchange = () => {
        if (!inputExtendNewReturn.value) return;
        const check = validateWorkingHours(inputExtendNewReturn.value, 'Perkiraan waktu kembali perpanjangan');
        if (!check.valid) {
          if (typeof window.showToast === 'function') {
            window.showToast(check.message, 'danger');
          }
          inputExtendNewReturn.value = maxVal;
        }
      };
    }
  }
  if (inputExtendReason) {
    inputExtendReason.value = '';
  }

  if (modalExtendDuration) modalExtendDuration.classList.add('open');
}

// MODAL DETAIL AJUKAN PERPANJANGAN & PEMBATALAN
function openPendingExtensionDetailModal(ticketId) {
  const ticketsList = window.ticketsList || [];
  let ticket = ticketId ? ticketsList.find(t => t.id === ticketId) : null;
  if (!ticket && typeof window.getActiveTicket === 'function') {
    ticket = window.getActiveTicket();
  }
  if (!ticket || !ticket.pendingExtension) {
    if (typeof window.showToast === 'function') {
      window.showToast('Tidak ada pengajuan perpanjangan yang sedang menunggu persetujuan.', 'warning');
    }
    return;
  }

  window.currentPendingExtTicketId = ticket.id;
  const ext = ticket.pendingExtension;

  const modal = document.getElementById('modalPendingExtensionDetail');
  const pendingExtTicketId = document.getElementById('pendingExtTicketId');
  const pendingExtOldReturn = document.getElementById('pendingExtOldReturn') || document.getElementById('pendingExtOriginalReturn');
  const pendingExtNewReturn = document.getElementById('pendingExtNewReturn') || document.getElementById('pendingExtProposedReturn');
  const pendingExtReason = document.getElementById('pendingExtReason');
  const pendingExtRequestedAt = document.getElementById('pendingExtRequestedAt');
  const pendingExtStatusBadge = document.getElementById('pendingExtStatusBadge');

  if (pendingExtTicketId) pendingExtTicketId.textContent = ticket.id;
  if (pendingExtOldReturn) {
    const rawOld = ext.oldEstimatedReturn || ticket.estimatedReturn;
    pendingExtOldReturn.textContent = rawOld
      ? (window.formatDisplayDate ? window.formatDisplayDate(rawOld) : rawOld.replace('T', ' '))
      : '-';
  }
  if (pendingExtNewReturn) {
    const rawNew = ext.newEstimatedReturn;
    pendingExtNewReturn.textContent = rawNew
      ? (window.formatDisplayDate ? window.formatDisplayDate(rawNew) : rawNew.replace('T', ' '))
      : '-';
  }
  if (pendingExtReason) pendingExtReason.textContent = ext.reason || '-';
  if (pendingExtRequestedAt) pendingExtRequestedAt.textContent = ext.requestedAt || '-';
  if (pendingExtStatusBadge) {
    pendingExtStatusBadge.textContent = ext.status || 'Menunggu Persetujuan';
  }

  if (modal) modal.classList.add('open');
}

function closePendingExtensionDetailModal() {
  const modal = document.getElementById('modalPendingExtensionDetail');
  if (modal) modal.classList.remove('open');
}

function executeCancelPendingExtension() {
  const ticketsList = window.ticketsList || [];
  const ticketId = window.currentPendingExtTicketId;
  const ticket = ticketsList.find(t => t.id === ticketId) || (typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : null);

  if (!ticket || !ticket.pendingExtension) {
    if (typeof window.showToast === 'function') {
      window.showToast('Pengajuan perpanjangan tidak ditemukan atau sudah diproses.', 'warning');
    }
    closePendingExtensionDetailModal();
    return;
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

  if (!ticket.timeline) ticket.timeline = [];
  ticket.timeline.push({
    event: 'Pembatalan Pengajuan Perpanjangan',
    time: nowFormatted,
    by: `${ticket.applicantName || 'Budi Pratama'} (Karyawan)`,
    desc: `Karyawan membatalkan pengajuan perpanjangan waktu kembali (semula diajukan hingga ${window.formatDisplayDate ? window.formatDisplayDate(ticket.pendingExtension.newEstimatedReturn) : ticket.pendingExtension.newEstimatedReturn}).`
  });

  // Hapus permohonan perpanjangan yang tertunda
  delete ticket.pendingExtension;

  window.saveTickets(ticketsList);
  closePendingExtensionDetailModal();

  if (typeof window.showToast === 'function') {
    window.showToast(`Pengajuan perpanjangan izin #${ticket.id} berhasil dibatalkan.`, 'info');
  }

  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
  if (typeof window.renderApproverView === 'function') window.renderApproverView();
  const modalTicketDetail = document.getElementById('modalTicketDetail');
  if (modalTicketDetail && modalTicketDetail.classList.contains('open')) {
    window.openTicketDetail(ticket.id, 'detail');
  }
}

// Expose globally
window.handleOpenNewRequest = handleOpenNewRequest;
window.setupRadioToggles = setupRadioToggles;
window.initFormDates = initFormDates;
window.setupApproverSearch = setupApproverSearch;
window.resetApproverSearch = typeof resetApproverSelection !== 'undefined' ? resetApproverSelection : window.resetApproverSearch;
window.switchDetailTab = switchDetailTab;
window.openTicketDetail = openTicketDetail;
window.openCancelModal = openCancelModal;
window.handleOpenEmergency = handleOpenEmergency;
window.openExtendDurationModal = openExtendDurationModal;
window.openPendingExtensionDetailModal = openPendingExtensionDetailModal;
window.closePendingExtensionDetailModal = closePendingExtensionDetailModal;
window.executeCancelPendingExtension = executeCancelPendingExtension;
window.openEditTicketModal = openEditTicketModal;

// Universal Backdrop Click Handler (Dismiss modal smoothly on overlay background click)
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
      // Do not close if inside active face scan or specific locked flow
      if (e.target.id === 'modalEmergencyUnlock' && window._activeFaceScanning) {
        return;
      }
      if (e.target.id === 'modalTicketDetail' && typeof window.closeTicketDetailModal === 'function') {
        window.closeTicketDetailModal();
        return;
      }
      if (e.target.id === 'modalAdminUserAccess' && typeof window.closeAdminUserModal === 'function') {
        window.closeAdminUserModal();
        return;
      }
      if (e.target.id === 'modalDeleteConfirm' && typeof window.closeDeleteConfirmModal === 'function') {
        window.closeDeleteConfirmModal();
        return;
      }
      if (e.target.id === 'modalEmergencyUnlock' && typeof window.closeEmergencyUnlockModal === 'function') {
        window.closeEmergencyUnlockModal();
        return;
      }
      e.target.classList.remove('open');
      e.target.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  });
}


window.openDeleteConfirmModal = function (options) {
  const { title = 'Konfirmasi Hapus', message = 'Apakah Anda yakin ingin menghapus data ini?', confirmText = 'Hapus', onConfirm = null } = options || {};

  // Simpan posisi scroll sebelum modal muncul
  const savedScrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

  // Cek apakah user telah memilih untuk melewati konfirmasi hapus selama sesi ini
  if (sessionStorage.getItem('kujang_skip_confirm_delete') === 'true') {
    if (typeof onConfirm === 'function') onConfirm();
    return;
  }

  const modal = document.getElementById('modalDeleteConfirm');
  const titleEl = document.getElementById('deleteModalTitle');
  const msgEl = document.getElementById('deleteModalMessage');
  const btnExecute = document.getElementById('btnExecuteDeleteConfirm');
  const chkDontShow = document.getElementById('chkDontShowDeleteConfirm');
  const labelDontShow = document.getElementById('labelDontShowDeleteConfirm');

  if (modal) {
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.innerHTML = typeof message === 'string' ? message.replace(/\n/g, '<br>') : message;
    if (labelDontShow) labelDontShow.style.display = 'flex';
    if (chkDontShow) chkDontShow.checked = false;

    if (btnExecute) {
      btnExecute.textContent = confirmText;
      btnExecute.onclick = function () {
        if (chkDontShow && chkDontShow.checked) {
          try { sessionStorage.setItem('kujang_skip_confirm_delete', 'true'); } catch (e) { }
        }
        modal.classList.remove('open');
        modal.style.display = 'none';
        if (typeof onConfirm === 'function') onConfirm();
        window.scrollTo({ top: savedScrollY, behavior: 'instant' });
      };
    }
    modal.classList.add('open');
    modal.style.display = 'flex';
    // Pertahankan posisi scroll agar tidak melompat ke atas saat modal terbuka
    window.scrollTo({ top: savedScrollY, behavior: 'instant' });
  } else if (confirm(typeof message === 'string' ? message.replace(/<[^>]+>/g, '') : message)) {
    if (typeof onConfirm === 'function') onConfirm();
  }
};

window.closeDeleteConfirmModal = function () {
  const modal = document.getElementById('modalDeleteConfirm');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
};

window.openNoticeModal = function (options) {
  const { title = 'Pemberitahuan', message = '', buttonText = 'Batal', onConfirm = null } = options || {};
  const modal = document.getElementById('modalNoticeAlert');
  const titleEl = document.getElementById('noticeModalTitle');
  const msgEl = document.getElementById('noticeModalMessage');
  const btnDismiss = document.getElementById('btnNoticeDismiss');
  if (modal) {
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.innerHTML = typeof message === 'string' ? message.replace(/\n/g, '<br>') : message;
    if (btnDismiss) {
      btnDismiss.textContent = buttonText;
      btnDismiss.onclick = function () {
        modal.classList.remove('open');
        if (typeof onConfirm === 'function') onConfirm();
      };
    }
    modal.classList.add('open');
  } else {
    alert(typeof message === 'string' ? message.replace(/<[^>]+>/g, '') : message);
  }
};
