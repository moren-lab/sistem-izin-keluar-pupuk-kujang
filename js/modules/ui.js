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
    return `<span style="font-weight: 700; font-size: 0.8125rem; color: #b45309; letter-spacing: -0.01em;">Selesai (Terlambat)</span>`;
  }
  if (status === 'Terlambat') {
    return `<span style="font-weight: 700; font-size: 0.8125rem; color: #dc2626; letter-spacing: -0.01em;">Sedang di Luar (Terlambat)</span>`;
  }

  let color = '#059669';
  switch (status) {
    case 'Disetujui': color = '#059669'; break;
    case 'Menunggu Persetujuan': color = '#d97706'; break;
    case 'Menunggu Otorisasi Darurat':
    case 'Darurat Terkunci': color = '#b91c1c'; break;
    case 'Sedang di Luar': color = '#0284c7'; break;
    case 'Menunggu Verifikasi Atasan': color = '#2563eb'; break;
    case 'Menunggu Bukti Kedatangan': color = '#b45309'; break;
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
  // Cek apakah user telah memilih untuk melewati konfirmasi hapus selama sesi ini
  if (isDanger && sessionStorage.getItem('kujang_skip_confirm_delete') === 'true') {
    if (typeof onConfirm === 'function') onConfirm();
    return;
  }

  const modal = document.getElementById('modalDeleteConfirm');
  const titleEl = document.getElementById('deleteModalTitle');
  const msgEl = document.getElementById('deleteModalMessage');
  const btnExec = document.getElementById('btnExecuteDeleteConfirm');
  const btnCancel = document.getElementById('btnCancelDeleteConfirm');
  const chkDontShow = document.getElementById('chkDontShowDeleteConfirm');
  const labelDontShow = document.getElementById('labelDontShowDeleteConfirm');

  if (!modal) {
    if (confirm(message.replace(/<[^>]+>/g, ''))) {
      if (typeof onConfirm === 'function') onConfirm();
    }
    return;
  }
  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.innerHTML = message;
  if (btnCancel) btnCancel.textContent = cancelText;

  // Tampilkan opsi jangan ingatkan lagi hanya untuk dialog yang relevan (misal hapus)
  if (labelDontShow) {
    labelDontShow.style.display = isDanger ? 'flex' : 'none';
  }
  if (chkDontShow) {
    chkDontShow.checked = false;
  }

  if (btnExec) {
    btnExec.textContent = confirmText;
    btnExec.style.background = isDanger ? '#dc2626' : '#059669';
    btnExec.style.borderColor = isDanger ? '#dc2626' : '#059669';
    btnExec.onclick = () => {
      if (chkDontShow && chkDontShow.checked) {
        try { sessionStorage.setItem('kujang_skip_confirm_delete', 'true'); } catch (e) { }
      }
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

// ==========================================
// MULTI-SELECT DELETE RIWAYAT (KARYAWAN, ATASAN, POS JAGA)
// ==========================================
window.riwayatSelectState = window.riwayatSelectState || {
  karyawan: { active: false, selected: new Set(), visibleIds: [] },
  approver: { active: false, selected: new Set(), visibleIds: [] },
  security: { active: false, selected: new Set(), visibleIds: [] }
};

function getRiwayatRoleConfig(role) {
  if (role === 'approver') {
    return {
      btnId: 'btnSelectApproverRiwayat',
      barId: 'approverRiwayatSelectionBar',
      refresh: () => { if (typeof window.renderApproverView === 'function') window.renderApproverView(); }
    };
  }
  if (role === 'security') {
    return {
      btnId: 'btnSelectSecurityRiwayat',
      barId: 'securityRiwayatSelectionBar',
      refresh: () => { if (typeof window.renderSecurityView === 'function') window.renderSecurityView(); }
    };
  }
  return {
    btnId: 'btnSelectEmpRiwayat',
    barId: 'empRiwayatSelectionBar',
    refresh: () => {
      if (typeof window.renderRiwayatView === 'function') window.renderRiwayatView();
      if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
    }
  };
}

window.toggleRiwayatSelectMode = function (role, forceState) {
  const st = window.riwayatSelectState[role];
  if (!st) return;
  const next = typeof forceState === 'boolean' ? forceState : !st.active;
  st.active = next;
  if (!next) st.selected.clear();
  const cfg = getRiwayatRoleConfig(role);
  const btn = document.getElementById(cfg.btnId);
  if (btn) btn.classList.toggle('active', next);
  cfg.refresh();
};

window.toggleRiwayatTicketSelection = function (role, ticketId, isChecked) {
  const st = window.riwayatSelectState[role];
  if (!st || !ticketId) return;
  if (typeof isChecked === 'undefined') {
    isChecked = !st.selected.has(ticketId);
  }
  if (isChecked) {
    st.selected.add(ticketId);
  } else {
    st.selected.delete(ticketId);
  }
  const cards = document.querySelectorAll(`[data-select-role="${role}"][data-ticket-id="${ticketId}"]`);
  cards.forEach(el => {
    el.classList.toggle('riwayat-card-selected', !!isChecked);
    const cb = el.querySelector('input.riwayat-select-checkbox');
    if (cb) cb.checked = !!isChecked;
  });
  window.renderRiwayatSelectionBar(role, st.visibleIds || []);
};

window.handleRiwayatItemClick = function (role, ticketId, evt) {
  const st = window.riwayatSelectState[role];
  if (!st || !st.active) return;
  if (evt) {
    // Abaikan jika klik tepat di tombol aksi, link, atau checkbox itu sendiri
    if (evt.target.closest('button, a, input, select, .action-pills-row, .btn-action-more-dots')) {
      return;
    }
    evt.preventDefault();
    evt.stopPropagation();
  }
  window.toggleRiwayatTicketSelection(role, ticketId);
};

window.selectAllVisibleRiwayat = function (role, isChecked) {
  const st = window.riwayatSelectState[role];
  if (!st) return;
  const ids = st.visibleIds || [];
  ids.forEach(id => {
    if (isChecked) st.selected.add(id);
    else st.selected.delete(id);
  });
  const cfg = getRiwayatRoleConfig(role);
  cfg.refresh();
};

window.renderRiwayatSelectionBar = function (role, visibleIds) {
  const st = window.riwayatSelectState[role];
  if (!st) return;
  st.visibleIds = Array.isArray(visibleIds) ? visibleIds : [];
  const cfg = getRiwayatRoleConfig(role);
  const btn = document.getElementById(cfg.btnId);
  if (btn) btn.classList.toggle('active', Boolean(st.active));
  const bar = document.getElementById(cfg.barId);
  if (!bar) return;

  if (!st.active) {
    bar.style.display = 'none';
    bar.innerHTML = '';
    return;
  }

  const count = st.selected.size;
  const allVisibleChecked = st.visibleIds.length > 0 && st.visibleIds.every(id => st.selected.has(id));
  bar.style.display = 'flex';
  bar.innerHTML = `
    <label class="riwayat-select-all-wrap">
      <input type="checkbox" class="riwayat-select-checkbox" ${allVisibleChecked ? 'checked' : ''} onchange="window.selectAllVisibleRiwayat('${role}', this.checked)">
      <span>Pilih Semua (${st.visibleIds.length})</span>
    </label>
    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
      <span class="riwayat-selected-count">${count} dipilih</span>
      <button type="button" class="btn-danger-solid" style="padding: 0.4rem 0.85rem; font-size: 0.78rem; border-radius: 6px; font-weight: 700; cursor: ${count === 0 ? 'not-allowed' : 'pointer'}; opacity: ${count === 0 ? '0.5' : '1'};" ${count === 0 ? 'disabled' : ''} onclick="window.deleteSelectedRiwayat('${role}')">
        Hapus Terpilih (${count})
      </button>
      <button type="button" class="btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.78rem; border-radius: 6px; font-weight: 700;" onclick="window.toggleRiwayatSelectMode('${role}', false)">
        Batal
      </button>
    </div>
  `;
};

window.deleteSelectedRiwayat = function (role) {
  const st = window.riwayatSelectState[role];
  if (!st || st.selected.size === 0) {
    if (typeof window.showToast === 'function') window.showToast('Pilih minimal 1 riwayat terlebih dahulu.', 'warning');
    return;
  }

  const idsToDelete = new Set(st.selected);
  const count = idsToDelete.size;
  const cfg = getRiwayatRoleConfig(role);

  const handler = () => {
    const ticketsList = window.ticketsList || [];
    let deletedCount = 0;
    const isApprover2 = (window.currentActor === 'approver2');
    const currentApprover = (typeof window.getCurrentApproverActor === 'function') ? window.getCurrentApproverActor() : null;
    const approverNip = currentApprover ? currentApprover.nip : null;

    ticketsList.forEach(t => {
      if (!idsToDelete.has(t.id)) return;
      if (role === 'karyawan') {
        t.deletedByKaryawan = true;
        deletedCount++;
      } else if (role === 'approver') {
        if (!Array.isArray(t.deletedByApproverNips)) t.deletedByApproverNips = [];
        if (approverNip && !t.deletedByApproverNips.includes(approverNip)) t.deletedByApproverNips.push(approverNip);
        if (isApprover2) t.deletedByApprover2 = true;
        else t.deletedByApprover1 = true;
        t.deletedByApprover = true;
        deletedCount++;
      } else if (role === 'security') {
        t.deletedBySecurity = true;
        deletedCount++;
      }
    });

    if (typeof window.saveTickets === 'function') window.saveTickets(ticketsList);
    st.selected.clear();
    st.active = false;
    cfg.refresh();

    if (typeof window.showToast === 'function') {
      window.showToast(`${deletedCount} riwayat terpilih berhasil dihapus.`, 'success');
    }
  };

  if (typeof window.openDeleteConfirmModal === 'function') {
    window.openDeleteConfirmModal({
      title: 'Hapus Riwayat Terpilih',
      message: `Apakah Anda yakin ingin menghapus <strong>${count}</strong> riwayat yang dipilih dari daftar?`,
      onConfirm: handler
    });
  } else if (confirm(`Apakah Anda yakin ingin menghapus ${count} riwayat yang dipilih?`)) {
    handler();
  }
};

window.toggleRowActionDropdown = function (btn, role, ticketId) {
  const popover = document.getElementById('tableRowActionPopover');
  if (!popover || !btn) return;

  const isCurrentOpen = popover.classList.contains('open') && popover._currentTicketId === ticketId;
  if (isCurrentOpen) {
    window.closeTableRowActionPopover();
    return;
  }

  const rect = btn.getBoundingClientRect();
  const popoverWidth = 160;
  let leftPos = rect.right - popoverWidth;
  if (leftPos < 10) leftPos = 10;

  popover.style.top = `${Math.round(rect.bottom + 4)}px`;
  popover.style.left = `${Math.round(leftPos)}px`;
  popover._currentTicketId = ticketId;
  popover._currentRole = role;
  popover._triggerBtn = btn;

  popover.innerHTML = `
    <button type="button" class="table-row-popover-item" onclick="event.stopPropagation(); window.closeTableRowActionPopover(); if (typeof openTicketDetail === 'function') openTicketDetail('${ticketId}', 'detail');">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <line x1="10" y1="9" x2="8" y2="9"></line>
      </svg>
      <span>Detail Pengajuan</span>
    </button>
    <button type="button" class="table-row-popover-item danger" onclick="event.stopPropagation(); window.closeTableRowActionPopover(); window.handleRowActionDelete('${role}', '${ticketId}');">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
      <span>Hapus</span>
    </button>
  `;

  popover.classList.add('open');
  popover.setAttribute('aria-hidden', 'false');
};

window.closeTableRowActionPopover = function () {
  const popover = document.getElementById('tableRowActionPopover');
  if (popover) {
    popover.classList.remove('open');
    popover.setAttribute('aria-hidden', 'true');
    popover._currentTicketId = null;
    popover._currentRole = null;
    popover._triggerBtn = null;
  }
};

window.handleRowActionDelete = function (role, ticketId) {
  if (role === 'karyawan') {
    if (typeof window.deleteEmpTicket === 'function') window.deleteEmpTicket(ticketId);
  } else if (role === 'approver') {
    if (typeof window.deleteApproverTicket === 'function') window.deleteApproverTicket(ticketId);
  } else if (role === 'security') {
    if (typeof window.deleteSecurityTicket === 'function') window.deleteSecurityTicket(ticketId, 'riwayat');
  }
};

document.addEventListener('click', (e) => {
  const popover = document.getElementById('tableRowActionPopover');
  if (!popover || !popover.classList.contains('open')) return;
  if (!popover.contains(e.target) && (!popover._triggerBtn || !popover._triggerBtn.contains(e.target))) {
    window.closeTableRowActionPopover();
  }
});

window.addEventListener('scroll', () => {
  const popover = document.getElementById('tableRowActionPopover');
  if (popover && popover.classList.contains('open')) {
    window.closeTableRowActionPopover();
  }
}, { passive: true });

document.addEventListener('DOMContentLoaded', () => {
  initAllTableDragScroll();
});
