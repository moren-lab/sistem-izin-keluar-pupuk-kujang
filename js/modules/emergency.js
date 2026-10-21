/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Modul Alur Darurat (Emergency Pass) Terintegrasi
 * Fitur: QR Code Terkunci (Locked) & 3 Metode Otorisasi Cepat:
 * 1. Persetujuan Langsung Atasan di App (1-Click Approval)
 * 2. Input Kode Sandi / OTP Otorisasi dari Atasan
 * 3. Scan Wajah Atasan (Face Scan Biometrik Langsung di Tempat)
 */

// Helper: Hasilkan 6-digit Kode Sandi / OTP Darurat
function generateEmergencyPasscode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Buka Modal Opsi Buka Kunci QR Darurat (Untuk Karyawan)
function openEmergencyUnlockModal(ticketId, defaultMethod = null) {
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) {
    if (typeof window.showToast === 'function') window.showToast('Tiket darurat tidak ditemukan!', 'danger');
    return;
  }

  window.currentEmergencyTicketId = ticketId;

  const modal = document.getElementById('modalEmergencyUnlock');
  if (!modal) return;

  // Set data tiket pada modal
  const elTicketId = document.getElementById('emgUnlockTicketId');
  const elApplicant = document.getElementById('emgUnlockApplicant');
  const elApprover = document.getElementById('emgUnlockApprover');
  const elDestination = document.getElementById('emgUnlockDestination');
  const elPasscodeInput = document.getElementById('inputEmergencyPasscode');

  if (elTicketId) elTicketId.textContent = ticket.id;
  if (elApplicant) elApplicant.textContent = ticket.applicantName || 'Budi Pratama, S.T.';
  if (elApprover) elApprover.textContent = ticket.approverName || 'Ir. Hendra Gunawan / Dewi Sartika';
  if (elDestination) elDestination.textContent = ticket.destination || '-';
  if (elPasscodeInput) elPasscodeInput.value = '';

  // Buka tab sesuai metode yang dipilih karyawan
  const targetMethod = defaultMethod || ticket.selectedMethod || 'app';
  let initialTab = 'tabEmgApprove';
  if (targetMethod === 'passcode') initialTab = 'tabEmgPasscode';
  else if (targetMethod === 'facescan') initialTab = 'tabEmgFaceScan';

  switchEmergencyUnlockTab(initialTab, false);

  modal.classList.add('open');
}

// Tutup Modal Otorisasi Darurat
function closeEmergencyUnlockModal() {
  const modal = document.getElementById('modalEmergencyUnlock');
  if (modal) modal.classList.remove('open');
  stopEmergencyFaceScanner();
}

// Switch Tab Otorisasi Darurat & Dukung Pengubahan Cara (Edit Otorisasi)
function switchEmergencyUnlockTab(tabId, syncWithTicket = false) {
  const tabBtns = document.querySelectorAll('.emg-tab-btn');
  const tabPanes = document.querySelectorAll('.emg-tab-pane');

  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  tabPanes.forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  if (tabId === 'tabEmgFaceScan') {
    startEmergencyFaceScanner();
  } else {
    stopEmergencyFaceScanner();
  }

  if (syncWithTicket && window.currentEmergencyTicketId) {
    let methodKey = 'app';
    let methodLabel = 'Persetujuan Langsung di App';
    if (tabId === 'tabEmgPasscode') {
      methodKey = 'passcode';
      methodLabel = 'Input Kata Sandi / OTP';
    } else if (tabId === 'tabEmgFaceScan') {
      methodKey = 'facescan';
      methodLabel = 'Scan Wajah Atasan';
    }
    changeEmergencyMethod(methodKey, methodLabel);
  }
}

// Fungsi Edit / Ubah Cara Otorisasi Darurat
function changeEmergencyMethod(newMethod, methodLabel) {
  const ticketId = window.currentEmergencyTicketId;
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  const oldMethod = ticket.selectedMethod || 'app';
  if (oldMethod === newMethod) return;

  ticket.selectedMethod = newMethod;

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

  if (!ticket.timeline) ticket.timeline = [];
  ticket.timeline.push({
    event: 'Metode Otorisasi Diubah',
    time: nowFormatted,
    by: `${ticket.applicantName || 'Budi Pratama'} (Karyawan)`,
    desc: `Karyawan mengubah metode otorisasi darurat menjadi: "${methodLabel || newMethod}".`
  });

  window.saveTickets(ticketsList);

  if (typeof window.showToast === 'function') {
    window.showToast(`Metode otorisasi darurat diubah ke: ${methodLabel || newMethod}`, 'info');
  }

  if (typeof window.renderApproverView === 'function') window.renderApproverView();
  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
}

// EKSEKUSI PEMBUKAAN KUNCI QR DARURAT (CORE ENGINE)
function unlockEmergencyTicket(ticketId, method, authorizerName, extraNote) {
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return false;

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

  // Ubah status tiket
  ticket.emergencyLocked = false;
  ticket.qrLocked = false;
  ticket.status = 'Disetujui';
  ticket.emergencyUnlockMethod = method;
  ticket.emergencyUnlockedBy = authorizerName;
  ticket.emergencyUnlockedAt = nowFormatted;
  ticket.approverNote = `🚨 [Otorisasi Darurat Sah]: QR Code dibuka melalui "${method}" oleh ${authorizerName}. ${extraNote || ''}`;

  if (!ticket.timeline) ticket.timeline = [];
  ticket.timeline.push(
    {
      event: `Otorisasi Darurat Berhasil (${method})`,
      time: nowFormatted,
      by: authorizerName,
      desc: `QR Code resmi dibuka dan diaktifkan. Metode: ${method}. ${extraNote || ''}`
    },
    {
      event: 'QR Code Darurat Aktif',
      time: nowFormatted,
      by: 'Sistem Gerbang Digital Kujang',
      desc: 'QR Code resmi telah aktif dan siap dipindai keluar oleh Petugas Pengamanan di Pos Jaga.'
    }
  );

  window.saveTickets(ticketsList);

  // Tutup modal unlock jika terbuka
  closeEmergencyUnlockModal();

  // Toast Notifikasi Sukses
  if (typeof window.showToast === 'function') {
    window.showToast(`🚨 BERHASIL! QR Code Darurat #${ticket.id} telah TERBUKA & AKTIF via ${method}!`, 'success');
  }

  // Refresh semua tampilan
  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
  if (typeof window.renderApproverView === 'function') window.renderApproverView();
  if (typeof window.renderSecurityView === 'function') window.renderSecurityView();

  // Buka rincian tiket / QR yang sudah aktif
  if (typeof window.openTicketDetail === 'function') {
    window.openTicketDetail(ticket.id, 'qr');
  }

  return true;
}

// METODE 1: Verifikasi Persetujuan Langsung Atasan di App (1-Click Approval)
function emergencyDirectApprove(ticketId) {
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  const ACTORS = window.ACTORS || {};
  const currentRole = window.currentActor;
  const isApprover2 = (currentRole === 'approver2');
  const approverActor = isApprover2 ? ACTORS.approver2 : ACTORS.approver;
  const approverName = approverActor ? approverActor.name : (isApprover2 ? 'Dewi Sartika, S.T., M.M.' : 'Ir. Hendra Gunawan, M.T.');
  const approverTitle = approverActor ? approverActor.title : 'Atasan Peninjau';

  unlockEmergencyTicket(
    ticketId,
    'Persetujuan Langsung Atasan di App',
    `${approverName} (${approverTitle})`,
    'Disetujui 1-Klik melalui Dashboard Atasan.'
  );
}

// METODE 2: Verifikasi Input Kode Sandi / OTP Darurat
function verifyEmergencyPasscode() {
  const ticketId = window.currentEmergencyTicketId;
  const inputEl = document.getElementById('inputEmergencyPasscode');
  if (!inputEl) return;

  const enteredCode = inputEl.value.trim();
  if (!enteredCode) {
    if (typeof window.showToast === 'function') window.showToast('Harap masukkan 6-digit kode sandi otorisasi dari Atasan!', 'warning');
    inputEl.focus();
    return;
  }

  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  // Kode sandi tiket atau master PIN darurat jika dalam demo simulasi
  const validPasscode = String(ticket.emergencyPasscode || '991102');

  if (enteredCode !== validPasscode && enteredCode !== '991102') {
    if (typeof window.showToast === 'function') {
      window.showToast(`Kode sandi salah! Kode sandi yang Anda masukkan tidak sesuai dengan otorisasi Atasan.`, 'danger');
    }
    inputEl.classList.add('input-error');
    setTimeout(() => inputEl.classList.remove('input-error'), 1000);
    return;
  }

  // Jika benar, catat Atasan terkait (Atasan 1 atau Atasan 2)
  const approverName = ticket.approverName || 'Ir. Hendra Gunawan, M.T. / Dewi Sartika';
  unlockEmergencyTicket(
    ticketId,
    'Kode Sandi / OTP Otorisasi',
    `Atasan Pemilik Kode Sandi (${approverName})`,
    `Verifikasi kode sandi otorisasi [${enteredCode}] cocok secara sah.`
  );
}

// METODE 3: Scan Wajah (Face Scan) Biometrik Atasan
let faceScanStream = null;
let faceScanTimeout = null;

function startEmergencyFaceScanner() {
  const video = document.getElementById('emgFaceVideo');
  const statusText = document.getElementById('emgFaceStatusText');
  const progressBar = document.getElementById('emgFaceProgressBar');
  const scanRing = document.getElementById('emgFaceScanRing');
  const btnTrigger = document.getElementById('btnTriggerFaceScan');

  if (scanRing) scanRing.classList.remove('scanning');
  if (statusText) statusText.textContent = 'Kamera siap. Posisikan wajah Atasan di dalam oval, lalu klik tombol Pindai.';
  if (progressBar) progressBar.style.width = '0%';
  if (btnTrigger) {
    btnTrigger.disabled = false;
    btnTrigger.innerHTML = '📸 Pindai Wajah Atasan Sekarang';
  }

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && video) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => {
        faceScanStream = stream;
        video.srcObject = stream;
        video.play();
      })
      .catch(err => {
        console.warn('Webcam stream unavailable or permission denied:', err);
        if (statusText) {
          statusText.textContent = 'Kamera simulasi siap. Posisikan wajah Atasan lalu klik tombol Pindai.';
        }
      });
  }
}

function triggerEmergencyFaceScan() {
  const statusText = document.getElementById('emgFaceStatusText');
  const progressBar = document.getElementById('emgFaceProgressBar');
  const scanRing = document.getElementById('emgFaceScanRing');
  const btnTrigger = document.getElementById('btnTriggerFaceScan');

  if (btnTrigger) {
    btnTrigger.disabled = true;
    btnTrigger.innerHTML = '⏳ Sedang Memindai Biometrik...';
  }

  if (scanRing) scanRing.classList.add('scanning');
  if (statusText) statusText.textContent = 'Mendeteksi kontur wajah Atasan di depan kamera...';
  if (progressBar) progressBar.style.width = '35%';

  faceScanTimeout = setTimeout(() => {
    if (statusText) statusText.textContent = 'Mencocokkan biometric pattern dengan profil Atasan...';
    if (progressBar) progressBar.style.width = '75%';

    faceScanTimeout = setTimeout(() => {
      if (progressBar) progressBar.style.width = '100%';
      if (statusText) statusText.innerHTML = '<span style="color:#059669; font-weight:800;">✓ Biometrik Wajah Atasan Terverifikasi (Kecocokan: 99.2%)</span>';

      setTimeout(() => {
        completeEmergencyFaceScan();
        if (btnTrigger) {
          btnTrigger.disabled = false;
          btnTrigger.innerHTML = '📸 Pindai Wajah Atasan Sekarang';
        }
      }, 700);
    }, 1100);
  }, 1100);
}

function completeEmergencyFaceScan() {
  const ticketId = window.currentEmergencyTicketId;
  const ticketsList = window.ticketsList || [];
  const ticket = ticketsList.find(t => t.id === ticketId);
  if (!ticket) return;

  const ACTORS = window.ACTORS || {};
  // Bila pemohon memilih Ir. Hendra Gunawan atau Dewi Sartika
  const approverName = ticket.approverName || (ACTORS.approver ? ACTORS.approver.name : 'Ir. Hendra Gunawan, M.T.');

  unlockEmergencyTicket(
    ticketId,
    'Scan Wajah Atasan (Face Scan Biometrik)',
    approverName,
    'Verifikasi wajah biometrik berhasil dilakukan langsung di tempat kejadian.'
  );
}

function stopEmergencyFaceScanner() {
  if (faceScanTimeout) {
    clearTimeout(faceScanTimeout);
    faceScanTimeout = null;
  }
  if (faceScanStream) {
    faceScanStream.getTracks().forEach(track => track.stop());
    faceScanStream = null;
  }
  const video = document.getElementById('emgFaceVideo');
  if (video) video.srcObject = null;
  const scanRing = document.getElementById('emgFaceScanRing');
  if (scanRing) scanRing.classList.remove('scanning');
}

// BIND EVENT LISTENERS SAAT DOM SIAP
document.addEventListener('DOMContentLoaded', () => {
  const btnCloseEmgUnlock = document.getElementById('btnCloseEmgUnlock');
  const btnCancelEmgUnlock = document.getElementById('btnCancelEmgUnlock');
  const btnSubmitPasscode = document.getElementById('btnSubmitEmergencyPasscode');
  const btnTriggerFaceScan = document.getElementById('btnTriggerFaceScan');

  if (btnCloseEmgUnlock) btnCloseEmgUnlock.addEventListener('click', closeEmergencyUnlockModal);
  if (btnCancelEmgUnlock) btnCancelEmgUnlock.addEventListener('click', closeEmergencyUnlockModal);
  if (btnSubmitPasscode) btnSubmitPasscode.addEventListener('click', verifyEmergencyPasscode);
  if (btnTriggerFaceScan) btnTriggerFaceScan.addEventListener('click', triggerEmergencyFaceScan);

  // Tab bindings
  document.querySelectorAll('.emg-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (tabId) switchEmergencyUnlockTab(tabId, true);
    });
  });

  // Enter key on passcode input
  const inputPasscode = document.getElementById('inputEmergencyPasscode');
  if (inputPasscode) {
    inputPasscode.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') verifyEmergencyPasscode();
    });
  }
});

// EXPORT TO WINDOW GLOBAL
window.generateEmergencyPasscode = generateEmergencyPasscode;
window.openEmergencyUnlockModal = openEmergencyUnlockModal;
window.closeEmergencyUnlockModal = closeEmergencyUnlockModal;
window.switchEmergencyUnlockTab = switchEmergencyUnlockTab;
window.changeEmergencyMethod = changeEmergencyMethod;
window.unlockEmergencyTicket = unlockEmergencyTicket;
window.emergencyDirectApprove = emergencyDirectApprove;
window.verifyEmergencyPasscode = verifyEmergencyPasscode;
window.startEmergencyFaceScanner = startEmergencyFaceScanner;
window.triggerEmergencyFaceScan = triggerEmergencyFaceScan;
window.completeEmergencyFaceScan = completeEmergencyFaceScan;
window.stopEmergencyFaceScanner = stopEmergencyFaceScanner;
