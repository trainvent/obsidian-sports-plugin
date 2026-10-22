import type { GarminActivity, GarminCache } from '../garmin/types';

export interface VolumeChart { kind: 'volume'; groups: string[]; rows: { date: string; values: number[] }[] }
export interface CardioChart { kind: 'cardio'; sport: 'running' | 'swimming'; rows: { date: string; time: string; name: string; pace: number | null; hr: number | null }[] }
export type WatchChart = VolumeChart | CardioChart;
const DAY = 86_400_000;
export function activitySport(type: string): string {
 if (/(^|_)running$|^virtual_run$/.test(type)) return 'Running';
 if (/(^|_)swimming$/.test(type)) return 'Swimming';
 if (/(^|_)(cycling|biking)$/.test(type)) return 'Cycling';
 if (/(^|_)(walking|hiking)$/.test(type)) return 'Walking';
 if (/strength|weight_training/.test(type)) return 'Strength';
 return 'Other';
}
function monday(date: string): number {
 const time = Date.parse(`${date}T12:00:00Z`);
 return time - ((new Date(time).getUTCDay() + 6) % 7) * DAY;
}
export function smartwatchCharts(cache?: GarminCache): { volume: VolumeChart; running: CardioChart; swimming: CardioChart; missingDurations: number } {
 const activities = [...new Map((cache?.activities ?? []).map(a => [a.id, a])).values()].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
 const groups = [...new Set(activities.map(a => activitySport(a.type)))].sort();
 const volume: VolumeChart = { kind: 'volume', groups, rows: [] };
 if (activities.length) {
  const start = monday(cache?.start || activities[0]!.date);
  const end = monday(cache?.end || activities[activities.length - 1]!.date);
  const weeks = new Map<string, number[]>();
  for (let time = start; time <= end; time += 7 * DAY) weeks.set(new Date(time).toISOString().slice(0, 10), groups.map(() => 0));
  for (const activity of activities) {
   const date = new Date(monday(activity.date)).toISOString().slice(0, 10);
   if (!weeks.has(date)) weeks.set(date, groups.map(() => 0));
   if (activity.duration !== null) weeks.get(date)![groups.indexOf(activitySport(activity.type))]! += activity.duration / 60;
  }
  volume.rows = [...weeks].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({ date, values }));
 }
 const cardio = (sport: 'running' | 'swimming'): CardioChart => ({ kind: 'cardio', sport, rows: activities.filter(a => activitySport(a.type).toLowerCase() === sport).map((a: GarminActivity) => ({
  date: a.date, time: a.time, name: a.name,
  pace: a.duration !== null && a.duration > 0 && a.distance !== null && a.distance > 0 ? a.duration / a.distance * (sport === 'running' ? 1000 : 100) : null,
  hr: a.average_hr !== null && a.average_hr > 0 ? a.average_hr : null,
 })) });
 return { volume, running: cardio('running'), swimming: cardio('swimming'), missingDurations: activities.filter(a => a.duration === null).length };
}
