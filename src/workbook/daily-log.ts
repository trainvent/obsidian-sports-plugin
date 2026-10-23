import { scoreFields, SCORE_COLUMNS } from './score-fields';
import { dailyHeaders } from './daily-headers';
import { setLog } from './set-log';
import type { SheetData } from './sheet-data';
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
 const sets = setLog(rows, parts, hasStrategy);
 if (sets !== null) return sets;
 const first = rows.findIndex(row => row.some(value => cellText(value) === 'Date') && row.some(value => cellText(value) === 'Plan'));
 if (first < 0) return null;
 const headers = dailyHeaders(rows, first);
 if (!headers.includes('Date') || !headers.includes('Block') || !headers.includes('Plan')) return null;
 if (headers.some(header => !header) || new Set(headers).size !== headers.length) throw new Error('Daily log: column headers must be nonempty and unique.');
 const structural: string[] = [...SCORE_COLUMNS, 'Session done', 'All done', 'Date', 'Block', 'Plan', 'Notes', 'Notes topic', 'Session ID', 'Part version', 'Status', 'Sport', 'Planned minutes', 'Actual minutes', 'Title'];
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
  const notesTopic = entry['Notes topic'] || 'General';
  if (!['General', 'Muscle-up', 'HSPU', 'Pistol', 'Cal-Intervals', 'Skills A', 'Skills B', 'Technique', 'Swimming', 'Running'].includes(notesTopic)) throw new Error(`${context}: choose a listed goal or routine for Notes topic.`);
  const block = entry.Block ?? '';
  const version = entry['Part version'] ?? '';
  const candidates = parts.filter(part => part.id === block && (!version || part.version === version));
  const empty = !block || block.toLowerCase() === 'empty';
  if (hasStrategy && !empty && candidates.length !== 1) throw new Error(`${context}: block "${block}" must match a strategy part. Use Part version if several versions exist.`);
  const part = candidates.length === 1 ? candidates[0] : undefined;
  const checks: Record<string, boolean | null> = {};
  const results: Record<string, string> = {};
  const sessionFlag = 'Session done' in entry;
  const completionHeader = sessionFlag ? 'Session done' : 'All done';
  const allDoneValue = entry[completionHeader]?.toLowerCase() ?? '';
  if (allDoneValue && !['true', 'false'].includes(allDoneValue)) throw new Error(`${context}: ${completionHeader} must be TRUE, FALSE, or blank.`);
  const allDone = allDoneValue === 'true';
  for (const header of headers) {
   if (header === 'All done' || header === 'Session done') continue;
   const value = entry[header] ?? '';
   if (header.endsWith(' done')) {
    if (value && !['true', 'false'].includes(value.toLowerCase())) throw new Error(`${context}: ${header} must be TRUE, FALSE, or blank.`);
    checks[header] = allDone || (value ? value.toLowerCase() === 'true' : null);
   } else if (header.endsWith(' result')) {
    // Iteration cells start with planned targets. Only a recorded exercise is actual training.
    const iteration = /^(.+) [1-9]\d* result$/.exec(header) ?? /^(.+) rounds result$/.exec(header);
    if (sessionFlag && iteration) {
     const performed = allDone && !(header.endsWith(' rounds result') && (!value || Number(value) === 0));
     checks[`${iteration[1]} done`] = performed;
     results[header] = performed ? value : '';
    } else results[header] = iteration && !allDone && entry[`${iteration[1]} done`]?.toLowerCase() !== 'true' ? '' : value;
    if (header.endsWith(' rounds result') && results[header] && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))) throw new Error(`${context}: ${header.replace(/ rounds result$/, '')} rounds must be a nonnegative whole number or blank.`);
   }
  }
  const hasResults = Boolean(entry.Performance || entry['Actual performance'] || entry['Actual effort'] || entry['Effort rating']) || Object.values(results).some(value => value !== '') || Object.values(checks).some(value => value === true);
  const status = entry.Status || (sessionFlag && allDone ? 'completed' : hasResults ? 'in-progress' : 'planned');
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
   partId: part?.id ?? '', partVersion: part?.version ?? '', scores: scoreFields(entry, context), block, prescription: entry.Plan ?? '', checks, results,
   plannedMinutes: duration('Planned minutes'), actualMinutes: duration('Actual minutes'), result, status,
   ...(entry['Notes topic'] ? { notesTopic } : {}), notes: entry.Notes ?? '' }];
 });
}
