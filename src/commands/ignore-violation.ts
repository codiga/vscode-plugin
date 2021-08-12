import * as vscode from "vscode";
import { doMutation } from "../graphql-api/client";
import { IGNORE_VIOLATION } from "../graphql-api/mutations";
import { FileAnalysisViolation } from "../graphql-api/types";
import { getAssociatedProjectIdentifier } from "../utils/configurationUtils";
import { IgnoreViolationType } from "../utils/IgnoreViolationType";
import { hasKeys } from "../graphql-api/configuration";

/**
 * Command to ignore a violation for a project or a file.
 * @returns nothing
 */
export async function ignoreViolation(
  ignoreViolationType: IgnoreViolationType,
  violation: FileAnalysisViolation
): Promise<void> {
  if (!hasKeys()) {
    vscode.window.showInformationMessage(
      "Code Inspector API keys not configured. Configure the API keys first"
    );
    return;
  }

  // Get the current value of the associated project.
  const currentValue = getAssociatedProjectIdentifier();

  if (!currentValue || currentValue === 0) {
    vscode.window.showInformationMessage(
      "No project associated with Code Inspector, enter your API key in settings and associate a Code Inspector project first"
    );
    return;
  }

  // Define the variables of the mutation
  const variables: Record<string, string | undefined | number | null> = {
    language: violation.language,
    projectId: currentValue,
    filename:
      ignoreViolationType === IgnoreViolationType.Project
        ? null
        : violation.filename,
    description: violation.description,
    rule: violation.rule,
    tool: violation.tool,
  };

  const mutationResult = await doMutation(IGNORE_VIOLATION, variables);

  if (!mutationResult) {
    vscode.window.showInformationMessage(
      "Error when trying to ignore violation. Check your API keys and the associated project."
    );
    return;
  }

  // Show the information to the user.
  vscode.window.showInformationMessage("Violation ignored");
}
