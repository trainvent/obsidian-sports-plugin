import { readCloudWorkbook } from './cloud';

/** Cloud-only: never resolve a source through the desktop filesystem. */
export async function readWorkbookSource(input: string): Promise<ArrayBuffer> {
 if (!/^https:\/\//i.test(input.trim())) throw new Error('Paste an HTTPS workbook download link. Local file paths are no longer supported; upload your XLSX or ODS and use its share link.');
 return readCloudWorkbook(input);
}
