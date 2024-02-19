import { AbstractInputSuggest, Command, IconName, PluginSettingTab, SearchResultContainer, Setting, prepareFuzzySearch, setIcon, sortSearchResults, setTooltip } from 'obsidian';

import CommandBlockListPlugin from 'main';


export interface CommandBlockListSettings {
	blockList: string[];
}

export const DEFAULT_SETTINGS: CommandBlockListSettings = {
	blockList: []
};


class CommandSuggest extends AbstractInputSuggest<Command> {
	plugin: CommandBlockListPlugin;
	inputEl: HTMLInputElement;
	tab: CommandBlockListSettingTab;
	next: ((command: Command) => void)[] = [];

	constructor(tab: CommandBlockListSettingTab, inputEl: HTMLInputElement) {
		super(tab.plugin.app, inputEl);
		this.inputEl = inputEl;
		this.plugin = tab.plugin;
		this.tab = tab;
	}

	getSuggestions(query: string) {
		const search = prepareFuzzySearch(query);
		const commands = Object.values(this.plugin.app.commands.commands)
			.filter((command) => !this.plugin.settings.blockList.includes(command.id));

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

export class CommandBlockListSettingTab extends PluginSettingTab {
	constructor(public plugin: CommandBlockListPlugin) {
		super(plugin.app, plugin);
	}

	get settings(): CommandBlockListSettings {
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

		this.addSetting()
			.setDesc('List the commands you want to block. These commands will not be shown in the command palette.')
			.addExtraButton((button) => {
				button
					.setIcon('plus')
					.setTooltip('Add command to block list')
					.onClick(() => {
						this.settings.blockList.push('');
						this.redisplay();
					});
			});

		for (let i = 0; i < this.settings.blockList.length; i++) {
			const id = this.settings.blockList[i];
			const command = this.app.commands.findCommand(id);
			this.addSetting()
				.addText((text) => {
					if (command) text.setValue(command.name);

					text.inputEl.size = 40;
					new CommandSuggest(this, text.inputEl)
						.then((cmd) => {
							this.settings.blockList[i] = cmd.id;
							this.redisplay();
						});
				})
				.addExtraButton((button) => {
					button
						.setIcon('trash')
						.setTooltip('Remove command from block list')
						.onClick(() => {
							this.settings.blockList.splice(i, 1);
							this.redisplay();
						});
				});
		}
	}

	hide() {
		this.settings.blockList = this.settings.blockList
			.filter((id) => {
				const command = this.app.commands.findCommand(id);
				return command !== undefined;
			})
			.sort((a, b) => {
				const cmdA = this.app.commands.findCommand(a)!;
				const cmdB = this.app.commands.findCommand(b)!;

				return cmdA.name.localeCompare(cmdB.name);
			});

		this.plugin.saveSettings();
	}
}
