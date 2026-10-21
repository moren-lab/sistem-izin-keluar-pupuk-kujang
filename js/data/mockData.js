/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Data State & Shared Storage
 */

const STORAGE_KEY = 'KUJANG_GATEPASS_TICKETS_V4';

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
    department: 'Departemen Rekayasa & Pemeliharaan'
  },
  {
    nip: 'PK-2012-0845',
    name: 'Dewi Sartika, S.T., M.M.',
    title: 'Supervisor Operasional Lapangan',
    department: 'Departemen Rekayasa & Pemeliharaan'
  },
  {
    nip: 'PK-2010-0112',
    name: 'Dr. Agus Priyanto, M.Eng.',
    title: 'VP Produksi & Utilitas',
    department: 'Direktorat Operasi Pabrik'
  },
  {
    nip: 'PK-2014-0331',
    name: 'Bambang Sutrisno, S.T.',
    title: 'Supervisi Pengamanan & K3',
    department: 'Departemen Pengamanan & K3'
  }
];

let currentActor = 'karyawan'; // 'karyawan', 'approver', 'security', or 'admin'

// Helper tanggal dinamis untuk data mock awal
const _initNow = new Date();
const _initPad = (n) => String(n).padStart(2, '0');
const _initFmt = (dt) => `${dt.getFullYear()}-${_initPad(dt.getMonth() + 1)}-${_initPad(dt.getDate())}T${_initPad(dt.getHours())}:${_initPad(dt.getMinutes())}`;
const _initTodayStr = `${_initNow.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][_initNow.getMonth()]} ${_initNow.getFullYear()}`;

// Default mock tickets mendemonstrasikan seluruh variasi status perizinan (Disetujui, Terlambat, Kedaluwarsa, Selesai)
const DEFAULT_TICKETS = [
  {
    id: `TK-${_initNow.getFullYear()}${_initPad(_initNow.getMonth() + 1)}${_initPad(_initNow.getDate())}-001`,
    applicantName: 'Budi Pratama, S.T.',
    applicantNip: 'PK-2024-8841',
    department: 'Departemen Rekayasa & Pemeliharaan',
    category: 'Dinas Kantor',
    type: 'Kembali ke Area',
    destination: 'Kantor Pelayanan Pajak (KPP) Pratama Cikampek',
    reason: 'Koordinasi verifikasi dan rekonsiliasi faktur pajak terpadu pengadaan alat berat.',
    plannedExit: _initFmt(new Date(_initNow.getTime() - 120 * 60000)),
    estimatedReturn: _initFmt(new Date(_initNow.getTime() - 60 * 60000)),
    status: 'Selesai',
    createdAt: `${_initTodayStr}, 08:30 WIB`,
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Disetujui. Bawa berkas tanda terima resmi.',
    scanOutTime: `${_initTodayStr}, 08:35 WIB (Pos 1 Gerbang Utama)`,
    scanInTime: `${_initTodayStr}, 09:30 WIB (Pos 1 Gerbang Utama)`,
    timeline: [
      { event: 'Pengajuan Dibuat', time: `${_initTodayStr}, 08:30 WIB`, by: 'Budi Pratama (Karyawan)', desc: 'Pengajuan izin keluar area berhasil dikirim.' },
      { event: 'Disetujui Atasan', time: `${_initTodayStr}, 08:45 WIB`, by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui. Bawa berkas tanda terima resmi.' },
      { event: 'Scan Out Pos Jaga', time: `${_initTodayStr}, 08:35 WIB`, by: 'Sertu Agus (Pos 1)', desc: 'Validasi keluar berhasil.' },
      { event: 'Scan In (Kembali)', time: `${_initTodayStr}, 09:30 WIB`, by: 'Sertu Agus (Pos 1)', desc: 'Karyawan kembali ke area pabrik tepat waktu. Tiket selesai.' }
    ]
  },
  {
    id: `TK-${_initNow.getFullYear()}${_initPad(_initNow.getMonth() + 1)}${_initPad(_initNow.getDate())}-002`,
    applicantName: 'Agus Setiawan, A.Md.',
    applicantNip: 'PK-2022-4419',
    department: 'Departemen Operasi Pabrik 1',
    category: 'Dinas Kantor',
    type: 'Kembali ke Area',
    destination: 'Workshop Kalibrasi Instrumen KIIC Karawang',
    reason: 'Pengambilan modul sensor transmitter turbin pengganti pasca maintenance periodik.',
    plannedExit: _initFmt(new Date(_initNow.getTime() - 240 * 60000)), // 4 jam lalu
    estimatedReturn: _initFmt(new Date(_initNow.getTime() - 30 * 60000)), // 30 menit lalu (Melewati estimasi -> TERLAMBAT)
    status: 'Terlambat',
    createdAt: `${_initTodayStr}, 07:15 WIB`,
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Gunakan kendaraan operasional dinas.',
    scanOutTime: `${_initTodayStr}, 07:30 WIB (Pos 1 Gerbang Utama)`,
    scanInTime: null,
    timeline: [
      { event: 'Pengajuan Dibuat', time: `${_initTodayStr}, 07:15 WIB`, by: 'Agus Setiawan', desc: 'Pengajuan dikirim.' },
      { event: 'Disetujui Atasan', time: `${_initTodayStr}, 07:25 WIB`, by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui.' },
      { event: 'Scan Out Pos Jaga', time: `${_initTodayStr}, 07:30 WIB`, by: 'Sertu Agus (Pos 1)', desc: 'Validasi keluar berhasil. Karyawan tercatat meninggalkan kawasan.' },
      { event: 'Terdeteksi Terlambat', time: `${_initTodayStr}, 08:00 WIB`, by: 'Sistem Otomatis (Scheduler)', desc: 'Karyawan terdeteksi belum kembali dan belum Scan In melewati batas estimasi jam kembali.' }
    ]
  },
  {
    id: `TK-${_initNow.getFullYear()}${_initPad(_initNow.getMonth() + 1)}${_initPad(Math.max(1, _initNow.getDate() - 1))}-003`,
    applicantName: 'Budi Pratama, S.T.',
    applicantNip: 'PK-2024-8841',
    department: 'Departemen Rekayasa & Pemeliharaan',
    category: 'Urusan Pribadi',
    type: 'Kembali ke Area',
    destination: 'Klinik Medika Pupuk Kujang',
    reason: 'Pemeriksaan tensi darah berkala.',
    plannedExit: _initFmt(new Date(_initNow.getTime() - 24 * 3600000)),
    estimatedReturn: _initFmt(new Date(_initNow.getTime() - 22 * 3600000)),
    status: 'Kedaluwarsa',
    createdAt: `Kemarin, 09:00 WIB`,
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Disetujui.',
    scanOutTime: null,
    scanInTime: null,
    timeline: [
      { event: 'Pengajuan Dibuat', time: 'Kemarin, 09:00 WIB', by: 'Budi Pratama', desc: 'Tiket diajukan.' },
      { event: 'Disetujui Atasan', time: 'Kemarin, 09:15 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui.' },
      { event: 'Tiket Kedaluwarsa', time: 'Kemarin, 10:30 WIB', by: 'Sistem Otomatis (Scheduler)', desc: 'Tiket otomatis hangus karena tidak dipindai keluar melewati batas jam rencana keluar.' }
    ]
  },
  {
    id: `TK-${_initNow.getFullYear()}${_initPad(_initNow.getMonth() + 1)}${_initPad(Math.max(1, _initNow.getDate() - 2))}-004`,
    applicantName: 'Budi Pratama, S.T.',
    applicantNip: 'PK-2024-8841',
    department: 'Departemen Rekayasa & Pemeliharaan',
    category: 'Urusan Pribadi',
    type: 'Kembali ke Area',
    destination: 'Bank Mandiri KCP Cikampek',
    reason: 'Pengurusan penggantian kartu ATM payroll yang tertelan mesin.',
    plannedExit: _initFmt(new Date(_initNow.getTime() - 48 * 3600000)),
    estimatedReturn: _initFmt(new Date(_initNow.getTime() - 46 * 3600000)),
    status: 'Selesai',
    createdAt: `2 hari lalu, 09:00 WIB`,
    approverName: 'Ir. Hendra Gunawan, M.T.',
    approverNote: 'Disetujui, kembali tepat waktu.',
    scanOutTime: `2 hari lalu, 11:05 WIB (Pos 1)`,
    scanInTime: `2 hari lalu, 12:48 WIB (Pos 1)`,
    timeline: [
      { event: 'Pengajuan Dibuat', time: '2 hari lalu, 09:00 WIB', by: 'Budi Pratama', desc: 'Tiket diajukan.' },
      { event: 'Disetujui Atasan', time: '2 hari lalu, 09:30 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui.' },
      { event: 'Scan Out', time: '2 hari lalu, 11:05 WIB', by: 'Sertu Agus (Pos 1)', desc: 'Karyawan meninggalkan area pabrik.' },
      { event: 'Scan In (Kembali)', time: '2 hari lalu, 12:48 WIB', by: 'Sertu Agus (Pos 1)', desc: 'Karyawan kembali ke area pabrik tepat waktu. Tiket selesai.' }
    ]
  }
];

function loadTickets() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TICKETS));
    return DEFAULT_TICKETS;
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
    return DEFAULT_TICKETS;
  }
}

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

