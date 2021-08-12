import * as vscode from "vscode";
import { DIAGNOSTIC_CODE, IGNORE_VIOLATION_COMMAND } from "../constants";
import { getViolationFromDiagnostic } from "../diagnostics/diagnostics";
import { IgnoreViolationType } from "../utils/IgnoreViolationType";
import { hasKeys } from "../graphql-api/configuration";

interface ActionData {
  title: string;
  tooltip: string;
}

/**
 * Provide the action within VsCode to ignore a violation.
 *
 * It starts the IGNORE_VIOLATION_COMMAND command either for the project
 * or a file.
 */
export class IgnoreViolationCodeAction implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  public static ACTION_DATA: Map<IgnoreViolationType, ActionData> = new Map([
    [
      IgnoreViolationType.File,
      {
        title: "Ignore violation for this file",
        tooltip: "Ignore this violation for this file on Code Inspector",
      },
    ],
    [
      IgnoreViolationType.Project,
      {
        title: "Ignore violation for this project",
        tooltip: "Ignore this violation for this project on Code Inspector",
      },
    ],
  ]);

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const codeActions: vscode.CodeAction[] = [];

    /**
     * If API keys are not configured, we return nothing.
     */
    if (!hasKeys()) {
      return codeActions;
    }

    context.diagnostics
      .filter((diagnostic) => diagnostic.code === DIAGNOSTIC_CODE)
      .filter((diagnostic) => {
        return (
          getViolationFromDiagnostic(diagnostic) &&
          getViolationFromDiagnostic(diagnostic)?.rule
        );
      })
      .forEach((diagnostic) => {
        codeActions.push(
          this.createCommandCodeAction(IgnoreViolationType.Project, diagnostic)
        );
        codeActions.push(
          this.createCommandCodeAction(IgnoreViolationType.File, diagnostic)
        );
      });
    return codeActions;
  }

  private createCommandCodeAction(
    ignoreViolationType: IgnoreViolationType,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const violation = getViolationFromDiagnostic(diagnostic);
    const action = new vscode.CodeAction(
      IgnoreViolationCodeAction.ACTION_DATA.get(ignoreViolationType)?.title ||
        "unknown",
      vscode.CodeActionKind.QuickFix
    );

    action.command = {
      command: IGNORE_VIOLATION_COMMAND,
      arguments: [ignoreViolationType, violation],
      title:
        IgnoreViolationCodeAction.ACTION_DATA.get(ignoreViolationType)?.title ||
        "unknown title",
      tooltip:
        IgnoreViolationCodeAction.ACTION_DATA.get(ignoreViolationType)
          ?.tooltip || "unknown tooltip",
    };
    action.diagnostics = [diagnostic];
    action.isPreferred = false;
    return action;
  }
}
