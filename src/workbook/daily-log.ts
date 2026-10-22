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
 const first = rows.findIndex(row => row.some(value => cellText(value) === 'Date') && row.some(value => cellText(value) === 'Plan'));
 if (first < 0) return null;
 const headers = rows[first]!.map(cellText);
 // A merged exercise heading spans Done and its five numbered iteration columns.
 const groups = first > 0 ? rows[first - 1]!.map(cellText) : [];
 let group = '';
 headers.forEach((header, column) => {
  if (groups[column]) group = groups[column]!;
  if (/^(?:[ABC]|Core)$/.test(group)) {
   if (header === 'Done') headers[column] = `${group} done`;
   else if (group === 'Core' && header === 'Rounds') headers[column] = 'Core rounds result';
   else if (group !== 'Core' && /^[1-5]$/.test(header)) headers[column] = `${group} ${header} result`;
  }
 });
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
  headers.forEach((header, column) => {
   const value = row[column];
   // Excel duration cells arrive as dates; retain their minutes and seconds as results.
   entry[header] = header.endsWith(' result') && value instanceof Date
    ? `${String(value.getUTCHours() * 60 + value.getUTCMinutes()).padStart(2, '0')}:${String(value.getUTCSeconds()).padStart(2, '0')}`
    : cellText(value);
  });
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
   } else if (header.endsWith(' result')) {
    // Iteration cells start with planned targets. Only a recorded exercise is actual training.
    const iteration = /^([ABC]) [1-5] result$/.exec(header) ?? /^(Core) rounds result$/.exec(header);
    results[header] = iteration && entry[`${iteration[1]} done`]?.toLowerCase() !== 'true' ? '' : value;
    if (header === 'Core rounds result' && results[header] && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))) throw new Error(`${context}: Core rounds must be a nonnegative whole number or blank.`);
   }
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
