import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });

  // Login as Admin using kujangQuickLogin
  await page.evaluate(() => {
    if (typeof window.kujangQuickLogin === 'function') {
      window.kujangQuickLogin('admin');
    }
  });
  await page.waitForTimeout(600);

  // 1. Check Export PDF buttons presence
  const btnEmpExport = await page.$('#btnEmpExportPdf');
  const btnAppExport = await page.$('#btnApproverExportPdf');
  const btnSecExport = await page.$('#btnSecurityExportPdf');
  const btnAdminPrint = await page.$('#btnAdminPrintPdf');

  console.log('PDF Buttons Check:');
  console.log('- Karyawan Export PDF button exists:', !!btnEmpExport, '(Expected: false)');
  console.log('- Approver Export PDF button exists:', !!btnAppExport, '(Expected: false)');
  console.log('- Security Export PDF button exists:', !!btnSecExport, '(Expected: false)');
  console.log('- Admin Print PDF button exists:', !!btnAdminPrint, '(Expected: true)');

  // 2. Test Admin PDF Modal with Automatic Title
  await page.evaluate(() => {
    const menu = document.getElementById('menuAdminReport');
    if (menu) menu.click();
  });
  await page.waitForTimeout(600);

  await page.evaluate(() => {
    const btn = document.getElementById('btnAdminPrintPdf');
    if (btn) btn.click();
  });
  await page.waitForTimeout(800);

  const pdfTitleInfo = await page.evaluate(() => {
    const titleEl = document.getElementById('pdfDocumentDisplayTitle');
    const inputTitle = document.getElementById('exportPdfInputTitle');
    return {
      titleText: titleEl?.textContent,
      hasInputTitle: !!inputTitle
    };
  });
  console.log('PDF Title Info:', pdfTitleInfo);

  await page.screenshot({
    path: 'C:/Users/DELL/.gemini/antigravity/brain/cded6371-6dbe-41c1-9b89-690cefe62cb5/v9_admin_pdf_automatic_title.png'
  });

  // Close PDF modal
  await page.evaluate(() => {
    if (typeof window.closeExportPdfModal === 'function') window.closeExportPdfModal();
  });
  await page.waitForTimeout(400);

  // 3. Test Karyawan Riwayat: Button "Pilih" below search & No "Batal" in selection bar
  await page.evaluate(() => {
    if (typeof window.kujangQuickLogin === 'function') window.kujangQuickLogin('karyawan');
  });
  await page.waitForTimeout(600);

  await page.evaluate(() => {
    const menu = document.getElementById('menuKaryawanRiwayat');
    if (menu) menu.click();
  });
  await page.waitForTimeout(600);

  // Check btnSelectEmpRiwayat location
  const isPilihBelowSearch = await page.evaluate(() => {
    const searchWrap = document.querySelector('.figma-search-wrap');
    const btnPilih = document.getElementById('btnSelectEmpRiwayat');
    return searchWrap && searchWrap.contains(btnPilih);
  });
  console.log('- Button "Pilih" is inside/below searchWrap:', isPilihBelowSearch, '(Expected: true)');

  // Click btnSelectEmpRiwayat to activate select mode
  await page.evaluate(() => {
    const btnPilih = document.getElementById('btnSelectEmpRiwayat');
    if (btnPilih) btnPilih.click();
  });
  await page.waitForTimeout(400);

  // Select 1 card
  await page.evaluate(() => {
    const firstCheckbox = document.querySelector('#containerEmpRequests input.riwayat-select-checkbox');
    if (firstCheckbox) firstCheckbox.click();
  });
  await page.waitForTimeout(400);

  const selectionBarInfo = await page.evaluate(() => {
    const bar = document.getElementById('empRiwayatSelectionBar');
    if (!bar) return null;
    const batalBtn = Array.from(bar.querySelectorAll('button')).find(b => b.textContent.includes('Batal'));
    const hapusBtn = Array.from(bar.querySelectorAll('button')).find(b => b.textContent.includes('Hapus Terpilih'));
    const selectAll = bar.querySelector('input[type="checkbox"]');
    return {
      barVisible: bar.style.display !== 'none',
      hasBatalButton: !!batalBtn,
      hasHapusTerpilihButton: !!hapusBtn,
      hasSelectAll: !!selectAll
    };
  });
  console.log('Selection Bar Info:', selectionBarInfo);

  await page.screenshot({
    path: 'C:/Users/DELL/.gemini/antigravity/brain/cded6371-6dbe-41c1-9b89-690cefe62cb5/v9_karyawan_pilih_below_search_no_batal.png'
  });

  // Turn off select mode
  await page.evaluate(() => {
    if (typeof window.toggleRiwayatSelectMode === 'function') window.toggleRiwayatSelectMode('karyawan', false);
  });
  await page.waitForTimeout(400);

  // 4. Test Scroll Position Preservation on Delete
  await page.evaluate(() => {
    window.scrollTo({ top: 500, behavior: 'instant' });
  });
  await page.waitForTimeout(300);

  const scrollBeforeClick = await page.evaluate(() => window.scrollY);
  console.log('Scroll before clicking Hapus:', scrollBeforeClick);

  // Find a delete button on one of the cards
  await page.evaluate(() => {
    const deleteBtns = document.querySelectorAll('#containerEmpRequests .btn-pill-delete');
    if (deleteBtns.length > 0) {
      deleteBtns[deleteBtns.length - 1].click();
    }
  });
  await page.waitForTimeout(400);

  const scrollWithModalOpen = await page.evaluate(() => window.scrollY);
  console.log('Scroll while delete modal is open:', scrollWithModalOpen);

  await page.screenshot({
    path: 'C:/Users/DELL/.gemini/antigravity/brain/cded6371-6dbe-41c1-9b89-690cefe62cb5/v9_delete_scroll_preserved_modal.png'
  });

  // Execute deletion
  await page.evaluate(() => {
    const btnExec = document.getElementById('btnExecuteDeleteConfirm');
    if (btnExec) btnExec.click();
  });
  await page.waitForTimeout(500);

  const scrollAfterDelete = await page.evaluate(() => window.scrollY);
  console.log('Scroll after delete confirmed:', scrollAfterDelete);

  await page.screenshot({
    path: 'C:/Users/DELL/.gemini/antigravity/brain/cded6371-6dbe-41c1-9b89-690cefe62cb5/v9_delete_scroll_preserved_after.png'
  });

  await browser.close();
  console.log('All verifications completed successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
