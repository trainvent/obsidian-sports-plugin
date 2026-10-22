import type { TrainingPlan } from './types';
export interface DailyScore {
 date: string; expectedPerformance: number | null; actualPerformance: number | null;
 plannedIntensity: number | null; effortRating: number | null; ratedSessions: number; sessions: number;
 scoredMetrics: number | null; plannedMetrics: number | null;
}
export function median(values: (number | null | undefined)[]): number | null {
 const sorted = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)).sort((a, b) => a - b);
 if (!sorted.length) return null;
 const middle = Math.floor(sorted.length / 2);
 return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}
/** Each session supplies workbook-calculated scores. Never turn missing sessions into zeros. */
export function dailyScores(plan: TrainingPlan | null): DailyScore[] {
 const dates = [...new Set((plan?.sessions ?? []).map(session => session.date))].sort();
 return dates.map(date => {
  const scores = plan!.sessions.filter(session => session.date === date).map(session => session.scores);
  const sum = (key: 'scoredMetrics' | 'plannedMetrics'): number | null => {
   const values = scores.map(score => score?.[key]);
   return values.every(value => typeof value === 'number') ? values.reduce<number>((total, value) => total + value, 0) : null;
  };
  return { date, expectedPerformance: median(scores.map(score => score?.expectedPerformance)), actualPerformance: median(scores.map(score => score?.actualPerformance)), plannedIntensity: median(scores.map(score => score?.plannedIntensity)), effortRating: median(scores.map(score => score?.effortRating)), ratedSessions: scores.filter(score => typeof score?.effortRating === 'number').length, sessions: scores.length, scoredMetrics: sum('scoredMetrics'), plannedMetrics: sum('plannedMetrics') };
 });
}
