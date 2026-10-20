import { parseWeeklySchedule } from './weekly-schedule';
import { parseWeekPlans } from './week-plans';
import { dailyLog } from './daily-log';
import { checkWorkbookArchive } from './zip-safety';
import readXlsxFile, { type SheetData } from 'read-excel-file/browser';
import type { Goal, TrainingPart, Session, TrainingPlan } from '../model/types';

type RecordRow = Record<string, string>;
function text(value: unknown): string {
 if (value instanceof Date) return value.toISOString().slice(0, 10);
 if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
 return '';
}
function tables(rows: SheetData): Map<string, RecordRow[]> {
 const result = new Map<string, RecordRow[]>();
 let name = ''; let headers: string[] = [];
 for (const row of rows) {
  const values = row.map(text);
  while (values.length && !values[values.length - 1]) values.pop();
  if (!values.some(Boolean)) { name = ''; headers = []; continue; }
  const first = values[0] ?? '';
  if (['Plan', 'Goals', 'Parts', 'PartGoals', 'Exercises', 'Sessions', 'Weekly schedule', 'Week plans'].includes(first) && values.slice(1).every(value => !value)) {
   if (result.has(first)) throw new Error(`Duplicate table: ${first}`);
   name = first; headers = []; result.set(name, []); continue;
  }
  if (!name) throw new Error('Each table must start with its name alone in column A, followed by a header row.');
  if (!headers.length) {
   headers = values;
   if (headers.some(value => !value) || new Set(headers).size !== headers.length) throw new Error(`${name}: headers must be nonempty and unique.`);
   continue;
  }
  if (values.slice(headers.length).some(Boolean)) throw new Error(`${name}: a row has values beyond its headers.`);
  const entry: RecordRow = {};
  headers.forEach((header, index) => { entry[header] = values[index] ?? ''; });
  result.get(name)?.push(entry);
 }
 return result;
}
function required(row: RecordRow, field: string, context: string): string {
 const value = row[field]; if (!value) throw new Error(`${context}: missing ${field}.`); return value;
}
function unique(values: string[], context: string): void {
 if (new Set(values).size !== values.length) throw new Error(`${context}: duplicate IDs.`);
}
function minutes(value: string | undefined, context: string): number | null {
 if (!value) return null;
 const number = Number(value);
 if (!Number.isFinite(number) || number < 0) throw new Error(`${context}: duration must be a nonnegative number.`);
 return number;
}
function table(source: Map<string, RecordRow[]>, name: string): RecordRow[] {
 const value = source.get(name); if (!value) throw new Error(`Missing table: ${name}`); return value;
}
export interface WorkbookMapping {
 strategySheet: string;
 trackingSheet: string;
 previous?: TrainingPlan | null;
}
export const DEFAULT_MAPPING: WorkbookMapping = { strategySheet: 'Strategy', trackingSheet: 'Training log' };
export async function parseWorkbook(buffer: ArrayBuffer, mapping: WorkbookMapping = DEFAULT_MAPPING): Promise<TrainingPlan> {
 if (!mapping.strategySheet && !mapping.trackingSheet) throw new Error('Select at least one sheet to sync a workbook.');
 if (mapping.strategySheet && mapping.strategySheet === mapping.trackingSheet) throw new Error('Choose different sheets for strategy and tracking.');
 if (buffer.byteLength > 5 * 1024 * 1024) throw new Error('Workbook exceeds the prototype limit of 5 MB.');
 checkWorkbookArchive(buffer);
 const sheets = await readXlsxFile(new Blob([buffer]));
 const selected = (name: string): SheetData => {
  const sheet = sheets.find(sheet => sheet.sheet === name);
  if (!sheet) throw new Error(`Selected sheet "${name}" was not found. Update the sheet selection in Sports settings.`);
  return sheet.data;
 };
 const strategy = mapping.strategySheet ? tables(selected(mapping.strategySheet)) : null;
 const log = mapping.trackingSheet ? selected(mapping.trackingSheet) : null;
 const previous = mapping.previous;
 let id = previous?.id ?? 'sports-tracking-only';
 let name = previous?.name ?? 'Training log';
 let timezone = previous?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
 let goals: Goal[] = previous?.goals ?? [];
 let parts: TrainingPart[] = previous?.parts ?? [];
 let weeklySchedule = previous?.weeklySchedule ?? [];
 let weekPlans = previous?.weekPlans ?? [];
 if (strategy) {
 const metadata = table(strategy, 'Plan');
 if (metadata.length !== 1) throw new Error('Plan must contain exactly one metadata row.');
 const meta = metadata[0]!;
 if (meta.schema_version !== '1') throw new Error('Expected schema_version 1.');
 timezone = required(meta, 'timezone', 'Plan');
 id = required(meta, 'plan_id', 'Plan');
 name = required(meta, 'plan_name', 'Plan');
 try { new Intl.DateTimeFormat('en', { timeZone: timezone }); } catch { throw new Error('Plan: invalid timezone.'); }
 goals = table(strategy, 'Goals').map(row => ({ id: required(row, 'goal_id', 'Goals'), title: required(row, 'title', 'Goals'), benchmark: row.benchmark ?? '', baseline: row.baseline ?? '', test: row.test ?? '' }));
 parts = table(strategy, 'Parts').map(row => ({ id: required(row, 'part_id', 'Parts'), version: required(row, 'version', 'Parts'), title: required(row, 'title', 'Parts'), prescription: required(row, 'prescription', 'Parts'), goalIds: [] }));
 unique(goals.map(goal => goal.id), 'Goals');
 unique(parts.map(part => JSON.stringify([part.id, part.version])), 'Parts');
 for (const row of table(strategy, 'PartGoals')) {
  const part = parts.find(part => part.id === row.part_id && part.version === row.version);
  if (!part || !goals.some(goal => goal.id === row.goal_id)) throw new Error('PartGoals: unknown goal or part/version.');
  if (!part.goalIds.includes(row.goal_id!)) part.goalIds.push(row.goal_id!);
 }
 weekPlans = parseWeekPlans(strategy.get('Week plans') ?? []);
 weeklySchedule = parseWeeklySchedule(strategy.get('Weekly schedule') ?? []);
 if (strategy.get('Exercises')?.length) throw new Error('Exercise-level tables are not supported in this prototype. Use the part prescription field.');
 }
 const daily = log ? dailyLog(log, parts, Boolean(strategy)) : null;
 const sessions: Session[] = daily ?? (log ? table(tables(log), 'Sessions').map((row, index) => {
  const context = `Sessions row ${index + 1}`;
  const date = required(row, 'date', context);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error(`${context}: use a valid YYYY-MM-DD date.`);
  const partId = row.part_id ?? ''; const partVersion = row.part_version ?? '';
  if (Boolean(partId) !== Boolean(partVersion)) throw new Error(`${context}: supply both part_id and part_version, or leave both blank.`);
  if (strategy && (partId || partVersion) && !parts.some(part => part.id === partId && part.version === partVersion)) throw new Error(`${context}: unknown part/version.`);
  const status = row.status || 'planned';
  if (!['planned', 'in-progress', 'completed', 'skipped', 'cancelled'].includes(status)) throw new Error(`${context}: invalid status.`);
  return { id: required(row, 'session_id', context), date, sport: required(row, 'sport', context), title: required(row, 'title', context), partId, partVersion,
   plannedMinutes: minutes(row.planned_minutes, context), actualMinutes: minutes(row.actual_minutes, context), result: row.result ?? '', status, notes: row.notes ?? '' };
 }) : previous?.sessions ?? []);
 unique(sessions.map(session => session.id), 'Sessions');
 return { id, name, timezone, goals, parts, weeklySchedule, weekPlans, sessions, importedAt: new Date().toISOString() };
}
