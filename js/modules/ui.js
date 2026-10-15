/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * UI Utilities, Status Pills, Sound Effects, and Notifications
 */

function getStatusPill(status) {
  let cls = 'pending';
  switch (status) {
    case 'Disetujui': cls = 'approved'; break;
    case 'Menunggu Persetujuan': cls = 'pending'; break;
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
window.formatDisplayDate = formatDisplayDate;
window.playScannerBeep = playScannerBeep;
window.showToast = showToast;
