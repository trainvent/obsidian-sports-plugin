import { Garmin } from 'garminconnect-js';
import { Platform } from 'obsidian';
import type SportsPlugin from '../main';
import { newGarminClient } from './client';
import { garminToday } from './normalize';
import { validDate } from '../workbook/daily-log';

export interface CoachWorkout {
 id: string; date: string; name: string; sport: string; description: string; plan: string;
 duration: number | null; distance: number | null; rest: boolean;
}
export interface CoachCache {
 workouts: CoachWorkout[]; start: string; end: string; lastAttempt: string; lastSuccess: string; error: string;
}
const EMPTY: CoachCache = { workouts: [], start: '', end: '', lastAttempt: '', lastSuccess: '', error: '' };

/** Keep only adaptive plan summaries, not ordinary self-scheduled or static-plan workouts. */
export function normalizeCoach(input: unknown, start: string, end: string): CoachWorkout[] {
 if (!Array.isArray(input) || input.length > 5000) throw new Error('Invalid Coach schedule.');
 const rows = new Map<string, CoachWorkout>();
 const id = (value: unknown): string | undefined => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? String(value) : undefined;
 for (const value of input) {
  if (!value || typeof value !== 'object') throw new Error('Invalid Coach workout.');
  const row = value as Record<string, unknown>;
  const plan = id(row.fbtAdaptivePlanId) || id(row.atpPlanId);
  if (!plan || id(row.associatedActivityId)) continue;
  if (typeof row.scheduleDate !== 'string') throw new Error('Coach date missing.');
  const date = validDate(row.scheduleDate, 'Coach workout');
  if (date < start || date > end) continue;
  const label = (key: string, fallback = ''): string => {
   if (row[key] === null || row[key] === undefined || row[key] === '') return fallback;
   if (typeof row[key] !== 'string' || row[key].length > 4000) throw new Error('Invalid Coach text.');
   return row[key];
  };
  const measurement = (key: string): number | null => {
   const value = row[key];
   if (value === null || value === undefined) return null;
   if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Invalid Coach measurement.');
   return value;
  };
  const rest = row.isRestDay === true;
  const uuid = label('workoutUuid');
  if (uuid && !/^[a-zA-Z0-9-]{1,100}$/.test(uuid)) throw new Error('Invalid Coach workout ID.');
  const workoutId = uuid || id(row.workoutId) || (rest ? 'rest' : undefined);
  if (!workoutId) throw new Error('Coach workout ID missing.');
  const key = `${plan}:${date}:${workoutId}`;
  rows.set(key, { id: key, date, name: label('workoutName', rest ? 'Rest day' : 'Coach workout'), sport: label('workoutType'), description: label('workoutPhrase'), plan: label('tpPlanName', 'Garmin Coach'), duration: measurement('estimatedDurationInSecs'), distance: measurement('estimatedDistanceInMeters'), rest });
 }
 return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export async function syncCoach(plugin: SportsPlugin, force = false, createClient = newGarminClient): Promise<void> {
 if (!plugin.data.garminEnabled || !plugin.data.showGarminCoachPlans || !Platform.isDesktop) return;
 const previous = plugin.data.garminCoachCache ?? EMPTY;
 if (!force && Date.now() - Date.parse(previous.lastAttempt) < 60 * 60_000) return;
 const attempt = new Date().toISOString();
 plugin.data.garminCoachCache = { ...previous, lastAttempt: attempt };
 await plugin.save();
 try {
  const timezone = plugin.data.plan?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const start = garminToday(timezone);
  const endDate = new Date(`${start}T12:00:00Z`); endDate.setUTCDate(endDate.getUTCDate() + 27);
  const end = endDate.toISOString().slice(0, 10);
  const client = await createClient(plugin.app, plugin.data.garminSecretId);
  if (!await client.loadTokens()) throw new Error('Sign-in required.');
  const source = await new Garmin(client).getScheduledWorkoutSummaries(start, end);
  const workouts = normalizeCoach(source, start, end);
  plugin.data.garminCoachCache = { workouts, start, end, lastAttempt: attempt, lastSuccess: new Date().toISOString(), error: '' };
 } catch {
  plugin.data.garminCoachCache = { ...previous, lastAttempt: attempt, error: 'Coach schedule refresh failed. Previous published workouts are retained; check Garmin Connect for changes.' };
 }
 await plugin.save();
}
