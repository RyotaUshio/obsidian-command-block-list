import { Command } from 'obsidian';

declare module 'obsidian' {
    interface App {
        commands: {
            commands: Record<string, Command>;
            listCommands(): Command[];
            findCommand(id: string): Command | undefined;
        }
    }
}
