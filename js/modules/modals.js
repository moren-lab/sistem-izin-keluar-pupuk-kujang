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

    if (blockedTicketId) blockedTicketId.textContent = activeTicket.id;
    if (blockedContainer) {
      blockedContainer.innerHTML = window.getStatusPill(activeTicket.status);
    }

    if (btnBlockedViewTicket) {
      btnBlockedViewTicket.onclick = () => {
        if (modalActiveBlocked) modalActiveBlocked.classList.remove('open');
        openTicketDetail(activeTicket.id, 'detail');
      };
    }

    if (modalActiveBlocked) modalActiveBlocked.classList.add('open');
    if (typeof window.showToast === 'function') {
      window.showToast(`Pengajuan baru ditangguhkan: Anda masih memiliki izin aktif (${activeTicket.id})!`, 'danger');
    }
    return;
  }

  initFormDates();
  if (modalNewRequest) modalNewRequest.classList.add('open');
}

function setupRadioToggles() {
  const optCatDinas = document.getElementById('optCatDinas');
  const optCatPribadi = document.getElementById('optCatPribadi');
  const optTypeKembali = document.getElementById('optTypeKembali');
  const optTypePulang = document.getElementById('optTypePulang');
  const groupEstimatedReturn = document.getElementById('groupEstimatedReturn');
  const inputEstimatedReturn = document.getElementById('inputEstimatedReturn');

  if (optCatDinas && optCatPribadi) {
    optCatDinas.addEventListener('click', () => {
      optCatDinas.classList.add('selected');
      optCatPribadi.classList.remove('selected');
    });

    optCatPribadi.addEventListener('click', () => {
      optCatPribadi.classList.add('selected');
      optCatDinas.classList.remove('selected');
    });
  }

  if (optTypeKembali && optTypePulang) {
    optTypeKembali.addEventListener('click', () => {
      optTypeKembali.classList.add('selected');
      optTypePulang.classList.remove('selected');
      if (groupEstimatedReturn) groupEstimatedReturn.style.display = 'flex';
      if (inputEstimatedReturn) inputEstimatedReturn.required = true;
    });

    optTypePulang.addEventListener('click', () => {
      optTypePulang.classList.add('selected');
      optTypeKembali.classList.remove('selected');
      if (groupEstimatedReturn) groupEstimatedReturn.style.display = 'none';
      if (inputEstimatedReturn) inputEstimatedReturn.required = false;
    });
  }
}

function initFormDates() {
  const inputPlannedExit = document.getElementById('inputPlannedExit');
  const inputEstimatedReturn = document.getElementById('inputEstimatedReturn');
  if (!inputPlannedExit) return;

  const now = new Date();
  const futureExit = new Date(now.getTime() + 15 * 60000);
  const futureReturn = new Date(now.getTime() + 120 * 60000);

  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;

  inputPlannedExit.value = fmt(futureExit);
  if (inputEstimatedReturn) inputEstimatedReturn.value = fmt(futureReturn);
}

// TAB SWITCHER IN DETAIL MODAL
function switchDetailTab(tab) {
  const tabNavQR = document.getElementById('tabNavQR');
  const tabNavInfo = document.getElementById('tabNavInfo');
  const paneDetailQR = document.getElementById('paneDetailQR');
  const paneDetailInfo = document.getElementById('paneDetailInfo');

  if (tab === 'detail') {
    if (tabNavInfo) {
      tabNavInfo.classList.add('active');
      tabNavInfo.style.borderBottom = '3px solid var(--corp-teal)';
      tabNavInfo.style.color = 'var(--corp-teal)';
    }
    if (tabNavQR) {
      tabNavQR.classList.remove('active');
      tabNavQR.style.borderBottom = '3px solid transparent';
      tabNavQR.style.color = 'var(--text-secondary)';
    }
    if (paneDetailInfo) paneDetailInfo.style.display = 'flex';
    if (paneDetailQR) paneDetailQR.style.display = 'none';
  } else {
    if (tabNavQR) {
      tabNavQR.classList.add('active');
      tabNavQR.style.borderBottom = '3px solid var(--corp-teal)';
      tabNavQR.style.color = 'var(--corp-teal)';
    }
    if (tabNavInfo) {
      tabNavInfo.classList.remove('active');
      tabNavInfo.style.borderBottom = '3px solid transparent';
      tabNavInfo.style.color = 'var(--text-secondary)';
    }
    if (paneDetailQR) paneDetailQR.style.display = 'flex';
    if (paneDetailInfo) paneDetailInfo.style.display = 'none';
  }
}

// OPEN TICKET DETAIL & QR MODAL
function openTicketDetail(ticketId, defaultTab = 'qr') {
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  const ACTORS = window.ACTORS || {};
  const modalTicketDetail = document.getElementById('modalTicketDetail');

  // --- TAB A: QR & DIGITAL PASS ---
  const passTicketId = document.getElementById('passTicketId');
  if (passTicketId) passTicketId.textContent = ticket.id;

  const passEmployeeName = document.getElementById('passEmployeeName');
  if (passEmployeeName) passEmployeeName.textContent = ticket.applicantName || (ACTORS.karyawan ? ACTORS.karyawan.name : 'Budi Pratama, S.T.');

  const passEmployeeNIP = document.getElementById('passEmployeeNIP');
  if (passEmployeeNIP) passEmployeeNIP.textContent = ticket.applicantNip || (ACTORS.karyawan ? ACTORS.karyawan.nip : 'PK-2024-8841');

  const passCatType = document.getElementById('passCatType');
  if (passCatType) passCatType.textContent = `${ticket.category} • ${ticket.type}`;

  const passApprover = document.getElementById('passApprover');
  if (passApprover) passApprover.textContent = ticket.approverName || (ACTORS.approver ? ACTORS.approver.name : 'Ir. Hendra Gunawan, M.T.');

  const passPlannedExit = document.getElementById('passPlannedExit');
  if (passPlannedExit) passPlannedExit.textContent = window.formatDisplayDate(ticket.plannedExit);

  const passEstimatedReturn = document.getElementById('passEstimatedReturn');
  if (passEstimatedReturn) passEstimatedReturn.textContent = ticket.estimatedReturn ? window.formatDisplayDate(ticket.estimatedReturn) : 'Pulang Hari Ini';

  const passContainer = document.getElementById('passStatusBadgeContainer');
  if (passContainer) {
    passContainer.innerHTML = window.getStatusPill(ticket.status);
  }

  // Pos Jaga Scan Real Records
  const scanRecordGrid = document.getElementById('scanRecordGrid');
  if (scanRecordGrid) {
    if (ticket.scanOutTime || ticket.scanInTime) {
      scanRecordGrid.style.display = 'grid';
      const elOut = document.getElementById('passScanOut');
      const elIn = document.getElementById('passScanIn');
      if (elOut) elOut.textContent = ticket.scanOutTime || '-';
      if (elIn) elIn.textContent = ticket.scanInTime || '-';
    } else {
      scanRecordGrid.style.display = 'none';
    }
  }

  // QR Code Generation
  const qrCodeContainer = document.getElementById('qrCodeContainer');
  if (qrCodeContainer) {
    qrCodeContainer.innerHTML = '';
    if (ticket.status === 'Disetujui' || ticket.status === 'Sedang di Luar' || ticket.status === 'Terlambat' || ticket.status === 'Selesai') {
      const qrPayload = `KUJANG-PASS|${ticket.id}|${ticket.applicantNip || 'PK-2024-8841'}|${ticket.category}|${ticket.plannedExit}`;
      if (typeof QRCode !== 'undefined') {
        new QRCode(qrCodeContainer, {
          text: qrPayload,
          width: 150,
          height: 150,
          colorDark: ticket.status === 'Terlambat' ? '#b91c1c' : '#0f2b48',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
      } else {
        qrCodeContainer.innerHTML = `<span>QR: ${ticket.id}</span>`;
      }
    } else if (ticket.status === 'Kedaluwarsa') {
      qrCodeContainer.innerHTML = `
        <div style="width:150px; height:150px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#fef2f2; border:1.5px dashed #f87171; border-radius:6px; padding:10px; text-align:center;">
          <span style="font-size:1.6rem;">⏱️</span>
          <span style="font-size:0.75rem; color:#b91c1c; margin-top:4px; font-weight:800;">QR KEDALUWARSA</span>
          <span style="font-size:0.6rem; color:#7f1d1d; margin-top:2px;">Tiket hangus melewati batas toleransi jam keluar</span>
        </div>
      `;
    } else {
      qrCodeContainer.innerHTML = `
        <div style="width:150px; height:150px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:6px; padding:10px; text-align:center;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span style="font-size:0.7rem; color:#475569; margin-top:4px; font-weight:700;">QR Belum Aktif</span>
          <span style="font-size:0.6rem; color:#94a3b8;">Aktif setelah izin disetujui Atasan</span>
        </div>
      `;
    }
  }

  // --- TAB B: RINCIAN METADATA & TIMELINE AUDIT TRAIL ---
  const infoTicketId = document.getElementById('infoTicketId');
  if (infoTicketId) infoTicketId.textContent = ticket.id;

  const infoStatusContainer = document.getElementById('infoStatusContainer');
  if (infoStatusContainer) infoStatusContainer.innerHTML = window.getStatusPill(ticket.status);

  const infoEmployeeName = document.getElementById('infoEmployeeName');
  if (infoEmployeeName) infoEmployeeName.textContent = ticket.applicantName || (ACTORS.karyawan ? ACTORS.karyawan.name : 'Budi Pratama, S.T.');

  const infoEmployeeMeta = document.getElementById('infoEmployeeMeta');
  if (infoEmployeeMeta) infoEmployeeMeta.textContent = `${ticket.applicantNip || 'PK-2024-8841'} • ${ticket.department || 'Departemen Rekayasa & Pemeliharaan'}`;

  const infoCatType = document.getElementById('infoCatType');
  if (infoCatType) infoCatType.textContent = `${ticket.category} • ${ticket.type}`;

  const infoDestination = document.getElementById('infoDestination');
  if (infoDestination) infoDestination.textContent = ticket.destination;

  const infoReason = document.getElementById('infoReason');
  if (infoReason) infoReason.textContent = ticket.reason;

  const infoPlannedExit = document.getElementById('infoPlannedExit');
  if (infoPlannedExit) infoPlannedExit.textContent = window.formatDisplayDate(ticket.plannedExit);

  const infoEstimatedReturn = document.getElementById('infoEstimatedReturn');
  if (infoEstimatedReturn) infoEstimatedReturn.textContent = ticket.estimatedReturn ? window.formatDisplayDate(ticket.estimatedReturn) : 'Pulang Hari Ini';

  // Approver note display
  const noteDisplay = document.getElementById('approverNoteDisplay');
  const noteText = document.getElementById('approverNoteText');
  if (noteDisplay && noteText) {
    if (ticket.approverNote) {
      noteDisplay.style.display = 'block';
      noteText.textContent = ticket.approverNote;
    } else {
      noteDisplay.style.display = 'none';
    }
  }

  // Timeline
  const timelineHolder = document.getElementById('timelineActivityList');
  if (timelineHolder) {
    if (ticket.timeline && ticket.timeline.length > 0) {
      timelineHolder.innerHTML = ticket.timeline.map((item, idx) => `
        <div class="timeline-step ${idx === ticket.timeline.length - 1 ? 'active' : ''}">
          <div class="step-dot"></div>
          <div class="step-title">${item.event}</div>
          <div class="step-time">${item.time} • ${item.by}</div>
          <div class="step-desc">${item.desc}</div>
        </div>
      `).join('');
    } else {
      timelineHolder.innerHTML = `<div style="font-size:0.75rem; color:#94a3b8;">Belum ada riwayat aktivitas.</div>`;
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

  if (ticket.status !== 'Menunggu Persetujuan' && ticket.status !== 'Disetujui') {
    if (typeof window.showToast === 'function') window.showToast('Tiket ini tidak dapat dibatalkan lagi.', 'danger');
    return;
  }

  window.currentCancelTicketId = ticketId;
  const cancelTicketId = document.getElementById('cancelTicketId');
  const cancelReasonInput = document.getElementById('cancelReasonInput');
  const modalCancelRequest = document.getElementById('modalCancelRequest');

  if (cancelTicketId) cancelTicketId.textContent = ticketId;
  if (cancelReasonInput) cancelReasonInput.value = '';
  if (modalCancelRequest) modalCancelRequest.classList.add('open');
}

// EMERGENCY PASS
function handleOpenEmergency() {
  const emergDest = document.getElementById('emergDest');
  const emergReason = document.getElementById('emergReason');
  const modalEmergency = document.getElementById('modalEmergency');

  if (emergDest) emergDest.value = '';
  if (emergReason) emergReason.value = '';
  if (modalEmergency) modalEmergency.classList.add('open');
}

document.addEventListener('DOMContentLoaded', () => {
  setupRadioToggles();

  const btnOpenNewRequestModal = document.getElementById('btnOpenNewRequestModal');
  const menuQuickNew = document.getElementById('menuQuickNew');
  const btnCloseBlockedModal = document.getElementById('btnCloseBlockedModal');
  const btnDismissBlockedModal = document.getElementById('btnDismissBlockedModal');
  const modalActiveBlocked = document.getElementById('modalActiveBlocked');
  const modalNewRequest = document.getElementById('modalNewRequest');
  const formNewRequest = document.getElementById('formNewRequest');
  const modalConfirmSummary = document.getElementById('modalConfirmSummary');

  if (btnOpenNewRequestModal) btnOpenNewRequestModal.addEventListener('click', handleOpenNewRequest);
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

      if (typeof window.getActiveTicket === 'function' && window.getActiveTicket()) {
        if (typeof window.showToast === 'function') window.showToast('Gagal mengajukan: Anda masih memiliki tiket izin yang sedang aktif!', 'danger');
        modalNewRequest.classList.remove('open');
        return;
      }

      const inputDestination = document.getElementById('inputDestination');
      const inputReason = document.getElementById('inputReason');
      const inputPlannedExit = document.getElementById('inputPlannedExit');
      const inputEstimatedReturn = document.getElementById('inputEstimatedReturn');

      const category = formNewRequest.reqCategory.value;
      const type = formNewRequest.reqType.value;
      const destination = inputDestination ? inputDestination.value.trim() : '';
      const reason = inputReason ? inputReason.value.trim() : '';
      const plannedExit = inputPlannedExit ? inputPlannedExit.value : '';
      const estimatedReturn = type === 'Kembali ke Area' ? (inputEstimatedReturn ? inputEstimatedReturn.value : null) : null;

      if (type === 'Kembali ke Area' && estimatedReturn && new Date(estimatedReturn) <= new Date(plannedExit)) {
        if (typeof window.showToast === 'function') window.showToast('Perkiraan jam kembali harus lebih besar dari rencana jam keluar!', 'danger');
        return;
      }

      window.pendingFormData = { category, type, destination, reason, plannedExit, estimatedReturn };

      const sumCategory = document.getElementById('sumCategory');
      const sumType = document.getElementById('sumType');
      const sumDestination = document.getElementById('sumDestination');
      const sumReason = document.getElementById('sumReason');
      const sumExitTime = document.getElementById('sumExitTime');
      const sumReturnRow = document.getElementById('sumReturnRow');
      const sumReturnTime = document.getElementById('sumReturnTime');

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
        approverName: ACTORS.karyawan ? ACTORS.karyawan.approverName : 'Ir. Hendra Gunawan, M.T.',
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
      window.pendingFormData = null;

      if (typeof window.showToast === 'function') {
        window.showToast(`Tiket #${ticketId} berhasil diajukan! Sistem kini mengunci pengajuan baru hingga tiket ini diproses.`, 'success');
      }
      if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
    });
  }

  // TAB NAV LISTENERS IN DETAIL MODAL
  const tabNavQR = document.getElementById('tabNavQR');
  const tabNavInfo = document.getElementById('tabNavInfo');
  if (tabNavQR) tabNavQR.addEventListener('click', () => switchDetailTab('qr'));
  if (tabNavInfo) tabNavInfo.addEventListener('click', () => switchDetailTab('detail'));

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
    btnConfirmCancelTicket.addEventListener('click', () => {
      const cancelReasonInput = document.getElementById('cancelReasonInput');
      const reason = cancelReasonInput ? cancelReasonInput.value.trim() : '';
      if (!reason) {
        if (typeof window.showToast === 'function') window.showToast('Harap isi alasan pembatalan!', 'danger');
        return;
      }

      const ticketsList = window.ticketsList || [];
      const ticket = ticketsList.find(t => t.id === window.currentCancelTicketId);
      if (ticket) {
        const ACTORS = window.ACTORS || {};
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const nowFormatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

        ticket.status = 'Dibatalkan';
        if (!ticket.timeline) ticket.timeline = [];
        ticket.timeline.push({
          event: 'Pengajuan Dibatalkan',
          time: nowFormatted,
          by: `${ACTORS.karyawan ? ACTORS.karyawan.name : 'Budi Pratama'} (Karyawan)`,
          desc: `Dibatalkan mandiri. Alasan: "${reason}".`
        });

        window.saveTickets(ticketsList);
        if (modalCancelRequest) modalCancelRequest.classList.remove('open');
        if (typeof window.showToast === 'function') {
          window.showToast(`Tiket #${window.currentCancelTicketId} berhasil dibatalkan. Anda kini dapat mengajukan izin baru.`, 'success');
        }
        if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
        if (typeof window.renderSecurityView === 'function') window.renderSecurityView();
      }
    });
  }

  // EMERGENCY PASS LISTENERS
  const btnOpenEmergencyModal = document.getElementById('btnOpenEmergencyModal');
  const btnCloseEmergencyModal = document.getElementById('btnCloseEmergencyModal');
  const btnAbortEmergency = document.getElementById('btnAbortEmergency');
  const btnSubmitEmergency = document.getElementById('btnSubmitEmergency');
  const modalEmergency = document.getElementById('modalEmergency');

  if (btnOpenEmergencyModal) btnOpenEmergencyModal.addEventListener('click', handleOpenEmergency);
  if (btnCloseEmergencyModal) btnCloseEmergencyModal.addEventListener('click', () => modalEmergency.classList.remove('open'));
  if (btnAbortEmergency) btnAbortEmergency.addEventListener('click', () => modalEmergency.classList.remove('open'));

  if (btnSubmitEmergency) {
    btnSubmitEmergency.addEventListener('click', () => {
      const emergDest = document.getElementById('emergDest');
      const emergReason = document.getElementById('emergReason');
      const dest = emergDest ? emergDest.value.trim() : '';
      const reason = emergReason ? emergReason.value.trim() : '';

      if (!dest || !reason) {
        if (typeof window.showToast === 'function') window.showToast('Harap lengkapi lokasi dan alasan keduratan!', 'danger');
        return;
      }

      const ACTORS = window.ACTORS || {};
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dateCode = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const ticketId = `TK-EMG-${dateCode}-${randomSuffix}`;
      const nowFormatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

      const emergencyTicket = {
        id: ticketId,
        applicantName: ACTORS.karyawan ? ACTORS.karyawan.name : 'Budi Pratama, S.T.',
        applicantNip: ACTORS.karyawan ? ACTORS.karyawan.nip : 'PK-2024-8841',
        department: ACTORS.karyawan ? ACTORS.karyawan.department : 'Departemen Rekayasa & Pemeliharaan',
        category: 'Urusan Pribadi',
        type: 'Pulang Mendahului',
        destination: `[DARURAT] ${dest}`,
        reason: `[DARURAT] ${reason}`,
        plannedExit: now.toISOString().slice(0, 16),
        estimatedReturn: null,
        status: 'Disetujui',
        createdAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
        approverName: 'Jalur Darurat Pos Jaga',
        approverNote: 'Tiket diterbitkan melalui jalur darurat. Wajib verifikasi fisik di Pos Jaga.',
        scanOutTime: null,
        scanInTime: null,
        timeline: [
          { event: 'Pengajuan Darurat Dibuat', time: nowFormatted, by: `${ACTORS.karyawan ? ACTORS.karyawan.name : 'Budi Pratama'} (Karyawan)`, desc: 'Jalur izin darurat diaktifkan.' },
          { event: 'QR Code Darurat Aktif', time: nowFormatted, by: 'Sistem Gerbang Digital', desc: 'QR aktif khusus verifikasi darurat Pos Jaga.' }
        ]
      };

      const ticketsList = window.ticketsList || [];
      ticketsList.unshift(emergencyTicket);
      window.saveTickets(ticketsList);

      modalEmergency.classList.remove('open');
      if (typeof window.showToast === 'function') window.showToast(`Tiket Darurat #${ticketId} berhasil diterbitkan!`, 'success');
      if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
      if (typeof window.renderSecurityView === 'function') window.renderSecurityView();
      openTicketDetail(ticketId);
    });
  }
});

// Expose globally
window.handleOpenNewRequest = handleOpenNewRequest;
window.setupRadioToggles = setupRadioToggles;
window.initFormDates = initFormDates;
window.switchDetailTab = switchDetailTab;
window.openTicketDetail = openTicketDetail;
window.openCancelModal = openCancelModal;
window.handleOpenEmergency = handleOpenEmergency;
