import { getFixesForDocument } from '../diagnostics/diagnostics';
import { RosieFix, RosieFixEdit } from './rosieTypes';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position, Range, CodeAction, CodeActionKind, TextEdit } from 'vscode-languageserver-types';

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
 * Creates the provided CodeAction's underlying WorkspaceEdit, and sets it based on the given RosieFixEdits.
 *
 * @param codeAction the code action to compute the 'edit' property of
 * @param document the document in which the code action is being invoked
 * @param rosieFixEdits the code edits from the RosieFix
 */
export const createAndSetRuleFixCodeActionEdit = (
    codeAction: CodeAction,
    document: TextDocument,
    rosieFixEdits: RosieFixEdit[]
) => {
  const textEdits = rosieFixEdits
      .map(fixEdit => mapFixEditToTextEdit(fixEdit, document))
      .filter(textEdit => textEdit !== undefined) as TextEdit[];
  //Stores the list of code edits that this quick fix will apply
  codeAction.edit = {
    changes: {
      [document.uri]: textEdits
    }
  };
};

/**
 * Maps the Rosie specific RosieFixEdit to an LSP specific TextEdit,
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
 * TextEdit based on the given callback.
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
  range: Range,
  shouldComputeEdit: boolean | undefined = false
): CodeAction[] => {
  const fixes = getFixesForDocument(document.uri, range);
  return fixes
    ? fixes?.map(rosieFix => createRuleFix(document, rosieFix, shouldComputeEdit))
    : [];
};

/**
 * Creates a rule fix CodeAction from the argument RosieFix.
 *
 * Exported for testing purposes.
 *
 * @param document the document in which the CodeAction is being registered
 * @param rosieFix the Rosie specific fix to convert
 */
export const createRuleFix = (
  document: TextDocument,
  rosieFix: RosieFix,
  shouldComputeEdit: boolean | undefined = false
): CodeAction => {
  /*
    From CodeAction's documentation:
      If a code action provides an edit and a command, first the edit is executed and then the command.
  */
  const ruleFix: CodeAction = {
    title: `Fix: ${rosieFix.description}`,
    kind: CodeActionKind.QuickFix,
    //Registers the 'codiga.applyFix' command for this CodeAction, so that we can execute further
    // logic when the quick fix gets invoked, e.g. to record the rule fix mutation.
    command: {
      command: 'codiga.applyFix',
      title: 'Apply Fix'
    },
    isPreferred: true,
    //Data the is reserved between 'onCodeAction()' and 'onCodeActionResolve()'.
    data: {
      fixKind: "rosie.rule.fix",
      //Don't need to send the whole document, the URI is enough.
      //Also, sending the entire document object is problematic because some properties of that object
      // are lost, for some reason, between 'onCodeAction()' and 'onCodeActionResolve()'.
      documentUri: document.uri,
      rosieFixEdits: rosieFix.edits
    }
  };
  if (shouldComputeEdit) {
    const rosieFixEdits = ruleFix.data.rosieFixEdits as RosieFixEdit[];
    createAndSetRuleFixCodeActionEdit(ruleFix, document, rosieFixEdits);
  }
  return ruleFix;
};
