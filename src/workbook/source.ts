import { readCloudWorkbook } from './cloud';
import type { DataAdapter } from 'obsidian';

/** Release builds accept only cloud sources; development may override a vault file. */
export async function readWorkbookSource(input: string, adapter?: Pick<DataAdapter, 'readBinary'>): Promise<ArrayBuffer> {
 if (typeof __SPORTS_DEV__ !== 'undefined' && __SPORTS_DEV__ && adapter) {
  const local = await (await import('../dev/local-workbook')).readLocalWorkbook(adapter);
  if (local !== undefined) return local;
 }
 if (!/^https:\/\//i.test(input.trim())) throw new Error('Paste an HTTPS workbook download link. Local file paths are no longer supported; upload your XLSX or ODS and use its share link.');
 return readCloudWorkbook(input);
}
