import { Modal, Notice, Setting } from 'obsidian';
import type SportsPlugin from '../main';
import { localDate } from '../model/calendar';
export class RecurringModal extends Modal {
 constructor(private plugin: SportsPlugin) { super(plugin.app); }
 onOpen(): void {
  this.titleEl.setText('Add recurring activity');
  let title = ''; let sport = ''; let weekday = 1; let time = '18:00'; let minutes = '60'; let start = localDate(new Date()); let end = '';
  new Setting(this.contentEl).setName('Title').addText(input => input.onChange(value => { title = value; }));
  new Setting(this.contentEl).setName('Sport').addText(input => input.onChange(value => { sport = value; }));
  new Setting(this.contentEl).setName('Day').addDropdown(input => input.addOptions({ '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday', '0': 'Sunday' }).setValue('1').onChange(value => { weekday = Number(value); }));
  new Setting(this.contentEl).setName('Start time').setDesc('Use a 24-hour local time, such as 18:00.').addText(input => input.setValue(time).onChange(value => { time = value; }));
  new Setting(this.contentEl).setName('Duration in minutes').addText(input => input.setValue(minutes).onChange(value => { minutes = value; }));
  new Setting(this.contentEl).setName('Start date').addText(input => input.setValue(start).onChange(value => { start = value; }));
  new Setting(this.contentEl).setName('End date').setDesc('Optional, such as 2026-10-20.').addText(input => input.onChange(value => { end = value; }));
  new Setting(this.contentEl).addButton(button => button.setButtonText('Add activity').setCta().onClick(async () => {
   const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
   if (!title.trim() || !sport.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isFinite(Number(minutes)) || Number(minutes) <= 0 || !validDate(start) || (end && (!validDate(end) || end < start))) { new Notice('Enter a title, sport, valid time, dates, and positive duration.'); return; }
   this.plugin.data.events.push({ id: crypto.randomUUID(), title: title.trim(), sport: sport.trim(), weekday, time, minutes: Number(minutes), startDate: start, endDate: end });
   await this.plugin.save(); this.plugin.refreshViews(); this.close();
  }));
 }
 onClose(): void { this.contentEl.empty(); }
}
