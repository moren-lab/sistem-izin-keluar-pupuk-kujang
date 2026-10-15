/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Lightweight, Zero-Dependency Chart Engine (SVG / Canvas)
 * 1. Karyawan: Donut Chart (Komposisi Jenis Izin: Dinas vs Pribadi vs Darurat)
 * 2. Approver: Bar Chart (Tren Pengajuan Izin Tim per Hari Kerja: Sen - Jum)
 * 3. Admin: Area/Line Chart (Jam Sibuk Lalu Lintas Gerbang 07:00 - 17:00) & Horizontal Bar Chart (Frekuensi per Departemen)
 */

function getKaryawanCategoryData() {
  const list = window.ticketsList || [];
  const currentNip = (window.ACTORS && window.ACTORS.karyawan) ? window.ACTORS.karyawan.nip : 'PK-2024-8841';
  const myTickets = list.filter(t => t.applicantNip === currentNip || !t.applicantNip);

  let dinas = 0;
  let pribadi = 0;
  let darurat = 0;

  myTickets.forEach(t => {
    if (t.isEmergency || (t.id && t.id.startsWith('TK-EMG'))) {
      darurat++;
    } else if (t.category === 'Dinas Kantor') {
      dinas++;
    } else {
      pribadi++;
    }
  });

  // Default representatif jika data baru sedikit
  if (dinas === 0 && pribadi === 0 && darurat === 0) {
    dinas = 3;
    pribadi = 1;
    darurat = 1;
  }

  const total = dinas + pribadi + darurat;
  return { dinas, pribadi, darurat, total };
}

function renderKaryawanDonutChart() {
  const container = document.getElementById('chartEmpCategoryContainer');
  if (!container) return;

  const data = getKaryawanCategoryData();
  const total = Math.max(data.total, 1);

  const pctDinas = Math.round((data.dinas / total) * 100);
  const pctPribadi = Math.round((data.pribadi / total) * 100);
  const pctDarurat = 100 - pctDinas - pctPribadi;

  // Circumference of radius 50: 2 * PI * 50 ≈ 314.16
  const C = 314.16;
  const strokeDinas = (data.dinas / total) * C;
  const strokePribadi = (data.pribadi / total) * C;
  const strokeDarurat = (data.darurat / total) * C;

  const offsetDinas = 0;
  const offsetPribadi = -strokeDinas;
  const offsetDarurat = -(strokeDinas + strokePribadi);

  container.innerHTML = `
    <div style="position: relative; width: 140px; height: 140px; margin: 0 auto;">
      <svg viewBox="0 0 120 120" width="140" height="140" style="transform: rotate(-90deg); border-radius: 50%;">
        <!-- Background Track -->
        <circle cx="60" cy="60" r="50" fill="transparent" stroke="#f1f5f9" stroke-width="16" />
        
        <!-- Segment 1: Dinas Kantor (Teal) -->
        <circle cx="60" cy="60" r="50" fill="transparent" stroke="#059669" stroke-width="16"
          stroke-dasharray="${strokeDinas} ${C - strokeDinas}"
          stroke-dashoffset="${offsetDinas}" stroke-linecap="round" />

        <!-- Segment 2: Urusan Pribadi (Amber) -->
        <circle cx="60" cy="60" r="50" fill="transparent" stroke="#d97706" stroke-width="16"
          stroke-dasharray="${strokePribadi} ${C - strokePribadi}"
          stroke-dashoffset="${offsetPribadi}" stroke-linecap="round" />

        <!-- Segment 3: Darurat / Bypass (Rose) -->
        <circle cx="60" cy="60" r="50" fill="transparent" stroke="#e11d48" stroke-width="16"
          stroke-dasharray="${strokeDarurat} ${C - strokeDarurat}"
          stroke-dashoffset="${offsetDarurat}" stroke-linecap="round" />
      </svg>

      <!-- Center Total Metric -->
      <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
        <span style="font-size: 1.35rem; font-weight: 800; font-family: var(--font-mono); color: var(--text-primary); line-height: 1;">${data.total}</span>
        <span style="font-size: 0.65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-top: 2px;">Total Izin</span>
      </div>
    </div>

    <!-- Clean Legends -->
    <div style="margin-top: 0.85rem; width: 100%; display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.775rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0.5rem; background: #f0fdf4; border-radius: 6px;">
        <div style="display: flex; align-items: center; gap: 0.45rem;">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: #059669; display: inline-block;"></span>
          <span style="font-weight: 600; color: #166534;">Dinas Kantor</span>
        </div>
        <div style="font-weight: 700; font-family: var(--font-mono); color: #166534;">${data.dinas} (${pctDinas}%)</div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0.5rem; background: #fffbeb; border-radius: 6px;">
        <div style="display: flex; align-items: center; gap: 0.45rem;">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: #d97706; display: inline-block;"></span>
          <span style="font-weight: 600; color: #92400e;">Urusan Pribadi</span>
        </div>
        <div style="font-weight: 700; font-family: var(--font-mono); color: #92400e;">${data.pribadi} (${pctPribadi}%)</div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0.5rem; background: #fff1f2; border-radius: 6px;">
        <div style="display: flex; align-items: center; gap: 0.45rem;">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: #e11d48; display: inline-block;"></span>
          <span style="font-weight: 600; color: #9f1239;">Izin Darurat</span>
        </div>
        <div style="font-weight: 700; font-family: var(--font-mono); color: #9f1239;">${data.darurat} (${pctDarurat}%)</div>
      </div>
    </div>
  `;
}

function getApproverWeeklyData() {
  const days = [
    { label: 'Senin', count: 3 },
    { label: 'Selasa', count: 5 },
    { label: 'Rabu', count: 4 },
    { label: 'Kamis', count: 6 },
    { label: 'Jumat', count: 8 }
  ];

  const max = Math.max(...days.map(d => d.count), 1);
  return { days, max };
}

function renderApproverBarChart() {
  const container = document.getElementById('chartApproverWeeklyContainer');
  if (!container) return;

  const { days, max } = getApproverWeeklyData();

  container.innerHTML = `
    <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 0.75rem; height: 130px; padding: 0.5rem 0.75rem 0 0.75rem; border-bottom: 2px solid #e2e8f0;">
      ${days.map((d) => {
        const heightPct = Math.round((d.count / (max + 2)) * 100);
        const isPeak = d.count === max;
        return `
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; gap: 0.35rem;">
            <span style="font-size: 0.75rem; font-weight: 800; font-family: var(--font-mono); color: ${isPeak ? '#0f766e' : '#475569'};">${d.count}</span>
            <div style="width: 100%; max-width: 38px; height: ${heightPct}%; background: ${isPeak ? 'linear-gradient(180deg, #0d9488 0%, #0f766e 100%)' : 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)'}; border-radius: 6px 6px 2px 2px; transition: height 0.5s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.08);"></div>
            <span style="font-size: 0.75rem; font-weight: 700; color: ${isPeak ? '#0f766e' : '#64748b'}; margin-top: 4px;">${d.label}</span>
          </div>
        `;
      }).join('')}
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; font-size: 0.75rem; color: var(--text-secondary);">
      <span>Puncak izin tim pada hari <strong>Jumat</strong></span>
      <span style="background: #ccfbf1; color: #0f766e; padding: 2px 8px; border-radius: 999px; font-weight: 700; font-size: 0.7rem;">Rata-rata: 5.2 izin/hari</span>
    </div>
  `;
}

function getAdminTrafficData() {
  return [
    { hour: '07:00', out: 1 },
    { hour: '08:00', out: 3 },
    { hour: '09:00', out: 4 },
    { hour: '10:00', out: 5 },
    { hour: '11:00', out: 12 },
    { hour: '12:00', out: 9 },
    { hour: '13:00', out: 4 },
    { hour: '14:00', out: 6 },
    { hour: '15:00', out: 7 },
    { hour: '16:00', out: 14 },
    { hour: '17:00', out: 8 }
  ];
}

function renderAdminTrafficChart() {
  const container = document.getElementById('chartAdminTrafficContainer');
  if (!container) return;

  const data = getAdminTrafficData();
  const maxVal = 16;
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
    return `${x},${y}`;
  });

  const pathD = `M ${pointsOut[0]} ` + pointsOut.slice(1).map(p => `L ${p}`).join(' ');
  const areaD = `${pathD} L ${padLeft + plotW},${padTop + plotH} L ${padLeft},${padTop + plotH} Z`;

  container.innerHTML = `
    <div style="position: relative; width: 100%; height: ${height}px;">
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible;">
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

        <!-- Dots -->
        ${data.map((d, i) => {
          const x = padLeft + (i / (data.length - 1)) * plotW;
          const y = padTop + plotH - (d.out / maxVal) * plotH;
          const isPeak = d.out === 14 || d.out === 12;
          return `
            <circle cx="${x}" cy="${y}" r="${isPeak ? 4.5 : 3}" fill="${isPeak ? '#0284c7' : '#ffffff'}" stroke="#0284c7" stroke-width="2" />
            ${i % 2 === 0 ? `<text x="${x}" y="${height - 4}" font-size="9" font-weight="600" fill="#64748b" text-anchor="middle">${d.hour}</text>` : ''}
          `;
        }).join('')}
      </svg>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.725rem; color: var(--text-secondary);">
      <span>🔥 Jam Sibuk Utama: <strong>11:00 – 12:30</strong> (Makan Siang) & <strong>16:00</strong> (Selesai Shift)</span>
      <span style="color: #0284c7; font-weight: 700;">● Volume Scan Out</span>
    </div>
  `;
}

function getAdminDeptData() {
  const defaults = [
    { name: 'Departemen Rekayasa & Pemeliharaan', count: 12 },
    { name: 'Departemen Operasi Pabrik 1 & 2', count: 8 },
    { name: 'Departemen Pengamanan & K3', count: 5 },
    { name: 'Departemen Logistik & Pergudangan', count: 4 },
    { name: 'Departemen SDM & Hubungan Industrial', count: 3 }
  ];

  const max = Math.max(...defaults.map(d => d.count), 1);
  return { depts: defaults, max };
}

function renderAdminDeptChart() {
  const container = document.getElementById('chartAdminDeptContainer');
  if (!container) return;

  const { depts, max } = getAdminDeptData();

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 0.65rem;">
      ${depts.map((d, index) => {
        const pct = Math.round((d.count / (max + 2)) * 100);
        const colors = ['#0f766e', '#0284c7', '#3b82f6', '#8b5cf6', '#64748b'];
        const barColor = colors[index % colors.length];

        return `
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.775rem; margin-bottom: 3px;">
              <span style="font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;">${d.name}</span>
              <span style="font-family: var(--font-mono); font-weight: 800; color: ${barColor}; font-size: 0.8rem;">${d.count} Izin</span>
            </div>
            <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
              <div style="width: ${pct}%; height: 100%; background: ${barColor}; border-radius: 4px; transition: width 0.6s ease;"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

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
