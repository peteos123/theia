/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import { h } from "@phosphor/virtualdom";
import { DiffUris } from '@theia/editor/lib/browser/diff-uris';
import { VirtualRenderer, OpenerService, open, StatefulWidget } from "@theia/core/lib/browser";
import { GIT_RESOURCE_SCHEME } from '../git-resource';
import URI from "@theia/core/lib/common/uri";
import { GIT_HISTORY } from './git-history-contribution';
import { LabelProvider } from '@theia/core/lib/browser/label-provider';
import { GitRepositoryProvider } from '../git-repository-provider';
import { GitFileStatus, Git, CommitWithChanges } from '../../common';
import { GitBaseWidget } from "../git-base-widget";
import { GitFileChangeNode } from "../git-widget";

export interface GitCommitNode {
    authorName: string;
    authorEmail: string;
    authorDate: Date;
    authorDateRelative: string;
    commitMessage: string;
    messageBody?: string;
    fileChangeNodes: GitFileChangeNode[];
    commitSha: string;
    expanded: boolean;
}

@injectable()
export class GitHistoryWidget extends GitBaseWidget implements StatefulWidget {
    protected options: Git.Options.Log;
    protected commits: GitCommitNode[];

    constructor(
        @inject(GitRepositoryProvider) protected readonly repositoryProvider: GitRepositoryProvider,
        @inject(LabelProvider) protected readonly labelProvider: LabelProvider,
        @inject(OpenerService) protected readonly openerService: OpenerService,
        @inject(Git) protected readonly git: Git) {
        super(repositoryProvider, labelProvider);
        this.id = GIT_HISTORY;
        this.title.label = "Git history";

        this.addClass('theia-git');
    }

    async setContent(options: Git.Options.Log) {
        this.options = options;
        const repository = this.repositoryProvider.selectedRepository;
        if (repository) {
            const changes: CommitWithChanges[] = await this.git.log(repository, {
                uri: options.uri
            });
            const commits: GitCommitNode[] = [];
            for (const change of changes) {
                const fileChangeNodes: GitFileChangeNode[] = [];
                for (const fileChange of change.fileChanges) {
                    const fileChangeUri = new URI(fileChange.uri);
                    const [icon, label, description] = await Promise.all([
                        this.labelProvider.getIcon(fileChangeUri),
                        this.labelProvider.getName(fileChangeUri),
                        this.relativePath(fileChangeUri.parent)
                    ]);
                    const caption = this.computeCaption(fileChange);
                    fileChangeNodes.push({
                        ...fileChange, icon, label, description, caption
                    });
                }
                commits.push({
                    authorName: change.author.name,
                    authorDate: change.author.date,
                    authorEmail: change.author.email,
                    authorDateRelative: change.authorDateRelative,
                    commitSha: change.sha,
                    commitMessage: change.summary,
                    fileChangeNodes,
                    expanded: false
                });
            }

            this.commits = commits;
            this.update();
        }
    }

    storeState(): object {
        const { commits, options } = this;
        return {
            commits,
            options
        };
    }

    // tslint:disable-next-line:no-any
    restoreState(oldState: any): void {
        this.commits = oldState['commits'];
        this.options = oldState['options'];
        this.update();
    }

    protected render(): h.Child {
        const commitishBar = this.renderHistoryHeader();
        const commitsContainer = this.renderCommitList();
        return h.div({ className: "git-diff-container" }, commitishBar, commitsContainer);
    }

    protected renderHistoryHeader(): h.Child {
        const elements = [];
        if (this.options.uri) {
            const path = this.relativePath(this.options.uri);
            if (path.length > 0) {
                elements.push(h.div({ className: 'header-row' },
                    h.div({ className: 'theia-header' }, 'path:'),
                    h.div({ className: 'header-value' }, '/' + path)));
            }
        }
        const header = h.div({ className: 'theia-header' }, 'Commits');

        return h.div({ className: "diff-header" }, ...elements, header);
    }

    protected renderCommitList(): h.Child {
        const theList: h.Child[] = [];

        for (const commit of this.commits) {
            const head = this.renderCommit(commit);
            const body = commit.expanded ? this.renderFileChangeList(commit.fileChangeNodes, commit.commitSha) : "";
            theList.push(h.div({ className: "commitListElement" }, head, body));
        }
        const commitList = h.div({ className: "commitList" }, ...theList);
        return h.div({ className: "listContainer" }, commitList);
    }

    protected renderCommit(commit: GitCommitNode): h.Child {
        let expansionToggleIcon = "caret-right";
        if (commit && commit.expanded) {
            expansionToggleIcon = "caret-down";
        }
        const expansionToggle = h.div(
            {
                className: "expansionToggle",
                onclick: event => {
                    commit.expanded = !commit.expanded;
                    this.update();
                }
            },
            h.div({ className: "toggle" },
                h.div({ className: "number" }, commit.fileChangeNodes.length.toString()),
                h.div({ className: "icon fa fa-" + expansionToggleIcon })));
        const label = h.div({ className: "headLabelContainer" },
            h.div(
                {
                    className: "headLabel noWrapInfo"
                },
                commit.commitMessage),
            h.div(
                {
                    className: "commitTime noWrapInfo"
                },
                commit.authorDateRelative + ' by ' + commit.authorName
            )
        );
        const content = h.div({ className: "headContent" }, VirtualRenderer.flatten([label, expansionToggle]));
        return h.div({
            className: "containerHead"
        }, content);
    }

    protected renderFileChangeList(fileChanges: GitFileChangeNode[], commitSha: string, toCommitSha?: string): h.Child {
        const files: h.Child[] = [];

        for (const fileChange of fileChanges) {
            const fileChangeElement: h.Child = this.renderGitItem(fileChange, commitSha, toCommitSha);
            files.push(fileChangeElement);
        }
        const header = h.div({ className: 'theia-header' }, 'Files changed');
        const commitFiles = h.div({ className: "commitFileList" }, header, ...files);
        return h.div({ className: "commitBody" }, commitFiles);
    }

    protected renderGitItem(change: GitFileChangeNode, commitSha: string, fromCommitSha?: string): h.Child {
        const iconSpan = h.span({ className: change.icon + ' file-icon' });
        const nameSpan = h.span({ className: 'name' }, change.label + ' ');
        const pathSpan = h.span({ className: 'path' }, change.description);
        const elements = [];
        elements.push(h.div({
            title: change.caption,
            className: 'noWrapInfo',
            ondblclick: () => {
                const uri: URI = new URI(change.uri);

                let fromURI = uri;
                if (change.oldUri) { // set on renamed and copied
                    fromURI = new URI(change.oldUri);
                }
                if (fromCommitSha !== undefined) {
                    if (typeof fromCommitSha !== 'number') {
                        fromURI = fromURI.withScheme(GIT_RESOURCE_SCHEME).withQuery(fromCommitSha);
                    } else {
                        fromURI = fromURI.withScheme(GIT_RESOURCE_SCHEME).withQuery(commitSha + "~" + fromCommitSha);
                    }
                } else {
                    // default is to compare with previous revision
                    fromURI = fromURI.withScheme(GIT_RESOURCE_SCHEME).withQuery(commitSha + "~1");
                }

                let toURI = uri;
                if (commitSha) {
                    toURI = toURI.withScheme(GIT_RESOURCE_SCHEME).withQuery(commitSha);
                }

                let uriToOpen = uri;
                if (change.status === GitFileStatus.Deleted) {
                    uriToOpen = fromURI;
                } else if (change.status === GitFileStatus.New) {
                    uriToOpen = toURI;
                } else {
                    uriToOpen = DiffUris.encode(fromURI, toURI, uri.displayName);
                }
                open(this.openerService, uriToOpen).catch(e => {
                    console.error(e);
                });
            }
        }, iconSpan, nameSpan, pathSpan));
        if (change.extraIconClassName) {
            elements.push(h.div({
                title: change.caption,
                className: change.extraIconClassName
            }));
        }
        elements.push(h.div({
            title: change.caption,
            className: 'status staged ' + GitFileStatus[change.status].toLowerCase()
        }, this.getStatusCaption(change.status, true).charAt(0)));
        return h.div({ className: 'gitItem noselect' }, ...elements);
    }
}
