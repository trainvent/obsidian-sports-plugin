import type { SheetData } from 'read-excel-file/browser';
import type { Session, TrainingPart } from '../model/types';

export function cellText(value: unknown): string {
 if (value instanceof Date) return value.toISOString().slice(0, 10);
 if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
 return '';
}
export function validDate(value: string, context: string): string {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T12:00:00Z`)) || new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error(`${context}: use a valid YYYY-MM-DD date.`);
 return value;
}
/** Recognize the user-facing daily format without inferring meaning from plan prose. */
export function dailyLog(rows: SheetData, parts: TrainingPart[], hasStrategy: boolean): Session[] | null {
 const first = rows.findIndex(row => row.some(value => cellText(value)));
 if (first < 0) return null;
 const headers = rows[first]!.map(cellText);
 while (headers.length && !headers[headers.length - 1]) headers.pop();
 if (!headers.includes('Date') || !headers.includes('Block') || !headers.includes('Plan')) return null;
 if (headers.some(header => !header) || new Set(headers).size !== headers.length) throw new Error('Daily log: column headers must be nonempty and unique.');
 const structural = ['Date', 'Block', 'Plan', 'Notes', 'Session ID', 'Part version', 'Status', 'Sport', 'Planned minutes', 'Actual minutes', 'Title'];
 for (const header of headers) if (!structural.includes(header) && !header.endsWith(' result') && !header.endsWith(' done')) throw new Error(`Daily log: name custom result columns "${header} result" or completion columns "${header} done".`);
 return rows.slice(first + 1).flatMap((row, index) => {
  if (!row.some(value => cellText(value))) return [];
  const context = `Daily log row ${first + index + 2}`;
  if (row.slice(headers.length).some(value => cellText(value))) throw new Error(`${context}: values extend beyond the headers.`);
  const entry: Record<string, string> = {};
  headers.forEach((header, column) => { entry[header] = cellText(row[column]); });
  const date = validDate(entry.Date ?? '', context);
  const block = entry.Block ?? '';
  const version = entry['Part version'] ?? '';
  const candidates = parts.filter(part => part.id === block && (!version || part.version === version));
  const empty = !block || block.toLowerCase() === 'empty';
  if (hasStrategy && !empty && candidates.length !== 1) throw new Error(`${context}: block "${block}" must match a strategy part. Use Part version if several versions exist.`);
  const part = candidates.length === 1 ? candidates[0] : undefined;
  const checks: Record<string, boolean | null> = {};
  const results: Record<string, string> = {};
  for (const header of headers) {
   const value = entry[header] ?? '';
   if (header.endsWith(' done')) {
    if (value && !['true', 'false'].includes(value.toLowerCase())) throw new Error(`${context}: ${header} must be TRUE, FALSE, or blank.`);
    checks[header] = value ? value.toLowerCase() === 'true' : null;
   } else if (header.endsWith(' result')) results[header] = value;
  }
  const hasResults = Object.values(results).some(value => value !== '') || Object.values(checks).some(value => value === true);
  const status = entry.Status || (hasResults ? 'in-progress' : 'planned');
  if (!['planned', 'in-progress', 'completed', 'skipped', 'cancelled'].includes(status)) throw new Error(`${context}: invalid Status.`);
  const duration = (header: string): number | null => {
   const value = entry[header];
   if (!value) return null;
   const number = Number(value);
   if (!Number.isFinite(number) || number < 0) throw new Error(`${context}: ${header} must be a nonnegative number or blank.`);
   return number;
  };
  const result = [...Object.entries(checks).map(([name, value]) => `${name}: ${value === null ? 'unrecorded' : value ? 'yes' : 'no'}`), ...Object.entries(results).filter(([, value]) => value !== '').map(([name, value]) => `${name}: ${value}`)].join('; ');
  return [{ id: entry['Session ID'] || `daily:${date}:${encodeURIComponent(block)}`, date, sport: entry.Sport || 'training', title: entry.Title || (empty ? 'No manual training planned' : part?.title || block || 'Training'),
   partId: part?.id ?? '', partVersion: part?.version ?? '', block, prescription: entry.Plan ?? '', checks, results,
   plannedMinutes: duration('Planned minutes'), actualMinutes: duration('Actual minutes'), result, status, notes: entry.Notes ?? '' }];
 });
}
