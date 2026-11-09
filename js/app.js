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

      let csv = "data:text/csv;charset=utf-8,";
      csv += "Nomor Tiket,Pemohon,NIP,Kategori,Tipe,Tujuan,Alasan,Rencana Keluar,Estimasi Kembali,Status\n";

      filtered.forEach(t => {
        csv += [
          `"${t.id}"`,
          `"${t.applicantName || 'Budi Pratama'}"`,
          `"${t.applicantNip || 'PK-2024-8841'}"`,
          `"${t.category}"`,
          `"${t.type}"`,
          `"${(t.destination || '').replace(/"/g, '""')}"`,
          `"${(t.reason || '').replace(/"/g, '""')}"`,
          `"${t.plannedExit}"`,
          `"${t.estimatedReturn || '-'}"`,
          `"${t.status}"`
        ].join(',') + "\n";
      });

      const uri = encodeURI(csv);
      const a = document.createElement('a');
      a.href = uri;
      a.download = `Rekap-Izin-Keluar-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
  const modalObserver = new MutationObserver(() => {
    const hasOpenModal = Array.from(document.querySelectorAll('.modal-overlay.open')).some(
      m => !m.closest('#karyawanFullFormContainer')
    );
    document.body.classList.toggle('modal-open', hasOpenModal);
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
    const savedKaryawanNav = (function () { try { return sessionStorage.getItem('KUJANG_KARYAWAN_NAV'); } catch (e) { return null; } })() || 'dashboard';
    const savedApproverNav = (function () { try { return sessionStorage.getItem('KUJANG_APPROVER_NAV'); } catch (e) { return null; } })() || 'dashboard';
    const savedSecNav = (function () { try { return sessionStorage.getItem('KUJANG_SEC_NAV'); } catch (e) { return null; } })() || 'dashboard';
    const savedAdminNav = (function () { try { return sessionStorage.getItem('KUJANG_ADMIN_NAV'); } catch (e) { return null; } })() || 'dashboard';

    if (typeof window.setKaryawanNav === 'function') window.setKaryawanNav(savedKaryawanNav);
    if (typeof window.setApproverNav === 'function') window.setApproverNav(savedApproverNav);
    if (typeof window.setSecurityNav === 'function') window.setSecurityNav(savedSecNav);
    if (typeof window.setAdminNav === 'function') window.setAdminNav(savedAdminNav);
    const targetRole = activeUser.roleKey || activeUser.role;
    if (typeof window.switchRole === 'function') window.switchRole(targetRole, activeUser);
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
