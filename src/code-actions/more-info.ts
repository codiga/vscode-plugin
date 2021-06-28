import * as vscode from "vscode";
import { DIAGNOSTIC_CODE, LEARN_MORE_COMMAND } from "../constants";
import { getViolationFromDiagnostic } from "../diagnostics/diagnostics";

/**
 * Provide the action within VsCode to launch a browser and show
 * the page about the violation. It starts the
 * LEARN_MORE_COMMAND with the URL reported by the violation.
 */
export class MoreInfo implements vscode.CodeActionProvider {
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
      .filter((diagnostic) => diagnostic.code === DIAGNOSTIC_CODE)
      .filter(
        (diagnostic) =>
          getViolationFromDiagnostic(diagnostic) &&
          getViolationFromDiagnostic(diagnostic)?.ruleUrl
      )
      .map((diagnostic) => this.createCommandCodeAction(diagnostic));
  }

  private createCommandCodeAction(
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const violation = getViolationFromDiagnostic(diagnostic);
    const action = new vscode.CodeAction(
      "Learn more...",
      vscode.CodeActionKind.QuickFix
    );
    action.command = {
      command: LEARN_MORE_COMMAND,
      arguments: [violation?.ruleUrl],
      title: "Learn more",
      tooltip:
        "This will open your browser with documentation on this violation.",
    };
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    return action;
  }
}
