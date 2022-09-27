import * as vscode from "vscode";
import { getBasename, getLanguageForFile } from "../utils/fileUtils";
const fetch = require("node-fetch");
import axios from "axios";

import {
  DIAGNOSTIC_CODE,
  TIME_BEFORE_STARTING_ANALYSIS_MILLISECONDS,
} from "../constants";
import { Language } from "../graphql-api/types";
import { getRulesetsDebug } from "../rosie/rules";
import {
  RosieFix,
  RosieReponse,
  Rule,
  RuleReponse,
  RuleSet,
  Violation,
} from "../rosie/rosieTypes";
import {
  ROSIE_SEVERITY_CRITICAL,
  ROSIE_SEVERITY_WARNING,
} from "../rosie/rosieConstants";

const DIAGNOSTICS_TIMESTAMP: Map<string, number> = new Map();
const FIXES_BY_DOCUMENT: Map<
  vscode.Uri,
  Map<vscode.Range, RosieFix[]>
> = new Map();
const ROSIE_ENDPOINT = "https://analysis.codiga.io/analyze";

export const getFixesForDocument = (
  documentUri: vscode.Uri,
  range: vscode.Range
): undefined | RosieFix[] => {
  const fixesForDocument = FIXES_BY_DOCUMENT.get(documentUri);
  if (fixesForDocument) {
    for (const k of fixesForDocument.keys()) {
      if (k.isEqual(range)) {
        return fixesForDocument.get(k);
      }
    }
    return fixesForDocument.get(range);
  }
  return undefined;
};

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

export const getRulesFromRulesets = (ruleSets: RuleSet[]): Rule[] => {
  const result: Rule[] = [];

  for (const ruleset of ruleSets) {
    for (const rule of ruleset.rules) {
      result.push(rule);
    }
  }

  return result;
};

export const getViolations = async (
  document: vscode.TextDocument,
  rules: Rule[]
): Promise<RuleReponse[]> => {
  const result: Violation[] = [];
  const relativePath = vscode.workspace.asRelativePath(document.uri.path);
  const codeBuffer = Buffer.from(document.getText());
  let codeBase64 = codeBuffer.toString("base64");
  const data = {
    filename: relativePath,
    fileEncoding: "utf-8",
    language: "python",
    codeBase64: codeBase64,
    rules: rules,
    logOutput: true,
  };

  const response = await axios.post<RosieReponse>(ROSIE_ENDPOINT, data, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response) {
    console.debug("no response");
    return [];
  }

  const responses = response.data.ruleResponses as RuleReponse[];

  return responses;

  // for (const ruleResponse of responses) {
  //   if (ruleResponse.violations) {
  //     for (const violation of ruleResponse.violations) {
  //       result.push(violation);
  //     }
  //   }
  // }
  // return result;
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
  const newDiagnostics: vscode.Diagnostic[] = [];
  const language: Language = getLanguageForFile(relativePath);

  if (language === Language.Unknown) {
    console.debug("unknown language, skipping");
    return;
  }

  if (language !== Language.Python) {
    console.debug("langauge not supported");
    return;
  }

  const shouldDoAnalysis = await shouldProceed(doc);
  if (!shouldDoAnalysis) {
    return;
  }

  resetFixesForDocument(doc.uri);

  if (doc.getText().length === 0) {
    console.debug("empty code");
    return;
  }

  if (doc.lineCount < 2) {
    console.debug("not enough lines");
    return;
  }

  const rulesetDebug = await getRulesetsDebug(doc, language);

  if (rulesetDebug) {
    const rules = getRulesFromRulesets(rulesetDebug);

    const ruleReponses = await getViolations(doc, rules);
    const diags: vscode.Diagnostic[] = [];

    ruleReponses.forEach((ruleReponse) => {
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
        diag.code = DIAGNOSTIC_CODE + "/" + ruleReponse.identifier;

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
    console.log("no ruleset for debug");
  }
}

export function subscribeToDocumentChanges(
  context: vscode.ExtensionContext,
  diagnostics: vscode.DiagnosticCollection
): void {
  if (vscode.window.activeTextEditor) {
    refreshDiagnostics(vscode.window.activeTextEditor.document, diagnostics);
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        refreshDiagnostics(editor.document, diagnostics);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      console.debug("new analysis because of document changes");

      refreshDiagnostics(e.document, diagnostics);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) =>
      diagnostics.delete(doc.uri)
    )
  );
}
