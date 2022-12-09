import * as vscode from "vscode";
import { getFixesForDocument } from "../diagnostics/diagnostics";
import { addRuleFixRecord } from "../graphql-api/add-rule-fix-record";
import { RosieFix, RosieFixEdit } from "./rosieTypes";

/**
 * Get all the fix edits.
 */
const mapFixEditToTextEdit = (
  fixEdit: RosieFixEdit
): vscode.TextEdit | undefined => {
  if (fixEdit.editType === "add") {
    const insertPosition = new vscode.Position(
      fixEdit.start.line - 1,
      fixEdit.start.col - 1
    );
    return vscode.TextEdit.insert(insertPosition, fixEdit.content || "");
  }
  if (fixEdit.editType === "update") {
    const startPosition = new vscode.Position(
      fixEdit.start.line - 1,
      fixEdit.start.col - 1
    );
    const endPosition = new vscode.Position(
      fixEdit.end.line - 1,
      fixEdit.end.col - 1
    );
    return vscode.TextEdit.replace(
      new vscode.Range(startPosition, endPosition),
      fixEdit.content || ""
    );
  }
  if (fixEdit.editType === "remove") {
    const startPosition = new vscode.Position(
      fixEdit.start.line - 1,
      fixEdit.start.col - 1
    );
    const endPosition = new vscode.Position(
      fixEdit.end.line - 1,
      fixEdit.end.col - 1
    );
    return vscode.TextEdit.delete(new vscode.Range(startPosition, endPosition));
  }
  return undefined;
};

/**
 * Apply a fix from Rosie.
 * @param document
 * @param fix
 */
export const applyFix = async (
  document: vscode.TextDocument,
  fix: RosieFix
): Promise<void> => {
  const edits = fix.edits
    .map((fixEdit) => mapFixEditToTextEdit(fixEdit))
    .filter((p) => p !== undefined) as vscode.TextEdit[];

  const workspaceEdit = new vscode.WorkspaceEdit();
  workspaceEdit.set(document.uri, edits);
  await vscode.workspace.applyEdit(workspaceEdit);
  await addRuleFixRecord();
};

export class RosieFixAction implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.CodeAction[] | undefined {
    const fixes = getFixesForDocument(document.uri, range);

    if (!fixes) {
      return undefined;
    }
    return fixes?.map((f) => this.createFix(document, range, f));
  }

  private createFix(
    document: vscode.TextDocument,
    range: vscode.Range,
    rosieFix: RosieFix
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(
      `Fix: ${rosieFix.description}`,
      vscode.CodeActionKind.QuickFix
    );
    fix.command = {
      arguments: [document, rosieFix],
      command: "codiga.applyFix",
      title: "Apply Fix",
    };
    fix.isPreferred = true;

    return fix;
  }
}
