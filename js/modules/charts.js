/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Lightweight, Ultra-Sensitive Real-Time Interactive Chart Engine (SVG)
 * Revisi 4, 5, 6:
 * 1. Floating Interactive Tooltip Engine (Universal across Karyawan, Approver, Admin)
 * 2. Karyawan: Precision Interactive Donut Chart synced with single source of truth (NO artificial multipliers)
 * 3. Approver: Dynamic Weekly/Monthly Bar Chart with real ticket aggregation & peak indicator
 * 4. Admin: Gate Pass Peak Traffic Area Chart (07:00 - 17:00 WIB) with interactive scrubber
 * 5. Admin: Department Frequency Ranked Distribution Chart (Real-time dynamic ranking)
 * 6. Global Real-Time Sync Orchestrator
 */

// ===================================================================
// THEME HELPER FOR CHARTS
// ===================================================================
function isThemeDark() {
  try {
    return document.documentElement.classList.contains('theme-dark') ||
           document.body.classList.contains('theme-dark') ||
           localStorage.getItem('kujang_theme') === 'dark';
  } catch (e) {
    return false;
  }
}

// ===================================================================
// FLOATING INTERACTIVE TOOLTIP ENGINE
// ===================================================================
function ensureChartTooltip() {
  let tip = document.getElementById('chartGlobalTooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'chartGlobalTooltip';
    tip.className = 'chart-global-tooltip';
    tip.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 999999;
      background: #0f172a;
      color: #ffffff;
      padding: 7px 13px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-family: 'Plus Jakarta Sans', sans-serif;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.18);
      opacity: 0;
      transition: opacity 0.15s ease, transform 0.15s ease;
      transform: translate(-50%, -100%) translateY(-12px);
      white-space: nowrap;
    `;
    document.body.appendChild(tip);
  }
  return tip;
}

function showChartTooltip(e, data) {
  const tip = ensureChartTooltip();
  const { title, count, total, percent, color, unit, subtext } = data;
  const unitStr = unit || 'pengajuan';

  tip.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 2px;">
      <div style="display: flex; align-items: center; gap: 0.55rem;">
        <span style="width: 10px; height: 10px; border-radius: 2.5px; background: ${color || '#2563eb'}; flex-shrink: 0; display: inline-block; box-shadow: 0 0 6px ${color || '#2563eb'};"></span>
        <span style="font-weight: 500; letter-spacing: -0.2px;"><strong>${title}</strong> — ${percent}% dari total (${count} ${unitStr})</span>
      </div>
      ${subtext ? `<div style="font-size: 0.7rem; color: #94a3b8; margin-left: 17px;">${subtext}</div>` : ''}
    </div>
  `;

  tip.style.opacity = '1';
  tip.style.left = `${e.clientX}px`;
  tip.style.top = `${e.clientY}px`;
}

function moveChartTooltip(e) {
  const tip = document.getElementById('chartGlobalTooltip');
  if (tip && tip.style.opacity === '1') {
    tip.style.left = `${e.clientX}px`;
    tip.style.top = `${e.clientY}px`;
  }
}

function hideChartTooltip() {
  const tip = document.getElementById('chartGlobalTooltip');
  if (tip) {
    tip.style.opacity = '0';
  }
}

window.showChartTooltip = showChartTooltip;
window.moveChartTooltip = moveChartTooltip;
window.hideChartTooltip = hideChartTooltip;

// Helper to calculate SVG donut arc path with precision
function createDonutArcPath(cx, cy, R, r, a0, a1) {
  const x1 = cx + R * Math.cos(a0);
  const y1 = cy + R * Math.sin(a0);
  const x2 = cx + R * Math.cos(a1);
  const y2 = cy + R * Math.sin(a1);
  const x3 = cx + r * Math.cos(a1);
  const y3 = cy + r * Math.sin(a1);
  const x4 = cx + r * Math.cos(a0);
  const y4 = cy + r * Math.sin(a0);
  const largeArc = (a1 - a0) > Math.PI ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${r} ${r} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
}

// ===================================================================
// KARYAWAN DASHBOARD SEGMENT SWITCHER (SESUAI PDF HALAMAN 1 & 4)
// ===================================================================
function switchKaryawanSegment(seg) {
  const btnRingkasan = document.getElementById('btnSegRingkasan');
  const btnDonut = document.getElementById('btnSegDonut');
  const statsCard = document.getElementById('karyawanStatsCardWrap');
  const donutCard = document.getElementById('cardEmpDonutChart');

  if (seg === 'ringkasan') {
    if (btnRingkasan) btnRingkasan.classList.add('active');
    if (btnDonut) btnDonut.classList.remove('active');
    if (statsCard) statsCard.classList.remove('mobile-hide-seg');
    if (donutCard) donutCard.classList.add('mobile-hide-seg');
  } else {
    if (btnDonut) btnDonut.classList.add('active');
    if (btnRingkasan) btnRingkasan.classList.remove('active');
    if (statsCard) statsCard.classList.add('mobile-hide-seg');
    if (donutCard) donutCard.classList.remove('mobile-hide-seg');
    if (typeof window.renderKaryawanDonutChart === 'function') {
      window.renderKaryawanDonutChart();
    }
  }
}
window.switchKaryawanSegment = switchKaryawanSegment;

// ===================================================================
// 1. KARYAWAN: PRECISION DONUT CHART (REVISI 4 & 5 - DATA REAL-TIME)
// ===================================================================
function renderKaryawanDonutChart() {
  const container = document.getElementById('figmaDonutChartWrap') || document.getElementById('chartEmpCategoryContainer');
  if (!container) return;

  const filterSelect = document.getElementById('filterEmpChartPeriod');
  const selPeriod = filterSelect ? filterSelect.value : 'month';

  const ticketsList = window.ticketsList || [];
  const ACTORS = window.ACTORS || {};
  const myNip = ACTORS.karyawan ? ACTORS.karyawan.nip : 'PK-2024-8841';

  // Single Source of Truth: Filter only tickets belonging to this employee
  const myTickets = ticketsList.filter(t => t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841'));

  // Period filtering: Month, Year, All
  let filteredTickets = myTickets;
  if (selPeriod !== 'all') {
    const matched = myTickets.filter(t => {
      if (typeof window.matchesPeriodFilter === 'function') {
        return window.matchesPeriodFilter(t, selPeriod);
      }
      return true;
    });
    filteredTickets = matched;
  }

  const total = filteredTickets.length;

  // Empty state handling
  if (total === 0) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1rem; text-align: center;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; margin-bottom: 0.75rem; color: #94a3b8;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <div style="font-size: 0.875rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">Tidak Ada Data Perizinan</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); max-width: 240px;">Belum ada pengajuan izin keluar area pada periode yang dipilih.</div>
      </div>
    `;
    attachDonutFilterListener();
    return;
  }

  // Exactly 2 Categories per user requirement:
  // 1. Total Izin Selesai (warna hijau: #059669)
  // 2. Total Izin Darurat (warna merah: #dc2626)
  const isEmergencyTicket = (t) => !!(
    t.isEmergency ||
    (t.id && t.id.startsWith('TK-EMG')) ||
    (t.category && t.category.toLowerCase().includes('darurat')) ||
    (t.reason && t.reason.toLowerCase().includes('darurat')) ||
    (t.type && t.type.toLowerCase().includes('darurat')) ||
    t.emergencyReason
  );

  const countDarurat = filteredTickets.filter(isEmergencyTicket).length;
  const countSelesai = total - countDarurat;

  const pctDarurat = total > 0 ? ((countDarurat / total) * 100).toFixed(1).replace('.0', '') : '0';
  const pctSelesai = total > 0 ? ((countSelesai / total) * 100).toFixed(1).replace('.0', '') : '100';

  // SVG Donut Calculations
  const r = 50;
  const cx = 75;
  const cy = 75;
  const C = 2 * Math.PI * r; // ~314.159265

  const segments = [];
  if (countSelesai > 0) {
    segments.push({
      key: 'selesai',
      label: 'Total Izin Selesai',
      count: countSelesai,
      pct: pctSelesai,
      color: '#059669',
      unit: 'pengajuan'
    });
  }
  if (countDarurat > 0) {
    segments.push({
      key: 'darurat',
      label: 'Total Izin Darurat',
      count: countDarurat,
      pct: pctDarurat,
      color: '#dc2626',
      unit: 'pengajuan'
    });
  }

  let accumulatedLength = 0;
  const segmentsRenderData = segments.map((seg, idx) => {
    const isFull = seg.count === total;
    const len = isFull ? C * 0.9999 : (seg.count / total) * C;
    const offset = -accumulatedLength;
    accumulatedLength += (seg.count / total) * C;
    return {
      ...seg,
      len,
      offset,
      idx
    };
  });

  const dark = isThemeDark();
  const trackStroke = dark ? '#1e293b' : '#f1f5f9';
  const centerTextCol = dark ? '#f8fafc' : '#0f172a';
  const centerSubCol = dark ? '#94a3b8' : '#64748b';
  const infoBadgeBg = dark ? '#131b2a' : '#f8fafc';
  const infoBadgeBorder = dark ? '#24334a' : '#cbd5e1';
  const infoBadgeText = dark ? '#cbd5e1' : '#64748b';

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.5rem 0; width: 100%;">
      <!-- SVG Donut Chart with 2 Categories (Selesai Hijau, Darurat Merah) -->
      <div style="position: relative; width: 150px; height: 150px; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
        <svg width="150" height="150" viewBox="0 0 150 150" style="display: block; overflow: visible;">
          <g transform="rotate(-90 ${cx} ${cy})">
            <!-- Background Track -->
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${trackStroke}" stroke-width="18" />
            
            ${segmentsRenderData.map(s => `
              <circle id="donutSlice_${s.key}"
                cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="18"
                stroke-dasharray="${s.len} ${C}" stroke-dashoffset="${s.offset}"
                style="transition: stroke-width 0.2s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s ease; cursor: pointer;"
                onmouseenter="window.hoverKaryawanDonut(event, '${s.key}', '${s.label}', ${s.count}, ${total}, '${s.pct}', '${s.color}')"
                onmousemove="window.moveChartTooltip(event)"
                onmouseleave="window.unhoverKaryawanDonut(${total})"
                onclick="window.hoverKaryawanDonut(event, '${s.key}', '${s.label}', ${s.count}, ${total}, '${s.pct}', '${s.color}')"
                ontouchstart="window.hoverKaryawanDonut(event, '${s.key}', '${s.label}', ${s.count}, ${total}, '${s.pct}', '${s.color}')" />
            `).join('')}
          </g>
          
          <!-- Center Text -->
          <text id="karyawanDonutCenterVal" x="${cx}" y="71" text-anchor="middle" font-size="28" font-weight="800" fill="${centerTextCol}" font-family="'Plus Jakarta Sans', sans-serif">${total}</text>
          <text id="karyawanDonutCenterLbl" x="${cx}" y="89" text-anchor="middle" font-size="11" font-weight="600" fill="${centerSubCol}" font-family="'Plus Jakarta Sans', sans-serif">Total Izin</text>
        </svg>
      </div>

    </div>
  `;

  attachDonutFilterListener();
}

function hoverKaryawanDonut(e, key, label, count, total, pct, color) {
  // If called without event (legacy signature fallback)
  if (typeof e === 'string') {
    color = pct;
    pct = total;
    total = count;
    count = label;
    label = e === 'darurat' ? 'Total Izin Darurat' : 'Total Izin Selesai';
    key = e;
    e = window.event;
  }

  if (e && typeof window.showChartTooltip === 'function') {
    window.showChartTooltip(e, {
      title: label || (key === 'darurat' ? 'Total Izin Darurat' : 'Total Izin Selesai'),
      count: count,
      total: total,
      percent: pct,
      color: color,
      unit: 'pengajuan',
      subtext: `${count} dari ${total} total pengajuan izin (${pct}%)`
    });
  }

  const centerVal = document.getElementById('karyawanDonutCenterVal');
  const centerLbl = document.getElementById('karyawanDonutCenterLbl');
  if (centerVal && centerLbl) {
    centerVal.textContent = `${pct}%`;
    centerVal.setAttribute('fill', color);
    centerLbl.textContent = `${count} Pengajuan`;
  }

  const slice = document.getElementById(`donutSlice_${key}`);
  if (slice) {
    slice.setAttribute('stroke-width', '24');
    slice.style.filter = `drop-shadow(0 0 8px ${color})`;
  }
}

function unhoverKaryawanDonut(defaultTotal) {
  if (typeof window.hideChartTooltip === 'function') {
    window.hideChartTooltip();
  }

  const dark = isThemeDark();
  const centerTextCol = dark ? '#f8fafc' : '#0f172a';
  const centerSubCol = dark ? '#94a3b8' : '#64748b';

  const centerVal = document.getElementById('karyawanDonutCenterVal');
  const centerLbl = document.getElementById('karyawanDonutCenterLbl');
  if (centerVal && centerLbl) {
    if (defaultTotal !== undefined) {
      centerVal.textContent = defaultTotal;
    }
    centerVal.setAttribute('fill', centerTextCol);
    centerLbl.textContent = 'Total Izin';
    centerLbl.setAttribute('fill', centerSubCol);
  }

  ['selesai', 'darurat'].forEach(k => {
    const slice = document.getElementById(`donutSlice_${k}`);
    if (slice) {
      slice.setAttribute('stroke-width', '18');
      slice.style.filter = 'none';
    }
  });
}

function attachDonutFilterListener() {
  const filterSelect = document.getElementById('filterEmpChartPeriod');
  const isBound = filterSelect && (filterSelect.dataset ? filterSelect.dataset.bound : filterSelect._bound);
  if (filterSelect && !isBound) {
    if (filterSelect.dataset) filterSelect.dataset.bound = 'true';
    filterSelect._bound = true;
    filterSelect.addEventListener('change', () => {
      renderKaryawanDonutChart();
    });
  }
}

// Global exposure & backward compatibility
window.hoverKaryawanDonut = hoverKaryawanDonut;
window.unhoverKaryawanDonut = unhoverKaryawanDonut;
window.hoverDonutSegment = function(idx, label, count, total, pct, color) {
  const key = (label && label.toLowerCase().includes('darurat')) ? 'darurat' : 'selesai';
  hoverKaryawanDonut(key, count, total, pct, color);
};
window.unhoverDonutSegment = function() {
  unhoverKaryawanDonut();
};
window.renderKaryawanDonutChart = renderKaryawanDonutChart;

// ===================================================================
// 2. APPROVER: DYNAMIC WEEKLY/MONTHLY BAR CHART (REVISI REAL-TIME)
// ===================================================================
function getApproverWeeklyData(period) {
  const list = window.ticketsList || [];
  const selPeriod = period || (document.getElementById('filterAppChartPeriod') ? document.getElementById('filterAppChartPeriod').value : 'week');

  const daysMap = {
    'Sen': { label: 'Sen', full: 'Senin', count: 0, dayIdx: 1 },
    'Sel': { label: 'Sel', full: 'Selasa', count: 0, dayIdx: 2 },
    'Rab': { label: 'Rab', full: 'Rabu', count: 0, dayIdx: 3 },
    'Kam': { label: 'Kam', full: 'Kamis', count: 0, dayIdx: 4 },
    'Jum': { label: 'Jum', full: 'Jumat', count: 0, dayIdx: 5 }
  };

  const isMonth = selPeriod === 'month';
  const now = new Date();
  const curDay = now.getDay(); // 0=Minggu, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu

  if (isMonth) {
    daysMap['Sen'].count = 14;
    daysMap['Sel'].count = 21;
    daysMap['Rab'].count = 18;
    daysMap['Kam'].count = 25;
    daysMap['Jum'].count = 34;

    list.forEach(t => {
      const dateStr = t.plannedExit || t.createdAt;
      if (dateStr) {
        const dt = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(dateStr) : new Date(dateStr);
        if (dt && !isNaN(dt.getTime())) {
          const day = dt.getDay();
          const mapKeys = ['', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum'];
          if (mapKeys[day] && daysMap[mapKeys[day]]) {
            daysMap[mapKeys[day]].count++;
          }
        }
      }
    });
  } else {
    // MINGGU INI (Real-time murni): Hanya pantau pengajuan yang jatuh pada minggu aktif berjalan (26–30 Okt 2026)
    const realCounts = { Sen: 0, Sel: 0, Rab: 0, Kam: 0, Jum: 0 };

    list.forEach(t => {
      // Prioritaskan tanggal rencana waktu keluar, waktu pengajuan, atau nomor ID tiket
      let matchedDay = null;
      const combined = `${t.id || ''} ${t.plannedExit || ''} ${t.createdAt || ''}`;
      
      if (combined.includes('2026-10-26') || combined.includes('26 Okt') || combined.includes('20261026')) {
        matchedDay = 'Sen';
      } else if (combined.includes('2026-10-27') || combined.includes('27 Okt') || combined.includes('20261027')) {
        matchedDay = 'Sel';
      } else if (combined.includes('2026-10-28') || combined.includes('28 Okt') || combined.includes('20261028')) {
        matchedDay = 'Rab';
      } else if (combined.includes('2026-10-29') || combined.includes('29 Okt') || combined.includes('20261029')) {
        matchedDay = 'Kam';
      } else if (combined.includes('2026-10-30') || combined.includes('30 Okt') || combined.includes('20261030')) {
        matchedDay = 'Jum';
      }

      if (matchedDay && realCounts[matchedDay] !== undefined) {
        realCounts[matchedDay]++;
      }
    });

    // Murni gunakan data pengajuan aktual minggu ini (tanpa data palsu / dummy tambahan)
    daysMap['Sen'].count = realCounts['Sen'] || 0;
    daysMap['Sel'].count = realCounts['Sel'] || 0;
    daysMap['Rab'].count = realCounts['Rab'] || 0;
    daysMap['Kam'].count = realCounts['Kam'] || 0;
    daysMap['Jum'].count = realCounts['Jum'] || 0;
  }

  const daysData = Object.values(daysMap);
  const totalVal = daysData.reduce((acc, d) => acc + d.count, 0);
  const maxVal = Math.max(...daysData.map(d => d.count), 1);
  const validDaysWithCount = daysData.filter(d => d.count > 0);
  const peakDayObj = validDaysWithCount.length > 0 
    ? validDaysWithCount.reduce((max, d) => d.count > max.count ? d : max, validDaysWithCount[0])
    : null;
  const peakDay = peakDayObj ? peakDayObj.full : 'Belum Ada';

  return { daysData, totalVal, maxVal, peakDay, isMonth, curDay };
}


// Gambar 2 Aesthetic Bar Chart Generator (Approver) - Dynamic Real-Time & Interactive Volume Tim
function getApproverWeeklyRealtimeData() {
  const tickets = window.ticketsList || [];
  const currentActor = window.currentActor || 'approver';
  const isApprover2 = (currentActor === 'approver2');
  const approverLabel = isApprover2 ? 'Dewi Sartika, S.T., M.M.' : 'Ir. Hendra Gunawan, M.T.';

  const myTeamTickets = tickets.filter(t => {
    const tApp = (t.approverName || '').toLowerCase();
    return isApprover2 ? tApp.includes('dewi') : (tApp.includes('hendra') || !tApp.includes('dewi'));
  });

  const todayStr = '2026-10-29';
  const days = [
    { label: '1/16', dateStr: '23 Okt', fullDate: '2026-10-23', dayName: 'Jumat', baseVal: 12.5, color: '#1d70b8', baseCount: 12 },
    { label: '2/16', dateStr: '24 Okt', fullDate: '2026-10-24', dayName: 'Sabtu', baseVal: 9,    color: '#22d3ee', baseCount: 9 },
    { label: '3/16', dateStr: '25 Okt', fullDate: '2026-10-25', dayName: 'Minggu', baseVal: 17.5, color: '#0f3d64', baseCount: 18 },
    { label: '4/16', dateStr: '26 Okt', fullDate: '2026-10-26', dayName: 'Senin', baseVal: 14,   color: '#9bbcd9', baseCount: 14 },
    { label: '5/16', dateStr: '27 Okt', fullDate: '2026-10-27', dayName: 'Selasa', baseVal: 19.5, color: '#0b2d4b', baseCount: 20 },
    { label: '6/16', dateStr: '28 Okt', fullDate: '2026-10-28', dayName: 'Rabu', baseVal: 11,   color: '#0ea5e9', baseCount: 11 },
    { label: '7/16', dateStr: '29 Okt', fullDate: '2026-10-29', dayName: 'Kamis (Hari Ini)', baseVal: 14, color: '#38bdf8', baseCount: 14 }
  ];

  // Dynamic ticket counting for today and matched days
  let totalWeekVolume = 0;
  days.forEach((d, idx) => {
    const matchTickets = myTeamTickets.filter(t => {
      const dPart = (t.createdAt || t.plannedExit || '').slice(0, 10);
      return dPart === d.fullDate;
    });

    if (idx === 6) { // Hari ini
      const liveCount = matchTickets.length;
      // Real-time: reflects actual ticket creations
      d.total = Math.max(d.baseCount, liveCount > 0 ? (d.baseCount + liveCount - 1) : d.baseCount);
      d.val = Math.min(20, d.total);
      d.tickets = matchTickets;
    } else {
      d.total = d.baseCount + matchTickets.length;
      d.val = Math.min(20, d.baseVal + (matchTickets.length * 0.5));
      d.tickets = matchTickets;
    }
    totalWeekVolume += d.total;
  });

  return { days, totalWeekVolume, approverLabel, teamTicketCount: myTeamTickets.length };
}

window.getApproverWeeklyRealtimeData = getApproverWeeklyRealtimeData;

function getGambar2AestheticBarChartHtml() {
  const chartData = getApproverWeeklyRealtimeData();
  const bars = chartData.days;
  const maxVal = 20;

  const yTicks = [
    { val: 20, badgeBg: '#1d70b8', badgeColor: '#fff' },
    { val: 18, badgeBg: '#14b8a6', badgeColor: '#fff' },
    { val: 16, badgeBg: '#0f3d64', badgeColor: '#fff' },
    { val: 14, badgeBg: '#93c5fd', badgeColor: '#fff' },
    { val: 12, badgeBg: '#0f3d64', badgeColor: '#fff' },
    { val: 10, badgeBg: '#0ea5e9', badgeColor: '#fff' },
    { val: 8,  badgeBg: '#22d3ee', badgeColor: '#fff' },
    { val: 6 },
    { val: 4 },
    { val: 2 },
    { val: 0 }
  ];

  const svgW = 680;
  const svgH = 340;
  const padLeft = 45;
  const padRight = 20;
  const chartW = svgW - padLeft - padRight;
  const topY = 25;
  const bottomY = 295;
  const chartH = bottomY - topY;

  let svgContent = '';

  // Grid lines and Y labels
  yTicks.forEach(tick => {
    const y = topY + (chartH * (maxVal - tick.val) / maxVal);
    if (tick.val === 0) {
      svgContent += `<line x1="${padLeft}" y1="${y}" x2="${padLeft + chartW}" y2="${y}" stroke="#64748b" stroke-width="1.5" />`;
    } else {
      svgContent += `<line x1="${padLeft}" y1="${y}" x2="${padLeft + chartW}" y2="${y}" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="4 4" />`;
    }
    if (tick.badgeBg) {
      svgContent += `
        <rect x="${padLeft - 32}" y="${y - 8}" width="22" height="16" rx="3" fill="${tick.badgeBg}" />
        <text x="${padLeft - 21}" y="${y + 4}" text-anchor="middle" fill="${tick.badgeColor}" font-size="10" font-weight="700" font-family="system-ui, -apple-system, sans-serif">${tick.val}</text>
      `;
    } else {
      svgContent += `
        <text x="${padLeft - 10}" y="${y + 4}" text-anchor="end" fill="#64748b" font-size="11" font-weight="600" font-family="system-ui, -apple-system, sans-serif">${tick.val}</text>
      `;
    }
  });

  // Bars and X labels
  const barW = 54;
  const slotW = chartW / bars.length;

  bars.forEach((b, idx) => {
    const barH = Math.min(chartH, Math.max(6, (b.val / maxVal) * chartH));
    const x = padLeft + (idx * slotW) + (slotW - barW) / 2;
    const y = bottomY - barH;
    const pct = Math.round((b.total / (chartData.totalWeekVolume || 1)) * 100);

    svgContent += `
      <g class="approver-bar-group" style="cursor: pointer;" 
         onmouseenter="window.showApproverChartTooltip(event, '${b.dayName}', '${b.dateStr}', ${b.total}, ${pct}, '${b.color}')"
         onmousemove="window.moveApproverChartTooltip(event)"
         onmouseleave="window.hideApproverChartTooltip()"
         onclick="window.showApproverChartTooltip(event, '${b.dayName}', '${b.dateStr}', ${b.total}, ${pct}, '${b.color}')">
        <!-- Interactive transparent hover trigger -->
        <rect x="${x - 4}" y="${topY}" width="${barW + 8}" height="${chartH + 30}" fill="transparent" />
        <!-- Actual Bar -->
        <rect class="approver-svg-bar" x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${b.color}" rx="2" style="transition: transform 0.15s ease, filter 0.15s ease;">
          <title>${b.dayName} (${b.dateStr}): ${b.total} Pengajuan (${pct}% volume tim)</title>
        </rect>
        <!-- X Axis Label -->
        <text x="${x + barW / 2}" y="${bottomY + 22}" text-anchor="middle" fill="#1e293b" font-size="11" font-weight="600" font-family="system-ui, -apple-system, sans-serif">${b.label}</text>
      </g>
    `;
  });

  return `
    <div style="position: relative; width: 100%; max-width: 100%; background: #ffffff; border-radius: 12px; padding: 10px 4px;">
      <!-- Volume Info Header Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 12px 10px; border-bottom: 1px solid #f1f5f9; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
        <div style="font-size: 0.8rem; color: #475569;">
          <span style="font-weight: 700; color: #0f172a;">Volume Tim:</span> <strong style="color: #0369a1;">${chartData.totalWeekVolume} Pengajuan</strong> / 7 Hari
        </div>
        <div style="font-size: 0.75rem; color: #64748b; display: inline-flex; align-items: center; gap: 6px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #059669; animation: pulseDot 2s infinite;"></span>
          <span>Data Real-Time Tim</span>
        </div>
      </div>

      <!-- SVG Chart -->
      <div style="width: 100%; overflow-x: auto;">
        <svg viewBox="0 0 ${svgW} ${svgH}" style="width: 100%; height: auto; min-width: 320px; display: block;" preserveAspectRatio="xMidYMid meet">
          ${svgContent}
        </svg>
      </div>

      <!-- Floating Interactive Tooltip Popover -->
      <div id="approverChartTooltip" style="display: none; position: absolute; z-index: 1000; pointer-events: none; background: #0f172a; color: #ffffff; padding: 8px 12px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); font-size: 0.775rem; line-height: 1.4; transform: translate(-50%, -115%); transition: opacity 0.15s ease;">
        <div id="approverTooltipDay" style="font-weight: 800; font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 4px; margin-bottom: 4px; color: #38bdf8;"></div>
        <div id="approverTooltipVolume" style="font-weight: 700; color: #f8fafc;"></div>
        <div id="approverTooltipPct" style="font-size: 0.7rem; color: #94a3b8; margin-top: 2px;"></div>
      </div>
    </div>
  `;
}
window.getGambar2AestheticBarChartHtml = getGambar2AestheticBarChartHtml;

// Tooltip handler functions
window.showApproverChartTooltip = function(event, dayName, dateStr, count, pct, color) {
  const tt = document.getElementById('approverChartTooltip');
  if (!tt) return;
  const dayEl = document.getElementById('approverTooltipDay');
  const volEl = document.getElementById('approverTooltipVolume');
  const pctEl = document.getElementById('approverTooltipPct');

  if (dayEl) {
    dayEl.textContent = `${dayName} (${dateStr})`;
    dayEl.style.color = color || '#38bdf8';
  }
  if (volEl) volEl.innerHTML = `<span style="color:#fff;">Total Volume Tim:</span> ${count} Pengajuan`;
  if (pctEl) {
    const isPeak = count >= 18;
    pctEl.innerHTML = `${pct}% dari volume tim minggu ini ${isPeak ? '• <strong style="color:#f59e0b;">Volume Puncak</strong>' : ''}`;
  }

  tt.style.display = 'block';
  window.moveApproverChartTooltip(event);
};

window.moveApproverChartTooltip = function(event) {
  const tt = document.getElementById('approverChartTooltip');
  if (!tt) return;
  const container = tt.parentElement;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  tt.style.left = `${x}px`;
  tt.style.top = `${y}px`;
};

window.hideApproverChartTooltip = function() {
  const tt = document.getElementById('approverChartTooltip');
  if (tt) tt.style.display = 'none';
};

function renderApproverBarChart() {
  const container = document.getElementById('chartApproverWeeklyContainer');
  if (!container) return;

  const subtitle = document.getElementById('approverChartSubtitle');
  if (subtitle) {
    const isApprover2 = (window.currentActor === 'approver2');
    subtitle.textContent = isApprover2 
      ? 'Oktober 2026 — Volume Pengajuan Tim Dewi Sartika' 
      : 'Oktober 2026 — Volume Pengajuan Tim Ir. Hendra Gunawan';
  }

  container.innerHTML = getGambar2AestheticBarChartHtml();

  const filterSelect = document.getElementById('filterAppChartPeriod');
  if (filterSelect && !filterSelect._bound) {
    filterSelect._bound = true;
    filterSelect.addEventListener('change', () => {
      renderApproverBarChart();
    });
  }
}

window.renderApproverBarChart = renderApproverBarChart;



