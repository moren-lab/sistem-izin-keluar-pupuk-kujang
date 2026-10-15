/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Active Ticket Business Rules & Automated Status Scheduler
 * (BRULE-01, BRULE-03, BRULE-11, BRULE-15, FR-MON-02, & FR-MON-03)
 */

function getActiveTicket(nip = (window.ACTORS && window.ACTORS.karyawan ? window.ACTORS.karyawan.nip : 'PK-2024-8841')) {
  const list = window.ticketsList || [];
  return list.find(t => 
    (t.applicantNip === nip || !t.applicantNip) && 
    (t.status === 'Menunggu Persetujuan' || t.status === 'Disetujui' || t.status === 'Sedang di Luar' || t.status === 'Terlambat')
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
    // 1. KEDALUWARSA (BRULE-11):
    // Tiket yang telah Disetujui tapi tidak kunjung dipindai keluar melewati toleransi rencana jam keluar (+10 menit)
    if (ticket.status === 'Disetujui' && ticket.plannedExit && !ticket.scanOutTime) {
      const exitTime = new Date(ticket.plannedExit);
      const toleranceMs = 10 * 60 * 1000; // toleransi 10 menit
      if (!isNaN(exitTime.getTime()) && (now.getTime() > exitTime.getTime() + toleranceMs)) {
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
    if (ticket.status === 'Sedang di Luar' && ticket.type === 'Kembali ke Area' && ticket.estimatedReturn && !ticket.scanInTime) {
      const returnTime = new Date(ticket.estimatedReturn);
      if (!isNaN(returnTime.getTime()) && (now.getTime() > returnTime.getTime())) {
        ticket.status = 'Terlambat';
        if (!ticket.timeline) ticket.timeline = [];
        ticket.timeline.push({
          event: 'Terdeteksi Terlambat',
          time: nowFormatted,
          by: 'Sistem Otomatis (Scheduler)',
          desc: 'Karyawan terdeteksi belum kembali dan belum melakukan Scan In melewati perkiraan waktu kembali.'
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
      if (newlyOverdue > 0) window.showToast(`Perhatian: ${newlyOverdue} tiket ditandai TERLAMBAT!`, 'danger');
      if (newlyExpired > 0) window.showToast(`Informasi: ${newlyExpired} tiket otomatis KEDALUWARSA.`, 'info');
    }
    // Re-render active view
    if (window.currentActor === 'karyawan' && typeof window.renderKaryawanView === 'function') {
      window.renderKaryawanView();
    } else if (window.currentActor === 'approver' && typeof window.renderApproverView === 'function') {
      window.renderApproverView();
    } else if (window.currentActor === 'security' && typeof window.renderSecurityView === 'function') {
      window.renderSecurityView();
    }
  }
}

// Expose globally
window.getActiveTicket = getActiveTicket;
window.checkOverdueAndExpiredTickets = checkOverdueAndExpiredTickets;
