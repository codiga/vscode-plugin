import {ServerRequestHandler} from "vscode-languageserver/lib/common/server";
import {InitializeParams} from "vscode-languageserver/node";
import {InitializeResult, WorkspaceFolder} from "vscode-languageserver";
import {
  CodeAction,
  CodeActionParams, Command,
  DidChangeConfigurationParams,
  Disposable, ExecuteCommandParams, InitializedParams,
  InitializeError,
  NotificationHandler, PublishDiagnosticsParams, RequestHandler
} from "vscode-languageserver-protocol";

/**
 * A mock version of the {@link _Connection} interface for testing purposes.
 */
export interface MockConnection {
  workspace: MockWorkspace;
  onInitialize(handler: ServerRequestHandler<InitializeParams, InitializeResult, never, InitializeError>): Disposable;
  onDidChangeConfiguration(handler: NotificationHandler<DidChangeConfigurationParams>): Disposable;
  onCodeAction(handler: ServerRequestHandler<CodeActionParams, (Command | CodeAction)[] | undefined | null, (Command | CodeAction)[], void>): Disposable;
  onCodeActionResolve(handler: RequestHandler<CodeAction, CodeAction, void>): Disposable;
  onExecuteCommand(handler: ServerRequestHandler<ExecuteCommandParams, any | undefined | null, never, void>): Disposable;
  onInitialized(handler: NotificationHandler<InitializedParams>): Disposable;
  sendDiagnostics(params: PublishDiagnosticsParams): Promise<void>;
  console: any;
}

/**
 * A mock version for the `workspace` property in the {@link _Connection} interface for testing purposes.
 */
interface MockWorkspace {
  workspaceFolders: WorkspaceFolder[];
  getConfiguration(section: string): Promise<any>;
  getWorkspaceFolders(): Promise<WorkspaceFolder[]>;
}

/**
 * Creates a mock connection object for testing purposes.
 */
export function createMockConnection(): MockConnection {
  return {
    console: undefined,
    onCodeAction(handler: ServerRequestHandler<CodeActionParams, (Command | CodeAction)[] | undefined | null, (Command | CodeAction)[], void>): Disposable {
      return {} as Disposable;
    },
    onCodeActionResolve(handler: RequestHandler<CodeAction, CodeAction, void>): Disposable {
      return {} as Disposable;
    },
    onDidChangeConfiguration(handler: NotificationHandler<DidChangeConfigurationParams>): Disposable {
      return {} as Disposable;
    },
    onExecuteCommand(handler: ServerRequestHandler<ExecuteCommandParams, any, never, void>): Disposable {
      return {} as Disposable;
    },
    onInitialized(handler: NotificationHandler<InitializedParams>): Disposable {
      return {} as Disposable;
    },
    sendDiagnostics(params: PublishDiagnosticsParams): Promise<void> {
      return Promise.resolve(undefined);
    },
    onInitialize(handler: ServerRequestHandler<InitializeParams, InitializeResult, never, InitializeError>): Disposable {
      return {} as Disposable;
    },
    workspace: <MockWorkspace>{
      workspaceFolders: [],
      getWorkspaceFolders(): Promise<WorkspaceFolder[]> {
        return Promise.resolve(this.workspaceFolders);
      },
      getConfiguration(section: string): Promise<any> {
        return Promise.resolve({});
      }
    }
  };
}
