/**
 * SISTEM PERIZINAN KELUAR AREA - PT PUPUK KUJANG CIKAMPEK
 * MODULE: MOBILE APP ORCHESTRATOR & ROUTER
 * Manages active actor, top bar, dynamic bottom navigation, and subpages
 */

(function () {
  'use strict';

  let currentMobileRole = 'karyawan'; // 'karyawan' | 'approver' | 'approver2' | 'security'
  let currentMobileTab = 'dashboard';

  // -------------------------------------------------------------------
  // 1. INITIALIZATION & SYNC
  // -------------------------------------------------------------------
  function initMobileApp() {
    // Detect if desktop switched role (Mobile only supports Karyawan, Atasan 1, Atasan 2, Pos Jaga)
    if (window.currentActor && ['karyawan', 'karyawan2', 'approver', 'approver2', 'security'].includes(window.currentActor)) {
      currentMobileRole = window.currentActor;
    } else {
      currentMobileRole = 'karyawan';
    }

    renderMobileShell();
    renderActiveView();

    // Hook to refresh on ticket updates
    const origSave = window.saveTickets;
    if (typeof origSave === 'function' && !window._mobileSaveHooked) {
      window._mobileSaveHooked = true;
      window.saveTickets = function (data) {
        origSave.apply(this, arguments);
        renderActiveView();
      };
    }

    // Hook desktop view updates to keep mobile in sync
    ['renderKaryawanView', 'renderApproverView', 'renderSecurityView'].forEach(fnName => {
      const orig = window[fnName];
      if (typeof orig === 'function' && !window['_mobileHooked_' + fnName]) {
        window['_mobileHooked_' + fnName] = true;
        window[fnName] = function () {
          orig.apply(this, arguments);
          renderActiveView();
        };
      }
    });
  }

  // -------------------------------------------------------------------
  // 2. RENDER MOBILE SHELL (TOP BAR + BOTTOM NAV)
  // -------------------------------------------------------------------
  function renderMobileShell() {
    updateTopBar();
    renderBottomNav();
    updateFloatingRolePill();
    if (typeof window.updateNotificationBadges === 'function') {
      window.updateNotificationBadges();
    }
  }

  function updateTopBar() {
    const subEl = document.getElementById('mobileBrandSub');
    const avatarEl = document.getElementById('mobileUserAvatar');
    if (!subEl || !avatarEl) return;

    if (currentMobileRole === 'karyawan') {
      subEl.textContent = 'Perizinan Keluar Area';
      avatarEl.textContent = 'BP';
      avatarEl.style.background = '#ecfdf5';
      avatarEl.style.color = '#047857';
      avatarEl.style.borderColor = '#a7f3d0';
      avatarEl.title = 'Budi Pratama (Karyawan) — Klik untuk ganti peran';
    } else if (currentMobileRole === 'karyawan2') {
      subEl.textContent = 'Perizinan Keluar Area • Karyawan 2';
      avatarEl.textContent = 'AM';
      avatarEl.style.background = '#ccfbf1';
      avatarEl.style.color = '#0f766e';
      avatarEl.style.borderColor = '#99f6e4';
      avatarEl.title = 'Arthur Morgan (Karyawan 2) — Klik untuk ganti peran';
    } else if (currentMobileRole === 'approver') {
      subEl.textContent = 'Perizinan Keluar Area • Atasan 1';
      avatarEl.textContent = 'HG';
      avatarEl.style.background = '#fef3c7';
      avatarEl.style.color = '#b45309';
      avatarEl.style.borderColor = '#fde68a';
      avatarEl.title = 'Ir. Hendra Gunawan (Atasan 1) — Klik untuk ganti peran';
    } else if (currentMobileRole === 'approver2') {
      subEl.textContent = 'Perizinan Keluar Area • Atasan 2';
      avatarEl.textContent = 'DS';
      avatarEl.style.background = '#e0e7ff';
      avatarEl.style.color = '#3730a3';
      avatarEl.style.borderColor = '#c7d2fe';
      avatarEl.title = 'Dewi Sartika (Atasan 2) — Klik untuk ganti peran';
    } else if (currentMobileRole === 'security') {
      subEl.textContent = 'Perizinan Keluar Area • Pos Jaga';
      avatarEl.textContent = 'SA';
      avatarEl.style.background = '#e0f2fe';
      avatarEl.style.color = '#0369a1';
      avatarEl.style.borderColor = '#bae6fd';
      avatarEl.title = 'Sertu Agus (Pos Jaga) — Klik untuk ganti peran';
    }
  }

  function renderBottomNav() {
    const navEl = document.getElementById('mobileBottomNav');
    if (!navEl) return;

    if (currentMobileRole === 'karyawan' || currentMobileRole === 'karyawan2') {
      navEl.innerHTML = `
        <div class="mobile-bottom-nav-item ${currentMobileTab === 'dashboard' ? 'active' : ''}" onclick="window.mobileSwitchTab('dashboard')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          <span>Dashboard</span>
        </div>
        <div class="mobile-bottom-nav-item ${currentMobileTab === 'pengajuan' ? 'active' : ''}" onclick="window.mobileSwitchTab('pengajuan')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span>Pengajuan</span>
        </div>
        <div class="mobile-bottom-nav-item ${currentMobileTab === 'riwayat' ? 'active' : ''}" onclick="window.mobileSwitchTab('riwayat')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span>Riwayat</span>
        </div>
      `;
    } else if (currentMobileRole === 'approver' || currentMobileRole === 'approver2') {
      const tickets = window.ticketsList || [];
      const pendingCount = tickets.filter(t => t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat').length;

      navEl.innerHTML = `
        <div class="mobile-bottom-nav-item ${currentMobileTab === 'dashboard' ? 'active' : ''}" onclick="window.mobileSwitchTab('dashboard')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          <span>Dashboard</span>
        </div>
        <div class="mobile-bottom-nav-item ${currentMobileTab === 'antrean' ? 'active' : ''}" onclick="window.mobileSwitchTab('antrean')" style="position:relative;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
          <span>Antrean</span>
          ${pendingCount > 0 ? `<span class="mobile-nav-badge">${pendingCount}</span>` : ''}
        </div>
        <div class="mobile-bottom-nav-item ${currentMobileTab === 'pelacakan' || currentMobileTab === 'tim' ? 'active' : ''}" onclick="window.mobileSwitchTab('tim')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
          <span>Pelacakan</span>
        </div>
      `;
    } else if (currentMobileRole === 'security') {
      navEl.innerHTML = `
        <div class="mobile-bottom-nav-item ${currentMobileTab === 'dashboard' ? 'active' : ''}" onclick="window.mobileSwitchTab('dashboard')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          <span>Dashboard</span>
        </div>
        <div class="mobile-bottom-nav-item ${currentMobileTab === 'scanner' ? 'active' : ''}" onclick="window.mobileSwitchTab('scanner')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="8" y1="12" x2="16" y2="12"></line><line x1="12" y1="8" x2="12" y2="16"></line></svg>
          <span>Pindai</span>
        </div>
        <div class="mobile-bottom-nav-item ${currentMobileTab === 'pelacakan' ? 'active' : ''}" onclick="window.mobileSwitchTab('pelacakan')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <span>Pelacakan</span>
        </div>
        <div class="mobile-bottom-nav-item ${currentMobileTab === 'riwayat' ? 'active' : ''}" onclick="window.mobileSwitchTab('riwayat')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span>Riwayat</span>
        </div>
      `;
    }
  }

  function updateFloatingRolePill() {
    const label = document.getElementById('mobileRoleActiveLabel');
    const headerLabel = document.getElementById('mobileRoleHeaderLabel');
    let text = 'Karyawan';
    if (currentMobileRole === 'karyawan') text = 'Karyawan';
    else if (currentMobileRole === 'approver') text = 'Atasan 1';
    else if (currentMobileRole === 'approver2') text = 'Atasan 2';
    else if (currentMobileRole === 'security') text = 'Pos Jaga';
    else if (currentMobileRole === 'admin') text = 'Admin K3';

    if (label) label.textContent = text;
    if (headerLabel) headerLabel.textContent = text;
  }

  // -------------------------------------------------------------------
  // 3. RENDER ACTIVE VIEW
  // -------------------------------------------------------------------
  function renderActiveView() {
    const container = document.getElementById('mobileMainContent');
    if (!container) return;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (currentMobileRole === 'karyawan' || currentMobileRole === 'karyawan2') {
      if (typeof window.renderMobileKaryawan === 'function') {
        window.renderMobileKaryawan(container, currentMobileTab);
      }
    } else if (currentMobileRole === 'approver' || currentMobileRole === 'approver2') {
      if (typeof window.renderMobileAtasan === 'function') {
        window.renderMobileAtasan(container, currentMobileTab);
      }
    } else if (currentMobileRole === 'security') {
      if (typeof window.renderMobileSecurity === 'function') {
        window.renderMobileSecurity(container, currentMobileTab);
      }
    } else if (currentMobileRole === 'admin') {
      renderMobileAdmin(container, currentMobileTab);
    }

    renderBottomNav();
  }

  // -------------------------------------------------------------------
  // 3.1 RENDER MOBILE ADMIN VIEW
  // -------------------------------------------------------------------
  function renderMobileAdmin(container, tab) {
    const accounts = window.KUJANG_ACCOUNTS || [];
    const tickets = window.ticketsList || [];

    if (tab === 'users') {
      const userListHtml = accounts.map(acc => `
        <div class="mobile-card" style="margin-bottom: 10px; padding: 12px 14px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="display: flex; gap: 10px; align-items: center;">
              <div style="width: 38px; height: 38px; border-radius: 8px; background: ${acc.badgeColor}15; color: ${acc.badgeColor}; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                ${acc.avatar}
              </div>
              <div>
                <div style="font-size: 0.825rem; font-weight: 800; color: #0f172a;">${acc.name}</div>
                <div style="font-size: 0.7rem; color: #64748b;">${acc.nip} • ${acc.title}</div>
              </div>
            </div>
            <span class="mobile-badge disetujui" style="background:${acc.badgeColor}15; color:${acc.badgeColor}; font-size: 0.65rem;">
              ${acc.roleLabel.split(' ')[0]}
            </span>
          </div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9; font-size: 0.725rem; color: #475569; display: flex; justify-content: space-between;">
            <span>${acc.department}</span>
            <span style="color: #059669; font-weight: 700;">● Aktif SSO</span>
          </div>
        </div>
      `).join('');

      container.innerHTML = `
        <div class="mobile-page-header">
          <div class="mobile-page-category-tag">Manajemen Akses</div>
          <h1 class="mobile-page-title">Hak Akses & Pengguna</h1>
          <p class="mobile-page-subtitle">Daftar akun berwenang dalam sistem perizinan keluar area PT Pupuk Kujang.</p>
        </div>
        ${userListHtml}
      `;
      return;
    }

    if (tab === 'riwayat') {
      container.innerHTML = `
        <div class="mobile-page-header">
          <div class="mobile-page-category-tag">Keamanan Sistem</div>
          <h1 class="mobile-page-title">Audit Trail & Log Akses</h1>
          <p class="mobile-page-subtitle">Catatan rekam jejak aktivitas otorisasi dan gerbang pabrik.</p>
        </div>

        <div class="mobile-card" style="padding: 14px;">
          <div style="display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9;">
            <div style="background:#ecfdf5; color:#059669; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:800;">✓</div>
            <div style="flex:1;">
              <div style="font-size: 0.775rem; font-weight: 800; color: #0f172a;">Otorisasi Izin Darurat Disetujui</div>
              <div style="font-size: 0.7rem; color: #64748b;">Ir. Hendra Gunawan menyetujui izin Arif Maulana (IZ-20261002-001)</div>
              <div style="font-size: 0.65rem; color: #94a3b8; margin-top: 2px;">Hari ini • 10.45 WIB</div>
            </div>
          </div>

          <div style="display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9;">
            <div style="background:#e0f2fe; color:#0284c7; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:800;">🚪</div>
            <div style="flex:1;">
              <div style="font-size: 0.775rem; font-weight: 800; color: #0f172a;">Verifikasi Gerbang Keluar (Scan Out)</div>
              <div style="font-size: 0.7rem; color: #64748b;">Pos 1 Utama memverifikasi keberangkatan tugas dinas</div>
              <div style="font-size: 0.65rem; color: #94a3b8; margin-top: 2px;">Hari ini • 10.15 WIB</div>
            </div>
          </div>

          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <div style="background:#f5f3ff; color:#7c3aed; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:800;">🔑</div>
            <div style="flex:1;">
              <div style="font-size: 0.775rem; font-weight: 800; color: #0f172a;">Login Single Sign-On KUJANG ID</div>
              <div style="font-size: 0.7rem; color: #64748b;">Autentikasi 2FA OTP berhasil diverifikasi via Identik PI Smart</div>
              <div style="font-size: 0.65rem; color: #94a3b8; margin-top: 2px;">Hari ini • 07.45 WIB</div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Default: Dashboard Admin
    container.innerHTML = `
      <!-- Greeting Card Admin -->
      <div class="mobile-greeting-card" style="background: linear-gradient(135deg, #4c1d95 0%, #312e81 100%);">
        <div class="mobile-badge-corp" style="background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.25);">
          PT PUPUK KUJANG • K3 & PENGAMANAN
        </div>
        <div class="mobile-greeting-name" style="margin-top: 8px;">
          Bambang Sutrisno, S.T.
        </div>
        <div class="mobile-greeting-role">
          Supervisi Pengamanan & K3 • Super Administrator
        </div>
        <div style="display: flex; gap: 8px; margin-top: 14px;">
          <div style="background: rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 8px; font-size: 0.7rem; color: #ede9fe; font-weight: 700;">
            Kebijakan: No Approval, No Exit
          </div>
        </div>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="mobile-grid-stats">
        <div class="mobile-stat-card">
          <div class="mobile-stat-label">Total Akun SAKTI</div>
          <div class="mobile-stat-value" style="color: #7c3aed;">${accounts.length}</div>
          <div class="mobile-stat-desc">5 Aktor Terdaftar</div>
        </div>
        <div class="mobile-stat-card">
          <div class="mobile-stat-label">Total Pengajuan</div>
          <div class="mobile-stat-value" style="color: #059669;">${tickets.length}</div>
          <div class="mobile-stat-desc">Bulan Berjalan</div>
        </div>
        <div class="mobile-stat-card">
          <div class="mobile-stat-label">Status Gerbang</div>
          <div class="mobile-stat-value" style="color: #0284c7;">Online</div>
          <div class="mobile-stat-desc">Pos 1, 2, & Pos 3</div>
        </div>
        <div class="mobile-stat-card">
          <div class="mobile-stat-label">Keamanan Sistem</div>
          <div class="mobile-stat-value" style="color: #10b981;">100%</div>
          <div class="mobile-stat-desc">Enkripsi SHA-256</div>
        </div>
      </div>

      <!-- Section Actions -->
      <div class="mobile-card" style="margin-top: 12px; padding: 14px;">
        <div style="font-size: 0.85rem; font-weight: 800; color: #0f172a; margin-bottom: 10px;">
          Pusat Kontrol Akses & Sistem
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button type="button" class="mobile-btn-primary" style="background:#7c3aed; border-color:#7c3aed;" onclick="window.mobileSwitchTab('users')">
            Lihat & Kelola Hak Akses Pengguna
          </button>
          <button type="button" class="mobile-btn-secondary" onclick="window.mobileSwitchTab('riwayat')">
            Buka Log Audit & Rekam Jejak
          </button>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------------
  // 4. GLOBAL SWITCHERS & ROUTING
  // -------------------------------------------------------------------
  window.mobileSwitchTab = function (tab, subParam) {
    if (tab === 'beranda') tab = 'dashboard';
    if ((currentMobileRole === 'approver' || currentMobileRole === 'approver2') && tab === 'riwayat') {
      tab = 'dashboard';
    }
    currentMobileTab = tab;
    renderActiveView();

    if (subParam) {
      if ((currentMobileRole === 'approver' || currentMobileRole === 'approver2') && tab === 'antrean' && typeof window.mobileSwitchAntreanSegment === 'function') {
        window.mobileSwitchAntreanSegment(subParam);
      } else if (currentMobileRole === 'security' && tab === 'pelacakan' && typeof window.mobileSwitchPelacakanFilter === 'function') {
        window.mobileSwitchPelacakanFilter(subParam);
      }
    }
  };

  window.mobileSwitchRole = function (role) {
    currentMobileRole = role;
    currentMobileTab = 'dashboard';

    // Also inform desktop switchRole if exists
    if (typeof window.switchRole === 'function' && window.currentActor !== role) {
      window.switchRole(role);
    }

    window.closeMobileRoleSheet();
    renderMobileShell();
    renderActiveView();

    const roleNames = {
      karyawan: 'Karyawan (Budi Pratama, S.T.)',
      karyawan2: 'Karyawan 2 (Arthur Morgan, S.Tr.T.)',
      approver: 'Atasan 1 (Ir. Hendra Gunawan, M.T.)',
      approver2: 'Atasan 2 (Dewi Sartika, S.T., M.M.)',
      security: 'Pos Jaga (Sertu Agus - Pos 1)'
    };
    if (typeof window.showToast === 'function') {
      window.showToast(`Beralih ke tampilan simulasi: ${roleNames[role] || role}`, 'info');
    }
  };

  // Synchronize Mobile when Desktop or Auth changes role
  window.syncMobileRole = function (role) {
    if (['karyawan', 'karyawan2', 'approver', 'approver2', 'security'].includes(role)) {
      currentMobileRole = role;
    } else {
      currentMobileRole = 'karyawan';
    }
    currentMobileTab = 'dashboard';
    renderMobileShell();
    renderActiveView();
  };

  window.openMobileRoleSheet = function () {
    const sheet = document.getElementById('mobileRoleSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (sheet) sheet.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  };

  window.closeMobileRoleSheet = function () {
    const sheet = document.getElementById('mobileRoleSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (sheet) sheet.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  };

    window.mobileCloseSheet = function () {
    const sheet = document.getElementById('mobileActionSheet');
    const roleSheet = document.getElementById('mobileRoleSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (sheet) sheet.classList.remove('open');
    if (roleSheet) roleSheet.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    try {
      if (history.state && history.state.mobileDetailOpen) {
        history.back();
      }
    } catch (e) {}
  };


  // -------------------------------------------------------------------
  // 5. AVATAR MENU & LOG OUT TO SAKTI (PEKERJAAN B)
  // -------------------------------------------------------------------
  window.openMobileAvatarMenu = function () {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;

    const user = (typeof window.getKujangCurrentUser === 'function' ? window.getKujangCurrentUser() : null) || {};

    const actorProfiles = {
      karyawan: {
        name: 'Budi Pratama, S.T.',
        nip: 'PK-2024-8841',
        roleLabel: 'Karyawan Pemohon',
        dept: 'Departemen Rekayasa & Pemeliharaan',
        initials: 'BP',
        avatarBg: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)'
      },
      karyawan2: {
        name: 'Arthur Morgan, S.Tr.T.',
        nip: 'PK-2024-8842',
        roleLabel: 'Karyawan Pemohon 2',
        dept: 'Departemen Rekayasa & Pemeliharaan',
        initials: 'AM',
        avatarBg: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)'
      },
      approver: {
        name: 'Ir. Hendra Gunawan, M.T.',
        nip: 'PK-2016-3392',
        roleLabel: 'Atasan 1 (Manager Rekayasa & Pemeliharaan)',
        dept: 'Departemen Rekayasa & Pemeliharaan',
        initials: 'HG',
        avatarBg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
      },
      approver2: {
        name: 'Dewi Sartika, S.T., M.M.',
        nip: 'PK-2012-0845',
        roleLabel: 'Atasan 2 (Supervisor Operasional Lapangan)',
        dept: 'Departemen Rekayasa & Pemeliharaan',
        initials: 'DS',
        avatarBg: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)'
      },
      security: {
        name: 'Sertu Agus',
        nip: 'SEC-2018-042',
        roleLabel: 'Petugas Pengamanan (Pos 1 Gerbang Utama)',
        dept: 'Departemen TI & Pengamanan Pabrik',
        initials: 'SA',
        avatarBg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
      }
    };

    const isSameRole = (user && user.role === currentMobileRole);
    const defaultProfile = actorProfiles[currentMobileRole] || actorProfiles.karyawan;
    const profile = {
      name: (isSameRole && user.name) ? user.name : defaultProfile.name,
      nip: (isSameRole && user.nip) ? user.nip : defaultProfile.nip,
      roleLabel: defaultProfile.roleLabel,
      dept: (isSameRole && user.department) ? user.department : defaultProfile.dept,
      initials: defaultProfile.initials,
      avatarBg: defaultProfile.avatarBg
    };

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header">
        <div>
          <h3 class="mobile-sheet-title" style="font-size: 1.05rem; font-weight: 800; color: #0f172a;">Menu Akun Pengguna</h3>
          <p style="font-size: 0.725rem; color: #64748b; margin: 1px 0 0 0;">Portal SAKTI • PT Pupuk Kujang</p>
        </div>
        <button type="button" class="mobile-sheet-close" aria-label="Tutup Menu Akun" onclick="window.mobileCloseSheet()">✕</button>
      </div>

      <div class="mobile-sheet-body" style="padding-top: 10px;">
        <!-- User Info Card -->
        <div class="mobile-avatar-sheet-card">
          <div class="mobile-avatar-sheet-circle" style="background: ${profile.avatarBg};">
            ${profile.initials}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 0.925rem; font-weight: 800; color: #0f172a; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${profile.name}
            </div>
            <div style="font-size: 0.75rem; color: #059669; font-weight: 700; margin-top: 2px;">
              ${profile.roleLabel}
            </div>
            <div style="font-size: 0.7rem; color: #64748b; font-family: monospace; margin-top: 2px;">
              NIP: ${profile.nip}
            </div>
            <div style="font-size: 0.675rem; color: #94a3b8; margin-top: 2px;">
              ${profile.dept}
            </div>
          </div>
        </div>

        <div style="font-size: 0.725rem; color: #64748b; margin-bottom: 14px; line-height: 1.4; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
          Sesi aktif Anda terotentikasi melalui <strong>Portal SAKTI Kujang ID</strong>. Untuk mengakhiri sesi kerja dan kembali ke layar login, gunakan tombol keluar di bawah.
        </div>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 12px; display: flex; flex-direction: column; gap: 8px;">
          <!-- Logout Button (Pekerjaan B) -->
          <button type="button" class="mobile-btn-logout-item" onclick="window.openMobileLogoutConfirm('${profile.name.replace(/'/g, "\\'")}')" aria-label="Keluar dari akun SAKTI">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span style="color: #dc2626;">Keluar ke Portal SAKTI</span>
          </button>
        </div>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  window.openMobileLogoutConfirm = function (userName) {
    const sheet = document.getElementById('mobileActionSheet');
    if (sheet) sheet.classList.remove('open');

    // Check if employee has unsent form draft
    let hasUnsentDraft = false;
    if (currentMobileRole === 'karyawan') {
      const dest = document.getElementById('mFormDestination')?.value;
      const reason = document.getElementById('mFormReason')?.value;
      if ((dest && dest.trim()) || (reason && reason.trim())) {
        hasUnsentDraft = true;
      }
    }

    const modalHtml = `
      <div id="mobileLogoutConfirmModal" class="mobile-modal-overlay open" style="display: flex; align-items: center; justify-content: center; z-index: 10001; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); padding: 20px;">
        <div style="background: #ffffff; border-radius: 16px; width: 100%; max-width: 340px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: mobileModalFadeIn 0.2s ease-out; text-align: center;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </div>

          <h3 style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">Keluar dari aplikasi?</h3>
          <p style="font-size: 0.775rem; color: #64748b; margin: 0 0 12px 0; line-height: 1.45;">
            Anda akan keluar dari akun <strong>${userName || 'pengguna'}</strong>. Anda perlu masuk lagi melalui Portal SAKTI untuk memakai aplikasi.
          </p>

          ${hasUnsentDraft ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 8px 10px; font-size: 0.725rem; color: #b91c1c; font-weight: 700; margin-bottom: 14px; text-align: left; display: flex; align-items: center; gap: 6px;">
              <span>⚠️ Perhatian: Data formulir yang belum dikirim akan hilang.</span>
            </div>
          ` : ''}

          <div style="display: flex; gap: 8px; margin-top: 14px;">
            <button type="button" class="mobile-btn-secondary" style="flex: 1; height: 42px; border-radius: 10px; font-weight: 700; font-size: 0.8125rem;" onclick="window.closeMobileLogoutConfirm()">
              Batal
            </button>
            <button type="button" id="btnConfirmMobileLogout" class="mobile-btn-danger" style="flex: 1; height: 42px; border-radius: 10px; font-weight: 700; font-size: 0.8125rem; background: #dc2626; color: #ffffff; border: 1px solid #dc2626;" onclick="window.executeMobileLogout()">
              Keluar
            </button>
          </div>
        </div>
      </div>
    `;

    const existing = document.getElementById('mobileLogoutConfirmModal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  };

  window.closeMobileLogoutConfirm = function () {
    const modal = document.getElementById('mobileLogoutConfirmModal');
    if (modal) modal.remove();
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (backdrop) backdrop.classList.remove('open');
  };

  window.executeMobileLogout = function () {
    const btn = document.getElementById('btnConfirmMobileLogout');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Mohon tunggu...</span>';
      btn.style.opacity = '0.7';
      btn.style.cursor = 'not-allowed';
    }

    // 1. Matikan kamera pemindai mobile Pos Jaga jika aktif
    try {
      if (typeof window.mobileStopCameraScanner === 'function') {
        window.mobileStopCameraScanner();
      }
      if (typeof window.stopCameraScanner === 'function') {
        window.stopCameraScanner();
      }
    } catch (e) {}

    // 2. Hentikan polling notifikasi
    try {
      if (typeof window.stopNotifPolling === 'function') {
        window.stopNotifPolling();
      }
    } catch (e) {}

    // 3. Broadcast logout event ke tab lain melalui storage
    try {
      localStorage.setItem('kujang_logout_event', String(Date.now()));
    } catch (e) {}

    // 4. Tutup dialog dan sheet
    window.closeMobileLogoutConfirm();
    if (typeof window.mobileCloseSheet === 'function') window.mobileCloseSheet();

    // 5. Eksekusi logout sentral Kujang ID
    setTimeout(() => {
      if (typeof window.kujangLogout === 'function') {
        window.kujangLogout();
      } else {
        sessionStorage.clear();
        localStorage.removeItem('kujang_current_user');
        const overlay = document.getElementById('kujangAuthOverlay');
        if (overlay) overlay.style.display = 'flex';
      }
      if (typeof window.showToast === 'function') {
        window.showToast('Anda berhasil keluar dari akun SAKTI.', 'success');
      }
    }, 350);
  };

  // Keyboard shortcut Esc to close logout confirm modal
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        window.closeMobileLogoutConfirm();
      }
    });
  }

    // Support mobile hardware & browser back button to close sheet safely
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('popstate', function () {
      const sheet = document.getElementById('mobileActionSheet');
      const roleSheet = document.getElementById('mobileRoleSheet');
      const backdrop = document.getElementById('mobileModalBackdrop');
      if (sheet && sheet.classList.contains('open')) {
        sheet.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
      }
      if (roleSheet && roleSheet.classList.contains('open')) {
        roleSheet.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
      }
    });
  }

  // -------------------------------------------------------------------
  // 6. GLOBAL MOBILE HISTORY DELETION (ALL ACTORS)
  // -------------------------------------------------------------------
  const FINISHED_STATUSES_RULE = ['Selesai', 'Dibatalkan', 'Ditolak', 'Kedaluwarsa'];

  window.mobileClearRiwayat = function (actor) {
    const role = actor || currentMobileRole;
    let tickets = window.ticketsList || [];
    let finishedTickets = [];
    let roleLabel = 'Karyawan';
    let flag = 'deletedByKaryawan';

    if (role === 'karyawan' || role === 'karyawan2') {
      const myNip = (window.getCurrentEmployeeActor ? window.getCurrentEmployeeActor().nip : null) || (role === 'karyawan2' ? 'PK-2024-8842' : 'PK-2024-8841');
      finishedTickets = tickets.filter(t => !t.deletedByKaryawan && 
        (t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841')) &&
        FINISHED_STATUSES_RULE.includes(t.status)
      );
      roleLabel = 'riwayat Karyawan';
      flag = 'deletedByKaryawan';
    } else if (role === 'approver' || role === 'approver2') {
      finishedTickets = tickets.filter(t => !t.deletedByApprover &&
        FINISHED_STATUSES_RULE.includes(t.status)
      );
      roleLabel = 'pelacakan Atasan';
      flag = 'deletedByApprover';
    } else if (role === 'security') {
      finishedTickets = tickets.filter(t => !t.deletedBySecurity &&
        FINISHED_STATUSES_RULE.includes(t.status)
      );
      roleLabel = 'pelacakan Pos Jaga';
      flag = 'deletedBySecurity';
    }

    if (finishedTickets.length === 0) {
      if (typeof window.showToast === 'function') {
        window.showToast('Tidak ada riwayat selesai untuk dihapus.', 'warning');
      } else {
        alert('Tidak ada riwayat selesai untuk dihapus.');
      }
      return;
    }

    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="border-bottom: 1px solid #f1f5f9; padding: 14px 18px 10px 18px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: #fee2e2; display: flex; align-items: center; justify-content: center; color: #dc2626;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </div>
          <h3 style="font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0;">Konfirmasi Hapus Riwayat</h3>
        </div>
        <button type="button" class="mobile-sheet-close" style="width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; background: #f1f5f9; border: none; border-radius: 50%; font-size: 1.1rem; color: #64748b; cursor: pointer; padding: 0;" onclick="window.mobileCloseSheet()">✕</button>
      </div>
      <div class="mobile-sheet-body" style="padding: 16px 18px 24px 18px;">
        <p style="font-size: 0.85rem; color: #1e293b; line-height: 1.5; margin: 0 0 10px 0;">
          Hapus <strong>${finishedTickets.length} tiket</strong> riwayat selesai dari daftar tampilan Anda?
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 20px; font-size: 0.75rem; color: #64748b; line-height: 1.4;">
          <div style="display: flex; gap: 6px; align-items: flex-start;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" style="flex-shrink: 0; margin-top: 1px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span>Riwayat akan disembunyikan dari perangkat ini. Log keamanan pos gerbang dan audit trail resmi di server tetap tersimpan aman. Tiket yang sedang berjalan tidak akan terhapus.</span>
          </div>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button type="button" class="mobile-btn-secondary" style="flex: 1; min-height: 44px; padding: 10px 16px; font-weight: 700; border-radius: 10px; font-size: 0.85rem;" onclick="window.mobileCloseSheet()">Batal</button>
          <button type="button" style="flex: 1; min-height: 44px; padding: 10px 16px; font-weight: 800; background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; border-radius: 10px; cursor: pointer; font-size: 0.85rem; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.25);" onclick="window.mobileConfirmBatchDelete('${flag}', ${finishedTickets.length})">Hapus Riwayat</button>
        </div>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  window.mobileConfirmBatchDelete = function (flag, count) {
    let tickets = window.ticketsList || [];
    let deletedCount = 0;

    if (flag === 'deletedByKaryawan') {
      const myNip = (window.getCurrentEmployeeActor ? window.getCurrentEmployeeActor().nip : null) || 'PK-2024-8841';
      tickets.forEach(t => {
        const isMyTicket = (t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841'));
        if (isMyTicket && FINISHED_STATUSES_RULE.includes(t.status) && !t.deletedByKaryawan) {
          t.deletedByKaryawan = true;
          deletedCount++;
        }
      });
    } else if (flag === 'deletedByApprover') {
      tickets.forEach(t => {
        if (FINISHED_STATUSES_RULE.includes(t.status) && !t.deletedByApprover) {
          t.deletedByApprover = true;
          deletedCount++;
        }
      });
    } else if (flag === 'deletedBySecurity') {
      tickets.forEach(t => {
        if (FINISHED_STATUSES_RULE.includes(t.status) && !t.deletedBySecurity) {
          t.deletedBySecurity = true;
          deletedCount++;
        }
      });
    }

    if (typeof window.saveTickets === 'function') {
      window.saveTickets(tickets);
    }
    window.mobileCloseSheet();
    if (typeof window.showToast === 'function') {
      window.showToast(`${deletedCount} riwayat dihapus`, 'info');
    }
    renderActiveView();
  };

  // SINGLE TICKET DELETION (Hapus 1 Riwayat dari Rincian Tiket)
  window.mobileDeleteTicketItem = function (ticketId, actor) {
    const flag = actor === 'security' ? 'deletedBySecurity' : 'deletedByKaryawan';
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="border-bottom: 1px solid #f1f5f9; padding: 14px 18px 10px 18px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: #fee2e2; display: flex; align-items: center; justify-content: center; color: #dc2626;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </div>
          <h3 style="font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0;">Konfirmasi Hapus Riwayat</h3>
        </div>
        <button type="button" class="mobile-sheet-close" style="width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; background: #f1f5f9; border: none; border-radius: 50%; font-size: 1.1rem; color: #64748b; cursor: pointer; padding: 0;" onclick="window.mobileCloseSheet()">✕</button>
      </div>
      <div class="mobile-sheet-body" style="padding: 16px 18px 24px 18px;">
        <p style="font-size: 0.85rem; color: #1e293b; line-height: 1.5; margin: 0 0 10px 0;">
          Apakah Anda yakin ingin menghapus tiket <strong>${ticketId}</strong> dari daftar riwayat perangkat ini?
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 20px; font-size: 0.75rem; color: #64748b; line-height: 1.4;">
          <div style="display: flex; gap: 6px; align-items: flex-start;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" style="flex-shrink: 0; margin-top: 1px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span>Data disembunyikan dari tampilan riwayat Anda. Catatan resmi pos gerbang dan audit trail server tetap tersimpan demi integritas keamanan.</span>
          </div>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button type="button" class="mobile-btn-secondary" style="flex: 1; min-height: 44px; padding: 10px 16px; font-weight: 700; border-radius: 10px; font-size: 0.85rem;" onclick="window.mobileCloseSheet()">Batal</button>
          <button type="button" class="mobile-btn-danger" style="flex: 1; min-height: 44px; padding: 10px 16px; font-weight: 800; background: #dc2626; color: #fff; border: 1.5px solid #dc2626; border-radius: 10px; font-size: 0.85rem; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.25);" onclick="window.mobileConfirmSingleDelete('${ticketId}', '${flag}')">Hapus</button>
        </div>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  window.mobileConfirmSingleDelete = function (ticketId, flag) {
    let tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId);
    const FINISHED_STATUSES_RULE = ['Selesai', 'Dibatalkan', 'Ditolak', 'Kedaluwarsa'];
    if (t) {
      if (!FINISHED_STATUSES_RULE.includes(t.status)) {
        if (typeof window.showToast === 'function') {
          window.showToast('Tiket yang masih aktif tidak dapat dihapus.', 'error');
        }
        window.mobileCloseSheet();
        return;
      }
      t[flag] = true;
      if (typeof window.saveTickets === 'function') {
        window.saveTickets(tickets);
      }
      if (typeof window.showToast === 'function') {
        window.showToast(`1 riwayat (${ticketId}) dihapus`, 'info');
      }
    }
    window.mobileCloseSheet();
    renderActiveView();
  };

  window.switchMobileRole = window.mobileSwitchRole;

  // Expose global render active view
  window.renderMobileActiveView = renderActiveView;

  // Expose global initializer
  window.initMobileApp = initMobileApp;

  // Auto init when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileApp);
  } else {
    initMobileApp();
  }

})();
