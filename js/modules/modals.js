/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Modals Controller: New Request (Option C Enforcement), Active Blocked Modal,
 * Digital Pass & QR Code Generator, Ticket Detail Modal, Cancel Request, Emergency Pass
 */

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
        btnBlockedCancelTicket.textContent = 'Selesaikan Izin Ini (Scan In)';
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
          const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;
          activeTicket.timeline.unshift({
            event: 'Izin Dibatalkan (Buat Baru)',
            time: nowFormatted,
            by: `${window.ACTORS && window.ACTORS.karyawan ? window.ACTORS.karyawan.name : 'Budi Pratama'} (Karyawan)`,
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
  const modalTitle = modalNewRequest ? modalNewRequest.querySelector('.modal-header h3') : null;
  const modalDesc = modalNewRequest ? modalNewRequest.querySelector('.modal-header p') : null;
  const btnSubmitNewRequest = document.getElementById('btnSubmitNewRequest');
  if (modalTitle) modalTitle.textContent = 'Formulir Pengajuan Izin Keluar';
  if (modalDesc) modalDesc.textContent = 'Lengkapi detail perizinan Anda di bawah ini';
  if (btnSubmitNewRequest) btnSubmitNewRequest.textContent = 'Lanjutkan';

  const formNewRequest = document.getElementById('formNewRequest');
  if (formNewRequest) formNewRequest.reset();

  // Reset dropdowns & fields agar form benar-benar kosong saat pertama kali dibuka
  const selectReqCategory = document.getElementById('selectReqCategory');
  const selectReqType = document.getElementById('selectReqType');
  const inputDestination = document.getElementById('inputDestination');
  const inputReason = document.getElementById('inputReason');
  const groupEstimatedReturn = document.getElementById('groupEstimatedReturn');
  if (selectReqCategory) selectReqCategory.value = '';
  if (selectReqType) selectReqType.value = '';
  if (inputDestination) inputDestination.value = '';
  if (inputReason) inputReason.value = '';
  if (groupEstimatedReturn) groupEstimatedReturn.style.display = 'block';

  initFormDates();
  if (typeof window.syncApproversToForms === 'function') {
    window.syncApproversToForms();
  }
  // Tidak memilih atasan secara default agar form kosong sebelum diisi pengguna
  if (typeof window.resetApproverSearch === 'function') {
    window.resetApproverSearch();
  }
  if (modalNewRequest) modalNewRequest.classList.add('open');
}

// ===================================================================
// FITUR EDIT PENGAJUAN (BIASA & DARURAT SEBELUM DISETUJUI ATASAN)
// ===================================================================

function openEditTicketModal(ticketId) {
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) {
    if (typeof window.showToast === 'function') window.showToast('Data tiket tidak ditemukan.', 'danger');
    return;
  }

  // Hanya boleh diedit sebelum disetujui atasan dan sebelum scan out di pos jaga
  const isPending = (ticket.status === 'Menunggu Persetujuan' || ticket.status === 'Menunggu Otorisasi Darurat' || (ticket.isEmergency && ticket.emergencyLocked));
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
  const modalNewRequest = document.getElementById('modalNewRequest');
  const modalTitle = modalNewRequest ? modalNewRequest.querySelector('.modal-header h3') : null;
  const modalDesc = modalNewRequest ? modalNewRequest.querySelector('.modal-header p') : null;
  const btnSubmitNewRequest = document.getElementById('btnSubmitNewRequest');

  if (modalTitle) modalTitle.textContent = `Edit Pengajuan Izin • ${ticket.id}`;
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
    if (groupEstimatedReturn) {
      groupEstimatedReturn.style.display = ticket.type === 'Pulang Mendahului' ? 'none' : 'block';
    }
  }

  // 3. Lokasi / Tujuan Keluar & 4. Alasan Keperluan Izin
  const inputDestination = document.getElementById('inputDestination');
  const inputReason = document.getElementById('inputReason');
  if (inputDestination) inputDestination.value = ticket.destination || '';
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

  if (modalNewRequest) modalNewRequest.classList.add('open');
}

function openEditEmergencyModal(ticket) {
  window.editingEmergencyTicketId = ticket.id;
  const modalEmergency = document.getElementById('modalEmergency');
  const modalTitle = document.getElementById('modalEmergencyTitle');
  const modalSubtitle = document.getElementById('modalEmergencySubtitle');
  const btnSubmitEmergency = document.getElementById('btnSubmitEmergency');

  if (modalTitle) {
    modalTitle.innerHTML = `<span>✏️</span><span>Edit Formulir Izin Darurat • ${ticket.id}</span>`;
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
    if (emergGroupEstimatedReturn) {
      emergGroupEstimatedReturn.style.display = ticket.type === 'Pulang Mendahului' ? 'none' : 'block';
    }
  }

  // 3. Lokasi / Tujuan Keluar & 4. Alasan Kedaruratan
  const emergDest = document.getElementById('emergDest');
  const emergReason = document.getElementById('emergReason');
  if (emergDest) emergDest.value = ticket.destination || '';
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

  // 7. Pilih Metode Otorisasi Buka Kunci QR
  const method = ticket.selectedMethod || 'app';
  const optEmergMethodApp = document.getElementById('optEmergMethodApp');
  const optEmergMethodPasscode = document.getElementById('optEmergMethodPasscode');
  const optEmergMethodFaceScan = document.getElementById('optEmergMethodFaceScan');
  [optEmergMethodApp, optEmergMethodPasscode, optEmergMethodFaceScan].forEach(c => c && c.classList.remove('selected'));
  if (method === 'passcode' && optEmergMethodPasscode) {
    optEmergMethodPasscode.click();
  } else if (method === 'facescan' && optEmergMethodFaceScan) {
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

  // Dropdown Tipe Kepulangan (Form Pengajuan Biasa)
  const selectReqType = document.getElementById('selectReqType');
  const groupEstimatedReturn = document.getElementById('groupEstimatedReturn');
  const inputEstimatedReturn = document.getElementById('inputEstimatedReturn');
  if (selectReqType) {
    selectReqType.addEventListener('change', () => {
      if (selectReqType.value === 'Pulang Mendahului') {
        if (groupEstimatedReturn) groupEstimatedReturn.style.display = 'none';
        if (inputEstimatedReturn) inputEstimatedReturn.required = false;
      } else {
        if (groupEstimatedReturn) groupEstimatedReturn.style.display = 'block';
        if (inputEstimatedReturn) inputEstimatedReturn.required = true;
      }
    });
  }

  // Dropdown Tipe Kepulangan (Form Izin Darurat)
  const selectEmergType = document.getElementById('selectEmergType');
  const emergGroupEstimatedReturn = document.getElementById('emergGroupEstimatedReturn');
  const emergEstimatedReturn = document.getElementById('emergEstimatedReturn');
  if (selectEmergType) {
    selectEmergType.addEventListener('change', () => {
      if (selectEmergType.value === 'Pulang Mendahului') {
        if (emergGroupEstimatedReturn) emergGroupEstimatedReturn.style.display = 'none';
        if (emergEstimatedReturn) emergEstimatedReturn.required = false;
      } else {
        if (emergGroupEstimatedReturn) emergGroupEstimatedReturn.style.display = 'block';
        if (emergEstimatedReturn) emergEstimatedReturn.required = true;
      }
    });
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
      const highlightedName = highlightApproverMatch(approver.name, cleanQuery);
      const highlightedTitle = highlightApproverMatch(approver.title, cleanQuery);
      const highlightedDept = highlightApproverMatch(approver.department, cleanQuery);
      const avatarBg = approver.avatarBg || 'linear-gradient(135deg, #059669 0%, #0d9488 100%)';

      const directTag = approver.isDirectSupervisor
        ? `<span class="approver-item-tag" title="Atasan langsung divisi Anda">Atasan Langsung</span>`
        : '';

      itemEl.innerHTML = `
        <div class="approver-item-avatar" style="background: ${avatarBg};">
          ${initials}
        </div>
        <div class="approver-item-info">
          <div class="approver-item-name-row">
            <span class="approver-item-name">${highlightedName}</span>
            <span class="approver-item-nip">${approver.nip || ''}</span>
            ${directTag}
          </div>
          <div class="approver-item-role">${highlightedTitle}</div>
          <div class="approver-item-dept">${highlightedDept}</div>
        </div>
        <div class="approver-item-cta">
          <span>Pilih</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      `;

      itemEl.addEventListener('click', (e) => {
        e.stopPropagation();
        chooseApprover(approver);
      });

      itemsList.appendChild(itemEl);
    });
  }

  function chooseApprover(approver, silent = false) {
    selectApprover.value = approver.name;
    searchInput.value = approver.name;

    if (selectedName) selectedName.textContent = approver.name;
    if (selectedTitle) selectedTitle.textContent = `${approver.title} • ${approver.department}`;
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
    if (btnToggle) btnToggle.classList.add('open');
    renderList(searchInput.value === selectApprover.value ? '' : searchInput.value);
  }

  function closeDropdown() {
    dropdown.style.display = 'none';
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
    searchInputId: 'searchApproverInput',
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

function validateWorkingHours(dateInput, label = 'Waktu') {
  if (!dateInput) return { valid: false, message: `${label} wajib diisi!` };
  const d = (typeof dateInput === 'string') ? new Date(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return { valid: false, message: `Format ${label} tidak valid!` };

  const day = d.getDay();
  if (day === 0 || day === 6) {
    return {
      valid: false,
      message: `${label} tidak dapat dipilih pada hari libur akhir pekan (${day === 6 ? 'Sabtu' : 'Minggu'}). Sistem perizinan hanya berlaku hari kerja Senin s/d Jumat!`
    };
  }

  const hours = d.getHours();
  const minutes = d.getMinutes();
  const totalMins = hours * 60 + minutes;
  const startMins = 7 * 60; // 07:00 WIB
  const closingInfo = getClosingTimeForDate(d);

  if (totalMins < startMins) {
    return {
      valid: false,
      message: `${label} (${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} WIB) tidak boleh sebelum jam masuk kerja (minimal pukul 07:00 WIB)!`
    };
  }

  if (totalMins > closingInfo.totalMinutes) {
    return {
      valid: false,
      message: `${label} (${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} WIB) melebihi batas jam pulang kantor! Untuk hari ${closingInfo.dayName}, batas maksimal pengajuan dan kepulangan adalah pukul ${closingInfo.closingStr}.`
    };
  }

  return { valid: true, closingInfo };
}

function setInputMaxByDate(inputEl, baseDate = new Date()) {
  if (!inputEl) return;
  const d = (typeof baseDate === 'string') ? new Date(baseDate) : baseDate;
  if (!d || isNaN(d.getTime())) return;
  const pad = (n) => String(n).padStart(2, '0');
  const closing = getClosingTimeForDate(d);
  if (closing && closing.totalMinutes > 0) {
    inputEl.max = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(closing.hour)}:${pad(closing.minute)}`;
  }
}

function isWithinOperationalHours(date = new Date()) {
  const result = validateWorkingHours(date, 'Waktu saat ini');
  if (!result.valid) {
    return {
      allowed: false,
      scheduleText: result.message,
      message: result.message
    };
  }
  return {
    allowed: true,
    scheduleText: result.closingInfo.scheduleText,
    closingHour: result.closingInfo.closingStr
  };
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
    digitalPassSubtitle.textContent = `${ticket.id} • ${ticket.category} • ${ticket.type}`;
  }

  const digitalPassStatusBadge = document.getElementById('digitalPassStatusBadge');
  if (digitalPassStatusBadge) {
    digitalPassStatusBadge.textContent = `• ${ticket.status}`;
    digitalPassStatusBadge.className = ticket.status === 'Terlambat'
      ? 'status-pill-red'
      : (ticket.status === 'Sedang di Luar'
          ? 'status-pill-purple'
          : (ticket.status === 'Disetujui' ? 'status-pill-blue' : 'status-pill-green'));
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
      digitalPassNoticeText.innerHTML = `<span style="color:#b91c1c; font-weight:800;">⚠️ TERLAMBAT: Melewati batas estimasi kembali (${ticket.estimatedReturn ? (window.formatDisplayDate ? window.formatDisplayDate(ticket.estimatedReturn) : ticket.estimatedReturn) : ''}). Segera kembali ke Pos 1 untuk melakukan Scan In.</span>`;
    } else {
      const timeReturn = ticket.estimatedReturn ? ticket.estimatedReturn.slice(11, 16) + ' WIB' : '13.00 WIB';
      digitalPassNoticeText.textContent = `Jangan bagikan QR. Batas kembali ${timeReturn}; QR dinonaktifkan setelah Scan In.`;
    }
  }

  // QR Code Generation
  const qrContainer = document.getElementById('digitalPassQrContainer');
  if (qrContainer) {
    qrContainer.innerHTML = '';
    const qrPayload = `KUJANG-PASS|${ticket.id}|${ticket.applicantNip || 'PK-2024-8841'}|${ticket.category}|${ticket.plannedExit}`;
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrContainer, {
        text: qrPayload,
        width: 170,
        height: 170,
        colorDark: ticket.status === 'Terlambat' ? '#b91c1c' : '#0f2b48',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    } else {
      qrContainer.innerHTML = `<strong>QR: ${ticket.id}</strong>`;
    }
  }

  // Button actions
  const btnDownload = document.getElementById('btnDownloadDigitalQRPng');
  if (btnDownload) {
    btnDownload.onclick = () => {
      const img = qrContainer ? qrContainer.querySelector('img') : null;
      if (img && img.src) {
        const a = document.createElement('a');
        a.href = img.src;
        a.download = `Tiket-QR-${ticket.id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (typeof window.showToast === 'function') window.showToast('QR Code berhasil diunduh!', 'success');
      } else {
        if (typeof window.showToast === 'function') window.showToast('Menyiapkan gambar QR...', 'info');
      }
    };
  }

  const btnPrint = document.getElementById('btnPrintDigitalPass');
  if (btnPrint) {
    btnPrint.onclick = () => {
      window.print();
    };
  }

  modal.classList.add('open');
}
window.openDigitalPassModal = openDigitalPassModal;

// OPEN TICKET DETAIL & AUDIT TRAIL MODAL (FIGMA SCREEN 2 & 3)
function openTicketDetail(ticketId, defaultTab = 'info') {
  if (typeof window.checkOverdueAndExpiredTickets === 'function') {
    window.checkOverdueAndExpiredTickets(true);
  }

  if (defaultTab === 'qr') {
    openDigitalPassModal(ticketId);
    return;
  }

  const ticketsList = window.ticketsList || [];
  const cleanId = String(ticketId || '').trim();
  const ticket = ticketsList.find(t => t.id === cleanId || String(t.id).trim().toUpperCase() === cleanId.toUpperCase());
  if (!ticket) {
    if (typeof window.showToast === 'function') {
      window.showToast(`Tiket #${ticketId} tidak ditemukan di sistem.`, 'warning');
    }
    return;
  }

  const ACTORS = window.ACTORS || {};
  const modalTicketDetail = document.getElementById('modalTicketDetail');

  // Header Title & Subtitle
  const modalDetailHeading = document.getElementById('modalDetailHeading');
  if (modalDetailHeading) {
    modalDetailHeading.textContent = `Detail Pengajuan • ${ticket.id}`;
  }

  const isTicketEmerg = Boolean(ticket.isEmergency || (ticket.id && ticket.id.includes('-EMG-')) || ticket.status === 'Menunggu Otorisasi Darurat');

  const modalDetailSubtitle = document.getElementById('modalDetailSubtitle');
  if (modalDetailSubtitle) {
    const dayStr = ticket.createdAt ? ticket.createdAt.slice(0, 11) : '16 Oktober 2026';
    const emergLabel = isTicketEmerg ? '<span style="background:#ffe4e6; color:#9f1239; border:1px solid #fecdd3; padding:1px 7px; border-radius:4px; font-weight:800; font-size:0.75rem;">🚨 DARURAT</span> • ' : '';
    modalDetailSubtitle.innerHTML = `${ticket.applicantName || 'Budi Pratama, S.T.'} • ${emergLabel}${ticket.category} • ${dayStr}`;
  }

  // Status Badge on Top Right
  const detailStatusPillTop = document.getElementById('detailStatusPillTop');
  if (detailStatusPillTop) {
    const isEmergBadge = ticket.status === 'Menunggu Otorisasi Darurat' || (ticket.id && ticket.id.includes('-EMG-') && ticket.status !== 'Disetujui' && ticket.status !== 'Sedang di Luar' && ticket.status !== 'Selesai');
    if (isEmergBadge) {
      detailStatusPillTop.innerHTML = `
        <button type="button" class="status-pill pending" 
          style="cursor: pointer; background: #ffe4e6; color: #9f1239; border: 1.5px solid #fecdd3; font-weight: 800; display: inline-flex; align-items: center; gap: 4px; padding: 0.35rem 0.75rem; border-radius: 999px;" 
          onclick="window.openEmergencyUnlockModal('${ticket.id}')" title="Klik untuk membuka opsi Otorisasi Darurat">
          <span>⚡ Menunggu Otorisasi Darurat</span>
        </button>
      `;
    } else {
      detailStatusPillTop.innerHTML = window.getStatusPill(ticket.status, ticket);
    }
  }

  // --- TAB 1: INFORMASI TIKET ---
  const infoEmergencyBadge = document.getElementById('infoEmergencyBadge');
  if (infoEmergencyBadge) {
    if (isTicketEmerg) {
      infoEmergencyBadge.innerHTML = `<span style="display:inline-flex; align-items:center; gap:5px; background:#ffe4e6; color:#9f1239; border:1px solid #fecdd3; padding:2px 8px; border-radius:6px; font-weight:800; font-size:0.75rem;">🚨 DARURAT (Evakuasi / Mendesak)</span>`;
    } else {
      infoEmergencyBadge.innerHTML = `<span style="display:inline-flex; align-items:center; gap:5px; background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:2px 8px; border-radius:6px; font-weight:700; font-size:0.75rem;">📋 Biasa (Reguler)</span>`;
    }
  }

  const infoEmployeeName = document.getElementById('infoEmployeeName');
  if (infoEmployeeName) infoEmployeeName.textContent = ticket.applicantName || (ACTORS.karyawan ? ACTORS.karyawan.name : 'Budi Pratama, S.T.');

  const infoEmployeeNip = document.getElementById('infoEmployeeNip');
  if (infoEmployeeNip) infoEmployeeNip.textContent = ticket.applicantNip || (ACTORS.karyawan ? ACTORS.karyawan.nip : 'PK-2024-8841');

  const infoEmployeeDept = document.getElementById('infoEmployeeDept');
  if (infoEmployeeDept) infoEmployeeDept.textContent = ticket.department || 'Rekayasa & Pemeliharaan';

  const infoCategory = document.getElementById('infoCategory');
  if (infoCategory) infoCategory.textContent = ticket.category;

  const infoType = document.getElementById('infoType');
  if (infoType) infoType.textContent = ticket.type;

  const infoDestination = document.getElementById('infoDestination');
  if (infoDestination) infoDestination.textContent = ticket.destination;

  const infoReason = document.getElementById('infoReason');
  if (infoReason) infoReason.textContent = ticket.reason;

  const infoTimeSectionTitle = document.getElementById('infoTimeSectionTitle');
  if (infoTimeSectionTitle) {
    const dayStr = ticket.createdAt ? ticket.createdAt.slice(0, 11) : '16 Oktober 2026';
    infoTimeSectionTitle.textContent = `Waktu keluar & kembali • ${dayStr}`;
  }

  const infoTablePlanExit = document.getElementById('infoTablePlanExit');
  if (infoTablePlanExit) {
    infoTablePlanExit.textContent = ticket.plannedExit ? `${ticket.plannedExit.slice(11, 16)} WIB` : '09.00 WIB';
  }

  const infoTableActualExit = document.getElementById('infoTableActualExit');
  if (infoTableActualExit) {
    const scanOutStr = ticket.scanOutTime ? (ticket.scanOutTime.includes('WIB') ? ticket.scanOutTime : `${ticket.scanOutTime} WIB`) : '';
    infoTableActualExit.textContent = scanOutStr || (ticket.status === 'Selesai' ? '09.03 WIB' : '-');
  }

  const infoTablePlanReturn = document.getElementById('infoTablePlanReturn');
  if (infoTablePlanReturn) {
    infoTablePlanReturn.textContent = ticket.estimatedReturn ? `${ticket.estimatedReturn.slice(11, 16)} WIB` : '-';
  }

  const infoTableActualReturn = document.getElementById('infoTableActualReturn');
  if (infoTableActualReturn) {
    const isLateTicket = ticket.isLate || ticket.status === 'Terlambat' || (ticket.scanInTime && ticket.scanInTime.includes('[Terlambat]'));
    const scanInStr = ticket.scanInTime 
      ? (ticket.scanInTime.includes('WIB') ? ticket.scanInTime : `${ticket.scanInTime} WIB`)
      : '';
    infoTableActualReturn.textContent = scanInStr 
      ? `${scanInStr} • ${isLateTicket ? `Terlambat${ticket.lateMinutes ? ` (+${ticket.lateMinutes} mnt)` : ''}` : 'Tepat Waktu'}` 
      : (ticket.status === 'Selesai' 
          ? (ticket.isLate ? '10.52 WIB • Terlambat' : '10.52 WIB • Tepat Waktu') 
          : (ticket.status === 'Terlambat' ? '⚠️ Belum Scan In (Terlambat)' : '-'));
  }

  const infoApproverLbl = document.getElementById('infoApproverLbl');
  if (infoApproverLbl) {
    if (ticket.reassignedFrom) {
      infoApproverLbl.innerHTML = `Catatan Atasan • <strong>${ticket.approverName}</strong> <span style="font-size:0.75rem; color:#b45309; font-weight:700;">(↳ Dialihkan dari ${ticket.reassignedFrom})</span>`;
    } else {
      infoApproverLbl.textContent = `Catatan Atasan • ${ticket.approverName || 'Ir. Hendra Gunawan, M.T.'}`;
    }
  }

  const infoApproverNoteText = document.getElementById('infoApproverNoteText');
  if (infoApproverNoteText) {
    infoApproverNoteText.textContent = ticket.approverNote || 'Disetujui. Sampaikan hasil pemeriksaan setelah kembali.';
  }

  const infoSecurityLbl = document.getElementById('infoSecurityLbl');
  if (infoSecurityLbl) {
    infoSecurityLbl.textContent = `Catatan Petugas Pos Jaga • ${ticket.securityName || 'Agus Setiawan'}`;
  }

  const infoSecurityNoteText = document.getElementById('infoSecurityNoteText');
  if (infoSecurityNoteText) {
    infoSecurityNoteText.textContent = ticket.securityNote || 'Identitas dan QR sesuai. Scan In tercatat di Pos 1.';
  }

  const infoNoticeText = document.getElementById('infoNoticeText');
  if (infoNoticeText) {
    if (ticket.reassignedFrom && (ticket.status === 'Menunggu Persetujuan' || ticket.status === 'Menunggu Otorisasi Darurat')) {
      infoNoticeText.innerHTML = `Pengajuan ini dialihkan oleh pemohon ke <strong>${ticket.approverName}</strong> pada ${ticket.reassignedAt || 'hari ini'} dan menunggu keputusan persetujuan.`;
    } else if (ticket.status === 'Selesai') {
      infoNoticeText.textContent = `Perjalanan selesai pukul ${ticket.scanInTime || '10.52'} WIB. QR tiket ini tidak berlaku lagi.`;
    } else if (ticket.status === 'Terlambat') {
      infoNoticeText.innerHTML = `<span style="color:#b91c1c; font-weight:800;">⚠️ PERINGATAN: Karyawan telah melewati batas waktu estimasi kembali (${ticket.estimatedReturn ? (window.formatDisplayDate ? window.formatDisplayDate(ticket.estimatedReturn) : ticket.estimatedReturn) : ''}). Segera kembali ke Pos 1 untuk melakukan Scan In.</span>`;
    } else if (ticket.status === 'Sedang di Luar') {
      infoNoticeText.textContent = `Karyawan sedang di luar kawasan. Wajib kembali dan Scan In sebelum ${ticket.estimatedReturn ? ticket.estimatedReturn.slice(11, 16) : '13.00'} WIB.`;
    } else if (ticket.status === 'Disetujui') {
      infoNoticeText.textContent = `Tiket telah disetujui. Tunjukkan QR Code digital kepada Petugas di Pos 1 untuk Scan Out.`;
    } else if (ticket.status === 'Menunggu Persetujuan') {
      infoNoticeText.textContent = `Tiket sedang menunggu persetujuan dari Atasan langsung (${ticket.approverName || 'Ir. Hendra Gunawan, M.T.'}). QR belum aktif.`;
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

        return `
          <div class="figma-timeline-item">
            <div class="figma-timeline-dot" style="background: ${dotColor};"></div>
            <div class="figma-timeline-top">
              <span class="figma-timeline-event" style="${idx === 0 ? 'font-weight: 800; color: #0f172a;' : ''}">${item.event}</span>
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

      const dayStr = ticket.createdAt ? ticket.createdAt.slice(0, 11) : '16 Okt 2026';
      const exitHour = ticket.plannedExit ? ticket.plannedExit.slice(11, 16) : '08.15';

      let timelineHtml = `
        <!-- Step 1: Pengajuan Dibuat -->
        <div class="figma-timeline-item">
          <div class="figma-timeline-dot"></div>
          <div class="figma-timeline-top">
            <span class="figma-timeline-event">Pengajuan Dibuat</span>
            <span class="figma-timeline-time">${dayStr} • ${exitHour} WIB</span>
          </div>
          <div class="figma-timeline-actor">${ticket.applicantName || 'Budi Pratama, S.T.'} • ${ticket.applicantNip || 'PK-2024-8841'}</div>
          <div class="figma-timeline-desc">${ticket.category} • ${ticket.destination}</div>
        </div>
      `;

      if (isApproved) {
        timelineHtml += `
          <!-- Step 2: Disetujui Atasan -->
          <div class="figma-timeline-item">
            <div class="figma-timeline-dot"></div>
            <div class="figma-timeline-top">
              <span class="figma-timeline-event">Disetujui Atasan</span>
              <span class="figma-timeline-time">${dayStr} • 08.32 WIB</span>
            </div>
            <div class="figma-timeline-actor">${ticket.approverName || 'Ir. Hendra Gunawan, M.T.'}</div>
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
              <span class="figma-timeline-time">${dayStr} • ${ticket.scanOutTime || '09.03'} WIB</span>
            </div>
            <div class="figma-timeline-actor">Pos 1 • ${ticket.securityName || 'Agus Setiawan'}</div>
            <div class="figma-timeline-desc">Identitas dan QR sesuai. Karyawan keluar area.</div>
          </div>
        `;
      }

      if (isDone) {
        timelineHtml += `
          <!-- Step 4: Scan In -->
          <div class="figma-timeline-item">
            <div class="figma-timeline-dot green"></div>
            <div class="figma-timeline-top">
              <span class="figma-timeline-event">Scan In</span>
              <span class="figma-timeline-time">${dayStr} • ${ticket.scanInTime || '10.52'} WIB</span>
            </div>
            <div class="figma-timeline-actor">Pos 1 • ${ticket.securityName || 'Agus Setiawan'}</div>
            <div class="figma-timeline-desc">Tepat Waktu • 8 menit sebelum batas kembali pukul 11.00 WIB.</div>
          </div>
        `;
      }

      figmaDetailTimelineList.innerHTML = timelineHtml;
    }
  }

  // Footer Metadata & Buttons
  const detailFooterMeta = document.getElementById('detailFooterMeta');
  if (detailFooterMeta) {
    if (ticket.status === 'Selesai') {
      detailFooterMeta.textContent = 'Tiket selesai • QR tidak aktif';
    } else if (ticket.status === 'Sedang di Luar' || ticket.status === 'Disetujui') {
      detailFooterMeta.textContent = 'Tiket aktif • QR dapat digunakan';
    } else {
      detailFooterMeta.textContent = 'Tiket menunggu • QR belum aktif';
    }
  }

  // Button: Buka Tiket QR (if approved or active)
  const btnDetailOpenQR = document.getElementById('btnDetailOpenQR');
  if (btnDetailOpenQR) {
    const hasQr = ticket.status === 'Disetujui' || ticket.status === 'Sedang di Luar' || ticket.status === 'Terlambat';
    if (hasQr) {
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
  const isEmergLockedInDetail = isEmergencyTicket && (
    ticket.status === 'Menunggu Otorisasi Darurat' ||
    ticket.emergencyLocked === true ||
    ticket.qrLocked === true ||
    (ticket.status !== 'Disetujui' && ticket.status !== 'Sedang di Luar' && ticket.status !== 'Selesai' && ticket.status !== 'Ditolak' && ticket.status !== 'Dibatalkan')
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
      const btnBannerEditEmergency = document.getElementById('btnBannerEditEmergency');
      if (btnBannerEditEmergency) {
        btnBannerEditEmergency.onclick = () => openEditTicketModal(ticket.id);
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
  if (btnDetailEmergencyUnlock) {
    if (isEmergLockedInDetail) {
      btnDetailEmergencyUnlock.style.display = 'inline-flex';
      btnDetailEmergencyUnlock.onclick = () => window.openEmergencyUnlockModal(ticket.id);
    } else {
      btnDetailEmergencyUnlock.style.display = 'none';
      btnDetailEmergencyUnlock.onclick = null;
    }
  }

  // Edit Action Button directly inside detail modal
  const btnDetailEditTicket = document.getElementById('btnDetailEditTicket');
  const canEditTicketInDetail = (ticket.status === 'Menunggu Persetujuan' || ticket.status === 'Menunggu Otorisasi Darurat' || isEmergLockedInDetail) && !ticket.scanOutTime && ticket.status !== 'Disetujui';
  if (btnDetailEditTicket) {
    if (canEditTicketInDetail && (window.currentActor === 'karyawan' || !window.currentActor)) {
      btnDetailEditTicket.style.display = 'inline-flex';
      btnDetailEditTicket.onclick = () => {
        openEditTicketModal(ticket.id);
      };
    } else {
      btnDetailEditTicket.style.display = 'none';
      btnDetailEditTicket.onclick = null;
    }
  }

  // Cancel Action Button directly inside detail modal
  const btnDetailCancelTicket = document.getElementById('btnDetailCancelTicket');
  const canCancelInDetail = (ticket.status === 'Menunggu Persetujuan' || ticket.status === 'Menunggu Otorisasi Darurat' || ticket.status === 'Disetujui' || ticket.status === 'Kedaluwarsa') && !ticket.scanOutTime;
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
    if (isApproverActor && isPendingDecision && isAssignedToMe) {
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

  // Security Action Buttons (Scan Out / Scan In) directly inside detail modal
  const btnDetailScanOut = document.getElementById('btnDetailScanOut');
  const btnDetailScanIn = document.getElementById('btnDetailScanIn');

  if (btnDetailScanOut) {
    const canScanOut = (ticket.status === 'Disetujui' || ticket.status === 'Kedaluwarsa') && !ticket.scanOutTime;
    if (canScanOut) {
      btnDetailScanOut.style.display = 'inline-flex';
      btnDetailScanOut.onclick = function () {
        if (typeof window.executeScanOut === 'function') {
          window.executeScanOut(ticket.id);
        }
        if (modalTicketDetail) modalTicketDetail.classList.remove('open');
      };
    } else {
      btnDetailScanOut.style.display = 'none';
      btnDetailScanOut.onclick = null;
    }
  }

  if (btnDetailScanIn) {
    const isOutsideToReturn = (ticket.status === 'Sedang di Luar' || ticket.status === 'Terlambat') && !ticket.scanInTime;
    if (isOutsideToReturn) {
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
    const isOutsideKembali = (ticket.status === 'Sedang di Luar' || ticket.status === 'Terlambat') && ticket.type === 'Kembali ke Area';
    if (window.currentActor === 'karyawan' && isOutsideKembali && !hasPendingExt) {
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

  switchDetailTab(defaultTab);
  if (modalTicketDetail) modalTicketDetail.classList.add('open');
}

// CANCELLATION FLOW
function openCancelModal(ticketId) {
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  const isEmergLocked = ticket.isEmergency && (ticket.emergencyLocked || ticket.status === 'Menunggu Otorisasi Darurat');
  const isOutside = (ticket.status === 'Sedang di Luar' || ticket.status === 'Terlambat');
  const isFinished = (ticket.status === 'Selesai' || ticket.status === 'Dibatalkan' || ticket.status === 'Ditolak');
  const canCancel = !isOutside && !isFinished;

  if (!canCancel) {
    if (typeof window.showToast === 'function') {
      window.showToast('Tiket ini tidak dapat dibatalkan karena karyawan telah meninggalkan kawasan pabrik (Scan Out). Silakan lakukan Scan In di Pos 1 untuk menyelesaikan izin.', 'danger');
    }
    return;
  }

  // Close other modals so cancel modal is cleanly visible
  const modalTicketDetail = document.getElementById('modalTicketDetail');
  if (modalTicketDetail) modalTicketDetail.classList.remove('open');
  const modalActiveBlocked = document.getElementById('modalActiveBlocked');
  if (modalActiveBlocked) modalActiveBlocked.classList.remove('open');

  window.currentCancelTicketId = ticketId;
  const cancelTicketId = document.getElementById('cancelTicketId');
  const cancelReasonInput = document.getElementById('cancelReasonInput');
  const modalCancelRequest = document.getElementById('modalCancelRequest');

  if (cancelTicketId) cancelTicketId.textContent = ticketId;
  if (cancelReasonInput) cancelReasonInput.value = '';
  if (modalCancelRequest) modalCancelRequest.classList.add('open');
}

function confirmCancelTicket() {
  const cancelReasonInput = document.getElementById('cancelReasonInput');
  const reason = (cancelReasonInput && cancelReasonInput.value.trim()) || 'Dibatalkan mandiri oleh pemohon.';

  const ticketsList = window.ticketsList || [];
  const ticketId = window.currentCancelTicketId;
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (ticket) {
    const ACTORS = window.ACTORS || {};
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const nowFormatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

    ticket.status = 'Dibatalkan';
    ticket.scanOutTime = null;
    ticket.scanInTime = null;
    ticket.emergencyLocked = false;
    ticket.qrLocked = false;
    if (!ticket.timeline) ticket.timeline = [];
    ticket.timeline.push({
      event: 'Pengajuan Dibatalkan',
      time: nowFormatted,
      by: `${ACTORS.karyawan ? ACTORS.karyawan.name : 'Budi Pratama'} (Karyawan)`,
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
  }
}

window.openCancelModal = openCancelModal;
window.confirmCancelTicket = confirmCancelTicket;

// EMERGENCY PASS
function handleOpenEmergency() {
  window.editingEmergencyTicketId = null;
  const modalEmergency = document.getElementById('modalEmergency');
  if (!modalEmergency) return;

  const modalTitle = document.getElementById('modalEmergencyTitle');
  const modalSubtitle = document.getElementById('modalEmergencySubtitle');
  const btnSubmitEmergency = document.getElementById('btnSubmitEmergency');
  if (modalTitle) {
    modalTitle.innerHTML = `<span>🚨</span><span>Formulir Izin Darurat • Rancangan</span>`;
  }
  if (modalSubtitle) {
    modalSubtitle.textContent = 'Gunakan hanya untuk evakuasi atau keadaan mendesak • Semua data wajib diisi';
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

  const emergDest = document.getElementById('emergDest');
  const emergReason = document.getElementById('emergReason');
  const emergPlannedExit = document.getElementById('emergPlannedExit');
  const emergEstimatedReturn = document.getElementById('emergEstimatedReturn');
  const emergGroupEstimatedReturn = document.getElementById('emergGroupEstimatedReturn');
  const selectEmergCategory = document.getElementById('selectEmergCategory');
  const selectEmergType = document.getElementById('selectEmergType');

  if (emergDest) emergDest.value = '';
  if (emergReason) emergReason.value = '';
  if (selectEmergCategory) selectEmergCategory.value = '';
  if (selectEmergType) selectEmergType.value = '';
  if (emergGroupEstimatedReturn) emergGroupEstimatedReturn.style.display = 'block';

  // Reset emergency authorization method to default (app)
  const optEmergMethodApp = document.getElementById('optEmergMethodApp');
  const optEmergMethodPasscode = document.getElementById('optEmergMethodPasscode');
  const optEmergMethodFaceScan = document.getElementById('optEmergMethodFaceScan');
  if (optEmergMethodApp && optEmergMethodPasscode && optEmergMethodFaceScan) {
    optEmergMethodApp.classList.add('selected');
    optEmergMethodPasscode.classList.remove('selected');
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

      // Otomatis sesuaikan atau batasi ke batas jam pulang hari itu
      if (!isNaN(d.getTime())) {
        const day = d.getDay();
        if (day === 0 || day === 6) {
          inputEl.value = '';
        } else {
          const closing = getClosingTimeForDate(d);
          const pad = (n) => String(n).padStart(2, '0');
          const totalMins = d.getHours() * 60 + d.getMinutes();
          if (totalMins > closing.totalMinutes) {
            inputEl.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(closing.hour)}:${pad(closing.minute)}`;
          } else if (totalMins < 7 * 60) {
            inputEl.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T07:00`;
          }
        }
      }
    } else {
      inputEl.style.borderColor = '';
    }

    // Perbarui perkiraan kembali otomatis jika ada dan lebih kecil dari rencana keluar
    if (companionReturnEl && inputEl.value) {
      companionReturnEl.min = inputEl.value;
      if (companionReturnEl.value && companionReturnEl.value <= inputEl.value) {
        const exitDt = new Date(inputEl.value);
        const newReturn = new Date(exitDt.getTime() + 60 * 60000);
        const closing = getClosingTimeForDate(exitDt);
        if (closing && (newReturn.getHours() * 60 + newReturn.getMinutes()) > closing.totalMinutes) {
          newReturn.setHours(closing.hour, closing.minute, 0, 0);
        }
        companionReturnEl.value = getFormattedDateTimeLocal(newReturn);
        if (!isDinas && catVal === 'Urusan Pribadi') {
          setInputMaxByDate(companionReturnEl, now);
        } else {
          companionReturnEl.removeAttribute('max');
        }
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

      if (!isNaN(d.getTime())) {
        const day = d.getDay();
        if (day === 0 || day === 6) {
          returnEl.value = '';
        } else {
          const closing = getClosingTimeForDate(d);
          const pad = (n) => String(n).padStart(2, '0');
          const totalMins = d.getHours() * 60 + d.getMinutes();
          if (totalMins > closing.totalMinutes) {
            returnEl.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(closing.hour)}:${pad(closing.minute)}`;
          } else if (totalMins < 7 * 60) {
            returnEl.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T07:00`;
          }
        }
      }
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
      const destination = inputDestination ? inputDestination.value.trim() : '';
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

      window.pendingFormData = { category, type, destination, reason, plannedExit, estimatedReturn, approverName };

      const sumApprover = document.getElementById('sumApprover');
      const sumCategory = document.getElementById('sumCategory');
      const sumType = document.getElementById('sumType');
      const sumDestination = document.getElementById('sumDestination');
      const sumReason = document.getElementById('sumReason');
      const sumExitTime = document.getElementById('sumExitTime');
      const sumReturnRow = document.getElementById('sumReturnRow');
      const sumReturnTime = document.getElementById('sumReturnTime');

      if (sumApprover) sumApprover.textContent = approverName;
      if (sumCategory) sumCategory.textContent = category;
      if (sumType) sumType.textContent = type;
      if (sumDestination) sumDestination.textContent = destination;
      if (sumReason) sumReason.textContent = reason;
      if (sumExitTime) sumExitTime.textContent = window.formatDisplayDate(plannedExit);

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
        if (modalConfirmHeading) modalConfirmHeading.textContent = `Konfirmasi Perubahan • ${window.editingTicketId}`;
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

          const ACTORS = window.ACTORS || {};
          const isDewi = Boolean(newApprover && newApprover.toLowerCase().includes('dewi'));
          const targetApproverActor = isDewi
            ? (ACTORS.approver2 || { name: 'Dewi Sartika, S.T., M.M.', title: 'Supervisor Operasional Lapangan (Plt. Manager)' })
            : (ACTORS.approver || { name: 'Ir. Hendra Gunawan, M.T.', title: 'Manager Rekayasa & Pemeliharaan' });
          ticket.approverTitle = targetApproverActor.title;

          const now = new Date();
          const pad = (n) => String(n).padStart(2, '0');
          const nowFormatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

          if (!ticket.timeline) ticket.timeline = [];

          if (isApproverChanged) {
            ticket.reassignedFrom = oldApprover;
            ticket.reassignedTo = newApprover;
            ticket.reassignedAt = nowFormatted;
            ticket.reassignedBy = `${ACTORS.karyawan ? ACTORS.karyawan.name : 'Budi Pratama'} (Karyawan)`;

            ticket.timeline.unshift({
              event: 'Persetujuan Dialihkan',
              time: nowFormatted,
              by: `${ACTORS.karyawan ? ACTORS.karyawan.name : 'Budi Pratama'} (Karyawan)`,
              desc: `Peninjauan persetujuan izin dialihkan dari ${oldApprover} ke ${newApprover}.`
            });
          } else {
            ticket.timeline.unshift({
              event: 'Pengajuan Diperbarui (Diedit)',
              time: nowFormatted,
              by: `${ACTORS.karyawan ? ACTORS.karyawan.name : 'Budi Pratama'} (Karyawan)`,
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
      const nowFormatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

      const newTicket = {
        id: ticketId,
        applicantName: ACTORS.karyawan ? ACTORS.karyawan.name : 'Budi Pratama, S.T.',
        applicantNip: ACTORS.karyawan ? ACTORS.karyawan.nip : 'PK-2024-8841',
        department: ACTORS.karyawan ? ACTORS.karyawan.department : 'Departemen Rekayasa & Pemeliharaan',
        category: window.pendingFormData.category,
        type: window.pendingFormData.type,
        destination: window.pendingFormData.destination,
        reason: window.pendingFormData.reason,
        plannedExit: window.pendingFormData.plannedExit,
        estimatedReturn: window.pendingFormData.estimatedReturn,
        status: 'Menunggu Persetujuan',
        createdAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
        approverName: window.pendingFormData.approverName || (ACTORS.karyawan ? ACTORS.karyawan.approverName : 'Ir. Hendra Gunawan, M.T.'),
        approverNote: null,
        scanOutTime: null,
        scanInTime: null,
        timeline: [
          {
            event: 'Pengajuan Dibuat',
            time: nowFormatted,
            by: `${ACTORS.karyawan ? ACTORS.karyawan.name : 'Budi Pratama'} (Karyawan)`,
            desc: 'Pengajuan tiket izin keluar area berhasil dikirim ke antrean Atasan.'
          }
        ]
      };

      const ticketsList = window.ticketsList || [];
      ticketsList.unshift(newTicket);
      window.saveTickets(ticketsList);

      modalConfirmSummary.classList.remove('open');
      if (formNewRequest) formNewRequest.reset();
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
  if (btnCloseDetailModal) btnCloseDetailModal.addEventListener('click', () => modalTicketDetail.classList.remove('open'));
  if (btnCloseDetailBottom) btnCloseDetailBottom.addEventListener('click', () => modalTicketDetail.classList.remove('open'));

  const btnDownloadQRPng = document.getElementById('btnDownloadQRPng');
  const qrCodeContainer = document.getElementById('qrCodeContainer');
  if (btnDownloadQRPng) {
    btnDownloadQRPng.addEventListener('click', () => {
      const canvas = qrCodeContainer ? qrCodeContainer.querySelector('canvas') : null;
      if (!canvas) {
        if (typeof window.showToast === 'function') window.showToast('QR Code belum aktif untuk tiket ini.', 'danger');
        return;
      }
      const link = document.createElement('a');
      link.download = `Tiket-QR-${document.getElementById('passTicketId').textContent}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      if (typeof window.showToast === 'function') window.showToast('Gambar QR Code berhasil diunduh!', 'success');
    });
  }

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
  [optEmergMethodApp, optEmergMethodPasscode, optEmergMethodFaceScan].forEach(card => {
    if (card) {
      card.addEventListener('click', () => {
        [optEmergMethodApp, optEmergMethodPasscode, optEmergMethodFaceScan].forEach(c => c && c.classList.remove('selected'));
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
      const dest = emergDest ? emergDest.value.trim() : '';
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
          ticket.approverNote = `🚨 [Izin Darurat - QR Terkunci]: Menunggu otorisasi Atasan (${newApprover}) melalui 3 metode: (1) Persetujuan di App, (2) Kode Sandi, atau (3) Scan Wajah.`;

          const now = new Date();
          const pad = (n) => String(n).padStart(2, '0');
          const nowFormatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

          if (!ticket.timeline) ticket.timeline = [];

          if (isApproverChanged) {
            ticket.reassignedFrom = oldApprover;
            ticket.reassignedTo = newApprover;
            ticket.reassignedAt = nowFormatted;
            ticket.reassignedBy = `${ACTORS.karyawan ? ACTORS.karyawan.name : 'Budi Pratama'} (Karyawan)`;

            ticket.timeline.unshift({
              event: 'Persetujuan Dialihkan',
              time: nowFormatted,
              by: `${ACTORS.karyawan ? ACTORS.karyawan.name : 'Budi Pratama'} (Karyawan)`,
              desc: `Peninjauan izin darurat dialihkan dari ${oldApprover} ke ${newApprover}.`
            });
          } else {
            ticket.timeline.unshift({
              event: 'Pengajuan Darurat Diperbarui (Diedit)',
              time: nowFormatted,
              by: `${ACTORS.karyawan ? ACTORS.karyawan.name : 'Budi Pratama'} (Karyawan)`,
              desc: `Formulir izin darurat berhasil diperbarui untuk Atasan: ${newApprover} (Metode Otorisasi: ${selectedMethod}).`
            });
          }

          window.saveTickets(ticketsList);
          modalEmergency.classList.remove('open');
          const editedEmergId = window.editingEmergencyTicketId;
          window.editingEmergencyTicketId = null;

          if (typeof window.showToast === 'function') {
            if (isApproverChanged) {
              window.showToast(`🚨 Izin Darurat #${editedEmergId} berhasil dialihkan ke ${newApprover}!`, 'info');
            } else {
              window.showToast(`🚨 Formulir Izin Darurat #${editedEmergId} berhasil diperbarui!`, 'success');
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

      const existingActiveTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : null;
      if (existingActiveTicket) {
        existingActiveTicket.status = 'Selesai';
      }

      const ACTORS = window.ACTORS || {};
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dateCode = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const ticketId = `TK-EMG-${dateCode}-${randomSuffix}`;
      const nowFormatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

      const emergencyPasscode = (typeof window.generateEmergencyPasscode === 'function') 
        ? window.generateEmergencyPasscode() 
        : String(Math.floor(100000 + Math.random() * 900000));

      const emergencyTicket = {
        id: ticketId,
        applicantName: ACTORS.karyawan ? ACTORS.karyawan.name : 'Budi Pratama, S.T.',
        applicantNip: ACTORS.karyawan ? ACTORS.karyawan.nip : 'PK-2024-8841',
        department: ACTORS.karyawan ? ACTORS.karyawan.department : 'Departemen Rekayasa & Pemeliharaan',
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
        approverName: approverVal,
        approverNote: `🚨 [Izin Darurat - QR Terkunci]: Menunggu otorisasi Atasan (${approverVal}) melalui 3 metode: (1) Persetujuan di App, (2) Kode Sandi, atau (3) Scan Wajah.`,
        scanOutTime: null,
        scanInTime: null,
        timeline: [
          {
            event: 'Izin Darurat Diajukan (QR Terkunci)',
            time: nowFormatted,
            by: `${ACTORS.karyawan ? ACTORS.karyawan.name : 'Budi Pratama'} (Karyawan)`,
            desc: `Tiket darurat dibuat. QR Code terkunci sesuai SOP "No Approval, No Exit" sampai diotorisasi Atasan.`
          },
          {
            event: 'Kode Sandi Darurat Diterbitkan',
            time: nowFormatted,
            by: 'Sistem Kedaruratan K3',
            desc: `Sandi Otorisasi Darurat telah digenerate untuk Atasan: ${approverVal}.`
          }
        ]
      };

      const ticketsList = window.ticketsList || [];
      ticketsList.unshift(emergencyTicket);
      window.saveTickets(ticketsList);

      modalEmergency.classList.remove('open');

      // Pindahkan tampilan langsung ke subhalaman 'Pengajuan Saya' agar kartu aktif langsung terlihat
      if (typeof window.setKaryawanNav === 'function') {
        window.setKaryawanNav('pengajuan');
      }

      if (typeof window.showToast === 'function') {
        window.showToast(`🚨 Tiket Darurat #${ticketId} diterbitkan! Sistem kini menangguhkan pengajuan baru hingga tiket ini diotorisasi.`, 'warning');
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
      const ticketsList = window.ticketsList || [];
      const ticket = ticketsList.find(t => t.id === window.currentExtendTicketId) || (typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : ticketsList[0]);
      if (!ticket) return;

      const newReturnVal = inputExtendNewReturn ? inputExtendNewReturn.value : '';
      const reasonVal = inputExtendReason ? inputExtendReason.value.trim() : '';

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
      const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

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
});

// TIME EXTENSION MODAL TRIGGER FUNCTION
function openExtendDurationModal(ticketId) {
  const ticketsList = window.ticketsList || [];
  let ticket = ticketId ? ticketsList.find(t => t.id === ticketId) : null;
  if (!ticket && typeof window.getActiveTicket === 'function') {
    ticket = window.getActiveTicket();
  }
  if (!ticket && ticketsList.length > 0) {
    ticket = ticketsList.find(t => t.status === 'Sedang di Luar' || t.status === 'Terlambat') || ticketsList[0];
  }
  if (!ticket) {
    ticket = {
      id: 'IZ-20261019-013',
      destination: 'PT Rekayasa Industri, Cikampek',
      reason: 'Koordinasi teknis pemeriksaan komponen pompa P-204',
      estimatedReturn: '2026-10-21T14:00'
    };
  }

  // Jika sudah mengajukan perpanjangan dan masih menunggu persetujuan, langsung arahkan ke modal detail perpanjangan
  if (ticket.pendingExtension && ticket.pendingExtension.status === 'Menunggu Persetujuan') {
    openPendingExtensionDetailModal(ticket.id);
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
  const pendingExtOriginalReturn = document.getElementById('pendingExtOriginalReturn');
  const pendingExtProposedReturn = document.getElementById('pendingExtProposedReturn');
  const pendingExtReason = document.getElementById('pendingExtReason');
  const pendingExtRequestedAt = document.getElementById('pendingExtRequestedAt');
  const pendingExtStatusBadge = document.getElementById('pendingExtStatusBadge');

  if (pendingExtTicketId) pendingExtTicketId.textContent = ticket.id;
  if (pendingExtOriginalReturn) {
    pendingExtOriginalReturn.textContent = ext.oldEstimatedReturn 
      ? (window.formatDisplayDate ? window.formatDisplayDate(ext.oldEstimatedReturn) : ext.oldEstimatedReturn)
      : (ticket.estimatedReturn ? (window.formatDisplayDate ? window.formatDisplayDate(ticket.estimatedReturn) : ticket.estimatedReturn) : '-');
  }
  if (pendingExtProposedReturn) {
    pendingExtProposedReturn.textContent = ext.newEstimatedReturn 
      ? (window.formatDisplayDate ? window.formatDisplayDate(ext.newEstimatedReturn) : ext.newEstimatedReturn)
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
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

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
