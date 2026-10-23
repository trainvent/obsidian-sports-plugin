import type { GarminActivity } from './types';

/** Retain only seconds in zones 1–5; unknown or malformed responses remain missing. */
export function parseZones(input: unknown): number[] | null {
 if (!Array.isArray(input) || !input.length) return null;
 const seconds = [0, 0, 0, 0, 0];
 const seen = new Set<number>();
 for (const value of input) {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const zone = row.zoneNumber, time = row.secsInZone;
  if (zone === 0) continue;
  if (typeof zone !== 'number' || !Number.isInteger(zone) || zone < 1 || zone > 5 || seen.has(zone) || typeof time !== 'number' || !Number.isFinite(time) || time < 0) return null;
  seen.add(zone); seconds[zone - 1] = time;
 }
 return seconds.some(n => n > 0) ? seconds : null;
}

export function averageZone(activities: GarminActivity[]): number | null {
 let seconds = 0, weighted = 0;
 for (const activity of activities) {
  if (!Array.isArray(activity.hr_zones) || activity.hr_zones.length !== 5 || activity.hr_zones.some(n => !Number.isFinite(n) || n < 0)) continue;
  activity.hr_zones.forEach((time, i) => { seconds += time; weighted += time * (i + 1); });
 }
 return seconds > 0 ? weighted / seconds : null;
}
