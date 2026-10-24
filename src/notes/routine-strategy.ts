import type { TrainingPlan, Session } from '../model/types';
import { exerciseTracking } from '../model/exercise-tracking';
import { goalNoteLink } from './goal-files';
import { goalGarminTypes } from './goal-sources';
import { noteLink } from './plan';

const cell = (value: string): string => value.replaceAll('|','&#124;').replaceAll('<','&lt;').replaceAll('>','&gt;').replace(/[\r\n]+/g,'<br>');
export function routineTargetLinks(name: string, plan: TrainingPlan, folder: string): string[] {
 const id = name === 'Skills A' ? 'A' : name === 'Skills B' ? 'B' : name;
 const parts = (plan.parts ?? []).filter(part => part.id.toLowerCase() === id.toLowerCase());
 const goalIds = new Set(parts.flatMap(part => part.goalIds));
 const type = name === 'Swimming' ? 'swimming' : name === 'Running' ? 'running' : '';
 const goals = (plan.goals ?? []).filter(goal => goalIds.has(goal.id) || (type && goalGarminTypes(goal).includes(type)));
 return goals.map(goal => goalNoteLink(goal, folder));
}

/** Explanations and targets stay tied to the imported workbook, never inferred achievements. */
export function routineStrategyMarkdown(name: string, plan: TrainingPlan, folder: string, sessions: Session[]): string {
 const id = name === 'Skills A' ? 'A' : name === 'Skills B' ? 'B' : name;
 const parts = (plan.parts ?? []).filter(part => part.id.toLowerCase() === id.toLowerCase());
 const type = name === 'Swimming' ? 'swimming' : name === 'Running' ? 'running' : '';
 const sections: string[] = [];
 if (parts.length) sections.push(`## Routine\n\n${parts.map(part=>cell(part.prescription)).join('\n\n')}`);
 if (name === 'Cal-Intervals') {
  if (plan.intervals?.length) sections.push(`## Exercises per round\n\n| Exercise | Work (s) | Rest (s) |\n| --- | --- | --- |\n${plan.intervals.map(item=>`| ${cell(item.exercise)} | ${item.workSeconds} | ${item.restSeconds} |`).join('\n')}`);
 } else if (!type) {
  const exerciseSessions = sessions.filter(session => session.block?.toLowerCase() === id.toLowerCase());
  const names = new Set(exerciseSessions.flatMap(session=>exerciseTracking(session).filter(item=>item.unit!=='kg'&&item.name!=='Cal-Intervals'&&item.group!=='Cal-Intervals').map(item=>item.name)));
  const key = id==='A'||id==='B' ? id : undefined;
  const weeks = key ? (plan.weekPlans??[]).filter(week=>week.blocks?.[key]) : [];
  for (const week of weeks) for (const match of week.blocks![key!]!.matchAll(/(?:^|,|\n)\s*[ABC]\)\s*([^:]+):/g)) names.add(match[1]!.trim());
  if (names.size) {
   const exercises = [...names].map(exercise => ({exercise, category: plan.exerciseArsenal?.find(item => item.exercise === exercise)?.group ?? 'Other'}))
    .sort((a,b)=>a.category.localeCompare(b.category)||a.exercise.localeCompare(b.exercise));
   const categories = [...new Set(exercises.map(item=>item.category))];
   sections.push(`## Exercises\n\n${categories.map(category => {
    const rows=exercises.filter(item=>item.category===category).map(item=>`| ${cell(item.exercise)} |`).join('\n');
    return `### ${cell(category)}\n\n| Exercise |\n| --- |\n${rows}`;
   }).join('\n\n')}`);
  }
  if (weeks.length) {
   const lines=['| Week | Phase | Prescription |','| --- | --- | --- |',...weeks.map(week=>`| ${noteLink(folder,`Weeks/${week.start}`,String(week.week)).replace('|','\\|')} | ${cell(week.phase)} | ${cell(week.blocks![key!]!)} |`)];
   sections.push(`> [!example]- Weekly progression\n${lines.map(line=>`> ${line}`).join('\n')}`);
  }
 }
 return sections.length ? `${sections.join('\n\n')}\n\n` : '';
}
