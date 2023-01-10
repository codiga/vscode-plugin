import * as path from "path";
import {runTests} from "@vscode/test-electron";

async function runTestsOnWindows(extensionDevelopmentPath: string, extensionTestsPath: string, workspace: string) {
  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    version: "1.70.0",
    platform: "win32-x64-archive", //Use win64 instead of win32 for testing Windows
    launchArgs: [workspace, "--disable-extensions"],
  });
}

async function runTestsOnNonWindows(extensionDevelopmentPath: string, extensionTestsPath: string, workspace: string) {
  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [workspace, "--disable-extensions"],
  });
}

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, "../..");

    // The path to test runner
    // Passed to --extensionTestsPath
    const rosieDiagnosticsExtensionTestsPath = path.resolve(__dirname, "./rosieDiagnosticsTestRunner");
    const rosieQuickFixesExtensionTestsPath = path.resolve(__dirname, "./rosieQuickFixesTestRunner");
    const codigaFileSuggestionsExtensionTestsPath = path.resolve(__dirname, "./codigaFileSuggestionsTestRunner");
    const rosieCacheExtensionTestsPath = path.resolve(__dirname, "./rosieCacheTestRunner");
    const rosieCacheUpdateExtensionTestsPath = path.resolve(__dirname, "./rosieCacheUpdateTestRunner");
    const completionExtensionTestsPath = path.resolve(__dirname, "./completionTestRunner");

    const diagnosticsWorkspace = path.resolve(__dirname, "../../test-fixtures/diagnostics");
    const quickFixesWorkspace = path.resolve(__dirname, "../../test-fixtures/quick-fixes");
    const pythonWorkspace = path.resolve(__dirname, "../../test-fixtures/config-suggestions/python-workspace");
    const javascriptWorkspace = path.resolve(__dirname, "../../test-fixtures/config-suggestions/javascript-workspace");
    const typescriptWorkspace = path.resolve(__dirname, "../../test-fixtures/config-suggestions/typescript-workspace");
    const rosieCacheWorkspace = path.resolve(__dirname, "../../test-fixtures/rosie-cache/default");
    const rosieCacheUpdateWorkspace = path.resolve(__dirname, "../../test-fixtures/rosie-cache/update");

    const testPathsToWorkspaces = new Map<string, string>([
      [rosieDiagnosticsExtensionTestsPath, diagnosticsWorkspace],
      [rosieQuickFixesExtensionTestsPath, quickFixesWorkspace],
      [codigaFileSuggestionsExtensionTestsPath, pythonWorkspace],
      [codigaFileSuggestionsExtensionTestsPath, javascriptWorkspace],
      [codigaFileSuggestionsExtensionTestsPath, typescriptWorkspace],
      [rosieCacheExtensionTestsPath, rosieCacheWorkspace],
      [rosieCacheUpdateExtensionTestsPath, rosieCacheUpdateWorkspace],
      [completionExtensionTestsPath, pythonWorkspace]
    ]);

    if (process.platform === "win32") {
      for (let testPathsToWorkspace of testPathsToWorkspaces) {
        await runTestsOnWindows(extensionDevelopmentPath, testPathsToWorkspace[0], testPathsToWorkspace[1]);
      }
    } else {
      // Download VS Code, unzip it and run the integration test
      for (let testPathsToWorkspace of testPathsToWorkspaces) {
        await runTestsOnNonWindows(extensionDevelopmentPath, testPathsToWorkspace[0], testPathsToWorkspace[1]);
      }
    }
  } catch (err) {
    console.error("Failed to run tests");
    process.exit(1);
  }
}

main();
