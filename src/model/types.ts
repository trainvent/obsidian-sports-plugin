export interface Goal { id: string; title: string; benchmark: string }
export interface TrainingPart { id: string; version: string; title: string; prescription: string; goalIds: string[] }
export interface Session {
 id: string; date: string; sport: string; title: string;
 partId: string; partVersion: string; plannedMinutes: number | null;
 block?: string; prescription?: string; checks?: Record<string, boolean | null>; results?: Record<string, string>;
 actualMinutes: number | null; result: string; status: string; notes: string;
}
export interface TrainingPlan {
 id: string; name: string; timezone: string; goals: Goal[];
 parts: TrainingPart[]; sessions: Session[]; importedAt: string;
}
export interface RecurringEvent { id: string; title: string; sport: string; weekday: number; time: string; minutes: number; startDate: string; endDate: string }
export interface SportsData {
 workbookPath: string; strategySheet: string; trackingSheet: string; notesFolder: string; syncMinutes: number;
 syncOnStartup: boolean; plan: TrainingPlan | null; events: RecurringEvent[];
 generatedBlocks: Record<string, string>; lastError: string;
}
export const DEFAULT_DATA: SportsData = {
 workbookPath: '', strategySheet: 'Strategy', trackingSheet: 'Training log', notesFolder: 'Sports', syncMinutes: 0, syncOnStartup: false,
 plan: null, events: [], generatedBlocks: {}, lastError: '',
};
