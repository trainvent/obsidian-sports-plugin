import type { Session } from '../model/types';
import type { SheetData } from './sheet-data';
import { scoreFields } from './score-fields';

/** The unified Scoring table stores a summary on each session's first row. */
export function attachSessionScoring(sessions: Session[], data: SheetData): void {
 const header = data.findIndex(row => row.includes('Date') && row.includes('Session') && row.includes('Performance') && row.includes('Scored metrics'));
 if (header < 0) return;
 const headers = data[header]!.map(value => String(value ?? ''));
 const seen = new Set<string>();
 for (const [index, row] of data.slice(header + 1).entries()) {
  const entry = Object.fromEntries(headers.map((name, column) => [name, row[column] instanceof Date ? row[column].toISOString().slice(0, 10) : String(row[column] ?? '').trim()]));
  if (!entry['Planned metrics'] && !entry['Scored metrics'] && !entry.Performance) continue;
  const matches = sessions.filter(session => session.date === entry.Date && session.title === entry.Session);
  if (matches.length !== 1) throw new Error('Scoring: Date and Session must identify exactly one imported session.');
  const session = matches[0]!;
  if (seen.has(session.id)) throw new Error('Scoring: duplicate session summary.');
  seen.add(session.id);
  const scores = scoreFields(entry, `Scoring row ${header + index + 2}`);
  if (scores) session.scores = { ...(session.scores ?? scores), actualPerformance: scores.actualPerformance,
   scoredMetrics: scores.scoredMetrics, plannedMetrics: scores.plannedMetrics };
 }
}
