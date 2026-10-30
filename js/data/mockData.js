/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Data State & Shared Storage
 */

const STORAGE_KEY = 'KUJANG_GATEPASS_TICKETS_V7';

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
      { event: 'Pengajuan diajukan', time: '19 Okt 2026, 09.20 WIB', by: 'Budi Pratama, S.T.', desc: 'Dinas Kantor — Kembali ke Area' },
      { event: 'Disetujui oleh atasan', time: '19 Okt 2026, 09.35 WIB', by: 'Ir. Hendra Gunawan, M.T. — Manajer Rekayasa & Pemeliharaan', desc: 'Disetujui. Koordinasikan hasil pemeriksaan setelah kembali.' },
      { event: 'Scan Out tercatat', time: '19 Okt 2026, 10.05 WIB', by: 'Sertu Agus (Pos 1)', desc: 'Pos 1 — Karyawan meninggalkan area' },
      { event: 'Scan In tercatat', time: '19 Okt 2026, 12.50 WIB', by: 'Sertu Agus (Pos 1)', desc: 'Pos 1 — Karyawan kembali ke area pabrik' }
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
    scanOutGate: 'Pos 2 Gerbang Barat',
    securityOfficerOut: 'Kopral Dani (Pos 2)',
    scanOutTime: '14 Okt 2026, 13.02 WIB (Pos 2 Gerbang Barat)',
    scanInTime: '14 Okt 2026, 14.25 WIB (Pos 2 Gerbang Barat)',
    timeline: [
      { event: 'Pengajuan Dibuat', time: '14 Okt 2026, 11.30 WIB', by: 'Budi Pratama', desc: 'Izin urusan pribadi.' },
      { event: 'Disetujui', time: '14 Okt 2026, 11.45 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui.' },
      { event: 'Scan Out', time: '14 Okt 2026, 13.02 WIB', by: 'Kopral Dani (Pos 2)', gate: 'Pos 2 Gerbang Barat', desc: 'Keluar gerbang barat.' },
      { event: 'Scan In', time: '14 Okt 2026, 14.25 WIB', by: 'Kopral Dani (Pos 2)', gate: 'Pos 2 Gerbang Barat', desc: 'Kembali tepat waktu.' }
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
    scanOutGate: 'Pos 3 Gerbang Timur',
    securityOfficerOut: 'Praka Ilham (Pos 3)',
    scanOutTime: '07 Okt 2026, 09.00 WIB (Pos 3 Gerbang Timur)',
    scanInTime: '07 Okt 2026, 11.50 WIB (Pos 3 Gerbang Timur)',
    timeline: [
      { event: 'Pengajuan Dibuat', time: '07 Okt 2026, 08.20 WIB', by: 'Budi Pratama', desc: 'Izin dinas.' },
      { event: 'Disetujui', time: '07 Okt 2026, 08.40 WIB', by: 'Ir. Hendra Gunawan, M.T.', desc: 'Disetujui.' },
      { event: 'Scan Out', time: '07 Okt 2026, 09.00 WIB', by: 'Praka Ilham (Pos 3)', gate: 'Pos 3 Gerbang Timur', desc: 'Keluar gerbang timur.' },
      { event: 'Scan In', time: '07 Okt 2026, 11.50 WIB', by: 'Praka Ilham (Pos 3)', gate: 'Pos 3 Gerbang Timur', desc: 'Kembali tepat waktu.' }
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
    return list;
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_TICKETS));
  }
}

function resetAllTicketsToDefault() {
  try {
    localStorage.clear();
  } catch (e) { }
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
    status: 'Aktif',
    lastLogin: 'Hari ini, 08:12 WIB'
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
    kujangId: 'KJG-774421',
    nip: 'SEC-2020-105',
    name: 'Praka Ilham',
    email: 'pos3.security@pupuk-kujang.co.id',
    department: 'Departemen Pengamanan & K3',
    role: 'Petugas Pengamanan (Pos 3)',
    roleKey: 'security',
    status: 'Aktif',
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
    role: 'Atasan 1 (Manager)',
    roleKey: 'approver',
    status: 'Dicabut',
    lastLogin: 'Hari ini, 08:30 WIB'
  }
];

function loadUsers() {
  const saved = localStorage.getItem(USERS_STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    return JSON.parse(JSON.stringify(DEFAULT_USERS));
  }
  try {
    let users = JSON.parse(saved);
    let changed = false;
    DEFAULT_USERS.forEach(defU => {
      if (!users.some(u => u.nip === defU.nip)) {
        users.push(defU);
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
    return users;
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_USERS));
  }
}

// Helper sentral untuk mendapatkan Atasan Utama yang sedang aktif
function getPrimaryApprover() {
  const users = (typeof loadUsers === 'function' ? loadUsers() : window.MOCK_USERS) || [];
  return users.find(u => u.roleKey === 'approver' && u.status === 'Aktif') || null;
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

  // 1. Sinkronisasi Karyawan Pemohon
  const activeEmpSync = users.find(u => (u.roleKey === 'karyawan' || (u.role && u.role.toLowerCase().includes('karyawan'))) && u.status === 'Aktif');
  if (activeEmpSync && window.ACTORS && window.ACTORS.karyawan) {
    window.ACTORS.karyawan.name = activeEmpSync.name;
    window.ACTORS.karyawan.nip = activeEmpSync.nip;
    if (activeEmpSync.department) window.ACTORS.karyawan.department = activeEmpSync.department;
    if (activeEmpSync.role) window.ACTORS.karyawan.title = activeEmpSync.role;
  }

  // 2. Sinkronisasi Atasan Utama (Approver 1 / Manager)
  const primaryApprover = users.find(u => u.roleKey === 'approver' && u.status === 'Aktif');
  if (window.ACTORS) {
    if (primaryApprover) {
      window.ACTORS.approver = {
        nip: primaryApprover.nip || 'PK-2015-1002',
        name: primaryApprover.name,
        title: primaryApprover.role || 'Manager Rekayasa & Pemeliharaan',
        department: primaryApprover.department || 'Departemen Rekayasa & Pemeliharaan',
        roleLabel: 'Atasan 1 (Manager)'
      };
      if (window.ACTORS.karyawan) {
        window.ACTORS.karyawan.approverName = primaryApprover.name;
      }
    } else {
      window.ACTORS.approver = null;
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
      window.ACTORS.approver2 = null;
    }
  }

  // 4. Sinkronisasi Petugas Pengamanan / Security
  const activeSecSync = users.find(u => (u.roleKey === 'security' || (u.role && u.role.toLowerCase().includes('pengamanan'))) && u.status === 'Aktif');
  if (activeSecSync && window.ACTORS && window.ACTORS.security) {
    window.ACTORS.security.name = activeSecSync.name;
    window.ACTORS.security.nip = activeSecSync.nip;
    if (activeSecSync.department) window.ACTORS.security.department = activeSecSync.department;
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
  const approverUsers = users.filter(u => {
    const isApproverRole = u.roleKey === 'approver' || u.roleKey === 'approver2' ||
      (u.role && (u.role.toLowerCase().includes('atasan') || u.role.toLowerCase().includes('manager') || u.role.toLowerCase().includes('supervisor')));
    return isApproverRole && u.status === 'Aktif';
  });

  const avatarPalettes = [
    'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
    'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
    'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
    'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)'
  ];

  return approverUsers.map((u, idx) => {
    const isApprover1 = u.roleKey === 'approver' || (u.name && u.name.includes('Hendra Gunawan'));
    const isApprover2 = u.roleKey === 'approver2' || (u.name && u.name.includes('Dewi Sartika'));

    return {
      nip: u.nip || '',
      name: u.name,
      displayName: u.name,
      isUnavailable: false,
      title: u.role || (isApprover1 ? 'Atasan 1 (Manager)' : 'Atasan 2 (Supervisor / Plt)'),
      department: u.department || 'Departemen Rekayasa & Pemeliharaan',
      isDirectSupervisor: isApprover1,
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

