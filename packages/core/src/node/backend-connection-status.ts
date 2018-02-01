/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as http from 'http';
import * as express from 'express';
import { inject, injectable } from 'inversify';
import { ILogger } from '../common/logger';
import { BackendApplicationContribution } from './backend-application';

@injectable()
export class BackendConnectionStatusEndpoint implements BackendApplicationContribution {

    @inject(ILogger)
    protected readonly logger: ILogger;

    protected app: express.Application | undefined;

    configure(app: express.Application): void {
        this.app = app;
    }

    onStart(server: http.Server): void {
        const __this = this;
        server.once('listening', () => {
            __this.app!.get('/alive', (request, response) => response.send('OK'));
            const { address, port } = server.address();
            const host = `http://${address}:${port}`;
            this.logger.info(`Started connection status endpoint at ${host} GET /alive.`);
        });
    }

}
