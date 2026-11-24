
function autoCancelTicketsForRevokedUser(user) {
  if (!user) return;
  let tickets = (typeof window.loadTickets === 'function' ? window.loadTickets() : window.ticketsList) || [];
  let canceledCount = 0;
  const userNip = user.nip;
  const userName = user.name;
  const userKujangId = user.kujangId;

  tickets.forEach(t => {
    const tNip = t.applicantNip || t.karyawanNip || (t.pemohon && t.pemohon.nip) || t.nip;
    const tName = t.applicantName || (t.pemohon && t.pemohon.nama) || t.nama;
    const isMatch = (tNip && userNip && tNip === userNip) ||
      (tName && userName && tName.toLowerCase() === userName.toLowerCase()) ||
      (t.kujangId && userKujangId && t.kujangId === userKujangId);

    const isFinished = (t.status === 'Selesai' || t.status === 'Dibatalkan' || t.status === 'Ditolak');
    if (isMatch && !isFinished) {
      t.status = 'Dibatalkan';
      t.cancellationReason = `Pengajuan dibatalkan otomatis oleh sistem karena hak akses pemohon (${userName}) telah dicabut oleh Administrator.`;
      if (!t.timeline) t.timeline = [];
      const cancelEntry = {
        event: 'Pengajuan Dibatalkan oleh Sistem',
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        by: 'Sistem Keamanan PT Pupuk Kujang',
        desc: `Hak akses akun pemohon (${userName}) dicabut oleh Administrator.`
      };
      t.timeline.unshift(cancelEntry);
      if (!t.logs) t.logs = [];
      t.logs.push(cancelEntry);
      canceledCount++;
    }
  });

  if (canceledCount > 0) {
    window.ticketsList = tickets;
    if (typeof window.saveTickets === 'function') window.saveTickets(tickets);
    if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
    if (typeof window.renderApproverView === 'function') window.renderApproverView();
    if (typeof window.renderSecurityView === 'function') window.renderSecurityView();
    if (typeof window.renderAdminView === 'function') window.renderAdminView();
  }
}
window.autoCancelTicketsForRevokedUser = autoCancelTicketsForRevokedUser;

/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Module: Administrator Pengamanan & K3 (Supervisor & Auditor Pusat)
 * BRD Clauses: FR-ADM-01 s/d FR-ADM-06, UC-19 s/d UC-24, BRULE-09 & BRULE-13
 * Clean, Minimal, Anti-Clutter Design System
 */

let adminAuditSearchTerm = '';
let adminAuditEventFilter = 'all';
let adminAuditPeriodFilter = 'all';

let adminReportDateFilter = 'all';
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
    <div class="report-scan-time" style="color: var(--text-primary); font-weight: 600;">${timeOnly}</div>
    ${gateName && gateName !== '-' ? `<div class="report-scan-gate" style="color: var(--text-secondary); font-size: 0.725rem; margin-top: 1px;">${gateName}</div>` : ''}
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
function cleanStatusBadge(status, ticket) {
  if (typeof status === 'object' && status !== null) {
    ticket = status;
    status = ticket.status;
  }
  if (typeof window.getCleanEmpStatus === 'function') {
    return window.getCleanEmpStatus(status, ticket);
  }
  let color = '#059669';
  if (status === 'Sedang di Luar') color = '#0284c7';
  else if (status === 'Terlambat') color = '#dc2626';
  else if (status === 'Kedaluwarsa' || status === 'Kadaluwarsa') color = '#64748b';
  else if (status === 'Disetujui') color = '#059669';
  else if (status === 'Menunggu Persetujuan') color = '#d97706';
  else if (status === 'Ditolak') color = '#dc2626';
  else if (status === 'Dibatalkan') color = '#64748b';
  else if (status === 'Selesai (Terlambat)') color = '#b45309';
  return `<span style="font-weight: 700; font-size: 0.8125rem; color: ${color}; letter-spacing: -0.01em;">${status || 'Selesai'}</span>`;
}

/**
 * Returns clean category tags (Dinas vs Pribadi) - Clean typography without box
 */
function cleanCategoryBadge(category) {
  const isDinas = category === 'Dinas Kantor';
  const label = isDinas ? 'Dinas Kantor' : 'Urusan Pribadi';
  const color = isDinas ? '#059669' : '#d97706';
  return `<span style="font-weight: 600; font-size: 0.75rem; color: ${color};">${label}</span>`;
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
    let viewedAuditTickets = [];
    try {
      viewedAuditTickets = JSON.parse(localStorage.getItem('KUJANG_VIEWED_AUDIT_TICKETS') || '[]');
    } catch (e) { viewedAuditTickets = []; }

    // Hitung tiket aktif di audit trail yang belum dilihat detail pengajuannya
    const auditTicketsWithLogs = tickets.filter(t => !t.deletedFromAudit && ((t.timeline && t.timeline.length > 0) || (t.activityLog && t.activityLog.length > 0) || t.status));
    const unreadAuditCount = auditTicketsWithLogs.filter(t => !viewedAuditTickets.includes(t.id)).length;

    sidebarAdminAuditBadge.textContent = unreadAuditCount;
    sidebarAdminAuditBadge.style.display = unreadAuditCount > 0 ? 'inline-block' : 'none';
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

// Helper Geser Tabel Muster Roll & Aktivitas Terkini
window.scrollMusterRollTable = function (distance) {
  const wrap = document.getElementById('adminTableMusterRollWrap');
  if (wrap) {
    wrap.scrollBy({ left: distance, behavior: 'smooth' });
  }
};

function initMusterRollDragScroll() {
  const slider = document.getElementById('adminTableMusterRollWrap');
  if (slider && typeof window.enableDragScroll === 'function') {
    window.enableDragScroll(slider);
  }
}

function renderAdminDashboard() {
  setTimeout(initMusterRollDragScroll, 50);
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
              <div style="font-weight: 600; font-size: 0.825rem; color: var(--text-primary); max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(ticket.destination || '').replace(/"/g, '&quot;')}">${(ticket.destination || '-').replace(/\r?\n+/g, ' ')}</div>
              <div style="font-size: 0.725rem; color: var(--text-secondary); max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${(ticket.reason || '').replace(/"/g, '&quot;')}">${(ticket.reason || '-').replace(/\r?\n+/g, ' ')}</div>
            </td>
            <td>
              ${cleanScanDisplay(ticket.scanOutTime, ticket.gateOut)}
            </td>
            <td>
              ${cleanEstimatedReturnDisplay(ticket.estimatedReturn, ticket.type)}
            </td>
            <td>
              ${cleanStatusBadge(ticket.status, ticket)}
            </td>
            <td style="text-align: right;">
              <button type="button" class="btn-card-detail" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; min-height: 32px;" onclick="window.viewAdminTicketDetail('${ticket.id}')" title="Audit Detail Tiket">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                <span>Detail</span>
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

  // Render Charts for Admin (Revisi 2: Komposisi Status Izin chart retired)
  if (typeof window.renderAdminTrafficChart === 'function') {
    window.renderAdminTrafficChart();
  }
  if (typeof window.renderAdminDeptChart === 'function') {
    window.renderAdminDeptChart();
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
      const eventName = String((log && (log.event || log.action || log.status || log.title)) || 'Aktivitas');
      allEvents.push({
        ticketId: ticket.id,
        applicantName: ticket.applicantName,
        category: ticket.category,
        event: eventName,
        time: (log && (log.time || log.timestamp)) || '',
        by: (log && (log.by || log.actor)) || 'Sistem',
        desc: (log && (log.desc || log.note)) || ''
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
    const evtName = String(evt.event || '');
    if (evtName.includes('Disetujui')) pillClass = 'event-approve';
    else if (evtName.includes('Ditolak')) pillClass = 'event-reject';
    else if (evtName.includes('Scan Out')) pillClass = 'event-out';
    else if (evtName.includes('Tap In') || evtName.includes('Selesai')) pillClass = 'event-in';
    else if (evtName.includes('Terlambat')) pillClass = 'event-overdue';
    else if (evtName.includes('Kedaluwarsa') || evtName.includes('Kadaluwarsa')) pillClass = 'event-expire';

    return `
      <div style="padding: 0.65rem 0; border-bottom: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 3px;">
          <span class="audit-pill ${pillClass}">${evtName}</span>
          <span style="font-size: 0.725rem; color: var(--text-muted); font-family: var(--font-mono);">${evt.time}</span>
        </div>
        <div style="font-size: 0.825rem; font-weight: 600; color: var(--text-primary);">
          ${evt.applicantName || 'Karyawan'} <span style="font-weight: 400; color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.75rem;">(${evt.ticketId})</span>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 1px;">
          ${evt.by}: ${evt.desc}
        </div>
      </div>
    `;
  }).join('');

  if (typeof window.initAllTableDragScroll === 'function') {
    setTimeout(window.initAllTableDragScroll, 20);
  }
}

// ==========================================
// 3. AUDIT TRAIL & INVESTIGATION (FR-ADM-04, UC-21, BRULE-13)
// ==========================================
function formatAuditDateTime(tStr) {
  if (!tStr) return { date: '-', time: '-' };
  const raw = tStr.trim();

  // If format is like "19 Okt 2026, 09.20 WIB" or "19 Okt 2026, 10.05 WIB (Pos 1 Gerbang Utama)"
  if (raw.includes(',')) {
    const parts = raw.split(',');
    const datePart = parts[0].trim();
    let timePart = parts.slice(1).join(',').trim();
    timePart = timePart.replace(/(\d{1,2})\.(\d{2})/, '$1:$2');
    return { date: datePart, time: timePart };
  }

  // If ISO string like "2026-10-19T10:00"
  if (raw.includes('T')) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const datePart = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      const timePart = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WIB`;
      return { date: datePart, time: timePart };
    }
  }

  const words = raw.split(/\s+/);
  if (words.length >= 4) {
    const datePart = words.slice(0, 3).join(' ');
    const timePart = words.slice(3).join(' ');
    return { date: datePart, time: timePart };
  }

  return { date: raw, time: '' };
}

function renderAdminAudit() {
  const tickets = window.ticketsList || [];
  const tbody = document.getElementById('adminAuditTableBody');
  const countBadge = document.getElementById('adminAuditFilterCount');
  if (!tbody) return;

  const parseLogTime = (tStr) => {
    if (!tStr) return 0;
    const clean = tStr.replace(' WIB', '').replace(/\(.*?\)/g, '').trim();
    const months = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'Mei': '05', 'Jun': '06',
      'Jul': '07', 'Agu': '08', 'Sep': '09', 'Okt': '10', 'Nov': '11', 'Des': '12'
    };
    const m = clean.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}),?\s+(\d{1,2})[:.](\d{2})/);
    if (m) {
      const day = m[1].padStart(2, '0');
      const mon = months[m[2]] || '01';
      const yr = m[3];
      const hr = m[4].padStart(2, '0');
      const min = m[5];
      const iso = `${yr}-${mon}-${day}T${hr}:${min}:00`;
      const parsed = new Date(iso);
      if (!isNaN(parsed.getTime())) return parsed.getTime();
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  // Group by employee so each employee occupies only ONE real-time row
  const employeeMap = new Map();

  tickets.forEach(ticket => {
    if (ticket.deletedFromAudit) return;
    const empKey = (ticket.applicantNip || ticket.applicantName || 'karyawan').trim().toLowerCase();
    const logs = ticket.activityLog || ticket.timeline || [];

    let latestLog = null;
    if (logs.length > 0) {
      latestLog = logs.reduce((latest, current) => {
        return parseLogTime(current.time) >= parseLogTime(latest.time) ? current : latest;
      }, logs[0]);
    } else {
      latestLog = {
        event: ticket.status || 'Diajukan',
        time: ticket.createdAt || ticket.plannedExit || '',
        by: ticket.applicantName || 'Pemohon',
        desc: ticket.reason || 'Pengajuan izin keluar'
      };
    }

    const candidate = {
      ticketId: ticket.id,
      ticket: ticket,
      applicantName: ticket.applicantName || 'Karyawan',
      applicantNip: ticket.applicantNip || '-',
      department: ticket.department || 'Departemen Rekayasa & Pemeliharaan',
      category: ticket.category || 'Dinas Kantor',
      event: latestLog.event,
      time: latestLog.time,
      by: latestLog.by,
      desc: latestLog.desc,
      rawLog: latestLog
    };

    if (!employeeMap.has(empKey)) {
      employeeMap.set(empKey, candidate);
    } else {
      const existing = employeeMap.get(empKey);
      if (parseLogTime(candidate.time) >= parseLogTime(existing.time)) {
        employeeMap.set(empKey, candidate);
      }
    }
  });

  const allLogs = Array.from(employeeMap.values());

  const sortAuditEl = document.getElementById('sortAdminAudit');
  const sortAuditOrder = sortAuditEl ? sortAuditEl.value : 'desc';

  allLogs.sort((a, b) => {
    const tA = parseLogTime(a.time);
    const tB = parseLogTime(b.time);
    return sortAuditOrder === 'asc' ? tA - tB : tB - tA;
  });

  // Filter
  const filtered = allLogs.filter(item => {
    const matcher = typeof window.matchSearchTokens === 'function' ? window.matchSearchTokens : (typeof matchSearchTokens === 'function' ? matchSearchTokens : null);
    const matchesSearch = !adminAuditSearchTerm || (matcher
      ? matcher(adminAuditSearchTerm, item.ticketId, item.applicantName, item.applicantNip, item.by, item.desc, item.event)
      : (item.ticketId.toLowerCase().includes(adminAuditSearchTerm.toLowerCase()) ||
        item.applicantName.toLowerCase().includes(adminAuditSearchTerm.toLowerCase()) ||
        item.applicantNip.toLowerCase().includes(adminAuditSearchTerm.toLowerCase()) ||
        item.by.toLowerCase().includes(adminAuditSearchTerm.toLowerCase()) ||
        item.desc.toLowerCase().includes(adminAuditSearchTerm.toLowerCase())));

    let matchesEvent = true;
    if (adminAuditEventFilter !== 'all') {
      matchesEvent = item.event.toLowerCase().includes(adminAuditEventFilter.toLowerCase());
    }

    let matchesPeriod = true;
    if (adminAuditPeriodFilter !== 'all') {
      const auditObj = { plannedExit: item.time, createdAt: item.time, id: item.ticketId };
      matchesPeriod = typeof window.matchesPeriodFilter === 'function' ? window.matchesPeriodFilter(auditObj, adminAuditPeriodFilter) : true;
    }

    return matchesSearch && matchesEvent && matchesPeriod;
  });

  if (countBadge) {
    countBadge.textContent = `${filtered.length} riwayat karyawan`;
  }

  const figmaAdminAuditPagination = document.getElementById('figmaAdminAuditPagination');
  if (filtered.length === 0) {
    if (figmaAdminAuditPagination) figmaAdminAuditPagination.style.display = 'none';
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

  // Pagination Audit Trail (6 per halaman)
  const pageSize = 6;
  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  let currentPage = window.adminAuditCurrentPage || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  window.adminAuditCurrentPage = currentPage;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  const paginatedAudit = filtered.slice(startIndex, endIndex);

  const figmaAdminAuditMeta = document.getElementById('figmaAdminAuditMeta');
  const figmaAdminAuditBtns = document.getElementById('figmaAdminAuditBtns');

  if (figmaAdminAuditPagination) {
    figmaAdminAuditPagination.style.display = totalCount > 0 ? 'flex' : 'none';
    if (figmaAdminAuditMeta) {
      figmaAdminAuditMeta.textContent = `Menampilkan ${startIndex + 1} - ${endIndex} dari total ${totalCount} aktivitas`;
    }
    if (figmaAdminAuditBtns && typeof window.renderGenericPaginationButtons === 'function') {
      window.renderGenericPaginationButtons(figmaAdminAuditBtns, totalPages, currentPage, (newPage) => {
        window.adminAuditCurrentPage = newPage;
        renderAdminAudit();
      });
    }
  }

  tbody.innerHTML = paginatedAudit.map(log => {
    let pillClass = '';
    if (log.event.includes('Disetujui')) pillClass = 'event-approve';
    else if (log.event.includes('Ditolak')) pillClass = 'event-reject';
    else if (log.event.includes('Scan Out')) pillClass = 'event-out';
    else if (log.event.includes('Tap In')) pillClass = 'event-in';
    else if (log.event.includes('Terlambat')) pillClass = 'event-overdue';
    else if (log.event.includes('Kedaluwarsa')) pillClass = 'event-expire';

    const dt = formatAuditDateTime(log.time);

    // Hitung berapa kali karyawan ini mengajukan izin pada hari ini (bukan total riwayat seumur hidup)
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayYMD = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`; // "20261027"
    const todayDash = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`; // "2026-10-27"
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const todayIndo = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`.toLowerCase();
    const todayIndoPad = `${pad(now.getDate())} ${months[now.getMonth()]} ${now.getFullYear()}`.toLowerCase();

    const isTodayTicket = (t) => {
      if (!t) return false;
      if (t.id && t.id.includes(todayYMD)) return true;
      if (t.createdAt) {
        const c = String(t.createdAt).toLowerCase();
        if (c.includes(todayDash) || c.includes(todayIndo) || c.includes(todayIndoPad)) return true;
      }
      if (t.plannedExit) {
        const p = String(t.plannedExit).toLowerCase();
        if (p.includes(todayDash) || p.includes(todayIndo) || p.includes(todayIndoPad)) return true;
      }
      if (dt && dt.date && dt.date !== '-') {
        const rowDateClean = dt.date.toLowerCase();
        if (t.createdAt && String(t.createdAt).toLowerCase().includes(rowDateClean)) return true;
        if (t.plannedExit && String(t.plannedExit).toLowerCase().includes(rowDateClean)) return true;
      }
      return false;
    };

    const applicantTicketsToday = (window.ticketsList || []).filter(t =>
      ((log.applicantNip && t.applicantNip === log.applicantNip) ||
        (log.applicantName && t.applicantName === log.applicantName)) &&
      isTodayTicket(t)
    );
    const submissionCount = applicantTicketsToday.length > 0 ? applicantTicketsToday.length : 1;

    return `
      <tr>
        <td style="white-space: nowrap;">
          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.8rem; line-height: 1.35;">
            ${dt.date}
          </div>
          <div style="font-size: 0.735rem; font-family: var(--font-mono); color: var(--text-secondary); line-height: 1.35; margin-top: 2px;">
            ${dt.time}
          </div>
        </td>
        <td style="white-space: nowrap;">
          <a href="javascript:void(0)" onclick="window.viewAdminTicketDetail('${log.ticketId}')" class="report-ticket-id" style="color: var(--primary-accent); text-decoration: none;">
            ${log.ticketId}
          </a>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
            <span class="report-emp-name">${log.applicantName}</span>
            <span class="audit-freq-chip" title="Karyawan ini telah mengajukan izin sebanyak ${submissionCount} kali hari ini">
              ${submissionCount}x Pengajuan
            </span>
          </div>
          <div class="report-emp-nip" style="margin-top: 2px;">NIP: ${log.applicantNip}</div>
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
        <td style="text-align: center; vertical-align: middle; white-space: nowrap;">
          <div style="display: flex; justify-content: center; align-items: center;">
            <button type="button" class="btn-action-more-dots" onclick="event.stopPropagation(); window.toggleRowActionDropdown(this, 'admin-audit', '${log.ticketId}', true, '${encodeURIComponent(log.time)}', '${encodeURIComponent(log.event)}')" title="Opsi Tindakan #${log.ticketId}" aria-label="Opsi Tindakan">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2"></circle>
                <circle cx="12" cy="12" r="2"></circle>
                <circle cx="12" cy="19" r="2"></circle>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (typeof window.initAllTableDragScroll === 'function') {
    setTimeout(window.initAllTableDragScroll, 20);
  }
}

// DELETE FEATURE FOR AUDIT TRAIL LOG (REQUIREMENT 7)
function deleteAdminAuditLog(ticketId, encodedTime, encodedEvent) {
  const time = decodeURIComponent(encodedTime);
  const event = decodeURIComponent(encodedEvent);

  const executeDelete = () => {
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
  };

  if (typeof window.openDeleteConfirmModal === 'function') {
    window.openDeleteConfirmModal({
      title: 'Hapus Catatan Audit',
      message: `Apakah Anda yakin ingin menghapus catatan audit [${event}] untuk tiket #${ticketId} pada ${time}? Tindakan ini memerlukan otorisasi administrator.`,
      confirmText: 'Hapus',
      onConfirm: executeDelete
    });
  } else if (confirm(`Apakah Anda yakin ingin menghapus catatan audit [${event}] untuk tiket #${ticketId} pada ${time}? Tindakan ini memerlukan otorisasi administrator.`)) {
    executeDelete();
  }
}

function deleteAllAdminAudit() {
  const tickets = window.ticketsList || [];
  const activeTickets = tickets.filter(t => !t.deletedFromAudit);

  if (activeTickets.length === 0) {
    if (typeof window.showToast === 'function') {
      window.showToast('Tidak ada log investigasi audit untuk dihapus.', 'warning');
    }
    return;
  }

  const count = activeTickets.length;
  const handler = () => {
    let ticketsList = window.ticketsList || [];
    let deletedCount = 0;
    ticketsList.forEach(t => {
      if (!t.deletedFromAudit) {
        t.deletedFromAudit = true;
        t.activityLog = [];
        t.timeline = [];
        deletedCount++;
      }
    });

    window.saveTickets(ticketsList);
    renderAdminAudit();
    if (typeof renderAdminRecentFeed === 'function') renderAdminRecentFeed();

    if (typeof window.showToast === 'function') {
      window.showToast(`Seluruh catatan log investigasi audit (${deletedCount} data) berhasil dihapus.`, 'success');
    }
  };

  if (typeof window.openDeleteConfirmModal === 'function') {
    window.openDeleteConfirmModal({
      title: 'Hapus Semua Log Audit Trail',
      message: `Apakah Anda yakin ingin menghapus <strong>seluruh (${count})</strong> catatan audit trail & log investigasi? Tindakan ini memerlukan otorisasi administrator dan tidak dapat dibatalkan.`,
      confirmText: 'Hapus Semua',
      forceModal: true,
      onConfirm: handler
    });
  } else if (confirm(`Apakah Anda yakin ingin menghapus seluruh (${count}) catatan audit trail & log investigasi? Tindakan ini tidak dapat dibatalkan.`)) {
    handler();
  }
}

function markAuditDetailAsViewed(ticketId) {
  if (!ticketId) return;
  try {
    let viewed = JSON.parse(localStorage.getItem('KUJANG_VIEWED_AUDIT_TICKETS') || '[]');
    if (!viewed.includes(ticketId)) {
      viewed.push(ticketId);
      localStorage.setItem('KUJANG_VIEWED_AUDIT_TICKETS', JSON.stringify(viewed));
    }
  } catch (e) {}
  if (typeof updateAdminStats === 'function') {
    updateAdminStats();
  }
}
window.markAuditDetailAsViewed = markAuditDetailAsViewed;

// ==========================================
// 4. REPORTS & EXPORT EXCEL / PRINT PDF (FR-ADM-03, UC-22, UC-23)
// ==========================================
function filterAdminReportTickets() {
  const tickets = window.ticketsList || [];
  const statusEl = document.getElementById('adminReportStatusFilter');
  const catEl = document.getElementById('adminReportCategoryFilter');
  const dateEl = document.getElementById('adminReportDateFilter');
  const sortEl = document.getElementById('sortAdminReport');

  const activeStatus = (statusEl && statusEl.value) ? statusEl.value : adminReportStatusFilter;
  const activeCat = (catEl && catEl.value) ? catEl.value : adminReportCategoryFilter;
  const activeDate = (dateEl && dateEl.value) ? dateEl.value : adminReportDateFilter;
  const sortOrder = (sortEl && sortEl.value) ? sortEl.value : 'desc';

  // DAFTAR STATUS AKHIR / FINAL (Sesuai Aturan Sistem: Menolak status berjalan dalam kolom Status Akhir)
  const FINAL_STATUSES = ['Selesai', 'Selesai (Terlambat)', 'Kedaluwarsa', 'Kadaluwarsa', 'Dibatalkan', 'Ditolak'];
  const isFinalTicket = (t) => {
    if (!t || !t.status) return false;
    return FINAL_STATUSES.includes(t.status) || (typeof t.status === 'string' && t.status.startsWith('Selesai'));
  };

  let list = tickets.filter(ticket => {
    // 0. Filter Status Akhir: Wajib tiket yang sudah selesai/final, bukan yang masih berjalan/proses
    if (!isFinalTicket(ticket)) return false;

    // 1. Status Filter
    if (activeStatus !== 'all') {
      const isLateDone = ticket.status === 'Selesai (Terlambat)' || (ticket.status === 'Selesai' && (ticket.isLate || (ticket.scanInTime && ticket.scanInTime.includes('[Terlambat]')) || ticket.lateMinutes > 0));
      if (activeStatus === 'Selesai') {
        if (ticket.status !== 'Selesai' || isLateDone) return false;
      } else if (activeStatus === 'Selesai (Terlambat)') {
        if (!isLateDone) return false;
      } else if (activeStatus === 'Kedaluwarsa') {
        if (ticket.status !== 'Kedaluwarsa' && ticket.status !== 'Kadaluwarsa') return false;
      } else if (activeStatus === 'Dibatalkan') {
        if (ticket.status !== 'Dibatalkan') return false;
      } else if (activeStatus === 'Ditolak') {
        if (ticket.status !== 'Ditolak') return false;
      } else if (ticket.status !== activeStatus) {
        return false;
      }
    }

    // 2. Category Filter
    if (activeCat !== 'all') {
      if (activeCat === 'Dinas Kantor') {
        if (ticket.category !== 'Dinas Kantor') return false;
      } else if (activeCat === 'Keperluan Pribadi' || activeCat === 'Urusan Pribadi') {
        if (ticket.category !== 'Keperluan Pribadi' && ticket.category !== 'Urusan Pribadi') return false;
      } else if (ticket.category !== activeCat) {
        return false;
      }
    }

    // 3. Date / Period Filter
    if (activeDate !== 'all' && typeof window.matchesPeriodFilter === 'function') {
      if (!window.matchesPeriodFilter(ticket, activeDate)) return false;
    }

    return true;
  });

  // 4. Sorting
  list = [...list];
  list.sort((a, b) => {
    const parseTime = (t) => {
      const raw = t.approvedAt || t.rejectedAt || t.createdAt || t.plannedExit || 0;
      const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
      return (d && !isNaN(d.getTime())) ? d.getTime() : 0;
    };
    const tA = parseTime(a);
    const tB = parseTime(b);
    return sortOrder === 'asc' ? tA - tB : tB - tA;
  });

  return list;
}
window.setAdminReportFilters = (status, cat, date) => {
  if (status !== undefined) adminReportStatusFilter = status;
  if (cat !== undefined) adminReportCategoryFilter = cat;
  if (date !== undefined) adminReportDateFilter = date;
};
window.filterAdminReportTickets = filterAdminReportTickets;

function renderAdminReports(isPrinting = false) {
  const tbody = document.getElementById('adminReportTableBody');
  const countEl = document.getElementById('adminReportRowCount');
  if (!tbody) return;

  // Filter tickets
  const filtered = filterAdminReportTickets();

  if (countEl) {
    countEl.textContent = `${filtered.length} Data Tiket Perizinan`;
  }

  const figmaAdminReportPagination = document.getElementById('figmaAdminReportPagination');

  if (filtered.length === 0) {
    if (figmaAdminReportPagination) figmaAdminReportPagination.style.display = 'none';
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

  // Pagination Rekapitulasi Data (6 per halaman, kecuali saat print resmi)
  const pageSize = 6;
  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  let currentPage = window.adminReportCurrentPage || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  window.adminReportCurrentPage = currentPage;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  const paginatedReports = (isPrinting || window._isPrintingAdminReport) ? filtered : filtered.slice(startIndex, endIndex);

  const figmaAdminReportMeta = document.getElementById('figmaAdminReportMeta');
  const figmaAdminReportBtns = document.getElementById('figmaAdminReportBtns');

  if (figmaAdminReportPagination) {
    figmaAdminReportPagination.style.display = totalCount > 0 ? 'flex' : 'none';
    if (figmaAdminReportMeta) {
      figmaAdminReportMeta.textContent = `Menampilkan ${startIndex + 1} - ${endIndex} dari total ${totalCount} perizinan`;
    }
    if (figmaAdminReportBtns && typeof window.renderGenericPaginationButtons === 'function') {
      window.renderGenericPaginationButtons(figmaAdminReportBtns, totalPages, currentPage, (newPage) => {
        window.adminReportCurrentPage = newPage;
        renderAdminReports();
      });
    }
  }

  tbody.innerHTML = paginatedReports.map(t => {
    const isEmergency = Boolean(t.isEmergency || (t.id && t.id.startsWith('TK-EMG')) || (t.category && t.category.toLowerCase().includes('darurat')));
    const isGroupDinas = Boolean((t.isGroupDinas || (Array.isArray(t.members) && t.members.length > 0)) && (t.category === 'Dinas Kantor' || t.category === 'Dinas Perusahaan'));
    return `
      <tr>
        <td style="vertical-align: middle;">
          <div class="report-ticket-id" style="font-weight: 700; font-family: var(--font-mono); color: var(--text-primary); font-size: 0.8rem; white-space: nowrap;">${t.id}</div>
          ${(isEmergency || isGroupDinas) ? `
            <div style="display: flex; align-items: center; gap: 4px; margin-top: 3px; flex-wrap: wrap;">
              ${isEmergency ? `<span style="font-size: 0.68rem; font-weight: 800; color: #be123c; background: #ffe4e6; padding: 1px 6px; border-radius: 4px; border: 1px solid #fecdd3; letter-spacing: 0.2px; white-space: nowrap;">🚨 Darurat</span>` : ''}
              ${isGroupDinas ? (() => {
                const groupCount = (t.initiatorCancelled ? 0 : 1) + (Array.isArray(t.members) ? t.members.filter(m => m.status !== 'batal').length : (t.memberCount || 2));
                return `<span style="font-size: 0.68rem; font-weight: 800; color: #0284c7; background: #e0f2fe; padding: 1px 6px; border-radius: 4px; border: 1px solid #bae6fd; letter-spacing: 0.2px; white-space: nowrap;" title="Tim Dinas (${groupCount} Orang)">👥 Tim (${groupCount})</span>`;
              })() : ''}
            </div>
          ` : ''}
        </td>
        <td style="vertical-align: middle;">
          <div class="user-info-flex-cell" style="display: flex !important; flex-direction: row !important; align-items: center !important; gap: 0.65rem;">
            ${window.renderUserPhoto(t.applicantName, 30, 'flex-shrink: 0 !important; margin-right: 0 !important;')}
            <div>
              <div class="report-emp-name">${t.applicantName}</div>
              <div class="report-emp-nip">NIP: ${t.applicantNip}</div>
            </div>
          </div>
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
          ${cleanStatusBadge(t.status, t)}
        </td>
      </tr>
    `;
  }).join('');

  if (typeof window.initAllTableDragScroll === 'function') {
    setTimeout(window.initAllTableDragScroll, 20);
  }
}

// Clean Export to CSV / Excel
function exportAdminExcel() {
  const tickets = (typeof filterAdminReportTickets === 'function')
    ? filterAdminReportTickets()
    : (window.ticketsList || []);
  if (tickets.length === 0) {
    if (typeof window.showToast === 'function') window.showToast('Tidak ada data tiket sesuai filter untuk diexport', 'warning');
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
    'Tap In (Waktu)', 'Tap In (Gerbang)',
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

    // Clean Tap In string
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

    let finalStatus = t.status || '-';
    if (t.status === 'Selesai' && (t.isLate || (t.scanInTime && t.scanInTime.includes('[Terlambat]')) || (t.lateMinutes > 0))) {
      finalStatus = `Selesai (Terlambat)`;
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
      `"${finalStatus}"`,
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
  setTimeout(() => {
    try { URL.revokeObjectURL(url); } catch (e) { }
  }, 1000);

  if (typeof window.showToast === 'function') {
    window.showToast(`Berhasil mengunduh rekap ${tickets.length} perizinan ke Excel (.csv)`, 'success');
  }
}

function printAdminReport() {
  if (typeof window.openExportPdfModal === 'function') {
    window.openExportPdfModal('admin');
    return;
  }
  const printTitle = document.getElementById('adminPrintTimestamp');
  if (printTitle) {
    const now = new Date();
    const adminActor = (window.ACTORS && window.ACTORS.admin) ? window.ACTORS.admin : { name: 'Administrator', department: 'Departemen Pengamanan & K3' };
    printTitle.textContent = `Dicetak pada: ${now.toLocaleDateString('id-ID', { dateStyle: 'full' })} pukul ${now.toLocaleTimeString('id-ID')} WIB oleh ${adminActor.name} (${adminActor.department})`;
  }
  window._isPrintingAdminReport = true;
  renderAdminReports(true);
  window.print();
  window._isPrintingAdminReport = false;
  setTimeout(() => {
    renderAdminReports(false);
  }, 1000);
}

// ==========================================

// ==========================================
// 4C. SEARCHABLE COMBOBOX ATASAN LANGSUNG KARYAWAN (IDENTIK DENGAN BUAT PENGAJUAN & IZIN DARURAT)
// ==========================================
const AVAILABLE_SUPERVISORS = [
  {
    name: 'Dr. Ahmad Subagja, M.M.',
    nip: 'PK-2012-0543',
    title: 'Atasan 1 (Manager)',
    department: 'Departemen Produksi Amonia-1A',
    roleLabel: 'Atasan 1 (Manager)',
    isDirectSupervisor: false,
    avatarBg: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)'
  },
  {
    name: 'Dewi Sartika, S.T., M.M.',
    nip: 'PK-2012-0845',
    title: 'Atasan 2 (Supervisor / Plt)',
    department: 'Departemen Rekayasa & Pemeliharaan',
    roleLabel: 'Atasan 2 (Supervisor / Plt)',
    isDirectSupervisor: false,
    avatarBg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
  },
  {
    name: 'Bambang Sutrisno, S.T.',
    nip: 'PK-2010-0012',
    title: 'Manager K3 & Keselamatan Kerja',
    department: 'Departemen Pengamanan & K3',
    roleLabel: 'Manajer K3',
    isDirectSupervisor: false,
    avatarBg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
  }
];

function getAdminAvailableSupervisors() {
  if (typeof window.getActiveApprovers === 'function') {
    const apps = window.getActiveApprovers();
    if (apps && apps.length > 0) return apps;
  }
  let deletedList = [];
  try {
    deletedList = JSON.parse(localStorage.getItem('KUJANG_DELETED_USERS') || '[]');
  } catch (e) { }
  const delNips = new Set(deletedList.map(d => (d.nip || '').trim().toLowerCase()));
  const delNames = new Set(deletedList.map(d => (d.name || '').trim().toLowerCase()));

  const seen = new Set();
  return AVAILABLE_SUPERVISORS.filter(s => {
    const n = (s.nip || '').trim().toLowerCase();
    const nm = (s.name || '').trim().toLowerCase();
    if (delNips.has(n) || delNames.has(nm)) return false;
    if (seen.has(n || nm)) return false;
    seen.add(n || nm);
    return true;
  });
}

function initAdminSupervisorSearchableDropdown() {
  const searchInput = document.getElementById('adminInputSupervisorSearch');
  const clearBtn = document.getElementById('btnAdminSupervisorClear');
  const toggleBtn = document.getElementById('btnToggleAdminSupervisorList');
  const dropdown = document.getElementById('adminSupervisorFloatingDropdown');
  const wrapper = document.getElementById('adminSupervisorComboboxWrapper');
  if (!searchInput || !dropdown) return;

  if (searchInput.dataset.initialized) return;
  searchInput.dataset.initialized = 'true';

  searchInput.addEventListener('focus', () => {
    openAdminSupervisorDropdown();
  });

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    const hiddenInput = document.getElementById('adminInputSupervisor');
    if (hiddenInput) hiddenInput.value = val;
    if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';
    openAdminSupervisorDropdown();
    renderAdminSupervisorDropdownItems(val);
  });

  searchInput.addEventListener('change', (e) => {
    const hiddenInput = document.getElementById('adminInputSupervisor');
    if (hiddenInput) hiddenInput.value = e.target.value;
  });

  searchInput.addEventListener('blur', (e) => {
    const hiddenInput = document.getElementById('adminInputSupervisor');
    if (hiddenInput && !hiddenInput.value && e.target.value) {
      hiddenInput.value = e.target.value;
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      searchInput.value = '';
      const hiddenInput = document.getElementById('adminInputSupervisor');
      if (hiddenInput) hiddenInput.value = '';
      clearBtn.style.display = 'none';
      searchInput.focus();
      renderAdminSupervisorDropdownItems('');
    });
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdown.style.display === 'flex') {
        closeAdminSupervisorDropdown();
      } else {
        openAdminSupervisorDropdown();
        searchInput.focus();
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (wrapper && !wrapper.contains(e.target)) {
      closeAdminSupervisorDropdown();
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAdminSupervisorDropdown();
      return;
    }

    if (dropdown.style.display !== 'flex') {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        openAdminSupervisorDropdown();
        e.preventDefault();
      }
      return;
    }

    const items = dropdown.querySelectorAll('.approver-item');
    if (items.length === 0) return;

    let focusedIdx = -1;
    items.forEach((item, idx) => {
      if (item.classList.contains('keyboard-focus')) focusedIdx = idx;
    });

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusedIdx = (focusedIdx + 1) % items.length;
      items.forEach((item, idx) => item.classList.toggle('keyboard-focus', idx === focusedIdx));
      if (items[focusedIdx]) items[focusedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusedIdx = (focusedIdx - 1 + items.length) % items.length;
      items.forEach((item, idx) => item.classList.toggle('keyboard-focus', idx === focusedIdx));
      if (items[focusedIdx]) items[focusedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIdx >= 0 && items[focusedIdx]) {
        items[focusedIdx].click();
      }
    }
  });
}

function openAdminSupervisorDropdown() {
  const dropdown = document.getElementById('adminSupervisorFloatingDropdown');
  const toggleBtn = document.getElementById('btnToggleAdminSupervisorList');
  const searchInput = document.getElementById('adminInputSupervisorSearch');
  const hiddenInput = document.getElementById('adminInputSupervisor');
  if (dropdown) {
    dropdown.style.display = 'flex';
    if (toggleBtn) toggleBtn.classList.add('open');
    const query = searchInput && hiddenInput && searchInput.value === hiddenInput.value ? '' : (searchInput ? searchInput.value : '');
    renderAdminSupervisorDropdownItems(query);
  }
}

function closeAdminSupervisorDropdown() {
  const dropdown = document.getElementById('adminSupervisorFloatingDropdown');
  const toggleBtn = document.getElementById('btnToggleAdminSupervisorList');
  if (dropdown) dropdown.style.display = 'none';
  if (toggleBtn) toggleBtn.classList.remove('open');
}

function renderAdminSupervisorDropdownItems(filterText = '') {
  const listEl = document.getElementById('adminSupervisorItemsList');
  const banner = document.getElementById('adminSupervisorBeforeSearchBanner');
  const subtitle = document.getElementById('adminSupervisorDropdownSubtitle');
  const badge = document.getElementById('adminSupervisorFoundBadge');
  const emptyState = document.getElementById('adminSupervisorEmptyState');
  const emptyTerm = document.getElementById('adminSupervisorEmptySearchTerm');
  const hiddenInput = document.getElementById('adminInputSupervisor');
  if (!listEl) return;

  const q = (filterText || '').toLowerCase().trim();
  const currentVal = hiddenInput ? hiddenInput.value : '';
  const approvers = getAdminAvailableSupervisors();

  const filtered = approvers.filter(s => {
    if (!q) return true;
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.nip && s.nip.toLowerCase().includes(q)) ||
      (s.title && s.title.toLowerCase().includes(q)) ||
      (s.department && s.department.toLowerCase().includes(q)) ||
      (s.roleLabel && s.roleLabel.toLowerCase().includes(q))
    );
  });

  if (!q) {
    if (banner) banner.style.display = 'flex';
    if (subtitle) subtitle.textContent = 'Daftar Atasan Peninjau';
    if (badge) badge.textContent = `${approvers.length} Atasan`;
  } else {
    if (banner) banner.style.display = 'none';
    if (subtitle) subtitle.textContent = 'Hasil Pencarian Atasan';
    if (badge) badge.textContent = `${filtered.length} Ditemukan`;
  }

  if (filtered.length === 0) {
    listEl.innerHTML = '';
    listEl.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex';
    if (emptyTerm) emptyTerm.textContent = filterText;
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  listEl.style.display = 'block';

  listEl.innerHTML = filtered.map(s => {
    const isSelected = currentVal === s.name;
    const initials = (typeof getApproverInitials === 'function' ? getApproverInitials(s.name) : (typeof getEmployeeInitials === 'function' ? getEmployeeInitials(s.name) : 'AT'));
    const highlightedName = (typeof highlightApproverMatch === 'function' ? highlightApproverMatch(s.name, q) : highlightAdminEmpMatch(s.name, q));
    const highlightedNip = (typeof highlightApproverMatch === 'function' ? highlightApproverMatch(s.nip, q) : highlightAdminEmpMatch(s.nip, q));
    const highlightedTitle = (typeof highlightApproverMatch === 'function' ? highlightApproverMatch(s.title || s.roleLabel || '', q) : (s.title || s.roleLabel || ''));
    const highlightedDept = (typeof highlightApproverMatch === 'function' ? highlightApproverMatch(s.department || '', q) : (s.department || ''));
    const avatarBg = s.avatarBg || 'linear-gradient(135deg, #059669 0%, #0d9488 100%)';
    const isDirect = s.isDirectSupervisor || (s.name && s.name.includes('Hendra Gunawan'));
    const directTag = isDirect ? `<span class="approver-item-tag" title="Atasan langsung divisi Anda">Atasan Langsung</span>` : '';

    return `
      <div class="approver-item ${isSelected ? 'is-selected' : ''}" onclick="window.setAdminSelectedSupervisor('${s.name.replace(/'/g, "\\'")}')">
        <div class="approver-item-avatar" style="background: ${avatarBg};">
          ${initials}
        </div>
        <div class="approver-item-info">
          <div class="approver-item-name-row">
            <span class="approver-item-name">${highlightedName}</span>
            <span class="approver-item-nip">${highlightedNip}</span>
            ${directTag}
          </div>
          <div class="approver-item-role">${highlightedTitle}</div>
          <div class="approver-item-dept">${highlightedDept}</div>
        </div>
      </div>
    `;
  }).join('');

  if (typeof window.initAllTableDragScroll === 'function') {
    setTimeout(window.initAllTableDragScroll, 20);
  }
}

function setAdminSelectedSupervisor(name) {
  const hiddenInput = document.getElementById('adminInputSupervisor');
  const searchInput = document.getElementById('adminInputSupervisorSearch');
  const clearBtn = document.getElementById('btnAdminSupervisorClear');

  const finalName = (name || '').trim();

  if (hiddenInput) hiddenInput.value = finalName;
  if (searchInput) searchInput.value = finalName;
  if (clearBtn) clearBtn.style.display = finalName ? 'flex' : 'none';

  closeAdminSupervisorDropdown();
}

window.AVAILABLE_SUPERVISORS = AVAILABLE_SUPERVISORS;
window.getAdminAvailableSupervisors = getAdminAvailableSupervisors;
window.initAdminSupervisorSearchableDropdown = initAdminSupervisorSearchableDropdown;
window.setAdminSelectedSupervisor = setAdminSelectedSupervisor;
window.openAdminSupervisorDropdown = openAdminSupervisorDropdown;
window.closeAdminSupervisorDropdown = closeAdminSupervisorDropdown;
window.renderAdminSupervisorDropdownItems = renderAdminSupervisorDropdownItems;


// ==========================================
// 4D. MASTER DIREKTORI KARYAWAN & COMBOBOX AUTO-FILL (PENCARIAN NAMA & NIP)
// ==========================================
const MASTER_EMPLOYEES = [
  {
    nip: 'PK-2024-8841',
    name: 'Budi Pratama, S.T.',
    email: 'budi.pratama@pupuk-kujang.co.id',
    department: 'Departemen Rekayasa & Pemeliharaan',
    supervisor: 'Ir. Hendra Gunawan, M.T.',
    title: 'Staf Rekayasa Mesin',
    roleKey: 'karyawan',
    roleTitle: 'Karyawan',
    jabatan: 'Staf Rekayasa & Pemeliharaan'
  },
  {
    nip: 'PK-2024-8842',
    name: 'Arthur Morgan, S.Tr.T.',
    email: 'arthur.morgan@pupuk-kujang.co.id',
    department: 'Departemen Rekayasa & Pemeliharaan',
    supervisor: 'Ir. Hendra Gunawan, M.T.',
    title: 'Staf Instrumentasi & Otomasi Pabrik',
    roleKey: 'karyawan',
    roleTitle: 'Karyawan',
    jabatan: 'Staf Rekayasa & Pemeliharaan'
  },
  {
    nip: 'PK-2022-7719',
    name: 'Siti Rahmawati, S.Tr.',
    email: 'siti.rahmawati@pupuk-kujang.co.id',
    department: 'Departemen Produksi Amonia-1A',
    supervisor: 'Dr. Ahmad Subagja, M.M.',
    title: 'Operator Lapangan Amonia-1A',
    roleKey: 'karyawan',
    roleTitle: 'Karyawan',
    jabatan: 'Staf Operasional Pabrik'
  },
  {
    nip: 'PK-2015-1002',
    name: 'Ir. Hendra Gunawan, M.T.',
    email: 'hendra.gunawan@pupuk-kujang.co.id',
    department: 'Departemen Rekayasa & Pemeliharaan',
    supervisor: '',
    title: 'Manager Rekayasa & Pemeliharaan',
    roleKey: 'approver',
    roleTitle: 'Atasan 1 (Manager)',
    jabatan: 'Manajer'
  },
  {
    nip: 'PK-2012-0845',
    name: 'Dewi Sartika, S.T., M.M.',
    email: 'dewi.sartika@pupuk-kujang.co.id',
    department: 'Departemen Rekayasa & Pemeliharaan',
    supervisor: '',
    title: 'Supervisor Operasional Lapangan (Plt. Manager)',
    roleKey: 'approver2',
    roleTitle: 'Atasan 2 (Supervisor / Plt)',
    jabatan: 'Supervisor / Plt'
  },
  {
    nip: 'SEC-2018-042',
    name: 'Sertu Agus',
    email: 'pos1.security@pupuk-kujang.co.id',
    department: 'Departemen Pengamanan & K3',
    supervisor: '',
    title: 'Petugas Pengamanan Pos 1',
    roleKey: 'security',
    roleTitle: 'Petugas Pos Jaga (Satpam)',
    jabatan: 'Komandan Regu Pos Jaga'
  },
  {
    nip: 'SEC-2019-088',
    name: 'Kopral Dani',
    email: 'pos2.security@pupuk-kujang.co.id',
    department: 'Departemen Pengamanan & K3',
    supervisor: '',
    title: 'Petugas Pengamanan Pos 2',
    roleKey: 'security',
    roleTitle: 'Petugas Pos Jaga (Satpam)',
    jabatan: 'Anggota Regu Pos Gerbang 1'
  },
  {
    nip: 'SEC-2020-105',
    name: 'Praka Ilham',
    email: 'pos3.security@pupuk-kujang.co.id',
    department: 'Departemen Pengamanan & K3',
    supervisor: '',
    title: 'Petugas Pengamanan Pos 3',
    roleKey: 'security',
    roleTitle: 'Petugas Pos Jaga (Satpam)',
    jabatan: 'Anggota Regu Pos Gerbang 1'
  },
  {
    nip: 'ADM-2016-019',
    name: 'Bambang Sutrisno, S.T.',
    email: 'bambang.sutrisno@pupuk-kujang.co.id',
    department: 'Departemen Pengamanan & K3',
    supervisor: '',
    title: 'Supervisi Pengamanan & K3',
    roleKey: 'admin',
    roleTitle: 'Administrator Pengamanan & K3',
    jabatan: 'Super Admin K3 & Keamanan'
  },
  {
    nip: 'PK-2012-0543',
    name: 'Dr. Ahmad Subagja, M.M.',
    email: 'ahmad.subagja@pupuk-kujang.co.id',
    department: 'Departemen Produksi Amonia-1A',
    supervisor: '',
    title: 'Manager Produksi Amonia-1A',
    roleKey: 'approver',
    roleTitle: 'Atasan 1 (Manager)',
    jabatan: 'Manajer Produksi Amonia-1A'
  },
  {
    nip: 'PK-2023-9102',
    name: 'Rian Hidayat, S.T.',
    email: 'rian.hidayat@pupuk-kujang.co.id',
    department: 'Departemen Riset & Pengembangan Teknologi',
    supervisor: 'Ir. Hendra Gunawan, M.T.',
    title: 'Perekayasa Proses Kimia',
    roleKey: 'karyawan',
    roleTitle: 'Karyawan',
    jabatan: 'Staf Operasional Pabrik'
  },
  {
    nip: 'PK-2021-6540',
    name: 'Nurul Aini, S.Si.',
    email: 'nurul.aini@pupuk-kujang.co.id',
    department: 'Departemen Pengendalian Mutu & Laboratorium',
    supervisor: 'Dewi Sartika, S.T., M.M.',
    title: 'Analis Mutu Produk Pupuk',
    roleKey: 'karyawan',
    roleTitle: 'Karyawan',
    jabatan: 'Staf Administrasi & K3'
  },
  {
    nip: 'PK-2024-8855',
    name: 'Dimas Prasetyo, A.Md.',
    email: 'dimas.prasetyo@pupuk-kujang.co.id',
    department: 'Departemen Pemeliharaan Listrik & Instrumen',
    supervisor: 'Ir. Hendra Gunawan, M.T.',
    title: 'Teknisi Listrik Gardu Induk',
    roleKey: 'karyawan',
    roleTitle: 'Karyawan',
    jabatan: 'Staf Rekayasa & Pemeliharaan'
  },
  {
    nip: 'PK-2020-5421',
    name: 'Farhan Alamsyah, S.T.',
    email: 'farhan.alamsyah@pupuk-kujang.co.id',
    department: 'Departemen Pabrik NPK Kujang 1B',
    supervisor: 'Ir. Hendra Gunawan, M.T.',
    title: 'Supervisor Produksi Granulasi NPK',
    roleKey: 'karyawan',
    roleTitle: 'Karyawan',
    jabatan: 'Staf Operasional Pabrik'
  },
  {
    nip: 'PK-2023-8321',
    name: 'Putri Wulandari, S.E.',
    email: 'putri.wulandari@pupuk-kujang.co.id',
    department: 'Departemen Pengadaan & Logistik Material',
    supervisor: 'Dr. Ahmad Subagja, M.M.',
    title: 'Staf Pengadaan Bahan Baku',
    roleKey: 'karyawan',
    roleTitle: 'Karyawan',
    jabatan: 'Staf Administrasi & K3'
  },
  {
    nip: 'PK-2019-4412',
    name: 'Eko Prasetyo, S.T.',
    email: 'eko.prasetyo@pupuk-kujang.co.id',
    department: 'Departemen Pabrik Urea 1A',
    supervisor: 'Ir. Hendra Gunawan, M.T.',
    title: 'Pengawas Sintesis Urea',
    roleKey: 'karyawan',
    roleTitle: 'Karyawan',
    jabatan: 'Staf Operasional Pabrik'
  },
  {
    nip: 'PK-2022-7890',
    name: 'Maya Anggraini, S.Kom.',
    email: 'maya.anggraini@pupuk-kujang.co.id',
    department: 'Departemen Teknologi Informasi & Transformasi Digital',
    supervisor: 'Bambang Sutrisno, S.T.',
    title: 'Spesialis Keamanan Siber & Jaringan',
    roleKey: 'karyawan',
    roleTitle: 'Karyawan',
    jabatan: 'Staf Rekayasa & Pemeliharaan'
  },
  {
    nip: 'PK-2021-6101',
    name: 'Fajar Nugraha, S.T.',
    email: 'fajar.nugraha@pupuk-kujang.co.id',
    department: 'Departemen Perencanaan & Pengendalian Operasi',
    supervisor: 'Dewi Sartika, S.T., M.M.',
    title: 'Staf Perencanaan Distribusi Pupuk',
    roleKey: 'karyawan',
    roleTitle: 'Karyawan',
    jabatan: 'Staf Operasional Pabrik'
  }
];

function getAdminAllEmployees() {
  const merged = [];
  const seenNip = new Set();
  const seenName = new Set();

  function addEmp(emp) {
    if (!emp) return;
    const nipKey = (emp.nip || '').trim().toLowerCase();
    const nameKey = (emp.name || '').trim().toLowerCase();
    if (nipKey && seenNip.has(nipKey)) return;
    if (nameKey && seenName.has(nameKey)) return;
    if (nipKey) seenNip.add(nipKey);
    if (nameKey) seenName.add(nameKey);
    merged.push(emp);
  }

  // Masukkan users aktif terlebih dahulu (prioritas data terkini)
  const users = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
  users.forEach(u => {
    const isKaryawanBiasa = (u.roleKey === 'karyawan' || u.roleKey === 'karyawan2') || 
      ((u.role || '').toLowerCase().includes('karyawan') && !(u.role || '').toLowerCase().includes('manager'));
    addEmp({
      nip: u.nip || '',
      name: u.name || '',
      email: u.email || '',
      department: u.department || 'Departemen Rekayasa & Pemeliharaan',
      supervisor: isKaryawanBiasa ? (u.directSupervisor || u.supervisor || '') : '',
      title: u.role || 'Karyawan',
      roleKey: u.roleKey || 'karyawan',
      roleTitle: u.role || 'Karyawan',
      jabatan: u.jabatan || u.role || 'Staf Operasional Pabrik'
    });
  });

  // Masukkan master data karyawan pelengkap
  MASTER_EMPLOYEES.forEach(m => {
    const isKaryawanBiasa = (m.roleKey === 'karyawan' || m.roleKey === 'karyawan2') ||
      ((m.title || '').toLowerCase().includes('staf') && !(m.title || '').toLowerCase().includes('manager'));
    addEmp({
      ...m,
      supervisor: isKaryawanBiasa ? (m.supervisor || '') : ''
    });
  });

  return merged;
}

function getEmployeeInitials(name) {
  if (!name) return 'PK';
  const clean = name.replace(/^(Ir\.|Dr\.|Drs\.|Dra\.|H\.|Hj\.)\s*/i, '').replace(/,\s*.*$/, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function highlightAdminEmpMatch(text, query) {
  if (!text) return "";
  if (!query) return text;
  const q = String(query).trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp("(" + escaped + ")", "gi");
  return String(text).replace(regex, "<mark class=\"approver-highlight\">$1</mark>");
}

function generateCorporateEmail(name) {
  if (!name) return 'karyawan@pupuk-kujang.co.id';
  const clean = name.toLowerCase()
    .replace(/^(ir\.|dr\.|drs\.|dra\.|h\.|hj\.)\s*/gi, '')
    .replace(/,\s*.*$/, '')
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.');
  return `${clean}@pupuk-kujang.co.id`;
}

function generateCorporateEmail(name) {
  if (!name) return 'karyawan@pupuk-kujang.co.id';
  const clean = name.toLowerCase()
    .replace(/^(ir\.|dr\.|drs\.|dra\.|h\.|hj\.)\s*/gi, '')
    .replace(/,\s*.*$/, '')
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.');
  return `${clean}@pupuk-kujang.co.id`;
}

let activeEmpSearchTarget = 'name';

function openAdminEmpDropdown(targetField = 'name') {
  activeEmpSearchTarget = targetField;
  const dd = document.getElementById('adminEmpFloatingDropdown');
  const bannerBadge = document.querySelector('#adminEmpBanner .before-search-badge span');
  const bannerDesc = document.querySelector('#adminEmpBanner .before-search-text');
  const subtitle = document.getElementById('adminEmpDropdownSubtitle');
  const targetGroup = targetField === 'nip' ? document.getElementById('adminNipGroup') : document.getElementById('adminNameGroup');

  if (dd) {
    // Pindahkan dropdown tepat di bawah group input yang sedang aktif
    if (targetGroup && dd.parentElement !== targetGroup) {
      targetGroup.appendChild(dd);
    }

    if (targetField === 'nip') {
      if (bannerBadge) bannerBadge.textContent = 'Ketik / cari NIP karyawan';
      if (bannerDesc) bannerDesc.textContent = 'Ketik angka atau format NIP karyawan untuk auto-fill data akun:';
      if (subtitle) subtitle.textContent = 'Direktori NIP Karyawan';
    } else {
      if (bannerBadge) bannerBadge.textContent = 'Ketik / cari nama karyawan';
      if (bannerDesc) bannerDesc.textContent = 'Ketik beberapa huruf nama karyawan untuk auto-fill data akun:';
      if (subtitle) subtitle.textContent = 'Direktori Karyawan Berdasarkan Nama';
    }

    dd.style.display = 'flex';
    const input = targetField === 'nip'
      ? document.getElementById('adminInputNip')
      : document.getElementById('adminInputName');
    renderAdminEmpDropdownItems(input ? input.value : '', targetField);
  }
}

function closeAdminEmpDropdown() {
  const dd = document.getElementById('adminEmpFloatingDropdown');
  if (dd) dd.style.display = 'none';
}

function renderAdminEmpDropdownItems(filterText = '', targetField = 'name') {
  const listEl = document.getElementById('adminEmpItemsList');
  const emptyEl = document.getElementById('adminEmpEmptyState');
  const emptyQueryEl = document.getElementById('adminEmpEmptyQuery');
  const badgeEl = document.getElementById('adminEmpFoundBadge');
  const emptyDescEl = document.querySelector('#adminEmpEmptyState .empty-desc');
  if (!listEl) return;

  const q = (filterText || '').trim().toLowerCase();
  const all = getAdminAllEmployees();

  // PISAHKAN PENCARIAN NAMA DAN NIP SECARA MUTLAK (Sesuai Permintaan Revisi 5)
  // Pencarian nama HANYA mencari field nama.
  // Pencarian NIP HANYA mencari field nip.
  const filtered = all.filter(emp => {
    if (!q) return true;
    if (targetField === 'nip') {
      return emp.nip && emp.nip.toLowerCase().includes(q);
    } else {
      return emp.name && emp.name.toLowerCase().includes(q);
    }
  });

  if (badgeEl) {
    badgeEl.textContent = `${filtered.length} Karyawan`;
  }

  if (filtered.length === 0) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'flex';
    if (emptyQueryEl) emptyQueryEl.textContent = filterText;
    if (emptyDescEl) {
      if (targetField === 'nip') {
        emptyDescEl.innerHTML = `Tidak ditemukan NIP karyawan dengan kata kunci "<b>${filterText}</b>". Pastikan format NIP sudah sesuai (cth: PK-2024-8841 atau SEC-).`;
      } else {
        emptyDescEl.innerHTML = `Tidak ditemukan nama karyawan dengan kata kunci "<b>${filterText}</b>". Pastikan ejaan nama sudah sesuai.`;
      }
    }
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  const avatarGradients = [
    'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
    'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)'
  ];

  listEl.innerHTML = filtered.map((emp, idx) => {
    const initials = getEmployeeInitials(emp.name);
    const grad = avatarGradients[idx % avatarGradients.length];
    // Hanya highlight kolom yang dicari
    const highlightedName = targetField === 'name' ? highlightAdminEmpMatch(emp.name, filterText) : emp.name;
    const highlightedNip = targetField === 'nip' ? highlightAdminEmpMatch(emp.nip, filterText) : emp.nip;
    const highlightedDept = emp.department;

    // Tulisan Atasan HANYA untuk Karyawan biasa, BUKAN untuk Manager / Atasan / Admin / Pos Jaga
    const isKaryawanBiasa = (emp.roleKey === 'karyawan' || emp.roleKey === 'karyawan2') || 
      ((emp.title || emp.role || '').toLowerCase().includes('staf') && 
       !(emp.title || emp.role || '').toLowerCase().includes('manager') &&
       !(emp.title || emp.role || '').toLowerCase().includes('supervisor') &&
       !(emp.title || emp.role || '').toLowerCase().includes('atasan') &&
       !(emp.title || emp.role || '').toLowerCase().includes('plt') &&
       !(emp.title || emp.role || '').toLowerCase().includes('admin') &&
       !(emp.title || emp.role || '').toLowerCase().includes('satpam') &&
       !(emp.title || emp.role || '').toLowerCase().includes('pengamanan'));

    const atasanBadge = (isKaryawanBiasa && emp.supervisor && emp.supervisor.trim() !== '' && emp.supervisor !== '-')
      ? ` • Atasan: <strong style="color: var(--corp-teal, #0f766e);">${emp.supervisor}</strong>`
      : '';

    return `
      <div class="approver-item" data-nip="${emp.nip}" onclick="window.selectAdminEmployeeByNip('${emp.nip}')">
        <div class="approver-item-avatar" style="background: ${grad};">
          ${initials}
        </div>
        <div class="approver-item-info">
          <div class="approver-item-name-row">
            <span class="approver-item-name">${highlightedName}</span>
            <span class="approver-item-nip">${highlightedNip}</span>
          </div>
          <div class="approver-item-role">${emp.title || 'Karyawan'}${atasanBadge}</div>
          <div class="approver-item-dept">${highlightedDept}</div>
        </div>
      </div>
    `;
  }).join('');

  if (typeof window.initAllTableDragScroll === 'function') {
    setTimeout(window.initAllTableDragScroll, 20);
  }
}

function showAndFocusExistingAdminUser(existingUser) {
  if (!existingUser) return;
  // 1. Reset filter peran ke 'all'
  const roleFilterEl = document.getElementById('adminUserRoleFilter');
  if (roleFilterEl) roleFilterEl.value = 'all';
  adminUserRoleFilter = 'all';

  // 2. Set input pencarian ke NIP / Nama pengguna agar langsung muncul
  const searchInputEl = document.getElementById('adminUserSearchInput');
  if (searchInputEl) {
    searchInputEl.value = existingUser.nip || existingUser.name;
    adminUserSearchTerm = existingUser.nip || existingUser.name;
  }

  // 3. Reset ke halaman 1 dan render ulang tabel
  window.adminUsersCurrentPage = 1;
  renderAdminUsers();

  // 4. Scroll ke tabel dan berikan efek highlight bercahaya pada baris akun tersebut
  setTimeout(() => {
    const tableEl = document.getElementById('adminUsersTableBody');
    if (!tableEl) return;
    const rows = tableEl.querySelectorAll('tr');
    rows.forEach(tr => {
      const text = tr.textContent.toLowerCase();
      if ((existingUser.nip && text.includes(existingUser.nip.toLowerCase())) ||
          (existingUser.kujangId && text.includes(existingUser.kujangId.toLowerCase())) ||
          (existingUser.name && text.includes(existingUser.name.toLowerCase()))) {
        tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        tr.style.transition = 'all 0.4s ease';
        tr.style.backgroundColor = '#fef3c7';
        tr.style.outline = '2px solid #f59e0b';
        tr.style.boxShadow = '0 0 14px rgba(245, 158, 11, 0.45)';
        setTimeout(() => {
          tr.style.backgroundColor = '';
          tr.style.outline = '';
          tr.style.boxShadow = '';
        }, 4000);
      }
    });
  }, 120);
}
window.showAndFocusExistingAdminUser = showAndFocusExistingAdminUser;

function selectAdminEmployee(emp) {
  if (!emp) return;
  const mode = document.getElementById('adminUserEditMode')?.value || 'add';
  const users = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];

  // PENCEGAHAN DUPLIKASI: Jika akun sudah ada, tutup form dan tampilkan pop up Akun Sudah Ada
  if (mode === 'add') {
    const existing = users.find(u =>
      (u.nip && emp.nip && u.nip.trim().toLowerCase() === emp.nip.trim().toLowerCase()) ||
      (u.name && emp.name && u.name.trim().toLowerCase() === emp.name.trim().toLowerCase())
    );
    if (existing) {
      if (typeof closeAdminEmpDropdown === 'function') closeAdminEmpDropdown();
      if (typeof closeAdminUserModal === 'function') closeAdminUserModal();
      const isRevoked = existing.status === 'Dicabut' || existing.status === 'Nonaktif';
      if (typeof window.openNoticeModal === 'function') {
        window.openNoticeModal({
          title: 'Akun Sudah Ada',
          message: `Akun dengan Nama <strong>${existing.name}</strong> (NIP: ${existing.nip}, KUJANG ID: ${existing.kujangId}) <strong>SUDAH TERDAFTAR</strong> dalam sistem dengan status <strong>${existing.status}</strong>.<br><br>Anda tidak dapat menambahkan akun yang sama kembali untuk mencegah duplikasi data.<br><br>${isRevoked ? 'Status hak akses akun ini saat ini <strong>Dicabut</strong>. Anda dapat mengaktifkannya kembali langsung melalui tombol di bawah atau mengelolanya pada tabel Direktori Pengguna.' : 'Akun ini berstatus aktif dan dapat langsung dikelola pada tabel Direktori Pengguna.'}`,
          buttonText: 'Tutup & Lihat Tabel',
          actionText: isRevoked ? 'Aktifkan Akses Sekarang' : 'Lihat Akun di Tabel',
          onAction: () => {
            if (isRevoked && typeof window.toggleUserAccess === 'function') {
              window.toggleUserAccess(existing.kujangId, true);
            }
            showAndFocusExistingAdminUser(existing);
          },
          onConfirm: () => {
            showAndFocusExistingAdminUser(existing);
          }
        });
      } else {
        alert(`[AKUN SUDAH ADA]\n\nAkun ${existing.name} (${existing.nip}) sudah terdaftar dalam sistem.`);
        showAndFocusExistingAdminUser(existing);
      }
      return;
    }
  }

  const inputNip = document.getElementById('adminInputNip');
  const inputName = document.getElementById('adminInputName');
  const inputEmail = document.getElementById('adminInputEmail');
  const btnClearNip = document.getElementById('btnClearAdminNip');
  const btnClearName = document.getElementById('btnClearAdminName');
  const autoFillBadge = document.getElementById('adminEmpAutoFillBadge');
  const autoFillText = document.getElementById('adminEmpAutoFillText');

  if (inputNip) inputNip.value = emp.nip || '';
  if (inputName) inputName.value = emp.name || '';
  if (inputEmail) inputEmail.value = emp.email || generateCorporateEmail(emp.name);

  if (btnClearNip) btnClearNip.style.display = emp.nip ? 'flex' : 'none';
  if (btnClearName) btnClearName.style.display = emp.name ? 'flex' : 'none';

  // Otomatis isi Departemen
  if (typeof setAdminSelectedDept === 'function' && emp.department) {
    setAdminSelectedDept(emp.department);
  } else {
    const dInput = document.getElementById('adminInputDept');
    if (dInput) dInput.value = emp.department;
  }

  // Otomatis isi Atasan Langsung
  if (typeof setAdminSelectedSupervisor === 'function' && emp.supervisor) {
    setAdminSelectedSupervisor(emp.supervisor);
  }

  // OTOMATIS ISI HAK AKSES & JABATAN STRUKTURAL (Sesuai Permintaan Revisi 5)
  if (typeof setAdminSelectedRole === 'function') {
    const targetRoleKey = emp.roleKey || (
      emp.nip && emp.nip.startsWith('SEC') ? 'security' :
        emp.nip && emp.nip.startsWith('ADM') ? 'admin' :
          emp.title && emp.title.includes('Manager Rekayasa') ? 'approver' :
            emp.title && emp.title.includes('Supervisor Operasional') ? 'approver2' :
              'karyawan'
    );
    const targetRoleTitle = emp.roleTitle || emp.title || 'Karyawan';
    setAdminSelectedRole(targetRoleKey, targetRoleTitle);
  }

  if (autoFillBadge && autoFillText) {
    autoFillText.textContent = `Data ${emp.name} (${emp.nip}) dan Hak Akses terisi otomatis dari direktori.`;
    autoFillBadge.style.display = 'flex';
  }

  closeAdminEmpDropdown();

  if (typeof window.showToast === 'function') {
    window.showToast(`Data ${emp.name} (${emp.nip}) dan Hak Akses berhasil dimuat otomatis.`, 'info');
  }
}

function selectAdminEmployeeByNip(nip) {
  const all = getAdminAllEmployees();
  const emp = all.find(e => e.nip === nip);
  if (emp) selectAdminEmployee(emp);
}

function checkAdminEmpBilateralMatch(field, value) {
  const val = (value || '').trim().toLowerCase();
  if (!val) return;

  const all = getAdminAllEmployees();
  let matched = null;

  if (field === 'nip') {
    matched = all.find(e => e.nip.toLowerCase() === val);
  } else if (field === 'name') {
    matched = all.find(e => e.name.toLowerCase() === val);
  }

  if (matched) {
    selectAdminEmployee(matched);
  }
}

function initAdminEmpSearchCombobox() {
  const inputNip = document.getElementById('adminInputNip');
  const inputName = document.getElementById('adminInputName');
  const btnClearNip = document.getElementById('btnClearAdminNip');
  const btnClearName = document.getElementById('btnClearAdminName');
  const dropdown = document.getElementById('adminEmpFloatingDropdown');
  if (!inputNip || !inputName) return;

  if (inputName.dataset.empComboboxInitialized) return;
  inputName.dataset.empComboboxInitialized = 'true';
  inputNip.dataset.empComboboxInitialized = 'true';

  // 1. Event listener pada input Nama
  inputName.addEventListener('focus', () => {
    openAdminEmpDropdown('name');
  });

  inputName.addEventListener('input', (e) => {
    const val = e.target.value;
    if (btnClearName) btnClearName.style.display = val ? 'flex' : 'none';
    openAdminEmpDropdown('name');
    renderAdminEmpDropdownItems(val, 'name');
    checkAdminEmpBilateralMatch('name', val);
  });

  // 2. Event listener pada input NIP
  inputNip.addEventListener('focus', () => {
    openAdminEmpDropdown('nip');
  });

  inputNip.addEventListener('input', (e) => {
    const val = e.target.value;
    if (btnClearNip) btnClearNip.style.display = val ? 'flex' : 'none';
    openAdminEmpDropdown('nip');
    renderAdminEmpDropdownItems(val, 'nip');
    checkAdminEmpBilateralMatch('nip', val);
  });

  // 3. Clear buttons
  if (btnClearName) {
    btnClearName.addEventListener('click', (e) => {
      e.stopPropagation();
      inputName.value = '';
      btnClearName.style.display = 'none';
      const badge = document.getElementById('adminEmpAutoFillBadge');
      if (badge) badge.style.display = 'none';
      inputName.focus();
      openAdminEmpDropdown('name');
      renderAdminEmpDropdownItems('', 'name');
    });
  }

  if (btnClearNip) {
    btnClearNip.addEventListener('click', (e) => {
      e.stopPropagation();
      inputNip.value = '';
      btnClearNip.style.display = 'none';
      const badge = document.getElementById('adminEmpAutoFillBadge');
      if (badge) badge.style.display = 'none';
      inputNip.focus();
      openAdminEmpDropdown('nip');
      renderAdminEmpDropdownItems('', 'nip');
    });
  }

  // 4. Keyboard Navigation (ArrowDown, ArrowUp, Enter, Escape)
  const handleKeydown = (e) => {
    if (!dropdown || dropdown.style.display === 'none') return;
    const items = dropdown.querySelectorAll('.approver-item');
    if (items.length === 0) return;

    let focusedIdx = -1;
    items.forEach((item, idx) => {
      if (item.classList.contains('keyboard-focus')) focusedIdx = idx;
    });

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusedIdx = (focusedIdx + 1) % items.length;
      items.forEach((item, idx) => item.classList.toggle('keyboard-focus', idx === focusedIdx));
      if (items[focusedIdx]) items[focusedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusedIdx = (focusedIdx - 1 + items.length) % items.length;
      items.forEach((item, idx) => item.classList.toggle('keyboard-focus', idx === focusedIdx));
      if (items[focusedIdx]) items[focusedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      if (focusedIdx >= 0 && items[focusedIdx]) {
        e.preventDefault();
        items[focusedIdx].click();
      }
    } else if (e.key === 'Escape') {
      closeAdminEmpDropdown();
    }
  };

  inputName.addEventListener('keydown', handleKeydown);
  inputNip.addEventListener('keydown', handleKeydown);

  // 5. Click outside to close
  document.addEventListener('click', (e) => {
    if (!inputName.contains(e.target) &&
      !inputNip.contains(e.target) &&
      (!dropdown || !dropdown.contains(e.target)) &&
      (!btnClearName || !btnClearName.contains(e.target)) &&
      (!btnClearNip || !btnClearNip.contains(e.target))) {
      closeAdminEmpDropdown();
    }
  });
}

window.MASTER_EMPLOYEES = MASTER_EMPLOYEES;
window.getAdminAllEmployees = getAdminAllEmployees;
window.openAdminEmpDropdown = openAdminEmpDropdown;
window.closeAdminEmpDropdown = closeAdminEmpDropdown;
window.selectAdminEmployee = selectAdminEmployee;
window.selectAdminEmployeeByNip = selectAdminEmployeeByNip;
window.initAdminEmpSearchCombobox = initAdminEmpSearchCombobox;


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

  // Kosongkan kolom pencarian dropdown saat modal dibuka (Sesuai Permintaan Revisi 4)
  const searchDeptEl = document.getElementById('adminInputDeptSearch');
  const searchSupEl = document.getElementById('adminInputSupervisorSearch');
  const clearSupEl = document.getElementById('btnAdminSupervisorClear');
  if (searchSupEl) searchSupEl.value = '';
  if (clearSupEl) clearSupEl.style.display = 'none';
  const searchRoleEl = document.getElementById('adminInputRoleSearch');
  const clearDeptEl = document.getElementById('btnAdminDeptClear');
  const clearRoleEl = document.getElementById('btnAdminRoleClear');
  if (searchDeptEl) searchDeptEl.value = '';
  if (searchRoleEl) searchRoleEl.value = '';
  if (clearDeptEl) clearDeptEl.style.display = 'none';
  if (clearRoleEl) clearRoleEl.style.display = 'none';

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

    // Kosongkan pilihan awal untuk penambahan hak akses baru
    if (typeof setAdminSelectedDept === 'function') {
      setAdminSelectedDept('');
      const indDept = document.getElementById('adminDeptSelectedText');
      if (indDept) indDept.textContent = 'Pilih Departemen / Unit Kerja';
    }
    if (typeof setAdminSelectedRole === 'function') {
      setAdminSelectedRole('', '');
      const indRole = document.getElementById('adminRoleSelectedText');
      if (indRole) indRole.textContent = 'Pilih Hak Akses & Jabatan';
    }
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

      // Set user department via searchable dropdown
      if (typeof setAdminSelectedDept === 'function') {
        setAdminSelectedDept(user.department || 'Departemen Rekayasa & Pemeliharaan');
      } else {
        const inputDept = document.getElementById('adminInputDept');
        if (inputDept) inputDept.value = user.department;
      }

      // Set user role via searchable dropdown
      if (typeof setAdminSelectedRole === 'function') {
        setAdminSelectedRole(user.roleKey, user.role);
      }
      const inputStatus = document.getElementById('adminInputStatus');
      if (inputStatus) inputStatus.value = user.status || 'Aktif';

      // Set user supervisor via searchable dropdown
      const inputSup = document.getElementById('adminInputSupervisor');
      const inputSupSearch = document.getElementById('adminInputSupervisorSearch');
      const curSup = user.directSupervisor || user.supervisor || (user.roleKey === 'karyawan2' ? 'Ir. Hendra Gunawan, M.T.' : (window.ACTORS?.karyawan?.approverName || 'Ir. Hendra Gunawan, M.T.'));
      if (inputSup) inputSup.value = curSup;
      if (inputSupSearch) inputSupSearch.value = curSup;
    }
  }

  // Ensure dropdowns are initialized and populated
  if (typeof initAdminDeptSearchableDropdown === 'function') {
    initAdminDeptSearchableDropdown();
  }
  if (typeof initAdminRoleSearchableDropdown === 'function') {
    initAdminRoleSearchableDropdown();
  }
  if (typeof initAdminSupervisorSearchableDropdown === 'function') {
    initAdminSupervisorSearchableDropdown();
  }
  if (typeof initAdminEmpSearchCombobox === 'function') {
    initAdminEmpSearchCombobox();
  }

  // Reset auto-fill status on modal open
  const autoFillBadge = document.getElementById('adminEmpAutoFillBadge');
  const btnClearNip = document.getElementById('btnClearAdminNip');
  const btnClearName = document.getElementById('btnClearAdminName');
  if (autoFillBadge) autoFillBadge.style.display = 'none';
  if (btnClearNip) btnClearNip.style.display = mode === 'add' ? 'none' : 'flex';
  if (btnClearName) btnClearName.style.display = mode === 'add' ? 'none' : 'flex';
  if (typeof closeAdminEmpDropdown === 'function') closeAdminEmpDropdown();

  // Pastikan kolom input pencarian kosong hanya saat penambahan akun baru agar placeholder terlihat
  if (mode === 'add') {
    if (searchDeptEl) searchDeptEl.value = '';
    if (searchRoleEl) searchRoleEl.value = '';
  }
  modal.classList.add('open');
}

function closeAdminUserModal() {
  const modal = document.getElementById('modalAdminUserAccess');
  if (modal) modal.classList.remove('open');
}

function saveAdminUserAccess(event) {
  if (event && typeof event.preventDefault === 'function') event.preventDefault();
  const mode = document.getElementById('adminUserEditMode').value;
  const originalId = document.getElementById('adminUserOriginalKujangId').value;

  const kujangId = document.getElementById('adminInputKujangId').value.trim();
  const nip = document.getElementById('adminInputNip').value.trim();
  const name = document.getElementById('adminInputName').value.trim();
  const email = document.getElementById('adminInputEmail').value.trim() || `${nip.toLowerCase().replace(/[^a-z0-9]/g, '')}@pupuk-kujang.co.id`;
  const deptSearchInput = document.getElementById('adminInputDeptSearch');
  const deptHiddenInput = document.getElementById('adminInputDept');
  const department = (deptHiddenInput?.value?.trim()) || (deptSearchInput?.value?.trim()) || 'Departemen Rekayasa & Pemeliharaan';
  let roleKey = document.getElementById('adminInputRoleKey').value;
  if ((kujangId === 'KJG-991025' || (name && name.toLowerCase().includes('arthur morgan'))) && roleKey === 'karyawan') { roleKey = 'karyawan2'; }
  const roleTitleInput = document.getElementById('adminInputRoleTitle')?.value || '';
  const status = document.getElementById('adminInputStatus').value;

  const supSearchInput = document.getElementById('adminInputSupervisorSearch');
  const supHiddenInput = document.getElementById('adminInputSupervisor');
  let directSupervisor = (supSearchInput?.value?.trim()) || (supHiddenInput?.value?.trim()) || 'Ir. Hendra Gunawan, M.T.';

  const availableSupervisors = typeof getAdminAvailableSupervisors === 'function' ? getAdminAvailableSupervisors() : [];
  const matchedSup = availableSupervisors.find(s => 
    s.name.toLowerCase() === directSupervisor.toLowerCase() || 
    (s.nip && s.nip.toLowerCase() === directSupervisor.toLowerCase()) ||
    s.name.toLowerCase().includes(directSupervisor.toLowerCase())
  );
  if (matchedSup) {
    directSupervisor = matchedSup.name;
  }

  if (!kujangId || !nip || !name) {
    alert('Mohon lengkapi KUJANG ID, NIP, dan Nama Pengguna.');
    return;
  }

  let users = window.MOCK_USERS || [];

  // ===================================================================
  // REVISI LOGIKA PART 1: 1 JABATAN / ROLE HANYA BISA DIAKSES 1 ORANG
  // Mencegah penimpaan akun pejabat aktif
  // ===================================================================
  if (status === 'Aktif') {
    const roleDef = AVAILABLE_ROLES_JABATAN.find(r => r.roleKey === roleKey && r.isSingleSeat);
    if (roleDef) {
      const targetId = originalId || kujangId;
      // Per aturan organisasi: Tiap departemen berhak memiliki Manajer / Supervisor sendiri.
      // Pencabutan otomatis hanya berlaku jika ada pejabat aktif di peran yang sama DALAM DEPARTEMEN YANG SAMA.
      // (Untuk role 'admin', single-seat berlaku global).
      const existingOccupant = users.find(u =>
        u.kujangId !== targetId &&
        u.status === 'Aktif' &&
        u.roleKey === roleKey &&
        (roleKey === 'admin' || (u.department && department && u.department.trim().toLowerCase() === department.trim().toLowerCase()))
      );
      if (existingOccupant) {
        // Alihkan jabatan secara otomatis dengan mencabut pejabat sebelumnya di departemen yang sama
        existingOccupant.status = 'Dicabut';
        if (typeof window.autoCancelTicketsForRevokedUser === 'function') {
          window.autoCancelTicketsForRevokedUser(existingOccupant);
        }
        if (typeof window.showToast === 'function') {
          window.showToast(`Jabatan ${roleDef.jabatan} di ${department} dialihkan ke ${name}. Hak akses ${existingOccupant.name} otomatis dicabut.`, 'info');
        }
      }
    }
  }

  let roleLabel = (roleKey === 'karyawan' || roleKey === 'karyawan2') ? 'Karyawan' : (roleTitleInput || 'Karyawan');
  if (roleKey === 'approver') roleLabel = 'Atasan 1 (Manager)';
  else if (roleKey === 'approver2') roleLabel = 'Atasan 2 (Supervisor / Plt)';
  else if (roleKey === 'security') roleLabel = 'Petugas Pos Jaga (Satpam)';
  else if (roleKey === 'admin') roleLabel = 'Administrator Pengamanan & K3';

  let idx = -1;
  if (mode === 'add') {
    // CEK AKUN SUDAH ADA (NIP / NAMA / KUJANG ID) - Cegah Duplikasi
    const cleanNip = nip.trim().toLowerCase();
    const cleanName = name.trim().toLowerCase();
    const cleanId = kujangId.trim().toLowerCase();

    const existingUser = users.find(u =>
      (u.nip && u.nip.trim().toLowerCase() === cleanNip) ||
      (u.name && u.name.trim().toLowerCase() === cleanName) ||
      (u.kujangId && u.kujangId.trim().toLowerCase() === cleanId)
    );

    if (existingUser) {
      closeAdminUserModal();
      const isRevoked = existingUser.status === 'Dicabut' || existingUser.status === 'Nonaktif';
      if (typeof window.openNoticeModal === 'function') {
        window.openNoticeModal({
          title: 'Akun Sudah Ada',
          message: `Akun dengan Nama <strong>${existingUser.name}</strong> (NIP: ${existingUser.nip}, KUJANG ID: ${existingUser.kujangId}) <strong>SUDAH TERDAFTAR</strong> dalam sistem dengan status <strong>${existingUser.status}</strong>.<br><br>Anda tidak dapat menambahkan akun yang sama kembali untuk mencegah duplikasi data.<br><br>${isRevoked ? 'Status hak akses akun ini saat ini <strong>Dicabut</strong>. Anda dapat mengaktifkannya kembali langsung melalui tombol di bawah atau mengelolanya pada tabel Direktori Pengguna.' : 'Akun ini berstatus aktif dan dapat langsung dikelola pada tabel Direktori Pengguna.'}`,
          buttonText: 'Tutup & Lihat Tabel',
          actionText: isRevoked ? 'Aktifkan Akses Sekarang' : 'Lihat Akun di Tabel',
          onAction: () => {
            if (isRevoked && typeof window.toggleUserAccess === 'function') {
              window.toggleUserAccess(existingUser.kujangId, true);
            }
            showAndFocusExistingAdminUser(existingUser);
          },
          onConfirm: () => {
            showAndFocusExistingAdminUser(existingUser);
          }
        });
      } else {
        alert(`[AKUN SUDAH ADA]\n\nAkun dengan nama ${existingUser.name} (${existingUser.nip}) sudah terdaftar dalam sistem.`);
        showAndFocusExistingAdminUser(existingUser);
      }
      return;
    }

    // Bersihkan dari KUJANG_DELETED_USERS jika sebelumnya pernah dihapus (Pemulihan resmi oleh Admin)
    try {
      let deletedList = JSON.parse(localStorage.getItem('KUJANG_DELETED_USERS') || '[]');
      deletedList = deletedList.filter(d => 
        (d.nip && d.nip.trim().toLowerCase() !== cleanNip) &&
        (d.name && d.name.trim().toLowerCase() !== cleanName) &&
        (d.kujangId && d.kujangId.trim().toLowerCase() !== cleanId)
      );
      localStorage.setItem('KUJANG_DELETED_USERS', JSON.stringify(deletedList));
      window.DELETED_USERS = deletedList;
    } catch (e) {}

    const nowIso = new Date().toISOString();
    const newUser = {
      kujangId,
      nip,
      name,
      email,
      department,
      role: roleLabel,
      roleKey,
      status,
      directSupervisor: directSupervisor,
      supervisor: directSupervisor,
      registeredAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastLogin: 'Belum pernah login'
    };
    users.unshift(newUser);
    idx = 0;
  } else {
    // Validasi saat edit: jangan sampai mengubah NIP/Nama menjadi bentrok dengan akun lain
    const cleanNip = nip.trim().toLowerCase();
    const cleanName = name.trim().toLowerCase();
    const conflictUser = users.find(u =>
      u.kujangId !== originalId &&
      ((u.nip && u.nip.trim().toLowerCase() === cleanNip) || (u.name && u.name.trim().toLowerCase() === cleanName))
    );
    if (conflictUser) {
      if (typeof window.openNoticeModal === 'function') {
        window.openNoticeModal({
          title: 'Konflik Data Pengguna',
          message: `NIP atau Nama tersebut sudah digunakan oleh akun lain: <strong>${conflictUser.name}</strong> (${conflictUser.nip}).<br><br>Mohon gunakan NIP atau Nama yang valid.`,
          buttonText: 'Mengerti'
        });
      } else {
        alert(`NIP atau Nama tersebut sudah digunakan oleh akun ${conflictUser.name}.`);
      }
      return;
    }

    idx = users.findIndex(u => u.kujangId === originalId || u.kujangId === kujangId || (u.nip && u.nip === nip));
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        nip,
        name,
        email,
        department,
        role: roleLabel,
        roleKey,
        status,
        directSupervisor: directSupervisor,
        supervisor: directSupervisor,
        updatedAt: new Date().toISOString()
      };

      // Sinkronisasi atasan langsung ke state aktif karyawan
      if (users[idx].roleKey === 'karyawan' || users[idx].kujangId === 'KJG-991024' || (users[idx].name && users[idx].name.includes('Budi Pratama'))) {
        if (window.ACTORS && window.ACTORS.karyawan) {
          window.ACTORS.karyawan.approverName = directSupervisor;
          window.ACTORS.karyawan.directSupervisor = directSupervisor;
          window.ACTORS.karyawan.supervisor = directSupervisor;
        }
      } else if (users[idx].roleKey === 'karyawan2' || users[idx].kujangId === 'KJG-991025' || (users[idx].name && users[idx].name.includes('Arthur Morgan'))) {
        if (window.ACTORS && window.ACTORS.karyawan2) {
          window.ACTORS.karyawan2.approverName = directSupervisor;
          window.ACTORS.karyawan2.directSupervisor = directSupervisor;
          window.ACTORS.karyawan2.supervisor = directSupervisor;
        }
      }
      if (window.activeEmployeeUser && (window.activeEmployeeUser.nip === nip || window.activeEmployeeUser.kujangId === kujangId || window.activeEmployeeUser.name === name)) {
        window.activeEmployeeUser.directSupervisor = directSupervisor;
        window.activeEmployeeUser.supervisor = directSupervisor;
        window.activeEmployeeUser.approverName = directSupervisor;
        window.activeEmployeeUser.department = department;
        window.activeEmployeeUser.role = roleLabel;
        window.activeEmployeeUser.roleKey = roleKey;
      }
      if (typeof MASTER_EMPLOYEES !== 'undefined' && Array.isArray(MASTER_EMPLOYEES)) {
        const mEmp = MASTER_EMPLOYEES.find(m => m.nip === nip || m.name === name || (originalId && m.kujangId === originalId));
        if (mEmp) {
          mEmp.supervisor = directSupervisor;
          mEmp.department = department;
          mEmp.name = name;
          mEmp.nip = nip;
          mEmp.email = email;
        }
      }
      if (typeof DEFAULT_USERS !== 'undefined' && Array.isArray(DEFAULT_USERS)) {
        const defU = DEFAULT_USERS.find(d => d.kujangId === originalId || d.kujangId === kujangId || (d.nip && d.nip === nip));
        if (defU) {
          defU.nip = nip;
          defU.name = name;
          defU.email = email;
          defU.department = department;
          defU.role = roleLabel;
          defU.roleKey = roleKey;
          defU.status = status;
          defU.directSupervisor = directSupervisor;
          defU.supervisor = directSupervisor;
        }
      }
      if (typeof window !== 'undefined' && Array.isArray(window.DEFAULT_USERS)) {
        const defU = window.DEFAULT_USERS.find(d => d.kujangId === originalId || d.kujangId === kujangId || (d.nip && d.nip === nip));
        if (defU) {
          defU.nip = nip;
          defU.name = name;
          defU.email = email;
          defU.department = department;
          defU.role = roleLabel;
          defU.roleKey = roleKey;
          defU.status = status;
          defU.directSupervisor = directSupervisor;
          defU.supervisor = directSupervisor;
        }
      }
    }
  }

  if (status === 'Dicabut') {
    autoCancelTicketsForRevokedUser((idx >= 0 ? users[idx] : null) || { name, nip, kujangId });
  } else if (status === 'Aktif' && (roleKey === 'approver' || roleKey === 'approver2')) {
    const savedApproverUser = (idx >= 0 ? users[idx] : null) || { name, nip, kujangId, roleKey, department };
    reconcilePendingTicketsOnApproverReturn(savedApproverUser, users);
  }
  if (typeof window.saveUsers === 'function') {
    window.saveUsers(users);
  } else {
    window.MOCK_USERS = users;
  }

  closeAdminUserModal();
  renderAdminUsers();
  if (typeof window.syncActorsFromUsers === 'function') {
    window.syncActorsFromUsers(users);
  }
  if (typeof window.syncApproversToForms === 'function') {
    window.syncApproversToForms();
  }
  if (typeof window.renderKaryawanView === 'function') {
    window.renderKaryawanView();
  }

  if (typeof window.showToast === 'function') {
    window.showToast(`Hak akses untuk ${name} (${kujangId}) berhasil disimpan.`, 'success');
  }
}

// ===================================================================
// APPROVER QUEUE RECONCILIATION ON RETURN
// Mengalihkan kembali seluruh antrean tiket pending di bawah naungan atasan saat akun diaktifkan/ditambahkan kembali
// ===================================================================
function reconcilePendingTicketsOnApproverReturn(approverUser, allUsers) {
  if (!approverUser || (approverUser.roleKey !== 'approver' && approverUser.roleKey !== 'approver2')) return;
  const allTickets = (typeof window.loadTickets === 'function' ? window.loadTickets() : window.ticketsList) || [];
  const users = allUsers || (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
  let count = 0;
  const nowTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  const cleanApprName = typeof window.cleanPersonName === 'function' ? window.cleanPersonName(approverUser.name) : (approverUser.name || '').toLowerCase().trim();

  // Cari bawahan dari user ini di master data
  const subordinateNips = new Set(
    users.filter(u => {
      const uDir = typeof window.cleanPersonName === 'function' ? window.cleanPersonName(u.directSupervisor || u.supervisor || '') : (u.directSupervisor || u.supervisor || '').toLowerCase().trim();
      return (uDir && cleanApprName && uDir === cleanApprName) || (u.directSupervisorNip && approverUser.nip && u.directSupervisorNip === approverUser.nip);
    }).map(u => u.nip)
  );

  allTickets.forEach(t => {
    // Hanya tiket pending / berjalan sebelum disetujui (Menunggu Persetujuan atau Menunggu Otorisasi Darurat)
    const isPending = (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat');
    if (!isPending) return;

    const tFrom = typeof window.cleanPersonName === 'function' ? window.cleanPersonName(t.reassignedFrom || '') : (t.reassignedFrom || '').toLowerCase().trim();
    const tDir = typeof window.cleanPersonName === 'function' ? window.cleanPersonName(t.directSupervisor || '') : (t.directSupervisor || '').toLowerCase().trim();

    const isPreviouslyReassignedFromThisApprover = (
      (tFrom && cleanApprName && (tFrom === cleanApprName || tFrom.includes(cleanApprName) || cleanApprName.includes(tFrom))) ||
      (t.reassignedFromNip && approverUser.nip && t.reassignedFromNip === approverUser.nip) ||
      (t.originalApproverName && t.originalApproverName === approverUser.name)
    );
    const isDirectSubordinateTicket = (
      (tDir && cleanApprName && (tDir === cleanApprName || tDir.includes(cleanApprName) || cleanApprName.includes(tDir))) ||
      (t.directSupervisorNip && approverUser.nip && t.directSupervisorNip === approverUser.nip) ||
      (t.applicantNip && subordinateNips.has(t.applicantNip))
    );

    if (isPreviouslyReassignedFromThisApprover || isDirectSubordinateTicket) {
      const prevApprover = t.approverName;
      t.approverName = approverUser.name;
      t.approverNip = approverUser.nip;
      t.reassignedTo = approverUser.name;
      t.reassignedToNip = approverUser.nip;
      t.reassignedBackTo = approverUser.name;
      t.reassignedStatusLabel = `Dialihkan kembali ke ${approverUser.name}`;
      if (!t.timeline) t.timeline = [];
      t.timeline.unshift({
        event: `Persetujuan Dialihkan Kembali ke ${approverUser.name}`,
        time: nowTimeStr,
        by: 'Sistem Administrasi KUJANG ID',
        desc: `Akun atasan (${approverUser.name}) telah aktif kembali. Antrean persetujuan dialihkan kembali ke ${approverUser.name}${prevApprover && prevApprover !== approverUser.name ? ` dari ${prevApprover}` : ''}.`
      });
      count++;

      if (typeof window.createNotification === 'function' && approverUser.nip) {
        window.createNotification({
          recipientRole: 'approver',
          recipientNip: approverUser.nip,
          recipientName: approverUser.name,
          title: 'Antrean Dialihkan Kembali ke Anda',
          message: `Tiket ${t.id} (${t.applicantName}) dialihkan kembali ke antrean persetujuan Anda karena akun Anda telah aktif kembali.`,
          ticketId: t.id,
          priority: 'high',
          type: 'info'
        });
      }
    }
  });

  if (count > 0) {
    if (typeof window.saveTickets === 'function') {
      window.saveTickets(allTickets);
    }
    if (typeof window.renderApproverView === 'function') {
      window.renderApproverView();
    }
  }
}
window.reconcilePendingTicketsOnApproverReturn = reconcilePendingTicketsOnApproverReturn;

function toggleUserAccess(kujangId, skipConfirm = false) {
  let users = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
  const user = users.find(u => u.kujangId === kujangId);
  if (!user) return;

  if (user.roleKey === 'admin' && user.status === 'Aktif') {
    const activeAdmins = users.filter(u => u.roleKey === 'admin' && u.status === 'Aktif');
    if (activeAdmins.length <= 1) {
      if (typeof window.openNoticeModal === 'function') {
        window.openNoticeModal({
          title: 'Tindakan Ditolak',
          message: 'Tidak dapat mencabut hak akses Administrator utama satu-satunya.',
          buttonText: 'Batal'
        });
      } else {
        alert('Tidak dapat mencabut hak akses Administrator utama satu-satunya.');
      }
      return;
    }
  }

  const willRevoke = user.status === 'Aktif';
  const actionText = willRevoke ? 'mencabut hak akses' : 'mengaktifkan kembali hak akses';

  const executeToggle = () => {
    user.status = willRevoke ? 'Dicabut' : 'Aktif';
    user.updatedAt = new Date().toISOString();
    if (user.status === 'Dicabut') {
      autoCancelTicketsForRevokedUser(user);

      // Jika user yang dicabut adalah Atasan, alihkan antrean tiket persetujuan ke atasan lain
      if (user.roleKey === 'approver' || user.roleKey === 'approver2') {
        const activeApprovers = users.filter(u => (u.roleKey === 'approver' || u.roleKey === 'approver2') && u.status === 'Aktif' && u.kujangId !== user.kujangId);
        const fallbackApp = activeApprovers[0];
        if (fallbackApp) {
          const allTickets = (typeof window.loadTickets === 'function' ? window.loadTickets() : window.ticketsList) || [];
          let reassignedCount = 0;
          allTickets.forEach(t => {
            if ((t.approverName === user.name || t.approverNip === user.nip) && (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat')) {
              t.reassignedFrom = user.name;
              t.reassignedTo = fallbackApp.name;
              t.approverName = fallbackApp.name;
              t.approverNip = fallbackApp.nip;
              t.approverNote = `Hak akses "${user.name}" telah dicabut`;
              t.systemNote = `Hak akses "${user.name}" telah dicabut`;
              if (!t.timeline) t.timeline = [];
              t.timeline.unshift({
                event: 'Dialihkan Otomatis oleh Sistem',
                time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
                by: 'Sistem Administrasi KUJANG ID',
                desc: `Hak akses atasan (${user.name}) dicabut oleh Administrator. Persetujuan dialihkan ke ${fallbackApp.name}.`
              });
              reassignedCount++;
            }
          });
          if (reassignedCount > 0 && typeof window.saveTickets === 'function') {
            window.saveTickets(allTickets);
          }
        }
      }

      // Jika user yang dicabut sedang aktif di browser/tab ini, otomatis logout
      const curSession = typeof window.getKujangCurrentUser === 'function' ? window.getKujangCurrentUser() : null;
      if (curSession && (curSession.nip === user.nip || curSession.kujangId === user.kujangId || curSession.id === user.kujangId)) {
        window.setKujangCurrentUser(null);
        if (typeof window.kujangLogout === 'function') {
          window.kujangLogout();
        }
      }
    } else {
      // Jika diaktifkan kembali: periksa apakah ada pejabat lain di DEPARTEMEN YANG SAMA yang sedang aktif
      const roleDef = AVAILABLE_ROLES_JABATAN.find(r => r.roleKey === user.roleKey && r.isSingleSeat);
      if (roleDef) {
        const existingOccupant = users.find(u =>
          u.kujangId !== user.kujangId &&
          u.status === 'Aktif' &&
          u.roleKey === user.roleKey &&
          (user.roleKey === 'admin' || (u.department && user.department && u.department.trim().toLowerCase() === user.department.trim().toLowerCase()))
        );
        if (existingOccupant) {
          existingOccupant.status = 'Dicabut';
          if (typeof window.autoCancelTicketsForRevokedUser === 'function') {
            window.autoCancelTicketsForRevokedUser(existingOccupant);
          }
          if (typeof window.showToast === 'function') {
            window.showToast(`Jabatan ${roleDef.jabatan} di ${user.department} dialihkan ke ${user.name}. Hak akses ${existingOccupant.name} dicabut.`, 'info');
          }
        }
      }

      // Jika diaktifkan kembali dan merupakan Atasan: pulihkan hubungan bawahan & alihkan kembali tiket pending
      if (user.roleKey === 'approver' || user.roleKey === 'approver2') {
        users.forEach(u => {
          if ((!u.directSupervisor || !u.supervisor) && u.department && user.department && u.department.trim().toLowerCase() === user.department.trim().toLowerCase()) {
            if (u.roleKey && u.roleKey.startsWith('karyawan')) {
              u.directSupervisor = user.name;
              u.supervisor = user.name;
              u.directSupervisorNip = user.nip;
            }
          }
        });
        if (window.ACTORS) {
          if (user.roleKey === 'approver') {
            window.ACTORS.approver = {
              nip: user.nip,
              name: user.name,
              title: user.role || 'Manager',
              department: user.department,
              roleLabel: 'Atasan 1 (Manager)'
            };
          } else if (user.roleKey === 'approver2') {
            window.ACTORS.approver2 = {
              nip: user.nip,
              name: user.name,
              title: user.role || 'Supervisor / Plt',
              department: user.department,
              roleLabel: 'Atasan 2 (Supervisor / Plt)'
            };
          }
          if (window.ACTORS.karyawan && !window.ACTORS.karyawan.approverName) {
            window.ACTORS.karyawan.approverName = user.name;
          }
        }
        reconcilePendingTicketsOnApproverReturn(user, users);
      }
    }

    if (typeof window.saveUsers === 'function') {
      window.saveUsers(users);
    }

    renderAdminUsers();
    if (typeof window.syncApproversToForms === 'function') {
      window.syncApproversToForms();
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`Hak akses untuk ${user.name} berhasil ${user.status === 'Aktif' ? 'diaktifkan' : 'dicabut'}.`, user.status === 'Aktif' ? 'success' : 'warning');
    }
  };

  if (!skipConfirm && typeof window.openDeleteConfirmModal === 'function') {
    window.openDeleteConfirmModal({
      title: willRevoke ? 'Konfirmasi Cabut Hak Akses' : 'Konfirmasi Aktifkan Hak Akses',
      message: `Apakah Anda yakin ingin ${actionText} untuk akun <strong>${user.name}</strong> (${user.kujangId})?`,
      confirmText: willRevoke ? 'Cabut Akses' : 'Aktifkan',
      onConfirm: executeToggle
    });
  } else {
    executeToggle();
  }
}

function deleteAdminUser(kujangId) {
  let users = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
  const user = users.find(u => u.kujangId === kujangId);
  if (!user) return;

  if (user.roleKey === 'admin') {
    if (typeof window.openNoticeModal === 'function') {
      window.openNoticeModal({
        title: 'Tindakan Ditolak',
        message: 'Akun Administrator Pengamanan & K3 tidak dapat dihapus untuk menjamin keamanan sistem.',
        buttonText: 'Batal'
      });
    } else {
      alert('Akun Administrator Pengamanan & K3 tidak dapat dihapus untuk keamanan sistem.');
    }
    return;
  }

  const executeDelete = () => {
    // 1. Simpan riwayat KUJANG ID yang dihapus ke storage
    let deletedList = [];
    try {
      deletedList = JSON.parse(localStorage.getItem('KUJANG_DELETED_USERS') || '[]');
    } catch (e) { }
    deletedList.push({
      kujangId: user.kujangId,
      name: user.name,
      nip: user.nip,
      role: user.role || user.roleKey,
      deletedAt: new Date().toISOString()
    });
    localStorage.setItem('KUJANG_DELETED_USERS', JSON.stringify(deletedList));
    window.DELETED_USERS = deletedList;

    // 2. Jika user yang dihapus adalah atasan, hapus nama atasan dari karyawan bawahannya
    const deletedName = user.name;
    users.forEach(u => {
      if (u.directSupervisor === deletedName || u.supervisor === deletedName) {
        u.directSupervisor = '';
        u.supervisor = '';
      }
    });

    if (window.ACTORS) {
      if (window.ACTORS.karyawan && window.ACTORS.karyawan.approverName === deletedName) {
        window.ACTORS.karyawan.approverName = '';
      }
      if (window.ACTORS.karyawan2 && window.ACTORS.karyawan2.approverName === deletedName) {
        window.ACTORS.karyawan2.approverName = '';
      }
      const activeApprovers = users.filter(u => (u.roleKey === 'approver' || u.roleKey === 'approver2') && u.status === 'Aktif' && u.name !== deletedName && u.nip !== user.nip);
      const fallbackApp1 = activeApprovers.find(u => u.roleKey === 'approver') || activeApprovers[0];
      const fallbackApp2 = activeApprovers.find(u => u.roleKey === 'approver2' && u !== fallbackApp1) || activeApprovers[1] || fallbackApp1;

      if (window.ACTORS.approver && (window.ACTORS.approver.name === deletedName || window.ACTORS.approver.nip === user.nip)) {
        window.ACTORS.approver = fallbackApp1 ? {
          nip: fallbackApp1.nip,
          name: fallbackApp1.name,
          title: fallbackApp1.role || 'Manager',
          department: fallbackApp1.department || 'Departemen Rekayasa & Pemeliharaan',
          roleLabel: 'Atasan 1 (Manager)'
        } : { nip: 'PK-2015-1002', name: 'Atasan Pengganti', title: 'Manager Sementara', department: user.department || 'Departemen Rekayasa & Pemeliharaan', roleLabel: 'Atasan 1 (Manager)' };
      }
      if (window.ACTORS.approver2 && (window.ACTORS.approver2.name === deletedName || window.ACTORS.approver2.nip === user.nip)) {
        window.ACTORS.approver2 = fallbackApp2 ? {
          nip: fallbackApp2.nip,
          name: fallbackApp2.name,
          title: fallbackApp2.role || 'Supervisor / Plt',
          department: fallbackApp2.department || 'Departemen Rekayasa & Pemeliharaan',
          roleLabel: 'Atasan 2 (Supervisor / Plt)'
        } : { nip: 'PK-2012-0845', name: 'Atasan 2 Pengganti', title: 'Supervisor Sementara', department: user.department || 'Departemen Rekayasa & Pemeliharaan', roleLabel: 'Atasan 2 (Supervisor / Plt)' };
      }

      // TINGGI-05: Rekonsiliasi tiket antrean yang ditinggalkan atasan
      const allTickets = (typeof window.loadTickets === 'function' ? window.loadTickets() : window.ticketsList) || [];
      const newApproverName = fallbackApp1 ? fallbackApp1.name : (fallbackApp2 ? fallbackApp2.name : 'Atasan Pengganti');
      allTickets.forEach(t => {
        if (t.approverName === deletedName && (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat')) {
          t.reassignedFrom = deletedName;
          t.reassignedTo = newApproverName;
          t.approverName = newApproverName;
          t.approverNote = `Hak akses "${deletedName}" telah dihapus`;
          t.systemNote = `Hak akses "${deletedName}" telah dihapus`;
          if (!t.timeline) t.timeline = [];
          t.timeline.unshift({
            event: 'Dialihkan Otomatis oleh Sistem',
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
            by: 'Sistem Administrasi KUJANG ID',
            desc: `Akun atasan sebelumnya (${deletedName}) dihapus/dicabut. Persetujuan dialihkan ke ${newApproverName}.`
          });
        }
      });
      if (typeof window.saveTickets === 'function') window.saveTickets(allTickets);
    }

    // 3. Batalkan seluruh permohonan aktif pemohon jika user adalah karyawan
    autoCancelTicketsForRevokedUser(user);

    // Jika user yang dihapus sedang aktif di browser/tab ini, otomatis logout
    const curSession = typeof window.getKujangCurrentUser === 'function' ? window.getKujangCurrentUser() : null;
    if (curSession && (curSession.nip === user.nip || curSession.kujangId === user.kujangId || curSession.id === user.kujangId)) {
      window.setKujangCurrentUser(null);
      if (typeof window.kujangLogout === 'function') {
        window.kujangLogout();
      }
    }

    // 4. Hapus dari daftar users dan DEFAULT_USERS
    users = users.filter(u => u.kujangId !== kujangId && u.nip !== user.nip && u.name !== user.name);
    window.MOCK_USERS = users;

    if (Array.isArray(window.DEFAULT_USERS)) {
      window.DEFAULT_USERS = window.DEFAULT_USERS.filter(u => u.kujangId !== kujangId && u.nip !== user.nip && u.name !== user.name);
    }

    if (typeof window.saveUsers === 'function') {
      window.saveUsers(users);
    }

    // 5. Bersihkan dari quick switch storage, KUJANG_ACCOUNTS, dan cache pengguna aktif
    try {
      const savedQs = localStorage.getItem('KUJANG_QUICK_SWITCH_ACCOUNTS');
      if (savedQs) {
        const qsObj = JSON.parse(savedQs);
        ['karyawan', 'approver', 'security'].forEach(cat => {
          if (Array.isArray(qsObj[cat])) {
            qsObj[cat] = qsObj[cat].filter(a => a.nip !== user.nip && a.name !== user.name);
          }
        });
        localStorage.setItem('KUJANG_QUICK_SWITCH_ACCOUNTS', JSON.stringify(qsObj));
      }
    } catch (e) {}

    if (Array.isArray(window.KUJANG_ACCOUNTS)) {
      window.KUJANG_ACCOUNTS = window.KUJANG_ACCOUNTS.filter(a => a.nip !== user.nip && a.username !== (user.username || '').toLowerCase());
    }

    if (window.activeApproverUser && (window.activeApproverUser.nip === user.nip || window.activeApproverUser.name === user.name)) {
      window.activeApproverUser = fallbackApp1 || fallbackApp2 || null;
      if (fallbackApp1) {
        try { localStorage.setItem('KUJANG_ACTIVE_APPR_NIP', fallbackApp1.nip); } catch (e) {}
      } else {
        try { localStorage.removeItem('KUJANG_ACTIVE_APPR_NIP'); } catch (e) {}
      }
    }
    if (window.activeEmployeeUser && (window.activeEmployeeUser.nip === user.nip || window.activeEmployeeUser.name === user.name)) {
      window.activeEmployeeUser = null;
      try { localStorage.removeItem('KUJANG_ACTIVE_EMP_NIP'); } catch (e) {}
    }

    renderAdminUsers();
    if (typeof window.syncActorsFromUsers === 'function') {
      window.syncActorsFromUsers(users);
    }
    if (typeof window.syncApproversToForms === 'function') {
      window.syncApproversToForms();
    }
    if (typeof window.renderKaryawanView === 'function') {
      window.renderKaryawanView();
    }

    // Buat notifikasi audit admin
    if (typeof window.createNotification === 'function') {
      window.createNotification({
        recipientRole: 'admin',
        title: 'Hak Akses Pengguna Dihapus',
        message: `Akun ${user.name} (${user.kujangId}) telah dihapus dari sistem. Seluruh data penugasan atasan terkait otomatis dibersihkan.`,
        type: 'info',
        priority: 'normal'
      });
    }

    // Tampilkan modal pemberitahuan hak akses telah dihapus (Item 5)
    const deletedNoticeMsg = `Hak akses untuk akun <strong>${user.name}</strong> (${user.kujangId}) telah <strong>DIHAPUS</strong> dari direktori sistem PT Pupuk Kujang.<br><br>Nama atasan ini telah otomatis dibersihkan dari seluruh data karyawan bawahannya.`;
    if (typeof window.openNoticeModal === 'function') {
      window.openNoticeModal({
        title: 'Hak Akses Telah Dihapus',
        message: deletedNoticeMsg,
        buttonText: 'Batal'
      });
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`Akun ${user.name} (${kujangId}) berhasil dihapus.`, 'info');
    }
  };

  if (typeof window.openDeleteConfirmModal === 'function') {
    window.openDeleteConfirmModal({
      title: 'Hapus Hak Akses Pengguna',
      message: `Apakah Anda yakin ingin menghapus akun <strong>${user.name}</strong> (${kujangId})? Tindakan ini akan menghapus akun dan seluruh wewenang terkait secara permanen.`,
      confirmText: 'Hapus',
      onConfirm: executeDelete
    });
  } else {
    executeDelete();
  }
}
window.deleteAdminUser = deleteAdminUser;

function renderAdminUsers() {
  let users = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
  const seenNip = new Set();
  users = users.filter(u => {
    if (!u) return false;
    const k = (u.nip || '').trim().toLowerCase();
    if (k && seenNip.has(k)) return false;
    if (k) seenNip.add(k);
    return true;
  });
  const tbody = document.getElementById('adminUsersTableBody');
  const countEl = document.getElementById('adminUsersCount');
  if (!tbody) return;

  const filtered = users.filter(user => {
    if (adminUserRoleFilter !== 'all') {
      if (adminUserRoleFilter === 'approver') {
        if (user.roleKey !== 'approver' && user.roleKey !== 'approver2') return false;
      } else if (adminUserRoleFilter === 'karyawan') {
        if (user.roleKey !== 'karyawan' && user.roleKey !== 'karyawan2') return false;
      } else if (user.roleKey !== adminUserRoleFilter) {
        return false;
      }
    }
    if (adminUserSearchTerm) {
      const matcher = typeof window.matchSearchTokens === 'function' ? window.matchSearchTokens : (typeof matchSearchTokens === 'function' ? matchSearchTokens : null);
      const match = matcher
        ? matcher(adminUserSearchTerm, user.kujangId, user.nip, user.name, user.department, user.role, user.email)
        : ((user.kujangId || '').toLowerCase().includes(adminUserSearchTerm.toLowerCase()) ||
          (user.nip || '').toLowerCase().includes(adminUserSearchTerm.toLowerCase()) ||
          (user.name || '').toLowerCase().includes(adminUserSearchTerm.toLowerCase()) ||
          (user.department || '').toLowerCase().includes(adminUserSearchTerm.toLowerCase()) ||
          (user.role || '').toLowerCase().includes(adminUserSearchTerm.toLowerCase()));
      if (!match) return false;
    }
    return true;
  });

  const formatUserRegistrationDisplay = (user) => {
    const raw = user.registeredAt || user.createdAt;
    if (!raw) return '-';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const sortUsersEl = document.getElementById('sortAdminUsers');
  const sortUsersOrder = sortUsersEl ? sortUsersEl.value : 'created_desc';

  filtered.sort((a, b) => {
    if (sortUsersOrder === 'name_asc') {
      return (a.name || '').localeCompare(b.name || '');
    }

    if (sortUsersOrder === 'login_desc') {
      const parseLogin = (u) => {
        const str = u.lastLogin || '';
        if (!str || str.includes('Belum') || str.includes('Baru')) return 0;
        const now = new Date();
        const isToday = str.toLowerCase().includes('hari ini');
        const isYesterday = str.toLowerCase().includes('kemarin');
        const timeMatch = str.match(/(\d{1,2})[:.](\d{2})/);
        if (timeMatch) {
          const h = parseInt(timeMatch[1], 10);
          const m = parseInt(timeMatch[2], 10);
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
          if (isYesterday) d.setDate(d.getDate() - 1);
          return d.getTime();
        }
        const d = new Date(str);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };
      return parseLogin(b) - parseLogin(a);
    }

    if (sortUsersOrder === 'updated_desc') {
      const parseUpdate = (u) => {
        const raw = u.updatedAt || u.registeredAt || u.createdAt;
        if (!raw) return 0;
        const d = new Date(raw);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };
      return parseUpdate(b) - parseUpdate(a);
    }

    // Default: Pendaftaran Terbaru ('created_desc' / 'desc') vs Pendaftaran Terlama ('created_asc' / 'asc')
    const parseReg = (u) => {
      const raw = u.registeredAt || u.createdAt || u.updatedAt;
      if (!raw) return 0;
      const d = new Date(raw);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };
    const tA = parseReg(a);
    const tB = parseReg(b);
    if (sortUsersOrder === 'created_asc' || sortUsersOrder === 'asc') {
      return tA - tB;
    }
    return tB - tA;
  });

  if (countEl) countEl.textContent = `${filtered.length} Akun Terdaftar`;

  const figmaAdminUsersPagination = document.getElementById('figmaAdminUsersPagination');

  if (filtered.length === 0) {
    if (figmaAdminUsersPagination) figmaAdminUsersPagination.style.display = 'none';
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

  // Pagination Hak Akses KUJANG ID (10 per halaman agar lebih banyak akun terlihat langsung)
  const pageSize = 10;
  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  let currentPage = window.adminUsersCurrentPage || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  window.adminUsersCurrentPage = currentPage;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  const paginatedUsers = filtered.slice(startIndex, endIndex);

  const figmaAdminUsersMeta = document.getElementById('figmaAdminUsersMeta');
  const figmaAdminUsersBtns = document.getElementById('figmaAdminUsersBtns');

  if (figmaAdminUsersPagination) {
    figmaAdminUsersPagination.style.display = totalCount > 0 ? 'flex' : 'none';
    if (figmaAdminUsersMeta) {
      figmaAdminUsersMeta.textContent = `Menampilkan ${startIndex + 1} - ${endIndex} dari total ${totalCount} akun`;
    }
    if (figmaAdminUsersBtns && typeof window.renderGenericPaginationButtons === 'function') {
      window.renderGenericPaginationButtons(figmaAdminUsersBtns, totalPages, currentPage, (newPage) => {
        window.adminUsersCurrentPage = newPage;
        renderAdminUsers();
      });
    }
  }

  tbody.innerHTML = paginatedUsers.map(u => {
    let roleClass = 'karyawan';
    if (u.roleKey === 'approver' || u.roleKey === 'approver2') roleClass = 'approver';
    else if (u.roleKey === 'security') roleClass = 'security';
    else if (u.roleKey === 'admin') roleClass = 'admin';

    const isRevoked = u.status === 'Dicabut' || u.status === 'Nonaktif';
    const statusBadge = isRevoked
      ? `<span class="admin-user-status-pill revoked">Dicabut</span>`
      : `<span class="admin-user-status-pill active">Aktif</span>`;

    return `
      <tr>
        <td>
          <span class="kujang-id-code-badge">
            ${u.kujangId}
          </span>
        </td>
        <td>
          <div class="report-emp-name" style="max-width: 170px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${(u.name || '').replace(/"/g, '&quot;')}">${u.name}</div>
          <div class="report-emp-nip">NIP: ${u.nip}</div>
        </td>
        <td style="font-size: 0.8rem; color: var(--text-secondary); max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${(u.email || '').replace(/"/g, '&quot;')}">${u.email || '-'}</td>
        <td style="font-size: 0.825rem; color: var(--text-primary); max-width: 190px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${(u.department || '').replace(/"/g, '&quot;')}">${u.department}</td>
        <td style="white-space: nowrap;">
          <span class="user-role-badge ${roleClass}">${(roleClass === 'karyawan' || (u.role && u.role.toLowerCase().includes('karyawan')) || (u.roleKey && u.roleKey.startsWith('karyawan'))) ? 'Karyawan' : (u.role || '').replace(/\s*pemohon/gi, '')}</span>
          ${(!u.roleKey || u.roleKey.startsWith('karyawan')) ? `<div style="font-size: 0.685rem; color: var(--sky-text, #0284c7); font-weight: 600; margin-top: 4px; display: inline-flex; align-items: center; gap: 3px;"><span style="color:#64748b;">Atasan:</span> <strong style="color: var(--sky-text, #0284c7);">${u.directSupervisor || u.supervisor || (typeof window.getPrimaryApprover === 'function' ? window.getPrimaryApprover(u.name)?.name : 'Ir. Hendra Gunawan, M.T.')}</strong></div>` : ''}
        </td>
        <td style="min-width: 185px; white-space: nowrap; vertical-align: middle;">
          <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 4px;">
            ${statusBadge}
            <span style="font-size: 0.725rem; color: var(--text-secondary); white-space: nowrap;" title="Tanggal Pendaftaran Akun">
              <span style="color: #64748b; font-weight: 500;">Daftar:</span>
              <strong style="color: var(--text-primary); font-weight: 600; margin-left: 2px;">${formatUserRegistrationDisplay(u)}</strong>
            </span>
          </div>
          <div style="font-size: 0.69rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;" title="Waktu Terakhir Masuk Aplikasi">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.6; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span style="color: #94a3b8; font-weight: 500;">Login:</span>
            <span style="color: var(--text-secondary); font-weight: 500;">${u.lastLogin || 'Belum pernah'}</span>
          </div>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <div class="admin-action-btn-group">
            <button type="button" class="btn-action-sm btn-admin-edit" onclick="window.openAdminUserModal('edit', '${u.kujangId}')" title="Ubah Hak Akses / Pengajuan">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <span>Ubah</span>
            </button>
            <button type="button" class="btn-action-sm ${isRevoked ? 'btn-admin-success' : 'btn-admin-warning'}" onclick="window.toggleUserAccess('${u.kujangId}')" title="${isRevoked ? 'Aktifkan Hak Akses Pengguna' : 'Cabut Hak Akses Pengguna'}" style="${isRevoked ? 'color: #059669; border-color: #a7f3d0;' : 'color: #d97706; border-color: #fde68a;'}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="${isRevoked ? 'M7 11V7a5 5 0 0 1 9.9-1' : 'M7 11V7a5 5 0 0 1 10 0v4'}"></path></svg>
              <span>${isRevoked ? 'Beri Akses' : 'Cabut Akses'}</span>
            </button>
            <button type="button" class="btn-action-sm btn-admin-delete" onclick="window.deleteAdminUser('${u.kujangId}')" title="Hapus Hak Akses Pengguna" style="color: #dc2626; border-color: #fca5a5;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Hapus</span>
            </button>
            <button type="button" class="btn-action-sm btn-admin-switch" onclick="${isRevoked ? `window.openNoticeModal({ title: 'Hak Akses Anda Telah Dicabut', message: 'Hak akses untuk akun <strong>${u.name}</strong> (${u.role || u.roleKey}) telah <strong>DICABUT</strong> oleh Administrator.<br><br>Sesuai tata kelola keamanan PT Pupuk Kujang, Anda <strong>TIDAK DAPAT MASUK</strong> ke akun ini sebelum hak akses diaktifkan kembali di Direktori Admin.', buttonText: 'Batal' })` : `window.switchRole('${u.kujangId === 'KJG-991025' ? 'karyawan2' : u.roleKey}', '${u.kujangId}')`}" title="${isRevoked ? 'Akses dicabut' : 'Beralih ke peran ini'}" ${isRevoked ? 'style="opacity: 0.45; cursor: not-allowed;"' : ''}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 8 20 11 17 14"></polyline><line x1="20" y1="11" x2="11" y2="11"></line></svg>
              <span>Beralih</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (typeof window.initAllTableDragScroll === 'function') {
    setTimeout(window.initAllTableDragScroll, 20);
  }
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

    return `
      <button type="button" class="status-tracking-pill-btn ${isActive ? 'active' : ''}" onclick="window.filterAdminStatusTracking('${f.key}')"
        style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.75rem; border-radius: 9999px; font-size: 0.775rem; cursor: pointer; white-space: nowrap; transition: all 0.15s ease;">
        <span>${f.icon}</span>
        <span>${f.label}</span>
        <span class="status-tracking-pill-count">
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
    if (adminTrackingSearchTerm) {
      const matcher = typeof window.matchSearchTokens === 'function' ? window.matchSearchTokens : (typeof matchSearchTokens === 'function' ? matchSearchTokens : null);
      const match = matcher
        ? matcher(adminTrackingSearchTerm, t.id, t.applicantName, t.applicantNip, t.department, t.destination, t.reason, t.approverName, t.category, t.type)
        : ((t.id || '').toLowerCase().includes(adminTrackingSearchTerm.toLowerCase()) ||
          (t.applicantName || '').toLowerCase().includes(adminTrackingSearchTerm.toLowerCase()) ||
          (t.applicantNip || '').toLowerCase().includes(adminTrackingSearchTerm.toLowerCase()) ||
          (t.department || '').toLowerCase().includes(adminTrackingSearchTerm.toLowerCase()) ||
          (t.destination || '').toLowerCase().includes(adminTrackingSearchTerm.toLowerCase()) ||
          (t.reason || '').toLowerCase().includes(adminTrackingSearchTerm.toLowerCase()));
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

    const isEmergency = Boolean(t.isEmergency || (t.id && t.id.startsWith('TK-EMG')) || (t.category && t.category.toLowerCase().includes('darurat')));
    const isGroupDinas = Boolean((t.isGroupDinas || (Array.isArray(t.members) && t.members.length > 0)) && (t.category === 'Dinas Kantor' || t.category === 'Dinas Perusahaan'));
    return `
      <tr>
        <td style="vertical-align: middle;">
          <div class="report-ticket-id" style="font-weight: 700; font-family: var(--font-mono); color: var(--primary-accent); font-size: 0.8rem; white-space: nowrap;">
            <a href="javascript:void(0)" onclick="window.viewAdminTicketDetail('${t.id}')" style="text-decoration: none; font-weight: 700; color: var(--primary-accent);">
              ${t.id}
            </a>
          </div>
          ${(isEmergency || isGroupDinas) ? `
            <div style="display: flex; align-items: center; gap: 4px; margin-top: 3px; flex-wrap: wrap;">
              ${isEmergency ? `<span style="font-size: 0.68rem; font-weight: 800; color: #be123c; background: #ffe4e6; padding: 1px 6px; border-radius: 4px; border: 1px solid #fecdd3; letter-spacing: 0.2px; white-space: nowrap;">🚨 Darurat</span>` : ''}
              ${isGroupDinas ? (() => {
                const groupCount = (t.initiatorCancelled ? 0 : 1) + (Array.isArray(t.members) ? t.members.filter(m => m.status !== 'batal').length : (t.memberCount || 2));
                return `<span style="font-size: 0.68rem; font-weight: 800; color: #0284c7; background: #e0f2fe; padding: 1px 6px; border-radius: 4px; border: 1px solid #bae6fd; letter-spacing: 0.2px; white-space: nowrap;" title="Tim Dinas (${groupCount} Orang)">👥 Tim (${groupCount})</span>`;
              })() : ''}
            </div>
          ` : ''}
          <div style="margin-top: 3px;">${cleanCategoryBadge(t.category)}</div>
        </td>
        <td style="vertical-align: middle;">
          <div class="user-info-flex-cell" style="display: flex !important; flex-direction: row !important; align-items: center !important; gap: 0.65rem;">
            ${window.renderUserPhoto(t.applicantName, 30, 'flex-shrink: 0 !important; margin-right: 0 !important;')}
            <div>
              <div class="report-emp-name">${t.applicantName}</div>
              <div class="report-emp-nip">NIP: ${t.applicantNip}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="report-dept-name">${t.department}</div>
        </td>
        <td>
          <div style="font-weight: 600; font-size: 0.825rem; color: var(--text-primary); max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(t.destination || '').replace(/"/g, '&quot;')}">${(t.destination || '-').replace(/\r?\n+/g, ' ')}</div>
          <div style="font-size: 0.725rem; color: var(--text-secondary); max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${(t.reason || '').replace(/"/g, '&quot;')}">${(t.reason || '-').replace(/\r?\n+/g, ' ')}</div>
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
          <button type="button" class="btn-pill-action btn-pill-detail" onclick="window.viewAdminTicketDetail('${t.id}')" title="Audit Detail Tiket">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
            <span>Detail Pengajuan</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (typeof window.initAllTableDragScroll === 'function') {
    setTimeout(window.initAllTableDragScroll, 20);
  }
}

function viewAdminTicketDetail(ticketId) {
  if (typeof window.openTicketDetail === 'function') {
    window.openTicketDetail(ticketId, 'info');
  } else if (typeof window.showTicketDetailModal === 'function') {
    window.showTicketDetailModal(ticketId);
  }
}
window.viewAdminTicketDetail = viewAdminTicketDetail;
window.showTicketDetailModal = viewAdminTicketDetail;

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

  if (typeof window.initAllTableDragScroll === 'function') {
    setTimeout(window.initAllTableDragScroll, 30);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const auditSearch = document.getElementById('adminAuditSearchInput');
  const auditFilter = document.getElementById('adminAuditEventFilter');
  const auditPeriod = document.getElementById('adminAuditPeriodFilter');
  if (auditSearch) {
    auditSearch.addEventListener('input', (e) => {
      adminAuditSearchTerm = e.target.value;
      window.adminAuditCurrentPage = 1;
      renderAdminAudit();
    });
  }
  if (auditFilter) {
    auditFilter.addEventListener('change', (e) => {
      adminAuditEventFilter = e.target.value;
      window.adminAuditCurrentPage = 1;
      renderAdminAudit();
    });
  }
  if (auditPeriod) {
    auditPeriod.addEventListener('change', (e) => {
      adminAuditPeriodFilter = e.target.value;
      window.adminAuditCurrentPage = 1;
      renderAdminAudit();
    });
  }

  const reportDate = document.getElementById('adminReportDateFilter');
  const reportSort = document.getElementById('sortAdminReport');
  const reportStatus = document.getElementById('adminReportStatusFilter');
  const reportCategory = document.getElementById('adminReportCategoryFilter');
  const btnExportExcel = document.getElementById('btnAdminExportExcel');
  const btnPrintPdf = document.getElementById('btnAdminPrintPdf');

  if (reportDate) {
    reportDate.addEventListener('change', (e) => {
      adminReportDateFilter = e.target.value;
      window.adminReportCurrentPage = 1;
      renderAdminReports();
    });
  }
  if (reportSort) {
    reportSort.addEventListener('change', () => {
      window.adminReportCurrentPage = 1;
      renderAdminReports();
    });
  }
  if (reportStatus) {
    reportStatus.addEventListener('change', (e) => {
      adminReportStatusFilter = e.target.value;
      window.adminReportCurrentPage = 1;
      renderAdminReports();
    });
  }
  if (reportCategory) {
    reportCategory.addEventListener('change', (e) => {
      adminReportCategoryFilter = e.target.value;
      window.adminReportCurrentPage = 1;
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
      window.adminUsersCurrentPage = 1;
      renderAdminUsers();
    });
  }
  if (userRole) {
    userRole.addEventListener('change', (e) => {
      adminUserRoleFilter = e.target.value;
      window.adminUsersCurrentPage = 1;
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

// ===================================================================
// ADMIN DEPARTMENT SEARCHABLE DROPDOWN (REVISI 1)
// ===================================================================
const MASTER_DEPARTMENTS = [
  'Departemen Rekayasa & Pemeliharaan',
  'Departemen Pengamanan & K3',
  'Departemen Produksi Amonia-1A',
  'Departemen Produksi Urea-1B',
  'Departemen SDM & Organisasi',
  'Departemen Logistik & Pergudangan',
  'Departemen Keuangan & Akuntansi',
  'Biro Umum & Tata Usaha',
  'Departemen Operasi Pabrik 1 & 2',
  'Departemen SDM & Hubungan Industrial',
  'Departemen Teknologi Informasi & Digitalisasi',
  'Departemen Lingkungan & K3'
];

function getAllAvailableDepartments() {
  const set = new Set(MASTER_DEPARTMENTS);
  const users = window.MOCK_USERS || [];
  users.forEach(u => { if (u.department) set.add(u.department); });
  const tickets = window.ticketsList || [];
  tickets.forEach(t => { if (t.department) set.add(t.department); });
  return Array.from(set).sort();
}

function setAdminSelectedDept(deptName) {
  const hiddenInput = document.getElementById('adminInputDept');
  const searchInput = document.getElementById('adminInputDeptSearch');
  const indicatorText = document.getElementById('adminDeptSelectedText');
  const clearBtn = document.getElementById('btnAdminDeptClear');

  if (hiddenInput) hiddenInput.value = deptName;
  if (searchInput) searchInput.value = deptName;
  if (indicatorText) indicatorText.textContent = deptName;
  if (clearBtn) clearBtn.style.display = deptName ? 'flex' : 'none';

  renderAdminDeptDropdownItems(deptName);
  const roleSearch = document.getElementById('adminInputRoleSearch');
  renderAdminRoleDropdownItems(roleSearch ? roleSearch.value : '');
}

function renderAdminDeptDropdownItems(query = '') {
  const menu = document.getElementById('adminDeptDropdownMenu');
  if (!menu) return;

  const currentVal = (document.getElementById('adminInputDept')?.value || '').trim();
  const q = (query || '').toLowerCase().trim();
  const allDepts = getAllAvailableDepartments();

  const filtered = q
    ? allDepts.filter(d => d.toLowerCase().includes(q))
    : allDepts;

  if (filtered.length === 0) {
    menu.innerHTML = `
      <div class="searchable-dropdown-empty">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.6;">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
        <span>Departemen atau unit kerja tidak ditemukan</span>
      </div>
    `;
    return;
  }

  menu.innerHTML = filtered.map(dept => {
    const isSelected = dept === currentVal;
    let displayHtml = dept;
    if (q) {
      const idx = dept.toLowerCase().indexOf(q);
      if (idx !== -1) {
        displayHtml = dept.substring(0, idx) +
          `<strong style="color: var(--corp-teal, #059669); text-decoration: underline;">${dept.substring(idx, idx + q.length)}</strong>` +
          dept.substring(idx + q.length);
      }
    }

    return `
      <div class="searchable-dropdown-item ${isSelected ? 'selected' : ''}"
           role="option"
           aria-selected="${isSelected}"
           onclick="window.selectAdminDept('${dept.replace(/'/g, "\\'")}')">
        <span>${displayHtml}</span>
        ${isSelected ? '<span class="searchable-dropdown-item-mark">✓</span>' : ''}
      </div>
    `;
  }).join('');

  if (typeof window.initAllTableDragScroll === 'function') {
    setTimeout(window.initAllTableDragScroll, 20);
  }
}

function selectAdminDept(deptName) {
  setAdminSelectedDept(deptName);
  closeAdminDeptDropdown();
}

function openAdminDeptDropdown() {
  const dd = document.getElementById('adminDeptSearchableDropdown');
  if (dd) {
    dd.classList.add('open');
    const searchInput = document.getElementById('adminInputDeptSearch');
    renderAdminDeptDropdownItems(searchInput ? searchInput.value : '');
  }
}

function closeAdminDeptDropdown() {
  const dd = document.getElementById('adminDeptSearchableDropdown');
  if (dd) dd.classList.remove('open');
}

function initAdminDeptSearchableDropdown() {
  const searchInput = document.getElementById('adminInputDeptSearch');
  const clearBtn = document.getElementById('btnAdminDeptClear');
  const dd = document.getElementById('adminDeptSearchableDropdown');
  if (!searchInput || !dd) return;

  if (searchInput.dataset.initialized) return;
  searchInput.dataset.initialized = 'true';

  searchInput.addEventListener('focus', () => {
    openAdminDeptDropdown();
  });

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';
    openAdminDeptDropdown();
    renderAdminDeptDropdownItems(val);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      searchInput.value = '';
      clearBtn.style.display = 'none';
      searchInput.focus();
      renderAdminDeptDropdownItems('');
    });
  }

  document.addEventListener('click', (e) => {
    if (!dd.contains(e.target)) {
      closeAdminDeptDropdown();
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAdminDeptDropdown();
    } else if (e.key === 'Enter') {
      const firstItem = dd.querySelector('.searchable-dropdown-item');
      if (firstItem) {
        e.preventDefault();
        firstItem.click();
      }
    }
  });
}

// ===================================================================
// ADMIN ROLE & JABATAN SEARCHABLE DROPDOWN (REVISI 2: 1 ROLE = 1 ORANG)
// ===================================================================
const AVAILABLE_ROLES_JABATAN = [
  {
    roleKey: 'approver',
    hakAkses: 'Atasan (Approver)',
    jabatan: 'Manajer',
    fullTitle: 'Atasan 1 (Manager)',
    isSingleSeat: true,
    description: 'Persetujuan izin keluar area karyawan dan pemantauan bawahan.'
  },
  {
    roleKey: 'approver2',
    hakAkses: 'Atasan (Approver)',
    jabatan: 'Supervisor / Plt',
    fullTitle: 'Atasan 2 (Supervisor / Plt)',
    isSingleSeat: true,
    description: 'Persetujuan izin operasional / supervisi bawahan.'
  },
  {
    roleKey: 'karyawan',
    hakAkses: 'Karyawan',
    jabatan: 'Staf Rekayasa & Pemeliharaan',
    fullTitle: 'Karyawan',
    isSingleSeat: false,
    description: 'Pengajuan izin dinas kantor atau pribadi serta izin darurat K3.'
  },
  {
    roleKey: 'karyawan',
    hakAkses: 'Karyawan',
    jabatan: 'Staf Operasional Pabrik',
    fullTitle: 'Karyawan',
    isSingleSeat: false,
    description: 'Pengajuan izin operasional shift dan tugas luar area pabrik.'
  },
  {
    roleKey: 'karyawan',
    hakAkses: 'Karyawan',
    jabatan: 'Staf Administrasi & K3',
    fullTitle: 'Karyawan',
    isSingleSeat: false,
    description: 'Pengajuan izin urusan personal dan operasional kantor pusat.'
  },
  {
    roleKey: 'security',
    hakAkses: 'Petugas Pos Jaga (Satpam)',
    jabatan: 'Komandan Regu Pos Jaga',
    fullTitle: 'Petugas Pos Jaga (Satpam)',
    isSingleSeat: false,
    description: 'Verifikasi barcode QR Scan Out dan Tap In di Pos 1 Gerbang Utama.'
  },
  {
    roleKey: 'security',
    hakAkses: 'Petugas Pos Jaga (Satpam)',
    jabatan: 'Anggota Regu Pos Gerbang 1',
    fullTitle: 'Petugas Pos Jaga (Satpam)',
    isSingleSeat: false,
    description: 'Pemeriksaan tiket fisik dan pemindaian di Pos Gerbang Utama.'
  },
  {
    roleKey: 'admin',
    hakAkses: 'Administrator Pengamanan & K3',
    jabatan: 'Super Admin K3 & Keamanan',
    fullTitle: 'Administrator Pengamanan & K3',
    isSingleSeat: true,
    description: 'Pengendalian hak akses KUJANG ID, investigasi audit trail, dan rekapitulasi data.'
  }
];

function updateAdminSupervisorVisibility(roleKey) {
  const supervisorGroup = document.getElementById('adminSupervisorGroup');
  if (!supervisorGroup) return;
  const isKaryawan = (!roleKey) || roleKey === 'karyawan' || roleKey === 'karyawan2' || (typeof roleKey === 'string' && roleKey.startsWith('karyawan'));
  supervisorGroup.style.display = isKaryawan ? 'block' : 'none';
}

function setAdminSelectedRole(roleKey, jabatanOrTitle) {
  const hiddenRoleKey = document.getElementById('adminInputRoleKey');
  const hiddenRoleTitle = document.getElementById('adminInputRoleTitle');
  const searchInput = document.getElementById('adminInputRoleSearch');
  const indicatorText = document.getElementById('adminRoleSelectedText');
  const clearBtn = document.getElementById('btnAdminRoleClear');

  // Normalisasi: roleKey karyawan2 tetap dianggap karyawan dalam pilihan peran
  const normalizedKey = (roleKey === 'karyawan2' || (roleKey && roleKey.startsWith('karyawan'))) ? 'karyawan' : roleKey;

  let match = AVAILABLE_ROLES_JABATAN.find(r =>
    (r.roleKey === roleKey || r.roleKey === normalizedKey) &&
    (r.jabatan === jabatanOrTitle || r.fullTitle === jabatanOrTitle)
  );
  if (!match) {
    match = AVAILABLE_ROLES_JABATAN.find(r => r.roleKey === roleKey || r.roleKey === normalizedKey) || AVAILABLE_ROLES_JABATAN[0];
  }

  const roleKeyVal = match.roleKey;
  const roleTitleVal = match.fullTitle;
  const displayText = `${match.hakAkses} — ${match.jabatan}`;

  if (hiddenRoleKey) hiddenRoleKey.value = roleKeyVal;
  if (hiddenRoleTitle) hiddenRoleTitle.value = roleTitleVal;
  if (searchInput) searchInput.value = displayText;
  if (indicatorText) indicatorText.textContent = displayText;
  if (clearBtn) clearBtn.style.display = displayText ? 'flex' : 'none';

  updateAdminSupervisorVisibility(roleKeyVal);
  renderAdminRoleDropdownItems(searchInput ? searchInput.value : '');
}

function renderAdminRoleDropdownItems(query = '') {
  const menu = document.getElementById('adminRoleDropdownMenu');
  if (!menu) return;

  const currentRoleKey = document.getElementById('adminInputRoleKey')?.value || 'karyawan';
  const currentKujangId = document.getElementById('adminInputKujangId')?.value || '';
  const users = window.MOCK_USERS || [];
  const q = (query || '').toLowerCase().trim();

  const filtered = q
    ? AVAILABLE_ROLES_JABATAN.filter(r =>
      r.hakAkses.toLowerCase().includes(q) ||
      r.jabatan.toLowerCase().includes(q) ||
      r.fullTitle.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    )
    : AVAILABLE_ROLES_JABATAN;

  if (filtered.length === 0) {
    menu.innerHTML = `
      <div class="searchable-dropdown-empty">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.6;">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
        <span>Hak akses atau jabatan tidak ditemukan</span>
      </div>
    `;
    return;
  }

  menu.innerHTML = filtered.map(item => {
    let occupant = null;
    let isOccupiedByOther = false;
    if (item.isSingleSeat) {
      const currentDept = document.getElementById('adminInputDept')?.value || '';
      if (item.roleKey === 'admin') {
        occupant = users.find(u => u.roleKey === 'admin' && u.status === 'Aktif');
      } else {
        occupant = users.find(u =>
          u.roleKey === item.roleKey &&
          u.status === 'Aktif' &&
          (!currentDept || (u.department && u.department.trim().toLowerCase() === currentDept.trim().toLowerCase()))
        );
      }
      if (occupant && occupant.kujangId !== currentKujangId) {
        isOccupiedByOther = true;
      }
    }

    const isSelected = item.roleKey === currentRoleKey;

    let badgeHtml = '';
    if (item.isSingleSeat) {
      if (isOccupiedByOther) {
        badgeHtml = `<span class="role-seat-badge occupied">● Sedang Aktif: ${occupant.name}</span>`;
      } else {
        badgeHtml = `<span class="role-seat-badge available">✓ Tersedia</span>`;
      }
    } else {
      badgeHtml = `<span class="role-seat-badge multi">Multi-User</span>`;
    }

    return `
      <div class="searchable-dropdown-item ${isSelected ? 'selected' : ''}"
           role="option"
           style="display: flex; flex-direction: column; gap: 3px; padding: 0.6rem 0.85rem;"
           onclick="window.selectAdminRole('${item.roleKey}', '${item.jabatan.replace(/'/g, "\\'")}')">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">
            ${item.hakAkses} <span style="color: var(--text-muted); font-weight: 400;">—</span> <span style="color: var(--primary-accent);">${item.jabatan}</span>
          </div>
          ${badgeHtml}
        </div>
        <div style="font-size: 0.725rem; color: var(--text-secondary); line-height: 1.35;">
          ${item.description}
        </div>
      </div>
    `;
  }).join('');

  if (typeof window.initAllTableDragScroll === 'function') {
    setTimeout(window.initAllTableDragScroll, 20);
  }
}

function selectAdminRole(roleKey, jabatan) {
  setAdminSelectedRole(roleKey, jabatan);
  closeAdminRoleDropdown();
}

function openAdminRoleDropdown() {
  const dd = document.getElementById('adminRoleSearchableDropdown');
  if (dd) {
    dd.classList.add('open');
    const searchInput = document.getElementById('adminInputRoleSearch');
    renderAdminRoleDropdownItems(searchInput ? searchInput.value : '');
  }
}

function closeAdminRoleDropdown() {
  const dd = document.getElementById('adminRoleSearchableDropdown');
  if (dd) dd.classList.remove('open');
}

function initAdminRoleSearchableDropdown() {
  const searchInput = document.getElementById('adminInputRoleSearch');
  const clearBtn = document.getElementById('btnAdminRoleClear');
  const dd = document.getElementById('adminRoleSearchableDropdown');
  if (!searchInput || !dd) return;

  if (searchInput.dataset.initialized) return;
  searchInput.dataset.initialized = 'true';

  searchInput.addEventListener('focus', () => {
    openAdminRoleDropdown();
  });

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';
    openAdminRoleDropdown();
    renderAdminRoleDropdownItems(val);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      searchInput.value = '';
      clearBtn.style.display = 'none';
      searchInput.focus();
      renderAdminRoleDropdownItems('');
    });
  }

  document.addEventListener('click', (e) => {
    if (!dd.contains(e.target)) {
      closeAdminRoleDropdown();
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAdminRoleDropdown();
    } else if (e.key === 'Enter') {
      const firstItem = dd.querySelector('.searchable-dropdown-item');
      if (firstItem) {
        e.preventDefault();
        firstItem.click();
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAdminDeptSearchableDropdown();
  initAdminRoleSearchableDropdown();

  const sortUsers = document.getElementById('sortAdminUsers');
  if (sortUsers) {
    sortUsers.addEventListener('change', () => {
      renderAdminUsers();
    });
  }

  const sortAudit = document.getElementById('sortAdminAudit');
  if (sortAudit) {
    sortAudit.addEventListener('change', () => {
      renderAdminAudit();
    });
  }
});

// Expose globally
window.updateAdminMetrics = updateAdminMetrics;
window.renderAdminDashboard = renderAdminDashboard;
window.renderAdminAudit = renderAdminAudit;
window.deleteAdminAuditLog = deleteAdminAuditLog;
window.deleteAllAdminAudit = deleteAllAdminAudit;
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

// Searchable dropdown exposures
window.setAdminSelectedDept = setAdminSelectedDept;
window.selectAdminDept = selectAdminDept;
window.openAdminDeptDropdown = openAdminDeptDropdown;
window.closeAdminDeptDropdown = closeAdminDeptDropdown;
window.initAdminDeptSearchableDropdown = initAdminDeptSearchableDropdown;
window.getAllAvailableDepartments = getAllAvailableDepartments;
window.renderAdminDeptDropdownItems = renderAdminDeptDropdownItems;

// Searchable Role exposures
window.AVAILABLE_ROLES_JABATAN = AVAILABLE_ROLES_JABATAN;
window.setAdminSelectedRole = setAdminSelectedRole;
window.selectAdminRole = selectAdminRole;
window.openAdminRoleDropdown = openAdminRoleDropdown;
window.closeAdminRoleDropdown = closeAdminRoleDropdown;
window.initAdminRoleSearchableDropdown = initAdminRoleSearchableDropdown;
window.renderAdminRoleDropdownItems = renderAdminRoleDropdownItems;

