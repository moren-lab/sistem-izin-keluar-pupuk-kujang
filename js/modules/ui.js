/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * UI Utilities, Status Pills, Sound Effects, and Notifications
 */

function getStatusPill(status) {
  let cls = 'pending';
  switch (status) {
    case 'Disetujui': cls = 'approved'; break;
    case 'Menunggu Persetujuan': cls = 'pending'; break;
    case 'Menunggu Otorisasi Darurat':
    case 'Darurat Terkunci': cls = 'emergency-locked'; break;
    case 'Sedang di Luar': cls = 'outside'; break;
    case 'Terlambat': cls = 'overdue'; break;
    case 'Kedaluwarsa': cls = 'expired'; break;
    case 'Selesai': cls = 'completed'; break;
    case 'Ditolak': cls = 'rejected'; break;
    case 'Dibatalkan': cls = 'cancelled'; break;
    default: cls = 'pending';
  }
  return `<span class="status-pill ${cls}">${status}</span>`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} • ${pad(d.getHours())}:${pad(d.getMinutes())} WIB`;
}

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

window.formatDisplayDate = formatDisplayDate;
window.playScannerBeep = playScannerBeep;
window.showToast = showToast;
window.matchesPeriodFilter = matchesPeriodFilter;

