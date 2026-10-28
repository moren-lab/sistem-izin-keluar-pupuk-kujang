/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * UI Utilities, Status Pills, Sound Effects, and Notifications
 */

/**
 * Format durasi keterlambatan sesuai permintaan bisnis:
 * - Jika < 60 menit: "XX mnt" (atau "XX menit")
 * - Jika >= 60 menit dan < 1440 menit (24 jam): disebut per jam saja (e.g. "1 jam", "2 jam")
 * - Jika >= 1440 menit (24 jam): disebut per hari saja (e.g. "1 hari", "2 hari")
 */
function formatLateDuration(lateMinutes) {
  const m = Number(lateMinutes) || 0;
  if (m <= 0) return '';
  if (m >= 1440) {
    const days = Math.floor(m / 1440);
    return `${days} hari`;
  }
  if (m >= 60) {
    const hours = Math.floor(m / 60);
    return `${hours} jam`;
  }
  return `${m} mnt`;
}

function formatLateDurationFull(lateMinutes) {
  const m = Number(lateMinutes) || 0;
  if (m <= 0) return '';
  if (m >= 1440) {
    const days = Math.floor(m / 1440);
    return `${days} hari`;
  }
  if (m >= 60) {
    const hours = Math.floor(m / 60);
    return `${hours} jam`;
  }
  return `${m} menit`;
}

function getStatusPill(status, ticket) {
  if (typeof status === 'object' && status !== null) {
    ticket = status;
    status = ticket.status;
  }

  if (typeof window.getCleanEmpStatus === 'function') {
    return window.getCleanEmpStatus(status, ticket);
  }

  const isLateCompleted = (status === 'Selesai') && ticket && (ticket.isLate || (ticket.scanInTime && ticket.scanInTime.includes('[Terlambat]')) || (ticket.lateMinutes > 0));
  if (isLateCompleted) {
    const lateStr = formatLateDuration(ticket.lateMinutes || 10);
    return `<span style="font-weight: 700; font-size: 0.8125rem; color: #b45309; letter-spacing: -0.01em;">Selesai (Terlambat ${lateStr})</span>`;
  }

  let color = '#059669';
  switch (status) {
    case 'Disetujui': color = '#059669'; break;
    case 'Menunggu Persetujuan': color = '#d97706'; break;
    case 'Menunggu Otorisasi Darurat':
    case 'Darurat Terkunci': color = '#b91c1c'; break;
    case 'Sedang di Luar': color = '#0284c7'; break;
    case 'Terlambat': color = '#dc2626'; break;
    case 'Kedaluwarsa': color = '#64748b'; break;
    case 'Selesai': color = '#059669'; break;
    case 'Ditolak': color = '#dc2626'; break;
    case 'Dibatalkan': color = '#94a3b8'; break;
    default: color = '#d97706';
  }
  return `<span style="font-weight: 700; font-size: 0.8125rem; color: ${color}; letter-spacing: -0.01em;">${status}</span>`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '-';
  const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(dateStr) : new Date(dateStr);
  if (!d || isNaN(d.getTime())) return dateStr;
  const pad = (n) => String(n).padStart(2, '0');
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())} WIB`;
}

function formatDayAndDate(dateStr) {
  if (!dateStr) return 'Hari ini';
  const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(dateStr) : new Date(dateStr);
  if (!d || isNaN(d.getTime())) return dateStr;
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
window.formatDayAndDate = formatDayAndDate;

function playScannerBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Audio context may require user interaction first
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// Expose globally
window.getStatusPill = getStatusPill;
// FILTER PERIODE WAKTU (Hari Ini, Minggu Ini, Bulan Ini, Tahun Ini)
function matchesPeriodFilter(ticket, period) {
  if (!period || period === 'all') return true;
  let d = null;
  if (ticket.plannedExit) {
    const pd = new Date(ticket.plannedExit);
    if (!isNaN(pd.getTime())) d = pd;
  }
  if (!d && ticket.createdAt) {
    const cd = new Date(ticket.createdAt);
    if (!isNaN(cd.getTime())) {
      d = cd;
    } else {
      const months = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5, 'Jul': 6, 'Agu': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11 };
      const m = ticket.createdAt.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
      if (m && months[m[2]] !== undefined) {
        d = new Date(parseInt(m[3], 10), months[m[2]], parseInt(m[1], 10));
      }
    }
  }
  if (!d) return true;

  const now = new Date();
  if (period === 'today') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }
  if (period === 'week') {
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    startOfWeek.setDate(now.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return d >= startOfWeek && d <= endOfWeek;
  }
  if (period === 'month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (period === 'year') {
    return d.getFullYear() === now.getFullYear();
  }
  return true;
}

// UNIVERSAL DELETE CONFIRMATION MODAL
function openDeleteConfirmModal({ title = 'Konfirmasi Hapus', message = 'Apakah Anda yakin ingin menghapus pengajuan ini dari riwayat? Tindakan ini tidak dapat dibatalkan.', onConfirm }) {
  const modal = document.getElementById('modalDeleteConfirm');
  const titleEl = document.getElementById('deleteModalTitle');
  const msgEl = document.getElementById('deleteModalMessage');
  const btnExec = document.getElementById('btnExecuteDeleteConfirm');
  if (!modal) {
    if (confirm(message.replace(/<[^>]+>/g, ''))) {
      if (typeof onConfirm === 'function') onConfirm();
    }
    return;
  }
  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.innerHTML = message;
  if (btnExec) {
    btnExec.onclick = () => {
      closeDeleteConfirmModal();
      if (typeof onConfirm === 'function') onConfirm();
    };
  }
  modal.classList.add('open');
}

function closeDeleteConfirmModal() {
  const modal = document.getElementById('modalDeleteConfirm');
  if (modal) modal.classList.remove('open');
}

window.formatLateDuration = formatLateDuration;
window.formatLateDurationFull = formatLateDurationFull;
window.formatDisplayDate = formatDisplayDate;
window.playScannerBeep = playScannerBeep;
window.showToast = showToast;
window.matchesPeriodFilter = matchesPeriodFilter;
window.openDeleteConfirmModal = openDeleteConfirmModal;
window.closeDeleteConfirmModal = closeDeleteConfirmModal;

