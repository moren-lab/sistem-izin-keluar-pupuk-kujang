/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Navigation Controllers, Role Switcher, Clock & Responsive Sidebar
 */

let currentKaryawanNav = 'dashboard'; // 'dashboard', 'pengajuan', 'riwayat'
let currentApproverNav = 'dashboard'; // 'dashboard', 'antrian', 'pelacakan'
let currentSecurityNav = 'dashboard'; // 'dashboard', 'scanner', 'pelacakan', 'riwayat'
let currentAdminNav = 'dashboard'; // 'dashboard', 'audit', 'report', 'users'

window.currentKaryawanNav = currentKaryawanNav;
window.currentApproverNav = currentApproverNav;
window.currentSecurityNav = currentSecurityNav;
window.currentAdminNav = currentAdminNav;

// CLOCK
function updateClock() {
  const liveDigitalClock = document.getElementById('liveDigitalClock');
  const now = new Date();
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const day = days[now.getDay()];
  const d = now.getDate();
  const m = months[now.getMonth()];
  const y = now.getFullYear();
  const pad = (n) => String(n).padStart(2, '0');
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());

  if (liveDigitalClock) {
    liveDigitalClock.textContent = `${day}, ${d} ${m} ${y} — ${hh}:${mm}:${ss} WIB`;
  }

  // Sinkronisasi otomatis status tiket (Terlambat & Kedaluwarsa) setiap detik mengikuti jam sistem laptop user
  if (typeof window.checkOverdueAndExpiredTickets === 'function') {
    window.checkOverdueAndExpiredTickets(true);
  }
}

// SIDEBAR TOGGLING
function toggleSidebar() {
  const appSidebar = document.getElementById('appSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  if (!appSidebar) return;

  if (window.innerWidth <= 900) {
    appSidebar.classList.toggle('mobile-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.toggle('active');
  } else {
    appSidebar.classList.toggle('collapsed');
  }
}

function closeMobileSidebar() {
  const appSidebar = document.getElementById('appSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  if (appSidebar) appSidebar.classList.remove('mobile-open');
  if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
}

// NAVIGATION PER ACTOR
function setKaryawanNav(navKey) {
  currentKaryawanNav = navKey;
  window.currentKaryawanNav = navKey;
  closeMobileSidebar();

  const menuKaryawanDashboard = document.getElementById('menuKaryawanDashboard');
  const menuKaryawanPengajuanSaya = document.getElementById('menuKaryawanPengajuanSaya');
  const menuKaryawanRiwayat = document.getElementById('menuKaryawanRiwayat');

  const bnavEmpDashboard = document.getElementById('bnavEmpDashboard');
  const bnavEmpPengajuan = document.getElementById('bnavEmpPengajuan');
  const bnavEmpRiwayat = document.getElementById('bnavEmpRiwayat');

  const karyawanDashboardPage = document.getElementById('karyawanDashboardPage');
  const karyawanPengajuanPage = document.getElementById('karyawanPengajuanPage');
  const karyawanRiwayatPage = document.getElementById('karyawanRiwayatPage');

  if (menuKaryawanDashboard) menuKaryawanDashboard.classList.toggle('active', navKey === 'dashboard');
  if (menuKaryawanPengajuanSaya) menuKaryawanPengajuanSaya.classList.toggle('active', navKey === 'pengajuan');
  if (menuKaryawanRiwayat) menuKaryawanRiwayat.classList.toggle('active', navKey === 'riwayat');

  if (bnavEmpDashboard) bnavEmpDashboard.classList.toggle('active', navKey === 'dashboard');
  if (bnavEmpPengajuan) bnavEmpPengajuan.classList.toggle('active', navKey === 'pengajuan');
  if (bnavEmpRiwayat) bnavEmpRiwayat.classList.toggle('active', navKey === 'riwayat');

  if (karyawanDashboardPage) karyawanDashboardPage.style.display = navKey === 'dashboard' ? 'block' : 'none';
  if (karyawanPengajuanPage) karyawanPengajuanPage.style.display = navKey === 'pengajuan' ? 'block' : 'none';
  if (karyawanRiwayatPage) karyawanRiwayatPage.style.display = navKey === 'riwayat' ? 'block' : 'none';

  const breadcrumbRole = document.getElementById('breadcrumbRole');
  const breadcrumbSubpage = document.getElementById('breadcrumbSubpage');
  if (breadcrumbRole) breadcrumbRole.textContent = 'Karyawan';
  if (breadcrumbSubpage) {
    if (navKey === 'dashboard') breadcrumbSubpage.textContent = 'Dashboard';
    else if (navKey === 'pengajuan') breadcrumbSubpage.textContent = 'Pengajuan Saya';
    else if (navKey === 'riwayat') breadcrumbSubpage.textContent = 'Riwayat Pengajuan';
  }

  if (typeof window.renderKaryawanView === 'function') {
    window.renderKaryawanView();
  }
  if (navKey === 'dashboard' && typeof window.renderKaryawanDonutChart === 'function') {
    window.renderKaryawanDonutChart();
  }
}

function setApproverNav(navKey) {
  currentApproverNav = navKey;
  window.currentApproverNav = navKey;
  closeMobileSidebar();

  const menuApproverDashboard = document.getElementById('menuApproverDashboard');
  const menuApproverAntrian = document.getElementById('menuApproverAntrian');
  const menuApproverPelacakan = document.getElementById('menuApproverPelacakan');

  const bnavAppDashboard = document.getElementById('bnavAppDashboard');
  const bnavAppAntrian = document.getElementById('bnavAppAntrian');
  const bnavAppPelacakan = document.getElementById('bnavAppPelacakan');
  const bnavAppRiwayat = document.getElementById('bnavAppRiwayat');

  const approverDashboardPage = document.getElementById('approverDashboardPage');
  const approverAntrianPage = document.getElementById('approverAntrianPage');
  const approverPelacakanPage = document.getElementById('approverPelacakanPage');

  if (menuApproverDashboard) menuApproverDashboard.classList.toggle('active', navKey === 'dashboard');
  if (menuApproverAntrian) menuApproverAntrian.classList.toggle('active', navKey === 'antrian');
  if (menuApproverPelacakan) menuApproverPelacakan.classList.toggle('active', navKey === 'pelacakan' || navKey === 'tim' || navKey === 'riwayat');

  if (bnavAppDashboard) bnavAppDashboard.classList.toggle('active', navKey === 'dashboard');
  if (bnavAppAntrian) bnavAppAntrian.classList.toggle('active', navKey === 'antrian');
  if (bnavAppPelacakan) bnavAppPelacakan.classList.toggle('active', navKey === 'pelacakan' || navKey === 'tim');
  if (bnavAppRiwayat) bnavAppRiwayat.classList.toggle('active', navKey === 'riwayat');

  if (approverDashboardPage) approverDashboardPage.style.display = navKey === 'dashboard' ? 'block' : 'none';
  if (approverAntrianPage) approverAntrianPage.style.display = navKey === 'antrian' ? 'block' : 'none';
  if (approverPelacakanPage) approverPelacakanPage.style.display = (navKey === 'pelacakan' || navKey === 'tim' || navKey === 'riwayat') ? 'block' : 'none';

  if (navKey === 'tim') {
    const filterAppViewMode = document.getElementById('filterAppViewMode');
    if (filterAppViewMode) {
      filterAppViewMode.value = 'outside';
      if (typeof window.filterApproverRequests === 'function') window.filterApproverRequests();
    }
  } else if (navKey === 'riwayat') {
    const filterAppViewMode = document.getElementById('filterAppViewMode');
    if (filterAppViewMode) {
      filterAppViewMode.value = 'all';
      if (typeof window.filterApproverRequests === 'function') window.filterApproverRequests();
    }
  }

  if (typeof window.renderApproverView === 'function') {
    window.renderApproverView();
  }
  if (navKey === 'dashboard' && typeof window.renderApproverBarChart === 'function') {
    window.renderApproverBarChart();
  }

  const breadcrumbRole = document.getElementById('breadcrumbRole');
  const breadcrumbSubpage = document.getElementById('breadcrumbSubpage');
  if (breadcrumbRole) breadcrumbRole.textContent = (window.currentActor === 'approver2') ? 'Atasan 2' : 'Atasan 1';
  if (breadcrumbSubpage) {
    if (navKey === 'dashboard') breadcrumbSubpage.textContent = 'Dashboard';
    else if (navKey === 'antrian') breadcrumbSubpage.textContent = 'Antrian Persetujuan';
    else if (navKey === 'tim') breadcrumbSubpage.textContent = 'Tim Saya';
    else if (navKey === 'riwayat') breadcrumbSubpage.textContent = 'Riwayat Persetujuan';
    else if (navKey === 'pelacakan') breadcrumbSubpage.textContent = 'Pelacakan Izin Karyawan';
  }
}

function setSecurityNav(navKey) {
  currentSecurityNav = navKey;
  window.currentSecurityNav = navKey;
  closeMobileSidebar();

  const menuSecurityDashboard = document.getElementById('menuSecurityDashboard');
  const menuSecurityScanner = document.getElementById('menuSecurityScanner');
  const menuSecurityPelacakan = document.getElementById('menuSecurityPelacakan');
  const menuSecurityRiwayat = document.getElementById('menuSecurityRiwayat');

  const bnavSecDashboard = document.getElementById('bnavSecDashboard');
  const bnavSecScanner = document.getElementById('bnavSecScanner');
  const bnavSecPelacakan = document.getElementById('bnavSecPelacakan');
  const bnavSecRiwayat = document.getElementById('bnavSecRiwayat');

  const securityDashboardPage = document.getElementById('securityDashboardPage');
  const securityScannerPage = document.getElementById('securityScannerPage');
  const securityPelacakanPage = document.getElementById('securityPelacakanPage');
  const securityRiwayatPage = document.getElementById('securityRiwayatPage');

  if (menuSecurityDashboard) menuSecurityDashboard.classList.toggle('active', navKey === 'dashboard');
  if (menuSecurityScanner) menuSecurityScanner.classList.toggle('active', navKey === 'scanner');
  if (menuSecurityPelacakan) menuSecurityPelacakan.classList.toggle('active', navKey === 'pelacakan');
  if (menuSecurityRiwayat) menuSecurityRiwayat.classList.toggle('active', navKey === 'riwayat');

  if (bnavSecDashboard) bnavSecDashboard.classList.toggle('active', navKey === 'dashboard');
  if (bnavSecScanner) bnavSecScanner.classList.toggle('active', navKey === 'scanner');
  if (bnavSecPelacakan) bnavSecPelacakan.classList.toggle('active', navKey === 'pelacakan');
  if (bnavSecRiwayat) bnavSecRiwayat.classList.toggle('active', navKey === 'riwayat');

  if (securityDashboardPage) securityDashboardPage.style.display = navKey === 'dashboard' ? 'block' : 'none';
  if (securityScannerPage) securityScannerPage.style.display = navKey === 'scanner' ? 'block' : 'none';
  if (securityPelacakanPage) securityPelacakanPage.style.display = navKey === 'pelacakan' ? 'block' : 'none';
  if (securityRiwayatPage) securityRiwayatPage.style.display = navKey === 'riwayat' ? 'block' : 'none';

  if (navKey !== 'scanner' && typeof window.stopCameraScanner === 'function') {
    window.stopCameraScanner();
  }

  if (typeof window.renderSecurityView === 'function') {
    window.renderSecurityView();
  }

  const breadcrumbRole = document.getElementById('breadcrumbRole');
  const breadcrumbSubpage = document.getElementById('breadcrumbSubpage');
  if (breadcrumbRole) breadcrumbRole.textContent = 'Pos Jaga';
  if (breadcrumbSubpage) {
    if (navKey === 'dashboard') breadcrumbSubpage.textContent = 'Dashboard';
    else if (navKey === 'scanner') breadcrumbSubpage.textContent = 'Pemindai QR';
    else if (navKey === 'pelacakan') breadcrumbSubpage.textContent = 'Pelacakan Personel';
    else if (navKey === 'riwayat') breadcrumbSubpage.textContent = 'Riwayat Pos Jaga';
  }
}

function setAdminNav(navKey) {
  currentAdminNav = navKey;
  window.currentAdminNav = navKey;
  closeMobileSidebar();

  const menuAdminDashboard = document.getElementById('menuAdminDashboard');
  const menuAdminAudit = document.getElementById('menuAdminAudit');
  const menuAdminReport = document.getElementById('menuAdminReport');
  const menuAdminUsers = document.getElementById('menuAdminUsers');

  const adminDashboardPage = document.getElementById('adminDashboardPage');
  const adminAuditPage = document.getElementById('adminAuditPage');
  const adminReportPage = document.getElementById('adminReportPage');
  const adminUsersPage = document.getElementById('adminUsersPage');

  if (menuAdminDashboard) menuAdminDashboard.classList.toggle('active', navKey === 'dashboard');
  if (menuAdminAudit) menuAdminAudit.classList.toggle('active', navKey === 'audit');
  if (menuAdminReport) menuAdminReport.classList.toggle('active', navKey === 'report');
  if (menuAdminUsers) menuAdminUsers.classList.toggle('active', navKey === 'users');

  if (adminDashboardPage) adminDashboardPage.style.display = navKey === 'dashboard' ? 'block' : 'none';
  if (adminAuditPage) adminAuditPage.style.display = navKey === 'audit' ? 'block' : 'none';
  if (adminReportPage) adminReportPage.style.display = navKey === 'report' ? 'block' : 'none';
  if (adminUsersPage) adminUsersPage.style.display = navKey === 'users' ? 'block' : 'none';

  if (typeof window.renderAdminView === 'function') {
    window.renderAdminView();
  }
  if (navKey === 'dashboard') {
    if (typeof window.renderAdminTrafficChart === 'function') window.renderAdminTrafficChart();
    if (typeof window.renderAdminDeptChart === 'function') window.renderAdminDeptChart();
  }

  const breadcrumbRole = document.getElementById('breadcrumbRole');
  const breadcrumbSubpage = document.getElementById('breadcrumbSubpage');
  if (breadcrumbRole) breadcrumbRole.textContent = 'Admin';
  if (breadcrumbSubpage) {
    if (navKey === 'dashboard') breadcrumbSubpage.textContent = 'Monitoring Headcount';
    else if (navKey === 'audit') breadcrumbSubpage.textContent = 'Audit Trail & Log';
    else if (navKey === 'report') breadcrumbSubpage.textContent = 'Rekapitulasi Data';
    else if (navKey === 'users') breadcrumbSubpage.textContent = 'Hak Akses KUJANG ID';
  }
}

// 4-ACTOR ROLE SWITCHING (Karyawan | Atasan | Pos Jaga | Admin)
function switchRole(role) {
  if (role !== 'security' && typeof window.stopCameraScanner === 'function') {
    window.stopCameraScanner();
  }

  window.currentActor = role;
  currentActor = role;
  closeMobileSidebar();

  const btnSwitchKaryawan = document.getElementById('btnSwitchKaryawan');
  const btnSwitchApprover = document.getElementById('btnSwitchApprover');
  const btnSwitchApprover2 = document.getElementById('btnSwitchApprover2');
  const btnSwitchSecurity = document.getElementById('btnSwitchSecurity');
  const btnSwitchAdmin = document.getElementById('btnSwitchAdmin');

  const viewKaryawan = document.getElementById('viewKaryawan');
  const viewApprover = document.getElementById('viewApprover');
  const viewSecurity = document.getElementById('viewSecurity');
  const viewAdmin = document.getElementById('viewAdmin');

  const navKaryawanGroup = document.getElementById('navKaryawanGroup');
  const navApproverGroup = document.getElementById('navApproverGroup');
  const navSecurityGroup = document.getElementById('navSecurityGroup');
  const navAdminGroup = document.getElementById('navAdminGroup');

  const roleBadge = document.getElementById('roleBadge');
  const sidebarUserName = document.getElementById('sidebarUserName');
  const sidebarUserSub = document.getElementById('sidebarUserSub');

  // Check user access revocation (Admin Access Control)
  const users = window.MOCK_USERS || [];
  const matchedUser = users.find(u => u.roleKey === role && u.status === 'Aktif') || users.find(u => u.roleKey === role);
  if (matchedUser && (matchedUser.status === 'Dicabut' || matchedUser.status === 'Nonaktif')) {
    if (typeof window.showToast === 'function') {
      window.showToast(`⛔ Akses untuk ${matchedUser.name} (${matchedUser.role}) telah dicabut oleh Administrator!`, 'danger');
    }
    // Re-highlight the previous role button
    const prevRole = window.currentActor || 'karyawan';
    if (prevRole === 'karyawan' && btnSwitchKaryawan) btnSwitchKaryawan.classList.add('active');
    else if (prevRole === 'approver' && btnSwitchApprover) btnSwitchApprover.classList.add('active', 'approver');
    else if (prevRole === 'approver2' && btnSwitchApprover2) btnSwitchApprover2.classList.add('active', 'approver');
    else if (prevRole === 'security' && btnSwitchSecurity) btnSwitchSecurity.classList.add('active', 'security');
    else if (prevRole === 'admin' && btnSwitchAdmin) btnSwitchAdmin.classList.add('active', 'admin');
    return false;
  }

  if (typeof window.checkOverdueAndExpiredTickets === 'function') {
    window.checkOverdueAndExpiredTickets(true);
  }

  if (btnSwitchKaryawan) btnSwitchKaryawan.classList.remove('active');
  if (btnSwitchApprover) btnSwitchApprover.classList.remove('active', 'approver');
  if (btnSwitchApprover2) btnSwitchApprover2.classList.remove('active', 'approver');
  if (btnSwitchSecurity) btnSwitchSecurity.classList.remove('active', 'security');
  if (btnSwitchAdmin) btnSwitchAdmin.classList.remove('active', 'admin');

  if (viewKaryawan) viewKaryawan.style.display = 'none';
  if (viewApprover) viewApprover.style.display = 'none';
  if (viewSecurity) viewSecurity.style.display = 'none';
  if (viewAdmin) viewAdmin.style.display = 'none';

  if (navKaryawanGroup) navKaryawanGroup.style.display = 'none';
  if (navApproverGroup) navApproverGroup.style.display = 'none';
  if (navSecurityGroup) navSecurityGroup.style.display = 'none';
  if (navAdminGroup) navAdminGroup.style.display = 'none';

  const ACTORS = window.ACTORS;
  if (matchedUser && ACTORS && ACTORS[role]) {
    ACTORS[role].name = matchedUser.name;
    ACTORS[role].nip = matchedUser.nip;
    if (matchedUser.department) ACTORS[role].department = matchedUser.department;
  }

  if (role === 'karyawan') {
    if (btnSwitchKaryawan) btnSwitchKaryawan.classList.add('active');
    if (viewKaryawan) viewKaryawan.style.display = 'block';
    if (navKaryawanGroup) navKaryawanGroup.style.display = 'flex';

    if (roleBadge) {
      roleBadge.className = 'role-tag-pill role-karyawan';
      roleBadge.textContent = 'Peran: Karyawan';
    }
    if (sidebarUserName && ACTORS) sidebarUserName.textContent = ACTORS.karyawan.name;
    if (sidebarUserSub && ACTORS) sidebarUserSub.textContent = `NIP: ${ACTORS.karyawan.nip}`;

    setKaryawanNav(currentKaryawanNav || 'dashboard');
    if (typeof window.showToast === 'function') window.showToast(`Beralih ke mode Karyawan (${ACTORS.karyawan.name})`, 'info');
  } else if (role === 'approver') {
    if (btnSwitchApprover) btnSwitchApprover.classList.add('active', 'approver');
    if (viewApprover) viewApprover.style.display = 'block';
    if (navApproverGroup) navApproverGroup.style.display = 'flex';

    if (roleBadge) {
      roleBadge.className = 'role-tag-pill role-approver';
      roleBadge.textContent = 'Peran: Atasan 1 (Manager)';
    }
    if (sidebarUserName && ACTORS) sidebarUserName.textContent = ACTORS.approver.name;
    if (sidebarUserSub && ACTORS) sidebarUserSub.textContent = `NIP: ${ACTORS.approver.nip}`;

    setApproverNav(currentApproverNav || 'dashboard');
    const approverDispName = (ACTORS && ACTORS.approver && ACTORS.approver.name) ? ACTORS.approver.name : (matchedUser ? matchedUser.name : 'Approver');
    if (typeof window.showToast === 'function') window.showToast(`Beralih ke mode Atasan 1 / Approver (${approverDispName})`, 'info');
  } else if (role === 'approver2') {
    if (btnSwitchApprover2) btnSwitchApprover2.classList.add('active', 'approver');
    if (viewApprover) viewApprover.style.display = 'block';
    if (navApproverGroup) navApproverGroup.style.display = 'flex';

    if (roleBadge) {
      roleBadge.className = 'role-tag-pill role-approver';
      roleBadge.textContent = 'Peran: Atasan 2 (Supervisor / Plt)';
    }
    const act2 = (ACTORS && ACTORS.approver2) ? ACTORS.approver2 : { name: 'Dewi Sartika, S.T., M.M.', nip: 'PK-2012-0845' };
    if (sidebarUserName) sidebarUserName.textContent = act2.name;
    if (sidebarUserSub) sidebarUserSub.textContent = `NIP: ${act2.nip}`;

    setApproverNav(currentApproverNav || 'dashboard');
    if (typeof window.showToast === 'function') window.showToast('Beralih ke mode Atasan 2 / Delegasi (Dewi Sartika)', 'info');
  } else if (role === 'security') {
    if (btnSwitchSecurity) btnSwitchSecurity.classList.add('active', 'security');
    if (viewSecurity) viewSecurity.style.display = 'block';
    if (navSecurityGroup) navSecurityGroup.style.display = 'flex';

    const secActor = typeof window.getCurrentSecurityActor === 'function' ? window.getCurrentSecurityActor() : ((ACTORS && ACTORS.security) ? ACTORS.security : { name: 'Sertu Agus', nip: 'SEC-2018-042', gateName: 'Pos 1 Gerbang Utama', gateShort: 'Pos 1' });

    if (roleBadge) {
      roleBadge.className = 'role-tag-pill role-security';
      roleBadge.textContent = 'Peran: Petugas Pengamanan';
    }
    if (sidebarUserName && secActor) sidebarUserName.textContent = secActor.name;
    if (sidebarUserSub && secActor) sidebarUserSub.textContent = `NIP: ${secActor.nip} — ${secActor.gateName}`;

    // Update scanner badge & dropdown if on page
    const securityOfficerBadge = document.getElementById('securityOfficerBadge');
    if (securityOfficerBadge && secActor) {
      securityOfficerBadge.textContent = `Petugas Jaga: ${secActor.name} — ${secActor.gateShort}`;
    }
    const selectGateLocation = document.getElementById('selectGateLocation');
    if (selectGateLocation && secActor) {
      selectGateLocation.value = secActor.gateName;
    }

    setSecurityNav(currentSecurityNav || 'dashboard');
    if (typeof window.showToast === 'function') window.showToast(`Beralih ke mode Pos Jaga Pengamanan (${secActor.name})`, 'info');
  } else if (role === 'admin') {
    if (btnSwitchAdmin) btnSwitchAdmin.classList.add('active', 'admin');
    if (viewAdmin) viewAdmin.style.display = 'block';
    if (navAdminGroup) navAdminGroup.style.display = 'flex';

    if (roleBadge) {
      roleBadge.className = 'role-tag-pill role-admin';
      roleBadge.textContent = 'Peran: Administrator Pengamanan & K3';
    }
    if (sidebarUserName && ACTORS) sidebarUserName.textContent = ACTORS.admin.name;
    if (sidebarUserSub && ACTORS) sidebarUserSub.textContent = `NIP: ${ACTORS.admin.nip} — ${ACTORS.admin.office}`;

    setAdminNav(currentAdminNav || 'dashboard');
    if (typeof window.showToast === 'function') window.showToast('Beralih ke mode Administrator Pengamanan & K3 (Bambang Sutrisno)', 'info');
  }

  // Update mobile bottom nav visibility & active role group (Excludes Admin)
  updateMobileBottomNav(role);

  // Keep active button in view safely without shifting desktop navbar or parent elements
  const roleContainer = document.querySelector('.role-switcher-container');
  const activeBtn = document.querySelector('.role-switch-btn.active');
  if (roleContainer && activeBtn && window.innerWidth <= 768) {
    try {
      const offset = activeBtn.offsetLeft - (roleContainer.clientWidth / 2) + (activeBtn.clientWidth / 2);
      roleContainer.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
    } catch (e) {}
  } else if (roleContainer && window.innerWidth > 768) {
    roleContainer.scrollLeft = 0;
  }

  if (typeof window.renderAllCharts === 'function') {
    window.renderAllCharts();
  }
}

// UPDATE MOBILE BOTTOM NAV (Karyawan, Approver, Security ONLY - Excludes Admin)
function updateMobileBottomNav(role) {
  const bottomNavKaryawan = document.getElementById('bottomNavKaryawan');
  const bottomNavApprover = document.getElementById('bottomNavApprover');
  const bottomNavSecurity = document.getElementById('bottomNavSecurity');
  const mobileBottomNav = document.getElementById('mobileBottomNav');

  // Toggle body class so responsive CSS applies automatically
  document.body.classList.toggle('role-is-admin', role === 'admin');

  if (!mobileBottomNav) return;

  if (role === 'admin') {
    mobileBottomNav.style.display = 'none';
    if (bottomNavKaryawan) bottomNavKaryawan.style.display = 'none';
    if (bottomNavApprover) bottomNavApprover.style.display = 'none';
    if (bottomNavSecurity) bottomNavSecurity.style.display = 'none';
    return;
  }

  // For Karyawan, Approver, and Security:
  mobileBottomNav.style.display = ''; // Let CSS media query control visibility
  if (bottomNavKaryawan) bottomNavKaryawan.style.display = role === 'karyawan' ? 'flex' : 'none';
  if (bottomNavApprover) bottomNavApprover.style.display = (role === 'approver' || role === 'approver2') ? 'flex' : 'none';
  if (bottomNavSecurity) bottomNavSecurity.style.display = role === 'security' ? 'flex' : 'none';
}
window.updateMobileBottomNav = updateMobileBottomNav;

// BIND LISTENERS
document.addEventListener('DOMContentLoaded', () => {
  const btnToggleSidebar = document.getElementById('btnToggleSidebar');
  const btnCloseSidebarMobile = document.getElementById('btnCloseSidebarMobile');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  if (btnToggleSidebar) btnToggleSidebar.addEventListener('click', toggleSidebar);
  if (btnCloseSidebarMobile) btnCloseSidebarMobile.addEventListener('click', closeMobileSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileSidebar);

  // Bottom Nav Button Listeners
  const bnavEmpDashboard = document.getElementById('bnavEmpDashboard');
  const bnavEmpPengajuan = document.getElementById('bnavEmpPengajuan');
  const bnavEmpRiwayat = document.getElementById('bnavEmpRiwayat');
  if (bnavEmpDashboard) bnavEmpDashboard.addEventListener('click', () => setKaryawanNav('dashboard'));
  if (bnavEmpPengajuan) bnavEmpPengajuan.addEventListener('click', () => setKaryawanNav('pengajuan'));
  if (bnavEmpRiwayat) bnavEmpRiwayat.addEventListener('click', () => setKaryawanNav('riwayat'));

  const bnavAppDashboard = document.getElementById('bnavAppDashboard');
  const bnavAppAntrian = document.getElementById('bnavAppAntrian');
  const bnavAppPelacakan = document.getElementById('bnavAppPelacakan');
  const bnavAppRiwayat = document.getElementById('bnavAppRiwayat');
  if (bnavAppDashboard) bnavAppDashboard.addEventListener('click', () => setApproverNav('dashboard'));
  if (bnavAppAntrian) bnavAppAntrian.addEventListener('click', () => setApproverNav('antrian'));
  if (bnavAppPelacakan) bnavAppPelacakan.addEventListener('click', () => setApproverNav('tim'));
  if (bnavAppRiwayat) bnavAppRiwayat.addEventListener('click', () => setApproverNav('riwayat'));

  const bnavSecDashboard = document.getElementById('bnavSecDashboard');
  const bnavSecScanner = document.getElementById('bnavSecScanner');
  const bnavSecPelacakan = document.getElementById('bnavSecPelacakan');
  const bnavSecRiwayat = document.getElementById('bnavSecRiwayat');
  if (bnavSecDashboard) bnavSecDashboard.addEventListener('click', () => setSecurityNav('dashboard'));
  if (bnavSecScanner) bnavSecScanner.addEventListener('click', () => setSecurityNav('scanner'));
  if (bnavSecPelacakan) bnavSecPelacakan.addEventListener('click', () => setSecurityNav('pelacakan'));
  if (bnavSecRiwayat) bnavSecRiwayat.addEventListener('click', () => setSecurityNav('riwayat'));

  // Initialize Mobile Bottom Nav state
  updateMobileBottomNav(window.currentActor || 'karyawan');

  const menuKaryawanDashboard = document.getElementById('menuKaryawanDashboard');
  const menuKaryawanPengajuanSaya = document.getElementById('menuKaryawanPengajuanSaya');
  const menuKaryawanRiwayat = document.getElementById('menuKaryawanRiwayat');

  if (menuKaryawanDashboard) menuKaryawanDashboard.addEventListener('click', () => setKaryawanNav('dashboard'));
  if (menuKaryawanPengajuanSaya) menuKaryawanPengajuanSaya.addEventListener('click', () => setKaryawanNav('pengajuan'));
  if (menuKaryawanRiwayat) menuKaryawanRiwayat.addEventListener('click', () => setKaryawanNav('riwayat'));

  const menuApproverDashboard = document.getElementById('menuApproverDashboard');
  const menuApproverAntrian = document.getElementById('menuApproverAntrian');
  const menuApproverPelacakan = document.getElementById('menuApproverPelacakan');

  if (menuApproverDashboard) menuApproverDashboard.addEventListener('click', () => setApproverNav('dashboard'));
  if (menuApproverAntrian) menuApproverAntrian.addEventListener('click', () => setApproverNav('antrian'));
  if (menuApproverPelacakan) menuApproverPelacakan.addEventListener('click', () => setApproverNav('pelacakan'));

  const menuSecurityDashboard = document.getElementById('menuSecurityDashboard');
  const menuSecurityScanner = document.getElementById('menuSecurityScanner');
  const menuSecurityPelacakan = document.getElementById('menuSecurityPelacakan');
  const menuSecurityRiwayat = document.getElementById('menuSecurityRiwayat');

  if (menuSecurityDashboard) menuSecurityDashboard.addEventListener('click', () => setSecurityNav('dashboard'));
  if (menuSecurityScanner) menuSecurityScanner.addEventListener('click', () => setSecurityNav('scanner'));
  if (menuSecurityPelacakan) menuSecurityPelacakan.addEventListener('click', () => setSecurityNav('pelacakan'));
  if (menuSecurityRiwayat) menuSecurityRiwayat.addEventListener('click', () => setSecurityNav('riwayat'));

  const menuAdminDashboard = document.getElementById('menuAdminDashboard');
  const menuAdminAudit = document.getElementById('menuAdminAudit');
  const menuAdminReport = document.getElementById('menuAdminReport');
  const menuAdminUsers = document.getElementById('menuAdminUsers');

  if (menuAdminDashboard) menuAdminDashboard.addEventListener('click', () => setAdminNav('dashboard'));
  if (menuAdminAudit) menuAdminAudit.addEventListener('click', () => setAdminNav('audit'));
  if (menuAdminReport) menuAdminReport.addEventListener('click', () => setAdminNav('report'));
  if (menuAdminUsers) menuAdminUsers.addEventListener('click', () => setAdminNav('users'));

  const btnSwitchKaryawan = document.getElementById('btnSwitchKaryawan');
  const btnSwitchApprover = document.getElementById('btnSwitchApprover');
  const btnSwitchApprover2 = document.getElementById('btnSwitchApprover2');
  const btnSwitchSecurity = document.getElementById('btnSwitchSecurity');
  const btnSwitchAdmin = document.getElementById('btnSwitchAdmin');

  if (btnSwitchKaryawan) btnSwitchKaryawan.addEventListener('click', () => switchRole('karyawan'));
  if (btnSwitchApprover) btnSwitchApprover.addEventListener('click', () => switchRole('approver'));
  if (btnSwitchApprover2) btnSwitchApprover2.addEventListener('click', () => switchRole('approver2'));
  if (btnSwitchSecurity) btnSwitchSecurity.addEventListener('click', () => switchRole('security'));
  if (btnSwitchAdmin) btnSwitchAdmin.addEventListener('click', () => switchRole('admin'));

  // LOGOUT & PORTAL AUTH BINDINGS
  const btnSidebarLogout = document.getElementById('btnSidebarLogout');
  const btnCloseLogoutModal = document.getElementById('btnCloseLogoutModal');
  const btnCancelLogoutModal = document.getElementById('btnCancelLogoutModal');
  const btnConfirmLogoutModal = document.getElementById('btnConfirmLogoutModal');
  const btnLoginSubmit = document.getElementById('btnLoginSubmit');
  const userChoices = document.querySelectorAll('.portal-user-option');

  if (btnSidebarLogout) btnSidebarLogout.addEventListener('click', openLogoutModal);
  if (btnCloseLogoutModal) btnCloseLogoutModal.addEventListener('click', closeLogoutModal);
  if (btnCancelLogoutModal) btnCancelLogoutModal.addEventListener('click', closeLogoutModal);
  if (btnConfirmLogoutModal) btnConfirmLogoutModal.addEventListener('click', executeLogout);

  userChoices.forEach(opt => {
    opt.addEventListener('click', () => {
      userChoices.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });

  if (btnLoginSubmit) btnLoginSubmit.addEventListener('click', handleLoginSubmit);

  initRoleSwitcherScroll();
  initTheme();

  setInterval(updateClock, 1000);
  updateClock();
});

// HORIZONTAL SCROLL & DRAG SUPPORT FOR ROLE SWITCHER (REQUIREMENT 4)
function initRoleSwitcherScroll() {
  const container = document.querySelector('.role-switcher-container');
  if (!container) return;

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  container.addEventListener('mousedown', (e) => {
    isDown = true;
    container.classList.add('grabbing');
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    if (isDown) {
      isDown = false;
      container.classList.remove('grabbing');
    }
  });

  container.addEventListener('mouseleave', () => {
    isDown = false;
    container.classList.remove('grabbing');
  });

  container.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5; // Drag speed
    container.scrollLeft = scrollLeft - walk;
  });

  // Mouse wheel horizontal scroll
  container.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  }, { passive: false });
}

// LOGOUT & PORTAL AUTH FUNCTIONS
function openLogoutModal() {
  const modalLogoutConfirm = document.getElementById('modalLogoutConfirm');
  if (modalLogoutConfirm) modalLogoutConfirm.classList.add('open');
}

function closeLogoutModal() {
  const modalLogoutConfirm = document.getElementById('modalLogoutConfirm');
  if (modalLogoutConfirm) modalLogoutConfirm.classList.remove('open');
}

function executeLogout() {
  closeLogoutModal();
  if (typeof window.stopCameraScanner === 'function') {
    try { window.stopCameraScanner(); } catch (e) { }
  }
  closeMobileSidebar();

  if (typeof window.kujangLogout === 'function') {
    window.kujangLogout();
  } else {
    const portalLoginOverlay = document.getElementById('portalLoginOverlay');
    if (portalLoginOverlay) portalLoginOverlay.classList.add('open');
  }
}

function handleLoginSubmit() {
  const portalLoginOverlay = document.getElementById('portalLoginOverlay');
  const selectedOpt = document.querySelector('.portal-user-option.selected');
  const role = selectedOpt ? selectedOpt.getAttribute('data-role') : 'karyawan';

  if (typeof window.switchRole === 'function') {
    window.switchRole(role);
  }
  if (portalLoginOverlay) {
    portalLoginOverlay.classList.remove('open');
  }
  if (typeof window.showToast === 'function') {
    window.showToast('Autentikasi KUJANG ID berhasil. Selamat datang kembali!', 'success');
  }
}

// ==========================================
// TEMA GELAP / TERANG (DARK MODE / LIGHT MODE)
// ==========================================
function updateThemeUI(isDark) {
  if (isDark) {
    document.body.classList.add('theme-dark');
    document.documentElement.classList.add('theme-dark');
  } else {
    document.body.classList.remove('theme-dark');
    document.documentElement.classList.remove('theme-dark');
  }

  // Sinkronkan seluruh toggle switch checkbox di dashboard
  const toggleInputs = document.querySelectorAll('.theme-switch-input');
  toggleInputs.forEach(input => {
    input.checked = isDark;
  });

  const iconEls = document.querySelectorAll('.theme-icon-wrap, #dashThemeIcon, #dashThemeIconEmp, #dashThemeIconApp, #dashThemeIconSec, #dashThemeIconAdm');
  const labelEls = document.querySelectorAll('.theme-text-wrap, #dashThemeLabel, #dashThemeLabelEmp, #dashThemeLabelApp, #dashThemeLabelSec, #dashThemeLabelAdm');

  iconEls.forEach(el => {
    el.textContent = isDark ? '☀️' : '🌙';
  });

  labelEls.forEach(el => {
    el.textContent = isDark ? 'Mode Terang' : 'Mode Gelap';
  });

  // Re-render interactive charts with dark mode styling
  try {
    if (typeof window.renderAllCharts === 'function') {
      window.renderAllCharts();
    }
  } catch (err) {
    console.warn('[Theme] renderAllCharts warning:', err);
  }
}

function toggleDarkMode() {
  const current = localStorage.getItem('kujang_theme') === 'dark';
  const next = !current;
  localStorage.setItem('kujang_theme', next ? 'dark' : 'light');
  updateThemeUI(next);
  if (typeof window.showToast === 'function') {
    window.showToast(next ? 'Mode Gelap diaktifkan' : 'Mode Terang diaktifkan', 'info');
  }
}

function initTheme() {
  const isDark = localStorage.getItem('kujang_theme') === 'dark';
  updateThemeUI(isDark);
}

// Expose globally
window.updateClock = updateClock;
window.toggleSidebar = toggleSidebar;
window.closeMobileSidebar = closeMobileSidebar;
window.setKaryawanNav = setKaryawanNav;
window.setApproverNav = setApproverNav;
window.setSecurityNav = setSecurityNav;
window.setAdminNav = setAdminNav;
window.switchRole = switchRole;
window.openLogoutModal = openLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.executeLogout = executeLogout;
window.handleLoginSubmit = handleLoginSubmit;
window.initRoleSwitcherScroll = initRoleSwitcherScroll;
window.updateThemeUI = updateThemeUI;
window.toggleDarkMode = toggleDarkMode;
window.initTheme = initTheme;

