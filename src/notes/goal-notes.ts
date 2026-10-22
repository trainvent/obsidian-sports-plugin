import type { Goal, TrainingPlan } from '../model/types';
import type { GarminCache } from '../garmin/types';
import { activityDetails } from '../garmin/activities';
import { goalResultColumn, goalGarminTypes, matchesGarminType } from './goal-sources';
import { noteLink } from './plan';
import { goalNotePath } from './goal-files';

function cell(value: string): string {
 return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/[\\`*[\]_]/g, '\\$&').replaceAll('|', '&#124;').replace(/[\r\n]+/g, '<br>');
}
export function goalNoteTask(goal: Goal, plan: TrainingPlan, cache: GarminCache | undefined, folder: string): { path: string; id: string; body: string; initial: string } {
 const column = goalResultColumn(goal, plan.sessions);
 const types = goalGarminTypes(goal);
 const manual = plan.sessions.flatMap(session => {
  const result = column ? session.results?.[column] : undefined;
  if (!result?.trim()) return [];
  return [{ date: session.date, title: session.title, result, status: session.status, notes: session.notes }];
 }).sort((a, b) => b.date.localeCompare(a.date));
 const activities = (cache?.activities ?? []).filter(activity => matchesGarminType(activity.type, types)).sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));
 const manualRows = manual.map(entry => `| ${entry.date} | ${cell(entry.title)} | ${cell(entry.result)} | ${cell(entry.status)} | ${cell(entry.notes)} |`).join('\n');
 const garminRows = activities.map(activity => `| ${activity.date} | [${cell(activity.name)}](https://connect.garmin.com/modern/activity/${activity.id}) | ${cell(activityDetails(activity))} |`).join('\n');
 const sources = `**XLSX column:** ${column ? cell(column) : 'No unique matching result column. Set result_column in Goals if needed.'}\n\n**Garmin types:** ${types.length ? types.map(cell).join(', ') : 'No matching activity type configured. Set garmin_types in Goals if needed.'}`;
 const status = types.length && cache ? `\n\n${cache.lastSuccess ? `Garmin imported ${cell(cache.start)}–${cell(cache.end)}.` : 'Garmin has not synced yet.'}${cache.error ? ` ${cell(cache.error)} Cached activities are retained.` : ''}` : '';
 const body = `${noteLink(folder, 'Plans', 'Plans')} · ${noteLink(folder, 'Log', 'Log')}\n\n**Goal:** ${cell(goal.title)}\n\n**Category:** ${(goal.category ?? 'milestone') === 'milestone' ? 'Aspiration' : 'Maintenance'}\n\n**Baseline:** ${cell(goal.baseline || 'Not established')}\n\n**Target:** ${cell(goal.benchmark || 'Not set')}\n\n**Test standard:** ${cell(goal.test || 'Not set')}\n\n${sources}\n\n## Training entries from XLSX\n\n${manualRows ? `| Date | Session | Goal entry | Session status | Session notes |\n| --- | --- | --- | --- | --- |\n${manualRows}` : 'No entries recorded in the matching result column.'}\n\n## Matching Garmin activities${status}\n\n${garminRows ? `| Date | Activity | Recorded measurements |\n| --- | --- | --- |\n${garminRows}` : 'No matching Garmin activities imported.'}\n\nRecorded entries do not automatically mark this goal achieved. Write reviews below the generated section.`;
 const initial = `---\ntags: [sports/goal]\ngoal_id: ${JSON.stringify(goal.id)}\n---\n# ${cell(goal.title)}\n\n## Review\n\n### Progress and observations\n\n\n### Adjustments\n\n\n### Next review\n\n`;
 return { path: goalNotePath(goal), id: `goal:${encodeURIComponent(goal.id)}`, body, initial };
}
