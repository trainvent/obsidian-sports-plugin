import type { TrainingPlan } from '../model/types';
import { dailyScores } from '../model/daily-scores';
import { noteLink } from './plan';
import { trainingLogMarkdown } from './render';
import { safeText, sessionDetails } from './performance';

function number(value: number | null | undefined): string { return typeof value === 'number' ? String(Math.round(value * 10) / 10) : '—'; }
function scoreTable(plan: TrainingPlan | null): string {
 const rows = dailyScores(plan).map(day => `| ${day.date} | ${number(day.expectedPerformance)} / ${number(day.actualPerformance)} | ${number(day.plannedIntensity)} / ${number(day.effortRating)}${day.effortRating !== null ? ` (${day.ratedSessions}/${day.sessions} rated)` : ''} | ${number(day.scoredMetrics)} / ${number(day.plannedMetrics)} |`);
 return `| Date | Performance expected / actual (%) | Intensity planned (0–10) / felt (1–5) | Scored / planned metrics |\n| --- | --- | --- | --- |\n${rows.join('\n')}`;
}
function navigation(folder: string): string {
 return ['Index', 'Table', 'Daily', 'Graph'].map(page => noteLink(folder, `Analytics/${page}`, page === 'Index' ? 'Analytics' : page)).join(' · ');
}
export function analyticsMarkdown(_plan: TrainingPlan | null, folder: string): string {
 return `${noteLink(folder, 'Plans', 'Plans')} · ${noteLink(folder, 'Log', 'Log')}\n\n## Training analytics\n\n- ${noteLink(folder, 'Analytics/Table', 'Table')} — compact imported sessions and results.\n- ${noteLink(folder, 'Analytics/Daily', 'Daily')} — individual sets and exercise comparisons.\n- ${noteLink(folder, 'Analytics/Graph', 'Graph')} — planned intensity, target attainment, and optional felt effort.\n\nIntensity is how hard training is planned to be (0–10). Performance compares actual results with targets using median attainment (100% meets the target). Felt effort is an optional rating (1–5), recorded separately. Missing values stay unrecorded. These are planning comparisons, not an absolute fitness score.`;
}
export function analyticsTableMarkdown(plan: TrainingPlan | null, folder: string): string {
 return `${navigation(folder)}\n\n## Daily score table\n\n${scoreTable(plan)}\n\n${trainingLogMarkdown(plan, false, false)}`;
}
export function analyticsDailyMarkdown(plan: TrainingPlan | null, folder: string): string {
 const sessions = [...(plan?.sessions ?? [])].sort((a, b) => b.date.localeCompare(a.date));
 const details = sessions.map(session => `${sessionDetails(session) || `### ${safeText(session.date)} · ${safeText(session.title)}\n\n${safeText(session.status)}\n\n${safeText(session.result || 'No set measurements recorded.')}`}${session.scores ? `\n\nPerformance: ${number(session.scores.expectedPerformance)} expected / ${number(session.scores.actualPerformance)} actual (%). Planned intensity: ${number(session.scores.plannedIntensity)} / 10.${session.scores.effortRating !== null && session.scores.effortRating !== undefined ? ` Felt effort (optional): ${number(session.scores.effortRating)} / 5.` : ''} Scored metrics: ${number(session.scores.scoredMetrics)} / ${number(session.scores.plannedMetrics)}.` : ''}${session.notes ? `\n\n${safeText(session.notes)}` : ''}`);
 return `${navigation(folder)}\n\n## Daily results\n\n${details.join('\n\n') || 'No manual training data imported yet. Select Sync now to import your workbook.'}`;
}
export function analyticsGraphMarkdown(plan: TrainingPlan | null, folder: string): string {
 const days = dailyScores(plan);
 const chart = (expected: 'expectedPerformance' | 'plannedIntensity', actual: 'actualPerformance' | 'effortRating', expectedLabel = 'Expected', actualLabel = 'Actual'): string => {
  const rows = days.map(day => `${day.date}\t${number(day[expected])}\t${number(day[actual])}`);
  return ['```sports-trend', `Date\t${expectedLabel}\t${actualLabel}`, ...rows, '```'].join('\n');
 };
 return `${navigation(folder)}\n\n## Daily performance (%)\n\n${chart('expectedPerformance', 'actualPerformance')}\n\n## Planned intensity (0–10) and optional felt effort (1–5)\n\n${chart('plannedIntensity', 'effortRating', 'Planned intensity', 'Felt effort (optional)')}\n\n${scoreTable(plan)}\n\nPerformance comes from the workbook's median actual/target ratios for selected metrics. For several sessions on a date, the daily point is the median of their available session scores. Coverage shows which planned metrics contributed; partial coverage is not a complete day's result. Planned intensity uses 0–10 (0 no planned demand, 10 highest planned demand). Optional felt effort uses 1–5 (1 easy, 5 very hard). The shared axis spans 0–10; compare the series using their labeled scales. Each daily point is the median of available session ratings. Felt effort never changes the performance score. Rated-session counts show partial effort reporting. Missing values create gaps. Edit metric inclusion and performance targets in the workbook. The example calculates planned intensity from exercise arsenal assumptions and the planned sets and amounts on Scoring; update those inputs when changing the written plan. Record felt effort only if useful. Older workbooks without score columns keep their results on Table and Daily; add score columns for Graph.`;
}

export function analyticsNoteTasks(plan: TrainingPlan | null, folder: string): { path: string; id: string; body: string; initial: string }[] {
 return [
  { path: 'Analytics/Index.md', id: 'analytics', body: analyticsMarkdown(plan, folder), initial: '# Analytics\n\n## Reflections\n' },
  { path: 'Analytics/Table.md', id: 'analytics-table', body: analyticsTableMarkdown(plan, folder), initial: '# Table\n\n## Reflections\n' },
  { path: 'Analytics/Daily.md', id: 'analytics-daily', body: analyticsDailyMarkdown(plan, folder), initial: '# Daily\n\n## Reflections\n' },
  { path: 'Analytics/Graph.md', id: 'analytics-graph', body: analyticsGraphMarkdown(plan, folder), initial: '# Graph\n\n## Reflections\n' },
 ];
}
