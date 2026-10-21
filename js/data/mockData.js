/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Data State & Shared Storage
 */

const STORAGE_KEY = 'KUJANG_GATEPASS_TICKETS_V7';

const ACTORS = {
  karyawan: {
    nip: 'PK-2024-8841',
    name: 'Budi Pratama, S.T.',
    title: 'Staf Rekayasa Mesin',
    department: 'Departemen Rekayasa & Pemeliharaan',
    roleLabel: 'Karyawan Pemohon',
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
const DEFAULT_TICKETS = [
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
    plannedExit: '2026-10-19T10:00',
    estimatedReturn: '2026-10-19T13:00',
    status: 'Selesai',
    createdAt: '19 Okt 2026, 09.20 WIB',
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverTitle: 'Manajer Rekayasa & Pemeliharaan',
    approverNote: 'Disetujui. Koordinasikan hasil pemeriksaan setelah kembali.',
    scanOutTime: '19 Okt 2026, 10.05 WIB (Pos 1 Gerbang Utama)',
    scanInTime: '19 Okt 2026, 12.50 WIB (Pos 1 Gerbang Utama)',
    timeline: [
      { event: 'Pengajuan diajukan', time: '19 Okt 2026 • 09.20 WIB', by: 'Budi Pratama, S.T.', desc: 'Dinas Kantor • Kembali ke Area' },
      { event: 'Disetujui oleh atasan', time: '19 Okt 2026 • 09.35 WIB', by: 'Ir. Hendra Gunawan, M.T. • Manajer Rekayasa & Pemeliharaan', desc: 'Disetujui. Koordinasikan hasil pemeriksaan setelah kembali.' },
      { event: 'Scan Out tercatat', time: '19 Okt 2026 • 10.05 WIB', by: 'Sertu Agus (Pos 1)', desc: 'Pos 1 • Karyawan meninggalkan area' },
      { event: 'Scan In tercatat', time: '19 Okt 2026 • 12.50 WIB', by: 'Sertu Agus (Pos 1)', desc: 'Pos 1 • Karyawan kembali ke area pabrik' }
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
    plannedExit: '2026-10-16T09:00',
    estimatedReturn: '2026-10-16T11:00',
    status: 'Selesai',
    createdAt: '16 Okt 2026, 08.15 WIB',
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Disetujui. Selesai tepat waktu.',
    scanOutTime: '16 Okt 2026, 09.05 WIB (Pos 1)',
    scanInTime: '16 Okt 2026, 10.55 WIB (Pos 1)',
    timeline: [
      { event: 'Pengajuan Dibuat', time: '16 Okt 2026, 08.15 WIB', by: 'Budi Pratama', desc: 'Pengajuan izin dinas.' },
      { event: 'Disetujui', time: '16 Okt 2026, 08.30 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui.' },
      { event: 'Scan Out', time: '16 Okt 2026, 09.05 WIB', by: 'Pos 1', desc: 'Karyawan keluar.' },
      { event: 'Scan In', time: '16 Okt 2026, 10.55 WIB', by: 'Pos 1', desc: 'Kembali ke area tepat waktu.' }
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
    plannedExit: '2026-10-14T13:00',
    estimatedReturn: '2026-10-14T14:30',
    status: 'Selesai',
    createdAt: '14 Okt 2026, 11.30 WIB',
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Disetujui.',
    scanOutTime: '14 Okt 2026, 13.02 WIB (Pos 1)',
    scanInTime: '14 Okt 2026, 14.25 WIB (Pos 1)',
    timeline: [
      { event: 'Pengajuan Dibuat', time: '14 Okt 2026, 11.30 WIB', by: 'Budi Pratama', desc: 'Izin urusan pribadi.' },
      { event: 'Disetujui', time: '14 Okt 2026, 11.45 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui.' },
      { event: 'Scan Out', time: '14 Okt 2026, 13.02 WIB', by: 'Pos 1', desc: 'Keluar gerbang.' },
      { event: 'Scan In', time: '14 Okt 2026, 14.25 WIB', by: 'Pos 1', desc: 'Kembali tepat waktu.' }
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
    plannedExit: '2026-10-12T10:00',
    estimatedReturn: '2026-10-12T12:00',
    status: 'Selesai',
    isLate: true,
    lateMinutes: 10,
    actualReturnTime: '12.10 WIB',
    createdAt: '12 Okt 2026, 09.00 WIB',
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Kembali terlambat 10 menit dikarenakan kepadatan jalur arteri Cikampek.',
    scanOutTime: '12 Okt 2026, 10.04 WIB (Pos 1)',
    scanInTime: '12 Okt 2026, 12.10 WIB (Pos 1)',
    timeline: [
      { event: 'Pengajuan Dibuat', time: '12 Okt 2026, 09.00 WIB', by: 'Budi Pratama', desc: 'Izin dinas.' },
      { event: 'Disetujui', time: '12 Okt 2026, 09.20 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui.' },
      { event: 'Scan Out', time: '12 Okt 2026, 10.04 WIB', by: 'Pos 1', desc: 'Keluar area.' },
      { event: 'Scan In Terlambat', time: '12 Okt 2026, 12.10 WIB', by: 'Pos 1', desc: 'Karyawan kembali 10 menit melewati estimasi 12.00 WIB.' }
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
    plannedExit: '2026-10-09T15:00',
    estimatedReturn: null,
    status: 'Ditolak',
    rejectionReason: 'Ditolak: alasan tidak memadai',
    createdAt: '09 Okt 2026, 14.10 WIB',
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Ditolak: alasan tidak memadai. Mohon koordinasikan dengan rekan kerja terlebih dahulu.',
    scanOutTime: null,
    scanInTime: null,
    timeline: [
      { event: 'Pengajuan Dibuat', time: '09 Okt 2026, 14.10 WIB', by: 'Budi Pratama', desc: 'Pengajuan pulang mendahului.' },
      { event: 'Ditolak Atasan', time: '09 Okt 2026, 14.40 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Ditolak: alasan tidak memadai.' }
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
    plannedExit: '2026-10-07T09:00',
    estimatedReturn: '2026-10-07T12:00',
    status: 'Selesai',
    createdAt: '07 Okt 2026, 08.20 WIB',
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Disetujui. Selesai tepat waktu.',
    scanOutTime: '07 Okt 2026, 09.00 WIB (Pos 1)',
    scanInTime: '07 Okt 2026, 11.50 WIB (Pos 1)',
    timeline: [
      { event: 'Pengajuan Dibuat', time: '07 Okt 2026, 08.20 WIB', by: 'Budi Pratama', desc: 'Izin dinas.' },
      { event: 'Disetujui', time: '07 Okt 2026, 08.40 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui.' },
      { event: 'Scan Out', time: '07 Okt 2026, 09.00 WIB', by: 'Pos 1', desc: 'Keluar area.' },
      { event: 'Scan In', time: '07 Okt 2026, 11.50 WIB', by: 'Pos 1', desc: 'Kembali tepat waktu.' }
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
    plannedExit: '2026-10-05T08:00',
    estimatedReturn: '2026-10-05T16:00',
    status: 'Selesai',
    createdAt: '05 Okt 2026, 07.15 WIB',
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Disetujui.',
    scanOutTime: '05 Okt 2026, 08.10 WIB (Pos 1)',
    scanInTime: '05 Okt 2026, 15.45 WIB (Pos 1)',
    timeline: [
      { event: 'Pengajuan Dibuat', time: '05 Okt 2026, 07.15 WIB', by: 'Budi Pratama', desc: 'Izin dinas.' },
      { event: 'Disetujui', time: '05 Okt 2026, 07.30 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui.' },
      { event: 'Scan Out', time: '05 Okt 2026, 08.10 WIB', by: 'Pos 1', desc: 'Keluar area.' },
      { event: 'Scan In', time: '05 Okt 2026, 15.45 WIB', by: 'Pos 1', desc: 'Kembali tepat waktu.' }
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
    plannedExit: '2026-10-02T10:00',
    estimatedReturn: '2026-10-02T12:00',
    status: 'Selesai',
    isEmergency: true,
    createdAt: '02 Okt 2026, 09.50 WIB',
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Izin darurat disetujui.',
    scanOutTime: '02 Okt 2026, 09.55 WIB (Pos 1)',
    scanInTime: '02 Okt 2026, 11.40 WIB (Pos 1)',
    timeline: [
      { event: 'Pengajuan Darurat', time: '02 Okt 2026, 09.50 WIB', by: 'Budi Pratama', desc: 'Pengajuan darurat poliklinik.' },
      { event: 'Otorisasi Atasan', time: '02 Okt 2026, 09.52 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Otorisasi darurat.' },
      { event: 'Scan Out', time: '02 Okt 2026, 09.55 WIB', by: 'Pos 1', desc: 'Keluar area.' },
      { event: 'Scan In', time: '02 Okt 2026, 11.40 WIB', by: 'Pos 1', desc: 'Kembali ke area.' }
    ]
  }
];

function loadTickets() {
  // Bersihkan cache dan data sesi lama otomatis agar simulasi selalu bersih
  ['KUJANG_GATEPASS_TICKETS_V1', 'KUJANG_GATEPASS_TICKETS_V2', 'KUJANG_GATEPASS_TICKETS_V3', 'KUJANG_GATEPASS_TICKETS_V4', 'KUJANG_GATEPASS_TICKETS_V5', 'KUJANG_GATEPASS_TICKETS_V6'].forEach(k => localStorage.removeItem(k));

  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TICKETS));
    return JSON.parse(JSON.stringify(DEFAULT_TICKETS));
  }
  try {
    let list = JSON.parse(saved);
    let changed = false;
    list = list.map(t => {
      // Pulihkan tiket darurat jika sebelumnya terlanjur ditandai Kedaluwarsa oleh scheduler lama
      if ((t.isEmergency || (t.id && t.id.startsWith('TK-EMG'))) && t.status === 'Kedaluwarsa') {
        t.status = 'Disetujui';
        changed = true;
      }
      // Pastikan tiket yang dibatalkan atau ditolak tidak berstatus terkunci aktif
      if (t.status === 'Dibatalkan' || t.status === 'Ditolak' || t.status === 'Selesai') {
        if (t.emergencyLocked || t.qrLocked) {
          t.emergencyLocked = false;
          t.qrLocked = false;
          changed = true;
        }
      }
      return t;
    });
    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
    return list;
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_TICKETS));
  }
}

function resetAllTicketsToDefault() {
  try {
    localStorage.clear();
  } catch (e) {}
  window.ticketsList = JSON.parse(JSON.stringify(DEFAULT_TICKETS));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.ticketsList));
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

const MOCK_USERS = [
  {
    kujangId: 'KJG-991024',
    nip: 'PK-2024-8841',
    name: 'Budi Pratama, S.T.',
    email: 'budi.pratama@pupuk-kujang.co.id',
    department: 'Departemen Rekayasa & Pemeliharaan',
    role: 'Karyawan',
    roleKey: 'karyawan',
    status: 'Aktif',
    lastLogin: 'Hari ini, 08:12 WIB'
  },
  {
    kujangId: 'KJG-881201',
    nip: 'PK-2015-1002',
    name: 'Ir. Hendra Gunawan, M.T.',
    email: 'hendra.gunawan@pupuk-kujang.co.id',
    department: 'Departemen Rekayasa & Pemeliharaan',
    role: 'Atasan (Approver)',
    roleKey: 'approver',
    status: 'Aktif',
    lastLogin: 'Hari ini, 07:45 WIB'
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
    lastLogin: 'Kemarin, 22:00 WIB'
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
    lastLogin: 'Hari ini, 08:00 WIB'
  },
  {
    kujangId: 'KJG-991055',
    nip: 'PK-2022-7719',
    name: 'Siti Rahmawati, S.Tr.',
    email: 'siti.rahmawati@pupuk-kujang.co.id',
    department: 'Departemen Produksi Amonia-1A',
    role: 'Karyawan',
    roleKey: 'karyawan',
    status: 'Aktif',
    lastLogin: 'Kemarin, 14:15 WIB'
  },
  {
    kujangId: 'KJG-881299',
    nip: 'PK-2012-0543',
    name: 'Dr. Ahmad Subagja, M.M.',
    email: 'ahmad.subagja@pupuk-kujang.co.id',
    department: 'Departemen SDM & Organisasi',
    role: 'Atasan (Approver)',
    roleKey: 'approver',
    status: 'Aktif',
    lastLogin: 'Hari ini, 08:30 WIB'
  }
];

function saveTickets(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.ticketsList = data;
  if (typeof window.renderAllCharts === 'function') {
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
window.ACTORS = ACTORS;
window.MOCK_USERS = MOCK_USERS;
window.loadTickets = loadTickets;
window.saveTickets = saveTickets;
window.ticketsList = ticketsList;
window.currentActor = currentActor;
window.activeEmpStatusFilter = activeEmpStatusFilter;
window.currentEmpViewMode = currentEmpViewMode;
window.currentDecisionTicketId = currentDecisionTicketId;
window.currentCancelTicketId = currentCancelTicketId;
window.pendingFormData = pendingFormData;
window.MOCK_APPROVERS = MOCK_APPROVERS;

