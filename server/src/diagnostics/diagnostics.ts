import { asRelativePath, getLanguageForFile } from '../utils/fileUtils';
import * as rosieClient from "../rosie/rosieClient";

import {
  DIAGNOSTIC_SOURCE,
  TIME_BEFORE_STARTING_ANALYSIS_MILLISECONDS,
} from "../constants";
import { Language } from "../graphql-api/types";
import { RosieFix } from "../rosie/rosieTypes";
import {
  GRAPHQL_LANGUAGE_TO_ROSIE_LANGUAGE,
  ROSIE_SEVERITY_CRITICAL,
  ROSIE_SEVERITY_ERROR,
  ROSIE_SEVERITY_WARNING,
} from "../rosie/rosieConstants";
import { getRulesFromCache } from "../rosie/rosieCache";
import {URI} from "vscode-uri";
import { Range, Position, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-types';
import { DocumentUri, TextDocument } from 'vscode-languageserver-textdocument';

const DIAGNOSTICS_TIMESTAMP: Map<string, number> = new Map();
const FIXES_BY_DOCUMENT: Map<
  DocumentUri,
  //Uses a string key (the JSON stringified Range) because Map.has() works based on === equality.
  // Having Range as key sometimes resulted in the same range added multiple times with the same
  // fixes in 'registerFixForDocument'.
  Map<string, [Range, RosieFix[]]>
> = new Map();

/**
 * This function is a helper for the quick fixes. It retrieves the quickfix for a
 * violation. We register the list of fixes when we analyze. Then, when the user
 * hovers a quick fix, we get the list of quick fixes using this function.
 *
 * @param documentUri - the URI of the VS Code document
 * @param range - the range we are at in the document
 * @returns - the list of fixes for the given range
 */
export const getFixesForDocument = (
  documentUri: DocumentUri,
  range: Range
): RosieFix[] => {
  const fixesForDocument = FIXES_BY_DOCUMENT.get(documentUri);
  const result: RosieFix[] = [];
  if (fixesForDocument) {
    for (const rangeAndFixes of fixesForDocument.values()) {
      if (contains(rangeAndFixes[0], range)) {
        rangeAndFixes[1]?.forEach((f) => result.push(f));
      }
    }
  }
  return result;
};

/**
 * Validates whether on Range or Position contains another one.
 * This is a replacement for vscode.Range.contains() as vscode-languageserver doesn't have
 * a corresponding logic or method.
 *
 * The implementation is adopted from https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHostTypes.ts.
 *
 * Exported for testing purposes.
 *
 * @param container the Range/Position that should contain 'containee'
 * @param containee the Range/Position that should be contained by 'container'
 */
export const contains = (container: Range | Position, containee: Range | Position): boolean => {
  if (Range.is(container) && Range.is(containee)) {
    return contains(container, containee.start) && contains(container, containee.end);
  }

  if (Range.is(container) && Position.is(containee)) {
    return !(isBefore(Position.create(containee.line, containee.character), container.start) || isBefore(container.end, containee));
  }
  return false;
};

/**
 * Returns whether the 'first' position is located before the 'second' one.
 *
 * @param first a position
 * @param second another position
 */
const isBefore = (first: Position, second: Position): boolean => {
  if (first.line < second.line) {
    return true;
  }
  if (second.line < first.line) {
    return false;
  }
  return first.character < second.character;
};

/**
 * Register a fix for a document and a range. When we analyze the file,
 * we store all the quick fixes in a Map so that we can retrieve them
 * later when the user hover the fixes.
 *
 * It makes sure that no duplicate ranges, and no duplicate fixes are added.
 *
 * Exported for testing purposes.
 *
 * @param documentUri - the URI of the analyzed VS Code document
 * @param range - the range we are at in the document
 * @param fix - the quick fix to register for this document and range
 */
export const registerFixForDocument = (
  documentUri: DocumentUri,
  range: Range,
  fix: RosieFix
): void => {
  // If there is no range or fix saved for this document, save the document
  if (!FIXES_BY_DOCUMENT.has(documentUri)) {
    FIXES_BY_DOCUMENT.set(documentUri, new Map());
  }

  // Query the ranges saved for this document, and if the currently inspected range is not saved,
  // associate an empty list of fixes to it. Otherwise, add the fix for this range.
  const rangeAndFixesForDocument = FIXES_BY_DOCUMENT.get(documentUri);
  const rangeString = JSON.stringify(range);
  if (!rangeAndFixesForDocument?.has(rangeString)) {
    rangeAndFixesForDocument?.set(rangeString, [range, []]);
  }

  if (rangeAndFixesForDocument?.get(rangeString)) {
    // @ts-ignore
    const fixesForRange = rangeAndFixesForDocument?.get(rangeString)[1];
    // If the fix hasn't been added to this range, add it.
    if (fixesForRange?.filter(f => JSON.stringify(f) === JSON.stringify(fix)).length === 0) {
      fixesForRange?.push(fix);
    }
  }
};

/**
 * Reset the quick fixes for a document. When we start another analysis, we reset
 * the list of fixes to only have a short list of quick fixes.
 *
 * @param documentUri - the URI of the VS Code document
 */
const resetFixesForDocument = (documentUri: DocumentUri): void => {
  FIXES_BY_DOCUMENT.set(documentUri, new Map());
};

/**
 * Clears all documents and fixes. Only for testing purposes.
 */
export const resetFixes = (): void => {
  FIXES_BY_DOCUMENT.clear();
};

/**
 * This function is here to check when we should (or not)
 * inspect a document. It checks that there was not another
 * request for inspection within TIME_BEFORE_STARTING_ANALYSIS_MILLISECONDS
 * and if not, trigger an analysis.
 *
 * @param doc - the document we are trying to update
 * @returns - if we should run the analysis or not
 */
const shouldProceed = async (doc: TextDocument): Promise<boolean> => {
  const filename = URI.parse(doc.uri).toString();
  const currentTimestampMs = Date.now();

  /**
   * Set the timestamp in a hashmap so that other thread
   * and analysis request can see it.
   */
  DIAGNOSTICS_TIMESTAMP.set(filename, currentTimestampMs);

  /**
   * Wait for some time. During that time, the user
   * might type another key that trigger other analysis
   * (and will update the hashmap).
   */
  await new Promise((r) =>
    setTimeout(r, TIME_BEFORE_STARTING_ANALYSIS_MILLISECONDS)
  );
  /**
   * Get the actual timeout in the hashmap. It might have
   * changed since we sleep and therefore, take tha latest
   * value.
   */
  const actualTimeoutMs = DIAGNOSTICS_TIMESTAMP.get(filename);

  /**
   * check that the actual latest value is the one we called
   * the function with. If yes, let's go!
   */
  return actualTimeoutMs === currentTimestampMs;
};

/**
 * Maps the argument Rosie severity to the VS Code specific DiagnosticSeverity,
 * to have squiggles with proper severities displayed in the editor.
 *
 * @param rosieSeverity the severity to map
 */
const mapRosieSeverityToVsCodeSeverity = (
  rosieSeverity: string
): DiagnosticSeverity => {
  if (rosieSeverity.toLocaleUpperCase() === ROSIE_SEVERITY_CRITICAL) {
    return DiagnosticSeverity.Error;
  }
  if (rosieSeverity.toLocaleUpperCase() === ROSIE_SEVERITY_ERROR
    || rosieSeverity.toLocaleUpperCase() === ROSIE_SEVERITY_WARNING) {
    return DiagnosticSeverity.Warning;
  }
  return DiagnosticSeverity.Information;
};

/**
 * Analyses the argument document and updates/overwrites the diagnostics for that document.
 * This in turn updates the displayed squiggles in the editor.
 *
 * No update happens when
 * <ul>
 *   <li>The language of the document is unknown.</li>
 *   <li>The language of the document is not supported by Rosie.</li>
 *   <li>The user hasn't finished typing for at least 500ms.</li>
 *   <li>The document is empty.</li>
 *   <li>The document has less than 2 lines.</li>
 *   <li>There is no rule cached for the current document's language.</li>
 * </ul>
 *
 * @param doc - the currently analysed document
 */
export async function refreshDiagnostics(doc: TextDocument): Promise<Diagnostic[]> {
  const relativePath = asRelativePath(doc);
  const language: Language = getLanguageForFile(relativePath);

  if (language === Language.Unknown) {
    return [];
  }
  const supportedLanguages = Array.from(
    GRAPHQL_LANGUAGE_TO_ROSIE_LANGUAGE.keys()
  );
  if (supportedLanguages.indexOf(language) === -1) {
    return [];
  }

  /**
   * We do not proceed yet, we make sure the user is done typing some text
   */
  const shouldDoAnalysis = await shouldProceed(doc);
  if (!shouldDoAnalysis) {
    return [];
  }

  if (doc.getText().length === 0) {
    console.debug("empty code");
    return [];
  }

  if (doc.lineCount < 2) {
    console.debug("not enough lines");
    return [];
  }

  const rules = await getRulesFromCache(doc);

  // Empty the mapping between the analysis and the list of fixes
  resetFixesForDocument(doc.uri);

  if (rules && rules.length > 0) {
    const ruleResponses = await rosieClient.getRuleResponses(doc, rules);
    const diags: Diagnostic[] = [];

    ruleResponses.forEach((ruleResponse) => {
      // console.debug(`Response took ${ruleResponse.executionTimeMs} ms`);
      ruleResponse.violations.forEach((violation) => {
        const range = Range.create(
          Position.create(violation.start.line - 1, violation.start.col - 1),
          Position.create(violation.end.line - 1, violation.end.col - 1)
        );

        const diag = Diagnostic.create(
          range,
          violation.message,
          mapRosieSeverityToVsCodeSeverity(violation.severity),
          ruleResponse.identifier,
          DIAGNOSTIC_SOURCE);

        if (violation.fixes) {
          violation.fixes.forEach((fix) => {
            registerFixForDocument(doc.uri, range, fix);
          });
        }
        diags.push(diag);
      });
    });

    return diags;
  } else {
    console.debug("no ruleset to use");
  }
  return [];
}
