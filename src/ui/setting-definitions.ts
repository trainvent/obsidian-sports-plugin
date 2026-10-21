import type { Setting } from 'obsidian';

// Structural subset of the 1.13 API, allowing compilation against the 1.12 typings
// while keeping runtime compatibility with Obsidian 1.11.4.
export interface SportsSettingRow {
 name: string;
 desc?: string;
 render: (setting: Setting) => void;
}
export interface SportsSettingGroup {
 type: 'group';
 heading: string;
 cls: string;
 items: SportsSettingRow[];
}
