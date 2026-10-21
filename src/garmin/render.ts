import type { GarminCache } from './types';
import { activityDetails } from './activities';
function cell(value: string): string {
 return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/[\\`*[\]_]/g, '\\$&').replaceAll('|', '&#124;').replace(/[\r\n]+/g, ' ');
}

/** Actual tracker records stay independent of manual session completion. */
export function garminMarkdown(cache: GarminCache | undefined, dates?: string[]): string {
 if (!cache) return '';
 const records = cache.activities.filter(activity => !dates || dates.includes(activity.date)).sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));
 const status = cache.lastSuccess ? `Last successful sync: ${cell(cache.lastSuccess)}. Imported ${cell(cache.start)} to ${cell(cache.end)}.` : 'No Garmin activities imported yet.';
 const warning = cache.error ? `\n\n${cell(cache.error)} Cached activities are retained.` : '';
 const rows = records.map(activity => `| ${cell(activity.date)} | [${cell(activity.name)}](https://connect.garmin.com/modern/activity/${activity.id}) | ${cell(activityDetails(activity))} |`).join('\n');
 return `\n\n## Recorded Garmin activities\n\n${status}${warning}\n\n${rows ? `| Date | Activity | Recorded measurements |\n| --- | --- | --- |\n${rows}` : 'No recorded activities for these dates.'}\n\nGarmin records do not mark manual sessions complete.`;
}
