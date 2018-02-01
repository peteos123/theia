/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { ContainerModule } from 'inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { MergeConflictsFrontendContribution } from './merge-conflicts-frontend-contribution';

import '../../src/browser/style/index.css';

export default new ContainerModule(bind => {
    bind(FrontendApplicationContribution).to(MergeConflictsFrontendContribution);
});
