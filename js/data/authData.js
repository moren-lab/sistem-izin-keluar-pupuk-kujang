/**
 * AUTH DATA - KUJANG ID (IDENTITY PROVIDER PT PUPUK KUJANG)
 * Daftar akun resmi untuk simulasi login multi-aktor (Karyawan, Atasan 1, Atasan 2, Pos Jaga, Admin)
 */

window.KUJANG_ACCOUNTS = [
  {
    id: 'emp_01',
    role: 'karyawan',
    username: 'karyawan',
    email: 'karyawan@pupuk-kujang.co.id',
    nip: 'PK-2024-8841',
    name: 'Budi Pratama, S.T.',
    title: 'Staff Rekayasa Proses',
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
    email: 'atasan1@pupuk-kujang.co.id',
    nip: 'PK-2015-4420',
    name: 'Ir. Hendra Gunawan, M.T.',
    title: 'Manager Rekayasa & Pemeliharaan',
    department: 'Departemen Rekayasa & Pemeliharaan',
    phone: '0813-1122-0002',
    password: '123',
    avatar: '👔',
    badgeColor: '#0f766e',
    roleLabel: 'Atasan Langsung (Manager)'
  },
  {
    id: 'vp_01',
    role: 'approver2',
    approverLevel: 2,
    username: 'atasan2',
    email: 'atasan2@pupuk-kujang.co.id',
    nip: 'PK-2009-1102',
    name: 'Dr. Ir. Bambang Sugiarto, M.M.',
    title: 'VP Pemeliharaan & Pabrik',
    department: 'Divisi Produksi & Rekayasa',
    phone: '0813-3344-0003',
    password: '123',
    avatar: '💼',
    badgeColor: '#0369a1',
    roleLabel: 'Atasan Delegasi / VP'
  },
  {
    id: 'sec_01',
    role: 'security',
    username: 'posjaga',
    email: 'posjaga@pupuk-kujang.co.id',
    nip: 'PK-SEC-0104',
    name: 'Komandan Agus Sudrajat',
    title: 'Petugas Keamanan Gerbang Utama',
    department: 'Pos Jaga 1 (Gerbang Utama)',
    phone: '0815-5566-0004',
    password: '123',
    avatar: '🛡️',
    badgeColor: '#1d4ed8',
    roleLabel: 'Petugas Pos Jaga'
  },
  {
    id: 'adm_01',
    role: 'admin',
    username: 'admin',
    email: 'admin@pupuk-kujang.co.id',
    nip: 'PK-ADM-0009',
    name: 'Siti Rahmawati, S.Kom.',
    title: 'Administrator HR & K3',
    department: 'Biro SDM & Keselamatan Kerja',
    phone: '0811-7788-0005',
    password: '123',
    avatar: '⚙️',
    badgeColor: '#7c3aed',
    roleLabel: 'Administrator Sistem'
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
