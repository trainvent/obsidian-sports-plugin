import type { RecurringEvent, TrainingPlan, WeeklyScheduleItem } from './types';

export function localDate(date: Date): string {
 return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function weekDates(anchor = new Date()): string[] {
 const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 12);
 start.setDate(start.getDate() - (start.getDay() + 6) % 7);
 return Array.from({ length: 7 }, (_, index) => {
  const day = new Date(start); day.setDate(day.getDate() + index); return localDate(day);
 });
}
export function eventsOn(events: RecurringEvent[], date: string): RecurringEvent[] {
 const weekday = new Date(`${date}T12:00:00`).getDay();
 return events.filter(event => event.weekday === weekday && date >= event.startDate && (!event.endDate || date <= event.endDate));
}

export function scheduleOn(plan: TrainingPlan | null, date: string): WeeklyScheduleItem[] {
 const weekday = new Date(`${date}T12:00:00`).getDay();
 return (plan?.weeklySchedule ?? []).filter(item => item.weekday === weekday);
}
