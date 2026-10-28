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
    if (window.currentActor && ['karyawan', 'approver', 'approver2', 'security'].includes(window.currentActor)) {
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

    if (currentMobileRole === 'karyawan') {
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <span>Tim</span>
        </div>
        <div class="mobile-bottom-nav-item ${currentMobileTab === 'riwayat' ? 'active' : ''}" onclick="window.mobileSwitchTab('riwayat')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span>Riwayat</span>
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

    if (currentMobileRole === 'karyawan') {
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
    if (['karyawan', 'approver', 'approver2', 'security'].includes(role)) {
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
  };

  // Backward compatibility alias
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
