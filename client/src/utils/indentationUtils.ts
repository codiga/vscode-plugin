import * as vscode from "vscode";

/**
 * Adapt indentation of the code. We do not change the first line
 * but we indent the rest of the code according to the rest of the
 * text.
 * @param code
 * @param indentation
 * @returns
 */
export function adaptIndentation(code: string, indentation: number): string {
  if (indentation === 0) {
    return code;
  }
  const codeArray = code.split("\n");
  const newCode = [];
  newCode.push(codeArray.shift());
  for (const line of codeArray) {
    newCode.push(`${" ".repeat(indentation)}${line}`);
  }
  const res = newCode.join("\n");
  return res;
}

export function getCurrentIndentationForDocument(
  document: vscode.TextDocument,
  position: vscode.Position
): number | undefined {
  try {
    const line = document.lineAt(position.line);

    if (!line) {
      return 0;
    }

    const lineText = line.text;

    let nspaces = 0;
    for (let i = 0; i < lineText.length; i = i + 1) {
      if (lineText.charAt(i) !== " ") {
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

/**
 * Get the indentation at a given position
 * @param editor
 * @param position
 * @returns
 */
export function getCurrentIndentation(
  editor: vscode.TextEditor,
  position: vscode.Position
): number | undefined {
  if (!editor) {
    return 0;
  }
  const doc = editor.document;
  if (!doc) {
    return 0;
  }
  return getCurrentIndentationForDocument(doc, position);
}

/**
 * Decode Codiga Indent variables from recipe
 * @param code
 * @returns
 */
export function decodeIndent(code: string) {
  return code.replace(/&\[CODIGA_INDENT\]/g, "\t");
}
