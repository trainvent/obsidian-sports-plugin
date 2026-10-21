import { calendarMarkdown } from './calendar';
import type { CoachCache } from '../garmin/coach';
import type SportsPlugin from '../main';
import { garminToday } from '../garmin/normalize';
import { updateNote } from './store';

function cell(value: string | number): string {
 return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/[\\`*[\]_]/g, '\\$&').replaceAll('|', '&#124;').replace(/[\r\n]+/g, '<br>');
}
export function coachPlansMarkdown(enabled: boolean | undefined, cache?: CoachCache, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone, now = new Date()): string {
 if (!enabled) return '';
 const today = garminToday(timezone, now);
 const workouts = (cache?.workouts ?? []).filter(workout => workout.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
 const status = cache?.lastSuccess ? `Last synced: ${cell(cache.lastSuccess)}. Published schedule: ${cell(cache.start)}–${cell(cache.end)}.` : 'No Garmin Coach schedule imported yet. Connect Garmin and sync to import published workouts.';
 const warning = cache?.error ? `\n\n${cell(cache.error)}` : '';
 const rows = workouts.map(workout => `| ${workout.date} | ${cell(workout.plan)} | ${cell(workout.name)} | ${cell(workout.sport)} | ${workout.duration === null ? '—' : (workout.duration / 60).toFixed(1)} | ${workout.distance === null ? '—' : (workout.distance / 1000).toFixed(2)} | ${cell(workout.description)} |`).join('\n');
 return `\n\n## Upcoming Garmin Coach workouts\n\n${status}${warning}\n\n${rows ? `| Date | Coach plan | Workout | Sport | Estimated min | Estimated km | Description |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows}` : 'No upcoming Coach workouts in the imported schedule.'}\n\nGarmin Coach may publish only a few upcoming sessions and can change them after training. These are scheduled workouts, separate from XLSX plans and recorded activities. Check Garmin Connect for the latest prescription.`;
}

/** Coach can have a Plans note even when no workbook is selected. */
export async function syncCoachOnlyPlans(plugin: SportsPlugin, recreateMissing = false): Promise<void> {
 if (plugin.data.plan || (!plugin.data.showGarminCoachPlans && !plugin.data.garminCoachCache)) return;
 await updateNote(plugin, 'Calendar.md', 'calendar', calendarMarkdown(null, plugin.data.showGarminCoachPlans, plugin.data.garminCoachCache), '# Calendar\n\n## Reflections\n', recreateMissing);
 await updateNote(plugin, 'Plans.md', 'plan', `[[${plugin.data.notesFolder}/Calendar|Calendar]]\n\nNo workbook plan imported.${coachPlansMarkdown(plugin.data.showGarminCoachPlans, plugin.data.garminCoachCache)}`, '# Plans\n\n## Reflections\n', recreateMissing);
}
