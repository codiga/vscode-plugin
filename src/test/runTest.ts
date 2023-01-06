import * as path from "path";
import { runTests } from "@vscode/test-electron";

async function runTestsOnWindows(extensionDevelopmentPath: string, extensionTestsPath: string, workspace: string) {
  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    version: "1.70.0",
    platform: "win32-x64-archive",
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
    const allOtherExtensionTestsPath = path.resolve(__dirname, "./allOtherTestRunner");

    const diagnosticsWorkspace = path.resolve(__dirname, "../../test-fixtures/diagnostics");
    const quickFixesWorkspace = path.resolve(__dirname, "../../test-fixtures/quick-fixes");
    const pythonWorkspace = path.resolve(__dirname, "../../test-fixtures/config-suggestions/python-workspace");
    const javascriptWorkspace = path.resolve(__dirname, "../../test-fixtures/config-suggestions/javascript-workspace");
    const typescriptWorkspace = path.resolve(__dirname, "../../test-fixtures/config-suggestions/typescript-workspace");
    /**
     * Use win64 instead of win32 for testing Windows
     */
    if (process.platform === "win32") {
      await runTestsOnWindows(extensionDevelopmentPath, rosieDiagnosticsExtensionTestsPath, diagnosticsWorkspace);
      await runTestsOnWindows(extensionDevelopmentPath, rosieQuickFixesExtensionTestsPath, quickFixesWorkspace);

      await runTestsOnWindows(extensionDevelopmentPath, codigaFileSuggestionsExtensionTestsPath, pythonWorkspace);
      await runTestsOnWindows(extensionDevelopmentPath, codigaFileSuggestionsExtensionTestsPath, javascriptWorkspace);
      await runTestsOnWindows(extensionDevelopmentPath, codigaFileSuggestionsExtensionTestsPath, typescriptWorkspace);

      await runTestsOnWindows(extensionDevelopmentPath, allOtherExtensionTestsPath, pythonWorkspace);
    } else {
      // Download VS Code, unzip it and run the integration test
      await runTestsOnNonWindows(extensionDevelopmentPath, rosieDiagnosticsExtensionTestsPath, diagnosticsWorkspace);
      await runTestsOnNonWindows(extensionDevelopmentPath, rosieQuickFixesExtensionTestsPath, quickFixesWorkspace);

      await runTestsOnNonWindows(extensionDevelopmentPath, codigaFileSuggestionsExtensionTestsPath, pythonWorkspace);
      await runTestsOnNonWindows(extensionDevelopmentPath, codigaFileSuggestionsExtensionTestsPath, javascriptWorkspace);
      await runTestsOnNonWindows(extensionDevelopmentPath, codigaFileSuggestionsExtensionTestsPath, typescriptWorkspace);

      await runTestsOnNonWindows(extensionDevelopmentPath, allOtherExtensionTestsPath, pythonWorkspace);
    }
  } catch (err) {
    console.error("Failed to run tests");
    process.exit(1);
  }
}

main();
