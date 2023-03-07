import {
  createConnection,
  InitializeParams,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {refreshCachePeriodic, setAllTextDocumentsValidator} from './rosie/rosieCache';
import { initializeClient } from './graphql-api/client';
import { refreshDiagnostics } from './diagnostics/diagnostics';
import { recordLastActivity } from './utils/activity';
import {
  cacheUserFingerprint,
  cacheCodigaApiToken,
  cacheWorkspaceFolders,
  getApiToken
} from './utils/configurationCache';
import { provideApplyFixCodeActions, createAndSetRuleFixCodeActionEdit } from './rosie/rosiefix';
import { CodeAction, CodeActionKind } from 'vscode-languageserver-types';
import { addRuleFixRecord } from './graphql-api/add-rule-fix-record';
import {_Connection, DidChangeConfigurationNotification, InitializeResult} from 'vscode-languageserver';
import {createIgnoreWorkspaceEdit, provideIgnoreFixCodeActions} from './diagnostics/ignore-violation';
import { createMockConnection, MockConnection } from "./test/connectionMocks";
import { RosieFixEdit } from "./rosie/rosieTypes";
import {initConsole} from "./utils/connectionLogger";

/**
 * Retrieves the 'fingerprint' command line argument, so that later we can determine whether the
 * fingerprint has to be generated on server side, or there is already one generated in the client application.
 */
const fingerprintArgs = process.argv.filter(arg => arg.match('fingerprint=.*'));

/**
 * Creates a connection for the server. The connection uses Node's IPC as a transport mechanism.
 * Includes all preview / proposed LSP features.
 *
 * In case of unit test execution it creates a MockConnection, so that we don't need to have (and deal with)
 * and actual language server connection.
 */
export const connection: _Connection | MockConnection = !global.isInTestMode
  ? createConnection(ProposedFeatures.all)
  : createMockConnection();

initConsole(connection.console);

//Creates a simple text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability: boolean;
let hasWorkspaceCapability: boolean;
let hasWorkspaceFoldersCapability: boolean;
let hasApplyEditCapability: boolean;
let hasCodeActionLiteralSupport: boolean;
let hasCodeActionResolveSupport: boolean;
let hasCodeActionDataSupport: boolean;

let clientName: string | undefined;
let clientVersion: string | undefined;
/**
 * This is set to true for clients that don't support codeAction/resolve,
 * or they support it, but they announce their support incorrectly, e.g. due to a bug.
 */
let shouldComputeEditInCodeAction: boolean | undefined = false;

/**
 * Starts to initialize the language server.
 *
 * In case of VS Code, upon opening a different folder in the same window, the server is shut down,
 * and a new language client is initialized.
 *
 * The language server presumes that diagnostics are supported by the client application, otherwise the integration
 * of the server would not make much sense, thus there is no check for the textDocument/publishDiagnostics capability.
 */
connection.onInitialize((_params: InitializeParams) => {
  //https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#workspace_didChangeConfiguration
  hasConfigurationCapability = !!(
      _params.capabilities.workspace
      && _params.capabilities.workspace.configuration
      && _params.capabilities.workspace?.didChangeConfiguration);

  hasWorkspaceCapability = !!(_params.capabilities.workspace);

  //https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#workspace_workspaceFolders
  //While text editors like VS Code, Sublime Text and such support multiple workspaces, for example Jupyter Lab doesn't,
  // so in those cases we rely on 'rootUri' as the single workspace root.
  hasWorkspaceFoldersCapability = !!(_params.capabilities.workspace?.workspaceFolders);
  if (!hasWorkspaceFoldersCapability) {
    cacheWorkspaceFolders(_params.rootUri ? [_params.rootUri] : []);
  }

  //https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#workspace_executeCommand
  //https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#workspace_applyEdit
  hasApplyEditCapability = !!(hasWorkspaceCapability && _params.capabilities.workspace?.applyEdit);

  /**
   * Clients need to announce their support for code action literals (e.g. literals of type CodeAction) and
   * code action kinds via the corresponding client capability codeAction.codeActionLiteralSupport.
   *
   * https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_codeAction
   */
  hasCodeActionLiteralSupport = !!(_params.capabilities.textDocument?.codeAction?.codeActionLiteralSupport);
  hasCodeActionResolveSupport = !!(_params.capabilities.textDocument?.codeAction?.resolveSupport);
  hasCodeActionDataSupport = !!(_params.capabilities.textDocument?.codeAction?.dataSupport);

  //Retrieves client information, so that we can use it in the User-Agent header of GraphQL requests
  clientName = _params.clientInfo?.name;
  clientVersion = _params.clientInfo?.version;
  //The condition for Eclipse can be removed, when
  // https://github.com/eclipse/lsp4e/commit/2cf0a803936635a62d7fad2d05fde78bc7ce6a17 is released.
  if (clientName?.startsWith("Eclipse IDE")) {
    shouldComputeEditInCodeAction = true;
  }

  /**
   * Runs when the configuration, e.g. the Codiga API Token changes.
   */
  connection.onDidChangeConfiguration(async _change => {
    if (_change.settings?.codiga?.api?.token)
      cacheCodigaApiToken(_change.settings?.codiga?.api?.token);
    else if (_change.settings?.codigaApiToken)
      cacheCodigaApiToken(_change.settings?.codigaApiToken);

    documents.all().forEach(validateTextDocument);
  });

  // Coda Actions / Quick Fixes

  /**
   * Returns CodeActions for the requested document range.
   *
   * This is executed not just when displaying the list of quick fixes for a diagnostic,
   * but also when diagnostics are computed.
   */
  connection.onCodeAction(params => {
    const codeActions: CodeAction[] = [];

    if (hasApplyEditCapability && hasCodeActionLiteralSupport && params.context.diagnostics.length > 0) {
      const document = documents.get(params.textDocument.uri);
      if (document) {
        codeActions.push(...provideApplyFixCodeActions(document, params.range, shouldComputeEditInCodeAction));
        const ignoreFixes = provideIgnoreFixCodeActions(document, params.range, params, shouldComputeEditInCodeAction);
        codeActions.push(...ignoreFixes);
      }
    }

    return codeActions;
  });

  /**
   * Invoked when the user actually uses/invokes a code action.
   *
   * It computes the 'edit' property of the CodeAction in this handler, so that it is evaluated
   * only when we actually need that information, kind of lazy evaluation.
   */
  connection.onCodeActionResolve(codeAction => {
    if (!shouldComputeEditInCodeAction && codeAction.data) {
      if (codeAction.data.fixKind === "rosie.rule.fix") {
        const document = documents.get(codeAction.data.documentUri);
        if (document) {
          const rosieFixEdits = codeAction.data.rosieFixEdits as RosieFixEdit[];
          createAndSetRuleFixCodeActionEdit(codeAction, document, rosieFixEdits);
        }
      } else if (codeAction.data.fixKind === "rosie.ignore.violation.fix") {
        const document = documents.get(codeAction.data.documentUri);
        if (document && codeAction.diagnostics) {
          //codeAction.diagnostics[0] is alright because there is only one Diagnostic saved per ignore-violation CodeAction.
          codeAction.edit = createIgnoreWorkspaceEdit(document, codeAction.diagnostics[0]?.range);
        }
      }
    }
    return codeAction;
  });

  /**
   * Runs when a command, e.g. a command associated to a CodeAction, is executed.
   *
   * Commands are registered in the 'executeCommandProvider.commands' property of the InitializeResult object below.
   *
   * The "codiga.applyFix" id is associated to the CodeAction in rosieFix.ts#createRuleFix.
   */
  connection.onExecuteCommand(params => {
    if (params.command === 'codiga.applyFix') {
      addRuleFixRecord();
    }
  });

  // Document changes and diagnostics

  /**
   * Runs when a document gets opened.
   */
  documents.onDidOpen(change => {
    recordLastActivity();
    validateTextDocument(change.document);
  });

  /**
   * Runs when a document gets closed.
   */
  documents.onDidClose(change => {
  });

  /**
   * Runs when the text document first opened or when its content has changed.
   *
   * Save doesn't have to be invoked on the document in order for this event handler to execute.
   */
  documents.onDidChangeContent(change => {
    recordLastActivity();
    validateTextDocument(change.document);
  });

  const initResult: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental
    }
  };

  if (hasCodeActionLiteralSupport) {
    if (hasApplyEditCapability) {
      initResult.capabilities.executeCommandProvider = {
        commands: ['codiga.applyFix']
      };
    }
    initResult.capabilities.codeActionProvider = {
      codeActionKinds: [CodeActionKind.QuickFix]
    };

    if (hasCodeActionResolveSupport && hasCodeActionDataSupport) {
      initResult.capabilities.codeActionProvider.resolveProvider = true;
    }
  }
  return initResult;
});

/**
 * Runs when the language server finished initialization.
 */
connection.onInitialized(async () => {
  //Based on https://code.visualstudio.com/api/language-extensions/language-server-extension-guide
  if (!global.isInTestMode && hasConfigurationCapability) {
    await (connection as _Connection).client.register(DidChangeConfigurationNotification.type, undefined);
  }

  if (hasWorkspaceFoldersCapability) {
    //Initial caching when initialized
    const folders = (await connection.workspace.getWorkspaceFolders())?.map(folder => folder.uri) ?? [];
    cacheWorkspaceFolders(folders);

    //Whenever the set of workspace folders changes, we cache the new set
    connection.workspace.onDidChangeWorkspaceFolders(async e => {
      const folders = (await connection.workspace.getWorkspaceFolders())?.map(folder => folder.uri) ?? [];
      cacheWorkspaceFolders(folders);
    });
  }

  //If there is only one 'fingerprint' command line argument, get its value,
  // otherwise we return undefined, so that the server will generate its value.
  const userFingerprint = fingerprintArgs && fingerprintArgs.length === 1
    ? fingerprintArgs[0].replace('fingerprint=', '')
    : undefined;

  cacheUserFingerprint(userFingerprint);

  //Initializes the GraphQL client
  initializeClient(clientName, clientVersion);

  /*
    In Jupyter Lab, the configuration is not available via 'connection.workspace.getConfiguration("codiga.api.token")' for some reason,
    but only via the DidChangeConfigurationParams in 'connection.onDidChangeConfiguration()'.
    Also, Jupyter Lab triggers a call for `onDidChangeConfiguration()` when 'getConfiguration()' is first called here.
    This trigger doesn't seem to happen with VS Code and Sublime Text.

    There are two such calls, one with an empty configuration ({}), the second one with the actual contents of the configuration.

    Thus, in order to have the codiga.api.token cached, we
      - first, call 'getConfiguration()', and save its result,
      - if `onDidChangeConfiguration()` cached the value in the meantime, we don't update the cache (e.g. Jupyter Lab)
      - if `onDidChangeConfiguration()` didn't cache the value, we use the returned value (e.g. VS Code)
   */
  let apiToken = await connection.workspace.getConfiguration("codiga.api.token");
  if (!apiToken) {
    apiToken = await connection.workspace.getConfiguration("codigaApiToken");
  }

  if (!getApiToken()) {
    cacheCodigaApiToken(apiToken);
  }

  setAllTextDocumentsValidator(() => documents.all().forEach(validateTextDocument));
  refreshCachePeriodic();
});

/**
 * Sends the text document to Rosie for analysis, constructs the Diagnostic objects
 * based on the returned analysis results, and sends them to the client application to display them in the editor.
 *
 * @param textDocument the text document being analyzed
 */
async function validateTextDocument(textDocument: TextDocument) {
  try {
    refreshDiagnostics(textDocument, diags => connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: diags }));
  } catch (e) {
    connection.console.error(`Error while validating ${textDocument.uri}`);
    connection.console.error(String(e));
  }
}

// Make the text document manager listen on the connection for open, change and close text document events.
if (!global.isInTestMode) {
  documents.listen(connection as _Connection);
  (connection as _Connection).listen();
}
