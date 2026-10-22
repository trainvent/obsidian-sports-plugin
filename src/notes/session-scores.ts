import type { Session } from '../model/types';

/** Session-level scores keep coverage attached to the results it describes. */
export function sessionScoreSummary(session: Session): string {
 const scores = session.scores;
 if (!scores || !Object.values(scores).some(value => typeof value === 'number')) return '';
 const value = (number: number | null | undefined): string => typeof number === 'number' ? String(Math.round(number * 10) / 10) : '—';
 const fields = [`Planned intensity: ${value(scores.plannedIntensity)} / 10`, `Performance: ${value(scores.actualPerformance)}${typeof scores.actualPerformance === 'number' ? '%' : ''}`];
 if (typeof scores.scoredMetrics === 'number' || typeof scores.plannedMetrics === 'number') fields.push(`Scored metrics: ${value(scores.scoredMetrics)} / ${value(scores.plannedMetrics)}`);
 if (typeof scores.effortRating === 'number') fields.push(`Felt effort: ${value(scores.effortRating)} / 5`);
 return fields.join(' · ');
}
