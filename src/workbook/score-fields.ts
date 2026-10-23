export const SCORE_COLUMNS = ['Planned intensity', 'Effort rating', 'Expected RPE', 'Actual RPE', 'Expected effort', 'Actual effort', 'Expected performance', 'Actual performance', 'Performance', 'Scored metrics', 'Planned metrics'] as const;
export interface SessionScores {
 plannedIntensity: number | null; effortRating: number | null;
 expectedRpe: number | null; actualRpe: number | null;
 expectedEffort: number | null; actualEffort: number | null;
 expectedPerformance: number | null; actualPerformance: number | null;
 scoredMetrics: number | null; plannedMetrics: number | null;
}
export function scoreFields(entry: Record<string, string>, context: string): SessionScores | undefined {
 if (!SCORE_COLUMNS.some(name => entry[name])) return undefined;
 const value = (name: typeof SCORE_COLUMNS[number]): number | null => {
  if (!entry[name]) return null;
  const number = Number(entry[name]);
  if (name === 'Planned intensity' && (!Number.isFinite(number) || number < 0 || number > 10)) throw new Error(`${context}: ${name} must be a number from 0 to 10, or blank.`);
  if (name === 'Effort rating' && (!Number.isInteger(number) || number < 1 || number > 5)) throw new Error(`${context}: ${name} must be a whole number from 1 to 5, or blank.`);
  if (!Number.isFinite(number) || number < 0 || (name.endsWith('RPE') && number > 10) || (name.endsWith('metrics') && !Number.isSafeInteger(number))) throw new Error(`${context}: ${name} must be a nonnegative ${name.endsWith('metrics') ? 'whole number' : 'number'}${name.endsWith('RPE') ? ' from 0 to 10' : ''}, or blank.`);
  return number;
 };
 const scores = { plannedIntensity: value('Planned intensity'), effortRating: value('Effort rating'), expectedRpe: value('Expected RPE'), actualRpe: value('Actual RPE'), expectedEffort: value('Expected effort'), actualEffort: value('Actual effort'), expectedPerformance: value('Expected performance'), actualPerformance: value('Performance') ?? value('Actual performance'), scoredMetrics: value('Scored metrics'), plannedMetrics: value('Planned metrics') };
 if (scores.scoredMetrics !== null && scores.plannedMetrics !== null && scores.scoredMetrics > scores.plannedMetrics) throw new Error(`${context}: Scored metrics cannot exceed Planned metrics.`);
 return scores;
}
