import readXlsxFile from 'read-excel-file/browser';
import { unzipSync, zipSync, strFromU8 } from 'fflate';
import { checkWorkbookArchive } from './zip-safety';
import { readOds } from './ods';
import type { WorkbookSheet } from './sheet-data';

/** Detect the actual archive format, including cloud share links without a suffix. */
export async function readWorkbookSheets(buffer: ArrayBuffer, selected: Set<string>): Promise<WorkbookSheet[]> {
 checkWorkbookArchive(buffer);
 const files = unzipSync(new Uint8Array(buffer), { filter: entry => ['mimetype', 'content.xml', 'xl/workbook.xml', 'META-INF/manifest.xml'].includes(entry.name) });
 const mime = files.mimetype ? strFromU8(files.mimetype).trim() : '';
 if (mime === 'application/vnd.oasis.opendocument.spreadsheet') {
  if (files['xl/workbook.xml']) throw new Error('Ambiguous workbook format. Save a fresh XLSX or ODS copy.');
  if (!files['content.xml']) throw new Error('ODS workbook has no readable content. Password-protected workbooks are unsupported.');
  if (files['META-INF/manifest.xml'] && /encryption-data/.test(strFromU8(files['META-INF/manifest.xml']))) throw new Error('Password-protected ODS workbooks are unsupported. Save an unencrypted copy.');
  return readOds(strFromU8(files['content.xml']), selected);
 }
 if (!files['xl/workbook.xml']) throw new Error('Unsupported workbook format. Use an XLSX or ODS spreadsheet.');
 // The reader's async inflater creates workers by serializing functions, which
 // breaks after bundling on larger sheets. Bounded synchronous decompression
 // followed by a stored archive keeps its public reader on the safe path.
 const stored = Uint8Array.from(zipSync(unzipSync(new Uint8Array(buffer)), { level: 0 }));
 // The XLSX library's declaration uses typeof Date; its runtime returns Date instances.
 return await readXlsxFile(new Blob([stored])) as unknown as WorkbookSheet[];
}
