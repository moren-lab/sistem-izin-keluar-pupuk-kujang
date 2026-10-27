/**
 * AUTH DATA - KUJANG ID (IDENTITY PROVIDER PT PUPUK KUJANG)
 * Daftar akun resmi untuk simulasi login multi-aktor (Karyawan, Atasan 1, Atasan 2, Pos Jaga, Admin)
 */

window.KUJANG_ACCOUNTS = [
  {
    id: 'emp_01',
    role: 'karyawan',
    username: 'karyawan',
    email: 'budi.pratama@pupuk-kujang.co.id',
    nip: 'PK-2024-8841',
    name: 'Budi Pratama, S.T.',
    title: 'Staf Rekayasa Mesin',
    department: 'Departemen Rekayasa & Pemeliharaan',
    phone: '0812-8841-0001',
    password: '123',
    avatar: '👨‍💼',
    badgeColor: '#059669',
    roleLabel: 'Karyawan Pemohon'
  },
  {
    id: 'mgr_01',
    role: 'approver',
    approverLevel: 1,
    username: 'atasan1',
    email: 'hendra.gunawan@pupuk-kujang.co.id',
    nip: 'PK-2015-1002',
    name: 'Ir. Hendra Gunawan, M.T.',
    title: 'Manager Rekayasa & Pemeliharaan',
    department: 'Departemen Rekayasa & Pemeliharaan',
    phone: '0813-1122-0002',
    password: '123',
    avatar: '👔',
    badgeColor: '#0f766e',
    roleLabel: 'Atasan 1 (Manager)'
  },
  {
    id: 'vp_01',
    role: 'approver2',
    approverLevel: 2,
    username: 'atasan2',
    email: 'dewi.sartika@pupuk-kujang.co.id',
    nip: 'PK-2012-0845',
    name: 'Dewi Sartika, S.T., M.M.',
    title: 'Supervisor Operasional Lapangan (Plt. Manager)',
    department: 'Departemen Rekayasa & Pemeliharaan',
    phone: '0813-3344-0003',
    password: '123',
    avatar: '👩‍💼',
    badgeColor: '#0369a1',
    roleLabel: 'Atasan 2 (Supervisor / Plt)'
  },
  {
    id: 'sec_01',
    role: 'security',
    username: 'posjaga',
    email: 'pos1.security@pupuk-kujang.co.id',
    nip: 'SEC-2018-042',
    name: 'Sertu Agus',
    title: 'Petugas Pengamanan Pos 1',
    department: 'Departemen Pengamanan & K3',
    phone: '0815-5566-0004',
    password: '123',
    avatar: '👮',
    badgeColor: '#1d4ed8',
    roleLabel: 'Petugas Pos Jaga'
  },
  {
    id: 'adm_01',
    role: 'admin',
    username: 'admin',
    email: 'bambang.sutrisno@pupuk-kujang.co.id',
    nip: 'ADM-2016-019',
    name: 'Bambang Sutrisno, S.T.',
    title: 'Supervisi Pengamanan & K3',
    department: 'Departemen Pengamanan & K3',
    phone: '0811-7788-0005',
    password: '123',
    avatar: '🛡️',
    badgeColor: '#7c3aed',
    roleLabel: 'Administrator Pengamanan & K3'
  }
];

/**
 * Cari akun berdasarkan username / email / nip
 */
window.findKujangAccount = function(identifier) {
  if (!identifier) return null;
  const q = String(identifier).trim().toLowerCase();
  return window.KUJANG_ACCOUNTS.find(acc => 
    acc.username.toLowerCase() === q ||
    acc.email.toLowerCase() === q ||
    acc.nip.toLowerCase() === q
  ) || null;
};
