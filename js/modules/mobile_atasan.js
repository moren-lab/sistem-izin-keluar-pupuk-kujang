/**
 * SISTEM PERIZINAN KELUAR AREA - PT PUPUK KUJANG CIKAMPEK
 * MODULE: MOBILE ATASAN / APPROVER (Ref: Figma PDF Atasan Hal 1 - 7)
 * Implements 100% Visual and Workflow Parity with Perizinan_Keluar_Area_Untuk_Karyawan__Atasan_.pdf
 */

(function () {
  'use strict';

  let currentAtasanTab = 'dashboard'; // 'dashboard' | 'antrean' | 'tim' | 'riwayat' | 'detail'
  let currentAntreanSegment = 'baru'; // 'baru' | 'perpanjangan'
  let atasanSearchQuery = '';
  let atasanFilterDate = '';
  let atasanFilterStatus = 'all';
  let atasanRiwayatSearch = '';
  let atasanRiwayatFilterDecision = 'all';
  let atasanRiwayatSortOrder = 'desc'; // 'desc' | 'asc'
  let isAntreanFilterOpen = false;
  let isAtasanRiwayatFilterOpen = false;
  let isAtasanTimFilterOpen = false;
  let atasanTimFilter = 'all'; // 'all' | 'outside' | 'late' | 'ready'
  let atasanTimSearchQuery = '';
  let currentAtasanTimPage = 1;
  const atasanTimPageSize = 6;
  let atasanTimDebounceTimer = null;
  let selectedTimTicketId = null;
  let viewingTicketId = null;

  function getActiveApprover() {
    let app = null;
    if (window.currentActor === 'approver2') {
      app = { 
        name: 'Dewi Sartika, S.T., M.M.', 
        nip: 'PK-2012-0845', 
        title: 'Supervisor Operasional Lapangan (Plt. Manager)', 
        dept: 'Departemen Rekayasa & Pemeliharaan',
        department: 'Departemen Rekayasa & Pemeliharaan'
      };
    } else {
      app = (typeof window.getPrimaryApprover === 'function')
        ? window.getPrimaryApprover()
        : { 
          name: 'Ir. Hendra Gunawan, M.T.', 
          nip: 'PK-2016-3392', 
          title: 'Manajer Rekayasa & Pemeliharaan', 
          dept: 'Departemen Rekayasa & Pemeliharaan',
          department: 'Departemen Rekayasa & Pemeliharaan'
        };
    }
    if (app && !app.dept) app.dept = app.department || 'Departemen Rekayasa & Pemeliharaan';
    if (app && !app.department) app.department = app.dept || 'Departemen Rekayasa & Pemeliharaan';
    return app;
  }

  function isTicketAssignedToMobileApprover(ticket) {
    if (!ticket) return false;
    const app = getActiveApprover();
    const aName = (app.name || '').toLowerCase();
    const tApprover = (ticket.approverName || '').toLowerCase();
    
    let empSupervisor = ticket.directSupervisor || '';
    if (!empSupervisor && window.KUJANG_ACCOUNTS && ticket.applicantNip) {
      const acc = window.KUJANG_ACCOUNTS.find(a => a.nip === ticket.applicantNip);
      if (acc && acc.directSupervisor) empSupervisor = acc.directSupervisor;
    }
    if (!empSupervisor && (ticket.applicantNip === 'PK-2024-8841' || (ticket.applicantName || '').toLowerCase().includes('budi'))) {
      empSupervisor = 'Ir. Hendra Gunawan, M.T.';
    }

    const isUnderSupervision = empSupervisor && empSupervisor.toLowerCase().includes(aName.includes('dewi') ? 'dewi' : 'hendra');
    const deptMatch = Boolean(ticket.department && (app.department || app.dept) && 
      ticket.department.toLowerCase() === (app.department || app.dept).toLowerCase());

    if (aName.includes('dewi')) {
      return tApprover.includes('dewi') || isUnderSupervision;
    } else {
      return tApprover.includes('hendra') || (!tApprover.includes('dewi')) || isUnderSupervision || deptMatch;
    }
  }

  function isDeletedByCurrentMobileApprover(t) {
    if (!t) return false;
    const app = getActiveApprover();
    const aName = (app.name || '').toLowerCase();
    if (aName.includes('dewi')) {
      return !!t.deletedByApprover2;
    }
    return !!t.deletedByApprover1;
  }

  function getTeamTickets() {
    const list = window.ticketsList || [];
    return list.filter(t => !isDeletedByCurrentMobileApprover(t) && isTicketAssignedToMobileApprover(t));
  }

  function getTName(t) { return t.applicantName || t.employeeName || 'Bawahan'; }
  function getTNip(t) { return t.applicantNip || t.employeeNip || 'PK-2024'; }
  function getTDept(t) { return t.department || 'Departemen Rekayasa & Pemeliharaan'; }
  
  function formatTipeKepulanganDisplay(type) {
    if (!type) return 'Kembali ke Area';
    const s = String(type).trim();
    if (s === 'Pulang Mendahului' || s.includes('Pulang Mendahului') || s.includes('Pulang Lebih Awal') || s.includes('Tidak Kembali')) {
      return 'Pulang Lebih Awal';
    }
    return s;
  }

  function getTType(t) { return formatTipeKepulanganDisplay(t.type || t.returnType || 'Kembali ke Area'); }
  function getTTransport(t) { return t.transportMode || t.transportation || 'Kendaraan dinas'; }
  function getTReturnTime(t) { return t.estimatedReturn || t.plannedReturn || ''; }
  function getTExitTime(t) { return t.plannedExit || ''; }

  function formatTimeOnly(timeStr) {
    if (!timeStr) return '';
    if (timeStr.includes('T')) {
      const m = timeStr.split('T')[1].match(/^(\d{1,2})[:.](\d{2})/);
      if (m) return `${m[1]}.${m[2]} WIB`;
    }
    const match = timeStr.match(/(\d{1,2})[:.](\d{2})/);
    return match ? `${match[1].padStart(2, '0')}.${match[2]} WIB` : timeStr.replace(':', '.');
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return '-';
    let clean = String(dateStr).replace(/\s*\(Pos.*?\)/gi, '').trim();
    clean = clean.replace(/(\d{1,2}):(\d{2})/g, '$1.$2');
    if (clean.includes('Okt') || clean.includes('WIB') || clean.includes('Jan') || clean.includes('Feb') || clean.includes('Mar')) {
      return clean;
    }
    try {
      const dt = new Date(clean);
      if (isNaN(dt.getTime())) return clean;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const pad = n => String(n).padStart(2, '0');
      return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}, ${pad(dt.getHours())}.${pad(dt.getMinutes())} WIB`;
    } catch (e) {
      return clean;
    }
  }

  function formatDateIndo(dateObj) {
    const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const months = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
    const d = dateObj || new Date();
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  // -------------------------------------------------------------------
  // 1. RENDER ATASAN MAIN VIEW
  // -------------------------------------------------------------------
  function renderMobileAtasan(container, targetTab) {
    if (targetTab) {
      currentAtasanTab = (targetTab === 'pelacakan') ? 'tim' : (targetTab === 'riwayat' ? 'dashboard' : targetTab);
    }
    if (!container) container = document.getElementById('mobileMainContent');
    if (!container) return;

    if (currentAtasanTab === 'dashboard') {
      renderAtasanDashboard(container);
    } else if (currentAtasanTab === 'antrean') {
      renderAtasanAntrean(container);
    } else if (currentAtasanTab === 'tim' || currentAtasanTab === 'pelacakan') {
      renderAtasanTim(container);
    } else if (currentAtasanTab === 'riwayat') {
      renderAtasanDashboard(container);
    } else if (currentAtasanTab === 'detail') {
      renderAtasanDetailFullPage(container, viewingTicketId);
    }
  }

  // -------------------------------------------------------------------
  // 2. DASHBOARD ATASAN (Figma PDF Page 1)
  // -------------------------------------------------------------------
  function renderAtasanDashboard(container) {
    const approver = getActiveApprover();
    const tickets = getTeamTickets();

    const pendingNew = tickets.filter(t => 
      !t.isEmergency && 
      !t.id.includes('-EMG-') && 
      t.status === 'Menunggu Persetujuan'
    );
    const pendingExt = tickets.filter(t => t.hasExtensionPending || (t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan'));
    const outsideTickets = tickets.filter(t => t.status === 'Sedang di Luar' || t.status === 'Terlambat');
    const lateTickets = tickets.filter(t => t.status === 'Terlambat' || (t.isLate && t.status !== 'Selesai'));
    const processedTickets = tickets.filter(t => t.status === 'Disetujui' || t.status === 'Selesai' || t.status === 'Ditolak');

    // Ekstrak riwayat audit trail asli dari seluruh tiket tim bawahan
    const allActivities = [];
    tickets.forEach(t => {
      const empName = getTName(t);
      const ticketId = t.id;

      if (Array.isArray(t.timeline) && t.timeline.length > 0) {
        t.timeline.forEach(item => {
          allActivities.push({
            ticketId: ticketId,
            empName: empName,
            title: item.event || item.title || `Aktivitas ${ticketId}`,
            actor: item.by || item.actor || 'Sistem',
            desc: item.desc || item.note || '',
            rawTime: item.time || item.timestamp || t.createdAt,
            status: item.status || t.status
          });
        });
      } else {
        if (t.createdAt) {
          allActivities.push({
            ticketId: ticketId,
            empName: empName,
            title: `Pengajuan Izin ${empName}`,
            actor: empName,
            desc: `${t.category || 'Dinas Kantor'} • ${getTType(t)}`,
            rawTime: t.createdAt,
            status: 'Menunggu Persetujuan'
          });
        }
        if (t.approvedAt) {
          allActivities.push({
            ticketId: ticketId,
            empName: empName,
            title: `Izin ${empName} disetujui`,
            actor: t.approverName || approver.name.split(',')[0],
            desc: 'Disetujui oleh Atasan',
            rawTime: t.approvedAt,
            status: 'Disetujui'
          });
        }
        if (t.scanOutTime) {
          allActivities.push({
            ticketId: ticketId,
            empName: empName,
            title: `${empName} Scan Out`,
            actor: t.scanOutBy || 'Petugas Pos Jaga',
            desc: `Keluar area melalui ${t.scanOutGate || 'Pos 1'}`,
            rawTime: t.scanOutTime,
            status: 'Sedang di Luar'
          });
        }
        if (t.scanInTime) {
          allActivities.push({
            ticketId: ticketId,
            empName: empName,
            title: `${empName} Scan In (Kembali)`,
            actor: t.scanInBy || 'Petugas Pos Jaga',
            desc: `Kembali melalui ${t.scanInGate || 'Pos 1'}`,
            rawTime: t.scanInTime,
            status: 'Selesai'
          });
        }
      }
    });

    allActivities.sort((a, b) => {
      const parseTime = (item) => {
        const raw = item.rawTime || 0;
        const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
        return (d && !isNaN(d.getTime())) ? d.getTime() : 0;
      };
      return parseTime(b) - parseTime(a);
    });

    const recentActivities = allActivities.slice(0, 5);

    // Counts for summary card #3
    const emergencyCount = tickets.filter(t => Boolean(t.isEmergency || (t.id && t.id.includes('-EMG-')))).length;
    const approverDecidedCount = Math.max(0, processedTickets.length - emergencyCount);

    const now = new Date();
    const dateFormatted = formatDateIndo(now);
    const hourFormatted = String(now.getHours()).padStart(2, '0') + '.' + String(now.getMinutes()).padStart(2, '0');

    // Greeting by time
    const h = now.getHours();
    let timeGreeting = 'pagi';
    if (h >= 11 && h < 15) timeGreeting = 'siang';
    else if (h >= 15 && h < 18) timeGreeting = 'sore';
    else if (h >= 18 || h < 5) timeGreeting = 'malam';

    // Priority Cards: Emergency Ticket if exists
    let priorityHtml = '';
    const pendingEmergTicket = tickets.find(t => 
      (t.isEmergency || (t.id && t.id.includes('-EMG-'))) && 
      (t.status === 'Menunggu Otorisasi Darurat' || t.status === 'Menunggu Persetujuan') &&
      t.status !== 'Ditolak' && 
      t.status !== 'Selesai' && 
      t.status !== 'Dibatalkan'
    );
    const finishedEmergTicket = tickets.find(t => (t.isEmergency || (t.id && t.id.includes('-EMG-'))) && t.status === 'Selesai');

    if (pendingEmergTicket) {
      priorityHtml = `
        <div class="mobile-card" style="border: 1.5px solid #fca5a5; background: #fff5f5; margin-bottom: 12px; padding: 14px; border-radius: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.675rem; font-weight: 800; color: #b91c1c; letter-spacing: 0.5px;">PRIORITAS TINGGI • IZIN DARURAT</span>
            <span class="mobile-badge darurat" style="background: #fee2e2; color: #b91c1c; font-weight: 800;">Menunggu Otorisasi</span>
          </div>
          <div style="font-size: 0.9rem; font-weight: 800; color: #0f172a;">${getTName(pendingEmergTicket)}</div>
          <div style="font-size: 0.725rem; color: #64748b;">${pendingEmergTicket.id} • ${pendingEmergTicket.category || 'Darurat Medis/K3'}</div>
          <div style="font-size: 0.75rem; color: #7f1d1d; margin: 4px 0 2px 0;">
            <strong>Tujuan:</strong> ${pendingEmergTicket.destination || 'RS Pupuk Kujang'}
          </div>
          <div style="font-size: 0.75rem; color: #7f1d1d; margin-bottom: 8px;">
            <span style="font-style: normal;">"${pendingEmergTicket.reason || 'Kondisi darurat mendadak'}"</span>
          </div>
          <div style="background: #ffffff; border: 1px dashed #fca5a5; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px; font-size: 0.725rem; color: #991b1b; display: flex; justify-content: space-between; align-items: center;">
            <span>Kode Sandi Otorisasi:</span>
            <strong style="font-size: 0.85rem; letter-spacing: 2px;">${pendingEmergTicket.emergencyPasscode || '849201'}</strong>
          </div>
          <!-- B2: Atasan Bisa Lihat Detail Dulu, Baru Setujui / Tolak -->
          <div style="display: flex; gap: 8px; margin-top: 8px;">
            <button type="button" class="mobile-btn-secondary" style="flex: 1; min-height: 44px; padding: 8px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 4px; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; border-radius: 8px;" onclick="window.mobileOpenAtasanDetailModal('${pendingEmergTicket.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              <span>Detail Pengajuan</span>
            </button>
            <button type="button" class="mobile-btn-danger" style="flex: 1; min-height: 44px; padding: 8px; font-size: 0.775rem; font-weight: 700; background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileOpenRejectSheet('${pendingEmergTicket.id}')">
              Tolak
            </button>
            <button type="button" class="mobile-btn-primary" style="flex: 1.2; min-height: 44px; padding: 8px; font-size: 0.775rem; font-weight: 800; background: #059669; border-color: #059669; color: #ffffff; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileAtasanApproveEmergency('${pendingEmergTicket.id}')">
              Setujui
            </button>
          </div>
        </div>
      `;
    }

    // Top Pending Regular Tickets (matching PDF: Raka Pratama, Nisa Putri, etc.)
    let pendingTicketsHtml = '';
    if (pendingNew.length > 0) {
      pendingTicketsHtml = pendingNew.slice(0, 3).map(t => `
        <div class="mobile-ticket-item" style="border: 1px solid #e2e8f0;">
          <div class="mobile-ticket-item-header">
            <div>
              <div style="font-size: 0.85rem; font-weight: 800; color: #0f172a;">${getTName(t)}</div>
              <div style="font-size: 0.7rem; color: #64748b;">${t.id} • ${t.category}</div>
            </div>
            <button type="button" class="mobile-btn-secondary" style="padding: 4px 10px; font-size: 0.725rem; width: auto; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; border-radius: 8px; min-height: 36px; cursor: pointer;" onclick="window.mobileOpenAtasanDetailModal('${t.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg><span>Detail Pengajuan</span></button>
          </div>

          <div style="margin: 4px 0 6px 0;">
            <span class="mobile-badge menunggu">Menunggu Persetujuan</span>
          </div>

          <div style="font-size: 0.725rem; color: #475569; margin-bottom: 8px;">
            Rencana Keluar: <strong>${formatTimeOnly(getTExitTime(t)) || '11.30 WIB'}</strong>
          </div>

          <div style="display: flex; gap: 8px;">
            <button type="button" class="mobile-btn-danger" style="flex: 1; min-height: 44px; padding: 8px 10px; font-size: 0.775rem; font-weight: 700; background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileOpenRejectSheet('${t.id}')">
              Tolak
            </button>
            <button type="button" class="mobile-btn-approve" style="flex: 1; min-height: 44px; padding: 8px 10px; font-size: 0.775rem; font-weight: 800; background: #059669; color: #ffffff; border: 1.5px solid #059669; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileQuickApproveTicket('${t.id}')">
              Setujui
            </button>
          </div>
        </div>
      `).join('');
    }

    // Top Pending Extension if any (e.g. Dimas Saputra)
    let pendingExtHtml = '';
    if (pendingExt.length > 0) {
      pendingExtHtml = pendingExt.slice(0, 2).map(t => {
        const semula = formatTimeOnly(getTReturnTime(t)) || '11.15 WIB';
        const usulan = t.extensionRequestedTime ? t.extensionRequestedTime + ' WIB' : '12.00 WIB';
        return `
          <div class="mobile-ticket-item" style="border: 1px solid #e2e8f0;">
            <div class="mobile-ticket-item-header">
              <div>
                <div style="font-size: 0.85rem; font-weight: 800; color: #0f172a;">${getTName(t)}</div>
                <div style="font-size: 0.7rem; color: #64748b;">${t.id} • Perpanjangan</div>
              </div>
              <a href="#" class="mobile-link-rincian" onclick="window.mobileOpenAtasanPerpanjanganModal('${t.id}'); return false;">Lihat Detail</a>
            </div>

            <div style="margin: 4px 0 6px 0;">
              <span class="mobile-badge sedang-di-luar" style="background:#f5f3ff; color:#7c3aed;">Menunggu keputusan perpanjangan</span>
            </div>

            <div style="font-size: 0.75rem; color: #475569; margin-bottom: 8px;">
              Batas waktu: <strong>${semula} → ${usulan}</strong>
            </div>

            <div style="display: flex; gap: 8px;">
              <button type="button" class="mobile-btn-danger" style="flex: 1; padding: 7px 10px; font-size: 0.775rem;" onclick="window.mobileAtasanExecuteExtension('${t.id}', 'reject')">
                Tolak
              </button>
              <button type="button" class="mobile-btn-approve" style="flex: 1; padding: 7px 10px; font-size: 0.775rem;" onclick="window.mobileAtasanExecuteExtension('${t.id}', 'approve')">
                Setujui
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = `
      <!-- Hero Header Card Atasan (Dark Green) -->
      <section class="mobile-hero-card" style="background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);">
        <div class="mobile-hero-greeting-sub" style="color: #a7f3d0;">Pusat Persetujuan & Monitoring Bawahan</div>
        <div style="font-size: 1.15rem; font-weight: 800; color: #ffffff; margin-top: 4px;">${approver.name}</div>
        <div style="font-size: 0.775rem; color: #e2e8f0; margin-top: 2px;">${approver.title || 'Atasan'}</div>

        <div class="mobile-hero-divider" style="background: rgba(255,255,255,0.15); margin: 12px 0;"></div>

       
      </section>

      <!-- 4-Grid Metrics Overview (2x2 Grid) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
        <!-- Card 1: Izin baru menunggu -->
        <div class="mobile-card" style="margin: 0; padding: 12px; cursor: pointer;" onclick="window.mobileSwitchTab('antrean', 'baru')">
          <div style="font-size: 0.7rem; color: #64748b; font-weight: 700;">Izin baru menunggu</div>
          <div style="font-size: 1.6rem; font-weight: 900; color: #b45309; line-height: 1.2; margin: 3px 0 2px 0;">${pendingNew.length}</div>
        </div>

        <!-- Card 2: Perpanjangan menunggu -->
        <div class="mobile-card" style="margin: 0; padding: 12px; cursor: pointer;" onclick="window.mobileSwitchTab('antrean', 'perpanjangan')">
          <div style="font-size: 0.7rem; color: #64748b; font-weight: 700;">Perpanjangan menunggu</div>
          <div style="font-size: 1.6rem; font-weight: 900; color: #7c3aed; line-height: 1.2; margin: 3px 0 2px 0;">${pendingExt.length}</div>
        </div>

        <!-- Card 3: Pengajuan diproses -->
        <div class="mobile-card" style="margin: 0; padding: 12px; cursor: pointer;" onclick="window.mobileSwitchTab('tim')">
          <div style="font-size: 0.7rem; color: #64748b; font-weight: 700;">Pengajuan diproses</div>
          <div style="font-size: 1.6rem; font-weight: 900; color: #0f172a; line-height: 1.2; margin: 3px 0 2px 0;">${processedTickets.length}</div>
        </div>

        <!-- Card 4: Tim di luar area -->
        <div class="mobile-card" style="margin: 0; padding: 12px; cursor: pointer;" onclick="window.mobileSwitchTab('tim')">
          <div style="font-size: 0.7rem; color: #64748b; font-weight: 700;">Tim di luar area</div>
          <div style="font-size: 1.6rem; font-weight: 900; color: #7c3aed; line-height: 1.2; margin: 3px 0 2px 0;">${outsideTickets.length}</div>
        </div>
      </div>

      <!-- Priority Emergency Section -->
      ${priorityHtml}

      <!-- Pending Permits Section -->
      <section style="margin-bottom: 12px;">
        <div style="font-size: 0.825rem; font-weight: 800; color: #0f172a; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span>Pengajuan Menunggu Persetujuan</span>
          <span style="font-size: 0.7rem; color: #64748b; font-weight: 600;">${pendingNew.length + pendingExt.length} item</span>
        </div>
        ${pendingTicketsHtml}
        ${pendingExtHtml}
        ${(pendingNew.length === 0 && pendingExt.length === 0) ? `
          <div class="mobile-card" style="text-align: center; color: #64748b; font-size: 0.775rem; padding: 20px;">
            Tidak ada pengajuan yang menunggu keputusan Anda saat ini.
          </div>
        ` : ''}
      </section>

      <!-- Volume Pengajuan Tim Chart (Senin - Jumat) -->
      <section class="mobile-card">
        <div class="mobile-card-header">
          <div>
            <h3 class="mobile-card-title">Volume pengajuan tim</h3>
          </div>
        </div>
        <div style="margin-top: 6px;">
          ${(typeof window.getGambar2AestheticBarChartHtml === 'function') 
            ? window.getGambar2AestheticBarChartHtml() 
            : '<div style="text-align:center; padding: 12px; color: #64748b;">Memuat grafik...</div>'}
        </div>
      </section>

      <!-- Aktivitas Terbaru Timeline (Data Asli Audit Trail Tiket Tim) -->
      <section class="mobile-card">
        <div class="mobile-card-header">
          <div>
            <h3 class="mobile-card-title">Aktivitas terbaru</h3>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 6px;">
          ${recentActivities.length > 0 ? recentActivities.map(act => {
            const isLate = (act.title.toLowerCase().includes('terlambat') || act.status === 'Terlambat');
            const timeDisplay = formatTimeOnly(act.rawTime) || 'Hari ini';
            return `
              <div style="display: flex; gap: 10px; align-items: flex-start; cursor: pointer;" onclick="window.mobileOpenTicketDetail('${act.ticketId}')">
                <div style="font-size: 0.7rem; font-weight: 800; color: ${isLate ? '#b91c1c' : '#64748b'}; min-width: 60px; flex-shrink: 0;">
                  ${timeDisplay}
                </div>
                <div style="flex: 1; font-size: 0.75rem; color: #0f172a; min-width: 0;">
                  <div style="font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${isLate ? 'color: #b91c1c;' : ''}">
                    ${act.title}
                  </div>
                  <div style="font-size: 0.675rem; color: #64748b; margin-top: 1px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                    <span>${act.actor}</span>
                    <span>•</span>
                    <span style="font-family: monospace; font-weight: 700;">${act.ticketId}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('') : `
            <div style="text-align: center; color: #64748b; font-size: 0.75rem; padding: 14px;">
              Belum ada aktivitas audit bawahan hari ini.
            </div>
          `}
        </div>
      </section>
    `;
  }

  // -------------------------------------------------------------------
  // 3. ANTREAN PERSETUJUAN (Figma PDF Page 2)
  // -------------------------------------------------------------------
  function renderAtasanAntrean(container) {
    const approver = getActiveApprover();
    const tickets = getTeamTickets();

    const pendingNew = tickets.filter(t => 
      !t.isEmergency && 
      !t.id.includes('-EMG-') && 
      t.status === 'Menunggu Persetujuan'
    );
    const pendingExt = tickets.filter(t => t.hasExtensionPending || (t.pendingExtension && t.pendingExtension.status === 'Menunggu Persetujuan'));

    let activeList = currentAntreanSegment === 'baru' ? pendingNew : pendingExt;

    // Apply Filter
    if (atasanSearchQuery) {
      const matcher = typeof window.matchSearchTokens === 'function' ? window.matchSearchTokens : (typeof matchSearchTokens === 'function' ? matchSearchTokens : null);
      if (matcher) {
        activeList = activeList.filter(t => matcher(atasanSearchQuery, t.id, getTName(t), getTNip(t), t.destination, t.reason, t.category, t.type));
      } else {
        const q = atasanSearchQuery.toLowerCase();
        activeList = activeList.filter(t => 
          (getTName(t).toLowerCase().includes(q)) ||
          (getTNip(t).toLowerCase().includes(q)) ||
          (t.id && t.id.toLowerCase().includes(q))
        );
      }
    }

    let itemsHtml = '';
    if (currentAntreanSegment === 'baru') {
      if (activeList.length === 0) {
        itemsHtml = `<div class="mobile-card" style="text-align: center; color: #64748b; font-size: 0.8rem; padding: 24px;">Tidak ada permohonan izin baru dalam antrean.</div>`;
      } else {
        itemsHtml = activeList.map(t => {
          const isPulang = (t.type === 'Pulang Mendahului' || t.returnType === 'Pulang Mendahului');
          return `
            <div class="mobile-ticket-item" style="margin-bottom: 12px;">
              <div class="mobile-ticket-item-header">
                <div>
                  <div style="font-size: 0.875rem; font-weight: 800; color: #0f172a;">${getTName(t)}</div>
                  <div style="font-size: 0.7rem; color: #64748b;">${getTNip(t)} • ${getTDept(t)}</div>
                </div>
                <span class="mobile-badge menunggu">Menunggu Persetujuan</span>
              </div>

              <div style="font-family: monospace; font-size: 0.775rem; font-weight: 700; color: #475569; margin-bottom: 4px;">
                ${t.id}
              </div>

              <div style="font-size: 0.75rem; color: #047857; font-weight: 700; margin-bottom: 4px;">
                ${t.category} • ${getTType(t)}
              </div>

              <div style="font-size: 0.7rem; color: #64748b; margin-bottom: 8px;">
                Diajukan • ${t.createdAt ? t.createdAt.split(',')[0] : 'Hari ini'}, ${formatTimeOnly(t.createdAt || t.plannedExit)}
              </div>

              <div class="mobile-ticket-grid-meta">
                <div>
                  <div class="mobile-meta-sub">Rencana keluar</div>
                  <div class="mobile-meta-val">${formatTimeOnly(getTExitTime(t)) || '11.30 WIB'}</div>
                </div>
                <div>
                  <div class="mobile-meta-sub">Estimasi kembali</div>
                  <div class="mobile-meta-val">${isPulang ? '— (tidak kembali)' : (formatTimeOnly(getTReturnTime(t)) || '13.00 WIB')}</div>
                </div>
              </div>

              <button type="button" class="mobile-btn-primary" style="margin-top: 4px;" onclick="window.mobileOpenAtasanDetailModal('${t.id}')">
                Tinjau
              </button>
            </div>
          `;
        }).join('');
      }
    } else {
      // Perpanjangan tab
      if (activeList.length === 0) {
        itemsHtml = `<div class="mobile-card" style="text-align: center; color: #64748b; font-size: 0.8rem; padding: 24px;">Tidak ada permohonan perpanjangan yang menunggu keputusan.</div>`;
      } else {
        itemsHtml = activeList.map(t => {
          const semula = formatTimeOnly(getTReturnTime(t)) || '11.15 WIB';
          const usulan = t.extensionRequestedTime ? t.extensionRequestedTime + ' WIB' : '12.00 WIB';
          return `
            <div class="mobile-ticket-item" style="border: 1px solid #e2e8f0;">
              <div class="mobile-ticket-item-header">
                <div>
                  <div style="font-size: 0.875rem; font-weight: 800; color: #0f172a;">${getTName(t)}</div>
                  <div style="font-size: 0.7rem; color: #64748b;">${getTNip(t)} • ${getTDept(t)}</div>
                </div>
                <span class="mobile-badge sedang-di-luar" style="background: #f5f3ff; color: #7c3aed;">Perpanjangan</span>
              </div>

              <div style="font-family: monospace; font-size: 0.775rem; font-weight: 700; color: #475569; margin-bottom: 4px;">
                ${t.id}
              </div>

              <div style="font-size: 0.75rem; color: #b45309; font-weight: 700; margin-bottom: 4px;">
                Menunggu keputusan perpanjangan
              </div>

              <div style="font-size: 0.7rem; color: #64748b; margin-bottom: 8px;">
                Diajukan ${formatTimeOnly(t.createdAt)} • Kembali ${semula} → <strong style="color: #7c3aed;">${usulan}</strong>
              </div>

              <button type="button" class="mobile-btn-primary" onclick="window.mobileOpenAtasanPerpanjanganModal('${t.id}')">
                Tinjau perpanjangan
              </button>
            </div>
          `;
        }).join('');
      }
    }

    container.innerHTML = `
     

      <!-- Segment Tabs (Izin Baru | Perpanjangan) -->
      <div class="mobile-segment-toggle">
        <button type="button" class="mobile-seg-btn ${currentAntreanSegment === 'baru' ? 'active' : ''}" onclick="window.mobileSwitchAntreanSegment('baru')">
          Izin Baru (${pendingNew.length})
        </button>
        <button type="button" class="mobile-seg-btn ${currentAntreanSegment === 'perpanjangan' ? 'active' : ''}" onclick="window.mobileSwitchAntreanSegment('perpanjangan')">
          Perpanjangan (${pendingExt.length})
        </button>
      </div>

      <!-- Result Bar & Filter Button -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 0.725rem; color: #64748b; font-weight: 700;">
          ${activeList.length} ${currentAntreanSegment === 'baru' ? 'izin baru' : 'perpanjangan'} menunggu persetujuan
        </span>
        <button type="button" class="mobile-filter-toggle-btn ${isAntreanFilterOpen ? 'active' : ''}" onclick="window.mobileToggleAntreanFilter()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          <span>${isAntreanFilterOpen ? 'Tutup Filter' : 'Filter'}</span>
          ${(atasanSearchQuery || atasanFilterDate) ? '<span style="width: 6px; height: 6px; border-radius: 50%; background: #059669; display: inline-block;"></span>' : ''}
        </button>
      </div>

      <!-- Collapsible Filter Card -->
      <div id="mAtasanAntreanFilterCard" class="mobile-filter-panel" style="display: ${isAntreanFilterOpen ? 'block' : 'none'};">
        <div class="mobile-filter-panel-title">
          <span>Cari & filter pengajuan</span>
          <button type="button" style="border:none; background:none; font-size:0.75rem; color:#64748b; cursor:pointer;" onclick="window.mobileToggleAntreanFilter()">✕</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div>
            <label class="mobile-filter-label">Cari pengajuan</label>
            <input type="text" class="mobile-filter-input" id="mAtasanInputSearch" placeholder="Nama / NIP / nomor tiket" value="${atasanSearchQuery}">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <label class="mobile-filter-label">Tanggal pengajuan</label>
              <input type="date" class="mobile-filter-input" id="mAtasanInputDate" value="${atasanFilterDate}">
            </div>
            <div>
              <label class="mobile-filter-label">Status</label>
              <select class="mobile-filter-select" id="mAtasanSelectStatus">
                <option value="all">Menunggu Persetujuan</option>
              </select>
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <button type="button" class="mobile-btn-primary" style="flex: 2; padding: 7px 12px; font-size: 0.75rem;" onclick="window.mobileApplyAtasanFilter()">
              Terapkan Filter
            </button>
            <button type="button" class="mobile-btn-secondary" style="flex: 1; padding: 7px 12px; font-size: 0.75rem;" onclick="window.mobileResetAtasanFilter()">
              Reset
            </button>
          </div>
        </div>
      </div>

      <!-- Ticket Items List -->
      ${itemsHtml}
    `;
  }

  // -------------------------------------------------------------------
  // 4. DETAIL PENGAJUAN (Figma PDF Page 3)
  // -------------------------------------------------------------------
  function renderAtasanDetailFullPage(container, ticketId) {
    const tickets = getTeamTickets();
    const t = tickets.find(x => x.id === ticketId);
    const approver = getActiveApprover();
    if (!t) {
      renderAtasanAntrean(container);
      return;
    }

    const isPending = (t.status === 'Menunggu Persetujuan' || t.status === 'Menunggu Otorisasi Darurat');
    const isPulang = (t.type === 'Pulang Mendahului' || t.returnType === 'Pulang Mendahului');

    container.innerHTML = `
      <div style="margin-bottom: 10px;">
        <button type="button" class="mobile-link-rincian" style="border:none; background:none; font-size: 0.75rem; padding: 4px 0;" onclick="window.mobileSwitchTab('antrean')">
          ← Kembali ke antrean
        </button>
      </div>

      <div class="mobile-page-header" style="margin-bottom: 12px;">
        <h1 class="mobile-page-title">Detail Pengajuan</h1>
       
      </div>

      <!-- Kartu Pemohon -->
      <div class="mobile-card" style="margin-bottom: 12px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a;">${getTName(t)}</div>
            <div style="font-size: 0.725rem; color: #64748b;">${getTNip(t)} • ${getTDept(t)}</div>
            <div style="font-family: monospace; font-size: 0.8rem; font-weight: 700; color: #334155; margin-top: 2px;">${t.id}</div>
          </div>
          <span class="mobile-badge ${isPending ? 'menunggu' : (t.status === 'Ditolak' ? 'ditolak' : (t.status === 'Disetujui' ? 'disetujui' : (t.status === 'Sedang di Luar' ? 'sedang-di-luar' : 'selesai')))}">
            ${t.status}
          </span>
        </div>

        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #f1f5f9; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <div class="mobile-meta-sub">Atasan langsung</div>
            <div class="mobile-meta-val">${t.approverName || approver.name}</div>
          </div>
          <div>
            <div class="mobile-meta-sub">Diajukan pada</div>
            <div class="mobile-meta-val">${t.createdAt ? t.createdAt.split(',')[0] : 'Hari ini'}</div>
          </div>
        </div>
      </div>

      <!-- Kartu Informasi Izin -->
      <div class="mobile-card" style="margin-bottom: 12px; padding: 14px;">
        <div style="font-size: 0.8rem; font-weight: 800; color: #0f172a; margin-bottom: 8px;">Informasi izin</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
          <div>
            <div class="mobile-meta-sub">Kategori</div>
            <div class="mobile-meta-val">${t.category}</div>
          </div>
          <div>
            <div class="mobile-meta-sub">Jenis izin</div>
            <div class="mobile-meta-val">${getTType(t)}</div>
          </div>
        </div>

        <div style="margin-bottom: 8px;">
          <div class="mobile-meta-sub">Tujuan</div>
          <div class="mobile-meta-val">${t.destination || 'Area Cikampek'}</div>
        </div>

        <div style="margin-bottom: 8px;">
          <div class="mobile-meta-sub">Alasan pengajuan</div>
          <p style="font-size: 0.75rem; color: #1e293b; margin: 2px 0 0 0; line-height: 1.4; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(t.reason || '').replace(/"/g, '&quot;')}">
            "${t.reason || 'Keperluan dinas kedinasan.'}"
          </p>
        </div>

        <div class="mobile-ticket-grid-meta" style="margin: 0;">
          <div>
            <div class="mobile-meta-sub">Rencana keluar</div>
            <div class="mobile-meta-val">${formatTimeOnly(getTExitTime(t)) || '11.30 WIB'}</div>
          </div>
          <div>
            <div class="mobile-meta-sub">Estimasi kembali</div>
            <div class="mobile-meta-val">${isPulang ? '— (tidak kembali)' : (formatTimeOnly(getTReturnTime(t)) || '13.00 WIB')}</div>
          </div>
        </div>
      </div>

      <!-- Kotak Info Biru (Matching PDF Page 3) -->
      

      <!-- Aktivitas Pengajuan (Timeline) -->
      <div class="mobile-card" style="margin-bottom: 12px; padding: 14px;">
        <div style="font-size: 0.8rem; font-weight: 800; color: #0f172a; margin-bottom: 10px;">Aktivitas pengajuan</div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <div style="font-size: 0.7rem; font-weight: 800; color: #64748b; min-width: 60px;">
              ${formatTimeOnly(t.createdAt || t.plannedExit)}
            </div>
            <div style="flex: 1; font-size: 0.75rem;">
              <div style="font-weight: 800; color: #0f172a;">Pengajuan dikirim</div>
              <div style="font-size: 0.675rem; color: #64748b;">${getTName(t)} • Menunggu Persetujuan</div>
            </div>
          </div>

          ${(t.status === 'Ditolak') ? `
            <div style="display: flex; gap: 10px; align-items: flex-start;">
              <div style="font-size: 0.7rem; font-weight: 800; color: #dc2626; min-width: 60px;">${t.rejectedAt ? formatTimeOnly(t.rejectedAt) : 'Selesai'}</div>
              <div style="flex: 1; font-size: 0.75rem;">
                <div style="font-weight: 800; color: #dc2626;">Pengajuan Ditolak</div>
                <div style="font-size: 0.675rem; color: #7f1d1d;">Oleh ${t.approverName || approver.name} • "${t.rejectionReason || 'Alasan dinas belum memadai.'}"</div>
              </div>
            </div>
          ` : (isPending ? `
            <div style="display: flex; gap: 10px; align-items: flex-start;">
              <div style="font-size: 0.7rem; font-weight: 800; color: #d97706; min-width: 60px;">Saat ini</div>
              <div style="flex: 1; font-size: 0.75rem;">
                <div style="font-weight: 800; color: #0f172a;">Menunggu tindakan</div>
                <div style="font-size: 0.675rem; color: #d97706;">Tinjauan ${approver.name.split(',')[0]} • Belum ada keputusan Atasan</div>
              </div>
            </div>
          ` : `
            <div style="display: flex; gap: 10px; align-items: flex-start;">
              <div style="font-size: 0.7rem; font-weight: 800; color: #059669; min-width: 60px;">${t.approvedAt ? formatTimeOnly(t.approvedAt) : 'Selesai'}</div>
              <div style="flex: 1; font-size: 0.75rem;">
                <div style="font-weight: 800; color: #0f172a;">Disetujui Atasan</div>
                <div style="font-size: 0.675rem; color: #059669;">Disetujui oleh ${t.approverName || approver.name}</div>
              </div>
            </div>
          `)}
        </div>
      </div>

      <!-- Kartu Keputusan Atasan (Matching PDF Page 3) -->
      ${isPending ? `
        <div class="mobile-card" style="margin-bottom: 14px; padding: 14px; border: 1.5px solid #cbd5e1;">
          <div style="font-size: 0.825rem; font-weight: 800; color: #0f172a;">Keputusan Atasan</div>
          

          <div class="mobile-form-group" style="margin-bottom: 8px;">
            <label class="mobile-form-label">Catatan persetujuan (opsional)</label>
            <textarea class="mobile-textarea" id="mAtasanDetailNote" placeholder="Tambahkan catatan jika diperlukan" style="font-size: 0.75rem; min-height: 60px;"></textarea>
          </div>

          

          <div style="display: flex; gap: 8px;">
            <button type="button" class="mobile-btn-danger" style="flex: 1; padding: 10px;" onclick="window.mobileOpenRejectSheet('${t.id}')">
              Tolak
            </button>
            <button type="button" class="mobile-btn-approve" style="flex: 1; padding: 10px;" onclick="window.mobileAtasanExecuteDecision('${t.id}', 'approve')">
              Setujui
            </button>
          </div>
        </div>
      ` : (t.status === 'Ditolak' ? `
        <div class="mobile-card" style="text-align: center; padding: 14px; background: #fef2f2; border: 1.5px solid #fca5a5;">
          <div style="font-size: 0.85rem; font-weight: 800; color: #991b1b; margin-bottom: 4px;">
            ✕ Pengajuan Ditolak
          </div>
          <div style="font-size: 0.725rem; color: #7f1d1d; margin-bottom: 10px;">
            Alasan penolakan: "${t.rejectionReason || 'Alasan dinas belum memadai.'}"
          </div>
          <button type="button" class="mobile-btn-secondary" onclick="window.mobileSwitchTab('dashboard')">
            Kembali ke Beranda
          </button>
        </div>
      ` : `
        <div class="mobile-card" style="text-align: center; padding: 14px;">
          <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 8px;">
            Tiket ini berstatus <strong>${t.status}</strong>. Keputusan telah dicatat resmi.
          </div>
          <button type="button" class="mobile-btn-secondary" onclick="window.mobileSwitchTab('antrean')">
            Kembali ke Antrean
          </button>
        </div>
      `)}
    `;
  }

  // -------------------------------------------------------------------
  // 5. PELACAKAN TIM (Figma PDF Page 4: Tab 'Tim')
  // -------------------------------------------------------------------
  function renderAtasanTim(container) {
    const approver = getActiveApprover();
    const tickets = getTeamTickets();

    const outsideTickets = tickets.filter(t => t.status === 'Sedang di Luar' || t.status === 'Terlambat');
    const lateTickets = tickets.filter(t => t.status === 'Terlambat' || (t.isLate && t.status !== 'Selesai'));
    const readyTickets = tickets.filter(t => t.status === 'Disetujui');

    const parseTime = (t) => {
      const raw = t.scanOutTime || t.approvedAt || t.createdAt || t.plannedExit || 0;
      const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
      return (d && !isNaN(d.getTime())) ? d.getTime() : 0;
    };

    // Urutkan prioritas: Terlambat > Sedang di Luar > Disetujui > Selesai
    const sortedEligible = [...tickets].filter(t => 
      t.status === 'Sedang di Luar' || 
      t.status === 'Terlambat' || 
      t.status === 'Disetujui' || 
      t.status === 'Selesai'
    ).sort((a, b) => {
      const getPriority = (x) => {
        if (x.status === 'Terlambat' || (x.isLate && x.status !== 'Selesai')) return 1;
        if (x.status === 'Sedang di Luar') return 2;
        if (x.status === 'Disetujui') return 3;
        if (x.status === 'Selesai') return 4;
        return 5;
      };
      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) return pA - pB;
      return parseTime(b) - parseTime(a);
    });

    let teamCardsList = [];
    if (atasanTimFilter === 'outside') {
      teamCardsList = sortedEligible.filter(t => t.status === 'Sedang di Luar' || t.status === 'Terlambat');
    } else if (atasanTimFilter === 'late') {
      teamCardsList = sortedEligible.filter(t => t.status === 'Terlambat' || (t.isLate && t.status !== 'Selesai'));
    } else if (atasanTimFilter === 'ready') {
      teamCardsList = sortedEligible.filter(t => t.status === 'Disetujui');
    } else {
      // 'all': Seluruh tiket aktif (Sedang di Luar, Terlambat, Disetujui) WAJIB tampil semua + 5 tiket selesai terbaru
      const activeTickets = sortedEligible.filter(t => t.status === 'Sedang di Luar' || t.status === 'Terlambat' || t.status === 'Disetujui');
      const recentDone = sortedEligible.filter(t => t.status === 'Selesai').slice(0, 5);
      teamCardsList = [...activeTickets, ...recentDone];
    }

    // Filter live search jika ada input pencarian
    if (atasanTimSearchQuery && atasanTimSearchQuery.trim()) {
      const q = atasanTimSearchQuery.trim().toLowerCase();
      teamCardsList = teamCardsList.filter(t => {
        const name = (getTName(t) || '').toLowerCase();
        const nip = (getTNip(t) || '').toLowerCase();
        const dept = (getTDept(t) || '').toLowerCase();
        const id = (t.id || '').toLowerCase();
        const dest = (t.destination || '').toLowerCase();
        return name.includes(q) || nip.includes(q) || dept.includes(q) || id.includes(q) || dest.includes(q);
      });
    }

    const totalTimItems = teamCardsList.length;
    const totalTimPages = Math.ceil(totalTimItems / atasanTimPageSize) || 1;
    if (currentAtasanTimPage > totalTimPages) currentAtasanTimPage = totalTimPages;
    if (currentAtasanTimPage < 1) currentAtasanTimPage = 1;

    const startIdx = (currentAtasanTimPage - 1) * atasanTimPageSize;
    const pageTeamCards = teamCardsList.slice(startIdx, startIdx + atasanTimPageSize);

    // Selected ticket for timeline view (default to first active or first in list)
    if (!selectedTimTicketId && teamCardsList.length > 0) {
      selectedTimTicketId = (outsideTickets[0] && outsideTickets[0].id) || teamCardsList[0].id;
    }
    const selectedTicket = tickets.find(x => x.id === selectedTimTicketId) || teamCardsList[0];

    const listHtml = pageTeamCards.map(t => {
      const isLate = (t.status === 'Terlambat' || (t.isLate && t.status !== 'Selesai'));
      const isOutside = (t.status === 'Sedang di Luar');
      const isApproved = (t.status === 'Disetujui');
      const isSelesai = (t.status === 'Selesai');
      const isSelected = (selectedTicket && selectedTicket.id === t.id);

      let statusBadgeClass = 'disetujui';
      let statusSubtitle = 'Belum keluar • Izin masih berlaku';
      if (isLate) {
        statusBadgeClass = 'terlambat';
        statusSubtitle = 'Terlambat • Melebihi batas jam kembali';
      } else if (isOutside) {
        statusBadgeClass = 'sedang-di-luar';
        statusSubtitle = t.hasExtensionPending ? 'Menunggu keputusan perpanjangan' : 'Sedang berada di luar area pabrik';
      } else if (isSelesai) {
        statusBadgeClass = 'selesai';
        statusSubtitle = 'Tepat Waktu • Selesai';
      }

      return `
        <div class="mobile-ticket-item" style="border: 1px solid #e2e8f0; margin-bottom: 10px;">
          <div class="mobile-ticket-item-header">
            <div>
              <div style="font-size: 0.875rem; font-weight: 800; color: #0f172a;">${getTName(t)}</div>
              <div style="font-size: 0.7rem; color: #64748b;">${getTNip(t)} • ${getTDept(t)}</div>
            </div>
            <span class="mobile-badge ${statusBadgeClass}">${t.status}</span>
          </div>

          <div style="font-family: monospace; font-size: 0.75rem; font-weight: 700; color: #475569; margin-bottom: 2px;">
            ${t.id}
          </div>
          <div style="font-size: 0.7rem; color: #64748b; margin-bottom: 6px;">
            ${statusSubtitle}
          </div>

          <div class="mobile-ticket-grid-meta">
            <div>
              <div class="mobile-meta-sub">Rencana keluar</div>
              <div class="mobile-meta-val">${formatTimeOnly(getTExitTime(t)) || '09.45 WIB'}</div>
            </div>
            <div>
              <div class="mobile-meta-sub">Scan Out aktual</div>
              <div class="mobile-meta-val">${t.scanOutTime ? formatTimeOnly(t.scanOutTime) : '—'}</div>
            </div>
            <div>
              <div class="mobile-meta-sub">Estimasi kembali</div>
              <div class="mobile-meta-val" style="color: ${isLate ? '#b91c1c' : '#0f172a'};">
                ${formatTimeOnly(getTReturnTime(t)) || '11.15 WIB'}
              </div>
            </div>
            <div>
              <div class="mobile-meta-sub">Scan In aktual</div>
              <div class="mobile-meta-val">${t.scanInTime ? formatTimeOnly(t.scanInTime) : '—'}</div>
            </div>
          </div>

          ${t.hasExtensionPending ? `
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 6px 10px; font-size: 0.7rem; color: #92400e; margin-bottom: 6px;">
              <strong>Estimasi yang diminta:</strong> ${t.extensionRequestedTime || '12.00'} WIB (belum disetujui)
            </div>
          ` : ''}

          <div style="display: flex; justify-content: flex-end;">
            <button type="button" class="mobile-btn-secondary" style="padding: 6px 12px; font-size: 0.725rem; width: auto; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; min-height: 36px;" onclick="window.mobileOpenTicketDetail('${t.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              <span>Detail pengajuan</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Empty state
    const emptyHtml = `
      <div class="mobile-card" style="text-align: center; padding: 28px 16px; border: 1.5px dashed #cbd5e1; border-radius: 14px; background: #ffffff;">
        <div style="color: #94a3b8; margin-bottom: 8px;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        </div>
        <div style="font-size: 0.9rem; font-weight: 800; color: #0f172a; margin-bottom: 4px;">Tidak Ada Tiket Tim Ditemukan</div>
        <div style="font-size: 0.775rem; color: #475569; max-width: 260px; margin: 0 auto; line-height: 1.4;">
          ${atasanTimSearchQuery ? `Tidak ada tiket tim yang cocok dengan kata kunci "<strong>${atasanTimSearchQuery}</strong>".` : 'Tidak ada pergerakan bawahan pada kriteria filter ini.'}
        </div>
        ${(atasanTimSearchQuery || atasanTimFilter !== 'all') ? `
          <button type="button" class="mobile-btn-secondary" style="margin-top: 14px; padding: 8px 16px; font-size: 0.75rem; width: auto; font-weight: 700; min-height: 40px; display: inline-flex; align-items: center; gap: 6px;" onclick="window.mobileResetTimFilter()">
            <span>Reset Pencarian & Filter</span>
          </button>
        ` : ''}
      </div>
    `;

    // Dynamic Pagination Buttons
    let paginationHtml = '';
    if (totalTimPages > 1) {
      let pageBtns = '';
      for (let p = 1; p <= totalTimPages; p++) {
        const isActive = (p === currentAtasanTimPage);
        pageBtns += `
          <button type="button" style="min-width: 36px; height: 36px; padding: 0 8px; border-radius: 8px; border: 1px solid ${isActive ? '#2563eb' : '#cbd5e1'}; background: ${isActive ? '#2563eb' : '#ffffff'}; color: ${isActive ? '#ffffff' : '#334155'}; font-size: 0.8rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;" onclick="window.mobileSetAtasanTimPage(${p})">
            ${p}
          </button>
        `;
      }
      paginationHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin: 18px 0 8px 0; gap: 8px;">
          <div style="font-size: 0.725rem; color: #64748b; font-weight: 600;">
            Menampilkan ${startIdx + 1}–${Math.min(startIdx + atasanTimPageSize, totalTimItems)} dari ${totalTimItems} tiket
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-left: auto;">
            ${pageBtns}
          </div>
        </div>
      `;
    }

    // Active filter label
    let filterLabel = 'Semua';
    if (atasanTimFilter === 'outside') filterLabel = 'Di Luar';
    else if (atasanTimFilter === 'late') filterLabel = 'Terlambat';
    else if (atasanTimFilter === 'ready') filterLabel = 'Siap Keluar';

    const activeFilterSummaryHtml = (atasanTimFilter !== 'all') ? `
      <div style="font-size: 0.725rem; color: #047857; background: #ecfdf5; border: 1.2px solid #a7f3d0; border-radius: 8px; padding: 6px 12px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
        <span>Filter: <strong>${filterLabel}</strong> • ${totalTimItems} tiket</span>
        <button type="button" onclick="window.mobileResetTimFilter()" style="background: none; border: none; color: #059669; font-size: 0.725rem; font-weight: 700; cursor: pointer; text-decoration: underline; padding: 2px 4px;">Atur Ulang</button>
      </div>
    ` : '';

    container.innerHTML = `
      <!-- Banner Status Perjalanan Tim -->
      <div class="mobile-card" style="padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: 10px; font-size: 0.75rem; color: #334155;">
        <strong>Status perjalanan tim:</strong> <span style="color: #7c3aed; font-weight: 700;">${outsideTickets.length} di luar area</span>, termasuk <span style="color: #dc2626; font-weight: 700;">${lateTickets.length} terlambat</span>.
      </div>

      <!-- Live Search Bar -->
      <div style="display: flex; align-items: center; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 0 12px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.2" style="flex-shrink: 0; margin-right: 8px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="mAtasanTimLiveSearch" placeholder="Cari nama bawahan, NIP, nomor tiket..." value="${atasanTimSearchQuery}" style="flex: 1; border: none; background: transparent; font-size: 0.825rem; color: #0f172a; padding: 11px 0; outline: none; min-width: 0;" oninput="window.mobileDebounceTimSearch(this.value)">
        <button type="button" id="mBtnClearTimSearch" aria-label="Hapus teks pencarian" style="display: ${atasanTimSearchQuery ? 'inline-flex' : 'none'}; border: none; background: #e2e8f0; color: #475569; width: 24px; height: 24px; border-radius: 50%; align-items: center; justify-content: center; font-size: 11px; cursor: pointer; flex-shrink: 0; margin-left: 6px;" onclick="window.mobileClearTimSearch()">✕</button>
      </div>

      <!-- Toolbar: Ringkasan di Kiri, Tombol Filter di Kanan (Sejajar) -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; width: 100%; box-sizing: border-box;">
        <div style="font-size: 0.775rem; font-weight: 700; color: #475569;">
          ${totalTimItems} tiket pelacakan
        </div>
        <!-- Tombol Filter (36x36px visual, Hit Area >= 44x44px, latar putih, border tipis, icon abu-abu, dot hijau aktif) -->
        <button type="button" class="mobile-filter-toggle-btn mobile-touch-hit-44 ${isAtasanTimFilterOpen ? 'active' : ''}" style="width: 36px; height: 36px; min-width: 36px; min-height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; border: 1.5px solid ${isAtasanTimFilterOpen ? '#059669' : '#cbd5e1'}; background: ${isAtasanTimFilterOpen ? '#ecfdf5' : '#ffffff'}; color: ${isAtasanTimFilterOpen ? '#047857' : '#334155'}; cursor: pointer; box-sizing: border-box; position: relative;" onclick="window.mobileToggleAtasanTimFilter()" title="Filter Status Pelacakan" aria-label="Filter Status Pelacakan">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          ${(atasanTimFilter !== 'all') ? '<span style="position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; border-radius: 50%; background: #059669;"></span>' : ''}
        </button>
      </div>

      <!-- One-line Active Filter Summary -->
      ${activeFilterSummaryHtml}

      <!-- Collapsible Filter Panel -->
      <div id="mAtasanTimFilterCard" class="mobile-filter-panel" style="display: ${isAtasanTimFilterOpen ? 'block' : 'none'}; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div class="mobile-filter-panel-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-weight: 800; font-size: 0.8125rem; color: #0f172a;">Filter Status Pelacakan</span>
          <button type="button" style="border: none; background: none; font-size: 0.85rem; color: #64748b; cursor: pointer; padding: 4px;" onclick="window.mobileToggleAtasanTimFilter()">✕</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div>
            <label class="mobile-filter-label" style="display: block; font-size: 0.75rem; font-weight: 700; color: #475569; margin-bottom: 6px;">Status Bawahan</label>
            <select class="mobile-filter-select" id="mAtasanSelectTimFilter" style="width: 100%; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; font-size: 0.8rem; color: #0f172a; background: #ffffff;">
              <option value="all" ${atasanTimFilter === 'all' ? 'selected' : ''}>Semua (${sortedEligible.length})</option>
              <option value="outside" ${atasanTimFilter === 'outside' ? 'selected' : ''}>Sedang di Luar (${outsideTickets.length})</option>
              <option value="late" ${atasanTimFilter === 'late' ? 'selected' : ''}>Terlambat (${lateTickets.length})</option>
              <option value="ready" ${atasanTimFilter === 'ready' ? 'selected' : ''}>Siap Keluar (${readyTickets.length})</option>
            </select>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <button type="button" class="mobile-btn-primary" style="flex: 1; min-height: 40px; padding: 0 12px; font-size: 0.775rem; font-weight: 700; background: #059669; color: #ffffff; border: 1.5px solid #059669; border-radius: 8px; cursor: pointer;" onclick="window.mobileApplyTimFilter()">
              Terapkan
            </button>
            <button type="button" class="mobile-btn-secondary" style="flex: 1; min-height: 40px; padding: 0 12px; font-size: 0.775rem; font-weight: 700; background: #ffffff; color: #475569; border: 1.5px solid #cbd5e1; border-radius: 8px; cursor: pointer;" onclick="window.mobileResetTimFilter()">
              Atur Ulang
            </button>
          </div>
        </div>
      </div>

      <!-- List of Team Members Cards or Empty State -->
      ${teamCardsList.length > 0 ? listHtml : emptyHtml}

      <!-- Dynamic Pagination -->
      ${paginationHtml}
    `;
  }

  // -------------------------------------------------------------------
  // 6. RIWAYAT PERSETUJUAN (Figma PDF Page 5)
  // -------------------------------------------------------------------
  function renderAtasanRiwayat(container) {
    const approver = getActiveApprover();
    const tickets = getTeamTickets().filter(t => {
      const isEmergency = Boolean(t.isEmergency || (t.id && (t.id.includes('-EMG-') || t.id.startsWith('TK-EMG'))));
      if (isEmergency) return true; // Izin darurat masuk riwayat segera setelah pengajuan dibuat
      return t.status === 'Disetujui' || t.status === 'Selesai' || t.status === 'Ditolak' || t.status === 'Sedang di Luar' || t.status === 'Terlambat';
    });

    const emergencyCount = tickets.filter(t => Boolean(t.isEmergency || (t.id && t.id.includes('-EMG-')))).length;
    const approverDecidedCount = Math.max(0, tickets.length - emergencyCount);

    let filtered = tickets;
    if (atasanRiwayatSearch) {
      const q = atasanRiwayatSearch.toLowerCase();
      filtered = filtered.filter(t => 
        (getTName(t).toLowerCase().includes(q)) ||
        (getTNip(t).toLowerCase().includes(q)) ||
        (t.id && t.id.toLowerCase().includes(q))
      );
    }
    if (atasanRiwayatFilterDecision !== 'all') {
      if (atasanRiwayatFilterDecision === 'approved') filtered = filtered.filter(t => t.status === 'Disetujui' || (t.status === 'Selesai' && !t.rejectionReason));
      else if (atasanRiwayatFilterDecision === 'rejected') filtered = filtered.filter(t => t.status === 'Ditolak');
      else if (atasanRiwayatFilterDecision === 'emergency') filtered = filtered.filter(t => Boolean(t.isEmergency || (t.id && t.id.includes('-EMG-'))));
    }

    filtered.sort((a, b) => {
      const parseTime = (t) => {
        const raw = t.approvedAt || t.rejectedAt || t.createdAt || t.plannedExit || 0;
        const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
        return (d && !isNaN(d.getTime())) ? d.getTime() : 0;
      };
      const tA = parseTime(a);
      const tB = parseTime(b);
      return atasanRiwayatSortOrder === 'asc' ? tA - tB : tB - tA;
    });

    const cardsHtml = filtered.map(t => {
      const isDitolak = (t.status === 'Ditolak');
      const isEmergency = Boolean(t.isEmergency || (t.id && t.id.includes('-EMG-')));
      const isLate = (t.status === 'Terlambat' || t.isLate);
      
      let badgeDecisionClass = isDitolak ? 'ditolak' : 'disetujui';
      let badgeDecisionLabel = isDitolak ? 'Ditolak' : (isEmergency ? 'Penerbitan darurat' : 'Disetujui');
      let deciderSource = isEmergency ? 'Sistem' : (t.approverName || approver.name.split(',')[0]);

      let currentStatusBadgeClass = 'selesai';
      if (isLate) currentStatusBadgeClass = 'terlambat';
      else if (t.status === 'Sedang di Luar') currentStatusBadgeClass = 'sedang-di-luar';
      else if (isDitolak) currentStatusBadgeClass = 'ditolak';

      return `
        <div class="mobile-ticket-item" style="margin-bottom: 12px; padding: 12px 14px;">
          <div class="mobile-ticket-item-header">
            <div>
              <div style="font-size: 0.875rem; font-weight: 800; color: #0f172a;">${getTName(t)}</div>
              <div style="font-size: 0.7rem; color: #64748b;">${getTNip(t)} • ${getTDept(t)}</div>
            </div>
            <span class="mobile-badge ${badgeDecisionClass}">${badgeDecisionLabel}</span>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 4px;">
            <span style="font-family: monospace; font-size: 0.775rem; font-weight: 700; color: #475569;">${t.id}</span>
            ${isEmergency ? '<span class="mobile-badge darurat" style="background: #fee2e2; color: #b91c1c; border: 1.2px solid #fca5a5; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 6px;">Izin Darurat</span>' : ''}
          </div>

          <div class="mobile-ticket-grid-meta" style="margin: 6px 0;">
            <div>
              <div class="mobile-meta-sub">Waktu keputusan</div>
              <div class="mobile-meta-val">${t.approvedAt || t.rejectedAt || (t.createdAt ? t.createdAt.split(',')[0] + ' • ' + formatTimeOnly(t.createdAt) : 'Hari ini • 09.30 WIB')}</div>
            </div>
            <div>
              <div class="mobile-meta-sub">Keputusan / sumber</div>
              <div class="mobile-meta-val">${deciderSource}</div>
            </div>
          </div>

          <div style="background: #f8fafc; border-radius: 6px; padding: 6px 10px; margin-bottom: 6px; font-size: 0.7rem; color: #475569;">
            <strong>Catatan Atasan:</strong> "${t.approverNote || t.rejectionReason || (isEmergency ? 'Oleh sistem • Bukan keputusan Atasan.' : '—')}"
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
            <div style="font-size: 0.7rem; color: #64748b;">
              Status saat ini: <span class="mobile-badge ${currentStatusBadgeClass}">${t.status}</span>
            </div>
            <button type="button" class="mobile-btn-detail" aria-label="Lihat Detail tiket ${t.id}" onclick="window.mobileOpenAtasanDetailModal('${t.id}')">
            Lihat Detail
          </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="mobile-page-header">
      
        <h1 class="mobile-page-title">Riwayat Persetujuan</h1>
      </div>

      <!-- Result Bar & Filter Button -->
      <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 10px;">
        <button type="button" class="mobile-filter-toggle-btn ${isAtasanRiwayatFilterOpen ? 'active' : ''}" onclick="window.mobileToggleAtasanRiwayatFilter()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          <span>${isAtasanRiwayatFilterOpen ? 'Tutup Filter' : 'Filter'}</span>
          ${(atasanRiwayatSearch || atasanRiwayatFilterDecision !== 'all') ? '<span style="width: 6px; height: 6px; border-radius: 50%; background: #059669; display: inline-block;"></span>' : ''}
        </button>
      </div>

      <!-- Collapsible Filter Card -->
      <div id="mAtasanRiwayatFilterCard" class="mobile-filter-panel" style="display: ${isAtasanRiwayatFilterOpen ? 'block' : 'none'};">
        <div class="mobile-filter-panel-title">
          <span>Cari & filter riwayat</span>
          <button type="button" style="border:none; background:none; font-size:0.75rem; color:#64748b; cursor:pointer;" onclick="window.mobileToggleAtasanRiwayatFilter()">✕</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div>
            <label class="mobile-filter-label">Cari nama / NIP / tiket</label>
            <input type="text" class="mobile-filter-input" id="mRiwayatSearch" placeholder="Semua bawahan langsung" value="${atasanRiwayatSearch}">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <label class="mobile-filter-label">Keputusan</label>
              <select class="mobile-filter-select" id="mRiwayatDecision" onchange="window.mobileFilterRiwayatDecision(this.value)">
                <option value="all" ${atasanRiwayatFilterDecision === 'all' ? 'selected' : ''}>Semua keputusan</option>
                <option value="approved" ${atasanRiwayatFilterDecision === 'approved' ? 'selected' : ''}>Disetujui</option>
                <option value="rejected" ${atasanRiwayatFilterDecision === 'rejected' ? 'selected' : ''}>Ditolak</option>
                <option value="emergency" ${atasanRiwayatFilterDecision === 'emergency' ? 'selected' : ''}>Penerbitan darurat</option>
              </select>
            </div>
            <div>
              <label class="mobile-filter-label">Urutan</label>
              <select class="mobile-filter-select" id="mRiwayatSortAtasan" onchange="window.mobileFilterRiwayatSort(this.value)">
                <option value="desc" ${atasanRiwayatSortOrder === 'desc' ? 'selected' : ''}>Terbaru</option>
                <option value="asc" ${atasanRiwayatSortOrder === 'asc' ? 'selected' : ''}>Terlama</option>
              </select>
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <button type="button" class="mobile-btn-primary" style="flex: 2; padding: 7px 12px; font-size: 0.75rem;" onclick="window.mobileApplyRiwayatFilter()">
              Terapkan Filter
            </button>
            <button type="button" class="mobile-btn-secondary" style="flex: 1; padding: 7px 12px; font-size: 0.75rem;" onclick="window.mobileResetAtasanRiwayatFilter()">
              Reset
            </button>
          </div>
        </div>
      </div>

      <!-- History Cards List -->
      ${cardsHtml || '<div class="mobile-card" style="text-align: center; color: #64748b; font-size: 0.8rem; padding: 24px;">Tidak ada riwayat yang cocok dengan filter.</div>'}

      <!-- Pagination -->
      <div style="display: flex; justify-content: center; gap: 6px; margin: 16px 0;">
        <span style="display: inline-flex; width: 32px; height: 32px; border-radius: 8px; background: #2563eb; color: #fff; font-size: 0.75rem; font-weight: 800; align-items: center; justify-content: center;">1</span>
      </div>
    `;
  }

  // -------------------------------------------------------------------
  // 7. TINJAU PERPANJANGAN (Figma PDF Page 6)
  // -------------------------------------------------------------------
  window.mobileOpenAtasanPerpanjanganModal = function (ticketId) {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;

    const tickets = getTeamTickets();
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;

    const semula = formatTimeOnly(getTReturnTime(t)) || '11.15 WIB';
    const usulan = t.extensionRequestedTime ? t.extensionRequestedTime + ' WIB' : '12.00 WIB';

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header">
        <div>
         
          <h3 class="mobile-sheet-title">Tinjau Perpanjangan</h3>
        </div>
        <button type="button" class="mobile-sheet-close" onclick="window.mobileCloseSheet()">✕</button>
      </div>

      <div class="mobile-sheet-body">
       

        <!-- Blue Alert Box -->
       

        <!-- Karyawan Card -->
        <div class="mobile-card" style="margin-bottom: 12px; padding: 12px 14px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 0.9rem; font-weight: 800; color: #0f172a;">${getTName(t)}</div>
              <div style="font-size: 0.7rem; color: #64748b;">${getTNip(t)} • ${getTDept(t)}</div>
              <div style="font-family: monospace; font-size: 0.75rem; font-weight: 700; color: #475569; margin-top: 2px;">${t.id}</div>
            </div>
            <span class="mobile-badge sedang-di-luar">Sedang di Luar</span>
          </div>

          <div style="margin: 8px 0 6px 0;">
            <span class="mobile-badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a;">
              Menunggu keputusan perpanjangan
            </span>
          </div>

          <div class="mobile-ticket-grid-meta" style="margin: 8px 0;">
            <div>
              <div class="mobile-meta-sub">Estimasi kembali semula</div>
              <div class="mobile-meta-val">${semula}</div>
            </div>
            <div>
              <div class="mobile-meta-sub">Estimasi yang diminta</div>
              <div class="mobile-meta-val" style="color: #7c3aed; font-weight: 800;">${usulan}</div>
            </div>
          </div>
          <div style="font-size: 0.675rem; color: #b45309; font-weight: 700;">Waktu yang diminta belum disetujui.</div>

          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9;">
            <div class="mobile-meta-sub">Alasan perpanjangan</div>
            <p style="font-size: 0.75rem; color: #1e293b; margin: 2px 0 0 0; line-height: 1.35;">
              "${t.extensionReason || (t.pendingExtension && t.pendingExtension.reason) || 'Koordinasi pemeriksaan dokumen belum selesai.'}"
            </p>
          </div>

          <div style="margin-top: 8px; font-size: 0.675rem; color: #64748b;">
            Diajukan: ${formatTimeOnly(t.createdAt)} • Pengajuan perpanjangan 1 dari maksimal 1 kali
          </div>
        </div>

       

        <!-- Keputusan Perpanjangan -->
        <div class="mobile-card" style="margin-bottom: 12px; padding: 12px 14px;">
          <div style="font-size: 0.8rem; font-weight: 800; color: #0f172a; margin-bottom: 2px;">Keputusan perpanjangan</div>
          <div style="font-size: 0.675rem; color: #64748b; margin-bottom: 8px;">
            Pengajuan dikirim saat Sedang di Luar, sebelum estimasi kembali semula. Maksimal 1 kali.
          </div>

          <div class="mobile-form-group">
            <label class="mobile-form-label">Catatan persetujuan (opsional)</label>
            <textarea class="mobile-textarea" id="mExtDecisionNote" placeholder="Tambahkan catatan jika diperlukan" style="font-size: 0.75rem; min-height: 50px;"></textarea>
          </div>

          

          <div style="display: flex; gap: 8px;">
            <button type="button" class="mobile-btn-danger" style="flex: 1; padding: 10px;" onclick="window.mobileAtasanExecuteExtension('${t.id}', 'reject')">
              Tolak
            </button>
            <button type="button" class="mobile-btn-approve" style="flex: 1; padding: 10px;" onclick="window.mobileAtasanExecuteExtension('${t.id}', 'approve')">
              Setujui
            </button>
          </div>
        </div>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  // -------------------------------------------------------------------
  // 8. DETAIL NOTIFIKASI DARURAT (Figma PDF Page 7)
  // -------------------------------------------------------------------
  window.mobileOpenAtasanDaruratModal = function (ticketId) {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;

    const tickets = getTeamTickets();
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header">
        <div>
          <span style="font-size: 0.7rem; color: #b91c1c; font-weight: 700;">NOTIFIKASI DARURAT</span>
          <h3 class="mobile-sheet-title">Detail Notifikasi Darurat</h3>
        </div>
        <button type="button" class="mobile-sheet-close" onclick="window.mobileCloseSheet()">✕</button>
      </div>

      <div class="mobile-sheet-body">
        <div style="font-size: 0.725rem; color: #64748b; margin-bottom: 10px;">
          Pencatatan baca saja untuk peninjauan susulan oleh Atasan langsung.
        </div>

        <div class="mobile-card" style="margin-bottom: 12px; padding: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a;">${getTName(t)}</div>
              <div style="font-size: 0.725rem; color: #64748b;">${getTNip(t)} • ${getTDept(t)}</div>
              <div style="font-family: monospace; font-size: 0.775rem; font-weight: 700; color: #475569; margin-top: 2px;">${t.id}</div>
            </div>
            <span class="mobile-badge darurat">Selesai Darurat</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 0;">
            <div>
              <div class="mobile-meta-sub">Kategori</div>
              <div class="mobile-meta-val">${t.category || 'Urusan Pribadi'}</div>
            </div>
            <div>
              <div class="mobile-meta-sub">Jenis izin</div>
              <div class="mobile-meta-val">${getTType(t) || 'Pulang Lebih Awal'}</div>
            </div>
          </div>

          <div style="margin-bottom: 10px;">
            <div class="mobile-meta-sub">Alasan</div>
            <p style="font-size: 0.75rem; color: #1e293b; margin: 2px 0 0 0; line-height: 1.35;">
              ${t.reason || 'Kondisi medis mendadak.'}
            </p>
            <div style="font-size: 0.65rem; color: #94a3b8; margin-top: 2px;">
              Tidak menampilkan diagnosis atau informasi medis sensitif.
            </div>
          </div>

          <div class="mobile-ticket-grid-meta" style="margin: 0;">
            <div>
              <div class="mobile-meta-sub">Penerbitan oleh sistem</div>
              <div class="mobile-meta-val">${t.createdAt ? formatTimeOnly(t.createdAt) : '09.15 WIB'}</div>
            </div>
            <div>
              <div class="mobile-meta-sub">Scan Out • Pos Jaga</div>
              <div class="mobile-meta-val">${t.scanOutTime ? formatTimeOnly(t.scanOutTime) : '09.20 WIB'}</div>
            </div>
          </div>

          <div style="margin-top: 8px; font-size: 0.7rem; color: #475569;">
            <strong>Verifikasi fisik:</strong> ${t.securityOfficerOut || 'Petugas Joko Santoso'} • Pos Jaga
          </div>
        </div>

        <button type="button" class="mobile-btn-primary" style="margin-top: 4px;" onclick="window.mobileCloseSheet()">
          Tandai Telah Ditinjau
        </button>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  // Helper actions
  window.mobileOpenAtasanDetailModal = function (ticketId) {
    viewingTicketId = ticketId;
    renderMobileAtasan(null, 'detail');
  };

  window.mobileSelectTimTicket = function (ticketId) {
    selectedTimTicketId = ticketId;
    renderMobileAtasan(null, 'tim');
  };

  window.mobileFilterTim = function (filter) {
    atasanTimFilter = filter;
    currentAtasanTimPage = 1;
    renderMobileAtasan(null, 'tim');
  };

  window.mobileToggleAtasanTimFilter = function () {
    isAtasanTimFilterOpen = !isAtasanTimFilterOpen;
    renderMobileAtasan(null, 'tim');
  };

  window.mobileApplyTimFilter = function () {
    const sel = document.getElementById('mAtasanSelectTimFilter');
    if (sel) {
      atasanTimFilter = sel.value;
    }
    isAtasanTimFilterOpen = false;
    currentAtasanTimPage = 1;
    renderMobileAtasan(null, 'tim');
  };

  window.mobileResetTimFilter = function () {
    atasanTimFilter = 'all';
    atasanTimSearchQuery = '';
    isAtasanTimFilterOpen = false;
    currentAtasanTimPage = 1;
    renderMobileAtasan(null, 'tim');
  };

  window.mobileDebounceTimSearch = function (val) {
    atasanTimSearchQuery = val;
    if (atasanTimDebounceTimer) clearTimeout(atasanTimDebounceTimer);
    atasanTimDebounceTimer = setTimeout(() => {
      currentAtasanTimPage = 1;
      renderMobileAtasan(null, 'tim');
      const input = document.getElementById('mAtasanTimLiveSearch');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 300);
  };

  window.mobileClearTimSearch = function () {
    atasanTimSearchQuery = '';
    currentAtasanTimPage = 1;
    renderMobileAtasan(null, 'tim');
  };

  window.mobileSetAtasanTimPage = function (p) {
    currentAtasanTimPage = p;
    renderMobileAtasan(null, 'tim');
  };

  window.mobileSwitchAntreanSegment = function (seg) {
    currentAntreanSegment = seg;
    renderMobileAtasan(null, 'antrean');
  };

  window.mobileToggleAntreanFilter = function () {
    isAntreanFilterOpen = !isAntreanFilterOpen;
    renderMobileAtasan(null, 'antrean');
  };

  window.mobileToggleAtasanRiwayatFilter = function () {
    isAtasanRiwayatFilterOpen = !isAtasanRiwayatFilterOpen;
    renderMobileAtasan(null, 'riwayat');
  };

  window.mobileApplyAtasanFilter = function () {
    const inputSearch = document.getElementById('mAtasanInputSearch');
    const inputDate = document.getElementById('mAtasanInputDate');
    atasanSearchQuery = inputSearch ? inputSearch.value.trim() : '';
    atasanFilterDate = inputDate ? inputDate.value : '';
    renderMobileAtasan(null, 'antrean');
  };

  window.mobileResetAtasanFilter = function () {
    atasanSearchQuery = '';
    atasanFilterDate = '';
    renderMobileAtasan(null, 'antrean');
  };

  window.mobileApplyRiwayatFilter = function () {
    const input = document.getElementById('mRiwayatSearch');
    atasanRiwayatSearch = input ? input.value.trim() : '';
    const sortEl = document.getElementById('mRiwayatSortAtasan');
    if (sortEl) atasanRiwayatSortOrder = sortEl.value;
    renderMobileAtasan(null, 'riwayat');
  };

  window.mobileResetAtasanRiwayatFilter = function () {
    atasanRiwayatSearch = '';
    atasanRiwayatFilterDecision = 'all';
    atasanRiwayatSortOrder = 'desc';
    renderMobileAtasan(null, 'riwayat');
  };

  window.mobileFilterRiwayatDecision = function (val) {
    atasanRiwayatFilterDecision = val;
    renderMobileAtasan(null, 'riwayat');
  };

  window.mobileFilterRiwayatSort = function (val) {
    atasanRiwayatSortOrder = val;
    renderMobileAtasan(null, 'riwayat');
  };

  window.mobileQuickApproveTicket = function (ticketId) {
    window.mobileAtasanExecuteDecision(ticketId, 'approve', 'Disetujui. Selesaikan tugas tepat waktu.');
  };

  window.mobileAtasanExecuteDecision = function (ticketId, decision, defaultNote) {
    const note = defaultNote || document.getElementById('mAtasanDetailNote')?.value || (decision === 'approve' ? 'Disetujui.' : 'Ditolak: Alasan dinas belum memadai.');

    const list = window.ticketsList || [];
    const t = list.find(x => x.id === ticketId);
    if (t) {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const nowFormatted = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;
      const approver = getActiveApprover();

      if (!t.timeline) t.timeline = [];

      if (decision === 'approve') {
        t.status = 'Disetujui';
        t.emergencyLocked = false;
        t.qrLocked = false;
        t.approverNote = note;
        t.approverName = approver.name;
        t.approvedAt = nowFormatted;
        t.timeline.push(
          {
            event: 'Disetujui Atasan',
            time: nowFormatted,
            by: `${approver.name} (${approver.title || 'Atasan Langsung'})`,
            desc: `Persetujuan diberikan. Catatan: "${note}"`
          },
          {
            event: 'QR Code Diterbitkan',
            time: nowFormatted,
            by: 'Sistem Gerbang Digital',
            desc: 'Tiket QR aktif resmi siap dipindai di Pos Jaga Utama.'
          }
        );
      } else {
        t.status = 'Ditolak';
        t.emergencyLocked = true;
        t.qrLocked = true;
        t.emergencyPasscode = undefined;
        t.rejectionReason = note;
        t.approverNote = `Ditolak: ${note}`;
        t.approverName = approver.name;
        t.rejectedAt = nowFormatted;
        t.timeline.push({
          event: 'Ditolak Atasan',
          time: nowFormatted,
          by: `${approver.name} (${approver.title || 'Atasan Langsung'})`,
          desc: `Alasan penolakan: "${note}"`
        });
      }

      if (typeof window.createNotification === 'function') {
        if (decision === 'approve') {
          window.createNotification({
            recipientRole: 'karyawan',
            recipientNip: t.applicantNip || 'PK-2024-8841',
            recipientName: t.applicantName || 'Budi Pratama, S.T.',
            actorSource: 'approver',
            type: 'disetujui',
            title: 'Pengajuan Disetujui',
            message: `Pengajuan izin Anda (#${t.id}) telah disetujui oleh ${approver.name}. QR Code resmi siap digunakan.`,
            ticketId: t.id,
            priority: 'normal',
            eventId: `approved_${t.id}`
          });
          window.createNotification({
            recipientRole: 'security',
            actorSource: 'approver',
            type: 'security_siap_keluar',
            title: 'Tiket Disetujui - Siap Keluar',
            message: `Tiket #${t.id} (${t.applicantName} - ${t.category}) telah disetujui dan siap dipindai keluar di gerbang.`,
            ticketId: t.id,
            priority: 'normal',
            eventId: `ready_sec_${t.id}`
          });
        } else {
          window.createNotification({
            recipientRole: 'karyawan',
            recipientNip: t.applicantNip || 'PK-2024-8841',
            recipientName: t.applicantName || 'Budi Pratama, S.T.',
            actorSource: 'approver',
            type: 'ditolak',
            title: 'Pengajuan Ditolak',
            message: `Pengajuan izin Anda (#${t.id}) ditolak oleh ${approver.name}. Alasan: "${note}".`,
            ticketId: t.id,
            priority: 'normal',
            eventId: `rejected_${t.id}`
          });
        }
      }

      if (typeof window.saveTickets === 'function') {
        window.saveTickets(list);
      } else {
        localStorage.setItem('kujang_tickets', JSON.stringify(list));
      }

      // Sync Desktop Views
      if (typeof window.updateApproverMetrics === 'function') window.updateApproverMetrics();
      if (typeof window.renderApproverDashboard === 'function') window.renderApproverDashboard();
      if (typeof window.renderApproverView === 'function') window.renderApproverView();
      if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
      if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
      if (typeof window.renderSecurityView === 'function') window.renderSecurityView();
      if (typeof window.updateSecurityMetrics === 'function') window.updateSecurityMetrics();
    }

    if (typeof window.mobileCloseSheet === 'function') {
      window.mobileCloseSheet();
    }
    if (typeof window.showToast === 'function') {
      window.showToast(decision === 'approve' ? `Izin ${ticketId} berhasil disetujui!` : `Izin ${ticketId} ditolak.`, decision === 'approve' ? 'success' : 'danger');
    }
    renderMobileAtasan(null, currentAtasanTab);
    if (typeof window.renderMobileActiveView === 'function') window.renderMobileActiveView();
  };

  window.mobileAtasanExecuteExtension = function (ticketId, decision) {
    const note = document.getElementById('mExtDecisionNote')?.value || (decision === 'approve' ? 'Perpanjangan waktu disetujui.' : 'Perpanjangan ditolak, harap kembali segera.');

    const list = window.ticketsList || [];
    const t = list.find(x => x.id === ticketId);
    if (t) {
      t.hasExtensionPending = false;
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const nowFormatted = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;
      const approver = getActiveApprover();

      if (!t.timeline) t.timeline = [];

      if (decision === 'approve') {
        let newReturn = (t.pendingExtension && t.pendingExtension.newEstimatedReturn) || t.extensionRequestedTime || '';
        if (typeof window.normalizeReturnDateTime === 'function') {
          newReturn = window.normalizeReturnDateTime(newReturn);
        } else if (typeof normalizeReturnDateTime === 'function') {
          newReturn = normalizeReturnDateTime(newReturn);
        } else if (!newReturn.includes('T') && !/\d{4}-\d{2}-\d{2}/.test(newReturn)) {
          const today = new Date().toISOString().split('T')[0];
          newReturn = `${today}T${newReturn.replace('.', ':')}:00`;
        }
        t.plannedReturn = newReturn;
        t.estimatedReturn = newReturn;
        t.extensionApproved = true;
        t.extensionCount = (t.extensionCount || 0) + 1;
        if (t.status === 'Terlambat') {
          t.status = 'Sedang di Luar';
        }
        t.approverNote = (t.approverNote || '') + ` | Perpanjangan disetujui hingga ${formatDisplayDate(newReturn)}.`;
        if (t.pendingExtension) {
          t.pendingExtension.status = 'Disetujui';
        }
        t.pendingExtension = null;
        t.hasExtensionPending = false;
        t.timeline.push({
          event: 'Perpanjangan Waktu Disetujui',
          time: nowFormatted,
          by: `${approver.name} (${approver.title || 'Atasan'})`,
          desc: `Tambahan waktu keluar disetujui hingga ${formatDisplayDate(newReturn)}. Catatan: "${note}"`
        });

        if (typeof window.createNotification === 'function') {
          window.createNotification({
            recipientRole: 'karyawan',
            recipientNip: t.applicantNip || 'PK-2024-8841',
            recipientName: t.applicantName || 'Budi Pratama, S.T.',
            actorSource: 'approver',
            type: 'perpanjangan_disetujui',
            title: 'Perpanjangan Waktu Disetujui',
            message: `Permohonan perpanjangan waktu untuk tiket #${t.id} telah disetujui hingga ${formatDisplayDate(newReturn)}.`,
            ticketId: t.id,
            priority: 'normal',
            eventId: `ext_appr_${t.id}_${newReturn}`
          });
        }
      } else {
        if (t.pendingExtension) {
          t.pendingExtension.status = 'Ditolak';
        }
        t.pendingExtension = null;
        t.hasExtensionPending = false;
        t.timeline.push({
          event: 'Perpanjangan Waktu Ditolak',
          time: nowFormatted,
          by: `${approver.name} (${approver.title || 'Atasan'})`,
          desc: `Permohonan perpanjangan ditolak. Catatan: "${note}"`
        });

        if (typeof window.createNotification === 'function') {
          window.createNotification({
            recipientRole: 'karyawan',
            recipientNip: t.applicantNip || 'PK-2024-8841',
            recipientName: t.applicantName || 'Budi Pratama, S.T.',
            actorSource: 'approver',
            type: 'perpanjangan_ditolak',
            title: 'Perpanjangan Waktu Ditolak',
            message: `Permohonan perpanjangan waktu untuk tiket #${t.id} ditolak. Harap segera kembali ke area pabrik.`,
            ticketId: t.id,
            priority: 'normal',
            eventId: `ext_rej_${t.id}`
          });
        }
      }

      if (typeof window.saveTickets === 'function') {
        window.saveTickets(list);
      } else {
        localStorage.setItem('kujang_tickets', JSON.stringify(list));
      }

      // Sync Desktop Views
      if (typeof window.updateApproverMetrics === 'function') window.updateApproverMetrics();
      if (typeof window.renderApproverDashboard === 'function') window.renderApproverDashboard();
      if (typeof window.renderApproverView === 'function') window.renderApproverView();
      if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
      if (typeof window.renderSecurityView === 'function') window.renderSecurityView();
    }

    if (typeof window.mobileCloseSheet === 'function') {
      window.mobileCloseSheet();
    }
    if (typeof window.showToast === 'function') {
      window.showToast(decision === 'approve' ? `Perpanjangan izin ${ticketId} disetujui!` : `Perpanjangan izin ${ticketId} ditolak.`, decision === 'approve' ? 'success' : 'info');
    }
    renderMobileAtasan(null, currentAtasanTab);
    if (typeof window.renderMobileActiveView === 'function') window.renderMobileActiveView();
  };

  window.mobileAtasanApproveEmergency = function (ticketId) {
    if (typeof window.emergencyDirectApprove === 'function') {
      window.emergencyDirectApprove(ticketId);
      renderMobileAtasan(null, currentAtasanTab);
      if (typeof window.renderMobileActiveView === 'function') window.renderMobileActiveView();
      return;
    }
    const tickets = window.ticketsList || [];
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;
    const approver = getActiveApprover();
    t.status = 'Disetujui';
    t.emergencyLocked = false;
    t.qrLocked = false;
    t.emergencyUnlockMethod = 'Persetujuan Langsung Atasan di App';
    t.emergencyUnlockedBy = approver.name;

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

    if (!t.timeline) t.timeline = [];
    t.timeline.push({
      event: 'Otorisasi Darurat Berhasil (1-Click Atasan)',
      time: nowFormatted,
      by: `${approver.name} (${approver.title || 'Manajer'})`,
      desc: 'Izin darurat disetujui 1-Klik oleh Atasan melalui Aplikasi Mobile. QR Code aktif.'
    });

    if (typeof window.saveTickets === 'function') window.saveTickets(window.ticketsList || tickets);
    else localStorage.setItem('kujang_tickets', JSON.stringify(window.ticketsList || tickets));

    if (typeof window.showToast === 'function') {
      window.showToast(`Izin Darurat #${t.id} disetujui! QR Code ${getTName(t)} kini telah aktif.`, 'success');
    }
    renderMobileAtasan(null, currentAtasanTab);
    if (typeof window.renderMobileActiveView === 'function') window.renderMobileActiveView();
  };

  // Expose module function
  window.renderMobileAtasan = renderMobileAtasan;
  window.getTName = getTName;

  // -------------------------------------------------------------------
  // B1: FORM PENOLAKAN DENGAN ALASAN WAJIB (BRULE-04)
  // -------------------------------------------------------------------
  window.mobileOpenRejectSheet = function (ticketId) {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;

    const list = window.ticketsList || [];
    const t = list.find(x => x.id === ticketId);
    if (!t) return;

    const defaultReason = (t.isEmergency || (t.id && t.id.includes('-EMG-'))) 
      ? 'Kondisi kedaruratan belum memenuhi kriteria evakuasi mendesak.' 
      : 'Alasan keperluan dinas/operasional belum memadai.';

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="border-bottom: 1px solid #f1f5f9; padding: 12px 16px;">
        <div>
          <h3 style="font-size: 1.05rem; font-weight: 800; color: #dc2626; margin: 0;">Tolak Pengajuan Izin</h3>
          <p style="font-size: 0.725rem; color: #64748b; margin: 2px 0 0 0;">Tiket ${t.id} • ${getTName(t)}</p>
        </div>
        <button type="button" class="mobile-sheet-close" style="width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; background: #f1f5f9; border: none; border-radius: 50%; font-size: 1.1rem; color: #64748b; cursor: pointer;" onclick="window.mobileCloseSheet()">✕</button>
      </div>
      <div class="mobile-sheet-body" style="padding: 16px;">
        <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 10px; padding: 12px; margin-bottom: 14px;">
          <div style="font-size: 0.775rem; font-weight: 800; color: #991b1b; display: flex; align-items: center; gap: 6px;">
            <span>Aturan Penolakan (BRULE-04)</span>
          </div>
          <p style="font-size: 0.725rem; color: #7f1d1d; margin: 4px 0 0 0; line-height: 1.4;">
            Pengajuan yang ditolak bersifat permanen dan membatalkan proses penerbitan izin keluar.
          </p>
        </div>

        <form onsubmit="event.preventDefault(); window.mobileConfirmRejectSubmit('${t.id}');">
          <div class="mobile-form-group">
            <label class="mobile-form-label" style="font-weight: 700;">Alasan Penolakan <span class="req" style="color: #dc2626;">*</span></label>
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
              <button type="button" class="mobile-chip-btn" style="font-size: 0.7rem; padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; cursor: pointer;" onclick="document.getElementById('mRejectReasonInput').value='Alasan keperluan dinas belum memadai.'; window.mobileCheckRejectInput(document.getElementById('mRejectReasonInput').value)">Dinas belum memadai</button>
              <button type="button" class="mobile-chip-btn" style="font-size: 0.7rem; padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; cursor: pointer;" onclick="document.getElementById('mRejectReasonInput').value='Prioritas penugasan operasional di area kerja.'; window.mobileCheckRejectInput(document.getElementById('mRejectReasonInput').value)">Prioritas operasional</button>
              <button type="button" class="mobile-chip-btn" style="font-size: 0.7rem; padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; cursor: pointer;" onclick="document.getElementById('mRejectReasonInput').value='Dokumen pendukung atau justifikasi tidak lengkap.'; window.mobileCheckRejectInput(document.getElementById('mRejectReasonInput').value)">Justifikasi tidak lengkap</button>
            </div>
            <textarea class="mobile-textarea" id="mRejectReasonInput" placeholder="Tuliskan alasan penolakan..." required style="min-height: 80px; font-size: 0.8125rem;" oninput="window.mobileCheckRejectInput(this.value)">${defaultReason}</textarea>
            <div id="mRejectCharHint" style="font-size: 0.7rem; color: #059669; margin-top: 4px; font-weight: 600;">✓ Alasan memenuhi syarat (${defaultReason.length} karakter)</div>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #f1f5f9;">
            <button type="button" class="mobile-btn-secondary" style="flex: 1; min-height: 44px;" onclick="window.mobileCloseSheet()">Batal</button>
            <button type="submit" id="mBtnConfirmReject" class="mobile-btn-danger" style="flex: 1.5; min-height: 44px; background: #dc2626; border: 1.5px solid #dc2626; color: #ffffff; font-weight: 800; cursor: pointer;">
              Tolak Pengajuan
            </button>
          </div>
        </form>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  window.mobileCheckRejectInput = function(val) {
    const btn = document.getElementById('mBtnConfirmReject');
    const hint = document.getElementById('mRejectCharHint');
    const len = (val || '').trim().length;
    if (btn) {
      if (len >= 5) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        if (hint) { hint.textContent = '✓ Alasan memenuhi syarat (' + len + ' karakter)'; hint.style.color = '#059669'; }
      } else {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        if (hint) { hint.textContent = 'Wajib diisi minimal 5 karakter (' + len + '/5)'; hint.style.color = '#dc2626'; }
      }
    }
  };

  window.mobileConfirmRejectSubmit = function(ticketId) {
    const input = document.getElementById('mRejectReasonInput');
    let reason = (input ? input.value : '').trim();
    if (!reason || reason.length < 5) {
      reason = 'Alasan penolakan: Keperluan dinas belum memadai.';
    }
    window.mobileAtasanExecuteDecision(ticketId, 'reject', reason);
  };

})();

  // Fitur Hapus Semua Selesai di Pelacakan Tim Atasan
  window.mobileAtasanClearAllFinished = function () {
    const approver = getActiveApprover();
    const tickets = (typeof window.getTickets === 'function') ? window.getTickets() : (window.ticketsList || []);
    const isDewi = approver.name.toLowerCase().includes('dewi');
    const finishedTickets = tickets.filter(t => {
      const isMyTicket = isTicketAssignedToMobileApprover(t);
      const isFinished = (t.status === 'Selesai' || t.status === 'Ditolak' || t.status === 'Dibatalkan');
      const isDel = isDewi ? t.deletedByApprover2 : t.deletedByApprover1;
      return isMyTicket && isFinished && !isDel;
    });
    if (finishedTickets.length === 0) {
      if (typeof window.showToast === 'function') window.showToast('Tidak ada data izin selesai yang dapat dihapus.', 'info');
      return;
    }

    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="border-bottom: 1px solid #f1f5f9; padding: 14px 18px 10px 18px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: #fee2e2; display: flex; align-items: center; justify-content: center; color: #dc2626;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </div>
          <h3 style="font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0;">Bersihkan Pelacakan Selesai</h3>
        </div>
        <button type="button" class="mobile-sheet-close" style="width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; background: #f1f5f9; border: none; border-radius: 50%; font-size: 1.1rem; color: #64748b; cursor: pointer; padding: 0;" onclick="window.mobileCloseSheet()">✕</button>
      </div>
      <div class="mobile-sheet-body" style="padding: 16px 18px 24px 18px;">
        <p style="font-size: 0.85rem; color: #1e293b; line-height: 1.5; margin: 0 0 10px 0;">
          Hapus <strong>${finishedTickets.length} riwayat izin selesai</strong> dari tampilan pelacakan Atasan?
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 20px; font-size: 0.75rem; color: #64748b; line-height: 1.4;">
          <div style="display: flex; gap: 6px; align-items: flex-start;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" style="flex-shrink: 0; margin-top: 1px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span>Riwayat selesai hanya disembunyikan dari pelacakan Atasan. Data audit trail server dan bukti gerbang tetap utuh. Permohonan yang sedang aktif tidak dihapus.</span>
          </div>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button type="button" class="mobile-btn-secondary" style="flex: 1; min-height: 44px; padding: 10px 16px; font-weight: 700; border-radius: 10px; font-size: 0.85rem;" onclick="window.mobileCloseSheet()">Batal</button>
          <button type="button" id="mBtnConfirmAtasanClear" style="flex: 1; min-height: 44px; padding: 10px 16px; font-weight: 800; background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; border-radius: 10px; cursor: pointer; font-size: 0.85rem; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.25);" onclick="window.mobileExecuteAtasanClearAllFinished()">Hapus Riwayat</button>
        </div>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  window.mobileExecuteAtasanClearAllFinished = function () {
    const approver = getActiveApprover();
    const tickets = (typeof window.getTickets === 'function') ? window.getTickets() : (window.ticketsList || []);
    const isDewi = approver.name.toLowerCase().includes('dewi');
    const finishedTickets = tickets.filter(t => {
      const isMyTicket = isTicketAssignedToMobileApprover(t);
      const isFinished = (t.status === 'Selesai' || t.status === 'Ditolak' || t.status === 'Dibatalkan');
      const isDel = isDewi ? t.deletedByApprover2 : t.deletedByApprover1;
      return isMyTicket && isFinished && !isDel;
    });

    finishedTickets.forEach(t => {
      if (isDewi) {
        t.deletedByApprover2 = true;
      } else {
        t.deletedByApprover1 = true;
      }
    });
    if (typeof window.saveTickets === 'function') window.saveTickets(tickets);
    window.mobileCloseSheet();
    if (typeof window.showToast === 'function') {
      window.showToast(`${finishedTickets.length} riwayat selesai dibersihkan dari pelacakan Atasan.`, 'success');
    }
    renderMobileAtasan(null, currentAtasanTab);
    if (typeof window.renderApproverView === 'function') window.renderApproverView();
  };
