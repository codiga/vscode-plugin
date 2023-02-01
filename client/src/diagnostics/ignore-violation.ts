import * as vscode from "vscode";
import { DIAGNOSTIC_SOURCE, IGNORE_VIOLATION_COMMAND } from "../constants";

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
          diagnostic.source?.toLocaleString().indexOf(DIAGNOSTIC_SOURCE) != -1
      )
      .map((diagnostic) => this.createCommandCodeAction(diagnostic, document));
  }

  private createCommandCodeAction(
    diagnostic: vscode.Diagnostic,
    document: vscode.TextDocument
  ): vscode.CodeAction {
    const ruleCode = diagnostic.code as {
      value: string | number;
      target: vscode.Uri;
    };
    const ruleIdentifier = ruleCode.value;
    const range = diagnostic.range;

    const title = ruleIdentifier
      ? `Ignore rule ${ruleIdentifier}`
      : "Ignore rule";
    const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
    action.command = {
      command: IGNORE_VIOLATION_COMMAND,
      arguments: [document, range, ruleIdentifier],
      title: title,
      tooltip: "This will add a comment to ignore this violation",
    };
    action.diagnostics = [diagnostic];
    action.isPreferred = false;
    return action;
  }
}

export const ignoreViolation = async (
  document: vscode.TextDocument,
  range: vscode.Range,
  ruleIdentifier: string
): Promise<void> => {
  const insertPosition = new vscode.Position(range.start.line, 0);
  const language = getLanguageForDocument(document);
  const commentSymbol = getCommentSign(language);
  const indentation = getCurrentIndentationForDocument(
    document,
    new vscode.Position(range.start.line, range.start.character)
  );

  const spaces = indentation || 0;

  /**
   * TODO: when Rosie supports it, add the specific
   * rule to filter.
   */
  const edit = vscode.TextEdit.insert(
    insertPosition,
    `${" ".repeat(spaces)}${commentSymbol} codiga-disable\n`
  );
  const workspaceEdit = new vscode.WorkspaceEdit();
  workspaceEdit.set(document.uri, [edit]);
  await vscode.workspace.applyEdit(workspaceEdit);
};
