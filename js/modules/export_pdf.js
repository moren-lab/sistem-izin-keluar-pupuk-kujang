/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT PUPUK KUJANG CIKAMPEK
 * Modul Ekspor PDF Resmi BUMN (Sesuai Format Gambar 1)
 */

(function () {
  'use strict';

  let currentExportTickets = [];

  function formatDateWaktu(t) {
    const raw = t.plannedExit || t.createdAt || t.date || '';
    let d = null;
    if (typeof window.parseTicketDateTime === 'function') {
      d = window.parseTicketDateTime(raw);
    }
    if (!d || isNaN(d.getTime())) {
      d = new Date(raw);
    }
    if (!d || isNaN(d.getTime())) {
      d = new Date();
    }

    const dateStr = d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const timeStr = (typeof pad === 'function') 
      ? `${pad(d.getHours())}.${pad(d.getMinutes())} WIB`
      : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    return `
      <div style="font-weight: 700; color: #000000; font-size: 8.5pt;">${dateStr}</div>
      <div style="font-size: 7.5pt; color: #475569; margin-top: 2px;">${timeStr}</div>
    `;
  }

  function formatIdentitasAkses(t) {
    const name = t.applicantName || 'Budi Pratama, S.T.';
    const nip = t.applicantNip || 'PK-2024-8841';
    const id = t.id || 'TK-20261112-001';
    const isGroup = Boolean(t.isGroupDinas || (Array.isArray(t.members) && t.members.length > 0));
    const memberCount = isGroup ? ((t.initiatorCancelled ? 0 : 1) + (Array.isArray(t.members) ? t.members.filter(m => m.status !== 'batal').length : (t.memberCount || 2))) : 1;

    return `
      <div style="font-weight: 700; color: #000000; font-size: 8.5pt;">${name}</div>
      <div style="font-size: 7.5pt; color: #475569;">NIP: ${nip}</div>
      <div style="font-size: 7.5pt; color: #008444; font-weight: 700; margin-top: 2px;">
        ${id} ${isGroup ? `<span style="font-size: 6.5pt; background: #e0f2fe; color: #0369a1; padding: 1px 4px; border-radius: 3px; font-weight: 700;">👥 Tim (${memberCount})</span>` : ''}
      </div>
    `;
  }

  function formatWaktuScanTapBatas(t) {
    const scanOut = t.scanOutTime ? `${t.scanOutTime} WIB` : '-';
    const tapIn = t.scanInTime ? `${t.scanInTime} WIB` : '-';
    const batas = t.estimatedReturn || t.type || '-';

    return `
      <div style="font-size: 7.8pt; line-height: 1.35; color: #000000;">
        <div><strong>Out:</strong> ${scanOut}</div>
        <div><strong>In:</strong> ${tapIn}</div>
        <div><strong>Batas:</strong> ${batas}</div>
      </div>
    `;
  }

  function getTicketsBySource(source) {
    if (source === 'admin' && typeof window.filterAdminReportTickets === 'function') {
      return window.filterAdminReportTickets();
    }
    if (source === 'karyawan' && typeof window.filterEmpTickets === 'function') {
      return window.filterEmpTickets();
    }
    if (source === 'approver') {
      const all = window.ticketsList || [];
      const currentActor = (typeof window.getCurrentActiveActor === 'function')
        ? window.getCurrentActiveActor('approver')
        : (window.currentUser || {});
      const approverName = (currentActor && currentActor.name) ? currentActor.name : 'Ir. Hendra Gunawan, M.T.';

      return all.filter(t => {
        const isApproverTarget = !t.approverName || t.approverName === approverName || approverName.includes('Hendra');
        const isFinal = ['Selesai', 'Selesai (Terlambat)', 'Ditolak', 'Dibatalkan', 'Kedaluwarsa'].includes(t.status);
        return isApproverTarget && isFinal;
      });
    }
    if (source === 'security') {
      const all = window.ticketsList || [];
      return all.filter(t => ['Selesai', 'Selesai (Terlambat)', 'Dibatalkan', 'Kedaluwarsa'].includes(t.status) || t.scanOutTime);
    }
    return window.ticketsList || [];
  }

  function openExportPdfModal(source = 'admin', customTickets = null, customTitle = null) {
    const modal = document.getElementById('modalExportPdfPreview');
    if (!modal) return;

    let tickets = customTickets;
    if (!tickets || !Array.isArray(tickets)) {
      tickets = getTicketsBySource(source);
    }
    currentExportTickets = tickets;

    // Title setup
    const titleInput = document.getElementById('exportPdfInputTitle');
    const displayTitle = document.getElementById('pdfDocumentDisplayTitle');
    const defaultTitle = customTitle || 'Judul';
    if (titleInput) titleInput.value = defaultTitle;
    if (displayTitle) displayTitle.textContent = defaultTitle;

    // Meta count
    const metaInfo = document.getElementById('exportPdfMetaInfo');
    if (metaInfo) {
      metaInfo.textContent = `Menampilkan ${tickets.length} data perizinan`;
    }

    // Populate Table Body
    const tbody = document.getElementById('pdfOfficialReportTableBody');
    if (tbody) {
      let rowsHtml = '';
      if (tickets.length > 0) {
        rowsHtml = tickets.map(t => `
          <tr style="height: 38px;">
            <td style="border: 1px solid #000000; padding: 6px 6px; vertical-align: top; text-align: center;">${formatDateWaktu(t)}</td>
            <td style="border: 1px solid #000000; padding: 6px 6px; vertical-align: top;">${formatIdentitasAkses(t)}</td>
            <td style="border: 1px solid #000000; padding: 6px 6px; vertical-align: top; font-size: 8pt; color: #000000;">${t.department || 'Departemen Rekayasa & Pemeliharaan'}</td>
            <td style="border: 1px solid #000000; padding: 6px 6px; vertical-align: top; font-size: 8pt; color: #000000;">${t.reason || t.destination || t.category || '-'}</td>
            <td style="border: 1px solid #000000; padding: 6px 6px; vertical-align: top;">${formatWaktuScanTapBatas(t)}</td>
            <td style="border: 1px solid #000000; padding: 6px 6px; vertical-align: top; text-align: center; font-weight: 700; font-size: 8.5pt; color: #000000;">${t.status || 'Selesai'}</td>
          </tr>
        `).join('');
      }

      // If fewer than 6 rows, append blank rows to match the exact template from Gambar 1
      const minRows = 6;
      if (tickets.length < minRows) {
        const remaining = minRows - tickets.length;
        for (let i = 0; i < remaining; i++) {
          rowsHtml += `
            <tr style="height: 36px;">
              <td style="border: 1px solid #000000; padding: 6px;">&nbsp;</td>
              <td style="border: 1px solid #000000; padding: 6px;">&nbsp;</td>
              <td style="border: 1px solid #000000; padding: 6px;">&nbsp;</td>
              <td style="border: 1px solid #000000; padding: 6px;">&nbsp;</td>
              <td style="border: 1px solid #000000; padding: 6px;">&nbsp;</td>
              <td style="border: 1px solid #000000; padding: 6px;">&nbsp;</td>
            </tr>
          `;
        }
      }

      tbody.innerHTML = rowsHtml;
    }

    // Render QR Code in Signature Section
    const qrContainer = document.getElementById('pdfExportSignatureQr');
    if (qrContainer) {
      qrContainer.innerHTML = '';
      if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, {
          text: `PKC-OFFICIAL-DOC/VERIFIED/JOJOK-SATRIADI/VP-TI/${Date.now()}`,
          width: 58,
          height: 58,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
        const qrLabel = document.createElement('div');
        qrLabel.style.fontSize = '6.5pt';
        qrLabel.style.fontWeight = '800';
        qrLabel.style.color = '#000000';
        qrLabel.style.marginTop = '2px';
        qrLabel.textContent = '(QR)';
        qrContainer.appendChild(qrLabel);
      } else {
        qrContainer.innerHTML = `
          <div style="font-weight: 800; font-size: 0.9rem; color: #000000;">(QR)</div>
          <div style="font-size: 6pt; color: #475569;">TERVERIFIKASI</div>
        `;
      }
    }

    modal.classList.add('open');
    modal.style.display = 'flex';
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) modalBody.scrollTop = 0;
  }

  function closeExportPdfModal() {
    const modal = document.getElementById('modalExportPdfPreview');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
    }
  }

  function updateExportPdfTitle(val) {
    const displayTitle = document.getElementById('pdfDocumentDisplayTitle');
    if (displayTitle) {
      displayTitle.textContent = val.trim() || 'Judul';
    }
  }

  function executePrintExportPdf() {
    document.body.classList.add('printing-official-pdf');
    
    // Allow browser to render layout before printing
    setTimeout(() => {
      window.print();
      
      const cleanup = () => {
        document.body.classList.remove('printing-official-pdf');
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      setTimeout(cleanup, 2000);
    }, 250);
  }

  // Global Exports
  window.openExportPdfModal = openExportPdfModal;
  window.closeExportPdfModal = closeExportPdfModal;
  window.updateExportPdfTitle = updateExportPdfTitle;
  window.executePrintExportPdf = executePrintExportPdf;

  // Wire existing admin print button to this modal
  document.addEventListener('DOMContentLoaded', () => {
    const btnAdminPrint = document.getElementById('btnAdminPrintPdf');
    if (btnAdminPrint) {
      btnAdminPrint.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openExportPdfModal('admin');
      });
    }
  });

})();
