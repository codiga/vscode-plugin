import * as vscode from "vscode";
import {getFixesForDocument} from "../diagnostics/diagnostics";
import {addRuleFixRecord} from "../graphql-api/add-rule-fix-record";
import {RosieFix, RosieFixEdit} from "./rosieTypes";

/**
 * Returns whether either the start line or col of the argument Rosie fix edit is negative.
 */
const hasInvalidStartOffset = (
  fixEdit: RosieFixEdit
): boolean => {
  return fixEdit.start.line - 1 < 0 || fixEdit.start.col - 1 < 0;
};

/**
 * Returns whether either the end line or col of the argument Rosie fix edit is negative.
 */
const hasInvalidEndOffset = (
  fixEdit: RosieFixEdit
): boolean => {
  return fixEdit.end.line - 1 < 0 || fixEdit.end.col - 1 < 0;
};

/**
 * Maps the Rosie specific RosieFixEdit to a VS Code specific vscode.TextEdit,
 * so that it can later be applied in a document.
 *
 * It returns undefined in the following cases:
 * <ul>
 *   <li>when the edit's start line or col is negative</li>
 *   <li>when the edit's end line or col is negative</li>
 *   <li>when the edit's start offset is greater than its end offset</li>
 *   <li>when the edit has an unknown type</li>
 * </ul>
 */
const mapFixEditToTextEdit = (
  fixEdit: RosieFixEdit,
  document: vscode.TextDocument
): vscode.TextEdit | undefined => {
  if (fixEdit.editType === "add") {
    if (hasInvalidStartOffset(fixEdit))
      return undefined;

    const insertPosition = new vscode.Position(
      fixEdit.start.line - 1,
      fixEdit.start.col - 1
    );
    return vscode.TextEdit.insert(insertPosition, fixEdit.content || "");
  }
  if (fixEdit.editType === "update") {
    return validateOffsetsAndCreateTextEdit(fixEdit, document,
      (startPosition, endPosition) =>
        vscode.TextEdit.replace(
          new vscode.Range(startPosition, endPosition),
          fixEdit.content || ""));
  }
  if (fixEdit.editType === "remove") {
    return validateOffsetsAndCreateTextEdit(fixEdit, document,
      (startPosition, endPosition) =>
        vscode.TextEdit.delete(new vscode.Range(startPosition, endPosition)));
  }
  return undefined;
};

/**
 * Validates the fix edit for negative line and col values, as well as whether the
 * start offset is less than the end offset. If all is well, creates the appropriate
 * vscode.TextEdit based on the given callback.
 */
const validateOffsetsAndCreateTextEdit = (
  fixEdit: RosieFixEdit,
  document: vscode.TextDocument,
  createTextEdit: (start: vscode.Position, end: vscode.Position) => vscode.TextEdit | undefined
): vscode.TextEdit | undefined => {
  if (hasInvalidStartOffset(fixEdit) || hasInvalidEndOffset(fixEdit))
    return undefined;

  const startPosition = new vscode.Position(
    fixEdit.start.line - 1,
    fixEdit.start.col - 1
  );
  const endPosition = new vscode.Position(
    fixEdit.end.line - 1,
    fixEdit.end.col - 1
  );
  if (document.offsetAt(startPosition) <= document.offsetAt(endPosition)) {
    return createTextEdit(startPosition, endPosition);
  }
  return undefined;
};

/**
 * Apply a fix from Rosie.
 *
 * @param document the document in which the fix is applied
 * @param fix the Rosie fix
 */
export const applyFix = async (
  document: vscode.TextDocument,
  fix: RosieFix
): Promise<void> => {
  const edits = fix.edits
    .map((fixEdit) => mapFixEditToTextEdit(fixEdit, document))
    .filter((p) => p !== undefined) as vscode.TextEdit[];

  const workspaceEdit = new vscode.WorkspaceEdit();
  workspaceEdit.set(document.uri, edits);
  await vscode.workspace.applyEdit(workspaceEdit);
  await addRuleFixRecord();
};

/**
 * Provides one or more CodeActions/quick fixes for fixing a certain Rosie violation.
 */
export class RosieFixAction implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.CodeAction[] | undefined {
    const fixes = getFixesForDocument(document.uri, range);
    return fixes
      ? fixes?.map((f) => this.createFix(document, range, f))
      : undefined;
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
