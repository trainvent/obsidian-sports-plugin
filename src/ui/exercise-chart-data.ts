export interface ExercisePoint {
 label: string; unit: string; axis: 'count' | 'time' | 'other';
 plan: number | null; result: number | null;
}

export function exerciseChartData(source: string): ExercisePoint[] | null {
 const lines = source.trim().split('\n');
 if (lines.shift() !== 'Exercise\tPlan\tResult') return null;
 const points: ExercisePoint[] = [];
 for (const line of lines.filter(Boolean)) {
  const row = line.split('\t');
  if (row.length !== 3 || !row[0]?.trim() || row.slice(1).some(value => value !== '—' && (!/^\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value))))) return null;
  const unitMatch = /\(([^()]+)\)(?: · .+)?$/.exec(row[0]);
  const unit = unitMatch?.[1]?.trim().toLowerCase() || 'count';
  const axis = /^(?:seconds?|secs?|s|minutes?|mins?)$/.test(unit) ? 'time' : /^(?:reps?(?:\/leg)?|rounds?|count)$/.test(unit) ? 'count' : 'other';
  const factor = axis === 'time' && /^min/.test(unit) ? 60 : 1;
  const value = (input: string): number | null => input === '—' ? null : Number(input) * factor;
  const plan = value(row[1]!), result = value(row[2]!);
  if ([plan, result].some(n => n !== null && !Number.isFinite(n))) return null;
  points.push({ label: row[0], unit, axis, plan, result });
 }
 return points;
}

export function chartCeiling(values: (number | null)[]): number {
 const max = values.reduce<number>((total, value) => Math.max(total, value ?? 0), 1);
 const magnitude = 10 ** Math.floor(Math.log10(max));
 return [1, 2, 5, 10].map(step => step * magnitude).find(value => Number.isFinite(value) && value >= max) ?? max;
}

export function timeChartCeiling(values: (number | null)[]): number {
 const max = values.reduce<number>((total, value) => Math.max(total, value ?? 0), 1);
 return [2, 10, 30, 60, 120, 300, 600, 1800, 3600, 7200].find(value => value >= max) ?? chartCeiling(values);
}

export function timeLabel(seconds: number): string {
 const rounded = Math.round(seconds);
 return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}
