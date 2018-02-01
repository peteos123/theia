/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Clients might contribute extensions and react on connection status changes.
 */
export const ConnectionStatusContribution = Symbol('ConnectionStatusContribution');
export interface ConnectionStatusContribution {

    /**
     * Emitted when the connection status has changed.
     */
    onStatusChange(event: ConnectionStatusChangeEvent): void;
}

/**
 * Connection status change event.
 */
export interface ConnectionStatusChangeEvent {

    /**
     * The current state of the connection.
     */
    readonly state: ConnectionState,

    /**
     * Optional health, percentage number.
     */
    readonly health?: number
}

/**
 * The connection-status states.
 */
export enum ConnectionState {
    CONNECTED,
    CONNECTION_LOST
}
