import type { Session } from '../model/types';
import { exerciseTracking } from '../model/exercise-tracking';

export function safeText(value: string | number): string {
 return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/[\\`*[\]_#~]/g, '\\$&').replaceAll('|', '&#124;').replace(/[\r\n]+/g, '<br>');
}
function number(value: number): string { return String(Math.round(value * 100) / 100); }

/** A small table holds the sets; the graph compares totals within each exercise's own unit. */
export function performanceMarkdown(session: Session): string {
 const exercises = exerciseTracking(session);
 if (!exercises.length) return '';
 const graph: string[] = [];
 const rows = exercises.map(exercise => {
  const planned = exercise.targets.reduce((sum, value) => sum + value, 0);
  const recorded = exercise.actual.filter((value): value is number => value !== null);
  const total = recorded.reduce((sum, value) => sum + value, 0);
  const label = `${exercise.group} · ${exercise.name} (${exercise.unit})`;
  graph.push(`${label.replace(/[\t\r\n`]/g, ' ')}\t${number(planned)}\t${recorded.length ? number(total) : '—'}`);
  const hasText = exercise.done === true && exercise.actual.some((value, i) => value === null && session.results?.[exercise.group === 'Core' ? 'Core rounds result' : `${exercise.group} ${i + 1} result`]?.trim());
  const result = exercise.done === false ? 'Not recorded (unchecked)' : !recorded.length ? hasText ? 'See sets (not numeric)' : 'Unrecorded' : `${number(total)} ${exercise.unit}${recorded.length < exercise.actual.length ? ' · partial' : ''}`;
  const sets = exercise.actual.map((value, i) => {
   if (value !== null) return number(value);
   const raw = session.results?.[exercise.group === 'Core' ? 'Core rounds result' : `${exercise.group} ${i + 1} result`];
   return exercise.done === true ? safeText(raw || '—') : '—';
  }).join(' / ');
  return `| ${safeText(exercise.group)} · ${safeText(exercise.name)} | ${exercise.targets.length} × ${number(exercise.targets[0]!)} ${exercise.unit} | ${result} | ${sets} |`;
 });
 return `\n\n\`\`\`sports-compare\nExercise\tPlan\tResult\n${graph.join('\n')}\n\`\`\`\n\n| Exercise | Plan | Result | Sets in order |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n\nEach bar uses its own exercise scale. — means unrecorded; zero is a recorded result. Timed sets use seconds. Totals include numeric recorded sets only; text results remain in the sets table; unchecked inputs are never results.`;
}

export function sessionDetails(session: Session): string {
 const performance = performanceMarkdown(session);
 if (!performance) return '';
 return `> [!example]- ${safeText(session.date)} · ${safeText(session.title)} · sets and comparisons\n${`${safeText(session.status)}${performance}`.split('\n').map(line => `> ${line}`).join('\n')}`;
}

/** Keep numbered input-column names out of the narrow overview; retain custom measurements. */
export function compactResults(session: Session): string {
 const exercises = exerciseTracking(session);
 if (!exercises.length || !session.results || !session.checks) return session.result;
 const groups = new Set(exercises.map(exercise => exercise.group));
 const summary = exercises.map(exercise => {
  const values = exercise.actual.filter((value): value is number => value !== null);
  const hasText = exercise.done === true && Object.entries(session.results ?? {}).some(([key, value]) => value && (key.startsWith(`${exercise.group} `)));
  return `${exercise.group}: ${exercise.done === false ? 'unchecked' : values.length ? `${number(values.reduce((sum, value) => sum + value, 0))} ${exercise.unit}${values.length < exercise.actual.length ? ' (partial)' : ''}` : hasText ? 'recorded; see sets' : 'unrecorded'}`;
 });
 for (const [key, value] of Object.entries(session.checks)) if (!groups.has(key.replace(/ done$/, ''))) summary.push(`${key}: ${value === null ? 'unrecorded' : value ? 'yes' : 'no'}`);
 for (const [key, value] of Object.entries(session.results)) {
  const match = /^([ABC]) [1-5] result$/.exec(key) ?? /^(Core) rounds result$/.exec(key);
  if (value && (!match || !groups.has(match[1]!))) summary.push(`${key}: ${value}`);
 }
 return summary.join('; ');
}
