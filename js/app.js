/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN
 * PT Pupuk Kujang Cikampek
 * Multi-Actor Orchestrator & App Bootstrap
 */

document.addEventListener('DOMContentLoaded', () => {
  const searchEmpInput = document.getElementById('searchEmpInput');
  const filterEmpPeriod = document.getElementById('filterEmpPeriod');
  const filterEmpCategory = document.getElementById('filterEmpCategory');
  const filterEmpType = document.getElementById('filterEmpType');
  const filterEmpStatus = document.getElementById('filterEmpStatus');
  const btnEmpViewCard = document.getElementById('btnEmpViewCard');
  const btnEmpViewTable = document.getElementById('btnEmpViewTable');
  const filterAppViewMode = document.getElementById('filterAppViewMode');
  const btnEmpExport = document.getElementById('btnEmpExport');

  if (searchEmpInput) searchEmpInput.addEventListener('input', () => window.renderKaryawanView());
  if (filterEmpPeriod) filterEmpPeriod.addEventListener('change', () => window.renderKaryawanView());
  if (filterEmpCategory) filterEmpCategory.addEventListener('change', () => window.renderKaryawanView());
  if (filterEmpType) filterEmpType.addEventListener('change', () => window.renderKaryawanView());
  if (filterEmpStatus) filterEmpStatus.addEventListener('change', () => window.renderKaryawanView());

  if (btnEmpViewCard && btnEmpViewTable) {
    btnEmpViewCard.addEventListener('click', () => {
      window.currentEmpViewMode = 'card';
      btnEmpViewCard.classList.add('active');
      btnEmpViewTable.classList.remove('active');
      window.renderKaryawanView();
    });

    btnEmpViewTable.addEventListener('click', () => {
      window.currentEmpViewMode = 'table';
      btnEmpViewTable.classList.add('active');
      btnEmpViewCard.classList.remove('active');
      window.renderKaryawanView();
    });
  }

  if (filterAppViewMode) {
    filterAppViewMode.addEventListener('change', () => window.renderApproverView());
  }


  // Export CSV
  if (btnEmpExport) {
    btnEmpExport.addEventListener('click', () => {
      const filtered = typeof window.filterEmpTickets === 'function' ? window.filterEmpTickets() : [];
      if (filtered.length === 0) {
        if (typeof window.showToast === 'function') window.showToast('Tidak ada data tiket untuk diekspor.', 'danger');
        return;
      }

      const formatDateTimeClean = (dtStr) => {
        if (!dtStr || dtStr === '-' || dtStr === 'null') return '-';
        const isoMatch = String(dtStr).match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
        if (isoMatch) {
          const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
          const d = parseInt(isoMatch[3], 10);
          const m = months[parseInt(isoMatch[2], 10) - 1];
          const y = isoMatch[1];
          const h = isoMatch[4];
          const min = isoMatch[5];
          return `${d} ${m} ${y}, ${h}.${min} WIB`;
        }
        return String(dtStr).replace(/^(Minggu|Senin|Selasa|Rabu|Kamis|Jumat|Sabtu),\s*/i, '');
      };

      const cleanTimeAndGate = (timeStr, explicitGate) => {
        let gate = explicitGate || '-';
        let time = timeStr || '-';
        if (time !== '-') {
          time = time.replace(/^(Minggu|Senin|Selasa|Rabu|Kamis|Jumat|Sabtu),\s*/i, '');
          const m = time.match(/^(.*?)\s*\((.*?)\)$/);
          if (m) {
            time = m[1].trim();
            if (!explicitGate || explicitGate === '-') {
              gate = m[2].trim();
            }
          }
        }
        return { time, gate };
      };

      const headers = [
        'No',
        'No Tiket',
        'Tanggal Pengajuan',
        'NIP Karyawan',
        'Nama Karyawan',
        'Departemen',
        'Keperluan',
        'Tipe Izin',
        'Tujuan',
        'Alasan',
        'Rencana Keluar',
        'Estimasi Kembali',
        'Scan Out (Waktu)',
        'Scan Out (Gerbang)',
        'Tap In (Waktu)',
        'Tap In (Gerbang)',
        'Status Akhir',
        'Catatan / Alasan Penolakan'
      ];

      const rows = filtered.map((t, idx) => {
        const reqDate = formatDateTimeClean(t.createdAt || t.createdDate);
        const outData = cleanTimeAndGate(t.scanOutTime, t.scanOutGate || t.gateOut);
        const inData = cleanTimeAndGate(t.scanInTime, t.scanInGate || t.gateIn);
        const planExit = formatDateTimeClean(t.plannedExit);
        let estReturn = '-';
        if (t.type === 'Tidak Kembali (Pulang)' || t.type === 'Pulang Mendahului') {
          estReturn = 'Tidak Kembali (Pulang)';
        } else if (t.estimatedReturn && t.estimatedReturn !== 'null') {
          estReturn = formatDateTimeClean(t.estimatedReturn);
        }
        let finalStatus = t.status || '-';
        if (t.status === 'Selesai' && (t.isLate || (t.scanInTime && t.scanInTime.includes('[Terlambat]')) || (t.lateMinutes > 0))) {
          finalStatus = 'Selesai (Terlambat)';
        }
        const notes = t.rejectionReason || t.cancellationReason || t.approverNote || '-';

        return [
          idx + 1,
          t.id || '-',
          reqDate,
          t.applicantNip || '-',
          t.applicantName || '',
          t.department || '',
          t.category || '-',
          t.type || t.returnType || '-',
          t.destination || '',
          t.reason || '',
          planExit,
          estReturn,
          outData.time,
          outData.gate,
          inData.time,
          inData.gate,
          finalStatus,
          String(notes)
        ];
      });

      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

      // Native Microsoft Excel (.xlsx) Export via SheetJS
      if (typeof window.XLSX !== 'undefined') {
        const ws = window.XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = [
          { wch: 6 },  // No
          { wch: 18 }, // No Tiket
          { wch: 22 }, // Tanggal Pengajuan
          { wch: 16 }, // NIP
          { wch: 25 }, // Nama
          { wch: 22 }, // Departemen
          { wch: 16 }, // Keperluan
          { wch: 20 }, // Tipe Izin
          { wch: 25 }, // Tujuan
          { wch: 25 }, // Alasan
          { wch: 22 }, // Rencana Keluar
          { wch: 22 }, // Estimasi Kembali
          { wch: 16 }, // Scan Out
          { wch: 24 }, // Scan Out Gate
          { wch: 16 }, // Tap In
          { wch: 24 }, // Tap In Gate
          { wch: 18 }, // Status Akhir
          { wch: 30 }  // Catatan
        ];
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Rekap Izin");
        window.XLSX.writeFile(wb, `Rekap_Izin_Keluar_${dateStr}.xlsx`);
        if (typeof window.showToast === 'function') window.showToast(`Berhasil mengunduh rekap ${filtered.length} perizinan ke Excel (.xlsx)!`, 'success');
        return;
      }

      // Fallback to CSV
      const csvRows = rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
      const csvContent = '\uFEFFsep=,\r\n' + [headers.map(h => `"${h}"`).join(','), ...csvRows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rekap-Izin-Keluar-${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 1000);
      if (typeof window.showToast === 'function') window.showToast('Data berhasil diekspor ke file CSV!', 'success');
    });
  }

  // Click outside modal overlay to close
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal && !modal.closest('#karyawanFullFormContainer')) {
        if (modal.id === 'modalEmergencyUnlock' && typeof window.stopEmergencyFaceScanner === 'function') {
          window.stopEmergencyFaceScanner();
        }
        modal.classList.remove('open');
      }
    });
  });

  // ESC key closes active modal (kecuali formulir inline penuh)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (typeof window.stopEmergencyFaceScanner === 'function') {
        window.stopEmergencyFaceScanner();
      }
      document.querySelectorAll('.modal-overlay.open').forEach(m => {
        if (!m.closest('#karyawanFullFormContainer')) {
          m.classList.remove('open');
        }
      });
    }
  });

  // Modal background scroll lock observer (hanya untuk modal pop-up floating asli, bukan formulir inline penuh)
  let savedScrollBeforeModalOpen = 0;
  const modalObserver = new MutationObserver(() => {
    const hasOpenModal = Array.from(document.querySelectorAll('.modal-overlay.open')).some(
      m => !m.closest('#karyawanFullFormContainer')
    );
    if (hasOpenModal) {
      if (!document.body.classList.contains('modal-open')) {
        savedScrollBeforeModalOpen = window.scrollY || document.documentElement.scrollTop || 0;
        document.body.classList.add('modal-open');
      }
    } else {
      if (document.body.classList.contains('modal-open')) {
        document.body.classList.remove('modal-open');
        if (savedScrollBeforeModalOpen > 0) {
          window.scrollTo({ top: savedScrollBeforeModalOpen, behavior: 'instant' });
        }
      }
    }
  });
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modalObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
  });

  // ===================================================================
  // INITIALIZATION & BOOTSTRAP
  // ===================================================================
  const activeUser = typeof window.getKujangCurrentUser === 'function' ? window.getKujangCurrentUser() : null;
  if (activeUser && (activeUser.role || activeUser.roleKey)) {
    if (typeof window.checkOverdueAndExpiredTickets === 'function') {
      window.checkOverdueAndExpiredTickets(true);
    }
    const savedKaryawanNav = (function () { try { return sessionStorage.getItem('KUJANG_KARYAWAN_NAV') || localStorage.getItem('KUJANG_KARYAWAN_NAV'); } catch (e) { return null; } })() || 'dashboard';
    const savedApproverNav = (function () { try { return sessionStorage.getItem('KUJANG_APPROVER_NAV') || localStorage.getItem('KUJANG_APPROVER_NAV'); } catch (e) { return null; } })() || 'dashboard';
    const savedSecNav = (function () { try { return sessionStorage.getItem('KUJANG_SEC_NAV') || localStorage.getItem('KUJANG_SEC_NAV'); } catch (e) { return null; } })() || 'dashboard';
    const savedAdminNav = (function () { try { return sessionStorage.getItem('KUJANG_ADMIN_NAV') || localStorage.getItem('KUJANG_ADMIN_NAV'); } catch (e) { return null; } })() || 'dashboard';

    const savedRole = (function () { try { return sessionStorage.getItem('KUJANG_ACTIVE_ROLE') || localStorage.getItem('KUJANG_ACTIVE_ROLE') || sessionStorage.getItem('KUJANG_MOBILE_ACTIVE_ROLE') || localStorage.getItem('KUJANG_MOBILE_ACTIVE_ROLE'); } catch (e) { return null; } })();
    const targetRole = savedRole || activeUser.roleKey || activeUser.role || 'karyawan';
    if (typeof window.switchRole === 'function') window.switchRole(targetRole, activeUser);

    // Isolated navigation router: only activate the navigation matching the active role
    if (targetRole === 'karyawan' || targetRole === 'karyawan2') {
      if (typeof window.setKaryawanNav === 'function') window.setKaryawanNav(savedKaryawanNav);
    } else if (targetRole === 'approver' || targetRole === 'approver2') {
      if (typeof window.setApproverNav === 'function') window.setApproverNav(savedApproverNav);
    } else if (targetRole === 'security') {
      if (typeof window.setSecurityNav === 'function') window.setSecurityNav(savedSecNav);
    } else if (targetRole === 'admin') {
      if (typeof window.setAdminNav === 'function') window.setAdminNav(savedAdminNav);
    }
  }

  // Background Scheduler: periksa status Terlambat & Kedaluwarsa hanya jika user aktif login
  setInterval(() => {
    if (typeof window.getKujangCurrentUser === 'function' && !window.getKujangCurrentUser()) {
      return; // Tetap diam saat di layar login KUJANG ID untuk mencegah browser lag
    }
    if (typeof window.checkOverdueAndExpiredTickets === 'function') {
      window.checkOverdueAndExpiredTickets(false);
    }
    if (typeof window.updateAdminMetrics === 'function') {
      window.updateAdminMetrics();
    }
  }, 2000);

  // Periksa langsung ketika user kembali ke tab browser / membuka kunci layar laptop / mengubah jam sistem
  window.addEventListener('focus', () => {
    if (typeof window.checkOverdueAndExpiredTickets === 'function') {
      window.checkOverdueAndExpiredTickets(false);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && typeof window.checkOverdueAndExpiredTickets === 'function') {
      window.checkOverdueAndExpiredTickets(false);
    }
  });
});
