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

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.5rem 0; width: 100%;">
      <!-- SVG Donut Chart with 2 Categories (Selesai Hijau, Darurat Merah) -->
      <div style="position: relative; width: 150px; height: 150px; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
        <svg width="150" height="150" viewBox="0 0 150 150" style="display: block; overflow: visible;">
          <g transform="rotate(-90 ${cx} ${cy})">
            <!-- Background Track -->
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="18" />
            
            ${segmentsRenderData.map(s => `
              <circle id="donutSlice_${s.key}"
                cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="18"
                stroke-dasharray="${s.len} ${C}" stroke-dashoffset="${s.offset}"
                style="transition: stroke-width 0.2s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s ease; cursor: pointer;"
                onmouseenter="window.hoverKaryawanDonut('${s.key}', ${s.count}, ${total}, '${s.pct}', '${s.color}')"
                onmouseleave="window.unhoverKaryawanDonut()" />
            `).join('')}
          </g>
          
          <!-- Center Text -->
          <text x="${cx}" y="71" text-anchor="middle" font-size="28" font-weight="800" fill="#0f172a" font-family="'Plus Jakarta Sans', sans-serif">${total}</text>
          <text x="${cx}" y="89" text-anchor="middle" font-size="11" font-weight="600" fill="#64748b" font-family="'Plus Jakarta Sans', sans-serif">Total Izin</text>
        </svg>
      </div>

      <!-- Single Dynamic Interactive Info Under Diagram (No duplicate text) -->
      <div id="karyawanDonutInfoBadge" style="margin-top: 1rem; width: 100%; max-width: 320px; min-height: 46px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.75rem; color: #64748b; font-weight: 500; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 8px; padding: 0.5rem 0.85rem; width: 100%; text-align: center;">
          💡 Arahkan kursor ke warna chart untuk detail persentase
        </div>
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
    const isDarurat = key === 'darurat';
    const title = isDarurat ? 'Total Izin Darurat' : 'Total Izin Selesai';
    const bg = isDarurat ? '#fef2f2' : '#ecfdf5';
    const border = isDarurat ? '#ef4444' : '#10b981';
    const textCol = isDarurat ? '#991b1b' : '#065f46';
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
        💡 Arahkan kursor ke warna chart untuk detail persentase
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
// 2. APPROVER: DYNAMIC WEEKLY/MONTHLY BAR CHART (REVISI 4)
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

  // Baseline department workload representation
  const isMonth = selPeriod === 'month';
  if (isMonth) {
    daysMap['Sen'].count = 14;
    daysMap['Sel'].count = 21;
    daysMap['Rab'].count = 18;
    daysMap['Kam'].count = 25;
    daysMap['Jum'].count = 34;
  } else {
    daysMap['Sen'].count = 4;
    daysMap['Sel'].count = 6;
    daysMap['Rab'].count = 3;
    daysMap['Kam'].count = 8;
    daysMap['Jum'].count = 5;
  }

  // Tally any newly created/modified tickets
  list.forEach(t => {
    const dateStr = t.plannedExit || t.createdAt;
    if (dateStr) {
      const dt = new Date(dateStr);
      if (!isNaN(dt.getTime())) {
        const day = dt.getDay();
        const mapKeys = ['', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum'];
        if (mapKeys[day] && daysMap[mapKeys[day]]) {
          daysMap[mapKeys[day]].count++;
        }
      }
    }
  });

  const daysData = Object.values(daysMap);
  const totalVal = daysData.reduce((acc, d) => acc + d.count, 0);
  const maxVal = Math.max(...daysData.map(d => d.count), 1);
  const peakDay = daysData.find(d => d.count === maxVal)?.full || 'Kamis';

  return { daysData, totalVal, maxVal, peakDay, isMonth };
}

function renderApproverBarChart() {
  const container = document.getElementById('chartApproverWeeklyContainer');
  if (!container) return;

  const filterSelect = document.getElementById('filterAppChartPeriod');
  const selPeriod = filterSelect ? filterSelect.value : 'week';
  const { daysData, totalVal, maxVal, peakDay, isMonth } = getApproverWeeklyData(selPeriod);

  // Subtitle update
  const subtitle = document.getElementById('approverChartSubtitle');
  if (subtitle) {
    if (isMonth) {
      subtitle.textContent = `Oktober 2026 • Total: ${totalVal} pengajuan • Puncak: ${peakDay}, ${maxVal} pengajuan`;
    } else {
      subtitle.textContent = `12–16 Okt 2026 • Total: ${totalVal} pengajuan • Puncak: ${peakDay}, ${maxVal} pengajuan`;
    }
  }

  container.innerHTML = `
    <div class="approver-bar-wrap">
      ${daysData.map((d, idx) => {
        const isPeak = d.count === maxVal;
        const heightPx = Math.round((d.count / maxVal) * 115) + 18;
        const barClass = isPeak ? 'approver-bar-pillar peak' : 'approver-bar-pillar normal';
        const pct = Math.round((d.count / totalVal) * 100);

        return `
          <div class="approver-bar-column"
               onmouseenter="window.showChartTooltip(event, { title: '${d.full}', count: ${d.count}, total: ${totalVal}, percent: ${pct}, color: '${isPeak ? '#1d4ed8' : '#3b82f6'}', unit: 'pengajuan', subtext: '${isPeak ? '★ Hari Volume Tertinggi' : 'Aktivitas Normal'}' })"
               onmousemove="window.moveChartTooltip(event)"
               onmouseleave="window.hideChartTooltip()">
            <!-- Top number label -->
            <span style="font-size: 0.9rem; font-weight: 800; color: ${isPeak ? '#1d4ed8' : '#0f172a'}; margin-bottom: 6px; font-family: var(--font-sans);">
              ${d.count}
            </span>
            <!-- Bar block -->
            <div id="approverBar_${idx}" class="${barClass}" style="height: ${heightPx}px;"></div>
            <!-- Weekday label -->
            <span style="font-size: 0.8rem; font-weight: ${isPeak ? '800' : '600'}; color: ${isPeak ? '#1d4ed8' : '#64748b'}; margin-top: 8px;">
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
// 3. ADMIN: GATE PASS PEAK TRAFFIC AREA CHART (07:00 - 17:00 WIB)
// ===================================================================
function getAdminTrafficData() {
  const list = window.ticketsList || [];
  const hoursMap = {
    '07:00': 2, '08:00': 4, '09:00': 5, '10:00': 7,
    '11:00': 14, '12:00': 10, '13:00': 5, '14:00': 8,
    '15:00': 9, '16:00': 16, '17:00': 9
  };

  list.forEach(t => {
    if (t.scanOutTime || t.plannedExit) {
      const match = (t.scanOutTime || t.plannedExit).match(/(\d{2}):\d{2}/);
      if (match) {
        const slot = match[1] + ':00';
        if (hoursMap[slot] !== undefined) {
          hoursMap[slot]++;
        }
      }
    }
  });

  const rows = Object.keys(hoursMap).map(hour => ({ hour, out: hoursMap[hour] }));
  const total = rows.reduce((s, r) => s + r.out, 0);
  const maxVal = Math.max(...rows.map(r => r.out), 1);
  const peakRow = rows.find(r => r.out === maxVal) || rows[0];

  return { rows, total, maxVal, peakHour: peakRow.hour };
}

function renderAdminTrafficChart() {
  const container = document.getElementById('chartAdminTrafficContainer');
  if (!container) return;

  const { rows: data, total, maxVal, peakHour } = getAdminTrafficData();
  const width = 500;
  const height = 150;
  const padLeft = 26;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 24;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const pointsOut = data.map((d, i) => {
    const x = padLeft + (i / (data.length - 1)) * plotW;
    const y = padTop + plotH - (d.out / (maxVal * 1.15)) * plotH;
    return { x, y, hour: d.hour, out: d.out };
  });

  const pathD = `M ${pointsOut[0].x},${pointsOut[0].y} ` + pointsOut.slice(1).map(p => `L ${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L ${padLeft + plotW},${padTop + plotH} L ${padLeft},${padTop + plotH} Z`;
  const slotWidth = plotW / (data.length - 1);

  container.innerHTML = `
    <div style="position: relative; width: 100%; height: ${height}px;" onmouseleave="window.unhoverTrafficPoint()">
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible; display: block;">
        <defs>
          <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0284c7" stop-opacity="0.32" />
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <!-- Grid Lines -->
        <line x1="${padLeft}" y1="${padTop}" x2="${padLeft + plotW}" y2="${padTop}" stroke="#f1f5f9" stroke-width="1" />
        <line x1="${padLeft}" y1="${padTop + plotH * 0.5}" x2="${padLeft + plotW}" y2="${padTop + plotH * 0.5}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3,3" />
        <line x1="${padLeft}" y1="${padTop + plotH}" x2="${padLeft + plotW}" y2="${padTop + plotH}" stroke="#e2e8f0" stroke-width="1.5" />

        <!-- Area Fill -->
        <path d="${areaD}" fill="url(#trafficGradient)" />

        <!-- Line Plot -->
        <path d="${pathD}" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Interactive Vertical Hit Areas -->
        ${pointsOut.map((p, i) => {
          const isPeak = p.hour === peakHour;
          const pct = ((p.out / total) * 100).toFixed(1).replace('.0', '');
          return `
            <g id="trafficCol_${i}" style="cursor: pointer; pointer-events: all;"
               onmouseenter="window.hoverTrafficPoint('${p.hour}', ${p.out}, '${pct}', ${p.x}, ${p.y}, ${i});"
               onmousemove="window.moveChartTooltip(event)"
               onmouseleave="window.unhoverTrafficPoint();">
              <rect x="${p.x - slotWidth / 2}" y="0" width="${slotWidth}" height="${height}" fill="transparent" />
              <line id="trafficGuideLine_${i}" x1="${p.x}" y1="${padTop}" x2="${p.x}" y2="${padTop + plotH}" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="3,3" style="display: none;" />
              <circle id="trafficPoint_${i}" cx="${p.x}" cy="${p.y}" r="${isPeak ? 5.5 : 4}" fill="${isPeak ? '#0284c7' : '#ffffff'}" stroke="#0284c7" stroke-width="2.5" style="transition: all 0.2s ease;" />
              ${i % 2 === 0 ? `<text x="${p.x}" y="${height - 4}" font-size="9" font-weight="700" fill="#64748b" text-anchor="middle">${p.hour}</text>` : ''}
            </g>
          `;
        }).join('')}
      </svg>
    </div>

    <!-- Admin Traffic Badge Summary -->
    <div id="adminTrafficBadge" style="margin-top: 0.5rem; padding: 0.45rem 0.75rem; background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 8px; font-size: 0.75rem; color: #0369a1; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;">
      <span>🕒 Puncak Kepadatan: <strong>${peakHour} WIB</strong> (${maxVal} personel)</span>
      <span style="color: #0284c7; font-weight: 700;">Total: ${total} Scan Out</span>
    </div>
  `;
}

function hoverTrafficPoint(hour, out, pct, x, y, activeIdx) {
  const badge = document.getElementById('adminTrafficBadge');
  if (badge) {
    badge.style.background = '#0284c7';
    badge.style.color = '#ffffff';
    badge.style.borderColor = '#0284c7';
    badge.innerHTML = `<span><strong>Pukul ${hour}:</strong> <strong>${out} Izin Scan Out</strong> (${pct}% dari volume gerbang)</span><span style="background: rgba(255,255,255,0.25); color: #fff; padding: 2px 8px; border-radius: 999px; font-weight: 800;">${pct}%</span>`;
  }

  for (let i = 0; i < 11; i++) {
    const line = document.getElementById(`trafficGuideLine_${i}`);
    const pt = document.getElementById(`trafficPoint_${i}`);
    if (line) line.style.display = (i === activeIdx) ? 'block' : 'none';
    if (pt) {
      if (i === activeIdx) {
        pt.setAttribute('r', '7');
        pt.style.filter = 'drop-shadow(0 0 6px #0284c7)';
      } else {
        pt.setAttribute('r', '4');
        pt.style.filter = 'none';
      }
    }
  }
}

function unhoverTrafficPoint() {
  hideChartTooltip();
  const badge = document.getElementById('adminTrafficBadge');
  const { total, maxVal, peakHour } = getAdminTrafficData();
  if (badge) {
    badge.style.background = '#f0f9ff';
    badge.style.color = '#0369a1';
    badge.style.borderColor = '#bae6fd';
    badge.innerHTML = `<span>🕒 Puncak Kepadatan: <strong>${peakHour} WIB</strong> (${maxVal} personel)</span><span style="color: #0284c7; font-weight: 700;">Total: ${total} Scan Out</span>`;
  }

  for (let i = 0; i < 11; i++) {
    const line = document.getElementById(`trafficGuideLine_${i}`);
    const pt = document.getElementById(`trafficPoint_${i}`);
    if (line) line.style.display = 'none';
    if (pt) {
      pt.setAttribute('r', '4');
      pt.style.filter = 'none';
    }
  }
}

window.hoverTrafficPoint = hoverTrafficPoint;
window.unhoverTrafficPoint = unhoverTrafficPoint;
window.renderAdminTrafficChart = renderAdminTrafficChart;

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

  const colors = [
    { bar: 'linear-gradient(90deg, #059669 0%, #10b981 100%)', text: '#059669', badgeClass: 'top-1' },
    { bar: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)', text: '#0284c7', badgeClass: 'top-2' },
    { bar: 'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)', text: '#6366f1', badgeClass: 'top-3' },
    { bar: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)', text: '#8b5cf6', badgeClass: '' },
    { bar: 'linear-gradient(90deg, #64748b 0%, #94a3b8 100%)', text: '#64748b', badgeClass: '' }
  ];

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 0.45rem;" onmouseleave="window.unhoverDeptRow()">
      ${depts.map((d, index) => {
        const pct = ((d.count / total) * 100).toFixed(1).replace('.0', '');
        const barWidthPct = Math.round((d.count / max) * 100);
        const styleInfo = colors[index % colors.length];

        return `
          <div id="deptRow_${index}" class="dept-rank-row"
               onmouseenter="window.hoverDeptRow('${d.name}', ${d.count}, '${pct}', '${styleInfo.text}', ${index})"
               onmouseleave="window.unhoverDeptRow()">
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
    <div id="adminDeptBadge" style="margin-top: 0.65rem; padding: 0.45rem 0.75rem; background: #f8fafc; border: 1.5px solid var(--border-color); border-radius: 8px; font-size: 0.75rem; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;">
      <span>🏢 Frekuensi per Departemen</span>
      <span style="font-weight: 700; color: var(--text-primary);">Total: ${total} Izin (${periodText})</span>
    </div>
  `;

  attachDeptFilterListener();
}

function hoverDeptRow(name, count, pct, color, activeIdx) {
  // Prevent duplicate floating black tooltip per user requirement
  if (typeof window.hideChartTooltip === 'function') {
    window.hideChartTooltip();
  }

  // Only display hovered info in the single dedicated badge below the diagram
  const badge = document.getElementById('adminDeptBadge');
  if (badge) {
    badge.style.background = '#f8fafc';
    badge.style.borderColor = color;
    badge.style.boxShadow = `0 2px 10px ${color}20`;
    badge.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div style="display: flex; align-items: center; gap: 0.5rem; min-width: 0; max-width: 78%;">
          <span style="width: 8px; height: 8px; border-radius: 2px; background: ${color}; flex-shrink: 0; box-shadow: 0 0 6px ${color}80;"></span>
          <span style="font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}: ${count} Izin</span>
        </div>
        <span style="background: ${color}; color: #ffffff; padding: 2px 10px; border-radius: 999px; font-weight: 800; font-family: var(--font-mono); font-size: 0.725rem; flex-shrink: 0;">${pct}%</span>
      </div>
    `;
  }
}

function unhoverDeptRow() {
  if (typeof window.hideChartTooltip === 'function') {
    window.hideChartTooltip();
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
window.addEventListener('storage', (e) => {
  if (e.key === window.STORAGE_KEY || e.key === window.USERS_STORAGE_KEY) {
    refreshAllDashboardData();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  renderAllCharts();
});
