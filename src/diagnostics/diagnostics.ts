/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

/** To demonstrate code actions associated with Diagnostics problems, this file provides a mock diagnostics entries. */

import * as vscode from "vscode";
import { getLanguageForFile } from "../utils/fileUtils";
import { DIAGNOSTIC_CODE, NUMBER_OF_CHARACTERS_TO_TRIGGER_ANALYSIS } from "../constants";
import { FileAnalysisViolation, Language } from "../graphql/types";
import { getViolations } from "../graphql/file-analysis";


/**
 * The information we gather to detect any document change.
 */
interface DocumentInformation {
  lines: number;
  characters: number;
  violations: FileAnalysisViolation[];
}

const DOCUMENTS_INFORMATIONS: Record<string, DocumentInformation> = {};

/**
 * Indicates if a document should be updated or not based
 * on the number of lines or characters being modified. We do this
 * to avoid hammering the API with too many calls.
 * @param doc - the vscode document under analysis
 * @returns if the document should be updated or not.
 */
function shouldUpdateDocument(doc: vscode.TextDocument): boolean {
  const uri = doc.uri;
  const docUriString: string = uri.toString();
  if (!DOCUMENTS_INFORMATIONS[docUriString]) {
    return true;
  }
  const characterDifference: number = Math.abs(
    DOCUMENTS_INFORMATIONS[docUriString].characters - doc.getText().length
  );

  if (characterDifference > NUMBER_OF_CHARACTERS_TO_TRIGGER_ANALYSIS) {
    return true;
  }
  if (DOCUMENTS_INFORMATIONS[docUriString].lines !== doc.lineCount) {
    return true;
  }
  return false;
}

function getExistingViolations(doc: vscode.TextDocument): FileAnalysisViolation[] {
    const uri = doc.uri;
    const docUriString: string = uri.toString();
    if(DOCUMENTS_INFORMATIONS[docUriString]) {
      return DOCUMENTS_INFORMATIONS[docUriString].violations;
    }
    return new Array<FileAnalysisViolation>();
}

/**
 * Update the document information once updated. Register
 * the number of lines and characters in the document.
 * @param doc - the document under analysis
 */
function updateDocumentationInformation(doc: vscode.TextDocument, violations: FileAnalysisViolation[]): void {
  const uri = doc.uri;
  const docUriString: string = uri.toString();

  const newInfo: DocumentInformation = {
    characters: doc.getText().length,
    lines: doc.lineCount,
    violations: violations,
  };
  DOCUMENTS_INFORMATIONS[docUriString] = newInfo;
}

/**
 * Analyzes the text document for problems.
 * This demo diagnostic problem provider finds all mentions of 'emoji'.
 * @param doc text document to analyze
 * @param diagnostics diagnostic collection
 */
export async function refreshDiagnostics(
  doc: vscode.TextDocument,
  diagnostics: vscode.DiagnosticCollection
): Promise<void> {
  const path = doc.uri.path;
  const relativePath = vscode.workspace.asRelativePath(path);
  const newDiagnostics: vscode.Diagnostic[] = [];
  const language = getLanguageForFile(relativePath);

  if (language === Language.Unknown) {
    console.debug("unknown language, skipping");
    return;
  }

  if (doc.getText().length === 0) {
    console.debug("empty code");
    return;
  }

  if (doc.lineCount < 5) {
    console.debug("not enough lines");
    return;
  }

  if (! shouldUpdateDocument(doc)) {
    console.debug("doc should NOT be updated");
    return;
  }

  const violations = await getViolations(
    relativePath,
    doc.getText(),
    language.toString()
  );

  violations.forEach((violation) => {
    newDiagnostics.push(createDiagnostic(doc, violation));
  });

  diagnostics.set(doc.uri, newDiagnostics);
  updateDocumentationInformation(doc, violations);
}

function createDiagnostic(
  doc: vscode.TextDocument,
  violation: FileAnalysisViolation
): vscode.Diagnostic {

  const violationLine: number = violation.line - 1;

  const textLine: vscode.TextLine = doc.lineAt(violationLine);

  // create range that represents, where in the document the word is
  const range = textLine.range;

  const diagnostic = new vscode.Diagnostic(
    range,
    violation.description,
    vscode.DiagnosticSeverity.Information
  );
  diagnostic.code = DIAGNOSTIC_CODE;
  return diagnostic;
}

export function subscribeToDocumentChanges(
  context: vscode.ExtensionContext,
  diagnostics: vscode.DiagnosticCollection
): void {
  if (vscode.window.activeTextEditor) {
    refreshDiagnostics(
      vscode.window.activeTextEditor.document,
      diagnostics
    );
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        refreshDiagnostics(editor.document, diagnostics);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) =>
      refreshDiagnostics(e.document, diagnostics)
    )
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) =>
      diagnostics.delete(doc.uri)
    )
  );
}
