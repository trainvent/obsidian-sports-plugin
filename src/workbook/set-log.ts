import { scoreFields, SCORE_COLUMNS } from './score-fields';
import type { SheetData } from './sheet-data';
import type { Session, TrainingPart } from '../model/types';
import type { ExerciseTracking } from '../model/exercise-tracking';
import { cellText, validDate } from './daily-log';

/** Long-form Daily: add exercises, sets, or metrics as rows instead of columns. */
export function setLog(rows: SheetData, parts: TrainingPart[], hasStrategy: boolean): Session[] | null {
 const first = rows.findIndex(row => ['Date', 'Exercise', 'Set', 'Unit', 'Target', 'Result'].every(name => row.some(value => cellText(value) === name)));
 if (first < 0) return null;
 const headers = rows[first]!.map(cellText);
 while (headers.length && !headers[headers.length - 1]) headers.pop();
 const allowed: string[] = [...SCORE_COLUMNS, 'Date', 'Exercise', 'Set', 'Unit', 'Target', 'Result', 'Done', 'Aggregate', 'Session ID', 'Block', 'Plan', 'Title', 'Sport', 'Status', 'Notes', 'Part version', 'Planned minutes', 'Actual minutes'];
 if (headers.some(name => !name || (!allowed.includes(name) && !name.endsWith(' result'))) || new Set(headers).size !== headers.length) throw new Error('Daily sets: use unique supported headers.');
 const sessions = new Map<string, Session>();
 const metrics = new Map<string, Map<string, Map<number, { target: number | null; actual: number | null; done: boolean | null }>>>();
 const aggregations = new Map<string, ExerciseTracking['aggregation']>();
 const minuteDisplays = new Set<string>();
 const metadata = new Map<string, Record<string, string>>();
 for (const [index, row] of rows.slice(first + 1).entries()) {
  if (!row.some(value => cellText(value))) continue;
  const context = `Daily sets row ${first + index + 2}`;
  if (row.slice(headers.length).some(value => cellText(value))) throw new Error(`${context}: values extend beyond the headers.`);
  const entry = Object.fromEntries(headers.map((name, i) => [name, row[i] instanceof Date && ['Target', 'Result'].includes(name) ? `${row[i].getUTCHours() * 60 + row[i].getUTCMinutes()}:${String(row[i].getUTCSeconds()).padStart(2, '0')}` : cellText(row[i])]));
  const date = validDate(entry.Date!, context);
  const block = entry.Block ?? '';
  const id = entry['Session ID'] || `daily:${date}:${encodeURIComponent(block)}`;
  const unitInput = entry.Unit!;
  const timed = /^(?:seconds?|secs?|s|minutes?|mins?)$/i.test(unitInput);
  const unit = timed ? 'seconds' : unitInput;
  if (!entry.Exercise || !unit) throw new Error(`${context}: Exercise and Unit are required.`);
  const set = Number(entry.Set);
  if (!Number.isSafeInteger(set) || set < 1) throw new Error(`${context}: Set must be a positive whole number.`);
  const numeric = (name: string): number | null => {
   const raw = entry[name];
   if (!raw) return null;
   const time = /^(\d+):([0-5]\d)(?::([0-5]\d))?$/.exec(raw);
   const value = timed && time ? time[3] ? Number(time[1]) * 3600 + Number(time[2]) * 60 + Number(time[3]) : Number(time[1]) * 60 + Number(time[2]) : /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) * (timed && /^min/i.test(unitInput) ? 60 : 1) : NaN;
   if (!Number.isFinite(value) || value < 0) throw new Error(`${context}: ${name} must be a nonnegative number${timed ? ' or mm:ss / hh:mm:ss' : ''}, or blank.`);
   return value;
  };
  const flag = (entry.Done ?? '').toLowerCase();
  if (flag && !['true', 'false'].includes(flag)) throw new Error(`${context}: Done must be TRUE, FALSE, or blank.`);
  const done = headers.includes('Done') ? flag ? flag === 'true' : null : entry.Result ? true : null;
  const target = numeric('Target');
  const recorded = numeric('Result');
  const actual = done === true ? recorded : null;
  let session = sessions.get(id);
  if (!session) {
   const candidates = parts.filter(part => part.id === block && (!entry['Part version'] || part.version === entry['Part version']));
   if (hasStrategy && block && block.toLowerCase() !== 'empty' && candidates.length !== 1) throw new Error(`${context}: block "${block}" must match a strategy part. Use Part version if several versions exist.`);
   const part = candidates.length === 1 ? candidates[0] : undefined;
   session = { id, date, block, title: entry.Title || part?.title || block || 'Training', sport: entry.Sport || 'training', partId: part?.id ?? '', partVersion: part?.version ?? '', prescription: entry.Plan || '', plannedMinutes: null, actualMinutes: null, status: 'planned', notes: '', result: '', results: {}, checks: {}, tracking: [] };
   sessions.set(id, session); metrics.set(id, new Map()); metadata.set(id, {});
  }
  if (session.date !== date) throw new Error(`${context}: Session ID must refer to a single date.`);
  const shared = metadata.get(id)!;
  for (const name of [...SCORE_COLUMNS, 'Block', 'Title', 'Sport', 'Plan', 'Status', 'Part version', 'Planned minutes', 'Actual minutes']) {
   const value = entry[name] ?? '';
   if (!value) continue;
   if (shared[name] && shared[name] !== value) throw new Error(`${context}: conflicting ${name} for Session ID "${id}".`);
   shared[name] = value;
  }
  if (entry.Notes && !session.notes.split('\n').includes(entry.Notes)) session.notes = [session.notes, entry.Notes].filter(Boolean).join('\n');
  for (const name of headers.filter(name => name.endsWith(' result'))) {
   const value = entry[name] ?? '';
   if (value && session.results![name] && session.results![name] !== value) throw new Error(`${context}: conflicting ${name} for Session ID "${id}".`);
   if (value) session.results![name] = value;
  }
  const key = JSON.stringify([entry.Exercise, unit]);
  const aggregate = (entry.Aggregate || 'total') as ExerciseTracking['aggregation'];
  if (!['total', 'average', 'min', 'max', 'last'].includes(aggregate!)) throw new Error(`${context}: Aggregate must be total, average, min, max, or last.`);
  const aggregationKey = JSON.stringify([id, key]);
  if (timed && /^min/i.test(unitInput)) minuteDisplays.add(aggregationKey);
  if (aggregations.has(aggregationKey) && aggregations.get(aggregationKey) !== aggregate) throw new Error(`${context}: conflicting Aggregate for exercise/unit.`);
  aggregations.set(aggregationKey, aggregate);
  let sets = metrics.get(id)!.get(key);
  if (!sets) { sets = new Map(); metrics.get(id)!.set(key, sets); }
  if (sets.has(set)) throw new Error(`${context}: duplicate exercise/unit/set in session "${id}".`);
  sets.set(set, { target, actual, done });
 }
 for (const session of sessions.values()) {
  const shared = metadata.get(session.id)!;
  // Metadata can be supplied once or repeated consistently on the session's rows.
  session.title = shared.Title || session.title; session.sport = shared.Sport || session.sport;
  session.prescription = shared.Plan || '';
  session.scores = scoreFields(shared, `Daily sets session ${session.id}`);
  if ((shared.Block ?? '') !== (session.block ?? '') || (shared['Part version'] && shared['Part version'] !== session.partVersion && hasStrategy)) throw new Error(`Daily sets session ${session.id}: supply Block and Part version on its first row.`);
  for (const [header, field] of [['Planned minutes', 'plannedMinutes'], ['Actual minutes', 'actualMinutes']] as const) {
   if (shared[header]) {
    const value = Number(shared[header]);
    if (!Number.isFinite(value) || value < 0) throw new Error(`Daily sets: ${header} must be nonnegative.`);
    session[field] = value;
   }
  }
  for (const [key, sets] of metrics.get(session.id)!) {
   const [name, unit] = JSON.parse(key) as [string, string];
   const ordered = [...sets.entries()].sort(([left], [right]) => left - right);
   const exercise: ExerciseTracking = { group: name, name, unit, ...(minuteDisplays.has(JSON.stringify([session.id, key])) ? { displayUnit: 'minutes' as const } : {}), aggregation: aggregations.get(JSON.stringify([session.id, key])), targets: ordered.map(([, value]) => value.target), actual: ordered.map(([, value]) => value.actual), done: ordered.some(([, value]) => value.done === true) ? true : ordered.every(([, value]) => value.done === false) ? false : null, setNumbers: ordered.map(([number]) => number), setChecks: ordered.map(([, value]) => value.done) };
   session.tracking!.push(exercise);
  }
  const hasResults = typeof session.scores?.effortRating === 'number' || typeof session.scores?.actualPerformance === 'number' || typeof session.scores?.actualEffort === 'number' || session.tracking!.some(exercise => exercise.actual.some(value => value !== null) || exercise.done === true) || Object.values(session.results!).some(Boolean);
  session.status = shared.Status || (hasResults ? 'in-progress' : 'planned');
  if (!['planned', 'in-progress', 'completed', 'skipped', 'cancelled'].includes(session.status)) throw new Error(`Daily sets session ${session.id}: invalid Status.`);
  session.result = Object.entries(session.results!).map(([name, value]) => `${name}: ${value}`).join('; ');
 }
 return [...sessions.values()];
}
