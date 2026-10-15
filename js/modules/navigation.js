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
  if (!liveDigitalClock) return;

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

  liveDigitalClock.textContent = `${day}, ${d} ${m} ${y} • ${hh}:${mm}:${ss} WIB`;
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

  const karyawanDashboardPage = document.getElementById('karyawanDashboardPage');
  const karyawanPengajuanPage = document.getElementById('karyawanPengajuanPage');
  const karyawanRiwayatPage = document.getElementById('karyawanRiwayatPage');

  if (menuKaryawanDashboard) menuKaryawanDashboard.classList.toggle('active', navKey === 'dashboard');
  if (menuKaryawanPengajuanSaya) menuKaryawanPengajuanSaya.classList.toggle('active', navKey === 'pengajuan');
  if (menuKaryawanRiwayat) menuKaryawanRiwayat.classList.toggle('active', navKey === 'riwayat');

  if (karyawanDashboardPage) karyawanDashboardPage.style.display = navKey === 'dashboard' ? 'block' : 'none';
  if (karyawanPengajuanPage) karyawanPengajuanPage.style.display = navKey === 'pengajuan' ? 'block' : 'none';
  if (karyawanRiwayatPage) karyawanRiwayatPage.style.display = navKey === 'riwayat' ? 'block' : 'none';

  if (typeof window.renderKaryawanView === 'function') {
    window.renderKaryawanView();
  }
}

function setApproverNav(navKey) {
  currentApproverNav = navKey;
  window.currentApproverNav = navKey;
  closeMobileSidebar();

  const menuApproverDashboard = document.getElementById('menuApproverDashboard');
  const menuApproverAntrian = document.getElementById('menuApproverAntrian');
  const menuApproverPelacakan = document.getElementById('menuApproverPelacakan');

  const approverDashboardPage = document.getElementById('approverDashboardPage');
  const approverAntrianPage = document.getElementById('approverAntrianPage');
  const approverPelacakanPage = document.getElementById('approverPelacakanPage');

  if (menuApproverDashboard) menuApproverDashboard.classList.toggle('active', navKey === 'dashboard');
  if (menuApproverAntrian) menuApproverAntrian.classList.toggle('active', navKey === 'antrian');
  if (menuApproverPelacakan) menuApproverPelacakan.classList.toggle('active', navKey === 'pelacakan');

  if (approverDashboardPage) approverDashboardPage.style.display = navKey === 'dashboard' ? 'block' : 'none';
  if (approverAntrianPage) approverAntrianPage.style.display = navKey === 'antrian' ? 'block' : 'none';
  if (approverPelacakanPage) approverPelacakanPage.style.display = navKey === 'pelacakan' ? 'block' : 'none';

  if (typeof window.renderApproverView === 'function') {
    window.renderApproverView();
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

  const securityDashboardPage = document.getElementById('securityDashboardPage');
  const securityScannerPage = document.getElementById('securityScannerPage');
  const securityPelacakanPage = document.getElementById('securityPelacakanPage');
  const securityRiwayatPage = document.getElementById('securityRiwayatPage');

  if (menuSecurityDashboard) menuSecurityDashboard.classList.toggle('active', navKey === 'dashboard');
  if (menuSecurityScanner) menuSecurityScanner.classList.toggle('active', navKey === 'scanner');
  if (menuSecurityPelacakan) menuSecurityPelacakan.classList.toggle('active', navKey === 'pelacakan');
  if (menuSecurityRiwayat) menuSecurityRiwayat.classList.toggle('active', navKey === 'riwayat');

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

  if (btnSwitchKaryawan) btnSwitchKaryawan.classList.remove('active');
  if (btnSwitchApprover) btnSwitchApprover.classList.remove('active', 'approver');
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
    if (typeof window.showToast === 'function') window.showToast('Beralih ke mode Karyawan (Budi Pratama)', 'info');
  } else if (role === 'approver') {
    if (btnSwitchApprover) btnSwitchApprover.classList.add('active', 'approver');
    if (viewApprover) viewApprover.style.display = 'block';
    if (navApproverGroup) navApproverGroup.style.display = 'flex';

    if (roleBadge) {
      roleBadge.className = 'role-tag-pill role-approver';
      roleBadge.textContent = 'Peran: Atasan (Manager)';
    }
    if (sidebarUserName && ACTORS) sidebarUserName.textContent = ACTORS.approver.name;
    if (sidebarUserSub && ACTORS) sidebarUserSub.textContent = `NIP: ${ACTORS.approver.nip}`;

    setApproverNav(currentApproverNav || 'dashboard');
    if (typeof window.showToast === 'function') window.showToast('Beralih ke mode Atasan / Approver (Ir. Hendra Gunawan)', 'info');
  } else if (role === 'security') {
    if (btnSwitchSecurity) btnSwitchSecurity.classList.add('active', 'security');
    if (viewSecurity) viewSecurity.style.display = 'block';
    if (navSecurityGroup) navSecurityGroup.style.display = 'flex';

    if (roleBadge) {
      roleBadge.className = 'role-tag-pill role-security';
      roleBadge.textContent = 'Peran: Petugas Pengamanan';
    }
    if (sidebarUserName && ACTORS) sidebarUserName.textContent = ACTORS.security.name;
    if (sidebarUserSub && ACTORS) sidebarUserSub.textContent = `NIP: ${ACTORS.security.nip} • ${ACTORS.security.gateName}`;

    setSecurityNav(currentSecurityNav || 'dashboard');
    if (typeof window.showToast === 'function') window.showToast('Beralih ke mode Pos Jaga Pengamanan (Sertu Agus)', 'info');
  } else if (role === 'admin') {
    if (btnSwitchAdmin) btnSwitchAdmin.classList.add('active', 'admin');
    if (viewAdmin) viewAdmin.style.display = 'block';
    if (navAdminGroup) navAdminGroup.style.display = 'flex';

    if (roleBadge) {
      roleBadge.className = 'role-tag-pill role-admin';
      roleBadge.textContent = 'Peran: Administrator Pengamanan & K3';
    }
    if (sidebarUserName && ACTORS) sidebarUserName.textContent = ACTORS.admin.name;
    if (sidebarUserSub && ACTORS) sidebarUserSub.textContent = `NIP: ${ACTORS.admin.nip} • ${ACTORS.admin.office}`;

    setAdminNav(currentAdminNav || 'dashboard');
    if (typeof window.showToast === 'function') window.showToast('Beralih ke mode Administrator Pengamanan & K3 (Bambang Sutrisno)', 'info');
  }
}

// BIND LISTENERS
document.addEventListener('DOMContentLoaded', () => {
  const btnToggleSidebar = document.getElementById('btnToggleSidebar');
  const btnCloseSidebarMobile = document.getElementById('btnCloseSidebarMobile');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  if (btnToggleSidebar) btnToggleSidebar.addEventListener('click', toggleSidebar);
  if (btnCloseSidebarMobile) btnCloseSidebarMobile.addEventListener('click', closeMobileSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileSidebar);

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
  const btnSwitchSecurity = document.getElementById('btnSwitchSecurity');
  const btnSwitchAdmin = document.getElementById('btnSwitchAdmin');

  if (btnSwitchKaryawan) btnSwitchKaryawan.addEventListener('click', () => switchRole('karyawan'));
  if (btnSwitchApprover) btnSwitchApprover.addEventListener('click', () => switchRole('approver'));
  if (btnSwitchSecurity) btnSwitchSecurity.addEventListener('click', () => switchRole('security'));
  if (btnSwitchAdmin) btnSwitchAdmin.addEventListener('click', () => switchRole('admin'));

  setInterval(updateClock, 1000);
  updateClock();
});

// Expose globally
window.updateClock = updateClock;
window.toggleSidebar = toggleSidebar;
window.closeMobileSidebar = closeMobileSidebar;
window.setKaryawanNav = setKaryawanNav;
window.setApproverNav = setApproverNav;
window.setSecurityNav = setSecurityNav;
window.setAdminNav = setAdminNav;
window.switchRole = switchRole;
