import { Command, Plugin } from 'obsidian';
import { around } from 'monkey-around';

import { MyPluginSettings, DEFAULT_SETTINGS, SampleSettingTab } from 'settings';


export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new SampleSettingTab(this));

		const blockList = this.settings.blockList;

		this.register(around(this.app.commands.constructor.prototype, {
			listCommands(old) {
				return function (...args: any[]) {
					const commands: Command[] = old.call(this, ...args);
					return commands.filter((command) => !blockList.includes(command.id));
				}
			}
		}));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
