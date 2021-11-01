import * as vscode from "vscode";
import { getLanguageForFile } from "../utils/fileUtils";
import {
  DIAGNOSTIC_CODE,
  ENGINE_ESLINT_APOLLO_CLIENT_ENABLED,
  ENGINE_ESLINT_AWS_SDK_ENABLED,
  ENGINE_ESLINT_CHROME_EXTENSION_ENABLED,
  ENGINE_ESLINT_GRAPHQL_ENABLED,
  ENGINE_ESLINT_JEST_ENABLED,
  ENGINE_ESLINT_REACT_ENABLED,
  ENGINE_ESLINT_TYPEORM_ENABLED,
  TIME_BEFORE_STARTING_ANALYSIS_MILLISECONDS,
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

const DIAGNOSTICS_TIMESTAMP: Map<string, number> = new Map();

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
 * This function is here to check when we should (or not)
 * inspect a document. It checks that there was not another
 * request for inspection within TIME_BEFORE_STARTING_ANALYSIS_MILLISECONDS
 * and if not, trigger an analysis.
 *
 * @param doc - the document we are trying to update
 * @returns - if we should run the analysis or not
 */
async function shouldProceed(doc: vscode.TextDocument): Promise<boolean> {
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

      let workspaceFolders: readonly vscode.WorkspaceFolder[] = [];
      if (vscode.workspace.workspaceFolders) {
        workspaceFolders = vscode.workspace.workspaceFolders;
      }

      for (const folder of workspaceFolders) {
        // Read manifest.json to detect potential Chrome plugin
        try {
          const manifestPath = vscode.Uri.joinPath(folder.uri, "manifest.json");
          const manifestFile = await vscode.workspace.fs.readFile(manifestPath);
          const manifestFileContent = manifestFile.toString();
          const manifestContent = JSON.parse(manifestFileContent);
          if (manifestContent.background && manifestContent.permissions) {
            result.push(ENGINE_ESLINT_CHROME_EXTENSION_ENABLED);
          }
        } catch (err) {
          // noops
        }

        try {
          // Read package.json for nodejs dependencies
          const packageFilePath = vscode.Uri.joinPath(
            folder.uri,
            "package.json"
          );
          const packageFile = await vscode.workspace.fs.readFile(
            packageFilePath
          );
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
          if (packageContent.dependencies.jest) {
            result.push(ENGINE_ESLINT_JEST_ENABLED);
          }
          if (packageContent.dependencies["apollo-client"]) {
            result.push(ENGINE_ESLINT_APOLLO_CLIENT_ENABLED);
          }
          if (packageContent.dependencies["aws-sdk"]) {
            result.push(ENGINE_ESLINT_AWS_SDK_ENABLED);
          }
        } catch (err) {
          // noops
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

  const shouldDoAnalysis = await shouldProceed(doc);
  if (!shouldDoAnalysis) {
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
    // console.debug(
    //   `violation at line ${violation.line}: ${violation.description}`
    // );
    const diag = createDiagnostic(doc, violation);
    if (diag) {
      newDiagnostics.push(diag);
      DIAGNOSTICS_TO_VIOLATIONS.set(diag, violation);
    }
  });

  diagnostics.set(doc.uri, newDiagnostics);
  updateDocumentationInformation(doc, violations);
}

function createDiagnostic(
  doc: vscode.TextDocument,
  violation: FileAnalysisViolation
): vscode.Diagnostic | undefined {
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

  try {
    const diagnostic = new vscode.Diagnostic(
      range,
      violation.description,
      vscode.DiagnosticSeverity.Information
    );
    diagnostic.code = DIAGNOSTIC_CODE;
    return diagnostic;
  } catch {
    console.error("error while annotating code");
  }
  return undefined;
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
