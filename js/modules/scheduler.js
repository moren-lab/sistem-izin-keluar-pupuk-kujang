/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Active Ticket Business Rules & Automated Status Scheduler
 * (BRULE-01, BRULE-03, BRULE-11, BRULE-15, FR-MON-02, & FR-MON-03)
 */

/**
 * Robust date-time parser supporting:
 * - ISO string: "2026-10-23T15:00"
 * - Space separated: "2026-10-23 15:00"
 * - Indonesian text format: "23 Okt 2026 | 15.00 WIB" / "19 Oktober 2026, 13:00"
 * - Date object & timestamps
 */
function parseTicketDateTime(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val !== 'string') return null;

  // 1. Standard ISO parser (handles 2026-10-23T15:00:00 etc)
  let d = new Date(val);
  if (!isNaN(d.getTime())) return d;

  // 2. Space separated ISO format (2026-10-23 15:00)
  const cleanIso = val.trim().replace(' ', 'T');
  d = new Date(cleanIso);
  if (!isNaN(d.getTime())) return d;

  // 3. Indonesian text date format parsing
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
  const match = val.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}).*?(\d{1,2})[:.](\d{2})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthKey = match[2].toLowerCase();
    const year = parseInt(match[3], 10);
    const hour = parseInt(match[4], 10);
    const minute = parseInt(match[5], 10);
    if (indonesianMonths[monthKey] !== undefined) {
      return new Date(year, indonesianMonths[monthKey], day, hour, minute);
    }
  }

  return null;
}

function getActiveTicket(nip = (window.ACTORS && window.ACTORS.karyawan ? window.ACTORS.karyawan.nip : 'PK-2024-8841')) {
  const list = window.ticketsList || [];
  return list.find(t =>
    (t.applicantNip === nip || !t.applicantNip) &&
    t.status !== 'Dibatalkan' &&
    t.status !== 'Ditolak' &&
    t.status !== 'Selesai' &&
    t.status !== 'Kedaluwarsa' &&
    (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat' || t.status === 'Disetujui' || t.status === 'Sedang di Luar' || t.status === 'Terlambat')
  );
}

function checkOverdueAndExpiredTickets(silent = true) {
  const list = window.ticketsList || [];
  const now = new Date();
  let hasChanges = false;
  let newlyOverdue = 0;
  let newlyExpired = 0;

  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

  list.forEach(ticket => {
    const statusNormalized = (ticket.status || '').trim();

    // 1. KEDALUWARSA (BRULE-11):
    // Tiket reguler yang telah Disetujui tapi tidak kunjung dipindai keluar melewati toleransi rencana jam keluar (+10 menit)
    // PENTING: Tiket Darurat / Bypass (isEmergency) TIDAK hangus otomatis agar tetap aktif dan dapat dipindai di pos jaga.
    const isEmergencyTicket = ticket.isEmergency || (ticket.id && ticket.id.startsWith('TK-EMG'));
    if (!isEmergencyTicket && statusNormalized === 'Disetujui' && ticket.plannedExit && !ticket.scanOutTime) {
      const exitTime = parseTicketDateTime(ticket.plannedExit);
      const toleranceMs = 10 * 60 * 1000; // toleransi 10 menit
      if (exitTime && !isNaN(exitTime.getTime()) && (now.getTime() > exitTime.getTime() + toleranceMs)) {
        ticket.status = 'Kedaluwarsa';
        if (!ticket.timeline) ticket.timeline = [];
        ticket.timeline.push({
          event: 'Tiket Kedaluwarsa',
          time: nowFormatted,
          by: 'Sistem Otomatis (Scheduler)',
          desc: 'Tiket otomatis hangus/kedaluwarsa karena tidak dipindai keluar melewati batas toleransi rencana keluar (+10 menit).'
        });
        hasChanges = true;
        newlyExpired++;
      }
    }

    // 2. TERLAMBAT (BRULE-15 & FR-MON-02):
    // Karyawan berstatus Sedang di Luar (Kembali ke Area) tapi waktu saat ini telah melewati perkiraan jam kembali
    const isOutside = statusNormalized.toLowerCase() === 'sedang di luar';
    const isReturnTrip = ticket.type !== 'Pulang Mendahului' || (ticket.type && ticket.type.toLowerCase().includes('kembali')) || Boolean(ticket.estimatedReturn);

    if (isOutside && isReturnTrip && ticket.estimatedReturn && !ticket.scanInTime) {
      const returnTime = parseTicketDateTime(ticket.estimatedReturn);
      if (returnTime && !isNaN(returnTime.getTime()) && (now.getTime() > returnTime.getTime())) {
        // PERIKSA GRACE PERIOD PENGAJUAN PERPANJANGAN WAKTU
        const hasPendingExt = ticket.pendingExtension && ticket.pendingExtension.status === 'Menunggu Persetujuan';
        if (hasPendingExt && ticket.pendingExtension.newEstimatedReturn) {
          const extTime = parseTicketDateTime(ticket.pendingExtension.newEstimatedReturn);
          if (extTime && !isNaN(extTime.getTime()) && now.getTime() <= extTime.getTime()) {
            // GRACE PERIOD AKTIF: Karyawan telah mengajukan perpanjangan waktu dan waktu baru belum terlewati.
            // Status dibekukan tetap 'Sedang di Luar' agar karyawan tidak divonis terlambat saat atasan belum merespons.
            return;
          }
        }

        ticket.status = 'Terlambat';
        ticket.isLate = true;
        ticket.lateMinutes = Math.max(1, Math.round((now.getTime() - returnTime.getTime()) / 60000));
        if (!ticket.timeline) ticket.timeline = [];
        ticket.timeline.push({
          event: 'Status Terlambat',
          time: nowFormatted,
          by: 'Sistem Otomatis (Scheduler)',
          desc: `Karyawan belum melakukan Scan In kembali setelah batas waktu estimasi kembali (${window.formatDisplayDate ? window.formatDisplayDate(ticket.estimatedReturn) : ticket.estimatedReturn}). Terlambat ${ticket.lateMinutes} menit.`
        });
        hasChanges = true;
        newlyOverdue++;
      }
    }
  });

  if (hasChanges) {
    if (typeof window.saveTickets === 'function') {
      window.saveTickets(list);
    }
    if (!silent && typeof window.showToast === 'function') {
      if (newlyOverdue > 0) window.showToast(`⚠️ Perhatian: ${newlyOverdue} tiket ditandai TERLAMBAT kembali!`, 'danger');
      if (newlyExpired > 0) window.showToast(`Informasi: ${newlyExpired} tiket otomatis KEDALUWARSA.`, 'info');
    }
    // Update all metrics
    if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
    if (typeof window.updateApproverMetrics === 'function') window.updateApproverMetrics();
    if (typeof window.updateSecurityMetrics === 'function') window.updateSecurityMetrics();
    if (typeof window.updateAdminMetrics === 'function') window.updateAdminMetrics();

    // Re-render active view
    if (window.currentActor === 'karyawan' && typeof window.renderKaryawanView === 'function') {
      window.renderKaryawanView();
    } else if (window.currentActor === 'approver' && typeof window.renderApproverView === 'function') {
      window.renderApproverView();
    } else if (window.currentActor === 'security' && typeof window.renderSecurityView === 'function') {
      window.renderSecurityView();
    } else if (window.currentActor === 'admin' && typeof window.renderAdminView === 'function') {
      window.renderAdminView();
    }
  }
}

// Expose globally
window.parseTicketDateTime = parseTicketDateTime;
window.getActiveTicket = getActiveTicket;
window.checkOverdueAndExpiredTickets = checkOverdueAndExpiredTickets;

