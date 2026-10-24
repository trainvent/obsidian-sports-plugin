import { compactAnalyticsCopy } from './analytics-copy';
import type { TrainingPlan } from '../model/types';
import { dailyScores, median } from '../model/daily-scores';
import { noteLink } from './plan';
import type { GarminCache } from '../garmin/types';
import { smartwatchMarkdown } from './smartwatch';
import { dailyIndexMarkdown, dailyNoteTasks } from './daily';
import { combinedAnalyticsMarkdown } from './combined-analytics';
import { overviewMarkdown } from './overview';

function number(value: number | null | undefined): string { return typeof value === 'number' ? String(Math.round(value * 10) / 10) : '—'; }
export function analyticsMarkdown(plan: TrainingPlan | null, folder: string): string {
 return overviewMarkdown(plan, folder);
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
 return compactAnalyticsCopy(`## Intensity and performance\n\n${scaledPerformance}\n\nPerformance is plotted as intensity × actual performance / 100 on the same scale as intensity: at 100% the lines coincide; at 80% the performance point is 20% below intensity. Values above 100% can plot above 10. This changes the display only, not the workbook score. Missing performance leaves a gap. At zero intensity the scaled value remains zero; raw percentages remain in the third chart.\n\n## Effort and intensity\n\n${chart('effortRating', 'plannedIntensity', 'Felt effort (1–5)', 'Planned intensity (0–10)')}\n\nFelt effort uses the left 0–5 axis (recorded ratings are 1–5); planned intensity uses the right 0–10 axis. Intensity appears even before effort or performance is recorded. Missing values leave gaps, not zero points.\n\n## Daily performance (%)\n\n${performanceTrend}\n\nPerformance scaling is calculated per session before taking the daily median. Each other series uses the median of its available session values for the date. Dates with incomplete session reporting can compare different subsets; check each session’s coverage and felt effort on ${noteLink(folder, 'Analytics/Log', 'Log')}. Edit intensity assumptions and planned volume in the workbook, record results and optional felt effort, save, then sync.`);
}

export function analyticsNoteTasks(plan: TrainingPlan | null, folder: string, garmin?: GarminCache, now = new Date()): { path: string; id: string; body: string; initial: string }[] {
 return [
  { path: 'Overview.md', id: 'analytics', body: overviewMarkdown(plan, folder, garmin, now), initial: '# Sports\n\n## Reflections\n' },
  { path: 'Days/_Index.md', id: 'analytics-daily', body: dailyIndexMarkdown(plan, folder, garmin, now), initial: '# Index\n\n## Reflections\n' },
  { path: 'Analytics/Sheet.md', id: 'analytics-graph', body: analyticsGraphMarkdown(plan, folder), initial: '# Sheet\n\n## Reflections\n' },
  { path: 'Analytics/Smartwatch.md', id: 'analytics-smartwatch', body: smartwatchMarkdown(garmin, folder), initial: '# Smartwatch\n\n## Reflections\n' },
  { path: 'Stats.md', id: 'analytics-combined', body: combinedAnalyticsMarkdown(plan, folder, garmin, now), initial: '# Stats\n\n## Reflections\n' },
  ...dailyNoteTasks(plan, folder, garmin, now),
 ];
}
