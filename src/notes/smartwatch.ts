import type { GarminCache } from '../garmin/types';
import { smartwatchCharts, type WatchChart } from '../model/smartwatch';
import { noteLink } from './plan';
import { safeText } from './performance';

export function smartwatchMarkdown(cache: GarminCache | undefined, folder: string): string {
 const charts = smartwatchCharts(cache);
 const chart = (data: WatchChart): string => `\`\`\`sports-watch\n${JSON.stringify(data).replaceAll('`', '\\u0060')}\n\`\`\``;
 const status = cache?.lastSuccess ? `Garmin imported ${safeText(cache.start)} to ${safeText(cache.end)}.` : 'Sync Garmin to populate these charts.';
 return `${noteLink(folder, 'Analytics/Index', 'Analytics')} · ${noteLink(folder, 'Analytics/Sheet', 'Sheet')} · ${noteLink(folder, 'Analytics/Combined', 'Combined')} · ${noteLink(folder, 'Log', 'Log')}\n\n${status}${cache?.error ? `\n\n${safeText(cache.error)} Cached activities remain visible.` : ''}\n\n## Weekly training volume\n\n${chart(charts.volume)}\n\nRecorded minutes by sport, grouped into Monday-start weeks. Only smartwatch activities are counted; workbook sessions are not added.${charts.missingDurations ? ` ${charts.missingDurations} activities lack duration and are excluded from minute totals, so coverage is partial.` : ''} First and last weeks may cover only part of a week. Zero bars mean no recorded minutes in the imported interval.\n\n## Running pace and heart rate\n\n${chart(charts.running)}\n\nPace is duration ÷ distance, in minutes per kilometre. Faster pace is higher on the left axis; average heart rate uses the right axis in bpm.\n\n## Swimming pace and heart rate\n\n${chart(charts.swimming)}\n\nSwimming pace uses minutes per 100 m. Each point represents an activity at its recorded local date and time. Missing or nonpositive duration, distance, or heart rate leaves the corresponding series unrecorded; available measurements still appear. Heart rate describes cardiovascular intensity, not the workbook’s 0–10 rating. Pace reflects speed, not target attainment; terrain and workout type affect comparisons.`;
}
