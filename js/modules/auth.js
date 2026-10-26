/**
 * AUTH MODULE - KUJANG ID (PT PUPUK KUJANG)
 * Menangani simulasi autentikasi multi-faktor (Kujang ID -> OTP WA -> Multi-Actor Dashboard)
 */

(function () {
  'use strict';

  // State Auth
  let selectedMethod = 'identik'; // 'identik' | 'ess' | 'dof'
  let pendingAccount = null;
  let generatedOtp = '884120';
  let waNotificationTimeout = null;

  /**
   * Ambil data user yang sedang login di tab ini
   */
  window.getKujangCurrentUser = function () {
    try {
      const stored = sessionStorage.getItem('kujang_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  };

  /**
   * Set user login di tab ini
   */
  window.setKujangCurrentUser = function (user) {
    if (!user) {
      sessionStorage.removeItem('kujang_current_user');
    } else {
      sessionStorage.setItem('kujang_current_user', JSON.stringify(user));
    }
  };

  /**
   * Buka Step Metode Login
   */
  window.showKujangMethodStep = function () {
    const overlay = document.getElementById('kujangAuthOverlay');
    if (!overlay) return;

    updateStepper(1);
    document.getElementById('kujangStepMethods').style.display = 'block';
    document.getElementById('kujangStepLoginForm').style.display = 'none';
    document.getElementById('kujangStepOtp').style.display = 'none';
  };

  /**
   * Pilih metode login (Identik / ESS / DOF)
   */
  window.selectKujangMethod = function (methodKey) {
    selectedMethod = methodKey;
    const titles = {
      identik: 'Identik / PI Smart',
      ess: 'ESS (Employee Self Service)',
      dof: 'DOF (Digital Office)'
    };

    updateStepper(1);
    document.getElementById('kujangStepMethods').style.display = 'none';
    document.getElementById('kujangStepLoginForm').style.display = 'block';
    document.getElementById('kujangStepOtp').style.display = 'none';

    const lbl = document.getElementById('kujangSelectedMethodTitle');
    if (lbl) lbl.textContent = titles[methodKey] || 'Akun Kujang ID';

    const inputUser = document.getElementById('kujangInputUser');
    const inputPass = document.getElementById('kujangInputPass');
    const errEl = document.getElementById('kujangLoginError');
    if (errEl) errEl.style.display = 'none';
    if (inputUser) {
      inputUser.value = '';
      setTimeout(() => inputUser.focus(), 150);
    }
    if (inputPass) inputPass.value = '';
  };

  /**
   * Helper pilih akun cepat (Auto-Fill untuk demo pengujian)
   */
  window.kujangQuickFill = function (roleKey) {
    const acc = (window.KUJANG_ACCOUNTS || []).find(a => a.role === roleKey || a.username === roleKey);
    if (!acc) return;

    // Pastikan berada di step form login
    if (document.getElementById('kujangStepMethods').style.display !== 'none') {
      window.selectKujangMethod('identik');
    }

    const inputUser = document.getElementById('kujangInputUser');
    const inputPass = document.getElementById('kujangInputPass');
    if (inputUser) inputUser.value = acc.username;
    if (inputPass) inputPass.value = acc.password;

    const errEl = document.getElementById('kujangLoginError');
    if (errEl) errEl.style.display = 'none';
  };

  /**
   * Submit Form Login -> Lanjut ke Verifikasi OTP WhatsApp
   */
  window.handleKujangLoginSubmit = function (e) {
    if (e && e.preventDefault) e.preventDefault();

    const inputUser = document.getElementById('kujangInputUser');
    const inputPass = document.getElementById('kujangInputPass');
    const errEl = document.getElementById('kujangLoginError');

    const usernameVal = (inputUser ? inputUser.value : '').trim();
    const passwordVal = (inputPass ? inputPass.value : '').trim();

    if (!usernameVal || !passwordVal) {
      if (errEl) {
        errEl.textContent = 'Mohon masukkan username/email dan kata sandi Anda.';
        errEl.style.display = 'block';
      }
      return;
    }

    const acc = window.findKujangAccount(usernameVal);
    if (!acc || acc.password !== passwordVal) {
      if (errEl) {
        errEl.textContent = 'Username atau kata sandi tidak valid. Cek petunjuk demo akun.';
        errEl.style.display = 'block';
      }
      return;
    }

    // Akun valid -> lanjut ke OTP
    pendingAccount = acc;
    if (errEl) errEl.style.display = 'none';
    goToOtpStep(acc);
  };

  /**
   * Berpindah ke Step OTP dan Tampilkan Simulasi Notifikasi WA
   */
  function goToOtpStep(acc) {
    updateStepper(2);
    document.getElementById('kujangStepMethods').style.display = 'none';
    document.getElementById('kujangStepLoginForm').style.display = 'none';
    document.getElementById('kujangStepOtp').style.display = 'block';

    // Mask phone number: 0812-8841-0001 -> +62 812-****-0001
    const rawPhone = acc.phone || '0812-3456-7890';
    const maskedPhone = rawPhone.replace(/(\d{4})-(\d{4})-(\d{4})/, '+62 $1-****-$3');
    const phoneEl = document.getElementById('kujangOtpTargetPhone');
    if (phoneEl) phoneEl.textContent = maskedPhone;

    // Generate kode OTP 6-digit (random atau konsisten demo)
    generatedOtp = String(Math.floor(100000 + Math.random() * 900000));

    // Reset input kotak digit
    const otpInputs = document.querySelectorAll('.kujang-otp-digit');
    otpInputs.forEach((inp, idx) => {
      inp.value = '';
      if (idx === 0) setTimeout(() => inp.focus(), 200);
    });

    const otpErr = document.getElementById('kujangOtpError');
    if (otpErr) otpErr.style.display = 'none';

    // Tampilkan Floating Notifikasi WhatsApp Simulasi di pojok kanan atas
    showWhatsAppNotification(acc, generatedOtp);
  }

  /**
   * Tampilkan Notifikasi Simulasi Pesan WhatsApp
   */
  function showWhatsAppNotification(acc, otpCode) {
    if (waNotificationTimeout) clearTimeout(waNotificationTimeout);

    let popup = document.getElementById('kujangWaPopup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'kujangWaPopup';
      popup.className = 'kujang-wa-popup';
      document.body.appendChild(popup);
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    popup.innerHTML = `
      <div class="kujang-wa-header">
        <div class="kujang-wa-badge">
          <span>💬 WhatsApp • KUJANG OTP</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="kujang-wa-time">${timeStr}</span>
          <button type="button" onclick="document.getElementById('kujangWaPopup').style.display='none'" style="background: none; border: none; font-size: 1.15rem; color: #94a3b8; cursor: pointer; line-height: 1; padding: 0 2px;" title="Tutup">×</button>
        </div>
      </div>
      <div class="kujang-wa-body">
        Halo <strong>${acc.name.split(',')[0]}</strong>, kode verifikasi login KUJANG ID Anda:
        <div class="kujang-wa-otp-code">${otpCode}</div>
        <div style="font-size: 0.725rem; color: #64748b;">Berlaku 5 menit. JANGAN bagikan kode ini kepada siapa pun.</div>
      </div>
      <button class="kujang-wa-action-btn" onclick="window.kujangFillOtp('${otpCode}')">
        ✓ Gunakan Kode Ini Otomatis
      </button>
    `;
    popup.style.display = 'block';

    // Auto sembunyikan setelah 18 detik
    waNotificationTimeout = setTimeout(() => {
      if (popup) popup.style.display = 'none';
    }, 18000);
  }

  /**
   * Helper Klik 1x untuk mengisi OTP dari Notifikasi WA
   */
  window.kujangFillOtp = function (otpCode) {
    const code = String(otpCode || generatedOtp);
    const otpInputs = document.querySelectorAll('.kujang-otp-digit');
    otpInputs.forEach((inp, idx) => {
      inp.value = code[idx] || '';
    });

    // Otomatis verifikasi
    setTimeout(() => {
      window.handleKujangOtpVerify();
    }, 250);
  };

  /**
   * Verifikasi OTP
   */
  window.handleKujangOtpVerify = function () {
    const otpInputs = document.querySelectorAll('.kujang-otp-digit');
    let enteredOtp = '';
    otpInputs.forEach(inp => enteredOtp += inp.value);

    const otpErr = document.getElementById('kujangOtpError');

    if (enteredOtp.length < 6) {
      if (otpErr) {
        otpErr.textContent = 'Mohon masukkan 6 digit kode OTP secara lengkap.';
        otpErr.style.display = 'block';
      }
      return;
    }

    if (enteredOtp !== generatedOtp && enteredOtp !== '884120' && enteredOtp !== '123456') {
      if (otpErr) {
        otpErr.textContent = 'Kode OTP salah. Silakan periksa kembali pesan WhatsApp Anda.';
        otpErr.style.display = 'block';
      }
      return;
    }

    // OTP Valid -> Masuk SAKTI
    if (otpErr) otpErr.style.display = 'none';
    updateStepper(3);

    // Sembunyikan notifikasi WA
    const popup = document.getElementById('kujangWaPopup');
    if (popup) popup.style.display = 'none';

    // Simpan user login di sessionStorage tab ini
    window.setKujangCurrentUser(pendingAccount);

    // Tampilkan animasi sukses singkat
    const btnVerify = document.getElementById('btnKujangVerifyOtp');
    if (btnVerify) {
      btnVerify.innerHTML = `<span>✓ Berhasil! Membuka SAKTI...</span>`;
      btnVerify.style.background = '#059669';
    }

    setTimeout(() => {
      completeLogin(pendingAccount);
    }, 450);
  };

  /**
   * Mengaktifkan peran aplikasi
   */
  function activateAppRole(role) {
    if (typeof window.switchRole === 'function') {
      window.switchRole(role);
    } else if (typeof window.setRole === 'function') {
      window.setRole(role);
    }
  }

  /**
   * Selesaikan Login: Buka SAKTI sesuai Role Aktor
   */
  function completeLogin(account) {
    const overlay = document.getElementById('kujangAuthOverlay');
    if (overlay) overlay.style.display = 'none';

    // Set role bawaan aplikasi (karyawan, approver, approver2, security, admin)
    activateAppRole(account.role);

    // Update profil akun di topbar/sidebar aplikasi
    updateAppUserBadge(account);

    if (typeof window.showToast === 'function') {
      window.showToast(`Selamat datang, ${account.name} (${account.roleLabel})`, 'success');
    }
  }

  /**
   * Logout Kujang ID
   */
  window.kujangLogout = function () {
    window.setKujangCurrentUser(null);
    pendingAccount = null;

    // Reset tombol verify
    const btnVerify = document.getElementById('btnKujangVerifyOtp');
    if (btnVerify) {
      btnVerify.innerHTML = `<span>Verifikasi & Masuk SAKTI</span>`;
    }

    // Tampilkan kembali Kujang ID overlay
    const overlay = document.getElementById('kujangAuthOverlay');
    if (overlay) overlay.style.display = 'flex';

    window.showKujangMethodStep();

    if (typeof window.showToast === 'function') {
      window.showToast('Anda telah keluar dari akun KUJANG ID.', 'info');
    }
  };

  /**
   * Update tampilan stepper bar di header Kujang ID
   */
  function updateStepper(stepNum) {
    const step1 = document.getElementById('kujangStepItem1');
    const step2 = document.getElementById('kujangStepItem2');
    const step3 = document.getElementById('kujangStepItem3');

    if (!step1 || !step2 || !step3) return;

    step1.className = 'kujang-step-item' + (stepNum === 1 ? ' active' : (stepNum > 1 ? ' completed' : ''));
    step2.className = 'kujang-step-item' + (stepNum === 2 ? ' active' : (stepNum > 2 ? ' completed' : ''));
    step3.className = 'kujang-step-item' + (stepNum === 3 ? ' active' : '');
  }

  /**
   * Update Badge Pengguna Aktif di Topbar / Header Sistem
   */
  function updateAppUserBadge(account) {
    const badgeName = document.getElementById('topbarUserName');
    const badgeRole = document.getElementById('topbarUserRole');
    const badgeAvatar = document.getElementById('topbarUserAvatar');

    if (badgeName) badgeName.textContent = account.name;
    if (badgeRole) badgeRole.textContent = `${account.roleLabel} • NIP ${account.nip}`;
    if (badgeAvatar) badgeAvatar.textContent = account.avatar || '👤';
  }

  /**
   * Inisialisasi saat DOM siap
   */
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Cek apakah tab ini sudah memiliki sesi login di sessionStorage
    const currentUser = window.getKujangCurrentUser();
    const overlay = document.getElementById('kujangAuthOverlay');

    if (currentUser) {
      // Tab ini sudah login -> langsung masuk ke role-nya
      if (overlay) overlay.style.display = 'none';
      activateAppRole(currentUser.role);
      updateAppUserBadge(currentUser);
    } else {
      // Tab ini belum login -> tampilkan Kujang ID
      if (overlay) overlay.style.display = 'flex';
      window.showKujangMethodStep();
    }

    // 2. Setup event listener keyboard pada 6 kotak input OTP
    const otpInputs = document.querySelectorAll('.kujang-otp-digit');
    otpInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = val;
        if (val && index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
          otpInputs[index - 1].focus();
        } else if (e.key === 'Enter') {
          window.handleKujangOtpVerify();
        }
      });

      // Handle paste 6-digit langsung
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text').trim().replace(/[^0-9]/g, '');
        if (pasted) {
          window.kujangFillOtp(pasted);
        }
      });
    });

    // 3. Setup toggle accordion demo mockup
    const demoToggle = document.getElementById('kujangDemoToggle');
    const demoContent = document.getElementById('kujangDemoContent');
    if (demoToggle && demoContent) {
      demoToggle.addEventListener('click', () => {
        const isHidden = demoContent.style.display === 'none' || !demoContent.style.display;
        demoContent.style.display = isHidden ? 'block' : 'none';
        demoToggle.querySelector('.kujang-accordion-arrow').textContent = isHidden ? '▼' : '▶';
      });
    }

    // 4. MULTI-TAB SYNC: Saat tab lain mengubah data tiket di localStorage,
    // re-render view tab ini secara real-time tanpa refresh!
    window.addEventListener('storage', (e) => {
      if (e.key === 'ticketsList' || e.key === 'empTickets') {
        const activeUser = window.getKujangCurrentUser();
        if (!activeUser) return;

        // Muat ulang data tiket ke memori window
        if (typeof window.loadTickets === 'function') {
          window.ticketsList = window.loadTickets();
        }

        // Re-render sesuai peran tab ini
        if (activeUser.role === 'karyawan' && typeof window.renderKaryawanView === 'function') {
          window.renderKaryawanView();
        } else if (activeUser.role === 'approver' && typeof window.renderApproverView === 'function') {
          window.renderApproverView();
        } else if (activeUser.role === 'security' && typeof window.renderSecurityView === 'function') {
          window.renderSecurityView();
        } else if (activeUser.role === 'admin' && typeof window.renderAdminView === 'function') {
          window.renderAdminView();
        }
      }
    });
  });

})();
