import { DIAGNOSTIC_SOURCE } from "../constants";

import { getLanguageForDocument } from "../utils/fileUtils";
import { getCurrentIndentationForDocument } from '../utils/indentationUtils';
import { getCommentSign } from "../utils/languageUtils";
import { Position, CodeAction, CodeActionKind, Diagnostic, TextEdit, WorkspaceEdit } from 'vscode-languageserver-types';
import { Range, TextDocument } from 'vscode-languageserver-textdocument';
import { CodeActionParams } from 'vscode-languageserver';

/**
 * Constructs and collects the applicable ignore fix CodeActions in the current document
 * for the requested range.
 *
 * @param document the current document
 * @param range the range for which the CodeActions have to be collected
 * @param context the code action parameters for additional context information
 */
export const provideIgnoreFixCodeActions = (
  document: TextDocument,
  range: Range,
  context: CodeActionParams
): CodeAction[] => {
  const diagnostics = context.context.diagnostics
    .filter(diagnostic => diagnostic.source?.toLocaleString().indexOf(DIAGNOSTIC_SOURCE) != -1);

  const ignoreFixes: CodeAction[] = [];
  for (const diagnostic of diagnostics) {
    ignoreFixes.push(createIgnoreFix(diagnostic, document));
  }

  return ignoreFixes;
};

/**
 * Creates an ignore fix CodeAction.
 *
 * @param diagnostic the Diagnostic object for which the ignore fix is created
 * @param document the document in which the CodeAction is being registered
 */
export const createIgnoreFix = (
  diagnostic: Diagnostic,
  document: TextDocument
): CodeAction => {
  const ruleIdentifier = diagnostic.code;
  const title = ruleIdentifier
    ? `Ignore rule ${ruleIdentifier}`
    : "Ignore rule";

  return {
    title: title,
    kind: CodeActionKind.QuickFix,
    /**
     * Using a WorkspaceEdit instead of a command because passing command parameters from here to 'connection.onExecuteCommand()'
     * causes a bit of a problem.
     *
     * There is a not exported subclass of TextDocument called FullTextDocument in vscode-languageserver-node,
     * and when passing command arguments to a CodeAction and handling them in 'connection.onExecuteCommand()',
     * the 'uri', 'getText()' and other properties of both the subclass and the base TextDocument are lost,
     * and only some non-function properties, like '_uri', of FullTextDocument remain usable.
     *
     * This caused an issue fetching the document.uri in e.g. fileUtils.ts#asRelativePath(),
     * and document.getText() in indentationUtils.ts#getCurrentIndentationForDocument(),
     * because neither properties were found/existed.
     *
     * FullTextDocument: https://github.com/microsoft/vscode-languageserver-node/blob/main/types/src/main.ts#L4304
     */
    diagnostics: [diagnostic],
    isPreferred: false,
    //Data the is reserved between 'onCodeAction()' and 'onCodeActionResolve()'.
    data: {
      fixKind: "rosie.ignore.violation.fix",
      //Don't need to send the whole document, the URI is enough.
      documentUri: document.uri
    }
  };
};

/**
 * Creates the edit for adding the codiga-disable comment.
 *
 * @param document the document in which the comment is to be added
 * @param range the range of the diagnostic based on which the comment is added (e.g. indentation-wise)
 */
export const createIgnoreWorkspaceEdit = (
  document: TextDocument,
  range: Range,
): WorkspaceEdit => {
  const insertPosition = Position.create(range.start.line, 0);
  const language = getLanguageForDocument(document);
  const commentSymbol = getCommentSign(language);
  const indentation = getCurrentIndentationForDocument(
    document,
    Position.create(range.start.line, range.start.character)
  );

  const spaces = indentation || 0;

  return {
    changes: {
      [document.uri]: [TextEdit.insert(insertPosition, `${" ".repeat(spaces)}${commentSymbol} codiga-disable\n`)]
    }
  };
};
