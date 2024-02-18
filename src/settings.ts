import { AbstractInputSuggest, Command, IconName, PluginSettingTab, SearchResultContainer, Setting, prepareFuzzySearch, setIcon, sortSearchResults, setTooltip } from 'obsidian';
import MyPlugin from 'main';


export interface MyPluginSettings {
	blacklist: string[];
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	blacklist: []
};


class CommandSuggest extends AbstractInputSuggest<Command> {
	plugin: MyPlugin;
	inputEl: HTMLInputElement;
	tab: SampleSettingTab;
	next: ((command: Command) => void)[] = [];

	constructor(tab: SampleSettingTab, inputEl: HTMLInputElement) {
		super(tab.plugin.app, inputEl);
		this.inputEl = inputEl;
		this.plugin = tab.plugin;
		this.tab = tab;
	}

	getSuggestions(query: string) {
		const search = prepareFuzzySearch(query);
		const commands = Object.values(this.plugin.app.commands.commands);

		const results: (SearchResultContainer & { command: Command })[] = [];

		for (const command of commands) {
			const match = search(command.name);
			if (match) results.push({ match, command });
		}

		sortSearchResults(results);

		return results.map(({ command }) => command);
	}

	renderSuggestion(command: Command, el: HTMLElement) {
		el.setText(command.name);
	}

	selectSuggestion(command: Command) {
		this.inputEl.blur();
		this.inputEl.value = command.name;
		this.close();
		this.next.forEach((callback) => callback(command));
	}

	then(callback: (command: Command) => void) {
		this.next.push(callback);
		return this;
	}
}


// Inspired by https://stackoverflow.com/a/50851710/13613783
export type KeysOfType<Obj, Type> = NonNullable<{ [k in keyof Obj]: Obj[k] extends Type ? k : never }[keyof Obj]>;

export class SampleSettingTab extends PluginSettingTab {
	constructor(public plugin: MyPlugin) {
		super(plugin.app, plugin);
	}

	get settings(): MyPluginSettings {
		return this.plugin.settings;
	}

	addSetting() {
		return new Setting(this.containerEl);
	}

	addHeading(heading: string, icon?: IconName) {
		return this.addSetting()
			.setName(heading)
			.setHeading()
			.then((setting) => {
				if (icon) {
					const iconEl = createDiv();
					setting.settingEl.prepend(iconEl)
					setIcon(iconEl, icon);
				}
			});
	}

	redisplay() {
		const scrollTop = this.containerEl.scrollTop;
		this.display();
		this.containerEl.scroll({ top: scrollTop });
	}

	display(): void {
		this.containerEl.empty();

		this.settings.blacklist.sort((a, b) => {
			const cmdA = this.app.commands.findCommand(a);
			const cmdB = this.app.commands.findCommand(b);
			if (cmdA === undefined) return cmdB === undefined ? 0 : 1;
			else if (cmdB === undefined) return -1;

			return cmdA.name.localeCompare(cmdB.name);
		});

		this.addSetting()
			.setDesc('List the commands you want to blacklist. These commands will not be shown in the command palette.')
			.addExtraButton((button) => {
				button
					.setIcon('plus')
					.setTooltip('Add command to blacklist')
					.onClick(() => {
						this.settings.blacklist.push('');
						this.redisplay();
					});
			});

		for (let i = 0; i < this.settings.blacklist.length; i++) {
			const id = this.settings.blacklist[i];
			const command = this.app.commands.findCommand(id);
			this.addSetting()
				.addText((text) => {
					if (command) text.setValue(command.name);

					text.inputEl.size = 40;
					new CommandSuggest(this, text.inputEl)
					.then((cmd) => {
						this.settings.blacklist[i] = cmd.id;
						this.redisplay();
					});
				})
				.addExtraButton((button) => {
					button
						.setIcon('trash')
						.setTooltip('Remove command from blacklist')
						.onClick(() => {
							this.settings.blacklist.splice(i, 1);
							this.redisplay();
						});
				});
		}
	}

	hide() {
		this.settings.blacklist = this.settings.blacklist.filter((id) => {
			const command = this.app.commands.findCommand(id);
			return command !== undefined;
		});
		this.plugin.saveSettings();
	}
}
