# Development Guide

This document provides insight into the inner workings on this VS Code extension. For a higher-level,
end-user documentation you can refer to the [extension's online documentation](https://doc.codiga.io/docs/code-analysis/ide/vscode/).

## Architecture

The extension consists of two main modules, client and server, along with the following project structure:

```
vscode-plugin
    - client                <-- Contains the sources for the VS Code extension itself
        - src
            - extension.ts  <-- The VS Code extension's entry point
    - images                <-- Assets for documentation and VS Code UI elements
    - out                   <-- Client-side compiled sources 
    - server                <-- A language server that provides diagnostics and quick fixes for the Rosie platform
        - out               <-- Server-side compiled sources
        - src
            - server.ts     <-- The language server's entry point
    - test-fixtures         <-- Test data 
    - webview               <-- Generated folder for the Codiga Assistant webview
```

## Client - VS Code Extension

The client side of this project is a regular VS Code extension containing the logic for inline and shortcut completion,
Codiga Assistant, snippet search, IDE configuration and Rosie default rulesets suggestions.

It additionally consumes diagnostics and code actions (quick fixes) from the language server located in the `server` directory.

The entry point and initialization logic of the extension is located in [`/client/src/extension.ts`](/client/src/extension.ts).

## Server - Language Server

This is a language server implementation based on the official [LSP specifications](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_publishDiagnostics)
and VS Code's [Language Server Extension Guide](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide).

The language client is built in [`/client/src/extension.ts`](/client/src/extension.ts), which is then launched, and which in turn launches the language server at `/server/src/server.ts`.

For a guide on how to implement the Rosie platform in a new IDE, you can refer to the [Rosie IDE Specification](https://doc.codiga.io/docs/rosie/ide-specification/) document. 

### codiga.yml configuration

To enable the Rosie service in a project, one has to create and configure a `codiga.yml` file in the project's root directory.
This is the file in which you can tell Rosie what rulesets you want to use, or ignore in that given project.

Details on what the configuration can hold can be found at [Code Analysis for VS Code](https://doc.codiga.io/docs/code-analysis/ide/vscode/#the-configuration-file).

### Rosie cache

The language server incorporates an internal cache ([`rosieCache.ts`](/server/src/rosie/rosieCache.ts)) of all the rules from the rulesets that are specified in the rulesets property in `codiga.yml`,
along with a periodic update mechanism. This caching makes it possible to provide better performance.

The cache is initialized and the periodic update begins when the language server finished initialization (see `connection.onInitialized()` in [`server.ts`](/server/src/server.ts)).

The periodic update is executed in every 10 seconds, and updates the cache if either the `codiga.yml` file has changed,
or the configured rulesets (or underlying rules) have changed on Codiga Hub.

The cache is updated according to the serialized content (a `CodigaYmlConfig` instance from `server.ts`) of the `codiga.yml` file.

### Rosie client

[`rosieClient.ts`](/server/src/rosie/rosieClient.ts) is responsible for the communication between the language server and the Rosie service.

It sends information (document text, document language, Rosie rules cached for the given language, etc.) to Rosie,
then processes the returned response (code violations, ranges, severities, etc.) and supplies it to the diagnostics functionality.

The model objects for serializing the response data can be found in [`rosieTypes.ts`](/server/src/rosie/rosieTypes.ts).

### Diagnostics and quick fixes

Diagnostics are the language server specific objects that hold information about a code violation (range, description, etc.)
which are then displayed in the IDE editor.

Code actions, or quick fixes, are actions that can be invoked on a specific diagnostic in the editor to provide a fix, optimization, etc.
for the given diagnostic.

This language server provides one type of diagnostic and two types of quick fixes.

#### Diagnostics

The diagnostic is the actual code violation that is found by Rosie, and are provided by [`diagnostics.ts`](/server/src/diagnostics/diagnostics.ts).

#### Quick fixes

The quick fixes are:
- **Fix: &lt;fix description>**: applies an actual code fix for the violation
- **Ignore rule &lt;rule name>**: disables Codiga code analysis for the line on which the violation occurred

The rule fix is provided by [`rosieFix.ts`](/server/src/rosie/rosiefix.ts), while the ignore one is provided by
[`ignore-violation.ts`](/server/src/diagnostics/ignore-violation.ts).

`CodeAction` objects returned by both providers are handled and propagated towards the client in the `connection.onCodeAction()`
section of `server.ts`.

## GraphQL client, queries and mutations

Both the client and the server uses a GraphQL client to send queries and mutations to Codiga.

The queries are used to fetch timestamp-, snippet- and ruleset related data from Codiga, while mutations are used to send metrics to Codiga
of the usage of certain functionality, for example when a Rosie fix is applied.

These are available in both the client and the server at `/src/graphql-api/client.ts`, `/src/graphql-api/queries.ts` and `/src/graphql-api/mutations.ts`

### User-Agent

The User-Agent header is sent in order to identify the client application the GraphQL requests are sent from.

It is in the form `<product>/<version>`, e.g. `VsCode/1.70.0`:
- On client side the product name is fix (`VsCode`), while the version is fetched from the `vscode` api.
- On server side both the product name and version are retrieved from the server connection `InitializeParams` in `connection.onInitialize()`.

### User fingerprint

In general, the fingerprint is a unique string generated when the extension is installed.

#### Client side

On client side this is achievable (see [`/client/src/utils/configurationUtils.ts`](/client/src/utils/configurationUtils.ts)), and the fingerprint
is stored in VS Code's localstorage.

#### Server side

On server side, it is a bit limited at the moment.

`server.ts` looks for a command line argument called `fingerprint`. If there is one present (i.e. it is generated in the client application and provided
for the server), then we use that value on server side as well.

If there is no such command line argument, we generate the fingerprint on server side, we don't have a solution to store its value permanently,
and keep it same between user sessions and subsequent language server launches.

### Codiga API Token

Having a Codiga account registered, using this token, users can access and use to their private rulesets and rules in the IDE.

The configuration is provided from client side, via the root `package.json` in the `contributes.configuration."codiga.api.token"` property.

## Environments

In case testing on different environments is necessary, you can use the following endpoints:

| Environment | Codiga                                | Rosie                                      |
|-------------|---------------------------------------|--------------------------------------------|
| Production  | https://api.codiga.io/graphql         | https://analysis.codiga.io/analyze         |
| Staging     | https://api-staging.codiga.io/graphql | https://analysis-staging.codiga.io/analyze |

## Testing

There are dedicated npm scripts in the root `package.json` for testing:
- client: `npm run test:client`
- server: `npm run test:server`
- client+server: `npm run test`

### Client side

On client side, tests are located in `/client/src/test`, and they are a mix of unit and integration tests, where integration tests are
according to VS Code's [Test Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension) guide.

They are fundamentally Mocha tests, but integration tests also spin up a separate Extension Host instance of VS Code
with a preselected workspace folder, which are stored in `/test-fixtures`.

The structure of the test runners is the following:
- [`runTest.ts`](/client/src/test/runTest.ts): the entry point for testing.
  - Declares the workspace and extension paths and initiates the test execution for different OS platforms.
  - Separate test runners and file paths are associated to each workspace folder, so that functionalities can be tested in better isolation.
- [`testRunner.ts`](/client/src/test/testRunner.ts): runs one or more Mocha tests based on a file pattern
- `*TestRunner.ts`: they specify file patterns for running a set of tests 

### Server side

Server side tests are pure Mocha tests (located in `/server/src/test`), and they use a mix of real workspace folders and documents,
and folder and document URIs without physical file system entries backing them.

To avoid all the hassle initializing and using an actual server connection in `server.ts`, the tests use a mock connection object.

First, in order to be able to decide whether the server is initialized from a test
(i.e. the `connection` variable is imported in various tests), there is a global variable called `isInTestMode`
declared in [`testConfiguration.ts`](/server/src/testConfiguration.ts) that can be set in each test. For further details,
see the documentation in `testConfiguration.ts`.

Then, if the `server.ts` is loaded from a test, instead of creating an actual `_Connection` object, we create a dedicated
`MockConnection` (see [`connectionMocks.ts`](/server/src/test/connectionMocks.ts)). This connection type has no-op event handlers,
and the customization that can be done, and is necessary at the moment,
is the underlying project workspace that the server side functionality works with.

When implementing tests, prefer using URI objects for folders and files where possible, without actually creating them
on the file system. Since not all functionality requires physical files and/or folders to be present, this speeds up
the tests and avoids handling file creation, cleanup, etc.

## Outstanding issues

- Currently, the Rosie quick fixes are displayed in ignore-apply order instead of the desired apply-ignore order.

## Limitations

- There is no configuration at the moment to debug the server-side code.
- Neither console nor language client based logging emits any log entry, for some reason.

## How to guide

### Compile and run the extension

In the extension's root directory:
- Run `npm install` to install dependencies.
- Run `npm run compile` to compile both the client and server side sources, as well as to generate the webview for the snippets.
- Hit F5 in VS Code to launch the extension host instance.

### Add support for a new Rosie language

This needs changes on both client and server-side.

#### Client

To simply support a new language:
- Add the language to `ROSIE_SUPPORTED_LANGUAGES` in [`/client/src/constants.ts`](/client/src/constants.ts).

If default ruleset suggestions are also needed for the language, then:
- create a new `DEFAULT_<languge>_RULESET_CONFIG` in [`/client/src/constants.ts`](/client/src/constants.ts) with the appropriate
codiga.yml file content.
- map the new config constant to the new language in `getCodigaFileContent(Language)` in [`/client/src/features/codiga-file-suggestion.ts`](/client/src/features/codiga-file-suggestion.ts).

#### Server

The steps are the following:
- add a new Map entry to `GRAPHQL_LANGUAGE_TO_ROSIE_LANGUAGE` in [`/server/src/rosie/rosieConstants.ts`](/server/src/rosie/rosieConstants.ts)
mapping the Rosie language string to the `Language` enum.
- add a new branch/case in `getRosieRules(Language, Rule[], URI)` in [`server/src/rosie/rosieCache.ts`](/server/src/rosie/rosieCache.ts) to
define what language(s) of rules will be returned for the new language. For example, currently both JavaScript and TypeScript rules are returned
for TypeScript files.

### Add a new AST type for Rosie

The single place where the change must be applied is in [`/server/src/constants.ts`](/server/src/constants.ts):
- create an `ELEMENT_CHECKED_<element name>` const
- create a `ROSIE_ENTITY_<element name>` const
- add a new mapping for them in the `ELEMENT_CHECKED_TO_ENTITY_CHECKED` map
