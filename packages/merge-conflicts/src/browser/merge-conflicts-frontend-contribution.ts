/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import { FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { Languages, CodeLensProvider, CodeLensParams, CodeLens, CancellationToken } from '@theia/languages/lib/common';

@injectable()
export class MergeConflictsFrontendContribution implements FrontendApplicationContribution {

    constructor(
        @inject(Languages) protected readonly languages: Languages,
    ) { }

    onStart(app: FrontendApplication): void {
        if (this.languages.registerCodeLensProvider) {
            // awaits https://github.com/TypeFox/monaco-languageclient/pull/49
            // this.languages.registerCodeLensProvider([{ pattern: '.*' }], new MergeConflictsCodeLensProvider());
            // using this as workaround for now
            this.languages.registerCodeLensProvider(['plaintext', 'typescript'], new MergeConflictsCodeLensProvider());
        }
    }

}

class MergeConflictsCodeLensProvider implements CodeLensProvider {
    async provideCodeLenses(params: CodeLensParams, token: CancellationToken): Promise<CodeLens[]> {
        console.log('provideCodeLenses');
        return [];
    }
    async resolveCodeLens?(codeLens: CodeLens, token: CancellationToken): Promise<CodeLens> {
        console.log('resolveCodeLens');
        return codeLens;
    }
}
