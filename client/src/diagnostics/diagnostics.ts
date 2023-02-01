import * as vscode from "vscode";
import { getLanguageForFile } from "../utils/fileUtils";
import * as rosieClient from "../rosie/rosieClient";
import { isInTestMode } from "../extension";

import {
  DIAGNOSTIC_SOURCE,
  TIME_BEFORE_STARTING_ANALYSIS_MILLISECONDS,
} from "../constants";
import { Language } from "../graphql-api/types";
import { getRulesDebug } from "../rosie/debug";
import { RosieFix } from "../rosie/rosieTypes";
import {
  GRAPHQL_LANGUAGE_TO_ROSIE_LANGUAGE,
  ROSIE_SEVERITY_CRITICAL,
  ROSIE_SEVERITY_ERROR,
  ROSIE_SEVERITY_WARNING,
} from "../rosie/rosieConstants";
import { getRulesFromCache } from "../rosie/rosieCache";

const DIAGNOSTICS_TIMESTAMP: Map<string, number> = new Map();
const FIXES_BY_DOCUMENT: Map<
  vscode.Uri,
  //Uses a string key (the JSON stringified vscode.Range) because Map.has() works based on === equality.
  // Having vscode.Range as key sometimes resulted in the same range added multiple times with the same
  // fixes in 'registerFixForDocument'.
  Map<string, [vscode.Range, RosieFix[]]>
> = new Map();

/**
 * This function is a helper for the quick fixes. It retrieves the quickfix for a
 * violation. We register the list of fixes when we analyze. Then, when the user
 * hover a quick fix, we get the list of quick fixes using this function.
 *
 * @param documentUri - the URI of the VS Code document
 * @param range - the range we are at in the document
 * @returns - the list of fixes for the given range
 */
export const getFixesForDocument = (
  documentUri: vscode.Uri,
  range: vscode.Range
): RosieFix[] => {
  const fixesForDocument = FIXES_BY_DOCUMENT.get(documentUri);
  const result: RosieFix[] = [];
  if (fixesForDocument) {
    for (const rangeAndFixes of fixesForDocument.values()) {
      if (rangeAndFixes[0].contains(range)) {
        rangeAndFixes[1]?.forEach((f) => result.push(f));
      }
    }
  }
  return result;
};

/**
 * Register a fix for a document and a range. When we analyze the file,
 * we store all the quick fixes in a Map so that we can retrieve them
 * later when the user hover the fixes.
 *
 * It makes sure that no duplicate ranges, and no duplicate fixes are added.
 *
 * @param documentUri - the URI of the analyzed VS Code document
 * @param range - the range we are at in the document
 * @param fix - the quick fix to register for this document and range
 */
const registerFixForDocument = (
  documentUri: vscode.Uri,
  range: vscode.Range,
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
    let fixesForRange = rangeAndFixesForDocument?.get(rangeString)[1];
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
const resetFixesForDocument = (documentUri: vscode.Uri): void => {
  FIXES_BY_DOCUMENT.set(documentUri, new Map());
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
const shouldProceed = async (doc: vscode.TextDocument): Promise<boolean> => {
  const filename = doc.uri.toString();
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
): vscode.DiagnosticSeverity => {
  if (rosieSeverity.toLocaleUpperCase() === ROSIE_SEVERITY_CRITICAL) {
    return vscode.DiagnosticSeverity.Error;
  }
  if (rosieSeverity.toLocaleUpperCase() === ROSIE_SEVERITY_ERROR
    || rosieSeverity.toLocaleUpperCase() === ROSIE_SEVERITY_WARNING) {
    return vscode.DiagnosticSeverity.Warning;
  }
  return vscode.DiagnosticSeverity.Information;
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
 * @param diagnostics - the diagnostics collection in which the diagnostics are stored. See extension.ts#activate().
 */
export async function refreshDiagnostics(
  doc: vscode.TextDocument,
  diagnostics: vscode.DiagnosticCollection
): Promise<void> {
  const path = doc.uri.path;
  const relativePath = vscode.workspace.asRelativePath(path);
  const language: Language = getLanguageForFile(relativePath);

  if (language === Language.Unknown) {
    return;
  }
  const supportedLanguages = Array.from(
    GRAPHQL_LANGUAGE_TO_ROSIE_LANGUAGE.keys()
  );
  if (supportedLanguages.indexOf(language) === -1) {
    return;
  }

  /**
   * We do not proceed yet, we make sure the user is done typing some text
   */
  const shouldDoAnalysis = await shouldProceed(doc);
  if (!shouldDoAnalysis) {
    return;
  }

  if (doc.getText().length === 0) {
    console.debug("empty code");
    return;
  }

  if (doc.lineCount < 2) {
    console.debug("not enough lines");
    return;
  }

  const rules = (await getRulesFromCache(doc)) || (await getRulesDebug(doc));

  // Empty the mapping between the analysis and the list of fixes
  resetFixesForDocument(doc.uri);

  if (rules && rules.length > 0) {
    const ruleResponses = await rosieClient.getRuleResponses(doc, rules, isInTestMode);
    const diags: vscode.Diagnostic[] = [];

    ruleResponses.forEach((ruleResponse) => {
      // console.debug(`Response took ${ruleResponse.executionTimeMs} ms`);
      ruleResponse.violations.forEach((violation) => {
        const range = new vscode.Range(
          new vscode.Position(violation.start.line - 1, violation.start.col - 1),
          new vscode.Position(violation.end.line - 1, violation.end.col - 1)
        );

        const diag = new vscode.Diagnostic(
          range,
          violation.message,
          mapRosieSeverityToVsCodeSeverity(violation.severity)
        );
        diag.source = DIAGNOSTIC_SOURCE;
        diag.code = {
          value: ruleResponse.identifier,
          target: vscode.Uri.parse(
            `https://app.codiga.io/hub/ruleset/${ruleResponse.identifier}`
          ),
        };

        if (violation.fixes) {
          violation.fixes.forEach((fix) => {
            registerFixForDocument(doc.uri, range, fix);
          });
        }
        diags.push(diag);
      });
    });

    diagnostics.set(doc.uri, diags);
  } else {
    console.debug("no ruleset to use");
  }
}

/**
 * Subscribes to document and editor changes. Refreshes the diagnostics upon changes in the active text editor
 * and in text documents, and deletes the diagnostics for a document when the editor of that document gets closed.
 *
 * @param context - the extension context
 * @param diagnostics - the global diagnostics collection
 */
export function subscribeToDocumentChanges(
  context: vscode.ExtensionContext,
  diagnostics: vscode.DiagnosticCollection
): void {
  if (vscode.window.activeTextEditor) {
    // console.debug("refreshing diagnostics because new editor");

    refreshDiagnostics(vscode.window.activeTextEditor.document, diagnostics);
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        // console.debug("refreshing diagnostics because editor changed");

        refreshDiagnostics(editor.document, diagnostics);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      // console.debug("new analysis because of document changes");

      refreshDiagnostics(e.document, diagnostics);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      // console.debug("deleting diagnostics because document closes");

      diagnostics.delete(doc.uri);
    })
  );
}