import {
  createConnection,
  InitializeParams,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { refreshCachePeriodic } from './rosie/rosieCache';
import { initializeClient } from './graphql-api/client';
import { refreshDiagnostics } from './diagnostics/diagnostics';
import { recordLastActivity } from './utils/activity';
import { cacheUserFingerprint } from './utils/configurationUtils';
import { provideApplyFixCodeActions } from './rosie/rosiefix';
import { CodeAction, CodeActionKind } from 'vscode-languageserver-types';
import { addRuleFixRecord } from './graphql-api/add-rule-fix-record';
import { _Connection, InitializeResult } from 'vscode-languageserver';
import { provideIgnoreFixCodeActions } from './diagnostics/ignore-violation';
import { cacheCodigaApiToken } from './graphql-api/configuration';
import { createMockConnection, MockConnection } from "./test/connectionMocks";

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

//Creates a simple text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasDiagnosticCapability: boolean;
let hasApplyEditCapability: boolean;
let hasCodeActionLiteralSupport: boolean;

let clientName: string | undefined;
let clientVersion: string | undefined;

/**
 * Starts to initialize the language server.
 *
 * In case of VS Code, upon opening a different folder in the same window, the server is shut down,
 * and a new language client is initialized.
 */
connection.onInitialize((_params: InitializeParams) => {
  //https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_publishDiagnostics
  hasDiagnosticCapability = !!(
    _params.capabilities.textDocument &&
    _params.capabilities.textDocument.publishDiagnostics
  );

  //https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#workspace_executeCommand
  //https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#workspace_applyEdit
  hasApplyEditCapability = !!(_params.capabilities.workspace && _params.capabilities.workspace?.applyEdit);

  /**
   * Clients need to announce their support for code action literals (e.g. literals of type CodeAction) and
   * code action kinds via the corresponding client capability codeAction.codeActionLiteralSupport.
   *
   * https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_codeAction
   */
  hasCodeActionLiteralSupport = !!(_params.capabilities.textDocument?.codeAction?.codeActionLiteralSupport);

  //If there is no support for diagnostics, which is the core functionality and purpose of the Rosie platform,
  // return with no capability, and don't register any further event handler.
  if (!hasDiagnosticCapability)
    return { capabilities: {} };

  //Retrieves client information, so that we can use it in the User-Agent header of GraphQL requests
  clientName = _params.clientInfo?.name;
  clientVersion = _params.clientInfo?.version;

  /**
   * Runs when the configuration, e.g. the Codiga API Token changes.
   */
  connection.onDidChangeConfiguration(_change => {
    documents.all().forEach(validateTextDocument);
  });

  // Coda Actions / Quick Fixes

  /**
   * Returns CodeActions for the requested document range.
   *
   * This is executed not just when displaying the list of quick fixes for a diagnostic,
   * but also when diagnostics are computed.
   */
  connection.onCodeAction(async params => {
    const codeActions: CodeAction[] = [];

    if (hasApplyEditCapability && hasCodeActionLiteralSupport && params.context.diagnostics.length > 0) {
      const document = documents.get(params.textDocument.uri);
      if (document) {
        codeActions.push(...provideApplyFixCodeActions(document, params.range));
        const ignoreFixes = await provideIgnoreFixCodeActions(document, params.range, params);
        codeActions.push(...ignoreFixes);
      }
    }

    return codeActions;
  });

  connection.onCodeActionResolve(codeAction => {
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
    cacheCodigaApiToken();
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
      codeActionKinds: [CodeActionKind.QuickFix],
      resolveProvider: true
    };
  }
  return initResult;
});

/**
 * Runs when the language server finished initialization.
 */
connection.onInitialized(() => {
  //If there is only one 'fingerprint' command line argument, get its value,
  // otherwise we return undefined, so that the server will generate its value.
  const userFingerprint = fingerprintArgs && fingerprintArgs.length === 1
    ? fingerprintArgs[0].replace('fingerprint=', '')
    : undefined;

  cacheUserFingerprint(userFingerprint);

  //Initializes the GraphQL client
  initializeClient(clientName, clientVersion);

  cacheCodigaApiToken();

  //Start the rules cache updater only if the client supports diagnostics
  if (hasDiagnosticCapability)
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
    const diagnostics = await refreshDiagnostics(textDocument);

    //Sends the computed diagnostics to the client application.
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
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
