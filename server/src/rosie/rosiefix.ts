import { getFixesForDocument } from '../diagnostics/diagnostics';
import { RosieFix, RosieFixEdit } from './rosieTypes';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position, Range, CodeAction, CodeActionKind, WorkspaceEdit, TextEdit } from 'vscode-languageserver-types';

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
  document: TextDocument
): TextEdit | undefined => {
  if (fixEdit.editType === 'add') {
    if (hasInvalidStartOffset(fixEdit))
      return undefined;

    const insertPosition = Position.create(
      fixEdit.start.line - 1,
      fixEdit.start.col - 1
    );
    return TextEdit.insert(insertPosition, fixEdit.content || '');
  }
  if (fixEdit.editType === 'update') {
    return validateOffsetsAndCreateTextEdit(fixEdit, document,
      (startPosition, endPosition) => {
        return TextEdit.replace(Range.create(startPosition, endPosition), fixEdit.content || '');
      });
  }
  if (fixEdit.editType === 'remove') {
    return validateOffsetsAndCreateTextEdit(fixEdit, document,
      (startPosition, endPosition) => {
        return TextEdit.del(Range.create(startPosition, endPosition));
      });
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
  document: TextDocument,
  createTextEdit: (start: Position, end: Position) => TextEdit | undefined
): TextEdit | undefined => {
  if (hasInvalidStartOffset(fixEdit) || hasInvalidEndOffset(fixEdit))
    return undefined;

  const startPosition = Position.create(
    fixEdit.start.line - 1,
    fixEdit.start.col - 1
  );
  const endPosition = Position.create(
    fixEdit.end.line - 1,
    fixEdit.end.col - 1
  );
  if (document.offsetAt(startPosition) <= document.offsetAt(endPosition)) {
    return createTextEdit(startPosition, endPosition);
  }
  return undefined;
};

/**
 * Constructs and collects the applicable rule fix CodeActions in the current document
 * for the requested range.
 *
 * @param document the current document
 * @param range the range for which the CodeActions have to be collected
 */
export const provideApplyFixCodeActions = (
  document: TextDocument,
  range: Range
): CodeAction[] => {
  const fixes = getFixesForDocument(document.uri, range);
  return fixes
    ? fixes?.map((f) => createRuleFix(document, range, f))
    : [];
};

/**
 * Creates a rule fix CodeAction from the argument RosieFix.
 *
 * @param document the document in which the CodeAction is being registered
 * @param range the range where the CodeAction is being registered
 * @param rosieFix the Rosie specific fix to convert
 */
const createRuleFix = (
  document: TextDocument,
  range: Range,
  rosieFix: RosieFix
): CodeAction => {
  const edits = rosieFix.edits
    .map((fixEdit) => mapFixEditToTextEdit(fixEdit, document))
    .filter((p) => p !== undefined) as TextEdit[];

  /*
    From CodeAction's documentation:
      If a code action provides an edit and a command, first the edit is executed and then the command.
  */
  return {
    title: `Fix: ${rosieFix.description}`,
    kind: CodeActionKind.QuickFix,
    //Stores the list of code edits that this quick fix will apply
    edit: {
      changes: {
        [document.uri]: edits
      }
    },
    //Registers the 'codiga.applyFix' command for this CodeAction, so that we can execute further
    // logic when the quick fix gets invoked, e.g. to record the rule fix mutation.
    command: {
      command: 'codiga.applyFix',
      title: 'Apply Fix'
    },
    isPreferred: true
  };
};
