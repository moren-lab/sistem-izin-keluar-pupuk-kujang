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

function normalizeReturnDateTime(val) {
  if (!val) return '';
  let s = String(val).trim();
  const dateMatches = s.match(/\d{4}-\d{2}-\d{2}/g);
  if (dateMatches && dateMatches.length > 1) {
    const lastDate = dateMatches[dateMatches.length - 1];
    const lastIdx = s.lastIndexOf(lastDate);
    if (lastIdx >= 0) s = s.slice(lastIdx);
  }
  s = s.replace(/\s*WIB(?::\d{2})?/gi, '');
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?/);
  if (m) {
    const pad = n => String(n).padStart(2, '0');
    return `${m[1]}T${pad(m[2])}:${pad(m[3])}:00`;
  }
  const tm = s.match(/^(\d{1,2})[:.](\d{2})/);
  if (tm) {
    const today = new Date().toISOString().split('T')[0];
    const pad = n => String(n).padStart(2, '0');
    return `${today}T${pad(tm[1])}:${pad(tm[2])}:00`;
  }
  return s;
}
window.normalizeReturnDateTime = normalizeReturnDateTime;

function formatDisplayDate(dateStr) {
  if (!dateStr) return '-';
  let cleanStr = normalizeReturnDateTime(dateStr);
  const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(cleanStr) : new Date(cleanStr);
  if (!d || isNaN(d.getTime())) return dateStr;
  const pad = (n) => String(n).padStart(2, '0');
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}.${pad(d.getMinutes())} WIB`;
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

function formatDisplayCreatedDate(dateStr) {
  if (!dateStr) return '-';
  const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(dateStr) : new Date(dateStr);
  if (!d || isNaN(d.getTime())) return dateStr;
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}.${pad(d.getMinutes())} WIB`;
}
window.formatDisplayCreatedDate = formatDisplayCreatedDate;

function formatDisplayDateOnly(dateStr) {
  if (!dateStr) return '-';
  const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(dateStr) : new Date(dateStr);
  if (!d || isNaN(d.getTime())) return dateStr;
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
window.formatDisplayDateOnly = formatDisplayDateOnly;

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

function showToast(message, type = 'success', duration = 2000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  const isRoleSwitch = Boolean(message && message.includes('Beralih ke mode'));
  const finalDuration = isRoleSwitch ? 1000 : (duration || 2000);
  if (isRoleSwitch) {
    toast.style.pointerEvents = 'none';
    toast.style.opacity = '0.92';
  }

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, finalDuration);
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
  if (!d && ticket.id) {
    const idMatch = ticket.id.match(/TK-(?:EMG-)?(\d{4})(\d{2})(\d{2})/);
    if (idMatch) {
      d = new Date(parseInt(idMatch[1], 10), parseInt(idMatch[2], 10) - 1, parseInt(idMatch[3], 10));
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

// UNIVERSAL CONFIRMATION DIALOG MODAL
function openConfirmDialog({ title = 'Konfirmasi', message = '', confirmText = 'Ya', cancelText = 'Batal', isDanger = false, onConfirm }) {
  const modal = document.getElementById('modalDeleteConfirm');
  const titleEl = document.getElementById('deleteModalTitle');
  const msgEl = document.getElementById('deleteModalMessage');
  const btnExec = document.getElementById('btnExecuteDeleteConfirm');
  const btnCancel = document.getElementById('btnCancelDeleteConfirm');
  if (!modal) {
    if (confirm(message.replace(/<[^>]+>/g, ''))) {
      if (typeof onConfirm === 'function') onConfirm();
    }
    return;
  }
  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.innerHTML = message;
  if (btnCancel) btnCancel.textContent = cancelText;
  if (btnExec) {
    btnExec.textContent = confirmText;
    btnExec.style.background = isDanger ? '#dc2626' : '#059669';
    btnExec.style.borderColor = isDanger ? '#dc2626' : '#059669';
    btnExec.onclick = () => {
      closeDeleteConfirmModal();
      if (typeof onConfirm === 'function') onConfirm();
    };
  }
  modal.classList.add('open');
}

// UNIVERSAL DELETE CONFIRMATION MODAL
function openDeleteConfirmModal({ title = 'Konfirmasi Hapus', message = 'Apakah Anda yakin ingin menghapus pengajuan ini dari riwayat? Tindakan ini tidak dapat dibatalkan.', onConfirm }) {
  openConfirmDialog({
    title,
    message,
    confirmText: 'Ya, Hapus',
    cancelText: 'Batal',
    isDanger: true,
    onConfirm
  });
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
window.openConfirmDialog = openConfirmDialog;


// UNIVERSAL NOTICE MODAL (GANTI BROWSER ALERT DENGAN TAMPILAN KARTU FIGMA & TOMBOL BATAL)
function openNoticeModal({ title = 'Pemberitahuan', message = '', buttonText = 'Batal' } = {}) {
  const modal = document.getElementById('modalNoticeAlert');
  const titleEl = document.getElementById('noticeModalTitle');
  const msgEl = document.getElementById('noticeModalMessage');
  const btnDismiss = document.getElementById('btnNoticeDismiss');
  if (!modal) {
    alert(typeof message === 'string' ? message.replace(/<[^>]+>/g, '') : message);
    return;
  }
  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.innerHTML = typeof message === 'string' ? message.replace(/\n/g, '<br>') : message;
  if (btnDismiss) btnDismiss.textContent = buttonText;
  modal.classList.add('open');
}

function closeNoticeModal() {
  const modal = document.getElementById('modalNoticeAlert');
  if (modal) modal.classList.remove('open');
}

window.openNoticeModal = openNoticeModal;
window.closeNoticeModal = closeNoticeModal;


// ===================================================================
// UNIVERSAL FIGMA PAGINATION CONTROLLER (Sesuai Gambar 1 User)
// Digunakan di: Riwayat Pos Jaga, Pelacakan Pos Jaga, Pelacakan Atasan,
// Riwayat Atasan, Rekapitulasi Admin, Audit Trail Admin, Hak Akses Admin
// ===================================================================
function renderGenericPaginationButtons(btnsContainer, totalPages, currentPage, onPageChange) {
  if (!btnsContainer) return;
  if (!totalPages || totalPages < 1) {
    totalPages = 1;
  }

  let html = '<button type="button" class="btn-figma-page btn-page-prev"' + (currentPage <= 1 ? ' disabled style="opacity: 0.5; cursor: not-allowed;"' : '') + '>Sebelumnya</button>';

  let startP = Math.max(1, currentPage - 2);
  let endP = Math.min(totalPages, startP + 4);
  if (endP - startP < 4) {
    startP = Math.max(1, endP - 4);
  }

  if (startP > 1) {
    html += '<button type="button" class="btn-figma-page" data-page="1">1</button>';
    if (startP > 2) {
      html += '<span style="padding: 0 4px; color: var(--text-muted); font-size: 0.8rem;">...</span>';
    }
  }

  for (let i = startP; i <= endP; i++) {
    html += '<button type="button" class="btn-figma-page ' + (i === currentPage ? 'active' : '') + '" data-page="' + i + '">' + i + '</button>';
  }

  if (endP < totalPages) {
    if (endP < totalPages - 1) {
      html += '<span style="padding: 0 4px; color: var(--text-muted); font-size: 0.8rem;">...</span>';
    }
    html += '<button type="button" class="btn-figma-page" data-page="' + totalPages + '">' + totalPages + '</button>';
  }

  html += '<button type="button" class="btn-figma-page btn-page-next"' + (currentPage >= totalPages ? ' disabled style="opacity: 0.5; cursor: not-allowed;"' : '') + '>Berikutnya</button>';

  btnsContainer.innerHTML = html;

  const prevBtn = btnsContainer.querySelector('.btn-page-prev');
  const nextBtn = btnsContainer.querySelector('.btn-page-next');

  if (prevBtn) {
    prevBtn.onclick = (e) => {
      e.preventDefault();
      if (currentPage > 1 && typeof onPageChange === 'function') onPageChange(currentPage - 1);
    };
  }

  if (nextBtn) {
    nextBtn.onclick = (e) => {
      e.preventDefault();
      if (currentPage < totalPages && typeof onPageChange === 'function') onPageChange(currentPage + 1);
    };
  }

  btnsContainer.querySelectorAll('[data-page]').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const p = parseInt(btn.getAttribute('data-page'), 10);
      if (p !== currentPage && typeof onPageChange === 'function') onPageChange(p);
    };
  });
}

window.renderGenericPaginationButtons = renderGenericPaginationButtons;

/**
 * Fitur Drag-to-Scroll (Klik & Geser Horisontal) untuk Tabel Data Figma
 * Memungkinkan pengguna menggeser tabel ke kiri-kanan dengan klik-tahan mouse tanpa scrollbar kaku
 */
function enableDragScroll(slider) {
  if (!slider || slider._dragInitialized) return;
  slider._dragInitialized = true;

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  slider.addEventListener('mousedown', (e) => {
    // Jangan aktifkan drag jika yang diklik adalah tombol interaktif, link, input, select
    if (e.target.closest('button, a, input, select, label')) return;

    isDown = true;
    slider.classList.add('is-dragging');
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
  });

  const stopDrag = () => {
    if (!isDown) return;
    isDown = false;
    slider.classList.remove('is-dragging');
  };

  slider.addEventListener('mouseleave', stopDrag);
  slider.addEventListener('mouseup', stopDrag);
  window.addEventListener('mouseup', stopDrag);

  slider.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 1.5; // Rasio kecepatan geser responsif
    slider.scrollLeft = scrollLeft - walk;
  });

  // Dukungan scroll roda mouse (horizontal / shift-wheel)
  slider.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > 0 || e.shiftKey) {
      slider.scrollLeft += (e.deltaX || e.deltaY);
    }
  }, { passive: true });
}

function initAllTableDragScroll() {
  const tableCards = document.querySelectorAll('.figma-table-card, .table-card-scroll, #adminTableMusterRollWrap, .table-responsive');
  tableCards.forEach(card => enableDragScroll(card));
}

window.enableDragScroll = enableDragScroll;
window.initAllTableDragScroll = initAllTableDragScroll;

document.addEventListener('DOMContentLoaded', () => {
  initAllTableDragScroll();
});
