/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Active Ticket Business Rules & Automated Status Scheduler
 * (BRULE-01, BRULE-03, BRULE-11, BRULE-15, FR-MON-02, & FR-MON-03)
 */

/**
 * Robust date-time parser supporting:
 * - ISO string: "2026-10-26T12:30", "2026-10-26T12:30:00"
 * - Space separated: "2026-10-26 12:30"
 * - Time only: "12:30", "12.30", "12:30 WIB" (otomatis dipasangkan dengan tanggal hari ini)
 * - Indonesian text format: "26 Okt 2026, 12:30 WIB", "26 Oktober 2026 12.30"
 * - Slash date format: "26/10/2026 12:30"
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

  return null;
}

function getActiveTicket(nip = (window.getCurrentEmployeeActor ? window.getCurrentEmployeeActor().nip : (window.ACTORS && window.ACTORS.karyawan ? window.ACTORS.karyawan.nip : 'PK-2024-8841'))) {
  // Ambil tiket terbaru dari window.ticketsList atau localStorage
  const list = window.ticketsList || (typeof window.loadTickets === 'function' ? window.loadTickets() : []);
  const activeCandidates = list.filter(t => {
    // 1. Cek apakah user adalah inisiator (pembuat) tiket
    const isInitiator = (t.applicantNip === nip || (!t.applicantNip && nip === 'PK-2024-8841'));
    // 2. Cek apakah user adalah anggota tim dinas bersama
    const isMember = Array.isArray(t.members) && t.members.some(m => m.nip === nip && m.status !== 'cancelled' && m.status !== 'batal');
    
    // Jika bukan inisiator dan bukan anggota aktif, abaikan
    if (!isInitiator && !isMember) return false;

    // Jika inisiator sudah membatalkan dirinya sendiri, inisiator tidak melihat tiket aktif lagi
    if (isInitiator && t.initiatorCancelled) return false;

    // Jika anggota sudah membatalkan keikutsertaannya, anggota tidak melihat tiket aktif lagi
    if (isMember && !isInitiator) {
      const myMember = t.members.find(m => m.nip === nip);
      if (myMember && (myMember.status === 'cancelled' || myMember.status === 'batal')) return false;
    }

    return t.status !== 'Dibatalkan' &&
      t.status !== 'Ditolak' &&
      t.status !== 'Selesai' &&
      t.status !== 'Kedaluwarsa' &&
      (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat' || t.status === 'Disetujui' || t.status === 'Sedang di Luar' || t.status === 'Terlambat' || t.status === 'Menunggu Verifikasi Atasan' || t.status === 'Menunggu Bukti Kedatangan');
  });

  if (activeCandidates.length === 0) return null;

  // Sort candidate aktif: prioritaskan tiket yang dibuat paling baru (ID/createdAt descending)
  activeCandidates.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.created_at || 0).getTime() || 0;
    const timeB = new Date(b.createdAt || b.created_at || 0).getTime() || 0;
    if (timeA !== timeB) return timeB - timeA;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  return activeCandidates[0];
}

/**
 * Pengecekan otomatis tiket Terlambat & Kedaluwarsa
 * Berjalan setiap detik secara real-time mengikuti jam sistem laptop user
 */
let _isCheckingTickets = false;

function checkOverdueAndExpiredTickets(silent = true) {
  // Re-entrancy guard: hindari loop rekursif antar renderers
  if (_isCheckingTickets) return;

  // Login guard: jika user belum login (masih di portal KUJANG ID), diamkan agar browser tidak lag
  if (typeof window.getKujangCurrentUser === 'function' && !window.getKujangCurrentUser()) {
    return;
  }

  _isCheckingTickets = true;
  try {
    _executeCheckOverdueAndExpiredTickets(silent);
  } finally {
    _isCheckingTickets = false;
  }
}

function _executeCheckOverdueAndExpiredTickets(silent = true) {
  // Selalu pastikan membaca array tiket termutakhir
  const list = window.ticketsList || (typeof window.loadTickets === 'function' ? window.loadTickets() : []);
  const now = new Date();
  let hasChanges = false;
  let newlyOverdue = 0;
  let newlyExpired = 0;

  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

  list.forEach(ticket => {
    const statusNormalized = (ticket.status || '').trim();
    const isEmergencyTicket = Boolean(ticket.isEmergency || (ticket.id && (ticket.id.includes('-EMG-') || ticket.id.startsWith('TK-EMG'))));

    // -------------------------------------------------------------------------
    // 1. KEDALUWARSA (BRULE-11 & Simulation Protection):
    // Tiket biasa (Disetujui) atau Tiket Darurat (Disetujui / Menunggu Otorisasi Darurat)
    // yang tidak kunjung dipindai keluar melewati batas toleransi rencana keluar.
    // PENTING: Tiket Menunggu Persetujuan reguler TIDAK BOLEH kedaluwarsa sebelum direspon.
    // Untuk sesi simulasi hari ini, batas toleransi dihitung dari waktu persetujuan
    // dan diberikan durasi yang aman agar proses pengujian tidak ter-reset saat refresh.
    // -------------------------------------------------------------------------
    const isPendingEmergency = isEmergencyTicket && (statusNormalized === 'Menunggu Otorisasi Darurat');
    const isApprovedOrEmergencyPending = (statusNormalized === 'Disetujui' || isPendingEmergency);

    if (isApprovedOrEmergencyPending && ticket.plannedExit && !ticket.scanOutTime) {
      const exitTime = parseTicketDateTime(ticket.plannedExit);
      const approveTime = ticket.approvedAt ? parseTicketDateTime(ticket.approvedAt) : null;
      const createTime = (ticket.createdAt ? parseTicketDateTime(ticket.createdAt) : null) || parseTicketDateTime(ticket.id);

      // Gunakan waktu paling mutakhir antara rencana keluar dan persetujuan
      let baseReferenceTime = exitTime;
      if (approveTime && !isNaN(approveTime.getTime())) {
        if (!baseReferenceTime || approveTime.getTime() > baseReferenceTime.getTime()) {
          baseReferenceTime = approveTime;
        }
      }

      // Deteksi apakah tiket terkait dengan hari ini (sesi pengujian/simulasi aktif)
      const isExitToday = exitTime && !isNaN(exitTime.getTime()) &&
        exitTime.getFullYear() === now.getFullYear() &&
        exitTime.getMonth() === now.getMonth() &&
        exitTime.getDate() === now.getDate();

      const isCreatedToday = (createTime && !isNaN(createTime.getTime()) &&
        createTime.getFullYear() === now.getFullYear() &&
        createTime.getMonth() === now.getMonth() &&
        createTime.getDate() === now.getDate()) ||
        Boolean(ticket.id && ticket.id.includes(`${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`));

      const isApprovedToday = approveTime && !isNaN(approveTime.getTime()) &&
        approveTime.getFullYear() === now.getFullYear() &&
        approveTime.getMonth() === now.getMonth() &&
        approveTime.getDate() === now.getDate();

      const isTodaySession = isExitToday || isCreatedToday || isApprovedToday;

      // Deteksi apakah tanggal rencana keluar sudah lampau (kemarin ke belakang)
      const isPastDay = exitTime && !isNaN(exitTime.getTime()) && (
        exitTime.getFullYear() < now.getFullYear() ||
        (exitTime.getFullYear() === now.getFullYear() && (
          exitTime.getMonth() < now.getMonth() ||
          (exitTime.getMonth() === now.getMonth() && exitTime.getDate() < now.getDate())
        ))
      );

      // Toleransi waktu:
      // Hari lampau -> hangus
      // Tiket pengujian hari ini -> toleransi aman 24 jam penuh agar alur pengujian & refresh tidak hangus
      // Default operasional di luar hari ini -> 30 menit
      const toleranceMs = isPastDay ? 0 : (isTodaySession ? (24 * 60 * 60 * 1000) : (30 * 60 * 1000));
      const effectiveDeadlineMs = (baseReferenceTime && !isNaN(baseReferenceTime.getTime()))
        ? (baseReferenceTime.getTime() + toleranceMs)
        : 0;

      if (effectiveDeadlineMs > 0 && now.getTime() > effectiveDeadlineMs) {
        const wasAlreadyExpired = (ticket.status === 'Kedaluwarsa');
        ticket.status = 'Kedaluwarsa';
        if (!ticket.notifiedExpired) {
          ticket.notifiedExpired = true;
          if (typeof window.createNotification === 'function') {
            window.createNotification({
              recipientRole: 'karyawan',
              recipientNip: ticket.applicantNip || 'PK-2024-8841',
              recipientName: ticket.applicantName || 'Budi Pratama, S.T.',
              actorSource: 'system',
              type: 'kedaluwarsa',
              title: isEmergencyTicket ? 'Izin Darurat Kedaluwarsa' : 'Tiket Kedaluwarsa',
              message: `Izin ${isEmergencyTicket ? 'darurat ' : ''}keluar area (#${ticket.id}) otomatis kedaluwarsa karena tidak dipindai keluar melewati batas toleransi rencana keluar.`,
              ticketId: ticket.id,
              priority: isEmergencyTicket ? 'high' : 'normal',
              eventId: `expired_${ticket.id}`
            });
          }
          if (!wasAlreadyExpired) {
            newlyExpired++;
          }
        }
        if (!ticket.timeline) ticket.timeline = [];
        const hasExpiredEvent = ticket.timeline.some(tl => (tl.event || '').toLowerCase().includes('kedaluwarsa'));
        if (!hasExpiredEvent) {
          ticket.timeline.push({
            event: isEmergencyTicket ? 'Izin Darurat Kedaluwarsa' : 'Tiket Kedaluwarsa',
            time: nowFormatted,
            by: 'Sistem Otomatis (Scheduler)',
            desc: `Tiket ${isEmergencyTicket ? 'darurat ' : ''}otomatis hangus/kedaluwarsa karena tidak dipindai keluar melewati batas toleransi rencana keluar.`
          });
        }
        hasChanges = true;
      }
    }

    // -------------------------------------------------------------------------
    // 2. TERLAMBAT (BRULE-15 & FR-MON-02):
    // Karyawan berstatus Sedang di Luar (Kembali ke Area) tapi waktu saat ini telah melewati perkiraan jam kembali
    // -------------------------------------------------------------------------
    const isOutside = statusNormalized.toLowerCase() === 'sedang di luar';
    const isAlreadyLate = statusNormalized.toLowerCase() === 'terlambat';
    const isReturnTrip = ticket.type !== 'Pulang Mendahului' || (ticket.type && ticket.type.toLowerCase().includes('kembali')) || Boolean(ticket.estimatedReturn);

    if ((isOutside || isAlreadyLate) && isReturnTrip && ticket.estimatedReturn && !ticket.scanInTime) {
      const returnTime = parseTicketDateTime(ticket.estimatedReturn);

      if (returnTime && !isNaN(returnTime.getTime())) {
        // PERIKSA GRACE PERIOD PENGAJUAN PERPANJANGAN WAKTU
        const hasPendingExt = ticket.pendingExtension && ticket.pendingExtension.status === 'Menunggu Persetujuan';
        let gracePeriodActive = false;
        if (hasPendingExt && ticket.pendingExtension.newEstimatedReturn) {
          const extTime = parseTicketDateTime(ticket.pendingExtension.newEstimatedReturn);
          if (extTime && !isNaN(extTime.getTime()) && now.getTime() <= extTime.getTime()) {
            gracePeriodActive = true;
          }
        }

        if (now.getTime() > returnTime.getTime()) {
          // WAKTU SAAT INI MELEWATI BATAS KEMBALI
          if (!gracePeriodActive && ticket.status !== 'Terlambat') {
            ticket.status = 'Terlambat';
            ticket.isLate = true;
            ticket.lateMinutes = Math.max(1, Math.round((now.getTime() - returnTime.getTime()) / 60000));

            if (!ticket.notifiedLate) {
              ticket.notifiedLate = true;
              if (typeof window.createNotification === 'function') {
                // 1. Notifikasi ke Karyawan
                window.createNotification({
                  recipientRole: 'karyawan',
                  recipientNip: ticket.applicantNip || 'PK-2024-8841',
                  recipientName: ticket.applicantName,
                  actorSource: 'system',
                  type: 'terlambat',
                  title: 'Peringatan Waktu Kembali',
                  message: `Batas waktu kembali untuk izin #${ticket.id} telah terlewati. Anda wajib segera kembali ke area pabrik dan melakukan Tap In di Pos Jaga.`,
                  ticketId: ticket.id,
                  priority: 'high',
                  eventId: `late_emp_${ticket.id}`
                });

                // 2. Notifikasi ke Atasan
                window.createNotification({
                  recipientRole: 'approver',
                  recipientNip: (() => {
                    const allUsers = window.MOCK_USERS || [];
                    const found = allUsers.find(u => u.name && ticket.approverName && (u.name.toLowerCase() === ticket.approverName.toLowerCase() || ticket.approverName.toLowerCase().includes(u.name.toLowerCase())));
                    return (found && found.nip) || (ticket.approverName && ticket.approverName.includes('Dewi') ? 'PK-2012-0845' : 'PK-2015-1002');
                  })(),
                  recipientName: ticket.approverName || 'Ir. Hendra Gunawan, M.T.',
                  actorSource: 'system',
                  type: 'bawahan_terlambat',
                  title: '⚠️ Bawahan Terlambat Kembali',
                  message: `Bawahan Anda, ${ticket.applicantName} (${ticket.applicantNip}), belum kembali ke area pabrik melewati batas waktu untuk tiket #${ticket.id}.`,
                  ticketId: ticket.id,
                  priority: 'high',
                  eventId: `late_appr_${ticket.id}`
                });

                // 3. Notifikasi ke Pos Jaga
                window.createNotification({
                  recipientRole: 'security',
                  actorSource: 'system',
                  type: 'security_terlambat',
                  title: '⚠️ Karyawan Terlambat Kembali',
                  message: `${ticket.applicantName} (${ticket.applicantNip} • ${ticket.department || 'Pabrik'}) belum kembali melewati batas waktu untuk tiket #${ticket.id}.`,
                  ticketId: ticket.id,
                  priority: 'high',
                  eventId: `late_sec_${ticket.id}`
                });
              }
            }

            if (!ticket.timeline) ticket.timeline = [];
            ticket.timeline.push({
              event: 'Status Terlambat',
              time: nowFormatted,
              by: 'Sistem Otomatis (Scheduler)',
              desc: `Karyawan belum melakukan Tap In kembali setelah batas waktu estimasi kembali (${window.formatDisplayDate ? window.formatDisplayDate(ticket.estimatedReturn) : ticket.estimatedReturn}). Terlambat ${typeof window.formatLateDurationFull === 'function' ? window.formatLateDurationFull(ticket.lateMinutes) : `${ticket.lateMinutes} menit`}.`
            });
            hasChanges = true;
            newlyOverdue++;
          } else if (ticket.status === 'Terlambat') {
            // Update kalkulasi menit keterlambatan berjalan
            const currentLateMins = Math.max(1, Math.round((now.getTime() - returnTime.getTime()) / 60000));
            if (ticket.lateMinutes !== currentLateMins) {
              ticket.lateMinutes = currentLateMins;
              hasChanges = true;
            }
          }
        } else if (now.getTime() <= returnTime.getTime() && ticket.status === 'Terlambat') {
          // Jika waktu laptop dimundurkan oleh user sebelum jam kembali, pulihkan status ke 'Sedang di Luar'
          ticket.status = 'Sedang di Luar';
          ticket.isLate = false;
          ticket.lateMinutes = 0;
          hasChanges = true;
        }
      }
    }
  });

  if (hasChanges) {
    if (typeof window.saveTickets === 'function') {
      window.saveTickets(list);
    }

    if (!silent && typeof window.showToast === 'function') {
      if (newlyOverdue > 0) window.showToast(`⚠️ Perhatian: ${newlyOverdue} izin keluar melewati batas kembali (TERLAMBAT)!`, 'danger');
      if (newlyExpired > 0) window.showToast(`Informasi: ${newlyExpired} tiket otomatis KEDALUWARSA.`, 'info');
    }

    // Update all metrics
    if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
    if (typeof window.updateApproverMetrics === 'function') window.updateApproverMetrics();
    if (typeof window.updateSecurityMetrics === 'function') window.updateSecurityMetrics();
    if (typeof window.updateAdminMetrics === 'function') window.updateAdminMetrics();

    // Re-render antarmuka yang sedang aktif dilihat oleh user di layar
    if (typeof document !== 'undefined') {
      const viewKaryawan = document.getElementById('viewKaryawan');
      const viewApprover = document.getElementById('viewApprover');
      const viewSecurity = document.getElementById('viewSecurity');
      const viewAdmin = document.getElementById('viewAdmin');

      if (viewKaryawan && viewKaryawan.style.display !== 'none' && typeof window.renderKaryawanView === 'function') {
        window.renderKaryawanView();
      }
      if (viewApprover && viewApprover.style.display !== 'none' && typeof window.renderApproverView === 'function') {
        window.renderApproverView();
      }
      if (viewSecurity && viewSecurity.style.display !== 'none' && typeof window.renderSecurityView === 'function') {
        window.renderSecurityView();
      }
      if (viewAdmin && viewAdmin.style.display !== 'none' && typeof window.renderAdminView === 'function') {
        window.renderAdminView();
      }

      // Auto-refresh tampilan Mobile secara real-time saat status tiket berganti di latar belakang
      if (typeof window.renderActiveView === 'function' && window.innerWidth <= 768) {
        window.renderActiveView();
      }
    }
  }
}

// Expose globally
window.parseTicketDateTime = parseTicketDateTime;
window.getActiveTicket = getActiveTicket;
window.checkOverdueAndExpiredTickets = checkOverdueAndExpiredTickets;
