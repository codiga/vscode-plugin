import * as vscode from "vscode";
import { DIAGNOSTIC_CODE, LEARN_MORE_COMMAND } from "../constants";
import { getRuleResponseFromDiagnostic } from "../diagnostics/diagnostics";
import { RuleReponse } from "../rosie/rosieTypes";

/**
 * Provide the action to see a rule on the codiga hub
 */
export class SeeRule implements vscode.CodeActionProvider {
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
          getRuleResponseFromDiagnostic(diagnostic) &&
          getRuleResponseFromDiagnostic(diagnostic)?.identifier
      )
      .map((diagnostic) =>
        this.createCommandCodeAction(
          diagnostic,
          getRuleResponseFromDiagnostic(diagnostic)
        )
      );
  }

  private createCommandCodeAction(
    diagnostic: vscode.Diagnostic,
    ruleResponse: RuleReponse | undefined
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      "Learn more...",
      vscode.CodeActionKind.QuickFix
    );
    const url = `https://app.codiga.io/hub/ruleset/${ruleResponse?.identifier}`;
    action.command = {
      command: LEARN_MORE_COMMAND,
      arguments: [url],
      title: "Learn more",
      tooltip:
        "This will open your browser with documentation on this violation.",
    };
    action.diagnostics = [diagnostic];
    action.isPreferred = false;
    return action;
  }
}
