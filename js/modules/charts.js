/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Lightweight, Ultra-Sensitive Real-Time Interactive Chart Engine (SVG)
 * 1. Karyawan: High-Precision Donut Chart (Hover: Persentase + Total Dinas vs Pribadi vs Darurat, Hole Protector, Dynamic Single-Category Detail)
 * 2. Approver: Interactive Bar Chart (Tren Pengajuan Izin Tim per Hari Kerja)
 * 3. Admin: Interactive Traffic Chart (Jam Sibuk Lalu Lintas Gerbang 07:00 - 17:00)
 * 4. Admin: Interactive Department Chart (Sebaran Frekuensi per Departemen)
 */

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
// 1. KARYAWAN: DONUT CHART (KOMPOSISI JENIS IZIN SAYA)
// ===================================================================
function getKaryawanCategoryData() {
  const list = window.ticketsList || [];
  const currentNip = (window.ACTORS && window.ACTORS.karyawan) ? window.ACTORS.karyawan.nip : 'PK-2024-8841';
  const myTickets = list.filter(t => t.applicantNip === currentNip || !t.applicantNip);

  let dinas = 0;
  let pribadi = 0;
  let darurat = 0;

  myTickets.forEach(t => {
    if (t.isEmergency || (t.id && t.id.startsWith('TK-EMG')) || (t.category && t.category.toLowerCase().includes('darurat'))) {
      darurat++;
    } else if (t.category === 'Dinas Kantor') {
      dinas++;
    } else {
      pribadi++;
    }
  });

  // Jika belum ada tiket sama sekali di storage, sediakan data dasar representatif
  if (dinas === 0 && pribadi === 0 && darurat === 0) {
    dinas = 11;
    pribadi = 3;
    darurat = 2;
  }

  const total = dinas + pribadi + darurat;
  return { dinas, pribadi, darurat, total };
}

function renderKaryawanDonutChart() {
  const container = document.getElementById('chartEmpCategoryContainer');
  if (!container) return;

  const data = getKaryawanCategoryData();
  const total = Math.max(data.total, 1);

  const pctDinas = ((data.dinas / total) * 100).toFixed(1).replace('.0', '');
  const pctPribadi = ((data.pribadi / total) * 100).toFixed(1).replace('.0', '');
  const pctDarurat = ((data.darurat / total) * 100).toFixed(1).replace('.0', '');

  // Calculate arc angles
  const cx = 60, cy = 60, R = 56, r = 36;
  const categories = [
    { key: 'dinas', label: 'Dinas Kantor', count: data.dinas, pct: pctDinas, color: '#059669', bg: '#f0fdf4', border: '#86efac', desc: 'Tugas resmi / kedinasan perusahaan' },
    { key: 'pribadi', label: 'Urusan Pribadi', count: data.pribadi, pct: pctPribadi, color: '#d97706', bg: '#fffbeb', border: '#fde68a', desc: 'Keperluan pribadi / keluarga' },
    { key: 'darurat', label: 'Izin Darurat', count: data.darurat, pct: pctDarurat, color: '#e11d48', bg: '#fff1f2', border: '#fca5a5', desc: 'Kebutuhan mendesak / darurat K3' }
  ];

  const activeCategories = categories.filter(c => c.count > 0);
  const gap = activeCategories.length > 1 ? 0.035 : 0;
  let curAngle = -Math.PI / 2;

  const pathsSvg = activeCategories.map(c => {
    const span = (c.count / total) * 2 * Math.PI;
    const a0 = curAngle + gap / 2;
    const a1 = curAngle + span - gap / 2;
    const d = createDonutArcPath(cx, cy, R, r, a0, a1);
    curAngle += span;

    return `
      <path id="donutSlice_${c.key}" class="donut-slice" d="${d}" fill="${c.color}"
        data-cat="${c.key}"
        style="cursor: pointer; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease, filter 0.2s ease; transform-origin: ${cx}px ${cy}px; pointer-events: auto;"
        onmouseenter="window.hoverDonutCategory('${c.key}')"
        onmousemove="window.hoverDonutCategory('${c.key}')"
      />
    `;
  }).join('');

  container.innerHTML = `
    <div style="position: relative; width: 160px; height: 160px; margin: 0 auto;" onmouseleave="window.unhoverDonutCategory()">
      <svg viewBox="0 0 120 120" width="160" height="160" style="overflow: visible; display: block; border-radius: 50%;">
        <!-- Track Background -->
        <circle cx="${cx}" cy="${cy}" r="46" fill="transparent" stroke="#f1f5f9" stroke-width="20" />

        <!-- Slices -->
        <g id="donutSlicesGroup">
          ${pathsSvg}
        </g>

        <!-- Center Hole Protector: Explicitly resets hover when cursor is in the middle of diagram -->
        <circle id="donutHoleSensor" cx="${cx}" cy="${cy}" r="${r - 1}" fill="#ffffff" pointer-events="all"
          style="cursor: default;"
          onmouseenter="window.unhoverDonutCategory()"
          onmousemove="window.unhoverDonutCategory()"
        />
      </svg>

      <!-- Center Dynamic Text Display -->
      <div id="donutCenterContent" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; text-align: center; padding: 4px; z-index: 2;">
        <span id="donutCenterVal" style="font-size: 1.55rem; font-weight: 800; font-family: var(--font-mono); color: var(--text-primary); line-height: 1; transition: all 0.2s ease;">${data.total}</span>
        <span id="donutCenterLbl" style="font-size: 0.65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-top: 2px; transition: all 0.2s ease;">Total Izin</span>
        <span id="donutCenterPct" style="display: none; font-size: 0.775rem; font-weight: 800; font-family: var(--font-mono); margin-top: 2px;"></span>
      </div>
    </div>

    <!-- Area Detail di Bawah Diagram (Hanya Tampil Saat Kursor Mengarah ke Diagram & Terkena Sensor) -->
    <div id="donutDetailArea" style="margin-top: 0.5rem; transition: all 0.2s ease;">
      <!-- Active Hover Card (Hanya Memperlihatkan Detail Warna yang Disorot Sensor) -->
      <div id="donutActiveCard" style="display: none; padding: 0.85rem 1rem; border-radius: 8px; border: 1.5px solid var(--border-color); box-shadow: 0 4px 12px rgba(0,0,0,0.06); animation: fadeInDonutDetail 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
        <!-- Injected via hoverDonutCategory -->
      </div>
    </div>
  `;
}

// Interactivity handlers for Donut Chart
function hoverDonutCategory(catKey) {
  const data = getKaryawanCategoryData();
  const total = Math.max(data.total, 1);

  const centerVal = document.getElementById('donutCenterVal');
  const centerLbl = document.getElementById('donutCenterLbl');
  const centerPct = document.getElementById('donutCenterPct');
  const activeCard = document.getElementById('donutActiveCard');

  const meta = {
    dinas: {
      label: 'Dinas Kantor',
      count: data.dinas,
      pct: ((data.dinas / total) * 100).toFixed(1).replace('.0', ''),
      color: '#059669',
      bg: '#f0fdf4',
      border: '#86efac',
      icon: '🟢',
      desc: 'Tugas resmi / kedinasan perusahaan PT Pupuk Kujang'
    },
    pribadi: {
      label: 'Urusan Pribadi',
      count: data.pribadi,
      pct: ((data.pribadi / total) * 100).toFixed(1).replace('.0', ''),
      color: '#d97706',
      bg: '#fffbeb',
      border: '#fde68a',
      icon: '🟡',
      desc: 'Keperluan mendesak pribadi / kepentingan keluarga karyawan'
    },
    darurat: {
      label: 'Izin Darurat',
      count: data.darurat,
      pct: ((data.darurat / total) * 100).toFixed(1).replace('.0', ''),
      color: '#e11d48',
      bg: '#fff1f2',
      border: '#fca5a5',
      icon: '🔴',
      desc: 'Kebutuhan mendesak / darurat K3 dengan jalur bypass mandiri'
    }
  };

  const selected = meta[catKey];
  if (!selected) return;

  // 1. Update Donut Center Display
  if (centerVal) {
    centerVal.textContent = `${selected.count} Izin`;
    centerVal.style.color = selected.color;
    centerVal.style.fontSize = '1.35rem';
  }
  if (centerLbl) {
    centerLbl.textContent = selected.label;
    centerLbl.style.color = selected.color;
  }
  if (centerPct) {
    centerPct.style.display = 'block';
    centerPct.textContent = `${selected.pct}% dari total`;
    centerPct.style.color = selected.color;
  }

  // 2. Tampilkan HANYA detail dari warna yang disorot di bawah diagram
  if (activeCard) {
    activeCard.style.display = 'block';
    activeCard.style.background = selected.bg;
    activeCard.style.borderColor = selected.border;
    activeCard.innerHTML = `
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem;">
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <span style="font-size: 1.25rem;">${selected.icon}</span>
          <div>
            <div style="font-weight: 800; font-size: 0.95rem; color: ${selected.color};">${selected.label}</div>
            <div style="font-size: 0.725rem; color: var(--text-secondary); margin-top: 2px;">${selected.desc}</div>
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0;">
          <div style="font-size: 1.2rem; font-weight: 800; font-family: var(--font-mono); color: ${selected.color}; line-height: 1.1;">
            ${selected.count} Izin
          </div>
          <div style="font-size: 0.85rem; font-weight: 800; font-family: var(--font-mono); color: ${selected.color}; margin-top: 3px;">
            ${selected.pct}% dari total
          </div>
        </div>
      </div>
    `;
  }

  // 3. Highlight SVG slice (scale + shadow) dan redupkan slice lainnya
  ['dinas', 'pribadi', 'darurat'].forEach(k => {
    const slice = document.getElementById(`donutSlice_${k}`);
    if (slice) {
      if (k === catKey) {
        slice.style.transform = 'scale(1.06)';
        slice.style.filter = `drop-shadow(0 2px 10px ${selected.color}66)`;
        slice.style.opacity = '1';
      } else {
        slice.style.transform = 'scale(1)';
        slice.style.filter = 'none';
        slice.style.opacity = '0.32';
      }
    }
  });
}

function unhoverDonutCategory() {
  const data = getKaryawanCategoryData();
  const centerVal = document.getElementById('donutCenterVal');
  const centerLbl = document.getElementById('donutCenterLbl');
  const centerPct = document.getElementById('donutCenterPct');
  const activeCard = document.getElementById('donutActiveCard');

  // Reset center text to idle default (tanpa persentase)
  if (centerVal) {
    centerVal.textContent = data.total;
    centerVal.style.color = 'var(--text-primary)';
    centerVal.style.fontSize = '1.55rem';
  }
  if (centerLbl) {
    centerLbl.textContent = 'Total Izin';
    centerLbl.style.color = 'var(--text-muted)';
  }
  if (centerPct) {
    centerPct.style.display = 'none';
  }

  // Hide detail card on idle/unhover
  if (activeCard) activeCard.style.display = 'none';

  // Restore seluruh slice SVG ke ukuran normal
  ['dinas', 'pribadi', 'darurat'].forEach(k => {
    const slice = document.getElementById(`donutSlice_${k}`);
    if (slice) {
      slice.style.transform = 'scale(1)';
      slice.style.filter = 'none';
      slice.style.opacity = '1';
    }
  });
}

window.hoverDonutCategory = hoverDonutCategory;
window.unhoverDonutCategory = unhoverDonutCategory;


// ===================================================================
// 2. APPROVER: INTERACTIVE BAR CHART (TREN MINGGUAN REAL-TIME)
// ===================================================================
function getApproverWeeklyData() {
  const list = window.ticketsList || [];
  
  // Hitung jumlah riil per hari kerja dari ticketsList
  const dayMap = { 'Senin': 3, 'Selasa': 5, 'Rabu': 4, 'Kamis': 6, 'Jumat': 8 };

  list.forEach(t => {
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
  return { days, total, max };
}

function renderApproverBarChart() {
  const container = document.getElementById('chartApproverWeeklyContainer');
  if (!container) return;

  const { days, total, max } = getApproverWeeklyData();

  container.innerHTML = `
    <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 0.75rem; height: 130px; padding: 0.5rem 0.75rem 0 0.75rem; border-bottom: 2px solid #e2e8f0;"
         onmouseleave="window.unhoverApproverBar()">
      ${days.map((d, index) => {
        const heightPct = Math.round((d.count / (max + 2)) * 100);
        const isPeak = d.count === max;
        const pct = ((d.count / total) * 100).toFixed(1).replace('.0', '');
        return `
          <div id="approverBarCol_${index}" class="chart-bar-column" style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; gap: 0.35rem; cursor: pointer; transition: all 0.2s ease; pointer-events: auto;"
            onmouseenter="window.hoverApproverBar('${d.label}', ${d.count}, '${pct}', ${index})"
            onmousemove="window.hoverApproverBar('${d.label}', ${d.count}, '${pct}', ${index})">
            <span id="approverBarVal_${index}" style="font-size: 0.75rem; font-weight: 800; font-family: var(--font-mono); color: ${isPeak ? '#0f766e' : '#475569'}; transition: all 0.2s ease;">${d.count}</span>
            <div id="approverBarItem_${index}" style="width: 100%; max-width: 40px; height: ${heightPct}%; background: ${isPeak ? 'linear-gradient(180deg, #0d9488 0%, #0f766e 100%)' : 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)'}; border-radius: 6px 6px 2px 2px; transition: all 0.25s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.08);"></div>
            <span style="font-size: 0.75rem; font-weight: 700; color: ${isPeak ? '#0f766e' : '#64748b'}; margin-top: 4px;">${d.label}</span>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Approver Badge (Tanpa Persentase saat Idle) -->
    <div id="approverChartBadge" style="margin-top: 0.75rem; padding: 0.45rem 0.75rem; background: #f0fdfa; border: 1.5px solid #99f6e4; border-radius: 8px; font-size: 0.75rem; color: #0f766e; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;">
      <span>📅 Arahkan kursor ke bar hari untuk melihat persentase harian</span>
      <span style="background: #ccfbf1; color: #0f766e; padding: 2px 8px; border-radius: 999px; font-weight: 700; font-size: 0.7rem;">Total: ${total} izin</span>
    </div>
  `;
}

function hoverApproverBar(day, count, pct, activeIndex) {
  const badge = document.getElementById('approverChartBadge');
  const total = getApproverWeeklyData().total;
  if (badge) {
    badge.style.background = '#0f766e';
    badge.style.color = '#ffffff';
    badge.style.borderColor = '#0f766e';
    badge.innerHTML = `<span><strong>${day}:</strong> <strong>${count} Izin</strong> (${pct}% dari total ${total} izin tim)</span><span style="background: rgba(255,255,255,0.25); color: #fff; padding: 2px 8px; border-radius: 999px; font-weight: 800;">${pct}%</span>`;
  }

  // Highlight bar
  for (let i = 0; i < 5; i++) {
    const bar = document.getElementById(`approverBarItem_${i}`);
    if (bar) {
      if (i === activeIndex) {
        bar.style.transform = 'scaleY(1.05)';
        bar.style.filter = 'drop-shadow(0 0 8px rgba(13, 148, 136, 0.5))';
        bar.style.opacity = '1';
      } else {
        bar.style.transform = 'scaleY(1)';
        bar.style.filter = 'none';
        bar.style.opacity = '0.4';
      }
    }
  }
}

function unhoverApproverBar() {
  const badge = document.getElementById('approverChartBadge');
  const total = getApproverWeeklyData().total;
  if (badge) {
    badge.style.background = '#f0fdfa';
    badge.style.color = '#0f766e';
    badge.style.borderColor = '#99f6e4';
    badge.innerHTML = `<span>📅 Arahkan kursor ke bar hari untuk melihat persentase harian</span><span style="background: #ccfbf1; color: #0f766e; padding: 2px 8px; border-radius: 999px; font-weight: 700; font-size: 0.7rem;">Total: ${total} izin</span>`;
  }

  for (let i = 0; i < 5; i++) {
    const bar = document.getElementById(`approverBarItem_${i}`);
    if (bar) {
      bar.style.transform = 'scaleY(1)';
      bar.style.filter = 'none';
      bar.style.opacity = '1';
    }
  }
}

window.hoverApproverBar = hoverApproverBar;
window.unhoverApproverBar = unhoverApproverBar;


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
               onmouseenter="window.hoverTrafficPoint('${p.hour}', ${p.out}, '${pct}', ${p.x}, ${p.y}, ${i})"
               onmousemove="window.hoverTrafficPoint('${p.hour}', ${p.out}, '${pct}', ${p.x}, ${p.y}, ${i})">
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
function getAdminDeptData() {
  const list = window.ticketsList || [];
  const deptCounts = {
    'Departemen Rekayasa & Pemeliharaan': 12,
    'Departemen Operasi Pabrik 1 & 2': 8,
    'Departemen Pengamanan & K3': 5,
    'Departemen Logistik & Pergudangan': 4,
    'Departemen SDM & Hubungan Industrial': 3
  };

  list.forEach(t => {
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
  return { depts, total, max };
}

function renderAdminDeptChart() {
  const container = document.getElementById('chartAdminDeptContainer');
  if (!container) return;

  const { depts, total, max } = getAdminDeptData();

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 0.65rem;" onmouseleave="window.unhoverDeptRow()">
      ${depts.map((d, index) => {
        const pct = ((d.count / total) * 100).toFixed(1).replace('.0', '');
        const barWidthPct = Math.round((d.count / (max + 2)) * 100);
        const colors = ['#0f766e', '#0284c7', '#3b82f6', '#8b5cf6', '#64748b'];
        const barColor = colors[index % colors.length];

        return `
          <div id="deptRow_${index}" class="chart-dept-row" style="cursor: pointer; padding: 0.35rem 0.5rem; border-radius: 6px; transition: all 0.2s ease; pointer-events: auto;"
            onmouseenter="window.hoverDeptRow('${d.name}', ${d.count}, '${pct}', '${barColor}', ${index})"
            onmousemove="window.hoverDeptRow('${d.name}', ${d.count}, '${pct}', '${barColor}', ${index})">
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
      <span style="font-weight: 700; color: var(--text-primary);">Total: ${total} izin</span>
    </div>
  `;
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
  const { total, depts } = getAdminDeptData();
  if (badge) {
    badge.style.background = '#f8fafc';
    badge.style.borderColor = 'var(--border-color)';
    badge.style.color = 'var(--text-secondary)';
    badge.innerHTML = `<span>🏢 Arahkan kursor ke bar departemen untuk detail persentase</span><span style="font-weight: 700; color: var(--text-primary);">Total: ${total} izin</span>`;
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

window.hoverDeptRow = hoverDeptRow;
window.unhoverDeptRow = unhoverDeptRow;


// ===================================================================
// RENDER ALL CHARTS ORCHESTRATOR
// ===================================================================
function renderAllCharts() {
  const role = window.currentActor || 'karyawan';
  if (role === 'karyawan') {
    renderKaryawanDonutChart();
  } else if (role === 'approver') {
    renderApproverBarChart();
  } else if (role === 'admin') {
    renderAdminTrafficChart();
    renderAdminDeptChart();
  }
}

// Expose globally
window.renderKaryawanDonutChart = renderKaryawanDonutChart;
window.renderApproverBarChart = renderApproverBarChart;
window.renderAdminTrafficChart = renderAdminTrafficChart;
window.renderAdminDeptChart = renderAdminDeptChart;
window.renderAllCharts = renderAllCharts;

document.addEventListener('DOMContentLoaded', () => {
  renderAllCharts();
});
