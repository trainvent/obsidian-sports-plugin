export type WorkbookFormat = 'xlsx' | 'ods';

/** Let the browser save a generated workbook; no filesystem paths or writes. */
export function downloadWorkbook(bytes: ArrayBuffer, doc: Document = document, format: WorkbookFormat = 'xlsx'): () => void {
 const url = URL.createObjectURL(new Blob([bytes], { type: format === 'ods' ? 'application/vnd.oasis.opendocument.spreadsheet' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
 const revoke = () => URL.revokeObjectURL(url);
 const link = doc.body.createEl('a', { attr: { href: url, download: `Training.${format}` } });
 try { link.click(); } catch (error) { revoke(); throw error; }
 finally { link.remove(); }
 return revoke;
}
