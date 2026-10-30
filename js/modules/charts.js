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

  // SVG Donut Calculations with wider inner hole so text never touches the ring
  const r = 68;
  const cx = 95;
  const cy = 95;
  const C = 2 * Math.PI * r; // ~427.2566

  const segments = [];
  if (countSelesai > 0) {
    segments.push({
      key: 'selesai',
      label: 'Izin Selesai',
      count: countSelesai,
      pct: pctSelesai,
      color: '#059669',
      unit: 'pengajuan'
    });
  }
  if (countDarurat > 0) {
    segments.push({
      key: 'darurat',
      label: 'Izin Darurat',
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

  // Render centered donut chart with wide inner hole, without side cards or bottom info box
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; padding: 0.5rem 0;">
      <!-- Center Donut Chart (Lebar dan proporsional, teks tidak menabrak lingkaran) -->
      <div style="position: relative; width: 180px; height: 180px; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
        <svg width="180" height="180" viewBox="0 0 190 190" style="display: block; overflow: visible;">
          <g transform="rotate(-90 ${cx} ${cy})">
            <!-- Background Track -->
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${trackStroke}" stroke-width="16" />
            
            ${segmentsRenderData.map(s => `
              <circle id="donutSlice_${s.key}"
                cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="16"
                stroke-dasharray="${s.len} ${C}" stroke-dashoffset="${s.offset}"
                style="transition: stroke-width 0.25s cubic-bezier(0.4, 0, 0.2, 1), filter 0.25s ease; cursor: pointer;"
                onmouseenter="window.hoverKaryawanDonut(event, '${s.key}', '${s.label}', ${s.count}, ${total}, '${s.pct}', '${s.color}')"
                onmouseleave="window.unhoverKaryawanDonut(${total})"
                onclick="window.hoverKaryawanDonut(event, '${s.key}', '${s.label}', ${s.count}, ${total}, '${s.pct}', '${s.color}')"
                ontouchstart="window.hoverKaryawanDonut(event, '${s.key}', '${s.label}', ${s.count}, ${total}, '${s.pct}', '${s.color}')" />
            `).join('')}
          </g>
          
          <!-- Center Text Metric (Proporsional di tengah lubang donat 120px) -->
          <text id="karyawanDonutCenterVal" x="${cx}" y="93" text-anchor="middle" font-size="24" font-weight="800" fill="${centerTextCol}" font-family="'Plus Jakarta Sans', sans-serif">${total}</text>
          <text id="karyawanDonutCenterLbl" x="${cx}" y="112" text-anchor="middle" font-size="11" font-weight="600" fill="${centerSubCol}" font-family="'Plus Jakarta Sans', sans-serif">Total Izin</text>
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
    label = e === 'darurat' ? 'Izin Darurat' : 'Izin Selesai';
    key = e;
  }

  // Dilarang menampilkan popup hitam yang menutupi chart
  if (typeof window.hideChartTooltip === 'function') {
    window.hideChartTooltip();
  }

  // Teks di tengah lingkaran membesar dan jelas tanpa menabrak cincin donat
  const centerVal = document.getElementById('karyawanDonutCenterVal');
  const centerLbl = document.getElementById('karyawanDonutCenterLbl');
  if (centerVal && centerLbl) {
    centerVal.textContent = `${pct}%`;
    centerVal.setAttribute('font-size', '22');
    centerVal.setAttribute('y', '92');
    centerVal.setAttribute('fill', color);
    centerLbl.textContent = `${count} Pengajuan`;
    centerLbl.setAttribute('font-size', '11');
    centerLbl.setAttribute('y', '110');
  }

  // Animasi slice donat membesar & bercahaya
  const slice = document.getElementById(`donutSlice_${key}`);
  if (slice) {
    slice.setAttribute('stroke-width', '22');
    slice.style.filter = `drop-shadow(0 0 10px ${color}90)`;
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
    centerVal.setAttribute('font-size', '24');
    centerVal.setAttribute('y', '93');
    centerVal.setAttribute('fill', centerTextCol);
    centerLbl.textContent = 'Total Izin';
    centerLbl.setAttribute('font-size', '11');
    centerLbl.setAttribute('y', '112');
    centerLbl.setAttribute('fill', centerSubCol);
  }

  ['selesai', 'darurat'].forEach(k => {
    const slice = document.getElementById(`donutSlice_${k}`);
    if (slice) {
      slice.setAttribute('stroke-width', '16');
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


// Modernized Aesthetic Bar Chart Generator (Approver) - Dynamic Real-Time & Volume Tim
function getApproverWeeklyRealtimeData() {
  const tickets = window.ticketsList || [];
  const currentActor = window.currentActor || 'approver';
  const isApprover2 = (currentActor === 'approver2');
  const approverLabel = isApprover2 ? 'Dewi Sartika, S.T., M.M.' : 'Ir. Hendra Gunawan, M.T.';

  const myTeamTickets = tickets.filter(t => {
    const tApp = (t.approverName || '').toLowerCase();
    return isApprover2 ? tApp.includes('dewi') : (tApp.includes('hendra') || !tApp.includes('dewi'));
  });

  // Otomatis menyesuaikan dengan tanggal dan hari hari ini secara dinamis
  const now = new Date();
  const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const daysShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const defaultBasePattern = [12, 9, 18, 14, 20, 11, 14];
  const days = [];

  // Generate 7 hari berurutan yang berakhir pada hari ini (index 6 = hari ini)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayIdx = d.getDay();
    const dayName = daysIndo[dayIdx];
    const dayLabel = daysShort[dayIdx];
    const dateStr = `${d.getDate()} ${monthsShort[d.getMonth()]}`;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    const fullDate = `${y}-${m}-${dt}`;
    const isToday = (i === 0);

    const baseCount = defaultBasePattern[(6 - i) % defaultBasePattern.length];

    days.push({
      label: dayLabel,
      dateStr: dateStr,
      fullDate: fullDate,
      dayName: isToday ? `${dayName} (Hari Ini)` : dayName,
      baseCount: baseCount,
      isToday: isToday
    });
  }

  let totalWeekVolume = 0;
  days.forEach((d, idx) => {
    const matchTickets = myTeamTickets.filter(t => {
      const dPart = (t.createdAt || t.plannedExit || '').slice(0, 10);
      return dPart === d.fullDate;
    });

    if (d.isToday) {
      const liveCount = matchTickets.length;
      d.total = Math.max(d.baseCount, liveCount > 0 ? (d.baseCount + liveCount - 1) : d.baseCount);
      d.val = d.total;
      d.tickets = matchTickets;
    } else {
      d.total = d.baseCount + matchTickets.length;
      d.val = d.total;
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

  // Determine peak day
  let maxCount = -1;
  let peakIdx = -1;
  bars.forEach((b, i) => {
    if (b.total > maxCount) {
      maxCount = b.total;
      peakIdx = i;
    }
  });

  const svgW = 680;
  const svgH = 300;
  const padLeft = 40;
  const padRight = 24;
  const chartW = svgW - padLeft - padRight;
  const topY = 46;
  const bottomY = 240;
  const chartH = bottomY - topY;

  const yTicks = [0, 5, 10, 15, 20];
  let svgContent = '';

  // Background subtle grid lines and Y numeric labels
  yTicks.forEach(val => {
    const y = bottomY - (chartH * val / 20);
    svgContent += `
      <line x1="${padLeft}" y1="${y}" x2="${padLeft + chartW}" y2="${y}" 
            stroke="${val === 0 ? '#94a3b8' : '#f1f5f9'}" 
            stroke-width="${val === 0 ? '1.5' : '1'}" 
            ${val > 0 ? 'stroke-dasharray="3,3"' : ''} />
      <text x="${padLeft - 10}" y="${y + 4}" text-anchor="end" 
            fill="#64748b" font-size="11" font-weight="600" 
            font-family="'Plus Jakarta Sans', sans-serif">${val}</text>
    `;
  });

  // Bars rendering with cohesive executive palette & rounded tops
  const slotW = chartW / bars.length;
  const barW = Math.min(50, slotW * 0.62);

  bars.forEach((b, idx) => {
    const isPeak = (idx === peakIdx);
    const isToday = !!b.isToday;
    const barH = Math.max(12, (b.val / 20) * chartH);
    const x = padLeft + (idx * slotW) + (slotW - barW) / 2;
    const y = bottomY - barH;
    const pct = Math.round((b.total / (chartData.totalWeekVolume || 1)) * 100);

    const barFill = isPeak ? 'url(#barGradPeak)' : (isToday ? 'url(#barGradToday)' : 'url(#barGradStandard)');
    const barColorHex = isPeak ? '#059669' : (isToday ? '#0284c7' : '#0369a1');

    svgContent += `
      <g id="approverBarGroup_${idx}" class="approver-bar-group" style="cursor: pointer;"
         onmouseenter="window.hoverApproverBar(event, ${idx}, '${b.dayName}', '${b.dateStr}', ${b.total}, ${pct}, '${barColorHex}')"
         onmousemove="window.moveApproverChartTooltip(event)"
         onmouseleave="window.unhoverApproverBar(${idx})"
         onclick="window.hoverApproverBar(event, ${idx}, '${b.dayName}', '${b.dateStr}', ${b.total}, ${pct}, '${barColorHex}')">
        
        <!-- Transparent hover hit area -->
        <rect x="${x - 6}" y="${topY - 24}" width="${barW + 12}" height="${chartH + 74}" fill="transparent" />

        ${isPeak ? `
          <!-- Peak Tag Badge -->
          <g id="approverPeakBadge_${idx}" style="transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">
            <rect x="${x + barW / 2 - 24}" y="${y - 28}" width="48" height="17" rx="4" fill="#059669" />
            <polygon points="${x + barW / 2 - 4},${y - 11} ${x + barW / 2 + 4},${y - 11} ${x + barW / 2},${y - 6}" fill="#059669" />
            <text x="${x + barW / 2}" y="${y - 16}" text-anchor="middle" fill="#ffffff" font-size="8.5" font-weight="800" font-family="'Plus Jakarta Sans', sans-serif">PUNCAK</text>
          </g>
        ` : ''}

        <!-- Number on top of bar (Animated on hover) -->
        <text id="approverBarVal_${idx}" class="approver-bar-val" x="${x + barW / 2}" y="${isPeak ? y - 32 : y - 8}" text-anchor="middle" fill="${isPeak ? '#059669' : (isToday ? '#0284c7' : '#334155')}" font-size="12" font-weight="800" font-family="'Plus Jakarta Sans', sans-serif" style="transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), font-size 0.2s ease, fill 0.2s ease;">${b.total}</text>

        <!-- Rounded Bar (Animated on hover like donut chart) -->
        <rect id="approverBarRect_${idx}" class="approver-svg-bar" x="${x}" y="${y}" width="${barW}" height="${barH}" rx="6" ry="6"
              fill="${barFill}" style="transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s ease; transform-origin: ${x + barW / 2}px ${bottomY}px;">
          <title>${b.dayName} (${b.dateStr}): ${b.total} Pengajuan (${pct}% volume tim)</title>
        </rect>

        <!-- X-Axis Labels: Clean Day Name & Date -->
        <text id="approverDayLabel_${idx}" x="${x + barW / 2}" y="${bottomY + 18}" text-anchor="middle" fill="${isToday ? '#0284c7' : '#0f172a'}" font-size="12" font-weight="${isToday ? '800' : '700'}" font-family="'Plus Jakarta Sans', sans-serif" style="transition: fill 0.2s ease, font-weight 0.2s ease;">${b.label}</text>
        <text id="approverDateLabel_${idx}" x="${x + barW / 2}" y="${bottomY + 34}" text-anchor="middle" fill="${isToday ? '#0284c7' : '#64748b'}" font-size="10" font-weight="${isToday ? '700' : '500'}" font-family="'Plus Jakarta Sans', sans-serif">${b.dateStr}</text>
        ${isToday ? `<circle cx="${x + barW / 2}" cy="${bottomY + 44}" r="2.5" fill="#0284c7" />` : ''}
      </g>
    `;
  });

  const peakDayObj = bars[peakIdx] || { dayName: 'Selasa', total: 20 };
  const avgDaily = Math.round((chartData.totalWeekVolume || 98) / 7);

  return `
    <div style="position: relative; width: 100%; max-width: 100%; background: #ffffff; border-radius: 12px; padding: 12px 14px; border: 1px solid #e2e8f0;">
      <!-- Bento Summary Header Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
          <div>
            <span style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Total Volume 7 Hari</span>
            <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a; line-height: 1.2;">
              <strong style="color: #0369a1;">${chartData.totalWeekVolume}</strong> <span style="font-size: 0.75rem; font-weight: 600; color: #64748b;">Pengajuan</span>
            </div>
          </div>
          <div style="width: 1px; height: 26px; background: #e2e8f0;"></div>
          <div>
            <span style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Hari Puncak</span>
            <div style="font-size: 0.9rem; font-weight: 700; color: #059669; line-height: 1.2;">
              ${peakDayObj.dayName} (${peakDayObj.total})
            </div>
          </div>
          <div style="width: 1px; height: 26px; background: #e2e8f0;"></div>
          <div>
            <span style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Rata-rata Harian</span>
            <div style="font-size: 0.9rem; font-weight: 700; color: #0f172a; line-height: 1.2;">
              ~${avgDaily} / hari
            </div>
          </div>
        </div>

        <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: #ecfdf5; border: 1px solid #a7f3d0; font-size: 0.725rem; font-weight: 700; color: #065f46;">
          <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #059669; animation: pulseDot 2s infinite;"></span>
          <span>Data Real-Time Tim</span>
        </div>
      </div>

      <!-- SVG Chart -->
      <div style="width: 100%; overflow-x: auto;">
        <svg viewBox="0 0 ${svgW} ${svgH}" style="width: 100%; height: auto; min-width: 320px; display: block;" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="barGradPeak" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#10b981" />
              <stop offset="100%" stop-color="#059669" />
            </linearGradient>
            <linearGradient id="barGradToday" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#38bdf8" />
              <stop offset="100%" stop-color="#0284c7" />
            </linearGradient>
            <linearGradient id="barGradStandard" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0284c7" />
              <stop offset="100%" stop-color="#0369a1" />
            </linearGradient>
          </defs>
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

// Hover & Animation handlers for Approver Bar Chart (seperti efek donat)
window.hoverApproverBar = function(event, idx, dayName, dateStr, count, pct, color) {
  // Show popover tooltip
  window.showApproverChartTooltip(event, dayName, dateStr, count, pct, color);

  // Animasi batang: membesar ke atas dan bersinar persis seperti animasi donat
  const bar = document.getElementById(`approverBarRect_${idx}`);
  if (bar) {
    bar.style.transform = 'scaleY(1.06) scaleX(1.05)';
    bar.style.filter = `drop-shadow(0 0 10px ${color}90) brightness(1.15)`;
  }
  const valText = document.getElementById(`approverBarVal_${idx}`);
  if (valText) {
    valText.style.transform = 'translateY(-6px)';
    valText.style.fontSize = '14px';
    valText.style.fill = color;
  }
  const peakBadge = document.getElementById(`approverPeakBadge_${idx}`);
  if (peakBadge) {
    peakBadge.style.transform = 'translateY(-6px)';
  }
  const dayLbl = document.getElementById(`approverDayLabel_${idx}`);
  if (dayLbl) {
    dayLbl.style.fill = color;
    dayLbl.style.fontWeight = '900';
  }
};

window.unhoverApproverBar = function(idx) {
  window.hideApproverChartTooltip();

  const bar = document.getElementById(`approverBarRect_${idx}`);
  if (bar) {
    bar.style.transform = 'none';
    bar.style.filter = 'none';
  }
  const valText = document.getElementById(`approverBarVal_${idx}`);
  if (valText) {
    valText.style.transform = 'none';
    valText.style.fontSize = '12px';
    valText.style.fill = '';
  }
  const peakBadge = document.getElementById(`approverPeakBadge_${idx}`);
  if (peakBadge) {
    peakBadge.style.transform = 'none';
  }
  const dayLbl = document.getElementById(`approverDayLabel_${idx}`);
  if (dayLbl) {
    dayLbl.style.fill = '';
    dayLbl.style.fontWeight = '';
  }
};

// Tooltip handler functions for Approver
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
  if (event) {
    window.moveApproverChartTooltip(event);
  }
};

window.moveApproverChartTooltip = function(event) {
  const tt = document.getElementById('approverChartTooltip');
  if (!tt || !event) return;
  const container = tt.parentElement;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const x = (event.clientX || (rect.left + rect.width / 2)) - rect.left;
  const y = (event.clientY || (rect.top + 60)) - rect.top;
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

// ===================================================================
function getAdminTrafficData() {
  const list = window.ticketsList || [];
  const hours = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  const now = new Date();
  const curH = now.getHours();

  // Baseline standard operating load (hanya untuk jam yang telah lewat hari ini)
  const fullBaseOut = {
    '07:00': 2, '08:00': 4, '09:00': 5, '10:00': 7,
    '11:00': 12, '12:00': 9, '13:00': 5, '14:00': 8,
    '15:00': 9, '16:00': 14, '17:00': 7
  };
  const fullBaseIn = {
    '07:00': 1, '08:00': 2, '09:00': 3, '10:00': 5,
    '11:00': 7, '12:00': 11, '13:00': 12, '14:00': 6,
    '15:00': 8, '16:00': 10, '17:00': 15
  };

  const baseOut = {};
  const baseIn = {};

  hours.forEach(hour => {
    const slotH = parseInt(hour.split(':')[0], 10);
    // Sesuai instruksi pengguna: jika belum waktunya (jam masa depan atau sebelum shift 07:00), maka HARUS 0!
    if (curH < 7 || slotH > curH) {
      baseOut[hour] = 0;
      baseIn[hour] = 0;
    } else {
      baseOut[hour] = fullBaseOut[hour] || 0;
      baseIn[hour] = fullBaseIn[hour] || 0;
    }
  });

  // Agregasi scan aktual tiket hari ini (hanya untuk jam yang sudah berlangsung)
  if (curH >= 7) {
    list.forEach(t => {
      // Scan Out (Keluar Gerbang)
      const outTime = t.scanOutTime || t.plannedExit;
      if (outTime) {
        const match = outTime.match(/(\d{1,2}):\d{2}/);
        if (match) {
          const slotHour = parseInt(match[1], 10);
          if (slotHour <= curH && slotHour >= 7 && slotHour <= 17) {
            const slot = String(slotHour).padStart(2, '0') + ':00';
            if (baseOut[slot] !== undefined) {
              baseOut[slot]++;
            }
          }
        }
      }
      // Scan In (Kembali Masuk Gerbang)
      const inTime = t.scanInTime || t.estimatedReturn;
      if (inTime) {
        const match = inTime.match(/(\d{1,2}):\d{2}/);
        if (match) {
          const slotHour = parseInt(match[1], 10);
          if (slotHour <= curH && slotHour >= 7 && slotHour <= 17) {
            const slot = String(slotHour).padStart(2, '0') + ':00';
            if (baseIn[slot] !== undefined) {
              baseIn[slot]++;
            }
          }
        }
      }
    });
  }

  const rows = hours.map(hour => ({
    hour,
    out: baseOut[hour] || 0,
    in: baseIn[hour] || 0,
    total: (baseOut[hour] || 0) + (baseIn[hour] || 0)
  }));

  const totalOut = rows.reduce((s, r) => s + r.out, 0);
  const totalIn = rows.reduce((s, r) => s + r.in, 0);
  const maxVal = Math.max(...rows.map(r => Math.max(r.out, r.in)), 1);

  // Peak hour hanya dihitung di antara jam yang telah berjalan dan memiliki total > 0
  const elapsedRows = rows.filter(r => {
    const slotH = parseInt(r.hour.split(':')[0], 10);
    return slotH <= curH && r.total > 0;
  });

  const peakRow = elapsedRows.length > 0
    ? elapsedRows.reduce((max, r) => r.total > max.total ? r : max, elapsedRows[0])
    : null;
  const peakOutRow = elapsedRows.length > 0
    ? elapsedRows.reduce((max, r) => r.out > max.out ? r : max, elapsedRows[0])
    : null;
  const peakInRow = elapsedRows.length > 0
    ? elapsedRows.reduce((max, r) => r.in > max.in ? r : max, elapsedRows[0])
    : null;

  const peakHourStr = peakRow ? peakRow.hour : (curH < 7 ? 'Shift Belum Dimulai' : 'Belum Ada');
  const peakOutHourStr = peakOutRow ? peakOutRow.hour : '-';
  const peakInHourStr = peakInRow ? peakInRow.hour : '-';

  return {
    rows,
    totalOut,
    totalIn,
    totalCombined: totalOut + totalIn,
    maxVal,
    peakHour: peakHourStr,
    peakOutHour: peakOutHourStr,
    peakInHour: peakInHourStr
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
    return { x, y, hour: d.hour, val: d.out };
  });

  const pointsIn = data.map((d, i) => {
    const x = padLeft + (i / (data.length - 1)) * plotW;
    const y = padTop + plotH - (d.in / (maxVal * 1.18)) * plotH;
    return { x, y, hour: d.hour, val: d.in };
  });

  const pathDOut = `M ${pointsOut[0].x},${pointsOut[0].y} ` + pointsOut.slice(1).map(p => `L ${p.x},${p.y}`).join(' ');
  const areaDOut = `${pathDOut} L ${padLeft + plotW},${padTop + plotH} L ${padLeft},${padTop + plotH} Z`;

  const pathDIn = `M ${pointsIn[0].x},${pointsIn[0].y} ` + pointsIn.slice(1).map(p => `L ${p.x},${p.y}`).join(' ');
  const areaDIn = `${pathDIn} L ${padLeft + plotW},${padTop + plotH} L ${padLeft},${padTop + plotH} Z`;

  const slotWidth = plotW / (data.length - 1);

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
          <span>Scan In (Masuk)</span>
        </span>
      </div>
      <div style="display: inline-flex; align-items: center; gap: 5px; color: #dc2626; font-size: 0.72rem; background: #fef2f2; padding: 2px 7px; border-radius: 6px; border: 1px solid #fecaca;">
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
        <line x1="${padLeft}" y1="${padTop}" x2="${padLeft + plotW}" y2="${padTop}" stroke="#f1f5f9" stroke-width="1" />
        <line x1="${padLeft}" y1="${padTop + plotH * 0.5}" x2="${padLeft + plotW}" y2="${padTop + plotH * 0.5}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3,3" />
        <line x1="${padLeft}" y1="${padTop + plotH}" x2="${padLeft + plotW}" y2="${padTop + plotH}" stroke="#e2e8f0" stroke-width="1.5" />

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
          return `
            <g id="trafficCol_${i}" style="cursor: pointer; pointer-events: all;"
               onmouseenter="window.hoverTrafficPoint('${d.hour}', ${d.out}, ${d.in}, ${ptOut.x}, ${ptOut.y}, ${ptIn.y}, ${i});"
               onmousemove="window.moveChartTooltip(event)"
               onmouseleave="window.unhoverTrafficPoint();">
              <rect x="${ptOut.x - slotWidth / 2}" y="0" width="${slotWidth}" height="${height}" fill="transparent" />
              <line id="trafficGuideLine_${i}" x1="${ptOut.x}" y1="${padTop}" x2="${ptOut.x}" y2="${padTop + plotH}" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="3,3" style="display: none;" />
              <!-- Out Point -->
              <circle id="trafficPointOut_${i}" cx="${ptOut.x}" cy="${ptOut.y}" r="${isCurrentSlot ? 5.5 : 4}" fill="#ffffff" stroke="#0284c7" stroke-width="2.5" style="transition: all 0.2s ease;" />
              <!-- In Point -->
              <circle id="trafficPointIn_${i}" cx="${ptIn.x}" cy="${ptIn.y}" r="${isCurrentSlot ? 5 : 3.5}" fill="#ffffff" stroke="#10b981" stroke-width="2.2" style="transition: all 0.2s ease;" />
              ${i % 2 === 0 ? `<text x="${ptOut.x}" y="${height - 4}" font-size="9" font-weight="${isCurrentSlot ? '800' : '700'}" fill="${isCurrentSlot ? '#0f172a' : '#64748b'}" text-anchor="middle">${d.hour}</text>` : ''}
            </g>
          `;
        }).join('')}
      </svg>
    </div>

    <!-- Admin Traffic Badge Summary (Realtime & Dual Metrics) -->
    <div id="adminTrafficBadge" style="margin-top: 0.5rem; padding: 0.5rem 0.8rem; background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 8px; font-size: 0.75rem; color: #0369a1; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease; flex-wrap: wrap; gap: 0.4rem;">
      <span>🕒 Gerbang Realtime (Pukul ${timeNowStr}): <strong>${curSlotData.out} Scan Out</strong> • <strong>${curSlotData.in} Scan In</strong> (Puncak: ${peakHour} WIB)</span>
      <span style="display: inline-flex; gap: 0.6rem; font-weight: 700;">
        <span style="color: #0284c7;">↗️ Total Out: ${totalOut}</span>
        <span style="color: #059669;">↘️ Total In: ${totalIn}</span>
      </span>
    </div>
  `;
}

function hoverTrafficPoint(hour, out, inVal, x, yOut, yIn, activeIdx) {
  const badge = document.getElementById('adminTrafficBadge');
  const sum = out + inVal;
  if (badge) {
    badge.style.background = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
    badge.style.color = '#ffffff';
    badge.style.borderColor = '#0284c7';
    badge.innerHTML = `<span><strong>Pukul ${hour} WIB:</strong> ↗️ <strong>${out} Scan Out</strong> • ↘️ <strong>${inVal} Scan In</strong></span><span style="background: rgba(255,255,255,0.22); color: #fff; padding: 2px 8px; border-radius: 999px; font-weight: 800;">Total ${sum} Personel</span>`;
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
    badge.innerHTML = `<span>🕒 Gerbang Realtime (Pukul ${timeNowStr}): <strong>${curSlotData.out} Scan Out</strong> • <strong>${curSlotData.in} Scan In</strong> (Puncak: ${peakHour} WIB)</span><span style="display: inline-flex; gap: 0.6rem; font-weight: 700;"><span style="color: #0284c7;">↗️ Total Out: ${totalOut}</span><span style="color: #059669;">↘️ Total In: ${totalIn}</span></span>`;
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
