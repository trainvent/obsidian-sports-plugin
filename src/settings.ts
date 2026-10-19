import { App, PluginSettingTab, Setting } from 'obsidian';
import SportsPlugin from './main';

export interface SportsPluginSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: SportsPluginSettings = {
	mySetting: 'default',
};

export class SportsSettingTab extends PluginSettingTab {
	plugin: SportsPlugin;

	constructor(app: App, plugin: SportsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Settings #1')
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder('Enter your secret')
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
