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
  const emergGroupEstimatedReturn = document.getElementById('emergGroupEstimatedReturn');
  const emergEstimatedReturn = document.getElementById('emergEstimatedReturn');
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

function getFormattedDateTimeLocal(dt = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function initFormDates() {
  const inputPlannedExit = document.getElementById('inputPlannedExit');
  const inputEstimatedReturn = document.getElementById('inputEstimatedReturn');
  if (!inputPlannedExit) return;

  const now = new Date();
  const futureExit = new Date(now.getTime() + 15 * 60000);
  const futureReturn = new Date(now.getTime() + 120 * 60000);

  // Kunci batas waktu minimum ke waktu sekarang (hari atau tanggal sebelumnya tidak bisa dipilih)
  const currentMinStr = getFormattedDateTimeLocal(now);
  inputPlannedExit.min = currentMinStr;
  inputPlannedExit.value = getFormattedDateTimeLocal(futureExit);

  if (inputEstimatedReturn) {
    // Estimasi kembali minimal harus sama atau setelah rencana keluar
    inputEstimatedReturn.min = inputPlannedExit.value || currentMinStr;
    inputEstimatedReturn.value = getFormattedDateTimeLocal(futureReturn);
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
    digitalPassStatusBadge.className = ticket.status === 'Sedang di Luar' ? 'status-pill-purple' : (ticket.status === 'Disetujui' ? 'status-pill-blue' : 'status-pill-green');
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
    const timeReturn = ticket.estimatedReturn ? ticket.estimatedReturn.slice(11, 16) + ' WIB' : '13.00 WIB';
    digitalPassNoticeText.textContent = `Jangan bagikan QR. Batas kembali ${timeReturn}; QR dinonaktifkan setelah Scan In.`;
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
  if (defaultTab === 'qr') {
    openDigitalPassModal(ticketId);
    return;
  }

  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  const ACTORS = window.ACTORS || {};
  const modalTicketDetail = document.getElementById('modalTicketDetail');

  // Header Title & Subtitle
  const modalDetailHeading = document.getElementById('modalDetailHeading');
  if (modalDetailHeading) {
    modalDetailHeading.textContent = `Detail Pengajuan • ${ticket.id}`;
  }

  const modalDetailSubtitle = document.getElementById('modalDetailSubtitle');
  if (modalDetailSubtitle) {
    const dayStr = ticket.createdAt ? ticket.createdAt.slice(0, 11) : '16 Oktober 2026';
    modalDetailSubtitle.textContent = `${ticket.applicantName || 'Budi Pratama, S.T.'} • ${ticket.category} • ${dayStr}`;
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
      detailStatusPillTop.innerHTML = window.getStatusPill(ticket.status);
    }
  }

  // --- TAB 1: INFORMASI TIKET ---
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
    infoTableActualExit.textContent = ticket.scanOutTime ? `${ticket.scanOutTime} WIB` : (ticket.status === 'Selesai' ? '09.03 WIB' : '-');
  }

  const infoTablePlanReturn = document.getElementById('infoTablePlanReturn');
  if (infoTablePlanReturn) {
    infoTablePlanReturn.textContent = ticket.estimatedReturn ? `${ticket.estimatedReturn.slice(11, 16)} WIB` : '-';
  }

  const infoTableActualReturn = document.getElementById('infoTableActualReturn');
  if (infoTableActualReturn) {
    infoTableActualReturn.textContent = ticket.scanInTime ? `${ticket.scanInTime} WIB • Tepat Waktu` : (ticket.status === 'Selesai' ? '10.52 WIB • Tepat Waktu' : '-');
  }

  const infoApproverLbl = document.getElementById('infoApproverLbl');
  if (infoApproverLbl) {
    infoApproverLbl.textContent = `Catatan Atasan • ${ticket.approverName || 'Ir. Hendra Gunawan, M.T.'}`;
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
    if (ticket.status === 'Selesai') {
      infoNoticeText.textContent = `Perjalanan selesai pukul ${ticket.scanInTime || '10.52'} WIB. QR tiket ini tidak berlaku lagi.`;
    } else if (ticket.status === 'Sedang di Luar') {
      infoNoticeText.textContent = `Karyawan sedang di luar kawasan. Wajib kembali dan Scan In sebelum ${ticket.estimatedReturn ? ticket.estimatedReturn.slice(11, 16) : '13.00'} WIB.`;
    } else if (ticket.status === 'Disetujui') {
      infoNoticeText.textContent = `Tiket telah disetujui. Tunjukkan QR Code digital kepada Petugas di Pos 1 untuk Scan Out.`;
    } else if (ticket.status === 'Menunggu Persetujuan') {
      infoNoticeText.textContent = `Tiket sedang menunggu persetujuan dari Atasan langsung. QR belum aktif.`;
    } else {
      infoNoticeText.textContent = `Status tiket: ${ticket.status}. Catatan tersimpan dalam audit trail sistem.`;
    }
  }

  // --- TAB 2: RIWAYAT AKTIVITAS (CONNECTED TIMELINE) ---
  const figmaDetailTimelineList = document.getElementById('figmaDetailTimelineList');
  if (figmaDetailTimelineList) {
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
        <!-- Step 4: Scan In Pos Jaga -->
        <div class="figma-timeline-item">
          <div class="figma-timeline-dot green"></div>
          <div class="figma-timeline-top">
            <span class="figma-timeline-event">Scan In Pos Jaga</span>
            <span class="figma-timeline-time">${dayStr} • ${ticket.scanInTime || '10.52'} WIB</span>
          </div>
          <div class="figma-timeline-actor">Pos 1 • ${ticket.securityName || 'Agus Setiawan'}</div>
          <div class="figma-timeline-desc">Tepat Waktu • 8 menit sebelum batas kembali pukul 11.00 WIB.</div>
        </div>
      `;
    }

    figmaDetailTimelineList.innerHTML = timelineHtml;
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

  if (btnDetailRejectTicket && btnDetailApproveTicket) {
    if (isApproverActor && isPendingDecision) {
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
  const modalEmergency = document.getElementById('modalEmergency');
  if (!modalEmergency) return;

  const emergDest = document.getElementById('emergDest');
  const emergReason = document.getElementById('emergReason');
  const emergPlannedExit = document.getElementById('emergPlannedExit');
  const emergEstimatedReturn = document.getElementById('emergEstimatedReturn');
  const emergGroupEstimatedReturn = document.getElementById('emergGroupEstimatedReturn');
  const optEmergCatDinas = document.getElementById('optEmergCatDinas');
  const optEmergCatPribadi = document.getElementById('optEmergCatPribadi');
  const optEmergTypeKembali = document.getElementById('optEmergTypeKembali');
  const optEmergTypePulang = document.getElementById('optEmergTypePulang');

  if (emergDest) emergDest.value = '';
  if (emergReason) emergReason.value = '';

  // Reset toggles to default
  if (optEmergCatDinas && optEmergCatPribadi) {
    optEmergCatDinas.classList.add('selected');
    optEmergCatPribadi.classList.remove('selected');
    const input = optEmergCatDinas.querySelector('input[type="radio"]');
    if (input) input.checked = true;
  }
  if (optEmergTypeKembali && optEmergTypePulang) {
    optEmergTypeKembali.classList.add('selected');
    optEmergTypePulang.classList.remove('selected');
    const input = optEmergTypeKembali.querySelector('input[type="radio"]');
    if (input) input.checked = true;
    if (emergGroupEstimatedReturn) emergGroupEstimatedReturn.style.display = 'block';
  }

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

  // Initialize dates
  const now = new Date();
  const futureExit = new Date(now.getTime() + 10 * 60000); // 10 menit ke depan
  const futureReturn = new Date(now.getTime() + 120 * 60000); // 2 jam ke depan
  const currentMinStr = getFormattedDateTimeLocal(now);

  if (emergPlannedExit) {
    emergPlannedExit.min = currentMinStr;
    emergPlannedExit.value = getFormattedDateTimeLocal(futureExit);
  }
  if (emergEstimatedReturn) {
    emergEstimatedReturn.min = emergPlannedExit ? emergPlannedExit.value : currentMinStr;
    emergEstimatedReturn.value = getFormattedDateTimeLocal(futureReturn);
  }

  if (modalEmergency) modalEmergency.classList.add('open');
}

document.addEventListener('DOMContentLoaded', () => {
  setupRadioToggles();
  initFormDates();

  // Setup batasan tanggal/waktu minimum (hari/tanggal sebelumnya tidak dapat dipilih)
  const inputPlannedExit = document.getElementById('inputPlannedExit');
  const inputEstimatedReturn = document.getElementById('inputEstimatedReturn');
  if (inputPlannedExit) {
    inputPlannedExit.addEventListener('change', () => {
      const currentMin = getFormattedDateTimeLocal(new Date());
      inputPlannedExit.min = currentMin;
      if (inputPlannedExit.value && inputPlannedExit.value < currentMin) {
        inputPlannedExit.value = currentMin;
        if (typeof window.showToast === 'function') {
          window.showToast('Hari atau tanggal sebelumnya tidak dapat dipilih!', 'warning');
        }
      }
      if (inputEstimatedReturn) {
        inputEstimatedReturn.min = inputPlannedExit.value || currentMin;
        if (inputEstimatedReturn.value && inputEstimatedReturn.value <= inputPlannedExit.value) {
          const exitDt = new Date(inputPlannedExit.value);
          const newReturn = new Date(exitDt.getTime() + 60 * 60000);
          inputEstimatedReturn.value = getFormattedDateTimeLocal(newReturn);
        }
      }
    });

    inputPlannedExit.addEventListener('input', () => {
      if (inputEstimatedReturn && inputPlannedExit.value) {
        inputEstimatedReturn.min = inputPlannedExit.value;
      }
    });
  }

  if (inputEstimatedReturn) {
    inputEstimatedReturn.addEventListener('change', () => {
      const minReturn = inputPlannedExit && inputPlannedExit.value ? inputPlannedExit.value : getFormattedDateTimeLocal(new Date());
      if (inputEstimatedReturn.value && inputEstimatedReturn.value < minReturn) {
        inputEstimatedReturn.value = minReturn;
        if (typeof window.showToast === 'function') {
          window.showToast('Perkiraan waktu kembali tidak boleh sebelum rencana waktu keluar!', 'warning');
        }
      }
    });
  }

  const emergPlannedExit = document.getElementById('emergPlannedExit');
  const emergEstimatedReturn = document.getElementById('emergEstimatedReturn');
  if (emergPlannedExit) {
    emergPlannedExit.addEventListener('change', () => {
      const currentMin = getFormattedDateTimeLocal(new Date());
      emergPlannedExit.min = currentMin;
      if (emergPlannedExit.value && emergPlannedExit.value < currentMin) {
        emergPlannedExit.value = currentMin;
        if (typeof window.showToast === 'function') {
          window.showToast('Hari atau tanggal sebelumnya tidak dapat dipilih!', 'warning');
        }
      }
      if (emergEstimatedReturn) {
        emergEstimatedReturn.min = emergPlannedExit.value || currentMin;
        if (emergEstimatedReturn.value && emergEstimatedReturn.value <= emergPlannedExit.value) {
          const exitDt = new Date(emergPlannedExit.value);
          const newReturn = new Date(exitDt.getTime() + 60 * 60000);
          emergEstimatedReturn.value = getFormattedDateTimeLocal(newReturn);
        }
      }
    });
  }

  if (emergEstimatedReturn) {
    emergEstimatedReturn.addEventListener('change', () => {
      const minReturn = emergPlannedExit && emergPlannedExit.value ? emergPlannedExit.value : getFormattedDateTimeLocal(new Date());
      if (emergEstimatedReturn.value && emergEstimatedReturn.value < minReturn) {
        emergEstimatedReturn.value = minReturn;
        if (typeof window.showToast === 'function') {
          window.showToast('Perkiraan waktu kembali tidak boleh sebelum rencana waktu keluar!', 'warning');
        }
      }
    });
  }

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

      if (type === 'Kembali ke Area' && estimatedReturn && new Date(estimatedReturn) <= new Date(plannedExit)) {
        if (typeof window.showToast === 'function') window.showToast('Perkiraan jam kembali harus lebih besar dari rencana jam keluar!', 'danger');
        return;
      }

      const selectApprover = document.getElementById('selectApprover');
      const approverName = selectApprover ? selectApprover.value : (ACTORS.karyawan ? ACTORS.karyawan.approverName : 'Ir. Hendra Gunawan, M.T.');

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

  if (btnOpenEmergencyModal) btnOpenEmergencyModal.addEventListener('click', handleOpenEmergency);
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
      const existingActiveTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : null;
      if (existingActiveTicket) {
        existingActiveTicket.status = 'Selesai';
      }

      const emergApprover = document.getElementById('emergApprover');
      const optEmergCatDinas = document.getElementById('optEmergCatDinas');
      const optEmergTypeKembali = document.getElementById('optEmergTypeKembali');
      const emergDest = document.getElementById('emergDest');
      const emergReason = document.getElementById('emergReason');
      const emergPlannedExit = document.getElementById('emergPlannedExit');
      const emergEstimatedReturn = document.getElementById('emergEstimatedReturn');
      const checkedMethodInput = document.querySelector('input[name="emergMethod"]:checked');
      const selectedMethod = checkedMethodInput ? checkedMethodInput.value : 'app';

      const approverVal = emergApprover ? emergApprover.value : 'Ir. Hendra Gunawan, M.T.';
      const isDinas = optEmergCatDinas ? optEmergCatDinas.classList.contains('selected') : true;
      const categoryVal = isDinas ? 'Dinas Kantor' : 'Urusan Pribadi';

      const isKembali = optEmergTypeKembali ? optEmergTypeKembali.classList.contains('selected') : true;
      const typeVal = isKembali ? 'Kembali ke Area' : 'Pulang Mendahului';

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

      if (isKembali && !estimatedReturnVal) {
        if (typeof window.showToast === 'function') {
          window.showToast('Harap isi perkiraan waktu kembali!', 'danger');
        }
        return;
      }

      if (isKembali && estimatedReturnVal && new Date(estimatedReturnVal) <= new Date(plannedExitVal)) {
        if (typeof window.showToast === 'function') {
          window.showToast('Perkiraan jam kembali harus lebih besar dari rencana jam keluar!', 'danger');
        }
        return;
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

  // Pre-fill inputExtendNewReturn with default value (+1 hour from current estimatedReturn or +30m from now)
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  let baseDate = ticket.estimatedReturn ? new Date(ticket.estimatedReturn) : new Date();
  if (isNaN(baseDate.getTime()) || baseDate.getTime() <= now.getTime()) {
    baseDate = new Date(now.getTime() + 60 * 60000); // 1 jam dari sekarang
  } else {
    baseDate = new Date(baseDate.getTime() + 60 * 60000); // 1 jam dari jadwal semula
  }
  const defaultVal = `${baseDate.getFullYear()}-${pad(baseDate.getMonth() + 1)}-${pad(baseDate.getDate())}T${pad(baseDate.getHours())}:${pad(baseDate.getMinutes())}`;
  const minVal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  if (inputExtendNewReturn) {
    inputExtendNewReturn.value = defaultVal;
    inputExtendNewReturn.min = minVal;
  }
  if (inputExtendReason) {
    inputExtendReason.value = '';
  }

  if (modalExtendDuration) modalExtendDuration.classList.add('open');
}

// Expose globally
window.handleOpenNewRequest = handleOpenNewRequest;
window.setupRadioToggles = setupRadioToggles;
window.initFormDates = initFormDates;
window.switchDetailTab = switchDetailTab;
window.openTicketDetail = openTicketDetail;
window.openCancelModal = openCancelModal;
window.handleOpenEmergency = handleOpenEmergency;
window.openExtendDurationModal = openExtendDurationModal;
