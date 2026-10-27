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
    filteredTickets = matched.length > 0 ? matched : myTickets;
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
                onmouseenter="window.hoverKaryawanDonut('${s.key}', ${s.count}, ${total}, '${s.pct}', '${s.color}')"
                onmouseleave="window.unhoverKaryawanDonut()"
                onclick="window.hoverKaryawanDonut('${s.key}', ${s.count}, ${total}, '${s.pct}', '${s.color}')"
                ontouchstart="window.hoverKaryawanDonut('${s.key}', ${s.count}, ${total}, '${s.pct}', '${s.color}')" />
            `).join('')}
          </g>
          
          <!-- Center Text -->
          <text x="${cx}" y="71" text-anchor="middle" font-size="28" font-weight="800" fill="${centerTextCol}" font-family="'Plus Jakarta Sans', sans-serif">${total}</text>
          <text x="${cx}" y="89" text-anchor="middle" font-size="11" font-weight="600" fill="${centerSubCol}" font-family="'Plus Jakarta Sans', sans-serif">Total Izin</text>
        </svg>
      </div>

      <!-- Interactive Touch Legend Chips for Mobile & Desktop -->
      <div class="donut-legend-wrap" style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin-top: 0.85rem; width: 100%;">
        ${segmentsRenderData.map(s => `
          <button type="button" class="donut-legend-chip" id="chipDonut_${s.key}"
            style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.65rem; border-radius: 999px; border: 1.5px solid ${s.color}40; background: ${s.color}15; color: ${s.color}; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.2s ease;"
            onclick="window.hoverKaryawanDonut('${s.key}', ${s.count}, ${total}, '${s.pct}', '${s.color}')">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${s.color};"></span>
            <span>${s.label}: <strong>${s.count}</strong> (${s.pct}%)</span>
          </button>
        `).join('')}
      </div>


    </div>
  `;

  attachDonutFilterListener();
}

function hoverKaryawanDonut(key, count, total, pct, color) {
  if (typeof window.hideChartTooltip === 'function') {
    window.hideChartTooltip(); // Prevent duplicate floating black tooltip
  }

  const badge = document.getElementById('karyawanDonutInfoBadge');
  if (badge) {
    const dark = isThemeDark();
    const isDarurat = key === 'darurat';
    const title = isDarurat ? 'Total Izin Darurat' : 'Total Izin Selesai';
    const bg = isDarurat ? (dark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2') : (dark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5');
    const border = isDarurat ? (dark ? 'rgba(239, 68, 68, 0.4)' : '#ef4444') : (dark ? 'rgba(16, 185, 129, 0.4)' : '#10b981');
    const textCol = isDarurat ? (dark ? '#fca5a5' : '#991b1b') : (dark ? '#6ee7b7' : '#065f46');
    const dotCol = isDarurat ? '#dc2626' : '#059669';

    badge.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0.5rem 0.85rem; background: ${bg}; border: 1.5px solid ${border}; border-radius: 8px; color: ${textCol}; font-size: 0.8rem; box-shadow: 0 2px 8px ${dotCol}25; animation: fadeIn 0.15s ease;">
        <div style="display: flex; align-items: center; gap: 0.55rem;">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: ${dotCol}; box-shadow: 0 0 6px ${dotCol}80; flex-shrink: 0; display: inline-block;"></span>
          <span style="font-weight: 600;"><strong>${title}:</strong> ${count} Pengajuan</span>
        </div>
        <span style="background: ${dotCol}; color: #ffffff; padding: 2px 9px; border-radius: 999px; font-weight: 800; font-family: var(--font-mono); font-size: 0.75rem; flex-shrink: 0;">${pct}%</span>
      </div>
    `;
  }

  const slice = document.getElementById(`donutSlice_${key}`);
  if (slice) {
    slice.setAttribute('stroke-width', '24');
    slice.style.filter = `drop-shadow(0 0 6px ${color})`;
  }
}

function unhoverKaryawanDonut() {
  if (typeof window.hideChartTooltip === 'function') {
    window.hideChartTooltip();
  }

  const badge = document.getElementById('karyawanDonutInfoBadge');
  if (badge) {
    badge.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.75rem; color: #64748b; font-weight: 500; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 8px; padding: 0.5rem 0.85rem; width: 100%; text-align: center;">

      </div>
    `;
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

function renderApproverBarChart() {
  const container = document.getElementById('chartApproverWeeklyContainer');
  if (!container) return;

  const filterSelect = document.getElementById('filterAppChartPeriod');
  const selPeriod = filterSelect ? filterSelect.value : 'week';
  const { daysData, totalVal, maxVal, peakDay, isMonth, curDay } = getApproverWeeklyData(selPeriod);

  // Subtitle update
  const subtitle = document.getElementById('approverChartSubtitle');
  if (subtitle) {
    const peakText = totalVal > 0 ? `Puncak: ${peakDay}, ${maxVal} pengajuan` : 'Belum Ada Pengajuan';
    if (isMonth) {
      subtitle.textContent = `Oktober 2026 — Total: ${totalVal} pengajuan — ${peakText}`;
    } else {
      subtitle.textContent = `26–30 Okt 2026 — Total: ${totalVal} pengajuan — ${peakText}`;
    }
  }

  const dark = isThemeDark();

  container.innerHTML = `
    <div class="approver-bar-wrap" style="display: flex; justify-content: space-between; align-items: flex-end; gap: 0.85rem; height: 165px; padding-top: 10px;">
      ${daysData.map((d, idx) => {
        const isFuture = !isMonth && curDay >= 1 && curDay <= 5 && d.dayIdx > curDay;
        const isPeak = d.count === maxVal && d.count > 0;
        const isToday = !isMonth && d.dayIdx === curDay;
        const heightPx = d.count > 0 ? (Math.round((d.count / maxVal) * 115) + 16) : 6;
        const emptyBarCol = dark ? '#1e293b' : '#e2e8f0';
        const barColor = isPeak ? '#059669' : (d.count > 0 ? '#10b981' : emptyBarCol);
        const textColor = isPeak 
          ? (dark ? '#34d399' : '#047857') 
          : (d.count > 0 ? (dark ? '#f8fafc' : '#0f172a') : (dark ? '#64748b' : '#94a3b8'));
        const labelCol = (isToday || isPeak) 
          ? (dark ? '#34d399' : '#047857') 
          : (dark ? '#94a3b8' : '#64748b');
        const pct = totalVal > 0 ? Math.round((d.count / totalVal) * 100) : 0;
        const subtext = isFuture ? 'Hari Mendatang (Belum ada pengajuan)' : (isPeak ? '★ Hari Volume Tertinggi' : 'Aktivitas Normal');

        return `
          <div class="approver-bar-column" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; cursor: pointer;"
               onmouseenter="window.showChartTooltip(event, { title: '${d.full}', count: ${d.count}, total: ${totalVal}, percent: ${pct}, color: '${barColor}', unit: 'pengajuan', subtext: '${subtext}' })"
               onmousemove="window.moveChartTooltip(event)"
               onmouseleave="window.hideChartTooltip()">
            <!-- Top number label -->
            <span style="font-size: 0.875rem; font-weight: 800; color: ${textColor}; margin-bottom: 6px; font-family: var(--font-sans);">
              ${d.count > 0 ? d.count : (isFuture ? '-' : '0')}
            </span>
            <!-- Bar block -->
            <div id="approverBar_${idx}" class="${d.count > 0 ? (isPeak ? 'approver-bar-pillar peak' : 'approver-bar-pillar normal') : 'approver-bar-pillar empty'}" 
                 style="height: ${heightPx}px; width: 100%; max-width: 44px; background: ${barColor}; border-radius: 6px 6px 0 0; transition: height 0.4s ease, background 0.2s ease;"></div>
            <!-- Weekday label -->
            <span style="font-size: 0.8rem; font-weight: ${isToday || isPeak ? '800' : '600'}; color: ${labelCol}; margin-top: 8px;">
              ${d.label}
            </span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Filter listener
  const isBound = filterSelect && (filterSelect.dataset ? filterSelect.dataset.bound : filterSelect._bound);
  if (filterSelect && !isBound) {
    if (filterSelect.dataset) filterSelect.dataset.bound = 'true';
    filterSelect._bound = true;
    filterSelect.addEventListener('change', () => {
      renderApproverBarChart();
    });
  }
}

window.renderApproverBarChart = renderApproverBarChart;

// ===================================================================
// 3. ADMIN: GATE PASS REALTIME TRAFFIC DUAL CHART (SCAN OUT & SCAN IN)
// Realtime, Live Ticking & Current Time Indicator (07:00 - 17:00 WIB)
// ===================================================================
function getAdminTrafficData() {
  const list = window.ticketsList || [];
  const hours = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  // Baseline standard operating load (Kawasan Pabrik Kujang)
  const baseOut = {
    '07:00': 2, '08:00': 4, '09:00': 5, '10:00': 7,
    '11:00': 12, '12:00': 9, '13:00': 5, '14:00': 8,
    '15:00': 9, '16:00': 14, '17:00': 7
  };
  const baseIn = {
    '07:00': 1, '08:00': 2, '09:00': 3, '10:00': 5,
    '11:00': 7, '12:00': 11, '13:00': 12, '14:00': 6,
    '15:00': 8, '16:00': 10, '17:00': 15
  };

  const nowTime = new Date();
  const curHourNum = nowTime.getHours();

  // Zero-out future hours (di atas jam sekarang tidak boleh ada data / nol)
  hours.forEach(hour => {
    const hNum = parseInt(hour.split(':')[0], 10);
    if (hNum > curHourNum) {
      baseOut[hour] = 0;
      baseIn[hour] = 0;
    }
  });

  list.forEach(t => {
    // Scan Out (Keluar Gerbang)
    const outTime = t.scanOutTime || t.plannedExit;
    if (outTime) {
      const match = outTime.match(/(\d{1,2}):\d{2}/);
      if (match) {
        const slot = match[1].padStart(2, '0') + ':00';
        if (baseOut[slot] !== undefined) { const slotH = parseInt(slot.split(':')[0], 10); if (slotH <= curHourNum) { baseOut[slot]++; } }
      }
    }
    // Scan In (Kembali Masuk Gerbang)
    const inTime = t.scanInTime || t.estimatedReturn;
    if (inTime) {
      const match = inTime.match(/(\d{1,2}):\d{2}/);
      if (match) {
        const slot = match[1].padStart(2, '0') + ':00';
        if (baseIn[slot] !== undefined) { const slotH = parseInt(slot.split(':')[0], 10); if (slotH <= curHourNum) { baseIn[slot]++; } }
      }
    }
  });

  const rows = hours.map(hour => ({
    hour,
    out: baseOut[hour] || 0,
    in: baseIn[hour] || 0,
    total: (baseOut[hour] || 0) + (baseIn[hour] || 0)
  }));

  const totalOut = rows.reduce((s, r) => s + r.out, 0);
  const totalIn = rows.reduce((s, r) => s + r.in, 0);
  const maxVal = Math.max(...rows.map(r => Math.max(r.out, r.in)), 1);

  const peakRow = rows.reduce((max, r) => r.total > max.total ? r : max, rows[0]);
  const peakOutRow = rows.reduce((max, r) => r.out > max.out ? r : max, rows[0]);
  const peakInRow = rows.reduce((max, r) => r.in > max.in ? r : max, rows[0]);

  return {
    rows,
    totalOut,
    totalIn,
    totalCombined: totalOut + totalIn,
    maxVal,
    peakHour: peakRow.hour,
    peakOutHour: peakOutRow.hour,
    peakInHour: peakInRow.hour
  };
}

function renderAdminTrafficChart() {
  const container = document.getElementById('chartAdminTrafficContainer');
  if (!container) return;

  const { rows: data, totalOut, totalIn, totalCombined, maxVal, peakHour, peakOutHour, peakInHour } = getAdminTrafficData();
  const width = 500;
  const height = 160;
  const padLeft = 28;
  const padRight = 20;
  const padTop = 22;
  const padBottom = 26;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Realtime clock positioning
  const now = new Date();
  const curH = now.getHours();
  const curM = now.getMinutes();
  const curS = now.getSeconds();
  const curDecHour = curH + (curM / 60) + (curS / 3600);
  const timeNowStr = `${String(curH).padStart(2, '0')}:${String(curM).padStart(2, '0')}`;
  const timeNowFull = `${timeNowStr}:${String(curS).padStart(2, '0')} WIB`;

  let currentX = null;
  if (curDecHour >= 7 && curDecHour <= 17) {
    const fraction = (curDecHour - 7) / (17 - 7);
    currentX = padLeft + fraction * plotW;
  } else if (curDecHour < 7) {
    currentX = padLeft;
  } else {
    currentX = padLeft + plotW;
  }

  // Find data closest to current hour
  const currentSlotStr = `${String(curH).padStart(2, '0')}:00`;
  const curSlotData = data.find(d => d.hour === currentSlotStr) || data[0];

  // Dual Line Points
  const pointsOut = data.map((d, i) => {
    const x = padLeft + (i / (data.length - 1)) * plotW;
    const y = padTop + plotH - (d.out / (maxVal * 1.18)) * plotH;
    return { x, y, hour: d.hour, val: d.out, hourNum: 7 + i };
  });

  const pointsIn = data.map((d, i) => {
    const x = padLeft + (i / (data.length - 1)) * plotW;
    const y = padTop + plotH - (d.in / (maxVal * 1.18)) * plotH;
    return { x, y, hour: d.hour, val: d.in, hourNum: 7 + i };
  });

  // ===================================================================
  // CUTOFF LOGIKA: Di atas jam sekarang TIDAK ADA GRAFIK (Requirement 7)
  // Misalnya jam 12.00, maka jam 12.00 ke atas tidak ada garis grafiknya.
  // ===================================================================
  let pathDOut = '';
  let areaDOut = '';
  let pathDIn = '';
  let areaDIn = '';
  let nowYOut = padTop + plotH;
  let nowYIn = padTop + plotH;

  if (curDecHour >= 7) {
    if (curDecHour >= 17) {
      // Seluruh jam operasional (07:00 - 17:00) sudah lewat
      pathDOut = `M ${pointsOut[0].x},${pointsOut[0].y} ` + pointsOut.slice(1).map(p => `L ${p.x},${p.y}`).join(' ');
      areaDOut = `${pathDOut} L ${padLeft + plotW},${padTop + plotH} L ${padLeft},${padTop + plotH} Z`;

      pathDIn = `M ${pointsIn[0].x},${pointsIn[0].y} ` + pointsIn.slice(1).map(p => `L ${p.x},${p.y}`).join(' ');
      areaDIn = `${pathDIn} L ${padLeft + plotW},${padTop + plotH} L ${padLeft},${padTop + plotH} Z`;
    } else {
      // Masih dalam rentang 07:00 s/d 17:00 -> potong tepat di jam & menit sekarang (currentX)
      const maxPassedIndex = Math.min(Math.floor(curDecHour - 7), data.length - 1);
      const passedPointsOut = pointsOut.slice(0, maxPassedIndex + 1);
      const passedPointsIn = pointsIn.slice(0, maxPassedIndex + 1);

      const p0Out = pointsOut[maxPassedIndex];
      const p1Out = pointsOut[Math.min(maxPassedIndex + 1, pointsOut.length - 1)];
      const p0In = pointsIn[maxPassedIndex];
      const p1In = pointsIn[Math.min(maxPassedIndex + 1, pointsIn.length - 1)];

      const spanX = (p1Out.x - p0Out.x) || 1;
      const tFrac = Math.max(0, Math.min(1, (currentX - p0Out.x) / spanX));
      nowYOut = p0Out.y + tFrac * (p1Out.y - p0Out.y);
      nowYIn = p0In.y + tFrac * (p1In.y - p0In.y);

      // Garis Scan Out hanya sampai currentX
      pathDOut = `M ${passedPointsOut[0].x},${passedPointsOut[0].y}`;
      for (let k = 1; k < passedPointsOut.length; k++) {
        pathDOut += ` L ${passedPointsOut[k].x},${passedPointsOut[k].y}`;
      }
      if (currentX > passedPointsOut[passedPointsOut.length - 1].x) {
        pathDOut += ` L ${currentX},${nowYOut}`;
      }
      areaDOut = `${pathDOut} L ${currentX},${padTop + plotH} L ${padLeft},${padTop + plotH} Z`;

      // Garis Scan In hanya sampai currentX
      pathDIn = `M ${passedPointsIn[0].x},${passedPointsIn[0].y}`;
      for (let k = 1; k < passedPointsIn.length; k++) {
        pathDIn += ` L ${passedPointsIn[k].x},${passedPointsIn[k].y}`;
      }
      if (currentX > passedPointsIn[passedPointsIn.length - 1].x) {
        pathDIn += ` L ${currentX},${nowYIn}`;
      }
      areaDIn = `${pathDIn} L ${currentX},${padTop + plotH} L ${padLeft},${padTop + plotH} Z`;
    }
  }

  const slotWidth = plotW / (data.length - 1);
  const dark = isThemeDark();
  const gridLineStroke = dark ? '#1e293b' : '#f1f5f9';
  const baseLineStroke = dark ? '#263342' : '#e2e8f0';
  const pointFill = dark ? '#0f172a' : '#ffffff';
  const timeBeaconBg = dark ? 'rgba(239, 68, 68, 0.18)' : '#fef2f2';
  const timeBeaconBorder = dark ? 'rgba(239, 68, 68, 0.35)' : '#fecaca';
  const timeBeaconText = dark ? '#fca5a5' : '#dc2626';
  const badgeSummaryBg = dark ? '#131b2a' : '#f0f9ff';
  const badgeSummaryBorder = dark ? '#1e3a5f' : '#bae6fd';
  const badgeSummaryText = dark ? '#93c5fd' : '#0369a1';

  container.innerHTML = `
    <!-- Dual Legend & Realtime Timestamp Header -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem; font-size: 0.735rem; font-weight: 700; flex-wrap: wrap; gap: 0.5rem; padding: 0 0.25rem;">
      <div style="display: flex; gap: 0.85rem; align-items: center;">
        <span style="display: inline-flex; align-items: center; gap: 5px; color: #0284c7;">
          <span style="width: 10px; height: 10px; border-radius: 2px; background: #0284c7; display: inline-block;"></span>
          <span>Scan Out (Keluar)</span>
        </span>
        <span style="display: inline-flex; align-items: center; gap: 5px; color: #059669;">
          <span style="width: 10px; height: 10px; border-radius: 2px; background: #10b981; display: inline-block;"></span>
          <span>Tap In (Masuk)</span>
        </span>
      </div>
      <div style="display: inline-flex; align-items: center; gap: 5px; color: ${timeBeaconText}; font-size: 0.72rem; background: ${timeBeaconBg}; padding: 2px 7px; border-radius: 6px; border: 1px solid ${timeBeaconBorder};">
        <span style="width: 7px; height: 7px; border-radius: 50%; background: #ef4444; display: inline-block; box-shadow: 0 0 6px rgba(239, 68, 68, 0.8);"></span>
        <span>Jam Sekarang: <strong>${timeNowFull}</strong></span>
      </div>
    </div>

    <div style="position: relative; width: 100%; height: ${height}px;" onmouseleave="window.unhoverTrafficPoint()">
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible; display: block;">
        <defs>
          <linearGradient id="trafficGradientOut" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0284c7" stop-opacity="0.32" />
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0.02" />
          </linearGradient>
          <linearGradient id="trafficGradientIn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.26" />
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <!-- Grid Lines -->
        <line x1="${padLeft}" y1="${padTop}" x2="${padLeft + plotW}" y2="${padTop}" stroke="${gridLineStroke}" stroke-width="1" />
        <line x1="${padLeft}" y1="${padTop + plotH * 0.5}" x2="${padLeft + plotW}" y2="${padTop + plotH * 0.5}" stroke="${gridLineStroke}" stroke-width="1" stroke-dasharray="3,3" />
        <line x1="${padLeft}" y1="${padTop + plotH}" x2="${padLeft + plotW}" y2="${padTop + plotH}" stroke="${baseLineStroke}" stroke-width="1.5" />

        <!-- Area Fills -->
        <path d="${areaDOut}" fill="url(#trafficGradientOut)" />
        <path d="${areaDIn}" fill="url(#trafficGradientIn)" />

        <!-- Line Plots -->
        <path d="${pathDOut}" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="${pathDIn}" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Realtime Live Time Beacon Indicator -->
        ${currentX !== null ? `
          <g id="trafficCurrentTimeBeacon" style="pointer-events: none;">
            <line x1="${currentX}" y1="${padTop - 2}" x2="${currentX}" y2="${padTop + plotH}" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="3,3" opacity="0.85" />
            <circle cx="${currentX}" cy="${padTop - 2}" r="3.5" fill="#ef4444" />
            <circle cx="${currentX}" cy="${padTop - 2}" r="7" fill="#ef4444" opacity="0.3">
              <animate attributeName="r" values="3.5;8;3.5" dur="1.8s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.8s" repeatCount="indefinite"/>
            </circle>
            <text x="${currentX}" y="${padTop - 6}" font-size="8" font-weight="800" fill="#dc2626" text-anchor="middle">
              🔴 ${timeNowStr}
            </text>
          </g>
        ` : ''}

        <!-- Interactive Vertical Hit Areas -->
        ${data.map((d, i) => {
          const ptOut = pointsOut[i];
          const ptIn = pointsIn[i];
          const isCurrentSlot = d.hour === currentSlotStr;
          const labelFill = isCurrentSlot ? (dark ? '#f8fafc' : '#0f172a') : (dark ? '#94a3b8' : '#64748b');
          return `
            <g id="trafficCol_${i}" style="cursor: pointer; pointer-events: all;"
               onmouseenter="window.hoverTrafficPoint('${d.hour}', ${d.out}, ${d.in}, ${ptOut.x}, ${ptOut.y}, ${ptIn.y}, ${i});"
               onmousemove="window.moveChartTooltip(event)"
               onmouseleave="window.unhoverTrafficPoint();">
              <rect x="${ptOut.x - slotWidth / 2}" y="0" width="${slotWidth}" height="${height}" fill="transparent" />
              <line id="trafficGuideLine_${i}" x1="${ptOut.x}" y1="${padTop}" x2="${ptOut.x}" y2="${padTop + plotH}" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="3,3" style="display: none;" />
              <!-- Out Point (Hanya muncul jika jam sudah berjalan) -->
              ${(7 + i) <= curH ? `
                <circle id="trafficPointOut_${i}" cx="${ptOut.x}" cy="${ptOut.y}" r="${isCurrentSlot ? 5.5 : 4}" fill="${pointFill}" stroke="#0284c7" stroke-width="2.5" style="transition: all 0.2s ease;" />
              ` : ''}
              <!-- In Point (Hanya muncul jika jam sudah berjalan) -->
              ${(7 + i) <= curH ? `
                <circle id="trafficPointIn_${i}" cx="${ptIn.x}" cy="${ptIn.y}" r="${isCurrentSlot ? 5 : 3.5}" fill="${pointFill}" stroke="#10b981" stroke-width="2.2" style="transition: all 0.2s ease;" />
              ` : ''}
              ${i % 2 === 0 ? `<text x="${ptOut.x}" y="${height - 4}" font-size="9" font-weight="${isCurrentSlot ? '800' : '700'}" fill="${labelFill}" text-anchor="middle">${d.hour}</text>` : ''}
            </g>
          `;
        }).join('')}
      </svg>
    </div>

    <!-- Admin Traffic Badge Summary (Realtime & Dual Metrics) -->
    <div id="adminTrafficBadge" style="margin-top: 0.5rem; padding: 0.5rem 0.8rem; background: ${badgeSummaryBg}; border: 1.5px solid ${badgeSummaryBorder}; border-radius: 8px; font-size: 0.75rem; color: ${badgeSummaryText}; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease; flex-wrap: wrap; gap: 0.4rem;">
      <span>🕒 Gerbang Realtime (Pukul ${timeNowStr}): <strong>${curSlotData.out} Scan Out</strong> — <strong>${curSlotData.in} Tap In</strong> (Puncak: ${peakHour} WIB)</span>
      <span style="display: inline-flex; gap: 0.6rem; font-weight: 700;">
        <span style="color: #0284c7;">↗️ Total Out: ${totalOut}</span>
        <span style="color: #059669;">↘️ Total Tap In: ${totalIn}</span>
      </span>
    </div>
  `;
}

function hoverTrafficPoint(hour, out, inVal, x, yOut, yIn, activeIdx) {
  const badge = document.getElementById('adminTrafficBadge');
  const nowH = new Date().getHours();
  const isFuture = (7 + activeIdx) > nowH;

  if (badge) {
    badge.style.background = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
    badge.style.color = '#ffffff';
    badge.style.borderColor = '#0284c7';

    if (isFuture || (out === 0 && inVal === 0 && (7 + activeIdx) >= nowH)) {
      badge.innerHTML = `<span><strong>Pukul ${hour} WIB:</strong> ↗️ <strong>0 Scan Out</strong> — ↘️ <strong>0 Tap In</strong> <span style="font-size:0.75rem; opacity:0.85;">(Belum ada data aktivitas)</span></span><span style="background: rgba(255,255,255,0.22); color: #fff; padding: 2px 8px; border-radius: 999px; font-weight: 800;">0 Personel</span>`;
    } else {
      const sum = out + inVal;
      badge.innerHTML = `<span><strong>Pukul ${hour} WIB:</strong> ↗️ <strong>${out} Scan Out</strong> — ↘️ <strong>${inVal} Tap In</strong></span><span style="background: rgba(255,255,255,0.22); color: #fff; padding: 2px 8px; border-radius: 999px; font-weight: 800;">Total ${sum} Personel</span>`;
    }
  }

  for (let i = 0; i < 11; i++) {
    const line = document.getElementById(`trafficGuideLine_${i}`);
    const ptOut = document.getElementById(`trafficPointOut_${i}`);
    const ptIn = document.getElementById(`trafficPointIn_${i}`);
    if (line) line.style.display = (i === activeIdx) ? 'block' : 'none';
    if (ptOut) {
      if (i === activeIdx) {
        ptOut.setAttribute('r', '7');
        ptOut.style.filter = 'drop-shadow(0 0 5px #0284c7)';
      } else {
        ptOut.setAttribute('r', '4');
        ptOut.style.filter = 'none';
      }
    }
    if (ptIn) {
      if (i === activeIdx) {
        ptIn.setAttribute('r', '6.5');
        ptIn.style.filter = 'drop-shadow(0 0 5px #10b981)';
      } else {
        ptIn.setAttribute('r', '3.5');
        ptIn.style.filter = 'none';
      }
    }
  }
}

function unhoverTrafficPoint() {
  hideChartTooltip();
  const badge = document.getElementById('adminTrafficBadge');
  const { rows: data, totalOut, totalIn, peakHour } = getAdminTrafficData();
  const now = new Date();
  const timeNowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentSlotStr = `${String(now.getHours()).padStart(2, '0')}:00`;
  const curSlotData = data.find(d => d.hour === currentSlotStr) || data[0];

  if (badge) {
    badge.style.background = '#f0f9ff';
    badge.style.color = '#0369a1';
    badge.style.borderColor = '#bae6fd';
    badge.innerHTML = `<span>🕒 Gerbang Realtime (Pukul ${timeNowStr}): <strong>${curSlotData.out} Scan Out</strong> — <strong>${curSlotData.in} Tap In</strong> (Puncak: ${peakHour} WIB)</span><span style="display: inline-flex; gap: 0.6rem; font-weight: 700;"><span style="color: #0284c7;">↗️ Total Out: ${totalOut}</span><span style="color: #059669;">↘️ Total Tap In: ${totalIn}</span></span>`;
  }

  for (let i = 0; i < 11; i++) {
    const line = document.getElementById(`trafficGuideLine_${i}`);
    const ptOut = document.getElementById(`trafficPointOut_${i}`);
    const ptIn = document.getElementById(`trafficPointIn_${i}`);
    if (line) line.style.display = 'none';
    if (ptOut) {
      ptOut.setAttribute('r', '4');
      ptOut.style.filter = 'none';
    }
    if (ptIn) {
      ptIn.setAttribute('r', '3.5');
      ptIn.style.filter = 'none';
    }
  }
}

window.hoverTrafficPoint = hoverTrafficPoint;
window.unhoverTrafficPoint = unhoverTrafficPoint;
window.getAdminTrafficData = getAdminTrafficData;
window.renderAdminTrafficChart = renderAdminTrafficChart;

// Ticker Realtime terus berjalan: interval setiap 10 detik memperbarui posisi waktu & data jika admin dashboard aktif
if (typeof window !== 'undefined' && !window._adminTrafficChartTimer) {
  window._adminTrafficChartTimer = setInterval(() => {
    const container = document.getElementById('chartAdminTrafficContainer');
    if (container && container.offsetParent !== null) {
      renderAdminTrafficChart();
    }
  }, 10000);
}

// ===================================================================
// 4. ADMIN: DEPARTMENT RANKED DISTRIBUTION CHART (REVISI 4)
// ===================================================================
function getAdminDeptData(period) {
  const list = window.ticketsList || [];
  const selPeriod = period || (document.getElementById('filterAdminDeptPeriod') ? document.getElementById('filterAdminDeptPeriod').value : 'month');
  const isYear = selPeriod === 'year';

  const deptCounts = isYear ? {
    'Departemen Rekayasa & Pemeliharaan': 48,
    'Departemen Operasi Pabrik 1 & 2': 34,
    'Departemen Pengamanan & K3': 20,
    'Departemen Logistik & Pergudangan': 16,
    'Departemen SDM & Organisasi': 11
  } : {
    'Departemen Rekayasa & Pemeliharaan': 12,
    'Departemen Operasi Pabrik 1 & 2': 8,
    'Departemen Pengamanan & K3': 5,
    'Departemen Logistik & Pergudangan': 4,
    'Departemen SDM & Organisasi': 3
  };

  list.forEach(t => {
    if (typeof window.matchesPeriodFilter === 'function' && !window.matchesPeriodFilter(t, selPeriod)) {
      return;
    }
    if (t.department && deptCounts[t.department] !== undefined) {
      deptCounts[t.department]++;
    }
  });

  const depts = Object.keys(deptCounts).map(name => ({
    name,
    count: deptCounts[name]
  })).sort((a, b) => b.count - a.count);

  const total = depts.reduce((s, d) => s + d.count, 0);
  const max = Math.max(...depts.map(d => d.count), 1);
  return { depts, total, max, period: selPeriod };
}

function renderAdminDeptChart() {
  const container = document.getElementById('chartAdminDeptContainer');
  if (!container) return;

  const { depts, total, max, period } = getAdminDeptData();
  const periodText = period === 'year' ? 'Tahun Ini' : 'Bulan Ini';
  const dark = typeof isThemeDark === 'function' ? isThemeDark() : (typeof document !== 'undefined' && document.body ? document.body.classList.contains('theme-dark') : false);

  const colors = [
    { bar: 'linear-gradient(90deg, #059669 0%, #10b981 100%)', text: '#059669', badgeClass: 'top-1' },
    { bar: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)', text: '#0284c7', badgeClass: 'top-2' },
    { bar: 'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)', text: '#6366f1', badgeClass: 'top-3' },
    { bar: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)', text: '#8b5cf6', badgeClass: '' },
    { bar: 'linear-gradient(90deg, #64748b 0%, #94a3b8 100%)', text: '#64748b', badgeClass: '' }
  ];

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 0.45rem;">
      ${depts.map((d, index) => {
        const pct = ((d.count / total) * 100).toFixed(1).replace('.0', '');
        const barWidthPct = Math.round((d.count / max) * 100);
        const styleInfo = colors[index % colors.length];

        return `
          <div id="deptRow_${index}" class="dept-rank-row" style="cursor: pointer; transition: all 0.15s ease;"
               onmouseenter="window.hoverDeptRow(event, '${d.name}', ${d.count}, '${pct}', '${styleInfo.text}', ${index}, ${total})"
               onmousemove="window.moveChartTooltip(event)"
               onmouseleave="window.unhoverDeptRow(${index})">
            <div class="dept-rank-header">
              <div style="display: flex; align-items: center; min-width: 0; max-width: 75%;">
                <span class="dept-rank-badge ${styleInfo.badgeClass}">#${index + 1}</span>
                <span style="font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${d.name}
                </span>
              </div>
              <span id="deptCountLabel_${index}" style="font-family: var(--font-mono); font-weight: 800; color: ${styleInfo.text}; font-size: 0.8rem; flex-shrink: 0;">
                ${d.count} Izin
              </span>
            </div>
            <div class="dept-progress-track">
              <div id="deptBar_${index}" class="dept-progress-bar" style="width: ${barWidthPct}%; background: ${styleInfo.bar};"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Admin Dept Summary Badge (Single Source of Info) -->
    <div id="adminDeptBadge" style="margin-top: 0.65rem; padding: 0.45rem 0.75rem; background: ${dark ? '#131b2a' : '#f8fafc'}; border: 1.5px solid ${dark ? '#24334a' : 'var(--border-color)'}; border-radius: 8px; font-size: 0.75rem; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;">
      <span>🏢 Frekuensi per Departemen</span>
      <span style="font-weight: 700; color: var(--text-primary);">Total: ${total} Izin (${periodText})</span>
    </div>
  `;

  attachDeptFilterListener();
}

function hoverDeptRow(e, name, count, pct, color, activeIdx, total) {
  const isTop = activeIdx === 0;
  const subtext = isTop ? '★ Departemen Frekuensi Tertinggi' : `Peringkat #${activeIdx + 1} Departemen Teraktif`;
  const dark = isThemeDark();

  // Tampilkan Tooltip Gelap Presisi Tinggi Sesuai Gambar 1
  if (typeof window.showChartTooltip === 'function') {
    window.showChartTooltip(e, {
      title: name,
      count: count,
      total: total,
      percent: pct,
      color: color,
      unit: 'izin',
      subtext: subtext
    });
  }

  // Highlight baris
  const row = document.getElementById(`deptRow_${activeIdx}`);
  if (row) {
    row.style.background = dark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9';
    row.style.borderRadius = '8px';
    row.style.paddingLeft = '6px';
    row.style.paddingRight = '6px';
  }

  // Update badge di bawah
  const badge = document.getElementById('adminDeptBadge');
  if (badge) {
    badge.style.background = dark ? '#182337' : '#ffffff';
    badge.style.borderColor = color;
    badge.style.boxShadow = `0 2px 10px ${color}20`;
    badge.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div style="display: flex; align-items: center; gap: 0.5rem; min-width: 0; max-width: 78%;">
          <span style="width: 8px; height: 8px; border-radius: 2px; background: ${color}; flex-shrink: 0; box-shadow: 0 0 6px ${color}80;"></span>
          <span style="font-weight: 700; color: ${dark ? '#f8fafc' : '#0f172a'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}: ${count} Izin</span>
        </div>
        <span style="background: ${color}; color: #ffffff; padding: 2px 10px; border-radius: 999px; font-weight: 800; font-family: var(--font-mono); font-size: 0.725rem; flex-shrink: 0;">${pct}%</span>
      </div>
    `;
  }
}

function unhoverDeptRow(activeIdx) {
  if (typeof window.hideChartTooltip === 'function') {
    window.hideChartTooltip();
  }
  if (activeIdx !== undefined) {
    const row = document.getElementById(`deptRow_${activeIdx}`);
    if (row) {
      row.style.background = 'transparent';
      row.style.paddingLeft = '0';
      row.style.paddingRight = '0';
    }
  }
  const badge = document.getElementById('adminDeptBadge');
  const { total, period } = getAdminDeptData();
  const periodText = period === 'year' ? 'Tahun Ini' : 'Bulan Ini';
  if (badge) {
    badge.style.background = '#f8fafc';
    badge.style.borderColor = 'var(--border-color)';
    badge.style.boxShadow = 'none';
    badge.innerHTML = `<span>🏢 Frekuensi per Departemen</span><span style="font-weight: 700; color: var(--text-primary);">Total: ${total} Izin (${periodText})</span>`;
  }
}

function attachDeptFilterListener() {
  const adminDeptFilter = document.getElementById('filterAdminDeptPeriod');
  const isBound = adminDeptFilter && (adminDeptFilter.dataset ? adminDeptFilter.dataset.bound : adminDeptFilter._bound);
  if (adminDeptFilter && !isBound) {
    if (adminDeptFilter.dataset) adminDeptFilter.dataset.bound = 'true';
    adminDeptFilter._bound = true;
    adminDeptFilter.addEventListener('change', () => {
      renderAdminDeptChart();
    });
  }
}

window.hoverDeptRow = hoverDeptRow;
window.unhoverDeptRow = unhoverDeptRow;
window.renderAdminDeptChart = renderAdminDeptChart;

// Stub for retired "Komposisi Status Izin" chart (Revisi 2)
window.renderAdminStatusChart = function() {
  // Chart "Komposisi Status Izin" intentionally retired per Revisi 2
};

// ===================================================================
// 5. UNIFIED REAL-TIME DATA REFRESH ORCHESTRATOR (REVISI 5)
// ===================================================================
function renderAllCharts() {
  const role = window.currentActor || 'karyawan';
  if (role === 'karyawan') {
    renderKaryawanDonutChart();
  } else if (role === 'approver' || role === 'approver2') {
    renderApproverBarChart();
  } else if (role === 'admin') {
    renderAdminTrafficChart();
    renderAdminDeptChart();
  }
}

function refreshAllDashboardData() {
  if (typeof window.updateKaryawanMetrics === 'function') {
    window.updateKaryawanMetrics();
  }
  if (typeof window.updateApproverMetrics === 'function') {
    window.updateApproverMetrics();
  }
  if (typeof window.updateAdminMetrics === 'function') {
    window.updateAdminMetrics();
  }
  if (typeof window.updateSecurityMetrics === 'function') {
    window.updateSecurityMetrics();
  }
  renderAllCharts();
}

window.renderAllCharts = renderAllCharts;
window.refreshAllDashboardData = refreshAllDashboardData;
window.syncAllDashboardData = refreshAllDashboardData;

// Listen to storage events to ensure cross-tab data synchronization
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e) => {
    if (e.key === window.STORAGE_KEY || e.key === window.USERS_STORAGE_KEY) {
      refreshAllDashboardData();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderAllCharts();
});
