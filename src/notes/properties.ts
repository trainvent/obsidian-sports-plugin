import type { TrainingPlan } from '../model/types';
import { weekDates } from '../model/calendar';
import { goalGarminTypes, goalResultColumn } from './goal-sources';
import { routineTargetLinks } from './routine-strategy';

export type NoteProperties = Record<string, string | number | string[] | null>;

/** Only note-level metadata belongs here; session results stay in the body. */
function metadataProperties(id: string, plan: TrainingPlan | null | undefined, folder: string): NoteProperties {
 if (id.startsWith('goal:') && plan) {
  const goal = plan.goals.find(goal => `goal:${encodeURIComponent(goal.id)}` === id);
  if (!goal) return {};
  return { goal_id: goal.id, category: (goal.category ?? 'milestone') === 'milestone' ? 'Aspiration' : 'Maintenance',
   result_column: goalResultColumn(goal, plan.sessions) ?? null, garmin_types: goalGarminTypes(goal) };
 }
 if (id.startsWith('routine:') && plan) {
  const names: Record<string, string> = { 'skills-a': 'Skills A', 'skills-b': 'Skills B', technique: 'Technique', intervals: 'Cal-Intervals', swimming: 'Swimming', running: 'Running' };
  const name = names[id.slice('routine:'.length)];
  if (!name) return {};
  return { targets: routineTargetLinks(name, plan, folder) };
 }
 if (id.startsWith('day:')) {
  const date = id.slice(4);
  const start = weekDates(new Date(`${date}T12:00:00`))[0]!;
  return { date, week: `[[${folder}/Weeks/${start}]]` };
 }
 if (id.startsWith('week:')) {
  const start = id.slice(5);
  const dates = weekDates(new Date(`${start}T12:00:00`));
  const week = plan?.weekPlans?.find(week => week.start === start);
  return { week_start: start, week_end: dates[6]!, program_week: week?.week ?? null, phase: week?.phase ?? null };
 }
 return {};
}


const GROUP_TAGS = ['sports', 'sports/goal', 'sports/planning', 'sports/goals', 'sports/training', 'sports/analytics', 'sports/guide', 'sports/running', 'sports/swimming'];

/** Shared tags group related pages; preserve every tag outside this managed set. */
export function mergeNoteTags(existing: unknown, incoming: string[]): string[] {
 const tags = Array.isArray(existing) ? existing.filter((tag): tag is string => typeof tag === 'string') : typeof existing === 'string' ? existing.split(/[,\s]+/).filter(Boolean) : [];
 return [...new Set([...tags.filter(tag => !GROUP_TAGS.includes(tag.replace(/^#/, ''))), ...incoming])];
}

export function noteProperties(id: string, plan: TrainingPlan | null | undefined, folder: string): NoteProperties {
 const tags: string[] = [];
 if (['plan','strategy','calendar','routines-index'].includes(id) || id.startsWith('routine:') || id.startsWith('week:')) tags.push('sports/planning');
 if (id === 'plan' || id.startsWith('goal:') || id.startsWith('routine:')) tags.push('sports/goals');
 if (id === 'training-log' || id === 'analytics-daily' || id.startsWith('day:') || id.startsWith('week:')) tags.push('sports/training');
 if (['analytics-combined','analytics-graph','analytics-smartwatch'].includes(id)) tags.push('sports/analytics');
 if (id === 'tracking-guide') tags.push('sports/guide');
 if (id === 'analytics') tags.push('sports');
 if (id === 'routine:running') tags.push('sports/running');
 if (id === 'routine:swimming') tags.push('sports/swimming');
 const goal = plan?.goals.find(goal => `goal:${encodeURIComponent(goal.id)}` === id);
 if (goal) for (const type of goalGarminTypes(goal)) if (type === 'running' || type === 'swimming') tags.push(`sports/${type}`);
 return { ...metadataProperties(id, plan, folder), ...(tags.length ? {tags} : {}) };
}
