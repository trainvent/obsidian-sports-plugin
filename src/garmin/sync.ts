import { Platform } from 'obsidian';
import type SportsPlugin from '../main';
import { newGarminClient } from './client';
import { normalizeGarmin, garminToday } from './normalize';
import { EMPTY_GARMIN_CACHE } from './types';
import { validDate } from '../workbook/daily-log';

/** A failed or throttled refresh preserves the last complete snapshot. */
export async function syncGarmin(plugin: SportsPlugin, force = false): Promise<void> {
 if (!plugin.data.garminEnabled || !Platform.isDesktop) return;
 const previous = plugin.data.garminCache ?? EMPTY_GARMIN_CACHE;
 if (!force && Date.now() - Date.parse(previous.lastAttempt) < 60 * 60_000) return;
 const attempt = new Date().toISOString();
 plugin.data.garminCache = { ...previous, lastAttempt: attempt, error: '' };
 await plugin.save();
 try {
  const timezone = plugin.data.plan?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const end = garminToday(timezone);
  const start = validDate(plugin.data.garminHistoryStart, 'Garmin history start');
  if (start > end) throw new Error('Invalid history range.');
  const client = await newGarminClient(plugin.app, plugin.data.garminSecretId);
  if (!await client.loadTokens()) throw new Error('Garmin sign-in required.');
  const { Garmin } = await import('garminconnect-js');
  const rows = await new Garmin(client).getActivitiesByDate(start, end);
  const activities = normalizeGarmin(rows, timezone, start, end);
  plugin.data.garminCache = { activities, lastAttempt: attempt, lastSuccess: new Date().toISOString(), start, end, error: '' };
 } catch {
  // API failures can include credentials or full responses. Never persist or display them.
  plugin.data.garminCache = { ...previous, lastAttempt: attempt, error: 'Garmin refresh failed. Check the history date, or reconnect Garmin and try again later.' };
 }
 await plugin.save();
}
