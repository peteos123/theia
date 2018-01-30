/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable } from "inversify";
import { CallHierarchyServiceImpl } from "@theia/callhierarchy/lib/browser/callhierarchy-service-impl";
import { TYPESCRIPT_LANGUAGE_ID } from "../common";
import { SymbolInformation, Range } from 'vscode-languageserver-types';
import * as utils from '@theia/callhierarchy/lib/browser/utils';

@injectable()
export class TypeScriptCallHierarchyService extends CallHierarchyServiceImpl {

    readonly languageId: string = TYPESCRIPT_LANGUAGE_ID;

    /**
     * Finds the symbol that encloses the definition range of a caller.
     *
     * In the case of typescript, this is the topmost callable symbol that
     * encloses the reference. If two symbols start at the same location,
     * the longer one is better.
     */
    protected getEnclosingCallerSymbol(symbols: SymbolInformation[], reference: Range): SymbolInformation | undefined {
        let bestMatch: SymbolInformation | undefined = undefined;
        let bestRange: Range | undefined = undefined;
        for (const candidate of symbols) {
            const candidateRange = candidate.location.range;
            if (utils.containsRange(candidateRange, reference)) {
                if (!bestMatch || this.isBetterCaller(candidateRange, bestRange!)) {
                    bestMatch = candidate;
                    bestRange = candidateRange;
                }
            }
        }
        return bestMatch;
    }

    protected isBetterCaller(a: Range, b: Range) {
        if (a.start.line < b.start.line) {
            return true;
        }
        if (a.start.line === b.start.line) {
            if (a.start.character < b.start.character) {
                return true;
            }
            if (a.start.character === b.start.character) {
                if (a.end.line > b.end.line) {
                    return true;
                }
                if (a.end.line === b.end.line) {
                    if (a.end.character > b.end.character) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
