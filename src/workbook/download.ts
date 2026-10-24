export type WorkbookFormat = 'xlsx' | 'ods';
export type WorkbookKind = 'blank' | 'example';

/** Let the browser save a generated workbook; no filesystem paths or writes. */
export function downloadWorkbook(bytes: ArrayBuffer, doc: Document = document, format: WorkbookFormat = 'xlsx', kind: WorkbookKind = 'example'): () => void {
 const url = URL.createObjectURL(new Blob([bytes], { type: format === 'ods' ? 'application/vnd.oasis.opendocument.spreadsheet' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
 const revoke = () => URL.revokeObjectURL(url);
 const link = doc.body.createEl('a', { attr: { href: url, download: `Training${kind === 'blank' ? '-Template' : '-Example'}.${format}` } });
 try { link.click(); } catch (error) { revoke(); throw error; }
 finally { link.remove(); }
 return revoke;
}
