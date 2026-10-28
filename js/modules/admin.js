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
  else if (status === 'Kedaluwarsa') color = '#64748b';
  else if (status === 'Disetujui') color = '#059669';
  else if (status === 'Menunggu Persetujuan') color = '#d97706';
  else if (status === 'Ditolak') color = '#dc2626';
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

    return matchesSearch && matchesEvent;
  });

  if (countBadge) {
    countBadge.textContent = `${filtered.length} riwayat karyawan`;
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
        <td style="text-align: right; white-space: nowrap;">
          <div class="admin-action-btn-group">
            <button type="button" class="btn-action-sm btn-admin-detail" onclick="window.viewAdminTicketDetail('${log.ticketId}')" title="Lihat Rincian Tiket #${log.ticketId}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              <span>Detail pengajuan</span>
            </button>
            <button type="button" class="btn-action-sm btn-admin-danger" onclick="window.deleteAdminAuditLog('${log.ticketId}', '${encodeURIComponent(log.time)}', '${encodeURIComponent(log.event)}')" title="Hapus Catatan Audit Peristiwa Ini">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Hapus</span>
            </button>
          </div>
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
          ${cleanStatusBadge(t.status, t)}
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

    let finalStatus = t.status || '-';
    if (t.status === 'Selesai' && (t.isLate || (t.scanInTime && t.scanInTime.includes('[Terlambat]')) || (t.lateMinutes > 0))) {
      const lateStr = typeof window.formatLateDuration === 'function' ? window.formatLateDuration(t.lateMinutes || 10) : `${t.lateMinutes || 10} mnt`;
      finalStatus = `Selesai (Terlambat ${lateStr})`;
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

  // Kosongkan kolom pencarian dropdown saat modal dibuka (Sesuai Permintaan Revisi 4)
  const searchDeptEl = document.getElementById('adminInputDeptSearch');
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
    }
  }

  // Ensure dropdowns are initialized and populated
  if (typeof initAdminDeptSearchableDropdown === 'function') {
    initAdminDeptSearchableDropdown();
  }
  if (typeof initAdminRoleSearchableDropdown === 'function') {
    initAdminRoleSearchableDropdown();
  }

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
  if (event) event.preventDefault();
  const mode = document.getElementById('adminUserEditMode').value;
  const originalId = document.getElementById('adminUserOriginalKujangId').value;

  const kujangId = document.getElementById('adminInputKujangId').value.trim();
  const nip = document.getElementById('adminInputNip').value.trim();
  const name = document.getElementById('adminInputName').value.trim();
  const email = document.getElementById('adminInputEmail').value.trim() || `${nip.toLowerCase().replace(/[^a-z0-9]/g, '')}@pupuk-kujang.co.id`;
  const department = document.getElementById('adminInputDept').value;
  const roleKey = document.getElementById('adminInputRoleKey').value;
  const roleTitleInput = document.getElementById('adminInputRoleTitle')?.value || '';
  const status = document.getElementById('adminInputStatus').value;

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
      const existingOccupant = users.find(u => u.kujangId !== targetId && u.status === 'Aktif' && u.roleKey === roleKey);
      if (existingOccupant) {
        alert(
          `⛔ GAGAL MEMBERIKAN HAK AKSES!\n\n` +
          `Jabatan [${roleDef.hakAkses} - ${roleDef.jabatan}] saat ini sedang aktif dipegang oleh:\n` +
          `- Nama: ${existingOccupant.name}\n` +
          `- NIP: ${existingOccupant.nip}\n` +
          `- KUJANG ID: ${existingOccupant.kujangId}\n\n` +
          `Sesuai tata kelola PT Pupuk Kujang, 1 jabatan manajerial/struktural hanya dapat diakses oleh 1 orang pejabat aktif.\n` +
          `Sistem TIDAK MENGIZINKAN menimpa akun atasan aktif secara langsung.\n\n` +
          `Silakan cabut (revoke) hak akses ${existingOccupant.name} terlebih dahulu melalui direktori akun jika Anda ingin mengalihkan jabatan ini kepada ${name}.`
        );
        return;
      }
    }
  }

  let roleLabel = roleTitleInput || 'Karyawan Pemohon';
  if (roleKey === 'approver') roleLabel = 'Atasan 1 (Manager)';
  else if (roleKey === 'approver2') roleLabel = 'Atasan 2 (Supervisor / Plt)';
  else if (roleKey === 'security') roleLabel = 'Petugas Pos Jaga (Satpam)';
  else if (roleKey === 'admin') roleLabel = 'Administrator Pengamanan & K3';

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
  if (typeof window.syncApproversToForms === 'function') {
    window.syncApproversToForms();
  }

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

  // REVISI LOGIKA PART 1: Jika hendak mengaktifkan kembali hak akses ("Beri Akses"),
  // pastikan jabatan yang bersifat 1 orang (single-seat) tidak sedang dipegang pejabat lain
  if (!willRevoke) {
    const roleDef = AVAILABLE_ROLES_JABATAN.find(r => r.roleKey === user.roleKey && r.isSingleSeat);
    if (roleDef) {
      const existingOccupant = users.find(u => u.kujangId !== user.kujangId && u.status === 'Aktif' && u.roleKey === user.roleKey);
      if (existingOccupant) {
        alert(
          `⛔ TIDAK DAPAT MENGAKTIFKAN HAK AKSES!\n\n` +
          `Hak akses jabatan [${roleDef.hakAkses} - ${roleDef.jabatan}] untuk ${user.name} tidak dapat diaktifkan karena saat ini sedang aktif dipegang oleh:\n` +
          `- Nama: ${existingOccupant.name}\n` +
          `- NIP: ${existingOccupant.nip}\n` +
          `- KUJANG ID: ${existingOccupant.kujangId}\n\n` +
          `Ketentuan Sistem: 1 jabatan manajerial/struktural hanya boleh diakses oleh 1 pejabat aktif.\n` +
          `Sistem mencegah penimpaan akun atasan aktif secara otomatis.\n\n` +
          `Harap cabut hak akses ${existingOccupant.name} terlebih dahulu jika ingin mengembalikan akses jabatan ini kepada ${user.name}.`
        );
        return;
      }
    }
  }

  const actionText = willRevoke ? 'mencabut hak akses' : 'mengaktifkan kembali hak akses';
  if (!confirm(`Apakah Anda yakin ingin ${actionText} untuk akun ${user.name} (${user.kujangId})?`)) {
    return;
  }

  user.status = willRevoke ? 'Dicabut' : 'Aktif';

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
  if (typeof window.syncApproversToForms === 'function') {
    window.syncApproversToForms();
  }

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

  const sortUsersEl = document.getElementById('sortAdminUsers');
  const sortUsersOrder = sortUsersEl ? sortUsersEl.value : 'desc';
  filtered.sort((a, b) => {
    const idA = a.kujangId || '';
    const idB = b.kujangId || '';
    return sortUsersOrder === 'asc' ? idA.localeCompare(idB) : idB.localeCompare(idA);
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
          <div class="report-emp-name">${u.name}</div>
          <div class="report-emp-nip">NIP: ${u.nip}</div>
        </td>
        <td style="font-size: 0.8rem; color: var(--text-secondary);">${u.email || '-'}</td>
        <td style="font-size: 0.825rem; color: var(--text-primary);">${u.department}</td>
        <td style="white-space: nowrap;">
          <span class="user-role-badge ${roleClass}">${u.role}</span>
        </td>
        <td>
          ${statusBadge}
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">${u.lastLogin || '-'}</div>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <div class="admin-action-btn-group">
            <button type="button" class="btn-action-sm btn-admin-edit" onclick="window.openAdminUserModal('edit', '${u.kujangId}')" title="Ubah Hak Akses / Pengajuan">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <span>Ubah</span>
            </button>
            
            <button type="button" class="btn-action-sm btn-admin-switch" onclick="window.switchRole('${u.roleKey}')" title="${isRevoked ? 'Akses dicabut' : 'Beralih ke peran ini'}" ${isRevoked ? 'disabled style="opacity: 0.45; cursor: not-allowed;"' : ''}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 8 20 11 17 14"></polyline><line x1="20" y1="11" x2="11" y2="11"></line></svg>
              <span>Beralih</span>
            </button>
          </div>
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
          <button type="button" class="btn-action-sm btn-admin-detail" onclick="window.viewAdminTicketDetail('${t.id}')" title="Audit Detail Tiket">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <span>Detail pengajuan</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
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
    fullTitle: 'Karyawan Pemohon',
    isSingleSeat: false,
    description: 'Pengajuan izin dinas kantor atau pribadi serta izin darurat K3.'
  },
  {
    roleKey: 'karyawan',
    hakAkses: 'Karyawan',
    jabatan: 'Staf Operasional Pabrik',
    fullTitle: 'Karyawan Pemohon',
    isSingleSeat: false,
    description: 'Pengajuan izin operasional shift dan tugas luar area pabrik.'
  },
  {
    roleKey: 'karyawan',
    hakAkses: 'Karyawan',
    jabatan: 'Staf Administrasi & K3',
    fullTitle: 'Karyawan Pemohon',
    isSingleSeat: false,
    description: 'Pengajuan izin urusan personal dan operasional kantor pusat.'
  },
  {
    roleKey: 'security',
    hakAkses: 'Petugas Pos Jaga (Satpam)',
    jabatan: 'Komandan Regu Pos Jaga',
    fullTitle: 'Petugas Pos Jaga (Satpam)',
    isSingleSeat: false,
    description: 'Verifikasi barcode QR Scan Out dan Scan In di Pos 1 Gerbang Utama.'
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

function setAdminSelectedRole(roleKey, jabatanOrTitle) {
  const hiddenRoleKey = document.getElementById('adminInputRoleKey');
  const hiddenRoleTitle = document.getElementById('adminInputRoleTitle');
  const searchInput = document.getElementById('adminInputRoleSearch');
  const indicatorText = document.getElementById('adminRoleSelectedText');
  const clearBtn = document.getElementById('btnAdminRoleClear');

  let match = AVAILABLE_ROLES_JABATAN.find(r => r.roleKey === roleKey && (r.jabatan === jabatanOrTitle || r.fullTitle === jabatanOrTitle));
  if (!match) {
    match = AVAILABLE_ROLES_JABATAN.find(r => r.roleKey === roleKey) || AVAILABLE_ROLES_JABATAN[0];
  }

  const roleKeyVal = match.roleKey;
  const roleTitleVal = match.fullTitle;
  const displayText = `${match.hakAkses} — ${match.jabatan}`;

  if (hiddenRoleKey) hiddenRoleKey.value = roleKeyVal;
  if (hiddenRoleTitle) hiddenRoleTitle.value = roleTitleVal;
  if (searchInput) searchInput.value = displayText;
  if (indicatorText) indicatorText.textContent = displayText;
  if (clearBtn) clearBtn.style.display = displayText ? 'flex' : 'none';

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
      occupant = users.find(u => u.roleKey === item.roleKey && u.status === 'Aktif');
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

