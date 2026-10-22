/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Module: Administrator Pengamanan & K3 (Supervisor & Auditor Pusat)
 * BRD Clauses: FR-ADM-01 s/d FR-ADM-06, UC-19 s/d UC-24, BRULE-09 & BRULE-13
 * Clean, Minimal, Anti-Clutter Design System
 */

let adminAuditSearchTerm = '';
let adminAuditEventFilter = 'all';

let adminReportDateFilter = 'today';
let adminReportStatusFilter = 'all';
let adminReportCategoryFilter = 'all';

let adminUserRoleFilter = 'all';
let adminUserSearchTerm = '';

// ==========================================
// DATA FORMATTING HELPERS (CLEAN & ROBUST)
// ==========================================

/**
 * Extracts and formats scan times and gates cleanly without awkward `(-)` or duplicate text
 */
function cleanScanDisplay(scanTimeStr, gateFallback) {
  if (!scanTimeStr || scanTimeStr === 'null' || scanTimeStr === '-' || scanTimeStr === 'undefined') {
    return '<span class="report-empty-cell">-</span>';
  }

  let timeOnly = String(scanTimeStr).trim();
  let gateName = gateFallback && gateFallback !== '-' ? String(gateFallback).trim() : '';

  // Check if scanTimeStr contains parenthesized gate (e.g., "14 Okt 2026, 11:21 WIB (Pos 1 Gerbang Utama)")
  const parenMatch = timeOnly.match(/^(.*?)\s*\((.*?)\)(.*)$/);
  if (parenMatch) {
    timeOnly = parenMatch[1].trim() + (parenMatch[3] ? ' ' + parenMatch[3].trim() : '');
    if (!gateName) gateName = parenMatch[2].trim();
  }

  // If time has full date, extract friendly time or keep concise
  // e.g. "14 Okt 2026, 11:21 WIB"
  timeOnly = timeOnly.replace(/\s*\[Terlambat\]/gi, '').trim();

  // If ISO string like "2026-10-14T11:21"
  if (timeOnly.includes('T')) {
    const parts = timeOnly.split('T');
    timeOnly = `${parts[1]} WIB`;
    if (!gateName) {
      gateName = parts[0];
    }
  }

  return `
    <div class="report-scan-time">${timeOnly}</div>
    ${gateName && gateName !== '-' ? `<div class="report-scan-gate">${gateName}</div>` : ''}
  `;
}

/**
 * Formats estimated return time cleanly (solves "null WIB" and raw ISO strings)
 */
function cleanEstimatedReturnDisplay(returnStr, permitType) {
  if (permitType === 'Tidak Kembali (Pulang)') {
    return '<span class="report-empty-cell" style="font-size: 0.775rem;">Tidak Kembali</span>';
  }
  if (!returnStr || returnStr === 'null' || returnStr === '-' || returnStr === 'undefined') {
    return '<span class="report-empty-cell">-</span>';
  }

  let str = String(returnStr).trim();
  // If ISO string like "2026-10-14T13:20"
  if (str.includes('T')) {
    const parts = str.split('T');
    return `<span style="font-weight: 600; font-family: var(--font-mono); color: var(--text-primary);">${parts[1]} WIB</span>`;
  }
  if (str.endsWith('WIB')) {
    return `<span style="font-weight: 600; font-family: var(--font-mono); color: var(--text-primary);">${str}</span>`;
  }
  return `<span style="font-weight: 600; font-family: var(--font-mono); color: var(--text-primary);">${str} WIB</span>`;
}

/**
 * Returns calm, legible status badges (no loud neon pills)
 */
function cleanStatusBadge(status) {
  let badgeClass = 'status-pill-subtle status-selesai';
  let label = status || 'Selesai';

  if (status === 'Sedang di Luar') {
    badgeClass = 'status-pill-subtle status-outside';
    label = 'Sedang di Luar';
  } else if (status === 'Terlambat') {
    badgeClass = 'status-pill-subtle status-overdue';
    label = 'Terlambat';
  } else if (status === 'Kedaluwarsa') {
    badgeClass = 'status-pill-subtle status-expired';
    label = 'Kedaluwarsa';
  } else if (status === 'Disetujui') {
    badgeClass = 'status-pill-subtle status-approved';
    label = 'Disetujui';
  } else if (status === 'Menunggu Persetujuan') {
    badgeClass = 'status-pill-subtle status-pending';
    label = 'Menunggu Review';
  } else if (status === 'Ditolak') {
    badgeClass = 'status-pill-subtle status-rejected';
    label = 'Ditolak';
  }

  return `<span class="${badgeClass}">${label}</span>`;
}

/**
 * Returns clean category tags (Dinas vs Pribadi)
 */
function cleanCategoryBadge(category) {
  const isDinas = category === 'Dinas Kantor';
  const label = isDinas ? 'Dinas Kantor' : 'Urusan Pribadi';
  const cls = isDinas ? 'cat-dinas' : 'cat-pribadi';
  return `<span class="report-category-pill ${cls}">${label}</span>`;
}

// ==========================================
// 1. METRICS & REAL-TIME HEADCOUNT (FR-ADM-01 & UC-19)
// ==========================================
function updateAdminMetrics() {
  const tickets = window.ticketsList || [];

  // Headcount outside: Sedang di Luar & Terlambat
  const outsideTickets = tickets.filter(t => t.status === 'Sedang di Luar');
  const overdueTickets = tickets.filter(t => t.status === 'Terlambat');
  const expiredTickets = tickets.filter(t => t.status === 'Kedaluwarsa');
  const pendingTickets = tickets.filter(t => t.status === 'Menunggu Persetujuan');
  const approvedTickets = tickets.filter(t => t.status === 'Disetujui');
  const completedTickets = tickets.filter(t => t.status === 'Selesai');

  const totalOutsideCount = outsideTickets.length + overdueTickets.length;

  // Sidebar badges
  const sidebarAdminOutsideBadge = document.getElementById('sidebarAdminOutsideBadge');
  if (sidebarAdminOutsideBadge) {
    sidebarAdminOutsideBadge.textContent = totalOutsideCount;
    sidebarAdminOutsideBadge.style.display = totalOutsideCount > 0 ? 'inline-block' : 'none';
  }

  const sidebarAdminAuditBadge = document.getElementById('sidebarAdminAuditBadge');
  if (sidebarAdminAuditBadge) {
    let totalEvents = 0;
    tickets.forEach(t => {
      const logs = t.activityLog || t.timeline || [];
      totalEvents += logs.length;
    });
    sidebarAdminAuditBadge.textContent = totalEvents;
  }

  // Calm Headcount Card
  const adminHeadcountBig = document.getElementById('adminHeadcountBig');
  const adminHeadcountSub = document.getElementById('adminHeadcountSub');
  const adminEmergencyBanner = document.getElementById('adminEmergencyBanner');

  if (adminHeadcountBig) {
    adminHeadcountBig.textContent = totalOutsideCount;
  }
  if (adminHeadcountSub) {
    if (totalOutsideCount === 0) {
      adminHeadcountSub.textContent = 'Semua personel berada di dalam kawasan industri pabrik (Kondisi Normal).';
    } else {
      adminHeadcountSub.textContent = `${totalOutsideCount} personel sedang berada di luar gerbang pabrik.`;
    }
  }
  if (adminEmergencyBanner) {
    adminEmergencyBanner.classList.toggle('has-outside', totalOutsideCount > 0);
  }

  // Minimal KPI Counters
  const statAdminTotal = document.getElementById('statAdminTotal');
  const statAdminPending = document.getElementById('statAdminPending');
  const statAdminOverdue = document.getElementById('statAdminOverdue');
  const statAdminExpired = document.getElementById('statAdminExpired');

  if (statAdminTotal) statAdminTotal.textContent = tickets.length;
  if (statAdminPending) statAdminPending.textContent = pendingTickets.length;
  if (statAdminOverdue) statAdminOverdue.textContent = overdueTickets.length;
  if (statAdminExpired) statAdminExpired.textContent = expiredTickets.length;
}

// ==========================================
// 2. LIVE MUSTER ROLL & DASHBOARD (FR-ADM-01, FR-ADM-05, UC-20)
// ==========================================
function renderAdminDashboard() {
  updateAdminMetrics();
  const tickets = window.ticketsList || [];

  // Filter employees currently outside
  const outsideList = tickets.filter(t => t.status === 'Sedang di Luar' || t.status === 'Terlambat');
  const containerMusterRoll = document.getElementById('adminMusterRollTableBody');
  const emptyMusterRollBox = document.getElementById('adminEmptyMusterRollBox');
  const tableMusterRollWrap = document.getElementById('adminTableMusterRollWrap');

  if (outsideList.length === 0) {
    if (emptyMusterRollBox) emptyMusterRollBox.style.display = 'block';
    if (tableMusterRollWrap) tableMusterRollWrap.style.display = 'none';
  } else {
    if (emptyMusterRollBox) emptyMusterRollBox.style.display = 'none';
    if (tableMusterRollWrap) tableMusterRollWrap.style.display = 'block';

    if (containerMusterRoll) {
      containerMusterRoll.innerHTML = outsideList.map(ticket => {
        return `
          <tr>
            <td>
              <span class="report-ticket-id">${ticket.id}</span>
              <div style="margin-top: 3px;">${cleanCategoryBadge(ticket.category)}</div>
            </td>
            <td>
              <div class="report-emp-name">${ticket.applicantName}</div>
              <div class="report-emp-nip">NIP: ${ticket.applicantNip}</div>
            </td>
            <td>
              <div class="report-dept-name">${ticket.department}</div>
            </td>
            <td>
              <div style="font-weight: 600; font-size: 0.825rem; color: var(--text-primary);">${ticket.destination || '-'}</div>
              <div style="font-size: 0.725rem; color: var(--text-secondary); max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${ticket.reason || ''}">
                ${ticket.reason || '-'}
              </div>
            </td>
            <td>
              ${cleanScanDisplay(ticket.scanOutTime, ticket.gateOut)}
            </td>
            <td>
              ${cleanEstimatedReturnDisplay(ticket.estimatedReturn, ticket.type)}
            </td>
            <td>
              ${cleanStatusBadge(ticket.status)}
            </td>
            <td style="text-align: right;">
              <button class="btn-action-sm outline" onclick="window.viewAdminTicketDetail('${ticket.id}')" title="Audit Detail Tiket">
                Detail
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // Render Recent Activity Feed for Admin
  renderAdminRecentFeed();

  // Render Live 7-Status Tracking for Admin (Requirement 2)
  if (typeof renderAdminStatusTracking === 'function') {
    renderAdminStatusTracking();
  }

  // Render Charts for Admin
  if (typeof window.renderAdminTrafficChart === 'function') {
    window.renderAdminTrafficChart();
  }
  if (typeof window.renderAdminDeptChart === 'function') {
    window.renderAdminDeptChart();
  }
  if (typeof window.renderAdminStatusChart === 'function') {
    window.renderAdminStatusChart();
  }
}

function renderAdminRecentFeed() {
  const containerFeed = document.getElementById('adminRecentActivityFeed');
  if (!containerFeed) return;

  const tickets = window.ticketsList || [];
  const allEvents = [];

  tickets.forEach(ticket => {
    const logs = ticket.activityLog || ticket.timeline || [];
    logs.forEach(log => {
      allEvents.push({
        ticketId: ticket.id,
        applicantName: ticket.applicantName,
        category: ticket.category,
        event: log.event,
        time: log.time,
        by: log.by,
        desc: log.desc
      });
    });
  });

  const recentEvents = allEvents.slice(-5).reverse();

  if (recentEvents.length === 0) {
    containerFeed.innerHTML = '<div style="font-size: 0.825rem; color: var(--text-secondary); padding: 1rem; text-align: center;">Belum ada aktivitas tercatat hari ini.</div>';
    return;
  }

  containerFeed.innerHTML = recentEvents.map(evt => {
    let pillClass = '';
    if (evt.event.includes('Disetujui')) pillClass = 'event-approve';
    else if (evt.event.includes('Ditolak')) pillClass = 'event-reject';
    else if (evt.event.includes('Scan Out')) pillClass = 'event-out';
    else if (evt.event.includes('Scan In')) pillClass = 'event-in';
    else if (evt.event.includes('Terlambat')) pillClass = 'event-overdue';
    else if (evt.event.includes('Kedaluwarsa')) pillClass = 'event-expire';

    return `
      <div style="padding: 0.65rem 0; border-bottom: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 3px;">
          <span class="audit-pill ${pillClass}">${evt.event}</span>
          <span style="font-size: 0.725rem; color: var(--text-muted); font-family: var(--font-mono);">${evt.time}</span>
        </div>
        <div style="font-size: 0.825rem; font-weight: 600; color: var(--text-primary);">
          ${evt.applicantName} <span style="font-weight: 400; color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.75rem;">(${evt.ticketId})</span>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 1px;">
          ${evt.by}: ${evt.desc}
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// 3. AUDIT TRAIL & INVESTIGATION (FR-ADM-04, UC-21, BRULE-13)
// ==========================================
function renderAdminAudit() {
  const tickets = window.ticketsList || [];
  const tbody = document.getElementById('adminAuditTableBody');
  const countBadge = document.getElementById('adminAuditFilterCount');
  if (!tbody) return;

  const allLogs = [];
  tickets.forEach(ticket => {
    const logs = ticket.activityLog || ticket.timeline || [];
    logs.forEach(log => {
      allLogs.push({
        ticketId: ticket.id,
        applicantName: ticket.applicantName,
        applicantNip: ticket.applicantNip,
        department: ticket.department,
        category: ticket.category,
        event: log.event,
        time: log.time,
        by: log.by,
        desc: log.desc
      });
    });
  });

  allLogs.reverse();

  // Filter
  const filtered = allLogs.filter(item => {
    const term = adminAuditSearchTerm.toLowerCase();
    const matchesSearch = !term ||
      item.ticketId.toLowerCase().includes(term) ||
      item.applicantName.toLowerCase().includes(term) ||
      item.applicantNip.toLowerCase().includes(term) ||
      item.by.toLowerCase().includes(term) ||
      item.desc.toLowerCase().includes(term);

    let matchesEvent = true;
    if (adminAuditEventFilter !== 'all') {
      matchesEvent = item.event.toLowerCase().includes(adminAuditEventFilter.toLowerCase());
    }

    return matchesSearch && matchesEvent;
  });

  if (countBadge) {
    countBadge.textContent = `${filtered.length} riwayat peristiwa`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary);">
          <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">🔍</div>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.9rem;">Tidak Ada Log Aktivitas yang Cocok</div>
          <div style="font-size: 0.775rem; margin-top: 0.2rem;">Silakan sesuaikan kata kunci atau filter peristiwa.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(log => {
    let pillClass = '';
    if (log.event.includes('Disetujui')) pillClass = 'event-approve';
    else if (log.event.includes('Ditolak')) pillClass = 'event-reject';
    else if (log.event.includes('Scan Out')) pillClass = 'event-out';
    else if (log.event.includes('Scan In')) pillClass = 'event-in';
    else if (log.event.includes('Terlambat')) pillClass = 'event-overdue';
    else if (log.event.includes('Kedaluwarsa')) pillClass = 'event-expire';

    return `
      <tr>
        <td style="white-space: nowrap;">
          <div style="font-size: 0.775rem; font-family: var(--font-mono); color: var(--text-secondary);">
            ${log.time}
          </div>
        </td>
        <td style="white-space: nowrap;">
          <a href="javascript:void(0)" onclick="window.viewAdminTicketDetail('${log.ticketId}')" class="report-ticket-id" style="color: var(--primary-accent); text-decoration: none;">
            ${log.ticketId}
          </a>
        </td>
        <td>
          <div class="report-emp-name">${log.applicantName}</div>
          <div class="report-emp-nip">NIP: ${log.applicantNip}</div>
        </td>
        <td>
          <span class="audit-pill ${pillClass}">${log.event}</span>
        </td>
        <td>
          <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary);">${log.by}</div>
        </td>
        <td>
          <div style="font-size: 0.775rem; color: var(--text-secondary); line-height: 1.4;">${log.desc}</div>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button type="button" class="btn-action-sm outline" onclick="window.viewAdminTicketDetail('${log.ticketId}')" title="Lihat Rincian Tiket #${log.ticketId}" style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; padding: 0.25rem 0.5rem;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span>Rincian</span>
          </button>
          <button type="button" class="btn-figma-delete-single" onclick="window.deleteAdminAuditLog('${log.ticketId}', '${encodeURIComponent(log.time)}', '${encodeURIComponent(log.event)}')" title="Hapus Catatan Audit Peristiwa Ini" style="background: none; border: none; color: #ef4444; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.2rem; padding: 0.25rem 0.45rem; border-radius: 4px; margin-left: 0.35rem; transition: background 0.15s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='none'">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Hapus</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// DELETE FEATURE FOR AUDIT TRAIL LOG (REQUIREMENT 7)
function deleteAdminAuditLog(ticketId, encodedTime, encodedEvent) {
  const time = decodeURIComponent(encodedTime);
  const event = decodeURIComponent(encodedEvent);

  if (!confirm(`Apakah Anda yakin ingin menghapus catatan audit [${event}] untuk tiket #${ticketId} pada ${time}? Tindakan ini memerlukan otorisasi administrator.`)) {
    return;
  }

  const tickets = window.ticketsList || [];
  const targetTicket = tickets.find(t => t.id === ticketId);
  if (!targetTicket) {
    if (typeof window.showToast === 'function') {
      window.showToast(`Tiket #${ticketId} tidak ditemukan.`, 'error');
    }
    return;
  }

  // Remove matching log from activityLog
  if (Array.isArray(targetTicket.activityLog)) {
    targetTicket.activityLog = targetTicket.activityLog.filter(l => !(l.time === time && l.event === event));
  }

  // Remove matching log from timeline
  if (Array.isArray(targetTicket.timeline)) {
    targetTicket.timeline = targetTicket.timeline.filter(l => !(l.time === time && l.event === event));
  }

  window.saveTickets(tickets);
  renderAdminAudit();
  renderAdminRecentFeed();

  if (typeof window.showToast === 'function') {
    window.showToast(`Catatan audit [${event}] untuk tiket #${ticketId} berhasil dihapus.`, 'info');
  }
}

// ==========================================
// 4. REPORTS & EXPORT EXCEL / PRINT PDF (FR-ADM-03, UC-22, UC-23)
// ==========================================
function renderAdminReports() {
  const tickets = window.ticketsList || [];
  const tbody = document.getElementById('adminReportTableBody');
  const countEl = document.getElementById('adminReportRowCount');
  if (!tbody) return;

  // Filter tickets
  const filtered = tickets.filter(ticket => {
    if (adminReportStatusFilter !== 'all' && ticket.status !== adminReportStatusFilter) {
      return false;
    }
    if (adminReportCategoryFilter !== 'all') {
      const isDinas = ticket.category === 'Dinas Kantor';
      if (adminReportCategoryFilter === 'Dinas Kantor' && !isDinas) return false;
      if (adminReportCategoryFilter === 'Keperluan Pribadi' && isDinas) return false;
    }
    return true;
  });

  if (countEl) {
    countEl.textContent = `${filtered.length} Data Tiket Perizinan`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary);">
          <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">📋</div>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.9rem;">Tidak Ada Data Sesuai Filter</div>
          <div style="font-size: 0.775rem; margin-top: 0.2rem;">Coba ubah filter periode atau status perizinan.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    return `
      <tr>
        <td style="white-space: nowrap;">
          <span class="report-ticket-id">${t.id}</span>
        </td>
        <td>
          <div class="report-emp-name">${t.applicantName}</div>
          <div class="report-emp-nip">NIP: ${t.applicantNip}</div>
        </td>
        <td>
          <div class="report-dept-name">${t.department}</div>
        </td>
        <td>
          ${cleanCategoryBadge(t.category)}
        </td>
        <td>
          ${cleanScanDisplay(t.scanOutTime, t.gateOut)}
        </td>
        <td>
          ${cleanScanDisplay(t.scanInTime, t.gateIn)}
        </td>
        <td>
          ${cleanEstimatedReturnDisplay(t.estimatedReturn, t.type)}
        </td>
        <td style="text-align: center;">
          ${cleanStatusBadge(t.status)}
        </td>
      </tr>
    `;
  }).join('');
}

// Clean Export to CSV / Excel
function exportAdminExcel() {
  const tickets = window.ticketsList || [];
  if (tickets.length === 0) {
    if (typeof window.showToast === 'function') window.showToast('Tidak ada data tiket untuk diexport', 'warning');
    return;
  }

  const headers = [
    'No Tiket',
    'Tanggal',
    'NIP Karyawan',
    'Nama Karyawan',
    'Departemen',
    'Keperluan',
    'Tujuan',
    'Alasan',
    'Scan Out (Waktu)',
    'Scan Out (Gerbang)',
    'Scan In (Waktu)',
    'Scan In (Gerbang)',
    'Estimasi Kembali',
    'Status Akhir',
    'Atasan Penyetuju'
  ];

  const rows = tickets.map(t => {
    // Clean scan out string
    let outTime = '-';
    let outGate = t.gateOut || '-';
    if (t.scanOutTime) {
      const match = t.scanOutTime.match(/^(.*?)\s*\((.*?)\)/);
      if (match) {
        outTime = match[1].trim();
        outGate = match[2].trim();
      } else {
        outTime = t.scanOutTime;
      }
    }

    // Clean scan in string
    let inTime = '-';
    let inGate = t.gateIn || '-';
    if (t.scanInTime) {
      const match = t.scanInTime.match(/^(.*?)\s*\((.*?)\)/);
      if (match) {
        inTime = match[1].trim();
        inGate = match[2].trim();
      } else {
        inTime = t.scanInTime;
      }
    }

    // Clean return time
    let estReturn = '-';
    if (t.type === 'Tidak Kembali (Pulang)') {
      estReturn = 'Tidak Kembali';
    } else if (t.estimatedReturn && t.estimatedReturn !== 'null') {
      estReturn = t.estimatedReturn.includes('T') ? t.estimatedReturn.split('T')[1] + ' WIB' : t.estimatedReturn;
    }

    return [
      `"${t.id}"`,
      `"${t.createdAt || t.createdDate || '-'}"`,
      `"${t.applicantNip || '-'}"`,
      `"${(t.applicantName || '').replace(/"/g, '""')}"`,
      `"${(t.department || '').replace(/"/g, '""')}"`,
      `"${t.category || '-'}"`,
      `"${(t.destination || '').replace(/"/g, '""')}"`,
      `"${(t.reason || '').replace(/"/g, '""')}"`,
      `"${outTime}"`,
      `"${outGate}"`,
      `"${inTime}"`,
      `"${inGate}"`,
      `"${estReturn}"`,
      `"${t.status || '-'}"`,
      `"${(t.approverName || '-').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = `Rekap_Izin_Keluar_Pupuk_Kujang_${dateStr}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (typeof window.showToast === 'function') {
    window.showToast(`Berhasil mengunduh rekap ${tickets.length} perizinan ke Excel (.csv)`, 'success');
  }
}

function printAdminReport() {
  const printTitle = document.getElementById('adminPrintTimestamp');
  if (printTitle) {
    const now = new Date();
    printTitle.textContent = `Dicetak pada: ${now.toLocaleDateString('id-ID', { dateStyle: 'full' })} pukul ${now.toLocaleTimeString('id-ID')} WIB oleh Bambang Sutrisno, S.T. (Departemen Pengamanan & K3)`;
  }
  window.print();
}

// ==========================================
// 5. USER ACCESS MANAGEMENT / KUJANG ID (FR-ADM-06, UC-24, REQUIREMENT 1)
// ==========================================
function openAdminUserModal(mode, kujangId) {
  const modal = document.getElementById('modalAdminUserAccess');
  const title = document.getElementById('modalAdminUserTitle');
  const modeInput = document.getElementById('adminUserEditMode');
  const origIdInput = document.getElementById('adminUserOriginalKujangId');
  if (!modal) return;

  modeInput.value = mode;
  origIdInput.value = kujangId || '';

  if (mode === 'add') {
    if (title) title.textContent = 'Berikan Hak Akses Pengguna Baru';
    const randNum = Math.floor(100000 + Math.random() * 900000);
    const inputKujang = document.getElementById('adminInputKujangId');
    if (inputKujang) {
      inputKujang.value = `KJG-${randNum}`;
      inputKujang.readOnly = false;
    }
    const inputNip = document.getElementById('adminInputNip');
    if (inputNip) inputNip.value = '';
    const inputName = document.getElementById('adminInputName');
    if (inputName) inputName.value = '';
    const inputEmail = document.getElementById('adminInputEmail');
    if (inputEmail) inputEmail.value = '';
    const inputDept = document.getElementById('adminInputDept');
    if (inputDept) inputDept.value = 'Departemen Rekayasa & Pemeliharaan';
    const inputRole = document.getElementById('adminInputRoleKey');
    if (inputRole) inputRole.value = 'karyawan';
    const inputStatus = document.getElementById('adminInputStatus');
    if (inputStatus) inputStatus.value = 'Aktif';
  } else {
    if (title) title.textContent = 'Ubah Hak Akses Pengguna';
    const users = window.MOCK_USERS || [];
    const user = users.find(u => u.kujangId === kujangId);
    if (user) {
      const inputKujang = document.getElementById('adminInputKujangId');
      if (inputKujang) {
        inputKujang.value = user.kujangId;
        inputKujang.readOnly = true;
      }
      const inputNip = document.getElementById('adminInputNip');
      if (inputNip) inputNip.value = user.nip;
      const inputName = document.getElementById('adminInputName');
      if (inputName) inputName.value = user.name;
      const inputEmail = document.getElementById('adminInputEmail');
      if (inputEmail) inputEmail.value = user.email || '';
      const inputDept = document.getElementById('adminInputDept');
      if (inputDept) inputDept.value = user.department;
      const inputRole = document.getElementById('adminInputRoleKey');
      if (inputRole) inputRole.value = user.roleKey;
      const inputStatus = document.getElementById('adminInputStatus');
      if (inputStatus) inputStatus.value = user.status || 'Aktif';
    }
  }

  modal.classList.add('open');
}

function closeAdminUserModal() {
  const modal = document.getElementById('modalAdminUserAccess');
  if (modal) modal.classList.remove('open');
}

function saveAdminUserAccess(event) {
  if (event) event.preventDefault();
  const mode = document.getElementById('adminUserEditMode').value;
  const originalId = document.getElementById('adminUserOriginalKujangId').value;

  const kujangId = document.getElementById('adminInputKujangId').value.trim();
  const nip = document.getElementById('adminInputNip').value.trim();
  const name = document.getElementById('adminInputName').value.trim();
  const email = document.getElementById('adminInputEmail').value.trim() || `${nip.toLowerCase().replace(/[^a-z0-9]/g, '')}@pupuk-kujang.co.id`;
  const department = document.getElementById('adminInputDept').value;
  const roleKey = document.getElementById('adminInputRoleKey').value;
  const status = document.getElementById('adminInputStatus').value;

  if (!kujangId || !nip || !name) {
    alert('Mohon lengkapi KUJANG ID, NIP, dan Nama Pengguna.');
    return;
  }

  let roleLabel = 'Karyawan';
  if (roleKey === 'approver') roleLabel = 'Atasan 1 (Manager)';
  else if (roleKey === 'approver2') roleLabel = 'Atasan 2 (Supervisor / Plt)';
  else if (roleKey === 'security') roleLabel = 'Petugas Pos Jaga (Satpam)';
  else if (roleKey === 'admin') roleLabel = 'Administrator Pengamanan & K3';

  let users = window.MOCK_USERS || [];

  if (mode === 'add') {
    if (users.some(u => u.kujangId.toLowerCase() === kujangId.toLowerCase())) {
      alert(`KUJANG ID ${kujangId} sudah terdaftar dalam sistem.`);
      return;
    }
    const newUser = {
      kujangId,
      nip,
      name,
      email,
      department,
      role: roleLabel,
      roleKey,
      status,
      lastLogin: 'Baru saja didaftarkan'
    };
    users.unshift(newUser);
  } else {
    const idx = users.findIndex(u => u.kujangId === originalId || u.kujangId === kujangId);
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        nip,
        name,
        email,
        department,
        role: roleLabel,
        roleKey,
        status
      };
    }
  }

  if (typeof window.saveUsers === 'function') {
    window.saveUsers(users);
  } else {
    window.MOCK_USERS = users;
  }

  closeAdminUserModal();
  renderAdminUsers();

  if (typeof window.showToast === 'function') {
    window.showToast(`Hak akses untuk ${name} (${kujangId}) berhasil disimpan.`, 'success');
  }
}

function toggleUserAccess(kujangId) {
  let users = window.MOCK_USERS || [];
  const user = users.find(u => u.kujangId === kujangId);
  if (!user) return;

  if (user.roleKey === 'admin' && user.status === 'Aktif') {
    const activeAdmins = users.filter(u => u.roleKey === 'admin' && u.status === 'Aktif');
    if (activeAdmins.length <= 1) {
      alert('Tidak dapat mencabut hak akses Administrator utama satu-satunya.');
      return;
    }
  }

  const willRevoke = user.status === 'Aktif';
  const actionText = willRevoke ? 'mencabut hak akses' : 'mengaktifkan kembali hak akses';
  if (!confirm(`Apakah Anda yakin ingin ${actionText} untuk akun ${user.name} (${user.kujangId})?`)) {
    return;
  }

  user.status = willRevoke ? 'Dicabut' : 'Aktif';

  if (typeof window.saveUsers === 'function') {
    window.saveUsers(users);
  }

  renderAdminUsers();

  if (typeof window.showToast === 'function') {
    window.showToast(`Hak akses untuk ${user.name} berhasil ${user.status === 'Aktif' ? 'diaktifkan' : 'dicabut'}.`, user.status === 'Aktif' ? 'success' : 'warning');
  }
}

function deleteAdminUser(kujangId) {
  let users = window.MOCK_USERS || [];
  const user = users.find(u => u.kujangId === kujangId);
  if (!user) return;

  if (user.roleKey === 'admin') {
    alert('Akun Administrator Pengamanan & K3 tidak dapat dihapus untuk keamanan sistem.');
    return;
  }

  if (!confirm(`Apakah Anda yakin ingin menghapus hak akses KUJANG ID ${kujangId} (${user.name})? Tindakan ini akan menghapus akun dari sistem.`)) {
    return;
  }

  users = users.filter(u => u.kujangId !== kujangId);

  if (typeof window.saveUsers === 'function') {
    window.saveUsers(users);
  } else {
    window.MOCK_USERS = users;
  }

  renderAdminUsers();

  if (typeof window.showToast === 'function') {
    window.showToast(`Hak akses akun ${kujangId} berhasil dihapus dari direktori.`, 'info');
  }
}

function renderAdminUsers() {
  const users = window.MOCK_USERS || [];
  const tbody = document.getElementById('adminUsersTableBody');
  const countEl = document.getElementById('adminUsersCount');
  if (!tbody) return;

  const filtered = users.filter(user => {
    if (adminUserRoleFilter !== 'all' && user.roleKey !== adminUserRoleFilter) {
      return false;
    }
    const term = adminUserSearchTerm.toLowerCase();
    if (term) {
      const match = (user.kujangId || '').toLowerCase().includes(term) ||
        (user.nip || '').toLowerCase().includes(term) ||
        (user.name || '').toLowerCase().includes(term) ||
        (user.department || '').toLowerCase().includes(term) ||
        (user.role || '').toLowerCase().includes(term);
      if (!match) return false;
    }
    return true;
  });

  if (countEl) countEl.textContent = `${filtered.length} Akun Terdaftar`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary);">
          <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">👥</div>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.9rem;">Tidak Ada Akun KUJANG ID yang Sesuai</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    let roleClass = 'karyawan';
    if (u.roleKey === 'approver' || u.roleKey === 'approver2') roleClass = 'approver';
    else if (u.roleKey === 'security') roleClass = 'security';
    else if (u.roleKey === 'admin') roleClass = 'admin';

    const isRevoked = u.status === 'Dicabut' || u.status === 'Nonaktif';
    const statusBadge = isRevoked
      ? `<span style="font-size: 0.75rem; color: #991b1b; font-weight: 700; background: #fee2e2; border: 1px solid #fecaca; padding: 2px 8px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 4px;">● Dicabut</span>`
      : `<span style="font-size: 0.75rem; color: #166534; font-weight: 700; background: #dcfce7; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 4px;">● Aktif</span>`;

    return `
      <tr>
        <td>
          <span style="font-family: var(--font-mono); font-weight: 700; color: #1e293b; font-size: 0.825rem; background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 6px; border-radius: 4px;">
            ${u.kujangId}
          </span>
        </td>
        <td>
          <div class="report-emp-name">${u.name}</div>
          <div class="report-emp-nip">NIP: ${u.nip}</div>
        </td>
        <td style="font-size: 0.8rem; color: var(--text-secondary);">${u.email || '-'}</td>
        <td style="font-size: 0.825rem; color: #334155;">${u.department}</td>
        <td>
          <span class="user-role-badge ${roleClass}">${u.role}</span>
        </td>
        <td>
          ${statusBadge}
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">${u.lastLogin || '-'}</div>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn-action-sm outline" onclick="window.openAdminUserModal('edit', '${u.kujangId}')" title="Ubah Hak Akses" style="font-size: 0.725rem; padding: 3px 8px;">
            Ubah
          </button>
          <button class="btn-action-sm outline" onclick="window.toggleUserAccess('${u.kujangId}')" title="${isRevoked ? 'Aktifkan Akses' : 'Cabut Akses'}" style="font-size: 0.725rem; padding: 3px 8px; margin-left: 3px; color: ${isRevoked ? '#059669' : '#d97706'}; border-color: ${isRevoked ? '#a7f3d0' : '#fcd34d'};">
            ${isRevoked ? 'Beri Akses' : 'Cabut Akses'}
          </button>
          <button class="btn-action-sm outline" onclick="window.deleteAdminUser('${u.kujangId}')" title="Hapus Akun" style="font-size: 0.725rem; padding: 3px 8px; margin-left: 3px; color: #ef4444; border-color: #fca5a5;">
            Hapus
          </button>
          <button class="btn-action-sm" onclick="window.switchRole('${u.roleKey}')" title="${isRevoked ? 'Akses dicabut' : 'Beralih ke peran ini'}" style="font-size: 0.725rem; padding: 3px 8px; margin-left: 3px; ${isRevoked ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
            Beralih
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// 6. LIVE 7-STATUS TRACKING (REQUIREMENT 2)
// ==========================================
let adminTrackingStatusFilter = 'all';
let adminTrackingSearchTerm = '';

function canonicalStatus(rawStatus) {
  const s = (rawStatus || '').trim().toLowerCase();
  if (s.includes('menunggu')) return 'Menunggu Persetujuan';
  if (s.includes('setuju') && !s.includes('menunggu')) return 'Setuju';
  if (s.includes('tolak')) return 'Ditolak';
  if (s.includes('daluwarsa') || s.includes('hangus')) return 'Kadaluwarsa';
  if (s.includes('lambat')) return 'Terlambat';
  if (s.includes('luar')) return 'Sedang di Luar';
  if (s.includes('selesai')) return 'Selesai';
  return rawStatus || 'Selesai';
}

function filterAdminStatusTracking(statusKey) {
  adminTrackingStatusFilter = statusKey;
  renderAdminStatusTracking();
}

function renderAdminStatusTracking() {
  const pillsContainer = document.getElementById('adminStatusFilterPills');
  const tbody = document.getElementById('adminStatusTrackingTableBody');
  if (!pillsContainer || !tbody) return;

  const tickets = window.ticketsList || [];

  // Count by canonical status
  const counts = {
    'all': tickets.length,
    'Menunggu Persetujuan': 0,
    'Setuju': 0,
    'Sedang di Luar': 0,
    'Terlambat': 0,
    'Selesai': 0,
    'Kadaluwarsa': 0,
    'Ditolak': 0
  };

  tickets.forEach(t => {
    const cStatus = canonicalStatus(t.status);
    if (counts[cStatus] !== undefined) {
      counts[cStatus]++;
    }
  });

  // Render Filter Pills
  const filterKeys = [
    { key: 'all', label: 'Semua Status', icon: '📋', count: counts['all'] },
    { key: 'Menunggu Persetujuan', label: 'Menunggu Persetujuan', icon: '⏳', count: counts['Menunggu Persetujuan'] },
    { key: 'Setuju', label: 'Setuju', icon: '✅', count: counts['Setuju'] },
    { key: 'Sedang di Luar', label: 'Sedang di Luar', icon: '🚶', count: counts['Sedang di Luar'] },
    { key: 'Terlambat', label: 'Terlambat', icon: '⚠️', count: counts['Terlambat'] },
    { key: 'Selesai', label: 'Selesai', icon: '🏁', count: counts['Selesai'] },
    { key: 'Kadaluwarsa', label: 'Kadaluwarsa', icon: '⌛', count: counts['Kadaluwarsa'] },
    { key: 'Ditolak', label: 'Ditolak', icon: '❌', count: counts['Ditolak'] }
  ];

  pillsContainer.innerHTML = filterKeys.map(f => {
    const isActive = adminTrackingStatusFilter === f.key;
    const activeStyle = isActive
      ? `background: #0f172a; color: #ffffff; border-color: #0f172a; font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,0.1);`
      : `background: #ffffff; color: var(--text-secondary); border-color: var(--border-color); font-weight: 500;`;

    return `
      <button type="button" class="status-tracking-pill-btn" onclick="window.filterAdminStatusTracking('${f.key}')"
        style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.75rem; border-radius: 9999px; font-size: 0.775rem; border: 1px solid var(--border-color); cursor: pointer; white-space: nowrap; transition: all 0.15s ease; ${activeStyle}">
        <span>${f.icon}</span>
        <span>${f.label}</span>
        <span style="background: ${isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9'}; color: ${isActive ? '#ffffff' : 'var(--text-primary)'}; padding: 1px 6px; border-radius: 9999px; font-size: 0.7rem; font-weight: 700;">
          ${f.count}
        </span>
      </button>
    `;
  }).join('');

  // Filter list
  const filtered = tickets.filter(t => {
    const cStatus = canonicalStatus(t.status);
    if (adminTrackingStatusFilter !== 'all' && cStatus !== adminTrackingStatusFilter) {
      return false;
    }
    const term = adminTrackingSearchTerm.toLowerCase();
    if (term) {
      const match = (t.id || '').toLowerCase().includes(term) ||
        (t.applicantName || '').toLowerCase().includes(term) ||
        (t.applicantNip || '').toLowerCase().includes(term) ||
        (t.department || '').toLowerCase().includes(term) ||
        (t.destination || '').toLowerCase().includes(term) ||
        (t.reason || '').toLowerCase().includes(term);
      if (!match) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary);">
          <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">🔍</div>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.9rem;">Tidak Ada Data Perizinan yang Sesuai</div>
          <div style="font-size: 0.775rem; margin-top: 0.2rem;">Coba sesuaikan kata kunci atau pilih filter status lainnya.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const cStatus = canonicalStatus(t.status);

    // Dynamic progression narrative
    let progressionText = '';
    let badgeColorClass = 'status-selesai';
    if (cStatus === 'Menunggu Persetujuan') {
      badgeColorClass = 'status-pending';
      progressionText = 'Diajukan, menunggu telaah dan persetujuan atasan';
    } else if (cStatus === 'Setuju') {
      badgeColorClass = 'status-approved';
      progressionText = 'Disetujui atasan, QR Code aktif siap Scan Out di gerbang';
    } else if (cStatus === 'Sedang di Luar') {
      badgeColorClass = 'status-outside';
      progressionText = `Keluar via ${t.gateOut || 'Pos Gerbang'} (${t.scanOutTime || '-'})`;
    } else if (cStatus === 'Terlambat') {
      badgeColorClass = 'status-overdue';
      progressionText = `Melewati batas kembali ${cleanEstimatedReturnDisplay(t.estimatedReturn, t.type)}`;
    } else if (cStatus === 'Selesai') {
      badgeColorClass = 'status-selesai';
      progressionText = `Kembali lengkap via ${t.gateIn || 'Pos Gerbang'} (${t.scanInTime || '-'})`;
    } else if (cStatus === 'Kadaluwarsa') {
      badgeColorClass = 'status-expired';
      progressionText = 'Tiket kedaluwarsa karena tidak digunakan keluar area';
    } else if (cStatus === 'Ditolak') {
      badgeColorClass = 'status-expired';
      progressionText = `Ditolak oleh atasan: ${t.rejectReason || 'Alasan operasional'}`;
    }

    return `
      <tr>
        <td>
          <a href="javascript:void(0)" onclick="window.viewAdminTicketDetail('${t.id}')" class="report-ticket-id" style="text-decoration: none; font-weight: 700; color: var(--primary-accent);">
            ${t.id}
          </a>
          <div style="margin-top: 3px;">${cleanCategoryBadge(t.category)}</div>
        </td>
        <td>
          <div class="report-emp-name">${t.applicantName}</div>
          <div class="report-emp-nip">NIP: ${t.applicantNip}</div>
        </td>
        <td>
          <div class="report-dept-name">${t.department}</div>
        </td>
        <td>
          <div style="font-weight: 600; font-size: 0.825rem; color: var(--text-primary);">${t.destination || '-'}</div>
          <div style="font-size: 0.725rem; color: var(--text-secondary); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${t.reason || ''}">
            ${t.reason || '-'}
          </div>
        </td>
        <td style="font-size: 0.775rem;">
          <div><span style="color: var(--text-muted);">Keluar:</span> ${cleanScanDisplay(t.scanOutTime, t.gateOut)}</div>
          <div style="margin-top: 2px;"><span style="color: var(--text-muted);">Estimasi:</span> ${cleanEstimatedReturnDisplay(t.estimatedReturn, t.type)}</div>
        </td>
        <td>
          <span class="status-pill-subtle ${badgeColorClass}" style="margin-bottom: 3px;">
            ${cStatus}
          </span>
          <div style="font-size: 0.725rem; color: var(--text-secondary); line-height: 1.3; max-width: 240px;">
            ${progressionText}
          </div>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button type="button" class="btn-action-sm outline" onclick="window.viewAdminTicketDetail('${t.id}')" title="Audit Detail Tiket">
            Rincian
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function viewAdminTicketDetail(ticketId) {
  if (typeof window.showTicketDetailModal === 'function') {
    window.showTicketDetailModal(ticketId);
  }
}

function renderAdminView() {
  const nav = window.currentAdminNav || 'dashboard';
  if (nav === 'dashboard') {
    renderAdminDashboard();
  } else if (nav === 'audit') {
    renderAdminAudit();
  } else if (nav === 'report') {
    renderAdminReports();
  } else if (nav === 'users') {
    renderAdminUsers();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const auditSearch = document.getElementById('adminAuditSearchInput');
  const auditFilter = document.getElementById('adminAuditEventFilter');
  if (auditSearch) {
    auditSearch.addEventListener('input', (e) => {
      adminAuditSearchTerm = e.target.value;
      renderAdminAudit();
    });
  }
  if (auditFilter) {
    auditFilter.addEventListener('change', (e) => {
      adminAuditEventFilter = e.target.value;
      renderAdminAudit();
    });
  }

  const reportDate = document.getElementById('adminReportDateFilter');
  const reportStatus = document.getElementById('adminReportStatusFilter');
  const reportCategory = document.getElementById('adminReportCategoryFilter');
  const btnExportExcel = document.getElementById('btnAdminExportExcel');
  const btnPrintPdf = document.getElementById('btnAdminPrintPdf');

  if (reportDate) {
    reportDate.addEventListener('change', (e) => {
      adminReportDateFilter = e.target.value;
      renderAdminReports();
    });
  }
  if (reportStatus) {
    reportStatus.addEventListener('change', (e) => {
      adminReportStatusFilter = e.target.value;
      renderAdminReports();
    });
  }
  if (reportCategory) {
    reportCategory.addEventListener('change', (e) => {
      adminReportCategoryFilter = e.target.value;
      renderAdminReports();
    });
  }
  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', exportAdminExcel);
  }
  if (btnPrintPdf) {
    btnPrintPdf.addEventListener('click', printAdminReport);
  }

  const userSearch = document.getElementById('adminUserSearchInput');
  const userRole = document.getElementById('adminUserRoleFilter');
  if (userSearch) {
    userSearch.addEventListener('input', (e) => {
      adminUserSearchTerm = e.target.value;
      renderAdminUsers();
    });
  }
  if (userRole) {
    userRole.addEventListener('change', (e) => {
      adminUserRoleFilter = e.target.value;
      renderAdminUsers();
    });
  }

  const trackingSearch = document.getElementById('adminTrackingSearchInput');
  if (trackingSearch) {
    trackingSearch.addEventListener('input', (e) => {
      adminTrackingSearchTerm = e.target.value;
      renderAdminStatusTracking();
    });
  }
});

// Expose globally
window.updateAdminMetrics = updateAdminMetrics;
window.renderAdminDashboard = renderAdminDashboard;
window.renderAdminAudit = renderAdminAudit;
window.deleteAdminAuditLog = deleteAdminAuditLog;
window.renderAdminReports = renderAdminReports;
window.renderAdminUsers = renderAdminUsers;
window.renderAdminView = renderAdminView;
window.exportAdminExcel = exportAdminExcel;
window.printAdminReport = printAdminReport;
window.viewAdminTicketDetail = viewAdminTicketDetail;
window.openAdminUserModal = openAdminUserModal;
window.closeAdminUserModal = closeAdminUserModal;
window.saveAdminUserAccess = saveAdminUserAccess;
window.toggleUserAccess = toggleUserAccess;
window.deleteAdminUser = deleteAdminUser;
window.renderAdminStatusTracking = renderAdminStatusTracking;
window.filterAdminStatusTracking = filterAdminStatusTracking;
