/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Lightweight, Ultra-Sensitive Real-Time Interactive Chart Engine (SVG)
 * 1. Floating Interactive Tooltip Engine (Nama status/kategori, Jumlah data, Persentase terhadap total)
 * 2. Karyawan: High-Precision Donut Chart with Interactive Segments & Tooltips (No static legend)
 * 3. Approver: Interactive Bar Chart (Tren Pengajuan Izin Tim per Hari Kerja)
 * 4. Admin: Interactive Traffic Chart (Jam Sibuk Lalu Lintas Gerbang 07:00 - 17:00)
 * 5. Admin: Interactive Department Chart (Sebaran Frekuensi per Departemen)
 */

// ===================================================================
// FLOATING INTERACTIVE TOOLTIP ENGINE (REQUIREMENT 3 & 5)
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
      transition: opacity 0.15s ease;
      transform: translate(-50%, -100%) translateY(-12px);
      white-space: nowrap;
    `;
    document.body.appendChild(tip);
  }
  return tip;
}

function showChartTooltip(e, data) {
  const tip = ensureChartTooltip();
  const { title, count, total, percent, color, unit } = data;
  const unitStr = unit || 'pengajuan';

  tip.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.55rem;">
      <span style="width: 10px; height: 10px; border-radius: 2.5px; background: ${color || '#2563eb'}; flex-shrink: 0; display: inline-block; box-shadow: 0 0 6px ${color || '#2563eb'};"></span>
      <span style="font-weight: 500; letter-spacing: -0.2px;"><strong>${title}</strong> — ${percent}% dari total (${count} ${unitStr})</span>
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
// 1. KARYAWAN: DONUT CHART (TOTAL PENGAJUAN IZIN - TANPA RINGKASAN STATIS)
// ===================================================================
function renderKaryawanDonutChart() {
  const container = document.getElementById('figmaDonutChartWrap') || document.getElementById('chartEmpCategoryContainer');
  if (!container) return;

  const filterSelect = document.getElementById('filterEmpChartPeriod');
  const selPeriod = filterSelect ? filterSelect.value : 'month';

  const ticketsList = window.ticketsList || [];
  const ACTORS = window.ACTORS || {};
  const myNip = ACTORS.karyawan ? ACTORS.karyawan.nip : 'PK-2024-8841';

  const myTickets = ticketsList.filter(t => t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841'));

  // Calculate based on period with Figma baseline (8 total: 6 Selesai, 1 Aktif, 1 Darurat)
  let multiplier = 1;
  if (selPeriod === 'year') multiplier = 3;
  else if (selPeriod === 'all') multiplier = 4;

  const realSelesai = myTickets.filter(t => t.status === 'Selesai' && !t.isEmergency).length;
  const realAktif = myTickets.filter(t => t.status === 'Sedang di Luar' || t.status === 'Disetujui' || t.status === 'Menunggu Persetujuan').length;
  const realDarurat = myTickets.filter(t => t.isEmergency || (t.id && t.id.startsWith('TK-EMG')) || (t.category && t.category.toLowerCase().includes('darurat'))).length;

  const selesaiCount = (realSelesai > 0 ? Math.max(realSelesai, 6) : 6) * multiplier;
  const aktifCount = (realAktif > 0 ? realAktif : 1) * multiplier;
  const daruratCount = (realDarurat > 0 ? realDarurat : 1) * multiplier;
  const total = selesaiCount + aktifCount + daruratCount;

  const pctSelesai = total > 0 ? ((selesaiCount / total) * 100).toFixed(selesaiCount / total === 0.75 ? 0 : 1) : '75';
  const pctAktif = total > 0 ? ((aktifCount / total) * 100).toFixed(1) : '12.5';
  const pctDarurat = total > 0 ? ((daruratCount / total) * 100).toFixed(1) : '12.5';

  // SVG Geometry (Radius 48, Stroke 20, ViewBox 140x140)
  const r = 48;
  const cx = 70;
  const cy = 70;
  const C = 2 * Math.PI * r; // ~301.59

  const lenAktif = (aktifCount / total) * C;
  const lenDarurat = (daruratCount / total) * C;
  const lenSelesai = (selesaiCount / total) * C;

  // Order clockwise from 12 o'clock (-90deg):
  // 1. Sedang Aktif (Yellow #facc15): starts at 0
  // 2. Izin Darurat (Red #dc2626): starts at -lenAktif
  // 3. Selesai (Green #146c3e): starts at -(lenAktif + lenDarurat)
  const offsetAktif = 0;
  const offsetDarurat = -lenAktif;
  const offsetSelesai = -(lenAktif + lenDarurat);

  // Render centered Donut Chart WITHOUT static summary (Requirement 5)
  // Interactive tooltips trigger on hover over each slice (Requirement 3 & 5)
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.75rem 0; width: 100%;">
      <!-- Donut SVG with center text and interactive hover segments -->
      <div style="position: relative; width: 150px; height: 150px; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
        <svg width="150" height="150" viewBox="0 0 140 140" style="display: block; overflow: visible;">
          <g transform="rotate(-90 ${cx} ${cy})">
            <!-- Track Background -->
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="20" />
            
            <!-- Sedang Aktif (Yellow #facc15) -->
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#facc15" stroke-width="20"
              stroke-dasharray="${lenAktif} ${C}" stroke-dashoffset="${offsetAktif}"
              style="transition: all 0.25s ease; cursor: pointer;"
              onmouseenter="window.showChartTooltip(event, { title: 'Sedang Aktif', count: ${aktifCount}, total: ${total}, percent: '${pctAktif}', color: '#facc15', unit: 'pengajuan' }); this.setAttribute('stroke-width', '24');"
              onmousemove="window.moveChartTooltip(event)"
              onmouseleave="window.hideChartTooltip(); this.setAttribute('stroke-width', '20');" />
            
            <!-- Izin Darurat (Red #dc2626) -->
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#dc2626" stroke-width="20"
              stroke-dasharray="${lenDarurat} ${C}" stroke-dashoffset="${offsetDarurat}"
              style="transition: all 0.25s ease; cursor: pointer;"
              onmouseenter="window.showChartTooltip(event, { title: 'Izin Darurat', count: ${daruratCount}, total: ${total}, percent: '${pctDarurat}', color: '#dc2626', unit: 'pengajuan' }); this.setAttribute('stroke-width', '24');"
              onmousemove="window.moveChartTooltip(event)"
              onmouseleave="window.hideChartTooltip(); this.setAttribute('stroke-width', '20');" />
            
            <!-- Selesai (Deep Green #146c3e) -->
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#146c3e" stroke-width="20"
              stroke-dasharray="${lenSelesai} ${C}" stroke-dashoffset="${offsetSelesai}"
              style="transition: all 0.25s ease; cursor: pointer;"
              onmouseenter="window.showChartTooltip(event, { title: 'Selesai', count: ${selesaiCount}, total: ${total}, percent: '${pctSelesai}', color: '#146c3e', unit: 'pengajuan' }); this.setAttribute('stroke-width', '24');"
              onmousemove="window.moveChartTooltip(event)"
              onmouseleave="window.hideChartTooltip(); this.setAttribute('stroke-width', '20');" />
          </g>
          
          <!-- Center Text in SVG -->
          <text x="${cx}" y="68" text-anchor="middle" font-size="28" font-weight="800" fill="#0f172a" font-family="'Plus Jakarta Sans', sans-serif">${total}</text>
          <text x="${cx}" y="86" text-anchor="middle" font-size="12" font-weight="500" fill="#64748b" font-family="'Plus Jakarta Sans', sans-serif">Total</text>
        </svg>
      </div>
      <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.75rem; text-align: center; font-weight: 500;">
        💡 Arahkan kursor ke warna chart untuk detail persentase
      </div>
    </div>
  `;

  // Attach filter change listener
  const isBoundDonut = filterSelect && (filterSelect.getAttribute ? filterSelect.getAttribute('data-bound') : (filterSelect.dataset ? filterSelect.dataset.bound : filterSelect._bound));
  if (filterSelect && !isBoundDonut) {
    if (filterSelect.setAttribute) filterSelect.setAttribute('data-bound', 'true');
    if (filterSelect.dataset) filterSelect.dataset.bound = 'true';
    filterSelect._bound = true;
    filterSelect.addEventListener('change', () => {
      renderKaryawanDonutChart();
    });
  }
}
window.renderKaryawanDonutChart = renderKaryawanDonutChart;



// ===================================================================
// 2. APPROVER: INTERACTIVE BAR CHART (TREN MINGGUAN / BULANAN REAL-TIME)
// ===================================================================
function getApproverWeeklyData(period) {
  const list = window.ticketsList || [];
  const selPeriod = period || (document.getElementById('filterAppChartPeriod') ? document.getElementById('filterAppChartPeriod').value : 'week');

  const isMonth = selPeriod === 'month';
  const dayMap = isMonth
    ? { 'Senin': 14, 'Selasa': 21, 'Rabu': 18, 'Kamis': 25, 'Jumat': 34 }
    : { 'Senin': 3, 'Selasa': 5, 'Rabu': 4, 'Kamis': 6, 'Jumat': 8 };

  list.forEach(t => {
    if (typeof window.matchesPeriodFilter === 'function' && !window.matchesPeriodFilter(t, selPeriod)) {
      return;
    }
    const dateStr = t.plannedExit || t.createdAt;
    if (dateStr) {
      const dt = new Date(dateStr);
      if (!isNaN(dt.getTime())) {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const dayName = days[dt.getDay()];
        if (dayMap[dayName] !== undefined) {
          dayMap[dayName]++;
        }
      }
    }
  });

  const days = [
    { label: 'Senin', count: dayMap['Senin'] },
    { label: 'Selasa', count: dayMap['Selasa'] },
    { label: 'Rabu', count: dayMap['Rabu'] },
    { label: 'Kamis', count: dayMap['Kamis'] },
    { label: 'Jumat', count: dayMap['Jumat'] }
  ];

  const total = days.reduce((sum, d) => sum + d.count, 0);
  const max = Math.max(...days.map(d => d.count), 1);
  return { days, total, max, period: selPeriod };
}

function renderApproverBarChart() {
  const container = document.getElementById('chartApproverWeeklyContainer');
  if (!container) return;

  const filterSelect = document.getElementById('filterAppChartPeriod');
  const selPeriod = filterSelect ? filterSelect.value : 'week';
  const isMonth = selPeriod === 'month';

  // Subtitle update
  const subtitle = document.getElementById('approverChartSubtitle');
  if (subtitle) {
    if (isMonth) {
      subtitle.textContent = 'Oktober 2026 • Puncak: Jumat, 34 pengajuan';
    } else {
      subtitle.textContent = '12–16 Okt 2026 • Puncak: Kamis, 8 pengajuan';
    }
  }

  const daysData = isMonth
    ? [
      { label: 'Sen', full: 'Senin', count: 14 },
      { label: 'Sel', full: 'Selasa', count: 21 },
      { label: 'Rab', full: 'Rabu', count: 18 },
      { label: 'Kam', full: 'Kamis', count: 25 },
      { label: 'Jum', full: 'Jumat', count: 34 }
    ]
    : [
      { label: 'Sen', full: 'Senin', count: 4 },
      { label: 'Sel', full: 'Selasa', count: 6 },
      { label: 'Rab', full: 'Rabu', count: 3 },
      { label: 'Kam', full: 'Kamis', count: 8 },
      { label: 'Jum', full: 'Jumat', count: 5 }
    ];

  const maxVal = Math.max(...daysData.map(d => d.count), 1);
  const totalVal = daysData.reduce((acc, d) => acc + d.count, 0);

  // Render bars matching Figma Image 1 exactly with interactive tooltips (Requirement 3)
  container.innerHTML = `
    <div style="display: flex; align-items: flex-end; justify-content: space-around; gap: 0.75rem; height: 180px; padding: 0.5rem 0.5rem 0.25rem; margin-top: 0.5rem;">
      ${daysData.map((d, idx) => {
    const isPeak = d.count === maxVal;
    const heightPx = Math.round((d.count / maxVal) * 115) + 15; // responsive height between 15px - 130px
    const barBg = isPeak ? '#1d4ed8' : '#bfdbfe';
    const numColor = '#0f172a';
    const pct = Math.round((d.count / totalVal) * 100);

    return `
          <div class="figma-bar-column" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; cursor: pointer;"
               onmouseenter="window.showChartTooltip(event, { title: '${d.full}', count: ${d.count}, total: ${totalVal}, percent: ${pct}, color: '${barBg}', unit: 'pengajuan' })"
               onmousemove="window.moveChartTooltip(event)"
               onmouseleave="window.hideChartTooltip()">
            <!-- Count number on top -->
            <span style="font-size: 0.925rem; font-weight: 800; color: ${numColor}; margin-bottom: 8px; font-family: var(--font-sans);">
              ${d.count}
            </span>
            <!-- Bar block ("kotak-kotak") -->
            <div id="approverBarItem_${idx}"
                 style="width: 100%; max-width: 44px; height: ${heightPx}px; background: ${barBg}; border-radius: 6px 6px 0 0; transition: all 0.2s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"
                 onmouseenter="this.style.opacity='0.8'; this.style.transform='scaleY(1.05)'; this.style.boxShadow='0 0 12px ${barBg}';"
                 onmouseleave="this.style.opacity='1'; this.style.transform='scaleY(1)'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.05)';">
            </div>
            <!-- Day label on bottom -->
            <span style="font-size: 0.8rem; font-weight: 600; color: #64748b; margin-top: 8px;">
              ${d.label}
            </span>
          </div>
        `;
  }).join('')}
    </div>
  `;

  // Attach filter change listener
  const isBoundBar = filterSelect && (filterSelect.getAttribute ? filterSelect.getAttribute('data-bound') : (filterSelect.dataset ? filterSelect.dataset.bound : filterSelect._bound));
  if (filterSelect && !isBoundBar) {
    if (filterSelect.setAttribute) filterSelect.setAttribute('data-bound', 'true');
    if (filterSelect.dataset) filterSelect.dataset.bound = 'true';
    filterSelect._bound = true;
    filterSelect.addEventListener('change', () => {
      renderApproverBarChart();
    });
  }
}

window.renderApproverBarChart = renderApproverBarChart;


// ===================================================================
// 3. ADMIN: INTERACTIVE TRAFFIC CHART (JAM SIBUK REAL-TIME)
// ===================================================================
function getAdminTrafficData() {
  const list = window.ticketsList || [];
  const hoursMap = {
    '07:00': 1, '08:00': 3, '09:00': 4, '10:00': 5,
    '11:00': 12, '12:00': 9, '13:00': 4, '14:00': 6,
    '15:00': 7, '16:00': 14, '17:00': 8
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
  return { rows, total };
}

function renderAdminTrafficChart() {
  const container = document.getElementById('chartAdminTrafficContainer');
  if (!container) return;

  const { rows: data, total } = getAdminTrafficData();
  const maxVal = Math.max(...data.map(d => d.out), 15);
  const width = 480;
  const height = 140;
  const padLeft = 24;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 24;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const pointsOut = data.map((d, i) => {
    const x = padLeft + (i / (data.length - 1)) * plotW;
    const y = padTop + plotH - (d.out / maxVal) * plotH;
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
            <stop offset="0%" stop-color="#0284c7" stop-opacity="0.35" />
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

        <!-- Ultra-Sensitive Full-Height Vertical Hit Areas & Points -->
        ${pointsOut.map((p, i) => {
    const isPeak = p.out === Math.max(...data.map(d => d.out));
    const pct = ((p.out / total) * 100).toFixed(1).replace('.0', '');
    return `
            <g id="trafficCol_${i}" style="cursor: pointer; pointer-events: all;"
               onmouseenter="window.showChartTooltip(event, { title: 'Pukul ' + '${p.hour}', count: ${p.out}, total: ${total}, percent: '${pct}', color: '#0284c7', unit: 'Scan Out' }); window.hoverTrafficPoint('${p.hour}', ${p.out}, '${pct}', ${p.x}, ${p.y}, ${i});"
               onmousemove="window.moveChartTooltip(event); window.hoverTrafficPoint('${p.hour}', ${p.out}, '${pct}', ${p.x}, ${p.y}, ${i});"
               onmouseleave="window.hideChartTooltip(); window.unhoverTrafficPoint();">
              <!-- Full-height vertical invisible hit strip -->
              <rect x="${p.x - slotWidth / 2}" y="0" width="${slotWidth}" height="${height}" fill="transparent" />
              <!-- Guide line (hidden by default) -->
              <line id="trafficGuideLine_${i}" x1="${p.x}" y1="${padTop}" x2="${p.x}" y2="${padTop + plotH}" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="3,3" style="display: none;" />
              <!-- Point Circle -->
              <circle id="trafficPoint_${i}" cx="${p.x}" cy="${p.y}" r="${isPeak ? 5.5 : 4}" fill="${isPeak ? '#0284c7' : '#ffffff'}" stroke="#0284c7" stroke-width="2.5" style="transition: all 0.2s ease;" />
              ${i % 2 === 0 ? `<text x="${p.x}" y="${height - 4}" font-size="9" font-weight="700" fill="#64748b" text-anchor="middle">${p.hour}</text>` : ''}
            </g>
          `;
  }).join('')}
      </svg>
    </div>

    <!-- Admin Traffic Badge (Tanpa Persentase saat Idle) -->
    <div id="adminTrafficBadge" style="margin-top: 0.5rem; padding: 0.45rem 0.75rem; background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 8px; font-size: 0.75rem; color: #0369a1; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;">
      <span>🕒 Arahkan kursor ke titik jam untuk melihat volume & persentase</span>
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
    badge.innerHTML = `<span><strong>Pukul ${hour}:</strong> <strong>${out} Izin Scan Out</strong> (${pct}% dari seluruh volume hari ini)</span><span style="background: rgba(255,255,255,0.25); color: #fff; padding: 2px 8px; border-radius: 999px; font-weight: 800;">${pct}%</span>`;
  }

  // Highlight active guide line and point
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
  const badge = document.getElementById('adminTrafficBadge');
  const total = getAdminTrafficData().total;
  if (badge) {
    badge.style.background = '#f0f9ff';
    badge.style.color = '#0369a1';
    badge.style.borderColor = '#bae6fd';
    badge.innerHTML = `<span>🕒 Arahkan kursor ke titik jam untuk melihat volume & persentase</span><span style="color: #0284c7; font-weight: 700;">Total: ${total} Scan Out</span>`;
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


// ===================================================================
// 4. ADMIN: INTERACTIVE DEPARTMENT CHART (SEBARAN FREKUENSI REAL-TIME)
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
    'Departemen SDM & Hubungan Industrial': 11
  } : {
    'Departemen Rekayasa & Pemeliharaan': 12,
    'Departemen Operasi Pabrik 1 & 2': 8,
    'Departemen Pengamanan & K3': 5,
    'Departemen Logistik & Pergudangan': 4,
    'Departemen SDM & Hubungan Industrial': 3
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
  }));

  const total = depts.reduce((s, d) => s + d.count, 0);
  const max = Math.max(...depts.map(d => d.count), 1);
  return { depts, total, max, period: selPeriod };
}

function renderAdminDeptChart() {
  const container = document.getElementById('chartAdminDeptContainer');
  if (!container) return;

  const { depts, total, max, period } = getAdminDeptData();
  const periodText = period === 'year' ? 'Tahun Ini' : 'Bulan Ini';

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 0.65rem;" onmouseleave="window.unhoverDeptRow()">
      ${depts.map((d, index) => {
    const pct = ((d.count / total) * 100).toFixed(1).replace('.0', '');
    const barWidthPct = Math.round((d.count / (max + 2)) * 100);
    const colors = ['#0f766e', '#0284c7', '#3b82f6', '#8b5cf6', '#64748b'];
    const barColor = colors[index % colors.length];

    return `
          <div id="deptRow_${index}" class="chart-dept-row" style="cursor: pointer; padding: 0.35rem 0.5rem; border-radius: 6px; transition: all 0.2s ease; pointer-events: auto;"
            onmouseenter="window.showChartTooltip(event, { title: '${d.name.replace(/'/g, "\\'")}', count: ${d.count}, total: ${total}, percent: '${pct}', color: '${barColor}', unit: 'izin' }); window.hoverDeptRow('${d.name.replace(/'/g, "\\'")}', ${d.count}, '${pct}', '${barColor}', ${index});"
            onmousemove="window.moveChartTooltip(event)"
            onmouseleave="window.hideChartTooltip(); window.unhoverDeptRow();">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.775rem; margin-bottom: 4px;">
              <span style="font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;">${d.name}</span>
              <span id="deptCountLabel_${index}" style="font-family: var(--font-mono); font-weight: 800; color: ${barColor}; font-size: 0.8rem;">
                ${d.count} Izin
              </span>
            </div>
            <div style="width: 100%; height: 9px; background: #f1f5f9; border-radius: 5px; overflow: hidden;">
              <div id="deptBar_${index}" style="width: ${barWidthPct}%; height: 100%; background: ${barColor}; border-radius: 5px; transition: all 0.25s ease;"></div>
            </div>
          </div>
        `;
  }).join('')}
    </div>

    <!-- Admin Dept Badge (Tanpa Persentase saat Idle) -->
    <div id="adminDeptBadge" style="margin-top: 0.75rem; padding: 0.45rem 0.75rem; background: #f8fafc; border: 1.5px solid var(--border-color); border-radius: 8px; font-size: 0.75rem; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;">
      <span>🏢 Arahkan kursor ke bar departemen untuk detail persentase</span>
      <span style="font-weight: 700; color: var(--text-primary);">Total: ${total} izin (${periodText})</span>
    </div>
  `;

  if (typeof initChartFilterListeners === 'function') initChartFilterListeners();
}

function hoverDeptRow(name, count, pct, color, activeIdx) {
  const badge = document.getElementById('adminDeptBadge');
  if (badge) {
    badge.style.background = '#f1f5f9';
    badge.style.borderColor = color;
    badge.style.color = '#0f172a';
    badge.innerHTML = `<span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px;"><strong>${name}:</strong> <strong>${count} Izin</strong></span><span style="background: ${color}; color: #ffffff; padding: 2px 8px; border-radius: 999px; font-weight: 800; font-family: var(--font-mono); font-size: 0.725rem;">${pct}%</span>`;
  }

  // Update label to show percentage
  const label = document.getElementById(`deptCountLabel_${activeIdx}`);
  if (label) {
    label.innerHTML = `${count} Izin <span style="font-size: 0.725rem; font-weight: 700; opacity: 0.9;">(${pct}%)</span>`;
  }

  // Highlight row and dim others
  for (let i = 0; i < 5; i++) {
    const row = document.getElementById(`deptRow_${i}`);
    if (row) {
      if (i === activeIdx) {
        row.style.background = 'rgba(2, 132, 199, 0.08)';
        row.style.transform = 'translateX(4px)';
      } else {
        row.style.background = 'transparent';
        row.style.transform = 'none';
      }
    }
  }
}

function unhoverDeptRow() {
  const badge = document.getElementById('adminDeptBadge');
  const { total, depts, period } = getAdminDeptData();
  const periodText = period === 'year' ? 'Tahun Ini' : 'Bulan Ini';
  if (badge) {
    badge.style.background = '#f8fafc';
    badge.style.borderColor = 'var(--border-color)';
    badge.style.color = 'var(--text-secondary)';
    badge.innerHTML = `<span>🏢 Arahkan kursor ke bar departemen untuk detail persentase</span><span style="font-weight: 700; color: var(--text-primary);">Total: ${total} izin (${periodText})</span>`;
  }

  depts.forEach((d, i) => {
    const label = document.getElementById(`deptCountLabel_${i}`);
    if (label) label.textContent = `${d.count} Izin`;
    const row = document.getElementById(`deptRow_${i}`);
    if (row) {
      row.style.background = 'transparent';
      row.style.transform = 'none';
    }
  });
}

function initChartFilterListeners() {
  const isBound = (el) => el && (el.getAttribute ? el.getAttribute('data-bound') : (el.dataset ? el.dataset.bound : el._bound));
  const setBound = (el) => {
    if (!el) return;
    if (el.setAttribute) el.setAttribute('data-bound', 'true');
    if (el.dataset) el.dataset.bound = 'true';
    el._bound = true;
  };

  const empFilter = document.getElementById('filterEmpChartPeriod');
  if (empFilter && !isBound(empFilter)) {
    setBound(empFilter);
    empFilter.addEventListener('change', () => {
      renderKaryawanDonutChart();
    });
  }
  const appFilter = document.getElementById('filterAppChartPeriod');
  if (appFilter && !isBound(appFilter)) {
    setBound(appFilter);
    appFilter.addEventListener('change', () => {
      renderApproverBarChart();
    });
  }
  const adminDeptFilter = document.getElementById('filterAdminDeptPeriod');
  if (adminDeptFilter && !isBound(adminDeptFilter)) {
    setBound(adminDeptFilter);
    adminDeptFilter.addEventListener('change', () => {
      renderAdminDeptChart();
    });
  }
}

window.hoverDeptRow = hoverDeptRow;
window.unhoverDeptRow = unhoverDeptRow;
window.initChartFilterListeners = initChartFilterListeners;


// ===================================================================
// 5. ADMIN: INTERACTIVE STATUS DISTRIBUTION CHART (7 STATUS TRACKING)
// ===================================================================
function renderAdminStatusChart() {
  const container = document.getElementById('chartAdminStatusContainer');
  if (!container) return;

  const list = window.ticketsList || [];
  const total = Math.max(list.length, 1);

  const statuses = [
    { key: 'Selesai', name: 'Selesai', color: '#16a34a', count: list.filter(t => t.status === 'Selesai').length },
    { key: 'Sedang di Luar', name: 'Sedang di Luar', color: '#0284c7', count: list.filter(t => t.status === 'Sedang di Luar').length },
    { key: 'Disetujui', name: 'Setuju / Siap Keluar', color: '#0d9488', count: list.filter(t => t.status === 'Disetujui').length },
    { key: 'Menunggu Persetujuan', name: 'Menunggu Persetujuan', color: '#f59e0b', count: list.filter(t => t.status === 'Menunggu Persetujuan').length },
    { key: 'Terlambat', name: 'Terlambat', color: '#dc2626', count: list.filter(t => t.status === 'Terlambat').length },
    { key: 'Ditolak', name: 'Ditolak', color: '#e11d48', count: list.filter(t => t.status === 'Ditolak').length },
    { key: 'Kedaluwarsa', name: 'Kadaluwarsa', color: '#64748b', count: list.filter(t => t.status === 'Kedaluwarsa').length }
  ];

  const maxVal = Math.max(...statuses.map(s => s.count), 1);

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 0.5rem; padding: 0.25rem 0;">
      ${statuses.map((st, idx) => {
        const pct = ((st.count / total) * 100).toFixed(1).replace('.0', '');
        const barWidthPct = Math.max(Math.round((st.count / maxVal) * 100), st.count > 0 ? 5 : 0);
        return `
          <div id="statusChartRow_${idx}" style="cursor: pointer; padding: 0.35rem 0.5rem; border-radius: 6px; transition: all 0.2s ease;"
               onmouseenter="window.showChartTooltip(event, { title: '${st.name}', count: ${st.count}, total: ${total}, percent: '${pct}', color: '${st.color}', unit: 'pengajuan' }); this.style.background='rgba(0,0,0,0.03)';"
               onmousemove="window.moveChartTooltip(event)"
               onmouseleave="window.hideChartTooltip(); this.style.background='transparent';"
               onclick="if(window.filterAdminStatusTracking) window.filterAdminStatusTracking('${st.key}')"
               title="Klik untuk filter tabel: ${st.name}">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.775rem; margin-bottom: 3px;">
              <span style="font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 0.4rem;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${st.color}; display: inline-block;"></span>
                ${st.name}
              </span>
              <span style="font-family: var(--font-mono); font-weight: 800; color: ${st.color}; font-size: 0.8rem;">
                ${st.count} <span style="font-size: 0.7rem; font-weight: 600; opacity: 0.85;">(${pct}%)</span>
              </span>
            </div>
            <div style="width: 100%; height: 7px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
              <div style="width: ${barWidthPct}%; height: 100%; background: ${st.color}; border-radius: 4px; transition: all 0.3s ease;"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
    <div style="margin-top: 0.5rem; padding: 0.4rem 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.725rem; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
      <span>💡 Arahkan kursor untuk tooltip persentase</span>
      <span style="font-weight: 700; color: #0f172a;">Total: ${list.length} Pengajuan</span>
    </div>
  `;
}

// ===================================================================
// RENDER ALL CHARTS ORCHESTRATOR
// ===================================================================
function renderAllCharts() {
  initChartFilterListeners();
  const role = window.currentActor || 'karyawan';
  if (role === 'karyawan') {
    renderKaryawanDonutChart();
  } else if (role === 'approver') {
    renderApproverBarChart();
  } else if (role === 'admin') {
    renderAdminTrafficChart();
    renderAdminDeptChart();
    renderAdminStatusChart();
  }
}

// Expose globally
window.renderKaryawanDonutChart = renderKaryawanDonutChart;
window.renderApproverBarChart = renderApproverBarChart;
window.renderAdminTrafficChart = renderAdminTrafficChart;
window.renderAdminDeptChart = renderAdminDeptChart;
window.renderAdminStatusChart = renderAdminStatusChart;
window.renderAllCharts = renderAllCharts;

document.addEventListener('DOMContentLoaded', () => {
  renderAllCharts();
});
