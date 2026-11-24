/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Data State & Shared Storage
 */

const STORAGE_KEY = 'KUJANG_GATEPASS_TICKETS_V9';

/**
 * Universal Partial & Multi-token Search Matching Helper
 * Allows searching parts of names/titles (e.g. 'Ir' or 'Hendra' matches 'Ir. Hendra Gunawan, M.T.')
 */
function matchSearchTokens(query, ...fields) {
  if (!query) return true;
  const clean = String(query).trim().toLowerCase();
  if (!clean) return true;

  // Split query into individual token words (splitting by whitespace and commas)
  const tokens = clean.split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const combined = fields.map(f => String(f || '').toLowerCase()).join(' ');
  const combinedClean = combined.replace(/[.,\-_/]/g, ' ');

  return tokens.every(tok => {
    if (combined.includes(tok)) return true;
    const tokClean = tok.replace(/[.,\-_/]/g, '');
    return tokClean ? combinedClean.includes(tokClean) : false;
  });
}
window.matchSearchTokens = matchSearchTokens;

const ACTORS = {
  karyawan: {
    nip: 'PK-2024-8841',
    name: 'Budi Pratama, S.T.',
    title: 'Staf Rekayasa Mesin',
    department: 'Departemen Rekayasa & Pemeliharaan',
    roleLabel: 'Karyawan',
    approverName: 'Ir. Hendra Gunawan, M.T.'
  },
  karyawan2: {
    nip: 'PK-2024-8842',
    name: 'Arthur Morgan, S.Tr.T.',
    title: 'Staf Instrumentasi & Otomasi Pabrik',
    department: 'Departemen Rekayasa & Pemeliharaan',
    roleLabel: 'Karyawan 2',
    approverName: 'Ir. Hendra Gunawan, M.T.'
  },
  approver: {
    nip: 'PK-2015-1002',
    name: 'Ir. Hendra Gunawan, M.T.',
    title: 'Manager Rekayasa & Pemeliharaan',
    department: 'Departemen Rekayasa & Pemeliharaan',
    roleLabel: 'Atasan 1 (Manager)'
  },
  approver2: {
    nip: 'PK-2012-0845',
    name: 'Dewi Sartika, S.T., M.M.',
    title: 'Supervisor Operasional Lapangan (Plt. Manager)',
    department: 'Departemen Rekayasa & Pemeliharaan',
    roleLabel: 'Atasan 2 (Supervisor / Plt)'
  },
  security: {
    nip: 'SEC-2018-042',
    name: 'Sertu Agus',
    title: 'Petugas Pengamanan Pos 1',
    department: 'Departemen Pengamanan & K3',
    roleLabel: 'Petugas Pos Jaga',
    gateName: 'Pos 1 Gerbang Utama'
  },
  admin: {
    nip: 'ADM-2016-019',
    name: 'Bambang Sutrisno, S.T.',
    title: 'Supervisi Pengamanan & K3',
    department: 'Departemen Pengamanan & K3',
    roleLabel: 'Administrator Pengamanan & K3',
    office: 'Gedung K3 & Pengamanan Pusat'
  }
};

// Daftar Atasan Peninjau (Approvers) yang dapat dipilih oleh Karyawan
const MOCK_APPROVERS = [
  {
    nip: 'PK-2015-1002',
    name: 'Ir. Hendra Gunawan, M.T.',
    title: 'Manager Rekayasa & Pemeliharaan',
    department: 'Departemen Rekayasa & Pemeliharaan',
    isDirectSupervisor: true,
    avatarBg: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)'
  },
  {
    nip: 'PK-2012-0845',
    name: 'Dewi Sartika, S.T., M.M.',
    title: 'Supervisor Operasional Lapangan (Plt. Manager)',
    department: 'Departemen Rekayasa & Pemeliharaan',
    isDirectSupervisor: false,
    avatarBg: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
  }
];

let currentActor = 'karyawan'; // 'karyawan', 'approver', 'security', or 'admin'

// Figma Exact Mock Dataset (8 Tickets in Oct 2026 matching screenshots)

function getMockTicketDates(daysAgo, hOut, mOut, hIn, mIn) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hOut, mOut);
  const dIn = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hIn, mIn);
  const dCreate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, Math.max(0, hOut - 1), 20);
  return {
    plannedExit: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hOut)}:${pad(mOut)}`,
    estimatedReturn: `${dIn.getFullYear()}-${pad(dIn.getMonth() + 1)}-${pad(dIn.getDate())}T${pad(hIn)}:${pad(mIn)}`,
    createdAt: `${pad(dCreate.getDate())} ${monthsShort[dCreate.getMonth()]} ${dCreate.getFullYear()}, ${pad(dCreate.getHours())}.${pad(dCreate.getMinutes())} WIB`,
    scanOutTime: `${pad(d.getDate())} ${monthsShort[d.getMonth()]} ${d.getFullYear()}, ${pad(hOut)}.${pad(mOut + 5)} WIB (Pos 1 Gerbang Utama)`,
    scanInTime: `${pad(dIn.getDate())} ${monthsShort[dIn.getMonth()]} ${dIn.getFullYear()}, ${pad(hIn)}.${pad(mIn - 5)} WIB (Pos 1 Gerbang Utama)`
  };
}

const _d0 = getMockTicketDates(0, 10, 0, 13, 0);
const _d1 = getMockTicketDates(0, 8, 30, 10, 45);
const _d2 = getMockTicketDates(2, 9, 0, 11, 0);
const _d3 = getMockTicketDates(3, 13, 0, 15, 30);
const _d4 = getMockTicketDates(4, 10, 0, 12, 0);
const _d5 = getMockTicketDates(12, 9, 0, 11, 30);
const _d6 = getMockTicketDates(20, 8, 0, 10, 30);
const _d7 = getMockTicketDates(28, 9, 0, 11, 40);

const DEFAULT_TICKETS = [
  {
    id: 'TK-20261106-901',
    applicantName: 'Budi Pratama, S.T.',
    applicantNip: 'PK-2024-8841',
    department: 'Departemen Rekayasa & Pemeliharaan',
    category: 'Dinas Kantor',
    type: 'Kembali ke Area',
    destination: 'PT Rekayasa Industri, Cikampek',
    reason: 'Koordinasi perbaikan instalasi pipa amonia unit 2',
    transportMode: 'Kendaraan dinas',
    plannedExit: '2026-11-06T09:00',
    estimatedReturn: '2026-11-06T14:30',
    status: 'Sedang di Luar',
    createdAt: '06 Nov 2026, 08.20 WIB',
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverTitle: 'Manager Rekayasa & Pemeliharaan',
    approverNote: 'Disetujui. Mohon koordinasikan progres via radio/WA.',
    scanOutGate: 'Pos 1 Gerbang Utama',
    securityOfficerOut: 'Sertu Agus',
    scanOutTime: '06 Nov 2026, 09.05 WIB (Pos 1 Gerbang Utama)',
    timeline: [
      { event: 'Pengajuan dibuat', time: '06 Nov 2026, 08.20 WIB', by: 'Budi Pratama, S.T.', desc: 'Dinas Kantor — Kembali ke Area' },
      { event: 'Disetujui oleh atasan', time: '06 Nov 2026, 08.45 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui untuk perbaikan instalasi pipa.' },
      { event: 'Scan Out tercatat', time: '06 Nov 2026, 09.05 WIB', by: 'Sertu Agus (Pos 1)', desc: 'Pos 1 Gerbang Utama — Personel meninggalkan kawasan pabrik.' }
    ]
  },
  {
    id: 'TK-20261106-902',
    applicantName: 'Arthur Morgan, S.Tr.T.',
    applicantNip: 'PK-2024-8842',
    department: 'Departemen Rekayasa & Pemeliharaan',
    category: 'Dinas Kantor',
    type: 'Kembali ke Area',
    destination: 'Balai Standardisasi Industri Karawang',
    reason: 'Pengambilan sertifikat kalibrasi sensor instrumentasi',
    transportMode: 'Kendaraan dinas',
    plannedExit: '2026-11-06T10:30',
    estimatedReturn: '2026-11-06T15:00',
    status: 'Disetujui',
    createdAt: '06 Nov 2026, 08.40 WIB',
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverTitle: 'Manager Rekayasa & Pemeliharaan',
    approverNote: 'Disetujui. Siap diproses keluar di gerbang.',
    timeline: [
      { event: 'Pengajuan dibuat', time: '06 Nov 2026, 08.40 WIB', by: 'Arthur Morgan, S.Tr.T.', desc: 'Dinas Kantor — Pengambilan sertifikat kalibrasi' },
      { event: 'Disetujui oleh atasan', time: '06 Nov 2026, 09.10 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui. Tiket siap dipindai di pos jaga.' }
    ]
  },
  {
    id: 'IZ-20261019-013',
    applicantName: 'Budi Pratama, S.T.',
    applicantNip: 'PK-2024-8841',
    department: 'Departemen Rekayasa & Pemeliharaan',
    category: 'Dinas Kantor',
    type: 'Kembali ke Area',
    destination: 'PT Rekayasa Industri, Cikampek',
    reason: 'Koordinasi perbaikan pompa P-204',
    transportMode: 'Kendaraan dinas',
    plannedExit: _d0.plannedExit,
    estimatedReturn: _d0.estimatedReturn,
    status: 'Selesai',
    createdAt: _d0.createdAt,
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverTitle: 'Manajer Rekayasa & Pemeliharaan',
    approverNote: 'Disetujui. Koordinasikan hasil pemeriksaan setelah kembali.',
    scanOutTime: '19 Okt 2026, 10.05 WIB (Pos 1 Gerbang Utama)',
    scanInTime: '19 Okt 2026, 12.50 WIB (Pos 1 Gerbang Utama)',
    timeline: [
      { event: 'Pengajuan diajukan', time: '19 Okt 2026, 09.20 WIB', by: 'Budi Pratama, S.T.', desc: 'Dinas Kantor — Kembali ke Area' },
      { event: 'Disetujui oleh atasan', time: '19 Okt 2026, 09.35 WIB', by: 'Ir. Hendra Gunawan, M.T. — Manajer Rekayasa & Pemeliharaan', desc: 'Disetujui. Koordinasikan hasil pemeriksaan setelah kembali.' },
      { event: 'Scan Out tercatat', time: '19 Okt 2026, 10.05 WIB', by: 'Sertu Agus (Pos 1)', desc: 'Pos 1 — Karyawan meninggalkan area' },
      { event: 'Tap In tercatat', time: '19 Okt 2026, 12.50 WIB', by: 'Sertu Agus (Pos 1)', desc: 'Pos 1 — Karyawan kembali ke area pabrik' }
    ]
  },
  {
    id: 'IZ-20261016-006',
    applicantName: 'Budi Pratama, S.T.',
    applicantNip: 'PK-2024-8841',
    department: 'Departemen Rekayasa & Pemeliharaan',
    category: 'Dinas Kantor',
    type: 'Kembali ke Area',
    destination: 'Pelabuhan Cirebon',
    reason: 'Pemeriksaan pengapalan kargo suku cadang pompa industri',
    transportMode: 'Kendaraan dinas',
    plannedExit: _d1.plannedExit,
    estimatedReturn: _d1.estimatedReturn,
    status: 'Selesai',
    isEmergency: true,
    createdAt: _d1.createdAt,
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Disetujui. Selesai tepat waktu.',
    scanOutTime: '16 Okt 2026, 09.05 WIB (Pos 1)',
    scanInTime: '16 Okt 2026, 10.55 WIB (Pos 1)',
    timeline: [
      { event: 'Pengajuan Dibuat', time: '16 Okt 2026, 08.15 WIB', by: 'Budi Pratama', desc: 'Pengajuan izin dinas.' },
      { event: 'Disetujui', time: '16 Okt 2026, 08.30 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui.' },
      { event: 'Scan Out', time: '16 Okt 2026, 09.05 WIB', by: 'Pos 1', desc: 'Karyawan keluar.' },
      { event: 'Tap In', time: '16 Okt 2026, 10.55 WIB', by: 'Pos 1', desc: 'Kembali ke area tepat waktu.' }
    ]
  },
  {
    id: 'IZ-20261014-003',
    applicantName: 'Budi Pratama, S.T.',
    applicantNip: 'PK-2024-8841',
    department: 'Departemen Rekayasa & Pemeliharaan',
    category: 'Urusan Pribadi',
    type: 'Kembali ke Area',
    destination: 'RSUD Karawang',
    reason: 'Pemeriksaan laboratorium lanjutan',
    transportMode: 'Kendaraan pribadi',
    plannedExit: _d2.plannedExit,
    estimatedReturn: _d2.estimatedReturn,
    status: 'Selesai',
    createdAt: _d2.createdAt,
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Disetujui.',
    scanOutGate: 'Pos 2 Gerbang Barat',
    securityOfficerOut: 'Kopral Dani (Pos 2)',
    scanOutTime: '14 Okt 2026, 13.02 WIB (Pos 2 Gerbang Barat)',
    scanInTime: '14 Okt 2026, 14.25 WIB (Pos 2 Gerbang Barat)',
    timeline: [
      { event: 'Pengajuan Dibuat', time: '14 Okt 2026, 11.30 WIB', by: 'Budi Pratama', desc: 'Izin urusan pribadi.' },
      { event: 'Disetujui', time: '14 Okt 2026, 11.45 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui.' },
      { event: 'Scan Out', time: '14 Okt 2026, 13.02 WIB', by: 'Kopral Dani (Pos 2)', gate: 'Pos 2 Gerbang Barat', desc: 'Keluar gerbang barat.' },
      { event: 'Tap In', time: '14 Okt 2026, 14.25 WIB', by: 'Kopral Dani (Pos 2)', gate: 'Pos 2 Gerbang Barat', desc: 'Kembali tepat waktu.' }
    ]
  },
  {
    id: 'IZ-20261012-005',
    applicantName: 'Budi Pratama, S.T.',
    applicantNip: 'PK-2024-8841',
    department: 'Departemen Rekayasa & Pemeliharaan',
    category: 'Dinas Kantor',
    type: 'Kembali ke Area',
    destination: 'Kantor Distributor Bekasi',
    reason: 'Serah terima invoice dan dokumen garansi komponen teknis',
    transportMode: 'Kendaraan dinas',
    plannedExit: _d3.plannedExit,
    estimatedReturn: _d3.estimatedReturn,
    status: 'Selesai',
    isGroupDinas: true,
    members: [
      { nip: 'PK-2024-8842', name: 'Arthur Morgan, S.Tr.T.', department: 'Departemen Rekayasa & Pemeliharaan', role: 'Anggota', status: 'aktif' }
    ],
    isLate: true,
    lateMinutes: 15,
    createdAt: _d3.createdAt,
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Kembali terlambat 10 menit dikarenakan kepadatan jalur arteri Cikampek.',
    scanOutTime: '12 Okt 2026, 10.04 WIB (Pos 1)',
    scanInTime: '12 Okt 2026, 12.10 WIB (Pos 1)',
    timeline: [
      { event: 'Pengajuan Dibuat', time: '12 Okt 2026, 09.00 WIB', by: 'Budi Pratama', desc: 'Izin dinas.' },
      { event: 'Disetujui', time: '12 Okt 2026, 09.20 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui.' },
      { event: 'Scan Out', time: '12 Okt 2026, 10.04 WIB', by: 'Pos 1', desc: 'Keluar area.' },
      { event: 'Tap In Terlambat', time: '12 Okt 2026, 12.10 WIB', by: 'Pos 1', desc: 'Karyawan kembali 10 menit melewati estimasi 12.00 WIB.' }
    ]
  },
  {
    id: 'IZ-20261009-002',
    applicantName: 'Budi Pratama, S.T.',
    applicantNip: 'PK-2024-8841',
    department: 'Departemen Rekayasa & Pemeliharaan',
    category: 'Urusan Pribadi',
    type: 'Pulang Mendahului',
    destination: 'Rumah (keperluan keluarga)',
    reason: 'Urusan keluarga mendesak di rumah',
    transportMode: 'Kendaraan pribadi',
    plannedExit: _d4.plannedExit,
    estimatedReturn: _d4.estimatedReturn,
    status: 'Selesai',
    createdAt: _d4.createdAt,
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Disetujui. Semoga urusan keluarga lekas terselesaikan dengan baik.',
    scanOutTime: '06 Nov 2026, 10.05 WIB (Pos 1 Gerbang Utama)',
    scanOutGate: 'Pos 1 Gerbang Utama',
    scanInTime: null,
    timeline: [
      { event: 'Pengajuan Dibuat', time: '06 Nov 2026, 09.40 WIB', by: 'Budi Pratama, S.T.', desc: 'Pengajuan izin pulang mendahului.' },
      { event: 'Disetujui Atasan', time: '06 Nov 2026, 09.50 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui untuk pulang mendahului.' },
      { event: 'Scan Out Pos Jaga', time: '06 Nov 2026, 10.05 WIB', by: 'Pos 1 Gerbang Utama', desc: 'Scan kartu keluar gerbang oleh petugas keamanan.' }
    ]
  },
  {
    id: 'IZ-20261007-004',
    applicantName: 'Budi Pratama, S.T.',
    applicantNip: 'PK-2024-8841',
    department: 'Departemen Rekayasa & Pemeliharaan',
    category: 'Dinas Kantor',
    type: 'Kembali ke Area',
    destination: 'Gudang Logistik Ciampei',
    reason: 'Pengecekan spesifikasi valve dan seal cadangan',
    transportMode: 'Kendaraan dinas',
    plannedExit: _d5.plannedExit,
    estimatedReturn: _d5.estimatedReturn,
    status: 'Selesai',
    createdAt: _d5.createdAt,
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Disetujui. Selesai tepat waktu.',
    scanOutGate: 'Pos 3 Gerbang Timur',
    securityOfficerOut: 'Praka Ilham (Pos 3)',
    scanOutTime: '07 Okt 2026, 09.00 WIB (Pos 3 Gerbang Timur)',
    scanInTime: '07 Okt 2026, 11.50 WIB (Pos 3 Gerbang Timur)',
    timeline: [
      { event: 'Pengajuan Dibuat', time: '07 Okt 2026, 08.20 WIB', by: 'Budi Pratama', desc: 'Izin dinas.' },
      { event: 'Disetujui', time: '07 Okt 2026, 08.40 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui.' },
      { event: 'Scan Out', time: '07 Okt 2026, 09.00 WIB', by: 'Praka Ilham (Pos 3)', gate: 'Pos 3 Gerbang Timur', desc: 'Keluar gerbang timur.' },
      { event: 'Tap In', time: '07 Okt 2026, 11.50 WIB', by: 'Praka Ilham (Pos 3)', gate: 'Pos 3 Gerbang Timur', desc: 'Kembali tepat waktu.' }
    ]
  },
  {
    id: 'IZ-20261005-001',
    applicantName: 'Budi Pratama, S.T.',
    applicantNip: 'PK-2024-8841',
    department: 'Departemen Rekayasa & Pemeliharaan',
    category: 'Dinas Kantor',
    type: 'Kembali ke Area',
    destination: 'Balai Besar Uji Bahan Bandung',
    reason: 'Pengujian sampel metalurgi pipa retak',
    transportMode: 'Kendaraan dinas',
    plannedExit: _d6.plannedExit,
    estimatedReturn: _d6.estimatedReturn,
    status: 'Selesai',
    createdAt: _d6.createdAt,
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Disetujui.',
    scanOutTime: '05 Okt 2026, 08.10 WIB (Pos 1)',
    scanInTime: '05 Okt 2026, 15.45 WIB (Pos 1)',
    timeline: [
      { event: 'Pengajuan Dibuat', time: '05 Okt 2026, 07.15 WIB', by: 'Budi Pratama', desc: 'Izin dinas.' },
      { event: 'Disetujui', time: '05 Okt 2026, 07.30 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui.' },
      { event: 'Scan Out', time: '05 Okt 2026, 08.10 WIB', by: 'Pos 1', desc: 'Keluar area.' },
      { event: 'Tap In', time: '05 Okt 2026, 15.45 WIB', by: 'Pos 1', desc: 'Kembali tepat waktu.' }
    ]
  },
  {
    id: 'IZ-20261002-001',
    applicantName: 'Budi Pratama, S.T.',
    applicantNip: 'PK-2024-8841',
    department: 'Departemen Rekayasa & Pemeliharaan',
    category: 'Urusan Pribadi',
    type: 'Kembali ke Area',
    destination: 'Poliklinik Darurat Medika',
    reason: 'Penanganan alergi mendadak saat jam kerja',
    transportMode: 'Kendaraan pribadi',
    plannedExit: _d7.plannedExit,
    estimatedReturn: _d7.estimatedReturn,
    status: 'Selesai',
    isEmergency: true,
    createdAt: _d7.createdAt,
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Izin darurat disetujui.',
    scanOutTime: '02 Okt 2026, 09.55 WIB (Pos 1)',
    scanInTime: '02 Okt 2026, 11.40 WIB (Pos 1)',
    timeline: [
      { event: 'Pengajuan Darurat', time: '02 Okt 2026, 09.50 WIB', by: 'Budi Pratama', desc: 'Pengajuan darurat poliklinik.' },
      { event: 'Otorisasi Atasan', time: '02 Okt 2026, 09.52 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Otorisasi darurat.' },
      { event: 'Scan Out', time: '02 Okt 2026, 09.55 WIB', by: 'Pos 1', desc: 'Keluar area.' },
      { event: 'Tap In', time: '02 Okt 2026, 11.40 WIB', by: 'Pos 1', desc: 'Kembali ke area.' }
    ]
  }
];

function parseTicketDateTime(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val !== 'string') return null;

  let raw = val.trim();
  if (typeof normalizeReturnDateTime === 'function') {
    raw = normalizeReturnDateTime(raw);
  } else if (typeof window !== 'undefined' && typeof window.normalizeReturnDateTime === 'function') {
    raw = window.normalizeReturnDateTime(raw);
  }

  // 1. Format hanya jam: "12:30", "12.30", "12:30 WIB", "12:30:00"
  const timeOnlyMatch = raw.match(/^(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?(?:\s*WIB)?$/i);
  if (timeOnlyMatch) {
    const now = new Date();
    const h = parseInt(timeOnlyMatch[1], 10);
    const m = parseInt(timeOnlyMatch[2], 10);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
  }

  // 2. Standard ISO parser (handles 2026-10-26T12:30 etc)
  let d = new Date(raw);
  if (!isNaN(d.getTime())) return d;

  // 3. Space separated ISO format (2026-10-26 12:30)
  const cleanIso = raw.replace(' ', 'T');
  d = new Date(cleanIso);
  if (!isNaN(d.getTime())) return d;

  // 4. Indonesian text date format: "26 Okt 2026, 12:30 WIB" / "26 Oktober 2026 12.30"
  const indonesianMonths = {
    'jan': 0, 'januari': 0,
    'feb': 1, 'februari': 1,
    'mar': 2, 'maret': 2,
    'apr': 3, 'april': 3,
    'mei': 4, 'may': 4,
    'jun': 5, 'juni': 5,
    'jul': 6, 'juli': 6,
    'agu': 7, 'agustus': 7, 'agt': 7,
    'sep': 8, 'september': 8,
    'okt': 9, 'oktober': 9, 'oct': 9,
    'nov': 10, 'november': 10,
    'des': 11, 'desember': 11, 'dec': 11
  };

  const idMatch = raw.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:.*?(\d{1,2})[:.](\d{2}))?/);
  if (idMatch) {
    const day = parseInt(idMatch[1], 10);
    const monthKey = idMatch[2].toLowerCase().slice(0, 3);
    const year = parseInt(idMatch[3], 10);
    const hour = idMatch[4] !== undefined ? parseInt(idMatch[4], 10) : 0;
    const minute = idMatch[5] !== undefined ? parseInt(idMatch[5], 10) : 0;
    if (indonesianMonths[monthKey] !== undefined) {
      return new Date(year, indonesianMonths[monthKey], day, hour, minute, 0);
    }
  }

  // 5. Slash format: "26/10/2026 12:30"
  const slashMatch = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}).*?(\d{1,2})[:.](\d{2})/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    const year = parseInt(slashMatch[3], 10);
    const hour = parseInt(slashMatch[4], 10);
    const minute = parseInt(slashMatch[5], 10);
    return new Date(year, month, day, hour, minute, 0);
  }

  // 6. Format TK-YYYYMMDD-XXX or IZ-YYYYMMDD-XXX or raw YYYYMMDD
  const ymdMatch = raw.match(/(?:TK-|IZ-)?(\d{4})(\d{2})(\d{2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day, 0, 0, 0);
  }

  return null;
}
window.parseTicketDateTime = parseTicketDateTime;

function loadTickets() {
  // Bersihkan cache dan data sesi lama otomatis agar simulasi selalu bersih
  ['KUJANG_GATEPASS_TICKETS_V1', 'KUJANG_GATEPASS_TICKETS_V2', 'KUJANG_GATEPASS_TICKETS_V3', 'KUJANG_GATEPASS_TICKETS_V4', 'KUJANG_GATEPASS_TICKETS_V5', 'KUJANG_GATEPASS_TICKETS_V6', 'KUJANG_GATEPASS_TICKETS_V7', 'KUJANG_GATEPASS_TICKETS_V8'].forEach(k => localStorage.removeItem(k));

  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TICKETS));
    return JSON.parse(JSON.stringify(DEFAULT_TICKETS));
  }
  try {
    let list = JSON.parse(saved);
    let changed = false;
    list = list.map(t => {
      // Pulihkan pratinjau dokumen surat perintah dinas dari sessionStorage jika tersedia
      if (t && t.suratPerintah && !t.suratPerintah.dataUrl && t.id) {
        try {
          const cachedDoc = sessionStorage.getItem('KUJANG_DOC_' + t.id);
          if (cachedDoc) {
            t.suratPerintah.dataUrl = cachedDoc;
          }
        } catch (e) {}
      }
      // Bersihkan residu timeline ganda akibat loop kedaluwarsa sebelumnya jika ada
      if (Array.isArray(t.timeline)) {
        let seenExpiredEvent = false;
        t.timeline = t.timeline.filter(e => {
          const isExp = (e.event && e.event.toLowerCase().includes('kedaluwarsa')) ||
                        (e.desc && e.desc.toLowerCase().includes('kedaluwarsa'));
          if (isExp) {
            if (seenExpiredEvent) {
              changed = true;
              return false;
            }
            seenExpiredEvent = true;
          }
          return true;
        });
      }
      // Pastikan tiket yang dibatalkan atau ditolak tidak berstatus terkunci aktif
      if (t.status === 'Dibatalkan' || t.status === 'Ditolak' || t.status === 'Selesai') {
        if (t.emergencyLocked || t.qrLocked) {
          t.emergencyLocked = false;
          t.qrLocked = false;
          changed = true;
        }
      }
      // Rekonsiliasi tiket IZ-20261009-002 agar memiliki catatan pemindaian gerbang yang valid
      if (t.id === 'IZ-20261009-002') {
        if (!t.scanOutTime || t.scanOutTime === 'null') {
          t.scanOutTime = '06 Nov 2026, 10.05 WIB (Pos 1 Gerbang Utama)';
          t.scanOutGate = 'Pos 1 Gerbang Utama';
          changed = true;
        }
        if (t.approverNote && t.approverNote.includes('Ditolak')) {
          t.approverNote = 'Disetujui. Semoga urusan keluarga lekas terselesaikan dengan baik.';
          changed = true;
        }
      }
      // Pulihkan tanggal jika ada korupsi format ganda atau residu format (misal 2026-10-28T2026-10-29T00.53 WIB:00)
      ['estimatedReturn', 'plannedReturn', 'plannedExit'].forEach(field => {
        if (t[field] && typeof t[field] === 'string') {
          const normFn = (typeof normalizeReturnDateTime === 'function') ? normalizeReturnDateTime : ((typeof window !== 'undefined' && typeof window.normalizeReturnDateTime === 'function') ? window.normalizeReturnDateTime : null);
          if (normFn) {
            const norm = normFn(t[field]);
            if (norm && norm !== t[field]) {
              t[field] = norm;
              changed = true;
            }
          } else if ((t[field].match(/\d{4}-\d{2}-\d{2}/g) || []).length > 1) {
            const lastIdx = t[field].lastIndexOf('20');
            if (lastIdx > 0) {
              t[field] = t[field].slice(lastIdx).replace(/\s*WIB(?::\d{2})?/gi, '');
              changed = true;
            }
          }
        }
      });
      if (t.pendingExtension && t.pendingExtension.newEstimatedReturn && typeof t.pendingExtension.newEstimatedReturn === 'string') {
        const normFn = (typeof normalizeReturnDateTime === 'function') ? normalizeReturnDateTime : ((typeof window !== 'undefined' && typeof window.normalizeReturnDateTime === 'function') ? window.normalizeReturnDateTime : null);
        if (normFn) {
          const norm = normFn(t.pendingExtension.newEstimatedReturn);
          if (norm && norm !== t.pendingExtension.newEstimatedReturn) {
            t.pendingExtension.newEstimatedReturn = norm;
            changed = true;
          }
        } else if ((t.pendingExtension.newEstimatedReturn.match(/\d{4}-\d{2}-\d{2}/g) || []).length > 1) {
          const lastIdx = t.pendingExtension.newEstimatedReturn.lastIndexOf('20');
          if (lastIdx > 0) {
            t.pendingExtension.newEstimatedReturn = t.pendingExtension.newEstimatedReturn.slice(lastIdx).replace(/\s*WIB(?::\d{2})?/gi, '');
            changed = true;
          }
        }
      }
      // Pastikan tiket memiliki metadata NIP approver & supervisor yang presisi
      if (t.approverName && !t.approverNip) {
        if (t.approverName.includes('Subagja')) {
          t.approverNip = 'PK-2012-0543';
          changed = true;
        } else if (t.approverName.includes('Dewi')) {
          t.approverNip = 'PK-2012-0845';
          changed = true;
        } else if (t.approverName.includes('Hendra')) {
          t.approverNip = 'PK-2015-1002';
          changed = true;
        }
      }
      if (t.directSupervisor && !t.directSupervisorNip) {
        if (t.directSupervisor.includes('Subagja')) {
          t.directSupervisorNip = 'PK-2012-0543';
          changed = true;
        } else if (t.directSupervisor.includes('Dewi')) {
          t.directSupervisorNip = 'PK-2012-0845';
          changed = true;
        } else if (t.directSupervisor.includes('Hendra')) {
          t.directSupervisorNip = 'PK-2015-1002';
          changed = true;
        }
      }
      if (t.applicantName && t.applicantName.includes('Siti Rahmawati') && t.approverName && t.approverName.includes('Subagja')) {
        t.approverName = 'Dr. Ahmad Subagja, M.M.';
        t.approverNip = 'PK-2012-0543';
        t.directSupervisor = 'Dr. Ahmad Subagja, M.M.';
        t.directSupervisorNip = 'PK-2012-0543';
        changed = true;
      }

      // Pastikan tiket memiliki metadata gerbang pos
      if (!t.scanOutGate) {
        if (t.id === 'IZ-20261014-003' || t.id === 'IZ-20261002-001') {
          t.scanOutGate = 'Pos 2 Gerbang Barat';
          t.securityOfficerOut = 'Kopral Dani (Pos 2)';
          changed = true;
        } else if (t.id === 'IZ-20261007-004') {
          t.scanOutGate = 'Pos 3 Gerbang Timur';
          t.securityOfficerOut = 'Praka Ilham (Pos 3)';
          changed = true;
        } else if (t.scanOutTime || t.scanInTime) {
          t.scanOutGate = 'Pos 1 Gerbang Utama';
          t.securityOfficerOut = 'Sertu Agus (Pos 1)';
          changed = true;
        }
      }
      return t;
    });
    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
    window.ticketsList = list;
    return list;
  } catch (e) {
    const fallback = JSON.parse(JSON.stringify(DEFAULT_TICKETS));
    window.ticketsList = fallback;
    return fallback;
  }
}

function resetAllTicketsToDefault() {
  try {
    localStorage.clear();
  } catch (e) { }
  window.ticketsList = JSON.parse(JSON.stringify(DEFAULT_TICKETS));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.ticketsList));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
  } catch (e) { }
  window.MOCK_USERS = JSON.parse(JSON.stringify(DEFAULT_USERS));
  if (typeof window.resetAllNotifications === 'function') {
    window.resetAllNotifications();
  }
  if (typeof window.syncActorsFromUsers === 'function') window.syncActorsFromUsers(window.MOCK_USERS);
  if (typeof window.switchRole === 'function') window.switchRole('karyawan');
  if (typeof window.setKaryawanNav === 'function') window.setKaryawanNav('dashboard');
  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
  if (typeof window.renderApproverView === 'function') window.renderApproverView();
  if (typeof window.renderSecurityView === 'function') window.renderSecurityView();
  if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
  if (typeof window.updateApproverMetrics === 'function') window.updateApproverMetrics();
  if (typeof window.updateSecurityMetrics === 'function') window.updateSecurityMetrics();
  if (typeof window.showToast === 'function') window.showToast('✅ Seluruh proses simulasi berhasil direset ke 0! Anda kini dapat mulai mengajukan izin baru.', 'success');
}
window.resetAllTicketsToDefault = resetAllTicketsToDefault;

const USERS_STORAGE_KEY = 'KUJANG_GATEPASS_USERS_V3';

const DEFAULT_USERS = [
  {
    kujangId: 'KJG-991024',
    nip: 'PK-2024-8841',
    name: 'Budi Pratama, S.T.',
    email: 'budi.pratama@pupuk-kujang.co.id',
    department: 'Departemen Rekayasa & Pemeliharaan',
    role: 'Karyawan',
    roleKey: 'karyawan',
    title: 'Staf Rekayasa Mesin',
    directSupervisor: 'Ir. Hendra Gunawan, M.T.',
    supervisor: 'Ir. Hendra Gunawan, M.T.',
    status: 'Aktif',
    registeredAt: '2026-10-15T08:00:00',
    createdAt: '2026-10-15T08:00:00',
    updatedAt: '2026-10-15T08:00:00',
    lastLogin: 'Hari ini, 08:12 WIB'
  },
  {
    kujangId: 'KJG-991025',
    nip: 'PK-2024-8842',
    name: 'Arthur Morgan, S.Tr.T.',
    email: 'arthur.morgan@pupuk-kujang.co.id',
    department: 'Departemen Rekayasa & Pemeliharaan',
    role: 'Karyawan',
    roleKey: 'karyawan2',
    title: 'Staf Instrumentasi & Otomasi Pabrik',
    directSupervisor: 'Ir. Hendra Gunawan, M.T.',
    supervisor: 'Ir. Hendra Gunawan, M.T.',
    status: 'Aktif',
    registeredAt: '2026-10-20T08:00:00',
    createdAt: '2026-10-20T08:00:00',
    updatedAt: '2026-10-20T08:00:00',
    lastLogin: 'Hari ini, 08:30 WIB'
  },
  {
    kujangId: 'KJG-991026',
    nip: 'PK-2024-8845',
    name: 'Moreno Ardiansyah, S.T.',
    email: 'moreno.ardiansyah@pupuk-kujang.co.id',
    department: 'Departemen Rekayasa & Pemeliharaan',
    role: 'Karyawan',
    roleKey: 'karyawan',
    title: 'Staf Rekayasa Pemeliharaan',
    directSupervisor: 'Ir. Hendra Gunawan, M.T.',
    supervisor: 'Ir. Hendra Gunawan, M.T.',
    status: 'Aktif',
    registeredAt: '2026-10-28T08:00:00',
    createdAt: '2026-10-28T08:00:00',
    updatedAt: '2026-10-28T08:00:00',
    lastLogin: 'Hari ini, 08:15 WIB'
  },
  {
    kujangId: 'KJG-991027',
    nip: 'PK-2024-8846',
    name: 'Gusti Pratama, S.Tr.T.',
    email: 'gusti.pratama@pupuk-kujang.co.id',
    department: 'Departemen Rekayasa & Pemeliharaan',
    role: 'Karyawan',
    roleKey: 'karyawan',
    title: 'Staf Instrumentasi Lapangan',
    directSupervisor: 'Dewi Sartika, S.T., M.M.',
    supervisor: 'Dewi Sartika, S.T., M.M.',
    status: 'Aktif',
    registeredAt: '2026-11-02T08:00:00',
    createdAt: '2026-11-02T08:00:00',
    updatedAt: '2026-11-02T08:00:00',
    lastLogin: 'Hari ini, 08:20 WIB'
  },
  {
    kujangId: 'KJG-991028',
    nip: 'PK-2024-8847',
    name: 'Bima Arya Nugraha, S.T.',
    email: 'bima.arya@pupuk-kujang.co.id',
    department: 'Departemen Rekayasa & Pemeliharaan',
    role: 'Karyawan',
    roleKey: 'karyawan',
    title: 'Staf Sistem Kontrol Pabrik',
    directSupervisor: 'Dewi Sartika, S.T., M.M.',
    supervisor: 'Dewi Sartika, S.T., M.M.',
    status: 'Aktif',
    registeredAt: '2026-11-08T08:00:00',
    createdAt: '2026-11-08T08:00:00',
    updatedAt: '2026-11-08T08:00:00',
    lastLogin: 'Hari ini, 08:25 WIB'
  },
  {
    kujangId: 'KJG-881201',
    nip: 'PK-2015-1002',
    name: 'Ir. Hendra Gunawan, M.T.',
    email: 'hendra.gunawan@pupuk-kujang.co.id',
    department: 'Departemen Rekayasa & Pemeliharaan',
    role: 'Atasan 1 (Manager)',
    roleKey: 'approver',
    status: 'Aktif',
    registeredAt: '2026-09-01T08:00:00',
    createdAt: '2026-09-01T08:00:00',
    updatedAt: '2026-09-01T08:00:00',
    lastLogin: 'Hari ini, 07:45 WIB'
  },
  {
    kujangId: 'KJG-881202',
    nip: 'PK-2012-0845',
    name: 'Dewi Sartika, S.T., M.M.',
    email: 'dewi.sartika@pupuk-kujang.co.id',
    department: 'Departemen Rekayasa & Pemeliharaan',
    role: 'Atasan 2 (Supervisor / Plt)',
    roleKey: 'approver2',
    status: 'Aktif',
    registeredAt: '2026-09-15T08:00:00',
    createdAt: '2026-09-15T08:00:00',
    updatedAt: '2026-09-15T08:00:00',
    lastLogin: 'Hari ini, 08:05 WIB'
  },
  {
    kujangId: 'KJG-774419',
    nip: 'SEC-2018-042',
    name: 'Sertu Agus',
    email: 'pos1.security@pupuk-kujang.co.id',
    department: 'Departemen Pengamanan & K3',
    role: 'Petugas Pengamanan (Pos 1)',
    roleKey: 'security',
    status: 'Aktif',
    registeredAt: '2026-10-05T08:00:00',
    createdAt: '2026-10-05T08:00:00',
    updatedAt: '2026-10-05T08:00:00',
    lastLogin: 'Hari ini, 06:00 WIB'
  },
  {
    kujangId: 'KJG-774420',
    nip: 'SEC-2019-088',
    name: 'Kopral Dani',
    email: 'pos2.security@pupuk-kujang.co.id',
    department: 'Departemen Pengamanan & K3',
    role: 'Petugas Pengamanan (Pos 2)',
    roleKey: 'security',
    status: 'Aktif',
    registeredAt: '2026-10-06T08:00:00',
    createdAt: '2026-10-06T08:00:00',
    updatedAt: '2026-10-06T08:00:00',
    lastLogin: 'Kemarin, 22:00 WIB'
  },
  {
    kujangId: 'KJG-774421',
    nip: 'SEC-2020-105',
    name: 'Praka Ilham',
    email: 'pos3.security@pupuk-kujang.co.id',
    department: 'Departemen Pengamanan & K3',
    role: 'Petugas Pengamanan (Pos 3)',
    roleKey: 'security',
    status: 'Aktif',
    registeredAt: '2026-10-07T08:00:00',
    createdAt: '2026-10-07T08:00:00',
    updatedAt: '2026-10-07T08:00:00',
    lastLogin: 'Hari ini, 07:00 WIB'
  },
  {
    kujangId: 'KJG-661009',
    nip: 'ADM-2016-019',
    name: 'Bambang Sutrisno, S.T.',
    email: 'bambang.sutrisno@pupuk-kujang.co.id',
    department: 'Departemen Pengamanan & K3',
    role: 'Administrator Pengamanan & K3',
    roleKey: 'admin',
    status: 'Aktif',
    registeredAt: '2026-10-01T08:00:00',
    createdAt: '2026-10-01T08:00:00',
    updatedAt: '2026-10-01T08:00:00',
    lastLogin: 'Hari ini, 08:00 WIB'
  },
  {
    kujangId: 'KJG-991055',
    nip: 'PK-2022-7719',
    name: 'Siti Rahmawati, S.Tr.',
    email: 'siti.rahmawati@pupuk-kujang.co.id',
    titleCustom: 'Operator Lapangan Amonia-1A',
    department: 'Departemen Produksi Amonia-1A',
    role: 'Karyawan',
    roleKey: 'karyawan',
    title: 'Operator Lapangan Amonia-1A',
    directSupervisor: 'Dr. Ahmad Subagja, M.M.',
    supervisor: 'Dr. Ahmad Subagja, M.M.',
    status: 'Aktif',
    registeredAt: '2026-11-12T08:00:00',
    createdAt: '2026-11-12T08:00:00',
    updatedAt: '2026-11-12T08:00:00',
    lastLogin: 'Kemarin, 14:15 WIB'
  },
  {
    kujangId: 'KJG-881299',
    nip: 'PK-2012-0543',
    name: 'Dr. Ahmad Subagja, M.M.',
    email: 'ahmad.subagja@pupuk-kujang.co.id',
    department: 'Departemen Produksi Amonia-1A',
    role: 'Atasan 1 (Manager)',
    roleKey: 'approver',
    status: 'Aktif',
    registeredAt: '2026-09-20T08:00:00',
    createdAt: '2026-09-20T08:00:00',
    updatedAt: '2026-09-20T08:00:00',
    lastLogin: 'Hari ini, 08:30 WIB'
  }
];

function loadUsers() {
  let deletedList = [];
  try {
    deletedList = JSON.parse(localStorage.getItem('KUJANG_DELETED_USERS') || '[]');
  } catch (e) { }
  const deletedNips = new Set(deletedList.map(d => d.nip).filter(Boolean));
  const deletedKujangIds = new Set(deletedList.map(d => d.kujangId).filter(Boolean));
  const deletedNames = new Set(deletedList.map(d => d.name).filter(Boolean));

  const isUserDeleted = (u) => {
    if (!u) return false;
    if (u.kujangId && deletedKujangIds.has(u.kujangId)) return true;
    if (u.nip && deletedNips.has(u.nip)) return true;
    if (u.name && deletedNames.has(u.name)) return true;
    return false;
  };

  const saved = localStorage.getItem(USERS_STORAGE_KEY);
  if (!saved) {
    const initUsers = DEFAULT_USERS.filter(u => !isUserDeleted(u));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initUsers));
    return JSON.parse(JSON.stringify(initUsers));
  }
  try {
    let users = JSON.parse(saved);
    // Explicitly strip any users in deletedList
    users = users.filter(u => !isUserDeleted(u));

    // DEDUPLIKASI OTOMATIS: Pastikan tidak ada akun ganda dengan NIP atau Nama yang sama
    const seenUsers = new Map();
    let changed = false;
    users = users.filter(u => {
      if (!u) return false;
      const nipKey = (u.nip || '').trim().toLowerCase();
      const nameKey = (u.name || '').trim().toLowerCase();
      const key = nipKey ? `nip:${nipKey}` : (nameKey ? `name:${nameKey}` : u.kujangId);
      if (seenUsers.has(key)) {
        changed = true;
        return false;
      }
      seenUsers.set(key, true);
      return true;
    });
    users.forEach(u => {
      if (u.role && u.role.toLowerCase().includes('pemohon')) {
        u.role = 'Karyawan';
        changed = true;
      }
      const defU = DEFAULT_USERS.find(d => d.kujangId === u.kujangId || d.nip === u.nip);
      if (defU) {
        if (!u.registeredAt && defU.registeredAt) {
          u.registeredAt = defU.registeredAt;
          u.createdAt = defU.createdAt || defU.registeredAt;
          u.updatedAt = defU.updatedAt || defU.registeredAt;
          changed = true;
        }
        if (!u.directSupervisor && defU.directSupervisor) {
          u.directSupervisor = defU.directSupervisor;
          u.supervisor = defU.supervisor || defU.directSupervisor;
          changed = true;
        }
      }
    });

    DEFAULT_USERS.forEach(defU => {
      if (!isUserDeleted(defU)) {
        if (!users.some(u => u.nip === defU.nip || u.kujangId === defU.kujangId)) {
          users.push(defU);
          changed = true;
        }
      }
    });
    if (changed || users.length !== JSON.parse(saved).length) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }

    // Pulihkan activeEmployeeUser dari localStorage jika tersimpan
    try {
      const savedEmpNip = localStorage.getItem('KUJANG_ACTIVE_EMP_NIP');
      if (savedEmpNip) {
        const found = users.find(u => u.nip === savedEmpNip && u.status === 'Aktif');
        if (found) {
          window.activeEmployeeUser = found;
        }
      }
    } catch (e) { }

    // Pulihkan activeApproverUser dari localStorage jika tersimpan
    try {
      const savedApprNip = localStorage.getItem('KUJANG_ACTIVE_APPR_NIP');
      if (savedApprNip) {
        const found = users.find(u => u.nip === savedApprNip && u.status === 'Aktif');
        if (found) {
          window.activeApproverUser = found;
        }
      }
    } catch (e) { }

    // Pulihkan activeSecurityUser dari localStorage jika tersimpan
    try {
      const savedSecNip = localStorage.getItem('KUJANG_ACTIVE_SEC_NIP');
      if (savedSecNip) {
        const found = users.find(u => u.nip === savedSecNip && u.status === 'Aktif');
        if (found) {
          window.activeSecurityUser = found;
        }
      }
    } catch (e) { }

    return users;
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_USERS.filter(u => !isUserDeleted(u))));
  }
}

// Helper sentral untuk mendapatkan Atasan Utama yang sedang aktif (menghormati naungan atasan masing-masing karyawan)
function getPrimaryApprover(empNameOrKujangId) {
  const users = (typeof loadUsers === 'function' ? loadUsers() : window.MOCK_USERS) || [];
  const currentEmp = (typeof window.getCurrentEmployeeActor === 'function') ? window.getCurrentEmployeeActor() : (window.ACTORS ? window.ACTORS.karyawan : null);
  const targetEmpName = empNameOrKujangId || (currentEmp ? currentEmp.name : null);
  let assignedSupName = null;

  if (targetEmpName) {
    const empUser = users.find(u => u.name === targetEmpName || u.kujangId === targetEmpName || u.nip === targetEmpName);
    if (empUser && (empUser.directSupervisor || empUser.supervisor)) {
      assignedSupName = empUser.directSupervisor || empUser.supervisor;
    }
  }

  if (!assignedSupName && window.ACTORS && window.ACTORS.karyawan && window.ACTORS.karyawan.approverName) {
    assignedSupName = window.ACTORS.karyawan.approverName;
  }

  if (assignedSupName) {
    const matchedSup = users.find(u => u.name === assignedSupName && u.status === 'Aktif');
    if (matchedSup) return matchedSup;
    const partialMatch = users.find(u => (u.roleKey === 'approver' || u.roleKey === 'approver2') && u.status === 'Aktif' && (u.name.includes(assignedSupName) || assignedSupName.includes(u.name)));
    if (partialMatch) return partialMatch;
    return { name: assignedSupName, status: 'Aktif' };
  }

  return users.find(u => u.roleKey === 'approver' && u.status === 'Aktif') || users.find(u => u.roleKey === 'approver2' && u.status === 'Aktif') || null;
}
window.getPrimaryApprover = getPrimaryApprover;

// Bersihkan data peninggalan delegasi wewenang bila ada di storage
try {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('kujang_delegasi_wewenang');
  }
} catch (e) { }

// Sinkronisasi seluruh aktor sistem dari data direktori pengguna (MOCK_USERS)
function syncActorsFromUsers(data) {
  const users = data || (typeof loadUsers === 'function' ? loadUsers() : window.MOCK_USERS) || [];

  // 1. Sinkronisasi Karyawan (sesuai akun aktif atau fallback ke Budi Pratama)
  const activeEmpNip = (window.activeEmployeeUser && window.activeEmployeeUser.nip) ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('KUJANG_ACTIVE_EMP_NIP') : null);
  const activeEmpTarget = (activeEmpNip ? users.find(u => u.nip === activeEmpNip && u.status === 'Aktif') : null) ||
    window.activeEmployeeUser ||
    users.find(u => u.kujangId === 'KJG-991024' || u.nip === 'PK-2024-8841' || (u.name && u.name.includes('Budi Pratama'))) ||
    users.find(u => (u.roleKey === 'karyawan' || (u.role && u.role.toLowerCase().includes('karyawan'))) && u.status === 'Aktif');
  if (activeEmpTarget && window.ACTORS && window.ACTORS.karyawan) {
    window.ACTORS.karyawan.name = activeEmpTarget.name;
    window.ACTORS.karyawan.nip = activeEmpTarget.nip;
    if (activeEmpTarget.department) window.ACTORS.karyawan.department = activeEmpTarget.department;
    if (activeEmpTarget.role) window.ACTORS.karyawan.title = activeEmpTarget.role;
    if (activeEmpTarget.directSupervisor || activeEmpTarget.supervisor) {
      window.ACTORS.karyawan.approverName = activeEmpTarget.directSupervisor || activeEmpTarget.supervisor;
    }
  }

  // 2. Sinkronisasi Atasan Utama (Approver 1 / Manager)
  const primaryApprover = users.find(u => u.roleKey === 'approver' && u.status === 'Aktif');

  // 1b. Sinkronisasi Karyawan Pemohon 2 (Arthur Morgan)
  const activeEmp2Sync = users.find(u => u.roleKey === 'karyawan2' && u.status === 'Aktif');
  if (window.ACTORS) {
    if (activeEmp2Sync) {
      window.ACTORS.karyawan2 = {
        nip: activeEmp2Sync.nip || 'PK-2024-8842',
        name: activeEmp2Sync.name,
        title: activeEmp2Sync.role || 'Staf Instrumentasi & Otomasi Pabrik',
        department: activeEmp2Sync.department || 'Departemen Rekayasa & Pemeliharaan',
        roleLabel: 'Karyawan 2',
        approverName: (activeEmp2Sync.directSupervisor || activeEmp2Sync.supervisor) || (primaryApprover ? primaryApprover.name : 'Ir. Hendra Gunawan, M.T.')
      };
    } else if (!window.ACTORS.karyawan2) {
      window.ACTORS.karyawan2 = {
        nip: 'PK-2024-8842',
        name: 'Arthur Morgan, S.Tr.T.',
        title: 'Staf Instrumentasi & Otomasi Pabrik',
        department: 'Departemen Rekayasa & Pemeliharaan',
        roleLabel: 'Karyawan 2',
        approverName: 'Ir. Hendra Gunawan, M.T.'
      };
    }
  }

  // 2b. Sinkronisasi Data Approver 1 ke window.ACTORS
  if (window.ACTORS) {
    if (primaryApprover) {
      window.ACTORS.approver = {
        nip: primaryApprover.nip || 'PK-2015-1002',
        name: primaryApprover.name,
        title: primaryApprover.role || 'Manager Rekayasa & Pemeliharaan',
        department: primaryApprover.department || 'Departemen Rekayasa & Pemeliharaan',
        roleLabel: 'Atasan 1 (Manager)'
      };
      if (window.ACTORS.karyawan && !window.ACTORS.karyawan.approverName) {
        window.ACTORS.karyawan.approverName = primaryApprover.name;
      }
    } else {
      window.ACTORS.approver = {
        nip: '-',
        name: 'Pejabat Belum Ditugaskan',
        title: 'Manager Rekayasa & Pemeliharaan',
        department: 'Departemen Rekayasa & Pemeliharaan',
        roleLabel: 'Atasan 1 (Manager)'
      };
      if (window.ACTORS.karyawan) {
        window.ACTORS.karyawan.approverName = '';
      }
    }
  }

  // 3. Sinkronisasi Atasan 2 (Supervisor Operasional / Plt)
  const secondaryApprover = users.find(u => u.roleKey === 'approver2' && u.status === 'Aktif');
  if (window.ACTORS) {
    if (secondaryApprover) {
      window.ACTORS.approver2 = {
        nip: secondaryApprover.nip || 'PK-2012-0845',
        name: secondaryApprover.name,
        title: secondaryApprover.role || 'Supervisor Operasional Lapangan (Plt. Manager)',
        department: secondaryApprover.department || 'Departemen Rekayasa & Pemeliharaan',
        roleLabel: 'Atasan 2 (Supervisor / Plt)'
      };
    } else {
      window.ACTORS.approver2 = {
        nip: '-',
        name: 'Pejabat Belum Ditugaskan',
        title: 'Supervisor Operasional Lapangan (Plt. Manager)',
        department: 'Departemen Rekayasa & Pemeliharaan',
        roleLabel: 'Atasan 2 (Supervisor / Plt)'
      };
    }
  }

  // 4. Sinkronisasi Petugas Pengamanan / Security
  const activeSecNip = (window.activeSecurityUser && window.activeSecurityUser.nip) ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('KUJANG_ACTIVE_SEC_NIP') : null);
  const activeSecSync = (activeSecNip ? users.find(u => u.nip === activeSecNip && u.status === 'Aktif') : null) ||
    window.activeSecurityUser ||
    users.find(u => (u.roleKey === 'security' || (u.role && u.role.toLowerCase().includes('pengamanan'))) && u.status === 'Aktif');
  if (activeSecSync && window.ACTORS && window.ACTORS.security) {
    window.ACTORS.security.name = activeSecSync.name;
    window.ACTORS.security.nip = activeSecSync.nip;
    if (activeSecSync.department) window.ACTORS.security.department = activeSecSync.department;
    if (activeSecSync.role) window.ACTORS.security.title = activeSecSync.role;
  }
}
window.syncActorsFromUsers = syncActorsFromUsers;

function saveUsers(data) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(data));
  window.MOCK_USERS = data;
  syncActorsFromUsers(data);

  const sideNameEl = document.getElementById('sidebarUserName');
  const sideSubEl = document.getElementById('sidebarUserSub');
  const curRole = window.currentActor || 'karyawan';
  if (sideNameEl && sideSubEl && window.ACTORS && window.ACTORS[curRole]) {
    sideNameEl.textContent = window.ACTORS[curRole].name;
    sideSubEl.textContent = 'NIP: ' + window.ACTORS[curRole].nip;
  }
  if (typeof window.syncApproversToForms === 'function') {
    window.syncApproversToForms();
  }
  if (typeof window.renderKaryawanDashboard === 'function') {
    window.renderKaryawanDashboard();
  }
  if (typeof window.renderKaryawanView === 'function') {
    window.renderKaryawanView();
  }
}

const MOCK_USERS = loadUsers();
syncActorsFromUsers(MOCK_USERS);

// Fungsi sentral untuk mendapatkan seluruh Atasan yang HAK AKSESNYA AKTIF
function getActiveApprovers() {
  const users = (typeof loadUsers === 'function' ? loadUsers() : window.MOCK_USERS) || [];
  let deletedList = [];
  try {
    deletedList = JSON.parse(localStorage.getItem('KUJANG_DELETED_USERS') || '[]');
  } catch (e) { }
  const deletedNips = new Set(deletedList.map(d => d.nip).filter(Boolean));
  const deletedKujangIds = new Set(deletedList.map(d => d.kujangId).filter(Boolean));
  const deletedNames = new Set(deletedList.map(d => d.name).filter(Boolean));

  const approverUsers = [];
  const seenNip = new Set();
  const seenName = new Set();

  users.forEach(u => {
    if (!u) return;
    const kujangK = (u.kujangId || '').trim().toLowerCase();
    const nipK = (u.nip || '').trim().toLowerCase();
    const nameK = (u.name || '').trim().toLowerCase();

    if (kujangK && deletedKujangIds.has(kujangK)) return;
    if (nipK && deletedNips.has(nipK)) return;
    if (nameK && deletedNames.has(nameK)) return;

    const isApproverRole = u.roleKey === 'approver' || u.roleKey === 'approver2' ||
      (u.role && (u.role.toLowerCase().includes('atasan') || u.role.toLowerCase().includes('manager') || u.role.toLowerCase().includes('supervisor')));
    if (!isApproverRole) return;

    if (nipK && seenNip.has(nipK)) return;
    if (nameK && seenName.has(nameK)) return;
    if (nipK) seenNip.add(nipK);
    if (nameK) seenName.add(nameK);

    approverUsers.push(u);
  });

  const avatarPalettes = [
    'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
    'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
    'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
    'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)'
  ];

  // Ambil atasan langsung dari profil karyawan aktif saat ini
  const activeEmpCur = (typeof window.getCurrentEmployeeActor === 'function')
    ? window.getCurrentEmployeeActor()
    : ((window.ACTORS && window.ACTORS.karyawan) ? window.ACTORS.karyawan : null);
  const currentEmpApprover = (activeEmpCur && (activeEmpCur.directSupervisor || activeEmpCur.supervisor || activeEmpCur.approverName))
    ? (activeEmpCur.directSupervisor || activeEmpCur.supervisor || activeEmpCur.approverName)
    : ((window.ACTORS && window.ACTORS.karyawan) ? window.ACTORS.karyawan.approverName : '');

  return approverUsers.map((u, idx) => {
    const isApprover1 = u.roleKey === 'approver' || (u.name && u.name.includes('Hendra Gunawan'));
    const isApprover2 = u.roleKey === 'approver2' || (u.name && u.name.includes('Dewi Sartika'));
    const isRevoked = u.status === 'Dicabut' || u.status === 'Nonaktif';

    return {
      nip: u.nip || '',
      name: u.name,
      displayName: u.name,
      status: u.status || 'Aktif',
      isUnavailable: isRevoked,
      statusLabel: isRevoked ? 'Tidak tersedia' : 'Aktif',
      title: u.role || (isApprover1 ? 'Atasan 1 (Manager)' : 'Atasan 2 (Supervisor / Plt)'),
      department: u.department || 'Departemen Rekayasa & Pemeliharaan',
      isDirectSupervisor: Boolean(
        currentEmpApprover && (
          u.name.toLowerCase() === currentEmpApprover.toLowerCase() ||
          u.name.toLowerCase().includes(currentEmpApprover.toLowerCase()) ||
          currentEmpApprover.toLowerCase().includes(u.name.toLowerCase())
        )
      ),
      avatarBg: avatarPalettes[idx % avatarPalettes.length]
    };
  });
}

function saveTickets(data) {
  const seenIds = new Set();
  const cleanData = (data || []).filter(item => {
    if (!item || !item.id || seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });
  data = cleanData;
  window.ticketsList = data;

  // Sanitasi & Proteksi Kuota Browser: Pisahkan DataURL berukuran besar ke sessionStorage
  const safeData = data.map(item => {
    if (!item) return item;
    if (item.suratPerintah) {
      if (item.suratPerintah.dataUrl && item.id) {
        try {
          sessionStorage.setItem('KUJANG_DOC_' + item.id, item.suratPerintah.dataUrl);
        } catch (e) {
          console.warn('SessionStorage quota exceeded for doc:', e);
        }
      }
      // Simpan metadata ringan saja di localStorage tanpa base64 mentah jutaan karakter
      const { dataUrl, ...restDoc } = item.suratPerintah;
      return {
        ...item,
        suratPerintah: restDoc
      };
    }
    return item;
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeData));
  } catch (err) {
    console.warn('Gagal menyimpan tiket ke localStorage (kuota penuh atau akses terbatas), mencoba fallback minimal:', err);
    try {
      const minimalData = safeData.map(t => {
        const copy = { ...t };
        if (copy.suratPerintah) {
          copy.suratPerintah = {
            name: copy.suratPerintah.name || 'Surat_Perintah_Dinas.pdf',
            size: copy.suratPerintah.size || 150000,
            type: copy.suratPerintah.type || 'application/pdf',
            uploadedAt: copy.suratPerintah.uploadedAt || new Date().toISOString()
          };
        }
        return copy;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalData));
    } catch (fallbackErr) {
      console.error('Penyimpanan tiket gagal total:', fallbackErr);
    }
    if (typeof window.showToast === 'function') {
      window.showToast('Peringatan: Memori browser penuh. Data disimpan di sesi aktif.', 'warning');
    }
  }
  window.ticketsList = data;
  if (typeof window.refreshAllDashboardData === 'function') {
    window.refreshAllDashboardData();
  } else if (typeof window.renderAllCharts === 'function') {
    window.renderAllCharts();
  }
}

let ticketsList = loadTickets();
let activeEmpStatusFilter = 'all';
let currentEmpViewMode = 'card';
let currentDecisionTicketId = null;
let currentCancelTicketId = null;
let pendingFormData = null;

// Expose variables globally on window
window.STORAGE_KEY = STORAGE_KEY;
window.USERS_STORAGE_KEY = USERS_STORAGE_KEY;
window.ACTORS = ACTORS;
window.DEFAULT_USERS = DEFAULT_USERS;
window.loadUsers = loadUsers;
window.saveUsers = saveUsers;
window.MOCK_USERS = MOCK_USERS;
window.getActiveApprovers = getActiveApprovers;
window.loadTickets = loadTickets;
window.saveTickets = saveTickets;
window.ticketsList = ticketsList;
window.currentActor = currentActor;
window.activeEmpStatusFilter = activeEmpStatusFilter;
window.currentEmpViewMode = currentEmpViewMode;
window.currentDecisionTicketId = currentDecisionTicketId;
window.currentCancelTicketId = currentCancelTicketId;
window.pendingFormData = pendingFormData;

// Properti getter dinamis agar setiap pembacaan window.MOCK_APPROVERS selalu mengembalikan atasan aktif
try {
  Object.defineProperty(window, 'MOCK_APPROVERS', {
    get: function () {
      return getActiveApprovers();
    },
    configurable: true
  });
} catch (e) {
  window.MOCK_APPROVERS = getActiveApprovers();
}



// ==========================================
// CENTRAL PROFILE PHOTO HELPERS (PT PUPUK KUJANG)
// ==========================================
window.getEmployeePhotoUrl = function (nameOrNip) {
  if (!nameOrNip) return 'img/avatars/default.svg';
  const str = String(nameOrNip).toLowerCase();
  if (str.includes('budi') || str.includes('8841')) return 'img/avatars/budi.svg';
  if (str.includes('arthur') || str.includes('morgan') || str.includes('8842')) return 'img/avatars/arthur.svg';
  if (str.includes('hendra') || str.includes('gunawan') || str.includes('1002')) return 'img/avatars/hendra.svg';
  if (str.includes('dewi') || str.includes('sartika') || str.includes('0845')) return 'img/avatars/dewi.svg';
  if (str.includes('agus') || str.includes('sertu') || str.includes('042') || str.includes('sec')) return 'img/avatars/agus.svg';
  if (str.includes('bambang') || str.includes('sutrisno') || str.includes('019') || str.includes('adm')) return 'img/avatars/bambang.svg';
  return 'img/avatars/default.svg';
};

window.renderUserPhoto = function (nameOrNip, size = 24, extraStyle = '') {
  const url = window.getEmployeePhotoUrl(nameOrNip);
  return `<img src="${url}" alt="Foto ${nameOrNip || 'Karyawan'}" class="user-profile-photo-inline" style="width:${size}px; height:${size}px; min-width:${size}px; min-height:${size}px; border-radius:50%; object-fit:cover; vertical-align:middle; display:inline-block; margin-right:6px; border:1px solid rgba(0,0,0,0.12); box-shadow:0 1px 3px rgba(0,0,0,0.08); flex-shrink:0; ${extraStyle}">`;
};
