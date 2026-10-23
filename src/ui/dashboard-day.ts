import { renderPerformanceChart } from './performance-chart';
import { performanceMarkdown, compactResults } from '../notes/performance';
import { activityDetails } from '../garmin/activities';
import { localDate, scheduleOn } from '../model/calendar';
import type SportsPlugin from '../main';

export function dashboardButton(parent: HTMLElement, label: string, action: () => unknown, cls = ''): HTMLButtonElement {
 const control = parent.createEl('button', { text: label, cls });
 control.addEventListener('click', () => { action(); });
 return control;
}

export function renderDashboardDay(root: HTMLElement, plugin: SportsPlugin, day: Date) {
 const date = localDate(day);
 const section = root.createDiv({ cls: 'sports-day' });
 const isToday = date === localDate(new Date());
 if (isToday) section.addClass('sports-day-today');
 const heading = section.createDiv({ cls: 'sports-dash-day-heading' });
 heading.createEl('h3', { text: day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) });
 if (isToday) heading.createSpan({ text: 'Today', cls: 'sports-dash-badge' });
 const sessions = plugin.data.plan?.sessions.filter(session => session.date === date) ?? [];
 const scheduled = plugin.data.showRegularActivities ? scheduleOn(plugin.data.plan, date) : [];
 const activities = plugin.data.garminCache?.activities.filter(activity => activity.date === date) ?? [];
 if (!activities.length && !sessions.length && !scheduled.length) section.createEl('p', { text: 'No training planned or recorded.', cls: 'sports-dash-empty' });
 for (const activity of activities) {
  const card = section.createDiv({ cls: 'sports-dash-workout sports-dash-garmin' });
  card.createSpan({ text: 'Garmin', cls: 'sports-dash-badge' });
  card.createEl('a', { text: activity.name, href: `https://connect.garmin.com/modern/activity/${activity.id}` });
  card.createEl('p', { text: activityDetails(activity), cls: 'sports-dash-muted' });
 }
 for (const session of sessions) {
  const card = section.createDiv({ cls: 'sports-dash-workout' });
  card.createSpan({ text: session.status.replaceAll('-', ' '), cls: 'sports-dash-badge' });
  card.createEl('strong', { text: session.title });
  const part = plugin.data.plan?.parts.find(part => part.id === session.partId && part.version === session.partVersion);
  card.createEl('p', { text: `${session.sport} · Planned ${session.plannedMinutes ?? '—'} min · Actual ${session.actualMinutes ?? '—'} min` });
  const details = card.createEl('details');
  details.createEl('summary', { text: 'Workout details' });
  if (session.prescription) details.createEl('p', { text: session.prescription });
  if (part) { const details = card.createEl('details'); details.createEl('summary', { text: `${part.title} · v${part.version}` }); details.createEl('p', { text: part.prescription }); }
  if (session.notes) card.createEl('p', { text: session.notes });
  if (compactResults(session)) card.createEl('p', { text: compactResults(session) });
  const graph = /```sports-compare\n([\s\S]*?)\n```/.exec(performanceMarkdown(session));
  if (graph) {
   const comparison = card.createEl('details');
   comparison.createEl('summary', { text: 'Sets and plan/result comparison' });
   renderPerformanceChart(graph[1]!, comparison.createDiv());
  }
 }
 for (const item of scheduled) {
  const card = section.createDiv({ cls: 'sports-dash-workout' });
  card.createSpan({ text: 'Recurring', cls: 'sports-dash-badge' });
  card.createEl('p', { text: `${item.time} ${item.title} · ${item.minutes ?? '—'} min · ${item.recordedBy} · Planned, no manual results` });
  if (item.notes) card.createEl('p', { text: item.notes });
 }
 if (day.getDay() === 0) {
  const review = section.createDiv({ cls: 'sports-dash-review' });
  dashboardButton(review, 'Reflect on the week', () => plugin.openWeekly(day, true));
 }
 return { section, isToday, sessions, scheduled, activities };
}
