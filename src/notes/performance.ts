import type { Session } from '../model/types';
import { exerciseTracking, resultKey, aggregateValues } from '../model/exercise-tracking';
import { sessionScoreSummary } from './session-scores';

export function safeText(value: string | number): string {
 return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/[\\`*[\]_#~]/g, '\\$&').replaceAll('|', '&#124;').replace(/[\r\n]+/g, '<br>');
}
function number(value: number): string { return String(Math.round(value * 100) / 100); }

/** Keep storage canonical while presenting requested minutes and long durations naturally. */
function displayTracking(session: Session) {
 return exerciseTracking(session).map(exercise => {
  const values = [...exercise.targets, ...exercise.actual].filter((value): value is number => value !== null && value > 0);
  if (exercise.unit !== 'seconds' || (exercise.displayUnit !== 'minutes' && (!values.length || values.some(value => value < 600)))) return exercise;
  return { ...exercise, unit: 'minutes', targets: exercise.targets.map(value => value === null ? null : value / 60), actual: exercise.actual.map(value => value === null ? null : value / 60) };
 });
}

/** A small table holds the sets; the graph compares totals within each exercise's own unit. */
export function performanceMarkdown(session: Session, explain = true): string {
 const exercises = displayTracking(session);
 if (!exercises.length) return '';
 const graph: string[] = [];
 const rows = exercises.map(exercise => {
  const planned = aggregateValues(exercise.targets, exercise.aggregation);
  const recorded = exercise.actual.filter((value): value is number => value !== null);
  const total = aggregateValues(exercise.actual, exercise.aggregation);
  const label = `${exercise.group === exercise.name ? exercise.name : `${exercise.group} · ${exercise.name}`} (${exercise.unit})${exercise.aggregation && exercise.aggregation !== 'total' ? ` · ${exercise.aggregation}` : ''}`;
  graph.push(`${label.replace(/[\t\r\n`]/g, ' ')}\t${planned !== null ? number(planned) : '—'}\t${total !== null ? number(total) : '—'}`);
  const hasText = exercise.done === true && exercise.actual.some((value, i) => value === null && (exercise.resultKeys ? session.results?.[resultKey(exercise, i)] : undefined)?.trim());
  const result = exercise.done === false ? 'Not recorded (unchecked)' : !recorded.length ? hasText ? 'See sets (not numeric)' : 'Unrecorded' : `${number(total!)} ${exercise.unit}${exercise.aggregation && exercise.aggregation !== 'total' ? ` (${exercise.aggregation})` : ''}${recorded.length < exercise.actual.length ? ' · partial' : ''}`;
  const sets = exercise.actual.map((value, i) => {
   if (value !== null) return number(value);
   const raw = (exercise.resultKeys ? session.results?.[resultKey(exercise, i)] : undefined);
   if (exercise.setChecks?.[i] === false) return '— (unchecked)';
   return exercise.done === true ? safeText(raw || '—') : '—';
  }).join(' / ');
  const plannedSets = exercise.targets.map(value => value === null ? '—' : number(value));
  const prescription = exercise.targets.length && exercise.targets[0] !== null && exercise.targets.every(value => value === exercise.targets[0]) ? `${exercise.targets.length} × ${number(exercise.targets[0]!)}` : plannedSets.join(' / ');
  const setLabels = exercise.setNumbers ? `Set ${exercise.setNumbers.join(' / ')}: ` : '';
  return `| ${safeText(exercise.group === exercise.name ? exercise.name : `${exercise.group} · ${exercise.name}`)} | ${prescription} ${safeText(exercise.unit)} | ${safeText(result)} | ${setLabels}${sets} |`;
 });
 return `\n\n\`\`\`sports-compare\nExercise\tPlan\tResult\n${graph.join('\n')}\n\`\`\`\n\n| Exercise | Plan | Result | Sets in order |\n| --- | --- | --- | --- |\n${rows.join('\n')}${explain ? '\n\nReps use the left axis; time uses the right. Other units have separate charts. Comparisons use recorded totals unless another aggregation is named. Missing results stay unplotted; partial and text results remain in the sets table.' : ''}`;
}

export function sessionDetails(session: Session): string {
 return renderSessionDetails(session, '');
}

export function scoredSessionDetails(session: Session): string {
 return renderSessionDetails(session, sessionScoreSummary(session));
}

function renderSessionDetails(session: Session, scores: string): string {
 const performance = performanceMarkdown(session);
 if (!performance && !scores) return '';
 const details = `${safeText(session.status)}${scores ? `\n\n${scores}` : ''}${performance || (session.result ? `\n\n${safeText(session.result)}` : '')}`;
 return `> [!example]- ${safeText(session.date)} · ${safeText(session.title)} · ${performance ? 'sets and comparisons' : 'session scores'}\n${details.split('\n').map(line => `> ${line}`).join('\n')}`;
}

/** Keep numbered input-column names out of the narrow overview; retain custom measurements. */
export function compactResults(session: Session): string {
 const exercises = displayTracking(session);
 if (!exercises.length || !session.results || !session.checks) return session.result;
 const groups = new Set(exercises.map(exercise => exercise.group));
 const summary = exercises.map(exercise => {
  const values = exercise.actual.filter((value): value is number => value !== null);
  const hasText = exercise.done === true && Object.entries(session.results ?? {}).some(([key, value]) => value && (key.startsWith(`${exercise.group} `)));
  return `${exercise.group}: ${exercise.done === false ? 'unchecked' : values.length ? `${number(aggregateValues(exercise.actual, exercise.aggregation)!)} ${exercise.unit}${exercise.aggregation && exercise.aggregation !== 'total' ? ` (${exercise.aggregation})` : ''}${values.length < exercise.actual.length ? ' (partial)' : ''}` : hasText ? 'recorded; see sets' : 'unrecorded'}`;
 });
 for (const [key, value] of Object.entries(session.checks)) if (!groups.has(key.replace(/ done$/, ''))) summary.push(`${key}: ${value === null ? 'unrecorded' : value ? 'yes' : 'no'}`);
 for (const [key, value] of Object.entries(session.results)) {
  const tracked = exercises.some(exercise => exercise.resultKeys?.includes(key));
  if (value && !tracked) summary.push(`${key}: ${value}`);
 }
 return summary.join('; ');
}
