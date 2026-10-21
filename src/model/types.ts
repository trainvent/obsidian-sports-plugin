export type GoalCategory = 'milestone' | 'maintenance';
export interface Goal { id: string; title: string; benchmark: string; baseline?: string; test?: string; category?: GoalCategory }
export interface TrainingPart { id: string; version: string; title: string; prescription: string; goalIds: string[] }
export interface Session {
 id: string; date: string; sport: string; title: string;
 partId: string; partVersion: string; plannedMinutes: number | null;
 block?: string; prescription?: string; checks?: Record<string, boolean | null>; results?: Record<string, string>;
 actualMinutes: number | null; result: string; status: string; notes: string;
}
export interface WeeklyScheduleItem { id: string; weekday: number; time: string; minutes: number | null; title: string; recordedBy: string; notes: string }
export interface WeekPlan { week: number; start: string; phase: string; focus: string; targets: string; advanceWhen: string; minutes: number | null; blocks?: Record<string, string> }
export interface TrainingPlan {
 id: string; name: string; timezone: string; goals: Goal[];
 exerciseArsenal?: { group: string; exercise: string }[];
 weeklySchedule?: WeeklyScheduleItem[];
 weekPlans?: WeekPlan[];
 parts: TrainingPart[]; sessions: Session[]; importedAt: string;
}
export interface RecurringEvent { id: string; title: string; sport: string; weekday: number; time: string; minutes: number; startDate: string; endDate: string }
export interface SportsData {
 workbookPath: string; strategySheet: string; trackingSheet: string; notesFolder: string; syncMinutes: number;
 showRegularActivities: boolean; syncOnStartup: boolean; plan: TrainingPlan | null; events: RecurringEvent[];
 resetNoteBaselines: boolean; generatedBlocks: Record<string, string>; lastError: string;
}
export const DEFAULT_DATA: SportsData = {
 workbookPath: '~/Sports/Training.xlsx', strategySheet: 'Strategy', trackingSheet: 'Log', notesFolder: 'Sports', syncMinutes: 10, syncOnStartup: true, showRegularActivities: false,
 plan: null, events: [], resetNoteBaselines: false, generatedBlocks: {}, lastError: '',
};
