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
      if (e.target === modal) {
        if (modal.id === 'modalEmergencyUnlock' && typeof window.stopEmergencyFaceScanner === 'function') {
          window.stopEmergencyFaceScanner();
        }
        modal.classList.remove('open');
      }
    });
  });

  // ESC key closes active modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (typeof window.stopEmergencyFaceScanner === 'function') {
        window.stopEmergencyFaceScanner();
      }
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });

  // Modal background scroll lock observer
  const modalObserver = new MutationObserver(() => {
    const hasOpenModal = document.querySelectorAll('.modal-overlay.open').length > 0;
    document.body.classList.toggle('modal-open', hasOpenModal);
  });
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modalObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
  });

  // ===================================================================
  // INITIALIZATION & BOOTSTRAP
  // ===================================================================
  if (typeof window.checkOverdueAndExpiredTickets === 'function') {
    window.checkOverdueAndExpiredTickets(true);
  }

  if (typeof window.setKaryawanNav === 'function') window.setKaryawanNav('dashboard');
  if (typeof window.setApproverNav === 'function') window.setApproverNav('dashboard');
  if (typeof window.setSecurityNav === 'function') window.setSecurityNav('dashboard');
  if (typeof window.setAdminNav === 'function') window.setAdminNav('dashboard');
  if (typeof window.switchRole === 'function') window.switchRole('karyawan');

  // Background Scheduler: periksa status Terlambat & Kedaluwarsa secara berkala setiap 2 detik (real-time responsiveness)
  setInterval(() => {
    if (typeof window.checkOverdueAndExpiredTickets === 'function') {
      window.checkOverdueAndExpiredTickets(false);
    }
    if (typeof window.updateAdminMetrics === 'function') {
      window.updateAdminMetrics();
    }
  }, 2000);

  // Periksa langsung ketika user kembali ke tab browser / membuka kunci layar laptop
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
