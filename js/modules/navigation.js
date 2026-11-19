/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Navigation Controllers, Role Switcher, Clock & Responsive Sidebar
 */

let currentKaryawanNav = (function () { try { return sessionStorage.getItem('KUJANG_KARYAWAN_NAV') || localStorage.getItem('KUJANG_KARYAWAN_NAV'); } catch (e) { return null; } })() || 'dashboard';
let currentApproverNav = (function () { try { return sessionStorage.getItem('KUJANG_APPROVER_NAV') || localStorage.getItem('KUJANG_APPROVER_NAV'); } catch (e) { return null; } })() || 'dashboard';
let currentSecurityNav = (function () { try { return sessionStorage.getItem('KUJANG_SEC_NAV') || localStorage.getItem('KUJANG_SEC_NAV'); } catch (e) { return null; } })() || 'dashboard';
let currentAdminNav = (function () { try { return sessionStorage.getItem('KUJANG_ADMIN_NAV') || localStorage.getItem('KUJANG_ADMIN_NAV'); } catch (e) { return null; } })() || 'dashboard';

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

// Centralized helper to ensure strictly ONE actor view is visible at a time
function showOnlyActorView(targetViewId) {
  const views = ['viewKaryawan', 'viewApprover', 'viewSecurity', 'viewAdmin', 'viewNotifikasi'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === targetViewId) ? 'block' : 'none';
  });
}
window.showOnlyActorView = showOnlyActorView;

// NAVIGATION PER ACTOR
function setKaryawanNav(navKey) {
  currentKaryawanNav = navKey;
  window.currentKaryawanNav = navKey;
  try {
    sessionStorage.setItem('KUJANG_KARYAWAN_NAV', navKey);
    localStorage.setItem('KUJANG_KARYAWAN_NAV', navKey);
  } catch (e) {}
  closeMobileSidebar();

  showOnlyActorView('viewKaryawan');

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
  try {
    sessionStorage.setItem('KUJANG_APPROVER_NAV', navKey);
    localStorage.setItem('KUJANG_APPROVER_NAV', navKey);
  } catch (e) {}
  closeMobileSidebar();

  showOnlyActorView('viewApprover');

  const menuApproverDashboard = document.getElementById('menuApproverDashboard');
  const menuApproverAntrian = document.getElementById('menuApproverAntrian');
  const menuApproverPelacakan = document.getElementById('menuApproverPelacakan');
  const menuApproverRiwayat = document.getElementById('menuApproverRiwayat');

  const bnavAppDashboard = document.getElementById('bnavAppDashboard');
  const bnavAppAntrian = document.getElementById('bnavAppAntrian');
  const bnavAppPelacakan = document.getElementById('bnavAppPelacakan');
  const bnavAppRiwayat = document.getElementById('bnavAppRiwayat');

  const approverDashboardPage = document.getElementById('approverDashboardPage');
  const approverAntrianPage = document.getElementById('approverAntrianPage');
  const approverPelacakanPage = document.getElementById('approverPelacakanPage');
  const approverRiwayatPage = document.getElementById('approverRiwayatPage');

  if (menuApproverDashboard) menuApproverDashboard.classList.toggle('active', navKey === 'dashboard');
  if (menuApproverAntrian) menuApproverAntrian.classList.toggle('active', navKey === 'antrian');
  if (menuApproverPelacakan) menuApproverPelacakan.classList.toggle('active', navKey === 'pelacakan' || navKey === 'tim');
  if (menuApproverRiwayat) menuApproverRiwayat.classList.toggle('active', navKey === 'riwayat');

  if (bnavAppDashboard) bnavAppDashboard.classList.toggle('active', navKey === 'dashboard');
  if (bnavAppAntrian) bnavAppAntrian.classList.toggle('active', navKey === 'antrian');
  if (bnavAppPelacakan) bnavAppPelacakan.classList.toggle('active', navKey === 'pelacakan' || navKey === 'tim');
  if (bnavAppRiwayat) bnavAppRiwayat.classList.toggle('active', navKey === 'riwayat');

  if (approverDashboardPage) approverDashboardPage.style.display = navKey === 'dashboard' ? 'block' : 'none';
  if (approverAntrianPage) approverAntrianPage.style.display = navKey === 'antrian' ? 'block' : 'none';
  if (approverPelacakanPage) approverPelacakanPage.style.display = (navKey === 'pelacakan' || navKey === 'tim') ? 'block' : 'none';
  if (approverRiwayatPage) approverRiwayatPage.style.display = navKey === 'riwayat' ? 'block' : 'none';

  if (navKey === 'tim' || navKey === 'pelacakan') {
    const filterApproverStatus = document.getElementById('filterApproverStatus');
    if (filterApproverStatus && filterApproverStatus.value === 'Sedang di Luar') {
      filterApproverStatus.value = 'all';
    }
    const filterAppViewMode = document.getElementById('filterAppViewMode');
    if (filterAppViewMode && filterAppViewMode.value === 'outside') {
      filterAppViewMode.value = 'all';
    }
  } else if (navKey === 'riwayat') {
    const filterApproverStatus = document.getElementById('filterApproverStatus');
    if (filterApproverStatus) filterApproverStatus.value = 'all';
    const filterAppViewMode = document.getElementById('filterAppViewMode');
    if (filterAppViewMode) filterAppViewMode.value = 'all';
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
  try {
    sessionStorage.setItem('KUJANG_SEC_NAV', navKey);
    localStorage.setItem('KUJANG_SEC_NAV', navKey);
  } catch (e) {}
  closeMobileSidebar();

  showOnlyActorView('viewSecurity');

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
  try {
    sessionStorage.setItem('KUJANG_ADMIN_NAV', navKey);
    localStorage.setItem('KUJANG_ADMIN_NAV', navKey);
  } catch (e) {}
  closeMobileSidebar();

  showOnlyActorView('viewAdmin');

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
function findUserByRoleOrId(roleOrId, maybeId) {
  if (maybeId && typeof maybeId === 'object' && (maybeId.nip || maybeId.kujangId)) return maybeId;
  if (roleOrId && typeof roleOrId === 'object' && (roleOrId.nip || roleOrId.kujangId)) return roleOrId;

  const allUsers = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
  if (maybeId) {
    const byMaybe = allUsers.find(u => u.kujangId === maybeId || u.nip === maybeId || u.name === maybeId);
    if (byMaybe) return byMaybe;
  }
  if (roleOrId && (roleOrId.startsWith('KJG-') || roleOrId.startsWith('PK-') || roleOrId.startsWith('SEC-') || roleOrId.startsWith('ADM-'))) {
    const byId = allUsers.find(u => u.kujangId === roleOrId || u.nip === roleOrId);
    if (byId) return byId;
  }
  if (roleOrId === 'karyawan') {
    if (window.activeEmployeeUser) return window.activeEmployeeUser;
    return allUsers.find(u => u.kujangId === 'KJG-991024' || u.nip === 'PK-2024-8841' || (u.name && u.name.includes('Budi Pratama'))) ||
           allUsers.find(u => u.roleKey === 'karyawan');
  }
  if (roleOrId === 'karyawan2') {
    return allUsers.find(u => u.kujangId === 'KJG-991025' || u.nip === 'PK-2024-8842' || (u.name && u.name.includes('Arthur Morgan'))) ||
           allUsers.find(u => u.roleKey === 'karyawan2');
  }
  if (roleOrId === 'approver') {
    if (window.activeApproverUser && (window.activeApproverUser.roleKey === 'approver' || window.activeApproverUser.role === 'approver')) {
      return window.activeApproverUser;
    }
    const cur = typeof window.getKujangCurrentUser === 'function' ? window.getKujangCurrentUser() : null;
    if (cur && (cur.roleKey === 'approver' || cur.role === 'approver')) return cur;
    return allUsers.find(u => u.roleKey === 'approver' && u.status === 'Aktif') ||
           allUsers.find(u => u.roleKey === 'approver');
  }
  if (roleOrId === 'approver2') {
    if (window.activeApproverUser && (window.activeApproverUser.roleKey === 'approver2' || window.activeApproverUser.role === 'approver2')) {
      return window.activeApproverUser;
    }
    const cur = typeof window.getKujangCurrentUser === 'function' ? window.getKujangCurrentUser() : null;
    if (cur && (cur.roleKey === 'approver2' || cur.role === 'approver2')) return cur;
    return allUsers.find(u => u.roleKey === 'approver2' && u.status === 'Aktif') ||
           allUsers.find(u => u.roleKey === 'approver2');
  }
  if (roleOrId === 'security') {
    if (window.activeSecurityUser) return window.activeSecurityUser;
    try {
      const savedSecNip = localStorage.getItem('KUJANG_ACTIVE_SEC_NIP');
      if (savedSecNip) {
        const found = allUsers.find(u => u.nip === savedSecNip && u.status === 'Aktif');
        if (found) {
          window.activeSecurityUser = found;
          return found;
        }
      }
    } catch (e) {}
    const activeGate = (typeof localStorage !== 'undefined') ? (localStorage.getItem('KUJANG_ACTIVE_GATE') || 'Pos 1') : 'Pos 1';
    const gateShort = activeGate.includes('Pos 2') ? 'Pos 2' : (activeGate.includes('Pos 3') ? 'Pos 3' : 'Pos 1');
    return allUsers.find(u => (u.roleKey === 'security' || (u.role && u.role.includes('Pengamanan'))) && u.role && u.role.includes(gateShort) && u.status === 'Aktif') ||
           allUsers.find(u => u.roleKey === 'security' && u.status === 'Aktif') ||
           allUsers.find(u => u.nip === 'SEC-2018-042');
  }
  if (roleOrId === 'admin') {
    return allUsers.find(u => u.roleKey === 'admin' || u.kujangId === 'KJG-101001' || (u.name && u.name.includes('Bambang')));
  }
  return allUsers.find(u => u.roleKey === roleOrId || u.kujangId === roleOrId);
}
window.findUserByRoleOrId = findUserByRoleOrId;
function isCurrentUserAccessRevoked() {
  const currentActor = window.currentActor || 'karyawan';
  const targetUser = (typeof window.findUserByRoleOrId === 'function') 
    ? window.findUserByRoleOrId(currentActor) 
    : null;
  if (targetUser && (targetUser.status === 'Dicabut' || targetUser.status === 'Nonaktif')) {
    return targetUser;
  }
  return null;
}
window.isCurrentUserAccessRevoked = isCurrentUserAccessRevoked;

function guardActiveFeatureAccess() {
  const revokedUser = isCurrentUserAccessRevoked();
  if (revokedUser) {
    const revokedMsg = `Hak akses untuk akun <strong>${revokedUser.name}</strong> (${revokedUser.role || revokedUser.roleKey}) telah <strong>DICABUT</strong> oleh Administrator.<br><br>Anda tidak dapat menggunakan fitur dalam sistem ini sebelum hak akses diaktifkan kembali oleh Administrator.`;
    if (typeof window.openNoticeModal === 'function') {
      window.openNoticeModal({
        title: 'Hak Akses Anda Telah Dicabut',
        message: revokedMsg,
        buttonText: 'Batal'
      });
    } else {
      alert(`[HAK AKSES DICABUT]\n\nAkun Anda (${revokedUser.name}) telah dicabut oleh Administrator.`);
    }
    return false;
  }
  return true;
}
window.guardActiveFeatureAccess = guardActiveFeatureAccess;


function switchRole(role, kujangId) {
  // Reset seluruh state upload file & rombongan agar tidak bocor antar akun (Multi-Aktor Clean State)
  if (typeof window.resetAllDinasUploadState === 'function') {
    window.resetAllDinasUploadState();
  }

  // Normalisasi parameter role ke roleKey standar sistem ('karyawan', 'karyawan2', 'approver', 'approver2', 'security', 'admin')
  if (typeof role === 'object' && role) {
    if (!kujangId) kujangId = role;
    role = role.roleKey || role.role || 'karyawan';
  }
  if (typeof role === 'string') {
    const rLower = role.trim().toLowerCase();
    if (rLower === 'admin' || rLower.includes('administrator')) role = 'admin';
    else if (rLower === 'approver' || rLower.includes('manager') || rLower.includes('atasan 1')) role = 'approver';
    else if (rLower === 'approver2' || rLower.includes('supervisor') || rLower.includes('plt') || rLower.includes('atasan 2')) role = 'approver2';
    else if (rLower === 'security' || rLower.includes('pos') || rLower.includes('satpam') || rLower.includes('pengamanan')) role = 'security';
    else if (rLower === 'karyawan2') role = 'karyawan2';
    else if (rLower.includes('karyawan')) role = 'karyawan';
  }

  // Validasi Hak Akses: Cegah akses jika status akun dicabut/nonaktif oleh Admin
  let deletedList = [];
  try {
    deletedList = JSON.parse(localStorage.getItem('KUJANG_DELETED_USERS') || '[]');
  } catch(e) {}

  const targetUser = findUserByRoleOrId(role, kujangId);
  const targetNip = (typeof kujangId === 'string' && (kujangId.startsWith('PK-') || kujangId.startsWith('SEC-') || kujangId.startsWith('ADM-'))) 
    ? kujangId 
    : (targetUser ? targetUser.nip : (typeof kujangId === 'object' && kujangId ? kujangId.nip : null));
  const targetKujang = (typeof kujangId === 'string' && kujangId.startsWith('KJG-')) 
    ? kujangId 
    : (targetUser ? targetUser.kujangId : (typeof kujangId === 'object' && kujangId ? kujangId.kujangId : null));
  const targetName = targetUser ? targetUser.name : (typeof kujangId === 'object' && kujangId ? kujangId.name : null);

  const isDeleted = deletedList.find(d =>
    (targetNip && d.nip && d.nip.toLowerCase() === targetNip.toLowerCase()) ||
    (targetKujang && d.kujangId && d.kujangId.toLowerCase() === targetKujang.toLowerCase()) ||
    (targetName && d.name && d.name.toLowerCase() === targetName.toLowerCase())
  );

  if (isDeleted) {
    const delMsg = `Akun <strong>${isDeleted.name || isDeleted.kujangId || role}</strong> (${isDeleted.nip || isDeleted.kujangId || ''}) telah <strong>DIHAPUS</strong> oleh Administrator dari sistem PT Pupuk Kujang.<br><br>Akun ini tidak lagi memiliki hak akses dan tidak dapat digunakan.`;
    if (typeof window.openNoticeModal === 'function') {
      window.openNoticeModal({
        title: 'Hak Akses Anda Telah Dihapus',
        message: delMsg,
        buttonText: 'Batal'
      });
    } else {
      alert(`[HAK AKSES DIHAPUS]\n\nAkun ${isDeleted.kujangId || role} telah dihapus dari sistem.`);
    }
    return false;
  }

  // Check user access revocation (Admin Access Control)
  const users = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
  const matchedUser = targetUser || (role === 'karyawan' && window.activeEmployeeUser) || users.find(u => u.roleKey === role && u.status === 'Aktif') || users.find(u => u.roleKey === role);

  if (matchedUser && (matchedUser.status === 'Dicabut' || matchedUser.status === 'Nonaktif')) {
    const revokedMsg = `Hak akses untuk akun <strong>${matchedUser.name}</strong> (${matchedUser.role || matchedUser.roleKey}) telah <strong>DICABUT</strong> oleh Administrator.<br><br>Sesuai tata kelola keamanan PT Pupuk Kujang, Anda <strong>TIDAK DAPAT MASUK</strong> ke akun ini sebelum hak akses diaktifkan kembali di Direktori Admin.`;
    if (typeof window.openNoticeModal === 'function') {
      window.openNoticeModal({
        title: 'Hak Akses Anda Telah Dicabut',
        message: revokedMsg,
        buttonText: 'Ok'
      });
    } else {
      alert(`[HAK AKSES DICABUT]\n\nAkun Anda (${matchedUser.name}) telah dicabut oleh Administrator.`);
    }
    return false;
  }

  if (role !== 'security' && typeof window.stopCameraScanner === 'function') {
    window.stopCameraScanner();
  }
  if (typeof window.mobileCloseSheet === 'function') {
    window.mobileCloseSheet();
  }
  const modalTicketDetail = document.getElementById('modalTicketDetail');
  if (modalTicketDetail) {
    modalTicketDetail.classList.remove('open');
    modalTicketDetail.style.display = 'none';
  }
  const modalRejectReason = document.getElementById('modalRejectReason');
  if (modalRejectReason) {
    modalRejectReason.classList.remove('open');
    modalRejectReason.style.display = 'none';
  }
  const modalBackdrop = document.getElementById('modalBackdrop');
  if (modalBackdrop) {
    modalBackdrop.classList.remove('open');
    modalBackdrop.style.display = 'none';
  }
  const mobileModalBackdrop = document.getElementById('mobileModalBackdrop');
  if (mobileModalBackdrop) {
    mobileModalBackdrop.classList.remove('open');
    mobileModalBackdrop.style.display = 'none';
  }

  window.currentActor = role;
  currentActor = role;
  closeMobileSidebar();

  const ACTORS = window.ACTORS || {};

  // Sinkronisasi state akun aktif & ACTORS
  if (role === 'karyawan') {
    if (matchedUser && matchedUser.nip !== 'PK-2024-8841') {
      window.activeEmployeeUser = matchedUser;
      try { localStorage.setItem('KUJANG_ACTIVE_EMP_NIP', matchedUser.nip); } catch (e) {}
    } else if (matchedUser && matchedUser.nip === 'PK-2024-8841') {
      window.activeEmployeeUser = null;
      try { localStorage.removeItem('KUJANG_ACTIVE_EMP_NIP'); } catch (e) {}
    }
    if (matchedUser && ACTORS && ACTORS.karyawan) {
      ACTORS.karyawan.name = matchedUser.name;
      ACTORS.karyawan.nip = matchedUser.nip;
      if (matchedUser.department) ACTORS.karyawan.department = matchedUser.department;
      if (matchedUser.role || matchedUser.title) ACTORS.karyawan.title = matchedUser.role || matchedUser.title;
      if (matchedUser.directSupervisor || matchedUser.supervisor) {
        ACTORS.karyawan.approverName = matchedUser.directSupervisor || matchedUser.supervisor;
      }
    }
  } else if (role === 'approver' || role === 'approver2') {
    const isApp2 = (role === 'approver2');
    let targetApprover = (matchedUser && matchedUser.nip) ? matchedUser : null;
    if (!targetApprover && window.activeApproverUser && window.activeApproverUser.nip) {
      const isUserApp2 = window.activeApproverUser.roleKey === 'approver2' || (window.activeApproverUser.role && window.activeApproverUser.role.includes('Atasan 2'));
      if (isApp2 === isUserApp2) {
        targetApprover = window.activeApproverUser;
      }
    }
    if (!targetApprover) {
      try {
        const savedNip = localStorage.getItem('KUJANG_ACTIVE_APPR_NIP');
        if (savedNip) {
          const found = users.find(u => u.nip === savedNip && u.status === 'Aktif');
          if (found) {
            const isFoundApp2 = found.roleKey === 'approver2' || (found.role && found.role.includes('Atasan 2'));
            if (isApp2 === isFoundApp2) targetApprover = found;
          }
        }
      } catch (e) {}
    }
    if (!targetApprover) {
      targetApprover = users.find(u => u.roleKey === role && u.status === 'Aktif') ||
                       users.find(u => u.roleKey === role);
    }

    if (targetApprover) {
      window.activeApproverUser = targetApprover;
      try { localStorage.setItem('KUJANG_ACTIVE_APPR_NIP', targetApprover.nip); } catch (e) {}
      if (ACTORS) {
        if (isApp2) {
          ACTORS.approver2 = {
            name: targetApprover.name,
            nip: targetApprover.nip,
            title: targetApprover.role || targetApprover.title || 'Supervisor / Plt',
            department: targetApprover.department || 'Departemen Rekayasa & Pemeliharaan',
            roleLabel: 'Atasan 2 (Supervisor / Plt)'
          };
        } else {
          ACTORS.approver = {
            name: targetApprover.name,
            nip: targetApprover.nip,
            title: targetApprover.role || targetApprover.title || 'Manager',
            department: targetApprover.department || 'Departemen Rekayasa & Pemeliharaan',
            roleLabel: 'Atasan 1 (Manager)'
          };
        }
      }
    }
  } else if (role === 'security') {
    if (matchedUser && matchedUser.nip !== 'SEC-2018-042') {
      window.activeSecurityUser = matchedUser;
      try { localStorage.setItem('KUJANG_ACTIVE_SEC_NIP', matchedUser.nip); } catch (e) {}
    } else if (matchedUser && matchedUser.nip === 'SEC-2018-042') {
      window.activeSecurityUser = matchedUser;
      try { localStorage.setItem('KUJANG_ACTIVE_SEC_NIP', 'SEC-2018-042'); } catch (e) {}
    }
    if (matchedUser && ACTORS && ACTORS.security) {
      ACTORS.security.name = matchedUser.name;
      ACTORS.security.nip = matchedUser.nip;
      if (matchedUser.role) ACTORS.security.title = matchedUser.role;
    }
  }

  // Sinkronisasikan dengan sesi KUJANG ID (auth.js)
  if (matchedUser && typeof window.setKujangCurrentUser === 'function') {
    window.setKujangCurrentUser(matchedUser);
  }
  window.currentMobileRole = role;
  try {
    sessionStorage.setItem('KUJANG_ACTIVE_ROLE', role);
    localStorage.setItem('KUJANG_ACTIVE_ROLE', role);
    sessionStorage.setItem('KUJANG_MOBILE_ACTIVE_ROLE', role);
    localStorage.setItem('KUJANG_MOBILE_ACTIVE_ROLE', role);
  } catch (e) {}

  // Update Avatar Sidebar
  const sidebarAvatarCircle = document.getElementById('sidebarAvatarCircle');
  if (sidebarAvatarCircle && typeof window.renderUserPhoto === 'function') {
    let activeActorName = matchedUser ? matchedUser.name : 'Budi Pratama, S.T.';
    if (!matchedUser) {
      if (role === 'karyawan') activeActorName = (ACTORS && ACTORS.karyawan) ? ACTORS.karyawan.name : 'Budi Pratama, S.T.';
      else if (role === 'karyawan2') activeActorName = (ACTORS && ACTORS.karyawan2) ? ACTORS.karyawan2.name : 'Arthur Morgan, S.Tr.T.';
      else if (role === 'approver') activeActorName = (ACTORS && ACTORS.approver) ? ACTORS.approver.name : 'Ir. Hendra Gunawan, M.T.';
      else if (role === 'approver2') activeActorName = (ACTORS && ACTORS.approver2) ? ACTORS.approver2.name : 'Dewi Sartika, S.T., M.M.';
      else if (role === 'security') activeActorName = 'Sertu Agus';
      else if (role === 'admin') activeActorName = (ACTORS && ACTORS.admin) ? ACTORS.admin.name : 'Bambang Sutrisno, S.T.';
    }
    sidebarAvatarCircle.innerHTML = window.renderUserPhoto(activeActorName, 36);
  }

  const btnSwitchKaryawan = document.getElementById('btnRoleKaryawan') || document.getElementById('btnSwitchKaryawan');
  const btnSwitchKaryawan2 = document.getElementById('btnRoleKaryawan') || document.getElementById('btnSwitchKaryawan2');
  const btnSwitchApprover = document.getElementById('btnRoleApprover') || document.getElementById('btnSwitchApprover');
  const btnSwitchApprover2 = document.getElementById('btnRoleApprover') || document.getElementById('btnSwitchApprover2');
  const btnSwitchSecurity = document.getElementById('btnRoleSecurity') || document.getElementById('btnSwitchSecurity');
  const btnSwitchAdmin = document.getElementById('btnRoleAdmin') || document.getElementById('btnSwitchAdmin');

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

  if (typeof window.checkOverdueAndExpiredTickets === 'function') {
    window.checkOverdueAndExpiredTickets(true);
  }

  if (btnSwitchKaryawan) btnSwitchKaryawan.classList.remove('active');
  if (btnSwitchKaryawan2) btnSwitchKaryawan2.classList.remove('active');
  if (btnSwitchApprover) btnSwitchApprover.classList.remove('active', 'approver');
  if (btnSwitchApprover2) btnSwitchApprover2.classList.remove('active', 'approver');
  if (btnSwitchSecurity) btnSwitchSecurity.classList.remove('active', 'security');
  if (btnSwitchAdmin) btnSwitchAdmin.classList.remove('active', 'admin');

  if (viewKaryawan) viewKaryawan.style.display = 'none';
  if (viewApprover) viewApprover.style.display = 'none';
  if (viewSecurity) viewSecurity.style.display = 'none';
  if (viewAdmin) viewAdmin.style.display = 'none';
  const viewNotifEl = document.getElementById('viewNotifikasi');
  if (viewNotifEl) viewNotifEl.style.display = 'none';

  if (navKaryawanGroup) navKaryawanGroup.style.display = 'none';
  if (navApproverGroup) navApproverGroup.style.display = 'none';
  if (navSecurityGroup) navSecurityGroup.style.display = 'none';
  if (navAdminGroup) navAdminGroup.style.display = 'none';

  if (role === 'karyawan') {
    if (btnSwitchKaryawan) btnSwitchKaryawan.classList.add('active');
    if (viewKaryawan) viewKaryawan.style.display = 'block';
    if (navKaryawanGroup) navKaryawanGroup.style.display = 'flex';

    const empObj = matchedUser || (ACTORS && ACTORS.karyawan) || { name: 'Budi Pratama, S.T.', nip: 'PK-2024-8841' };
    if (roleBadge) {
      roleBadge.className = 'role-tag-pill role-karyawan';
      roleBadge.textContent = 'Peran: Karyawan';
    }
    if (sidebarUserName) sidebarUserName.textContent = empObj.name;
    if (sidebarUserSub) sidebarUserSub.textContent = `NIP: ${empObj.nip}`;

    setKaryawanNav(currentKaryawanNav || 'dashboard');
    if (typeof window.showToast === 'function') window.showToast(`Beralih ke akun ${empObj.name}`, 'info');
  } else if (role === 'karyawan2') {
    if (btnSwitchKaryawan2) btnSwitchKaryawan2.classList.add('active');
    if (viewKaryawan) viewKaryawan.style.display = 'block';
    if (navKaryawanGroup) navKaryawanGroup.style.display = 'flex';

    const actK2 = matchedUser || (ACTORS && ACTORS.karyawan2) || { name: 'Arthur Morgan, S.Tr.T.', nip: 'PK-2024-8842' };
    if (roleBadge) {
      roleBadge.className = 'role-tag-pill role-karyawan';
      roleBadge.textContent = 'Peran: Karyawan 2';
    }
    if (sidebarUserName) sidebarUserName.textContent = actK2.name;
    if (sidebarUserSub) sidebarUserSub.textContent = `NIP: ${actK2.nip}`;

    setKaryawanNav(currentKaryawanNav || 'dashboard');
    if (typeof window.showToast === 'function') window.showToast(`Beralih ke mode Karyawan 2 (${actK2.name})`, 'info');
  } else if (role === 'approver') {
    if (btnSwitchApprover) btnSwitchApprover.classList.add('active', 'approver');
    if (viewApprover) viewApprover.style.display = 'block';
    if (navApproverGroup) navApproverGroup.style.display = 'flex';

    const app1Obj = window.activeApproverUser || matchedUser || (ACTORS && ACTORS.approver);
    window.activeApproverUser = app1Obj;
    if (window.ACTORS && app1Obj) {
      window.ACTORS.approver = {
        name: app1Obj.name,
        nip: app1Obj.nip,
        title: app1Obj.role || app1Obj.title || 'Manager',
        department: app1Obj.department || 'Departemen Rekayasa & Pemeliharaan',
        roleLabel: 'Atasan 1 (Manager)'
      };
    }

    if (roleBadge) {
      roleBadge.className = 'role-tag-pill role-approver';
      roleBadge.textContent = 'Peran: Atasan (Manager)';
    }
    if (sidebarUserName) sidebarUserName.textContent = app1Obj.name;
    if (sidebarUserSub) sidebarUserSub.textContent = `NIP: ${app1Obj.nip}`;
    if (sidebarAvatarCircle && typeof window.renderUserPhoto === 'function') {
      sidebarAvatarCircle.innerHTML = window.renderUserPhoto(app1Obj.name, 36);
    }

    setApproverNav(currentApproverNav || 'dashboard');
    if (typeof window.showToast === 'function') window.showToast(`Beralih ke mode Atasan (${app1Obj.name})`, 'info');
  } else if (role === 'approver2') {
    if (btnSwitchApprover2) btnSwitchApprover2.classList.add('active', 'approver');
    if (viewApprover) viewApprover.style.display = 'block';
    if (navApproverGroup) navApproverGroup.style.display = 'flex';

    const act2 = window.activeApproverUser || matchedUser || (ACTORS && ACTORS.approver2);
    window.activeApproverUser = act2;
    if (window.ACTORS && act2) {
      window.ACTORS.approver2 = {
        name: act2.name,
        nip: act2.nip,
        title: act2.role || act2.title || 'Supervisor Operasional Lapangan (Plt. Manager)',
        department: act2.department || 'Departemen Rekayasa & Pemeliharaan',
        roleLabel: 'Atasan 2 (Supervisor / Plt)'
      };
    }

    if (roleBadge) {
      roleBadge.className = 'role-tag-pill role-approver';
      roleBadge.textContent = 'Peran: Atasan 2 (Supervisor / Plt)';
    }
    if (sidebarUserName) sidebarUserName.textContent = act2.name;
    if (sidebarUserSub) sidebarUserSub.textContent = `NIP: ${act2.nip}`;
    if (sidebarAvatarCircle && typeof window.renderUserPhoto === 'function') {
      sidebarAvatarCircle.innerHTML = window.renderUserPhoto(act2.name, 36);
    }

    setApproverNav(currentApproverNav || 'dashboard');
    if (typeof window.showToast === 'function') window.showToast(`Beralih ke mode Atasan 2 (${act2.name})`, 'info');
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
  if (typeof window.updateNotificationBadges === 'function') {
    window.updateNotificationBadges();
  }

  // Synchronize Mobile App Orchestrator if active
  if (typeof window.syncMobileRole === 'function') {
    window.syncMobileRole(role);
  }

  if (typeof updateTopbarRoleLabels === 'function') {
    updateTopbarRoleLabels();
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
  document.body.classList.toggle('role-is-approver', role === 'approver' || role === 'approver2');
  document.body.classList.toggle('role-is-security', role === 'security');
  document.body.classList.toggle('role-is-karyawan', role === 'karyawan' || role === 'karyawan2');

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
  const menuApproverRiwayat = document.getElementById('menuApproverRiwayat');

  if (menuApproverDashboard) menuApproverDashboard.addEventListener('click', () => setApproverNav('dashboard'));
  if (menuApproverAntrian) menuApproverAntrian.addEventListener('click', () => setApproverNav('antrian'));
  if (menuApproverPelacakan) menuApproverPelacakan.addEventListener('click', () => setApproverNav('pelacakan'));
  if (menuApproverRiwayat) menuApproverRiwayat.addEventListener('click', () => setApproverNav('riwayat'));

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

  // Close role dropdowns on outside click or ESC key
  document.addEventListener('click', (e) => {
    const container = document.getElementById('roleSwitcherContainer');
    if (container && !container.contains(e.target)) {
      closeAllRoleDropdowns();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllRoleDropdowns();
      closeSelectDirectoryUserModal();
    }
  });

  updateTopbarRoleLabels();
  initRoleSwitcherScroll();
  initTheme();

  setInterval(updateClock, 1000);
  updateClock();
});

// ============================================================================
// COMPACT MULTI-ACTOR DROPDOWN & DIRECTORY ACCOUNT SELECTION (WEB ONLY)
// ============================================================================

const QUICK_SWITCH_STORAGE_KEY = 'KUJANG_QUICK_SWITCH_ACCOUNTS';

function getRoleItemShortName(fullName) {
  if (!fullName) return '';
  const clean = fullName.replace(/^(Ir\.|Drs\.|Dra\.|dr\.|Dr\.)\s*/i, '').trim();
  return clean.split(',')[0].trim();
}

function getQuickSwitchAccounts() {
  const defaults = {
    karyawan: [
      { nip: 'PK-2024-8841', name: 'Budi Pratama', fullTitle: 'Karyawan 1', roleKey: 'karyawan' },
      { nip: 'PK-2024-8842', name: 'Arthur Morgan', fullTitle: 'Karyawan 2', roleKey: 'karyawan2' }
    ],
    approver: [
      { nip: 'PK-2012-0543', name: 'Ahmad Subagja', fullTitle: 'Atasan 1 (Manager)', roleKey: 'approver' },
      { nip: 'PK-2012-0845', name: 'Dewi Sartika', fullTitle: 'Atasan 2 (Supervisor / Plt)', roleKey: 'approver2' }
    ],
    security: [
      { nip: 'SEC-2018-042', name: 'Sertu Agus', fullTitle: 'Pos 1 (Gerbang Utama)', roleKey: 'security', gateName: 'Pos 1 Gerbang Utama' },
      { nip: 'SEC-2019-088', name: 'Kopral Dani', fullTitle: 'Pos 2 (Gerbang Barat)', roleKey: 'security', gateName: 'Pos 2 Gerbang Barat' },
      { nip: 'SEC-2020-105', name: 'Praka Ilham', fullTitle: 'Pos 3 (Gerbang Timur)', roleKey: 'security', gateName: 'Pos 3 Gerbang Timur' }
    ]
  };

  let deletedList = [];
  try {
    deletedList = JSON.parse(localStorage.getItem('KUJANG_DELETED_USERS') || '[]');
  } catch (e) {}
  const deletedNips = new Set(deletedList.map(d => (d.nip || '').trim().toLowerCase()).filter(Boolean));
  const deletedNames = new Set(deletedList.map(d => (d.name || '').trim().toLowerCase()).filter(Boolean));

  let store = defaults;
  try {
    const saved = localStorage.getItem(QUICK_SWITCH_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      store = {
        karyawan: (parsed.karyawan && parsed.karyawan.length) ? parsed.karyawan : defaults.karyawan,
        approver: (parsed.approver && parsed.approver.length) ? parsed.approver : defaults.approver,
        security: (parsed.security && parsed.security.length) ? parsed.security : defaults.security
      };
    }
  } catch (e) {}

  // Filter keluar akun yang sudah dihapus oleh Admin & pastikan tidak ada duplikasi
  ['karyawan', 'approver', 'security'].forEach(cat => {
    if (store[cat] && Array.isArray(store[cat])) {
      const seen = new Set();
      store[cat] = store[cat].filter(a => {
        if (!a) return false;
        const nipK = (a.nip || '').trim().toLowerCase();
        const nameK = (a.name || '').trim().toLowerCase();
        if (nipK && deletedNips.has(nipK)) return false;
        if (nameK && deletedNames.has(nameK)) return false;

        for (const dn of deletedNames) {
          if (nameK && (dn.includes(nameK) || nameK.includes(dn))) return false;
        }

        const dedupKey = nipK || nameK;
        if (dedupKey && seen.has(dedupKey)) return false;
        if (dedupKey) seen.add(dedupKey);
        return true;
      });
    }
  });

  return store;
}

function saveQuickSwitchAccounts(data) {
  try {
    localStorage.setItem(QUICK_SWITCH_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

function updateTopbarRoleLabels() {
  const role = window.currentActor || 'karyawan';

  const btnKaryawan = document.getElementById('btnRoleKaryawan') || document.getElementById('btnSwitchKaryawan');
  const btnApprover = document.getElementById('btnRoleApprover') || document.getElementById('btnSwitchApprover');
  const btnSecurity = document.getElementById('btnRoleSecurity') || document.getElementById('btnSwitchSecurity');
  const btnAdmin = document.getElementById('btnRoleAdmin') || document.getElementById('btnSwitchAdmin');

  const lblKaryawan = document.getElementById('labelRoleKaryawan');
  const lblApprover = document.getElementById('labelRoleApprover');
  const lblSecurity = document.getElementById('labelRoleSecurity');

  if (lblKaryawan) lblKaryawan.textContent = 'Karyawan';
  if (lblApprover) lblApprover.textContent = 'Atasan';
  if (lblSecurity) lblSecurity.textContent = 'Pos Jaga';

  if (btnKaryawan) btnKaryawan.classList.remove('active');
  if (btnApprover) btnApprover.classList.remove('active', 'approver');
  if (btnSecurity) btnSecurity.classList.remove('active', 'security');
  if (btnAdmin) btnAdmin.classList.remove('active', 'admin');

  if (role === 'karyawan' || role === 'karyawan2') {
    if (btnKaryawan) btnKaryawan.classList.add('active');
  } else if (role === 'approver' || role === 'approver2') {
    if (btnApprover) btnApprover.classList.add('active', 'approver');
  } else if (role === 'security') {
    if (btnSecurity) btnSecurity.classList.add('active', 'security');
  } else if (role === 'admin') {
    if (btnAdmin) btnAdmin.classList.add('active', 'admin');
  }
}

function renderRoleDropdownContent(category) {
  let menuId = '';
  if (category === 'karyawan') menuId = 'menuRoleKaryawan';
  else if (category === 'approver') menuId = 'menuRoleApprover';
  else if (category === 'security') menuId = 'menuRoleSecurity';
  const menuEl = document.getElementById(menuId);
  if (!menuEl) return;

  const store = getQuickSwitchAccounts();
  const accounts = store[category] || [];
  const currentRole = window.currentActor || 'karyawan';
  const activeGate = localStorage.getItem('KUJANG_ACTIVE_GATE') || 'Pos 1 Gerbang Utama';

  const itemsHtml = accounts.map(acc => {
    let isActive = false;
    if (category === 'karyawan') {
      let activeNip = '';
      if (window.activeEmployeeUser) {
        activeNip = window.activeEmployeeUser.nip;
      } else if (currentRole === 'karyawan2') {
        activeNip = 'PK-2024-8842';
      } else if (currentRole === 'karyawan') {
        activeNip = 'PK-2024-8841';
      }
      isActive = (acc.nip === activeNip);
    } else if (category === 'approver') {
      let activeApprNip = '';
      if (window.activeApproverUser && window.activeApproverUser.nip) {
        activeApprNip = window.activeApproverUser.nip;
      } else {
        try {
          activeApprNip = localStorage.getItem('KUJANG_ACTIVE_APPR_NIP') || '';
        } catch(e) {}
      }
      if (!activeApprNip) {
        if (currentRole === 'approver2') activeApprNip = 'PK-2012-0845';
        else if (currentRole === 'approver') activeApprNip = 'PK-2015-1002';
      }
      isActive = (acc.nip === activeApprNip);
    } else if (category === 'security') {
      let activeSecNip = '';
      if (window.activeSecurityUser && window.activeSecurityUser.nip) {
        activeSecNip = window.activeSecurityUser.nip;
      } else {
        try {
          activeSecNip = localStorage.getItem('KUJANG_ACTIVE_SEC_NIP') || '';
        } catch(e) {}
      }
      if (!activeSecNip) {
        if (activeGate.includes('Pos 3')) activeSecNip = 'SEC-2020-105';
        else if (activeGate.includes('Pos 2')) activeSecNip = 'SEC-2019-088';
        else activeSecNip = 'SEC-2018-042';
      }
      isActive = (currentRole === 'security') && (acc.nip === activeSecNip);
    }

    return `
      <div class="role-dropdown-item ${isActive ? 'active' : ''}" onclick="window.selectQuickSwitchAccount('${category}', '${acc.nip}')">
        <div class="role-dropdown-item-info">
          <div class="role-dropdown-item-name">${acc.name}</div>
          <div class="role-dropdown-item-sub">${acc.fullTitle || ''}</div>
        </div>
      </div>
    `;
  }).join('');

  menuEl.innerHTML = `
    <div class="role-dropdown-list">
      ${itemsHtml}
    </div>
    <div class="role-dropdown-footer">
      <button type="button" class="btn-role-add-account" onclick="window.openAddAccountModal('${category}')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Tambah Akun Lain</span>
      </button>
    </div>
  `;
}

function toggleRoleDropdown(category) {
  let menuId = '';
  let wrapId = '';
  if (category === 'karyawan') { menuId = 'menuRoleKaryawan'; wrapId = 'wrapRoleKaryawan'; }
  else if (category === 'approver') { menuId = 'menuRoleApprover'; wrapId = 'wrapRoleApprover'; }
  else if (category === 'security') { menuId = 'menuRoleSecurity'; wrapId = 'wrapRoleSecurity'; }

  const menuEl = document.getElementById(menuId);
  const wrapEl = document.getElementById(wrapId);
  if (!menuEl || !wrapEl) return;

  // Buka atau tutup menu dropdown akun saat tombol role diklik agar pengguna dapat memilih akun spesifik
  const isCurrentlyOpen = (menuEl.style.display === 'block');
  closeAllRoleDropdowns();

  if (!isCurrentlyOpen) {
    renderRoleDropdownContent(category);
    menuEl.style.display = 'block';
    wrapEl.classList.add('open');
  }
}

function closeAllRoleDropdowns() {
  ['wrapRoleKaryawan', 'wrapRoleApprover', 'wrapRoleSecurity'].forEach(wrapId => {
    const wrap = document.getElementById(wrapId);
    if (wrap) wrap.classList.remove('open');
  });
  ['menuRoleKaryawan', 'menuRoleApprover', 'menuRoleSecurity'].forEach(menuId => {
    const menu = document.getElementById(menuId);
    if (menu) menu.style.display = 'none';
  });
}

function selectQuickSwitchAccount(category, nip) {
  closeAllRoleDropdowns();

  // 1. Validasi Akun Dihapus oleh Administrator
  let deletedList = [];
  try {
    deletedList = JSON.parse(localStorage.getItem('KUJANG_DELETED_USERS') || '[]');
  } catch (e) {}
  const isDel = deletedList.find(d => (d.nip && d.nip.toLowerCase() === (nip || '').toLowerCase()));
  if (isDel) {
    if (typeof window.openNoticeModal === 'function') {
      window.openNoticeModal({
        title: 'Hak Akses Anda Telah Dihapus',
        message: `Akun <strong>${isDel.name || nip}</strong> (${nip}) telah <strong>DIHAPUS</strong> oleh Administrator dari sistem PT Pupuk Kujang.<br><br>Akun ini tidak lagi memiliki hak akses dan tidak dapat digunakan untuk masuk ke dalam sistem.`,
        buttonText: 'Batal'
      });
    } else {
      alert(`[HAK AKSES DIHAPUS]\n\nAkun ${isDel.name || nip} telah dihapus.`);
    }
    return false;
  }

  // 2. Cari dari master data pengguna
  const users = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
  const matchedUser = users.find(u => u.nip === nip);

  const store = typeof getQuickSwitchAccounts === 'function' ? getQuickSwitchAccounts() : {};
  const accounts = (store && store[category]) ? store[category] : [];
  const acc = accounts.find(a => a.nip === nip) || null;

  if (!matchedUser && !acc) {
    if (typeof window.openNoticeModal === 'function') {
      window.openNoticeModal({
        title: 'Hak Akses Anda Telah Dihapus',
        message: `Akun dengan NIP <strong>${nip}</strong> tidak ditemukan atau telah <strong>DIHAPUS</strong> oleh Administrator dari sistem PT Pupuk Kujang.`,
        buttonText: 'Batal'
      });
    }
    return false;
  }

  // 3. Validasi Akun Dicabut oleh Administrator
  if (matchedUser.status === 'Dicabut' || matchedUser.status === 'Nonaktif') {
    if (typeof window.openNoticeModal === 'function') {
      window.openNoticeModal({
        title: 'Hak Akses Anda Telah Dicabut',
        message: `Hak akses untuk akun <strong>${matchedUser.name}</strong> (${matchedUser.role || matchedUser.roleKey}) telah <strong>DICABUT</strong> oleh Administrator.<br><br>Sesuai tata kelola keamanan PT Pupuk Kujang, Anda <strong>TIDAK DAPAT MASUK</strong> ke akun ini sebelum hak akses diaktifkan kembali di Direktori Admin.`,
        buttonText: 'Batal'
      });
    } else {
      alert(`[HAK AKSES DICABUT]\n\nAkun ${matchedUser.name} telah dicabut.`);
    }
    return false;
  }

  // 4. Lakukan perpindahan peran secara dinamis sesuai profil akun
  if (category === 'karyawan') {
    window.activeEmployeeUser = matchedUser;
    try { localStorage.setItem('KUJANG_ACTIVE_EMP_NIP', matchedUser.nip); } catch (e) {}
    if (window.ACTORS && window.ACTORS.karyawan) {
      window.ACTORS.karyawan.name = matchedUser.name;
      window.ACTORS.karyawan.nip = matchedUser.nip;
      if (matchedUser.department) window.ACTORS.karyawan.department = matchedUser.department;
      if (matchedUser.role || matchedUser.title) window.ACTORS.karyawan.title = matchedUser.role || matchedUser.title;
      if (matchedUser.directSupervisor || matchedUser.supervisor) {
        window.ACTORS.karyawan.approverName = matchedUser.directSupervisor || matchedUser.supervisor;
      }
    }
    switchRole(matchedUser.roleKey === 'karyawan2' ? 'karyawan2' : 'karyawan', matchedUser);
  } else if (category === 'approver') {
    window.activeApproverUser = matchedUser;
    try { localStorage.setItem('KUJANG_ACTIVE_APPR_NIP', matchedUser.nip); } catch (e) {}
    const isApp2 = matchedUser.roleKey === 'approver2' || (matchedUser.role && matchedUser.role.includes('Atasan 2'));
    if (window.ACTORS) {
      if (isApp2) {
        window.ACTORS.approver2 = {
          name: matchedUser.name,
          nip: matchedUser.nip,
          title: matchedUser.role || 'Supervisor / Plt',
          department: matchedUser.department || 'Departemen Rekayasa & Pemeliharaan',
          roleLabel: 'Atasan 2 (Supervisor / Plt)'
        };
      } else {
        window.ACTORS.approver = {
          name: matchedUser.name,
          nip: matchedUser.nip,
          title: matchedUser.role || 'Manager',
          department: matchedUser.department || 'Departemen Rekayasa & Pemeliharaan',
          roleLabel: 'Atasan 1 (Manager)'
        };
      }
    }
    switchRole(isApp2 ? 'approver2' : 'approver', matchedUser);
  } else if (category === 'security') {
    const secUser = matchedUser || users.find(u => u.nip === nip) || (acc ? { name: acc.name, nip: acc.nip, role: acc.fullTitle, roleKey: 'security' } : null);
    window.activeSecurityUser = secUser;
    try { localStorage.setItem('KUJANG_ACTIVE_SEC_NIP', nip); } catch (e) {}

    let gate = (acc && acc.gateName) ? acc.gateName : '';
    if (!gate) {
      if (nip === 'SEC-2020-105' || (secUser && secUser.role && secUser.role.includes('Pos 3'))) {
        gate = 'Pos 3 Gerbang Timur';
      } else if (nip === 'SEC-2019-088' || (secUser && secUser.role && secUser.role.includes('Pos 2'))) {
        gate = 'Pos 2 Gerbang Barat';
      } else {
        gate = 'Pos 1 Gerbang Utama';
      }
    }
    try { localStorage.setItem('KUJANG_ACTIVE_GATE', gate); } catch (e) {}

    if (secUser && window.ACTORS && window.ACTORS.security) {
      window.ACTORS.security.name = secUser.name;
      window.ACTORS.security.nip = secUser.nip;
      window.ACTORS.security.gateName = gate;
      window.ACTORS.security.title = secUser.role || 'Petugas Pengamanan';
    }

    if (typeof window.updateActiveSecurityGate === 'function') {
      window.updateActiveSecurityGate(gate, false);
    }
    switchRole('security', secUser);
  }
  updateTopbarRoleLabels();
}

function openAddAccountModal(category) {
  closeAllRoleDropdowns();
  window.currentAddAccountCategory = category;

  const modal = document.getElementById('modalSelectDirectoryUser');
  const heading = document.getElementById('modalSelectUserHeading');
  const sub = document.getElementById('modalSelectUserSub');
  const input = document.getElementById('inputSearchDirectoryUser');

  if (heading && sub) {
    if (category === 'karyawan') {
      heading.textContent = 'Pilih Akun Karyawan dari Direktori';
      sub.textContent = 'Pilih karyawan aktif untuk ditambahkan ke pintasan cepat.';
    } else if (category === 'approver') {
      heading.textContent = 'Pilih Akun Atasan dari Direktori';
      sub.textContent = 'Pilih atasan peninjau aktif untuk ditambahkan ke pintasan cepat.';
    } else if (category === 'security') {
      heading.textContent = 'Pilih Akun Pos Jaga dari Direktori';
      sub.textContent = 'Pilih petugas atau pos pengamanan aktif untuk ditambahkan ke pintasan cepat.';
    }
  }

  if (input) input.value = '';
  renderDirectoryUsersList('');

  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('open');
    document.body.classList.add('modal-open');
    if (input) setTimeout(() => input.focus(), 100);
  }
}

function closeSelectDirectoryUserModal() {
  const modal = document.getElementById('modalSelectDirectoryUser');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
  document.body.classList.remove('modal-open');
}

function filterDirectoryUsersList() {
  const input = document.getElementById('inputSearchDirectoryUser');
  const val = input ? input.value : '';
  renderDirectoryUsersList(val);
}

function renderDirectoryUsersList(searchQuery = '') {
  const container = document.getElementById('directoryUserListContainer');
  if (!container) return;

  const category = window.currentAddAccountCategory || 'karyawan';
  const q = (searchQuery || '').trim().toLowerCase();
  const allUsers = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];

  let deletedList = [];
  try {
    deletedList = JSON.parse(localStorage.getItem('KUJANG_DELETED_USERS') || '[]');
  } catch (e) {}
  const deletedNips = new Set(deletedList.map(d => d.nip).filter(Boolean));

  // Filter based on category
  const filtered = allUsers.filter(u => {
    if (u.nip && deletedNips.has(u.nip)) return false;
    if (u.status !== 'Aktif') return false;

    if (category === 'karyawan') {
      const isEmp = u.roleKey === 'karyawan' || u.roleKey === 'karyawan2' || (u.role && u.role.toLowerCase().includes('karyawan'));
      if (!isEmp) return false;
    } else if (category === 'approver') {
      const isApp = u.roleKey === 'approver' || u.roleKey === 'approver2' || (u.role && (u.role.toLowerCase().includes('atasan') || u.role.toLowerCase().includes('manager') || u.role.toLowerCase().includes('supervisor')));
      if (!isApp) return false;
    } else if (category === 'security') {
      const isSec = u.roleKey === 'security' || (u.role && (u.role.toLowerCase().includes('pos jaga') || u.role.toLowerCase().includes('satpam') || u.role.toLowerCase().includes('security')));
      if (!isSec) return false;
    }

    if (q) {
      const matchName = (u.name || '').toLowerCase().includes(q);
      const matchNip = (u.nip || '').toLowerCase().includes(q);
      const matchDept = (u.department || '').toLowerCase().includes(q);
      const matchRole = (u.role || '').toLowerCase().includes(q);
      return matchName || matchNip || matchDept || matchRole;
    }
    return true;
  });

  const currentStore = getQuickSwitchAccounts()[category] || [];
  const addedNips = new Set(currentStore.map(a => a.nip));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 28px 12px; color: var(--text-secondary, #64748b);">
        <div style="font-size: 1.5rem; margin-bottom: 4px;">👥</div>
        <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary, #0f172a);">Tidak ada akun ditemukan</div>
        <div style="font-size: 0.75rem; margin-top: 2px;">Coba gunakan kata kunci pencarian yang lain.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(u => {
    const isAdded = addedNips.has(u.nip);
    const shortName = getRoleItemShortName(u.name);
    return `
      <div class="directory-user-card ${isAdded ? 'already-added' : ''}" onclick="window.selectDirectoryUser('${u.nip}')">
        <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
          <div style="width: 34px; height: 34px; min-width: 34px; border-radius: 50%; background: #e0f2fe; color: #0369a1; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem;">
            ${shortName.charAt(0)}
          </div>
          <div style="min-width: 0;">
            <div style="font-size: 0.825rem; font-weight: 800; color: var(--text-primary, #0f172a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${u.name}
            </div>
            <div style="font-size: 0.7rem; color: var(--text-secondary, #64748b); line-height: 1.3;">
              NIP: ${u.nip || '-'} • ${u.role || '-'}
            </div>
            <div style="font-size: 0.675rem; color: #059669; font-weight: 600;">
              ${u.department || 'PT Pupuk Kujang'}
            </div>
          </div>
        </div>
        <div style="flex-shrink: 0; margin-left: 10px;">
          <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px; font-size: 0.725rem; font-weight: 700; background: ${isAdded ? '#ecfdf5' : '#059669'}; color: ${isAdded ? '#059669' : '#ffffff'};">
            ${isAdded ? '✓ Aktifkan' : '+ Pilih'}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

function selectDirectoryUser(nip) {
  const category = window.currentAddAccountCategory || 'karyawan';
  const users = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
  const user = users.find(u => u.nip === nip);
  if (!user) return;

  const store = getQuickSwitchAccounts();
  const existing = store[category] || [];
  if (!existing.some(a => a.nip === user.nip)) {
    const shortName = getRoleItemShortName(user.name);
    let defaultGate = 'Pos 1 Gerbang Utama';
    if (user.role && user.role.includes('Pos 3')) defaultGate = 'Pos 3 Gerbang Timur';
    else if (user.role && user.role.includes('Pos 2')) defaultGate = 'Pos 2 Gerbang Logistik';
    else if (user.nip === 'SEC-2020-105') defaultGate = 'Pos 3 Gerbang Timur';
    else if (user.nip === 'SEC-2019-088') defaultGate = 'Pos 2 Gerbang Logistik';

    existing.push({
      nip: user.nip,
      name: shortName,
      fullTitle: user.role || (category === 'karyawan' ? 'Karyawan' : (category === 'approver' ? 'Atasan Peninjau' : 'Petugas Pos Jaga')),
      roleKey: user.roleKey || (category === 'karyawan' ? 'karyawan' : (category === 'approver' ? 'approver' : 'security')),
      department: user.department || '',
      gateName: user.gateName || defaultGate
    });
    store[category] = existing;
    saveQuickSwitchAccounts(store);
  }

  closeSelectDirectoryUserModal();
  selectQuickSwitchAccount(category, user.nip);

  if (typeof window.showToast === 'function') {
    window.showToast(`Akun ${user.name} berhasil ditambahkan dan diaktifkan.`, 'success');
  }
}

// Global Exports
window.getQuickSwitchAccounts = getQuickSwitchAccounts;
window.toggleRoleDropdown = toggleRoleDropdown;
window.closeAllRoleDropdowns = closeAllRoleDropdowns;
window.selectQuickSwitchAccount = selectQuickSwitchAccount;
window.openAddAccountModal = openAddAccountModal;
window.closeSelectDirectoryUserModal = closeSelectDirectoryUserModal;
window.filterDirectoryUsersList = filterDirectoryUsersList;
window.selectDirectoryUser = selectDirectoryUser;
window.updateTopbarRoleLabels = updateTopbarRoleLabels;

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
  try {
    sessionStorage.removeItem('kujang_skip_confirm_delete');
    sessionStorage.removeItem('kujang_skip_confirm_approve');
    const chkDel = document.getElementById('chkDontShowDeleteConfirm');
    if (chkDel) chkDel.checked = false;
    const chkApp = document.getElementById('chkDontShowApproveConfirm');
    if (chkApp) chkApp.checked = false;
  } catch (e) { }

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
    const success = window.switchRole(role);
    if (success === false) return;
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

  const popoverIcon = document.getElementById('sidebarPopoverThemeIcon');
  const popoverLabel = document.getElementById('sidebarPopoverThemeLabel');
  if (popoverIcon) popoverIcon.textContent = isDark ? '☀️' : '🌙';
  if (popoverLabel) popoverLabel.textContent = isDark ? 'Mode Terang' : 'Mode Malam';

  const mProfileThemeBtn = document.getElementById('mProfileThemeToggleBtn');
  if (mProfileThemeBtn) {
    mProfileThemeBtn.innerHTML = isDark ? '☀️' : '🌙';
    mProfileThemeBtn.setAttribute('title', isDark ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Malam');
  }

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

function toggleSidebarSettingsPopover(e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  const popover = document.getElementById('sidebarSettingsPopover');
  const btn = document.getElementById('btnSidebarSettings');
  if (!popover) return;
  const nextOpen = !popover.classList.contains('open');
  if (nextOpen && btn) {
    const rect = btn.getBoundingClientRect();
    popover.style.left = `${Math.round(rect.left)}px`;
    popover.style.bottom = `${Math.round(window.innerHeight - rect.top + 8)}px`;
  }
  popover.classList.toggle('open', nextOpen);
  popover.setAttribute('aria-hidden', nextOpen ? 'false' : 'true');
  if (btn) btn.classList.toggle('active', nextOpen);
}

function closeSidebarSettingsPopover() {
  const popover = document.getElementById('sidebarSettingsPopover');
  const btn = document.getElementById('btnSidebarSettings');
  if (popover) {
    popover.classList.remove('open');
    popover.setAttribute('aria-hidden', 'true');
  }
  if (btn) btn.classList.remove('active');
}

document.addEventListener('click', (e) => {
  const popover = document.getElementById('sidebarSettingsPopover');
  const btn = document.getElementById('btnSidebarSettings');
  if (!popover || !popover.classList.contains('open')) return;
  if (!popover.contains(e.target) && (!btn || !btn.contains(e.target))) {
    closeSidebarSettingsPopover();
  }
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
window.openLogoutModal = openLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.executeLogout = executeLogout;
window.handleLoginSubmit = handleLoginSubmit;
window.initRoleSwitcherScroll = initRoleSwitcherScroll;
window.updateThemeUI = updateThemeUI;
window.toggleDarkMode = toggleDarkMode;
window.initTheme = initTheme;
window.toggleSidebarSettingsPopover = toggleSidebarSettingsPopover;
window.closeSidebarSettingsPopover = closeSidebarSettingsPopover;



// ===================================================================
// SIDEBAR DRAG-TO-RESIZE IMPLEMENTATION
// ===================================================================
function initSidebarResizer() {
  // Fitur resize sidebar telah dinonaktifkan sesuai permintaan pengguna
}
window.initSidebarResizer = initSidebarResizer;
