/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { MenuModelRegistry, CommandRegistry, Command, SelectionService } from "@theia/core";
import { AbstractViewContribution } from "@theia/core/lib/browser";
import { injectable, inject } from "inversify";
import { NAVIGATOR_CONTEXT_MENU } from "@theia/navigator/lib/browser/navigator-menu";
import { UriCommandHandler, FileSystemCommandHandler } from "@theia/workspace/lib/browser/workspace-commands";
import { GitHistoryWidget } from './git-history-widget';
import { Git } from "../../common";

export namespace GitHistoryCommands {
    export const OPEN_FILE_HISTORY: Command = {
        id: 'git-history:open-file-history',
        label: 'Open file history'
    };
}

export const GIT_HISTORY = 'git-history';

@injectable()
export class GitHistoryContribution extends AbstractViewContribution<GitHistoryWidget> {

    constructor(
        @inject(SelectionService) protected readonly selectionService: SelectionService) {
        super({
            widgetId: GIT_HISTORY,
            widgetName: 'Git history',
            defaultWidgetOptions: {
                area: 'left',
                rank: 400
            }
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction([...NAVIGATOR_CONTEXT_MENU, '5_history'], {
            commandId: GitHistoryCommands.OPEN_FILE_HISTORY.id
        });

        super.registerMenus(menus);
    }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(GitHistoryCommands.OPEN_FILE_HISTORY, this.newFileHandler({
            execute: async uri => {
                const options: Git.Options.Log = {
                    uri: uri.toString()
                };
                this.showWidget(options);
            }
        }));
    }

    async showWidget(options: Git.Options.Diff) {
        const widget = await this.widget;
        await widget.setContent(options);
        this.openView({
            toggle: true,
            activate: true
        });
    }

    protected newFileHandler(handler: UriCommandHandler): FileSystemCommandHandler {
        return new FileSystemCommandHandler(this.selectionService, handler);
    }
}
