import * as vscode from "vscode";
import { DIAGNOSTIC_CODE, IGNORE_VIOLATION_COMMAND } from "../constants";
import { getViolationFromDiagnostics } from "../diagnostics/diagnostics";
import { Violation } from "../rosie/rosieTypes";
import { getLanguageForDocument } from "../utils/fileUtils";
import { getCurrentIndentationForDocument } from "../utils/indentationUtils";
import { getCommentSign } from "../utils/languageUtils";

/**
 * Provide the action to ignore a rule. It inserts a comment to tell Codiga
 * to ignore this rule
 */
export class IgnoreViolation implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    return context.diagnostics
      .filter(
        (diagnostic) =>
          diagnostic.code?.toLocaleString().indexOf(DIAGNOSTIC_CODE) != -1
      )
      .filter(
        (diagnostic) =>
          getViolationFromDiagnostics(diagnostic) &&
          getViolationFromDiagnostics(diagnostic)?.start
      )
      .map((diagnostic) =>
        this.createCommandCodeAction(
          diagnostic,
          getViolationFromDiagnostics(diagnostic),
          document
        )
      );
  }

  private createCommandCodeAction(
    diagnostic: vscode.Diagnostic,
    violation: Violation | undefined,
    document: vscode.TextDocument
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      "Ignore violation",
      vscode.CodeActionKind.QuickFix
    );
    action.command = {
      command: IGNORE_VIOLATION_COMMAND,
      arguments: [document, violation],
      title: "Ignore Violation",
      tooltip: "This will add a comment to ignore this violation",
    };
    action.diagnostics = [diagnostic];
    action.isPreferred = false;
    return action;
  }
}

export const ignoreViolation = async (
  document: vscode.TextDocument,
  violation: Violation
): Promise<void> => {
  const insertPosition = new vscode.Position(violation.start.line - 1, 0);
  const language = getLanguageForDocument(document);
  const commentSymbol = getCommentSign(language);
  const indentation = getCurrentIndentationForDocument(
    document,
    new vscode.Position(violation.start.line - 1, violation.start.col - 1)
  );

  const spaces = indentation || 0;

  const edit = vscode.TextEdit.insert(
    insertPosition,
    `${" ".repeat(spaces)}${commentSymbol} codiga-disable\n`
  );
  const workspaceEdit = new vscode.WorkspaceEdit();
  workspaceEdit.set(document.uri, [edit]);
  await vscode.workspace.applyEdit(workspaceEdit);
};
