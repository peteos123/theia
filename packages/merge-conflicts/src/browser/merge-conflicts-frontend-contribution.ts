/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import { FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { Languages } from '@theia/languages/lib/common';

@injectable()
export class MergeConflictsFrontendContribution implements FrontendApplicationContribution {

    constructor(
        @inject(Languages) protected languages: Languages,
    ) { }

    onStart(app: FrontendApplication): void {
    }

}
