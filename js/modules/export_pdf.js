/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT PUPUK KUJANG CIKAMPEK
 * Modul Ekspor PDF Resmi BUMN (Sesuai Format Gambar 1)
 */

(function () {
  'use strict';
  const LOGO_DANANTARA_B64 = 'data:image/png;base64,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';
  const LOGO_PUPUK_INDONESIA_B64 = 'data:image/png;base64,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';
  const LOGO_PUPUK_KUJANG_B64 = 'data:image/png;base64,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';


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
      <div style="font-size: 7.5pt; color: #000000; margin-top: 2px;">${timeStr}</div>
    `;
  }

  function formatIdentitasAkses(t) {
    const name = t.applicantName || 'Budi Pratama, S.T.';
    const nip = t.applicantNip || 'PK-2024-8841';
    const id = t.id || 'TK-20261112-001';
    const isEmergency = Boolean(t.isEmergency || (t.id && t.id.startsWith('TK-EMG')) || (t.category && t.category.toLowerCase().includes('darurat')));
    const isGroup = Boolean(t.isGroupDinas || (Array.isArray(t.members) && t.members.length > 0));
    const memberCount = isGroup ? ((t.initiatorCancelled ? 0 : 1) + (Array.isArray(t.members) ? t.members.filter(m => m.status !== 'batal').length : (t.memberCount || 2))) : 1;

    let metaBadges = [];
    if (isEmergency) metaBadges.push('[Darurat]');
    if (isGroup) metaBadges.push(`[Tim: ${memberCount} Orang]`);
    const metaText = metaBadges.length > 0 ? ` ${metaBadges.join(' ')}` : '';

    return `
      <div style="font-weight: 700; color: #000000; font-size: 8.5pt;">${name}</div>
      <div style="font-size: 7.5pt; color: #000000; margin-top: 1px;">NIP: ${nip}</div>
      <div style="font-size: 7.5pt; color: #000000; font-weight: 700; margin-top: 2px;">
        ${id}${metaText}
      </div>
    `;
  }

  function formatWaktuScanTapBatas(t) {
    let scanOut = t.scanOutTime ? String(t.scanOutTime).trim() : '-';
    let tapIn = t.scanInTime ? String(t.scanInTime).trim() : '-';
    let batas = t.estimatedReturn || t.type || '-';

    // Format scanOut & tapIn (cegah double 'WIB')
    if (scanOut !== '-') {
      if (!scanOut.toLowerCase().includes('wib')) { scanOut += ' WIB'; }
    }
    if (tapIn !== '-') {
      if (!tapIn.toLowerCase().includes('wib')) { tapIn += ' WIB'; }
    }

    // Format batas jika berupa string ISO atau waktu raw
    if (batas && batas.includes('T')) {
      const bDate = new Date(batas);
      if (!isNaN(bDate.getTime())) {
        const bHour = String(bDate.getHours()).padStart(2, '0');
        const bMin = String(bDate.getMinutes()).padStart(2, '0');
        const bDay = bDate.getDate();
        const bMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const bMonth = bMonthNames[bDate.getMonth()];
        batas = `${bDay} ${bMonth} ${bDate.getFullYear()}, ${bHour}.${bMin} WIB`;
      }
    } else if (batas && !batas.toLowerCase().includes('wib') && batas.includes(':')) {
      batas = batas.replace(':', '.') + ' WIB';
    }

    return `
      <div style="font-size: 7.5pt; line-height: 1.35; color: #000000;">
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
    // Pastikan logo menggunakan format Base64 aman CORS untuk rendering html2pdf
    const imgDanantara = document.getElementById('pdfLogoDanantara');
    if (imgDanantara) imgDanantara.src = LOGO_DANANTARA_B64;
    const imgPupukIndonesia = document.getElementById('pdfLogoPupukIndonesia');
    if (imgPupukIndonesia) imgPupukIndonesia.src = LOGO_PUPUK_INDONESIA_B64;
    const imgPupukKujang = document.getElementById('pdfLogoPupukKujang');
    if (imgPupukKujang) imgPupukKujang.src = LOGO_PUPUK_KUJANG_B64;


    // Title setup (Otomatis: Laporan & Rekapitulasi Data Perizinan)
    const fixedTitle = 'Laporan & Rekapitulasi Data Perizinan';
    const displayTitle = document.getElementById('pdfDocumentDisplayTitle');
    if (displayTitle) displayTitle.textContent = fixedTitle;

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
          <tr style="height: 38px; page-break-inside: avoid; break-inside: avoid;">
            <td style="border: 1px solid #cbd5e1; padding: 6px 6px; vertical-align: top; text-align: center;">${formatDateWaktu(t)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 6px; vertical-align: top;">${formatIdentitasAkses(t)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 6px; vertical-align: top; font-size: 8pt; color: #000000;">${t.department || 'Departemen Rekayasa & Pemeliharaan'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 6px; vertical-align: top; font-size: 8pt; color: #000000;">${t.reason || t.destination || t.category || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 6px; vertical-align: top;">${formatWaktuScanTapBatas(t)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 6px; vertical-align: middle; text-align: center; font-size: 8pt; font-weight: 700; color: #000000;">${t.status || 'Selesai'}</td>
          </tr>
        `).join('');
      }

      if (tickets.length === 0) {
        rowsHtml = `
          <tr style="height: 48px; page-break-inside: avoid; break-inside: avoid;">
            <td colspan="6" style="border: 1px solid #cbd5e1; padding: 14px 10px; text-align: center; color: #64748b; font-style: italic; font-size: 8.5pt;">
              Tidak ada data perizinan yang sesuai dengan filter saat ini.
            </td>
          </tr>
        `;
      }

      tbody.innerHTML = rowsHtml;
    }

    // Resolve dynamic active admin signer
    const signer = getActiveAdminSigner();
    const titleEl = document.getElementById('pdfExportSignerTitle');
    if (titleEl) titleEl.textContent = signer.title;
    const nameEl = document.getElementById('pdfExportSignerName');
    if (nameEl) nameEl.innerHTML = `<u>${signer.name}</u>`;
    const nipEl = document.getElementById('pdfExportSignerNip');
    if (nipEl) nipEl.textContent = signer.nip ? `NIP: ${signer.nip}` : '';

    // Render QR Code in Signature Section with dynamic verification URL payload
    const qrContainer = document.getElementById('pdfExportSignatureQr');
    if (qrContainer) {
      qrContainer.innerHTML = '';
      const docCode = 'PKC-DOC-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);
      const cleanSignerName = (signer.name || 'Administrator').trim();
      const cleanSignerNip = (signer.nip || 'ADM').trim();
      
      // Standar URL Resmi TTE (Tanda Tangan Elektronik) Terverifikasi agar kamera / Google Lens langsung mengenali dan memunculkan tombol link verifikasi
      const qrPayload = `https://tte.pupuk-kujang.co.id/verify?doc=${encodeURIComponent(docCode)}&signer=${encodeURIComponent(cleanSignerName)}&nip=${encodeURIComponent(cleanSignerNip)}&status=TERVERIFIKASI`;

      const qrMount = document.createElement('div');
      qrMount.style.display = 'inline-block';
      qrMount.style.background = '#ffffff';
      qrMount.style.padding = '2px';
      qrContainer.appendChild(qrMount);

      if (typeof QRCode !== 'undefined') {
        new QRCode(qrMount, {
          text: qrPayload,
          width: 80,
          height: 80,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });

        // Pastikan terkonversi menjadi elemen gambar permanen agar html2canvas tidak blank
        const syncCanvasToImg = () => {
          const qrCanvas = qrMount.querySelector('canvas');
          if (qrCanvas) {
            try {
              const dataUrl = qrCanvas.toDataURL('image/png');
              qrMount.innerHTML = `<img src="${dataUrl}" style="width: 56px; height: 56px; display: block; margin: 0 auto;" alt="QR TTE" />`;
            } catch (e) {
              qrCanvas.style.width = '56px';
              qrCanvas.style.height = '56px';
              qrCanvas.style.display = 'block';
              qrCanvas.style.margin = '0 auto';
            }
          }
        };
        setTimeout(syncCanvasToImg, 50);
        setTimeout(syncCanvasToImg, 150);

        const qrLabel = document.createElement('div');
        qrLabel.style.fontSize = '6pt';
        qrLabel.style.fontWeight = '800';
        qrLabel.style.color = '#008444';
        qrLabel.style.marginTop = '3px';
        qrLabel.style.lineHeight = '1';
        qrLabel.style.letterSpacing = '0.5px';
        qrLabel.textContent = 'TERVERIFIKASI';
        qrContainer.appendChild(qrLabel);
      } else {
        qrContainer.innerHTML = `
          <div style="font-weight: 800; font-size: 0.9rem; color: #008444;">(QR)</div>
          <div style="font-size: 6pt; color: #475569; letter-spacing: 0.5px;">TERVERIFIKASI</div>
        `;
      }
    }

    modal.classList.add('open');
    modal.style.display = 'flex';
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) modalBody.scrollTop = 0;
  }

  function getActiveAdminSigner() {
    // 1. Sesi autentikasi aktif
    const currentUser = typeof window.getKujangCurrentUser === 'function' ? window.getKujangCurrentUser() : null;
    if (currentUser && (currentUser.roleKey === 'admin' || (currentUser.role && currentUser.role.toLowerCase().includes('admin')))) {
      return {
        name: currentUser.name || 'Bambang Sutrisno, S.T.',
        title: currentUser.role || 'Administrator Pengamanan & K3',
        nip: currentUser.nip || 'ADM-2016-019'
      };
    }

    // 2. window.ACTORS.admin
    if (window.ACTORS && window.ACTORS.admin) {
      return {
        name: window.ACTORS.admin.name || 'Bambang Sutrisno, S.T.',
        title: window.ACTORS.admin.roleLabel || window.ACTORS.admin.title || 'Administrator Pengamanan & K3',
        nip: window.ACTORS.admin.nip || 'ADM-2016-019'
      };
    }

    // 3. Fallback ke master MOCK_USERS
    const users = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
    const adminUser = users.find(u => (u.roleKey === 'admin' || (u.role && u.role.toLowerCase().includes('admin'))) && u.status === 'Aktif');
    if (adminUser) {
      return {
        name: adminUser.name || 'Bambang Sutrisno, S.T.',
        title: adminUser.role || 'Administrator Pengamanan & K3',
        nip: adminUser.nip || 'ADM-2016-019'
      };
    }

    return {
      name: 'Bambang Sutrisno, S.T.',
      title: 'Administrator Pengamanan & K3',
      nip: 'ADM-2016-019'
    };
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

  
  function executeDirectDownloadPdf() {
    const el = document.getElementById('printableOfficialPdfDocument');
    if (!el) return;

    const btnDownload = document.getElementById('btnDirectDownloadPdf');
    const originalText = btnDownload ? btnDownload.innerHTML : '';
    if (btnDownload) {
      btnDownload.disabled = true;
      btnDownload.innerHTML = `
        <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>
        <span>Mengunduh PDF...</span>
      `;
    }

    const opt = {
      margin: [8, 8, 8, 8],
      filename: 'Laporan-Perizinan-Pupuk-Kujang.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: {
        mode: ['css', 'legacy'],
        avoid: ['tr', '.pdf-signature-section', '.pdf-footer-section', '.pdf-logos-row', '.pdf-top-bar']
      }
    };

    if (typeof html2pdf !== 'undefined') {
      html2pdf().from(el).set(opt).save().then(() => {
        if (btnDownload) {
          btnDownload.disabled = false;
          btnDownload.innerHTML = originalText;
        }
        if (typeof window.showToast === 'function') {
          window.showToast('Laporan PDF berhasil diunduh ke perangkat', 'success');
        }
      }).catch(err => {
        console.error('Direct PDF download error:', err);
        if (btnDownload) {
          btnDownload.disabled = false;
          btnDownload.innerHTML = originalText;
        }
        executePrintExportPdf();
      });
    } else {
      if (btnDownload) {
        btnDownload.disabled = false;
        btnDownload.innerHTML = originalText;
      }
      executePrintExportPdf();
    }
  }

  function executePrintExportPdf() {
    document.body.classList.add('printing-official-pdf');
    const wasDark = document.body.classList.contains('theme-dark');
    if (wasDark) {
      document.body.classList.remove('theme-dark');
    }
    
    // Sembunyikan elemen sibling body lainnya agar tidak memakan ruang layout cetak
    const hiddenSiblings = [];
    Array.from(document.body.children).forEach(child => {
      if (child.id !== 'modalExportPdfPreview' && child.style.display !== 'none') {
        hiddenSiblings.push({ el: child, prev: child.style.display });
        child.style.setProperty('display', 'none', 'important');
      }
    });

    // Allow browser to render layout before printing
    setTimeout(() => {
      window.print();
      
      const cleanup = () => {
        document.body.classList.remove('printing-official-pdf');
        if (wasDark) {
          document.body.classList.add('theme-dark');
        }
        hiddenSiblings.forEach(item => {
          item.el.style.display = item.prev;
        });
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
  window.executeDirectDownloadPdf = executeDirectDownloadPdf;

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
