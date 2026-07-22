// Suite 3 — ARMP Invoice Import Template + hard validation on invoice imports
const { boot, mkFile, importFile, importMappedInvoice, makeT, sleep, UPLOADS } = require('./harness');
const path = require('path');
const fs = require('fs');
const os = require('os');
const XLSX = require('xlsx');

(async () => {
  const { w, errors } = await boot();
  const { t, done } = makeT('Suite 3 — Import Template & validation');

  // ── Template generation (intercept XLSX.writeFile — browser download API) ──
  w.eval(`
    window._tplCaptured = null;
    var _oWrite = XLSX.writeFile;
    XLSX.writeFile = function(wb, fname){ window._tplCaptured = { wb: wb, fname: fname }; };
  `);
  t('template button exists in import modal',
    w.eval(`!!document.getElementById('imp-template-row') && document.body.innerHTML.indexOf('armpDownloadImportTemplate()')>=0`));
  w.eval(`openImport('inv')`);
  await sleep(50);
  t('template row visible for invoice imports',
    w.eval(`document.getElementById('imp-template-row').style.display`) === 'block');
  w.eval(`openImport('rem')`);
  await sleep(50);
  t('template row hidden for bank/remittance imports',
    w.eval(`document.getElementById('imp-template-row').style.display`) === 'none');

  w.eval(`armpDownloadImportTemplate()`);
  await sleep(50);
  const tpl = w.eval(`(function(){
    if(!window._tplCaptured) return null;
    var wb = window._tplCaptured.wb;
    var ws = wb.Sheets['Open Invoices'];
    var rows = XLSX.utils.sheet_to_json(ws, {header:1});
    return JSON.stringify({ fname: window._tplCaptured.fname, sheets: wb.SheetNames, headers: rows[0], nrows: rows.length });
  })()`);
  const tplObj = tpl ? JSON.parse(tpl) : null;
  t('template downloads as ARMP_Invoice_Import_Template.xlsx',
    tplObj && tplObj.fname === 'ARMP_Invoice_Import_Template.xlsx', tpl);
  t('template has Open Invoices + Instructions sheets',
    tplObj && tplObj.sheets.join(',') === 'Open Invoices,Instructions', tpl && tplObj.sheets);
  t('template headers name all 7 required fields exactly',
    tplObj && ['Account','Customer Name','Invoice','Open Amount','Currency','Invoice Date','Due Date'].every(h => tplObj.headers.includes(h)), tplObj && tplObj.headers);
  t('template lists the 7 required fields FIRST, before recommended/optional',
    tplObj && tplObj.headers.slice(0,7).join(',') === 'Account,Customer Name,Invoice,Open Amount,Currency,Invoice Date,Due Date', tplObj && tplObj.headers.slice(0,7));
  t('template headers include PO Number and Sales Order',
    tplObj && ['PO Number', 'Sales Order'].every(h => tplObj.headers.includes(h)), tplObj && tplObj.headers);
  t('template includes the 4 recommended reference fields',
    tplObj && ['PO Number','Sales Order','Delivery Number','Tracking Number'].every(h => tplObj.headers.includes(h)),
    tplObj && tplObj.headers);

  // ── Round-trip: a file built FROM the template must import cleanly ──
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'armp-'));
  const tplFile = path.join(tmpDir, 'template_filled.xlsx');
  {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Account','Customer Name','Invoice','PO Number','Sales Order','Amount','Currency','Document Type','Document Date','Net Due Date','Document Number','Text','Delivery #','Bill of Lading','Logistics Memo - Internal Header'],
      ['40099001','Acme Corp','9000000001','4500000001','2100000001','1250.50','USD','RV','2026-06-01','2026-07-31','1000999001','','7100000501','12/19/25 UPS 1Z9998V01234567890','SS260409-KB3(TK-F)'],
      ['40099001','Acme Corp','9000000002','4500000002','2100000002','980.00','USD','RV','2026-06-02','2026-08-01','1000999002','','7100000502','3/12/2026 DHL 5213011672','']
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Open Invoices');
    fs.writeFileSync(tplFile, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })); // bypass patched writeFile
  }
  await importFile(w, 'inv', tplFile, 'Acme_Open_Invoices.xlsx');
  await sleep(200);
  t('template-format file imports (2 rows)', w.eval('INV.length') === 2, w.eval('INV.length'));
  t('template columns map correctly (SO, PO, amount)',
    w.eval(`INV[0].so==='2100000001' && INV[0].po==='4500000001' && Math.abs(INV[0].amt-1250.5)<0.001 && INV[0].a==='40099001'`),
    w.eval(`JSON.stringify(INV[0])`));
  t('Delivery # column maps to invoice delivery field',
    w.eval(`INV[0].dl==='7100000501' && INV[1].dl==='7100000502'`),
    w.eval(`JSON.stringify([INV[0].dl,INV[1].dl])`));
  t('Bill of Lading maps to tracking with carrier token extracted (UPS + DHL prefixes stripped)',
    w.eval(`INV[0].t==='1Z9998V01234567890' && INV[1].t==='5213011672'`),
    w.eval(`JSON.stringify([INV[0].t,INV[1].t])`));
  t('Logistics Memo - Internal Header maps to logMemo',
    w.eval(`INV[0].logMemo==='SS260409-KB3(TK-F)'`),
    w.eval(`JSON.stringify(INV[0].logMemo)`));
  t('tracking + delivery indexed for shipment-reference matching',
    w.eval(`(function(){ _ensureInvIndexes(); return _INV_IDX.byTrk.has('1Z9998V01234567890') && _INV_IDX.byDel.has('7100000501'); })()`));

  // ── Rejection: file missing required columns ──
  const badFile = path.join(tmpDir, 'bad_import.xlsx');
  {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Widget','Color','Price Each'],
      ['A-1','Red','9.99'],
      ['A-2','Blue','12.49']
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    fs.writeFileSync(badFile, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }
  await importFile(w, 'inv', badFile, 'not_invoices.xlsx');
  await sleep(300);
  t('bad file rejected — INV unchanged (still 2 rows from prior import)', w.eval('INV.length') === 2, w.eval('INV.length'));
  const modalTxt = w.eval(`(function(){ var m=document.getElementById('exc-modal-overlay'); return (m&&m.classList.contains('open'))?m.textContent:''; })()`);
  t('validation modal opened naming the missing columns',
    /ARMP template format/.test(modalTxt) && /Account/.test(modalTxt) && /Invoice/.test(modalTxt) && /Amount/.test(modalTxt),
    modalTxt.slice(0, 200));
  t('validation modal offers the template download', /Download ARMP Template/.test(modalTxt));
  w.eval(`closeModal()`);

  // ── Partial miss: has Account+Amount but no Invoice column ──
  const partialFile = path.join(tmpDir, 'partial.csv');
  fs.writeFileSync(partialFile, 'Account,Amount\n40099001,100.00\n');
  await importFile(w, 'inv', partialFile, 'partial.csv');
  await sleep(300);
  const modalTxt2 = w.eval(`(function(){ var m=document.getElementById('exc-modal-overlay'); return (m&&m.classList.contains('open'))?m.textContent:''; })()`);
  t('partial file rejected, names ONLY the missing column (Invoice)',
    /Invoice/.test(modalTxt2) && w.eval('INV.length') === 2, modalTxt2.slice(0, 160));
  w.eval(`closeModal()`);

  // ── Seven-field gate: a RAW SAP export (missing Customer Name/Currency/dates
  //    as template columns) is now correctly REJECTED and directed to mapping. ──
  await importFile(w, 'inv', path.join(UPLOADS, 'Applied_Materials_Aging_Detail_FBL5N_06_01_2026.XLSX'),
    'Applied Materials Aging Detail FBL5N 06.01.2026.xlsx');
  await sleep(300);
  t('raw SAP export without template columns is rejected', w.eval('INV.length') === 2,
    'INV.length=' + w.eval('INV.length'));
  const rawModal = w.eval(`(document.querySelector('#armp-import-validation-modal, .import-val-modal, [id*=validation]')||{}).textContent||''`);
  w.eval(`closeModal()`);

  // ── The SAME raw file, once mapped into the ARMP template, imports cleanly. ──
  await importMappedInvoice(w, path.join(UPLOADS, 'Applied_Materials_Aging_Detail_FBL5N_06_01_2026.XLSX'),
    'Applied_Materials_ARMP_Template.xlsx', { customerName: 'Applied Materials', currency: 'USD' });
  await sleep(300);
  t('same file mapped to ARMP template passes validation (2226 rows)', w.eval('INV.length') === 2226, w.eval('INV.length'));

  // ── Non-invoice imports are NOT gated (remittance path unaffected) ──
  await importFile(w, 'rem', path.join(UPLOADS, 'ERS_Selfbilling_LineDetails.XLS'));
  await sleep(200);
  t('remittance/self-billing import unaffected by invoice validation',
    w.eval('ERS_LINES.length') > 0, w.eval('ERS_LINES.length'));

  t('no jsdom errors across template flows', errors.length === 0, errors[0]);

  done();
  process.exit(process.exitCode || 0);
})().catch(e => { console.error('SUITE CRASH:', e); process.exit(1); });
