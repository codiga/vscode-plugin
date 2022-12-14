import * as vscode from "vscode";
import { getLanguageForDocument, getLanguageForFile } from "../utils/fileUtils";
import axios from "axios";

import {
  DIAGNOSTIC_SOURCE,
  TIME_BEFORE_STARTING_ANALYSIS_MILLISECONDS,
} from "../constants";
import { Language } from "../graphql-api/types";
import { getRulesDebug } from "../rosie/debug";
import { RosieFix, RosieReponse, Rule, RuleReponse } from "../rosie/rosieTypes";
import {
  GRAPHQL_LANGUAGE_TO_ROSIE_LANGUAGE,
  ROSIE_ENDPOINT_PROD,
  ROSIE_SEVERITY_CRITICAL,
  ROSIE_SEVERITY_WARNING,
} from "../rosie/rosieConstants";
import { getRosieLanguage } from "../rosie/rosieLanguage";
import { getRulesFromCache } from "../rosie/rosieCache";

const DIAGNOSTICS_TIMESTAMP: Map<string, number> = new Map();
const FIXES_BY_DOCUMENT: Map<
  vscode.Uri,
  Map<vscode.Range, RosieFix[]>
> = new Map();

/**
 * This function is a helper for the quick fixes. It retrieves the quickfix for a
 * violation. We register the list of fixes when we analyze. Then, when the user
 * hover a quick fix, we get the list of quick fixes using this function.
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
    for (const k of fixesForDocument.keys()) {
      if (k.contains(range)) {
        fixesForDocument.get(k)?.forEach((f) => result.push(f));
      }
    }
  }
  return result;
};

/**
 * Register a fix for a document and a range. When we analyze the file,
 * we store all the quick fixes in a Map so that we can retrieve them
 * later when the user hover the fixes.
 * @param documentUri
 * @param range
 * @param fix
 */
const registerFixForDocument = (
  documentUri: vscode.Uri,
  range: vscode.Range,
  fix: RosieFix
): void => {
  if (!FIXES_BY_DOCUMENT.has(documentUri)) {
    FIXES_BY_DOCUMENT.set(documentUri, new Map());
  }
  const fixesForDocument = FIXES_BY_DOCUMENT.get(documentUri);
  if (!fixesForDocument?.has(range)) {
    FIXES_BY_DOCUMENT.get(documentUri)?.set(range, []);
  }

  FIXES_BY_DOCUMENT.get(documentUri)?.get(range)?.push(fix);
};

/**
 * Reset the quick fixes for a document. When we start another analysis, we reset
 * the list of fixes to only have a short list of quick fixes.
 * @param documentUri
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
 * Get the rule responses from Rosie
 * @param document - the document being analyzed
 * @param rules - the list of rules
 * @returns
 */
export const getRuleResponses = async (
  document: vscode.TextDocument,
  rules: Rule[]
): Promise<RuleReponse[]> => {
  const language = getLanguageForDocument(document);
  const rosieLanguage = getRosieLanguage(language);

  if (!rosieLanguage) {
    console.debug("language not supported by Rosie");
    return [];
  }

  const relativePath = vscode.workspace.asRelativePath(document.uri.path);

  // Convert the code to Base64
  const codeBuffer = Buffer.from(document.getText());
  const codeBase64 = codeBuffer.toString("base64");

  // Build the request post data
  const data = {
    filename: relativePath,
    fileEncoding: "utf-8",
    language: rosieLanguage,
    codeBase64: codeBase64,
    rules: rules,
    logOutput: false,
  };

  try {
    // Make the initial request to Rosie
    const response = await axios.post<RosieReponse>(ROSIE_ENDPOINT_PROD, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response || !response.data) {
      console.debug("no response from Rosie");
      return [];
    }

    const responses = response.data.ruleResponses as RuleReponse[];

    return responses;
  } catch (err) {
    console.log("ERROR: ", err);
    return [];
  }
};

const mapRosieSeverityToVsCodeSeverity = (
  rosieSeverity: string
): vscode.DiagnosticSeverity => {
  if (rosieSeverity.toLocaleUpperCase() === ROSIE_SEVERITY_CRITICAL) {
    return vscode.DiagnosticSeverity.Error;
  }
  if (rosieSeverity.toLocaleUpperCase() === ROSIE_SEVERITY_WARNING) {
    return vscode.DiagnosticSeverity.Warning;
  }
  return vscode.DiagnosticSeverity.Information;
};

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
    const ruleReponses = await getRuleResponses(doc, rules);
    const diags: vscode.Diagnostic[] = [];

    ruleReponses.forEach((ruleReponse) => {
      // console.debug(`Reponse took ${ruleReponse.executionTimeMs} ms`);
      ruleReponse.violations.forEach((v) => {
        const range = new vscode.Range(
          new vscode.Position(v.start.line - 1, v.start.col - 1),
          new vscode.Position(v.end.line - 1, v.end.col - 1)
        );

        const diag = new vscode.Diagnostic(
          range,
          v.message,
          mapRosieSeverityToVsCodeSeverity(v.severity)
        );
        diag.source = DIAGNOSTIC_SOURCE;
        diag.code = {
          value: ruleReponse.identifier,
          target: vscode.Uri.parse(
            `https://app.codiga.io/hub/ruleset/${ruleReponse.identifier}`
          ),
        };

        diag.relatedInformation;

        if (v.fixes) {
          v.fixes.forEach((fix) => {
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
