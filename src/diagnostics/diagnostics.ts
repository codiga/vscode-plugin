import * as vscode from "vscode";
import { getLanguageForFile } from "../utils/fileUtils";
import {
  DIAGNOSTIC_CODE,
  ENGINE_ESLINT_APOLLO_CLIENT_ENABLED,
  ENGINE_ESLINT_AWS_SDK_ENABLED,
  ENGINE_ESLINT_GRAPHQL_ENABLED,
  ENGINE_ESLINT_REACT_ENABLED,
  ENGINE_ESLINT_TYPEORM_ENABLED,
  NUMBER_OF_CHARACTERS_TO_TRIGGER_ANALYSIS,
} from "../constants";
import { FileAnalysisViolation, Language } from "../graphql-api/types";
import { getViolations } from "../graphql-api/file-analysis";

/**
 * The information we gather to detect any document change.
 */
interface DocumentInformation {
  lines: number;
  characters: number;
  violations: FileAnalysisViolation[];
}

/**
 * Internal variables we keep to track the violations
 * and diagnostics information.
 */

// Keep track of the last information for a given URI
const DOCUMENTS_INFORMATIONS: Record<string, DocumentInformation> = {};

// Direct mapping of a diagnostic to a violation so that we can find a violation when generating quick actions.
const DIAGNOSTICS_TO_VIOLATIONS: Map<vscode.Diagnostic, FileAnalysisViolation> =
  new Map();

/**
 * Just a function to get access to DIAGNOSTICS_TO_VIOLATIONS outside this module.
 * @param diag
 * @returns
 */
export function getViolationFromDiagnostic(
  diag: vscode.Diagnostic
): FileAnalysisViolation | undefined {
  return DIAGNOSTICS_TO_VIOLATIONS.get(diag);
}

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

  if (characterDifference >= NUMBER_OF_CHARACTERS_TO_TRIGGER_ANALYSIS) {
    return true;
  }
  if (DOCUMENTS_INFORMATIONS[docUriString].lines !== doc.lineCount) {
    return true;
  }
  return false;
}

function getExistingViolations(
  doc: vscode.TextDocument
): FileAnalysisViolation[] {
  const uri = doc.uri;
  const docUriString: string = uri.toString();
  if (DOCUMENTS_INFORMATIONS[docUriString]) {
    return DOCUMENTS_INFORMATIONS[docUriString].violations;
  }
  return new Array<FileAnalysisViolation>();
}

/**
 * Update the document information once updated. Register
 * the number of lines and characters in the document.
 * @param doc - the document under analysis
 */
function updateDocumentationInformation(
  doc: vscode.TextDocument,
  violations: FileAnalysisViolation[]
): void {
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
 * Get the list of parameters based on the packages
 * included in the project.
 * @param doc
 * @returns
 */
export async function getParametersForDocument(
  doc: vscode.TextDocument,
  language: Language
): Promise<string[]> {
  const result: string[] = [];

  if (language === Language.Javascript || language === Language.Typescript) {
    try {
      if (!vscode.workspace.workspaceFolders) {
        return result;
      }

      const workspaceFolders = vscode.workspace.workspaceFolders!;

      for (const folder of workspaceFolders) {
        const path = vscode.Uri.joinPath(folder.uri, "package.json");
        const packageFile = await vscode.workspace.fs.readFile(path);
        const packageFileContent = packageFile.toString();
        const packageContent = JSON.parse(packageFileContent);

        /**
         * If there is nothing in the package content, just return.
         */
        if (!packageContent || !packageContent.dependencies) {
          continue;
        }

        if (packageContent.dependencies.react) {
          result.push(ENGINE_ESLINT_REACT_ENABLED);
        }
        if (packageContent.dependencies.graphql) {
          result.push(ENGINE_ESLINT_GRAPHQL_ENABLED);
        }
        if (packageContent.dependencies.typeorm) {
          result.push(ENGINE_ESLINT_TYPEORM_ENABLED);
        }
        if (packageContent.dependencies["apollo-client"]) {
          result.push(ENGINE_ESLINT_APOLLO_CLIENT_ENABLED);
        }
        if (packageContent.dependencies["aws-sdk"]) {
          result.push(ENGINE_ESLINT_AWS_SDK_ENABLED);
        }
      }
    } catch (error: unknown) {
      return result;
    }
  }
  return result;
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
  const language: Language = getLanguageForFile(relativePath);

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

  if (!shouldUpdateDocument(doc)) {
    console.debug("doc should NOT be updated");
    return;
  }

  // clear the initial map of diagnostics
  DIAGNOSTICS_TO_VIOLATIONS.clear();

  // Get the list of parameters (library used, etc) for the analysis
  // based on the library being used.
  const parameters = await getParametersForDocument(doc, language);
  const violations = await getViolations(
    relativePath,
    doc.getText(),
    language.toString(),
    parameters
  );

  console.debug(
    `analysis for file ${relativePath}, got ${violations.length} violations`
  );

  violations.forEach((violation) => {
    const diag = createDiagnostic(doc, violation);
    newDiagnostics.push(diag);
    DIAGNOSTICS_TO_VIOLATIONS.set(diag, violation);
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

  const lineOfCode = textLine.text;
  let numberOfLeadingSpaces = 0;

  /**
   * Find the number of leading space so that we do not annotate
   * spaces.
   */
  for (let i = 0; i < lineOfCode.length; i++) {
    if (lineOfCode.charAt(i) !== " ") {
      break;
    }
    numberOfLeadingSpaces = numberOfLeadingSpaces + 1;
  }

  // create range that represents, where in the document the word is
  const startPosition = new vscode.Position(
    textLine.range.start.line,
    textLine.range.start.character + numberOfLeadingSpaces
  );
  const range = new vscode.Range(startPosition, textLine.range.end);

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
