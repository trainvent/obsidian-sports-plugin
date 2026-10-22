import type { TrainingPlan } from '../model/types';
import { dailyScores, median } from '../model/daily-scores';
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
 const scaledPerformance = ['```sports-trend', 'Date\tPerformance × intensity\tPlanned intensity (0–10)', ...days.map(day => {
  const adjusted = median((plan?.sessions ?? []).filter(session => session.date === day.date).map(session => {
   const score = session.scores;
   return typeof score?.plannedIntensity === 'number' && typeof score.actualPerformance === 'number' ? score.plannedIntensity * score.actualPerformance / 100 : null;
  }));
  return `${day.date}\t${number(adjusted)}\t${number(day.plannedIntensity)}`;
 }), '```'].join('\n');
 const performanceTrend = ['```sports-trend', 'Date\tPerformance (%)', ...days.map(day => `${day.date}\t${number(day.actualPerformance)}`), '```'].join('\n');
 const chart = (left: 'actualPerformance' | 'effortRating' | 'expectedPerformance', right: 'plannedIntensity' | 'actualPerformance', leftLabel: string, rightLabel: string): string =>
  ['```sports-trend', `Date\t${leftLabel}\t${rightLabel}`, ...days.map(day => `${day.date}\t${number(day[left])}\t${number(day[right])}`), '```'].join('\n');
 return `${navigation(folder)}\n\n## Intensity and performance over time\n\n${scaledPerformance}\n\nPerformance is plotted as intensity × actual performance / 100 on the same scale as intensity: at 100% the lines coincide; at 80% the performance point is 20% below intensity. Values above 100% can plot above 10. This changes the display only, not the workbook score. Missing performance leaves a gap. At zero intensity the scaled value remains zero; raw percentages remain in the third chart.\n\n## Effort and intensity over time\n\n${chart('effortRating', 'plannedIntensity', 'Felt effort (1–5)', 'Planned intensity (0–10)')}\n\nFelt effort uses the left 0–5 axis (recorded ratings are 1–5); planned intensity uses the right 0–10 axis. Intensity appears even before effort or performance is recorded. Missing values leave gaps, not zero points.\n\n## Daily performance (%)\n\n${performanceTrend}\n\nPerformance scaling is calculated per session before taking the daily median. Each other series uses the median of its available session values for the date. Dates with incomplete session reporting can compare different subsets; check partial performance coverage and rated-session counts on ${noteLink(folder, 'Analytics/Table', 'Table')}. Edit intensity assumptions and planned volume in the workbook, record results and optional felt effort, save, then sync.`;
}

export function analyticsNoteTasks(plan: TrainingPlan | null, folder: string): { path: string; id: string; body: string; initial: string }[] {
 return [
  { path: 'Analytics/Index.md', id: 'analytics', body: analyticsMarkdown(plan, folder), initial: '# Analytics\n\n## Reflections\n' },
  { path: 'Analytics/Table.md', id: 'analytics-table', body: analyticsTableMarkdown(plan, folder), initial: '# Table\n\n## Reflections\n' },
  { path: 'Analytics/Daily.md', id: 'analytics-daily', body: analyticsDailyMarkdown(plan, folder), initial: '# Daily\n\n## Reflections\n' },
  { path: 'Analytics/Graph.md', id: 'analytics-graph', body: analyticsGraphMarkdown(plan, folder), initial: '# Graph\n\n## Reflections\n' },
 ];
}
