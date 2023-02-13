import {WorkspaceFolder} from "vscode-languageserver";

let workspaceFolders: WorkspaceFolder[] = [];

/**
 * Saves the argument workspace folders. If null is provided, then an empty list is cached.
 *
 * @param folders the workspacefolders to cache
 */
export function cacheWorkspaceFolders(folders: WorkspaceFolder[] | null) {
    workspaceFolders = folders ?? [];
}

/**
 * Returns the workspace folders from this cache.
 */
export function getWorkspaceFolders(): WorkspaceFolder[] {
    return workspaceFolders;
}
