import { TextDocument, Position, Range, uinteger } from 'vscode-languageserver-types';

export function getCurrentIndentationForDocument(
  document: TextDocument,
  position: Position
): number | undefined {
  try {
    /*
      Imitates 'vscode.TextDocument.lineAt()'. See https://github.com/Microsoft/vscode-languageserver-node/issues/146
      All arguments must be unsigned integers:
        uinteger: https://github.com/microsoft/vscode-languageserver-node/blob/main/types/src/main.ts#L49
        Range.create(): https://github.com/microsoft/vscode-languageserver-node/blob/main/types/src/main.ts#L211
     */
    const line = document.getText(Range.create(position.line, uinteger.MIN_VALUE, position.line, uinteger.MAX_VALUE));

    if (!line) {
      return 0;
    }

    let nspaces = 0;
    for (let i = 0; i < line.length; i = i + 1) {
      if (line.charAt(i) !== " ") {
        break;
      }
      nspaces = nspaces + 1;
    }
    return nspaces;
  } catch (e) {
    console.debug(e);
    return undefined;
  }
}

