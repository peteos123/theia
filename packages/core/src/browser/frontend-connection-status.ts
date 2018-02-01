/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { inject, injectable, named, optional } from 'inversify';
import { ILogger } from '../common/logger';
import { AbstractDialog } from './dialogs';
import { MessageService } from '../common/message-service';
import { ContributionProvider } from '../common/contribution-provider';
import { StatusBar, StatusBarAlignment } from './status-bar/status-bar';
import { FrontendApplicationContribution } from './frontend-application';
import { ConnectionState, ConnectionStatusChangeEvent, ConnectionStatusContribution } from '../common/connection-status';

@injectable()
export class ConnectionStatusOptions {

    static DEFAULT: ConnectionStatusOptions = {
        requestTimeout: 1000,
        retry: 5,
        retryInterval: 2000,
    };

    /**
     * Timeout for the HTTP GET request in milliseconds.
     */
    readonly requestTimeout: number;

    /**
     * Number of accepted timeouts.
     */
    readonly retry: number;

    /**
     * Retry interval in milliseconds.
     */
    readonly retryInterval: number;

}

@injectable()
export class FrontendConnectionStatusService implements FrontendApplicationContribution {

    private connectionState: ConnectionStateMachine;
    // tslint:disable-next-line:no-any
    private timer: any | undefined;

    constructor(
        @inject(ConnectionStatusOptions) @optional() protected readonly options: ConnectionStatusOptions = ConnectionStatusOptions.DEFAULT,
        @inject(ContributionProvider) @named(ConnectionStatusContribution) protected readonly contributionProvider: ContributionProvider<ConnectionStatusContribution>
    ) {
        this.connectionState = new ConnectionStateMachine({ threshold: this.options.retry });
    }

    onStart() {
        this.timer = setInterval(() => {
            const xhr = new XMLHttpRequest();
            xhr.timeout = this.options.requestTimeout;
            xhr.onreadystatechange = event => {
                const { readyState, status } = xhr;
                if (readyState === XMLHttpRequest.DONE) {
                    const success = status === 200;
                    this.connectionState = this.connectionState.next(success);
                    this.contributionProvider.getContributions().forEach(contribution => contribution.onStatusChange(this.connectionState));
                }
            };
            xhr.onerror = () => {
                this.connectionState = this.connectionState.next(false);
                this.contributionProvider.getContributions().forEach(contribution => contribution.onStatusChange(this.connectionState));
            };
            xhr.open('GET', `${window.location.href}alive`);
            try { xhr.send(); } catch { /* NOOP */ }
        }, this.options.retryInterval);
        this.contributionProvider.getContributions().forEach(contribution => contribution.onStatusChange(this.connectionState));
    }

    onStop() {
        if (this.timer !== undefined) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }

}

@injectable()
export class ConnectionStatusStatusBarContribution implements ConnectionStatusContribution {

    constructor( @inject(StatusBar) protected statusBar: StatusBar) {
    }

    onStatusChange(event: ConnectionStatusChangeEvent) {
        this.statusBar.removeElement('connection-status');
        const text = `$(${this.getStatusIcon(event.health)})`;
        const tooltip = event.health ? `Connection health: ${event.health}%` : 'Not connected';
        this.statusBar.setElement('connection-status', {
            alignment: StatusBarAlignment.RIGHT,
            text,
            priority: 0,
            tooltip
        });
    }

    private getStatusIcon(health: number | undefined) {
        if (health === undefined || health === 0) {
            return 'exclamation-circle';
        }
        if (health < 25) {
            return 'frown-o';
        }
        if (health < 50) {
            return 'meh-o';
        }
        return 'smile-o';
    }

}

export class ConnectionStateMachine implements ConnectionStatusChangeEvent {

    static readonly MAX_HISTORY = 100;

    public readonly health: number;

    constructor(
        private readonly props: { readonly threshold: number },
        public readonly state: ConnectionState = ConnectionState.CONNECTED,
        private readonly history: boolean[] = []) {

        if (this.state === ConnectionState.CONNECTION_LOST) {
            this.health = 0;
        } else {
            this.health = this.history.length === 0 ? 100 : Math.round((this.history.filter(success => success).length / this.history.length) * 100);
        }
    }

    next(success: boolean): ConnectionStateMachine {
        const newHistory = this.updateHistory(success);
        // Initial optimism.
        let hasConnection = true;
        if (newHistory.length > this.props.threshold) {
            hasConnection = newHistory.slice(-this.props.threshold).some(s => s);
        }
        // Ideally, we do not switch back to online if we see any `true` items but, let's say, after three consecutive `true`s.
        return new ConnectionStateMachine(this.props, hasConnection ? ConnectionState.CONNECTED : ConnectionState.CONNECTION_LOST, newHistory);
    }

    private updateHistory(success: boolean) {
        const updated = [...this.history, success];
        if (updated.length > ConnectionStateMachine.MAX_HISTORY) {
            updated.shift();
        }
        return updated;
    }

}

@injectable()
export class ApplicationConnectionStatusContribution implements ConnectionStatusContribution {

    private dialog: ConnectionStatusDialog | undefined;
    private state = ConnectionState.CONNECTED;

    constructor(
        @inject(MessageService) protected readonly messageService: MessageService,
        @inject(ILogger) protected readonly logger: ILogger
    ) { }

    onStatusChange(event: ConnectionStatusChangeEvent): void {
        if (this.state !== event.state) {
            this.state = event.state;
            switch (event.state) {
                case ConnectionState.CONNECTION_LOST: {
                    const message = 'Application connection to the Theia backend is lost. Performing retries...';
                    this.logger.error(message);
                    this.messageService.error(message);
                    this.getOrCreateDialog().open();
                    break;
                }
                case ConnectionState.CONNECTED: {
                    const message = 'Application connection to the Theia backend was successfully re-established.';
                    this.logger.info(message);
                    this.messageService.info(message);
                    if (this.dialog !== undefined) {
                        // tslint:disable-next-line:no-any
                        (<any>this.dialog).accept();
                    }
                    break;
                }
            }
        }
    }

    private getOrCreateDialog() {
        if (this.dialog === undefined) {
            this.dialog = new ConnectionStatusDialog();
        }
        return this.dialog;
    }

}

class ConnectionStatusDialog extends AbstractDialog<void> {

    public readonly value: void;

    constructor() {
        super({ title: 'Not connected' });
        this.closeCrossNode.remove();
        const textNode = document.createTextNode('Application connection to the Theia backend is lost. Performing retries...');
        this.contentNode.appendChild(textNode);
    }

    protected onAfterAttach() {
        // NOOP.
        // We need disable the key listener for escape and return so that the dialog cannot be closed by the user.
    }

}
