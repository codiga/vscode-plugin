import * as vscode from "vscode";
import { Project } from "../graphql-api/types";
import { doQuery } from "../graphql-api/client";
import { GET_PROJECTS } from "../graphql-api/queries";

/**
 * Command to configure the project associated with the workspace.
 * @returns
 */
export async function configureProject(): Promise<void> {
  if (vscode.window.activeTextEditor) {
    // Get the list of all projects
    const getProjectsQuery = await doQuery(GET_PROJECTS);

    if (!getProjectsQuery) {
      vscode.window.showInformationMessage(
        "No project found. Make sure your API keys are correct and that you have projects on Code Inspector."
      );
      return;
    }

    const projects: Project[] = getProjectsQuery.projects;
    const projectsNames = projects.map((p: Project) => p.name);

    // Get the value from all project.
    const value = await vscode.window.showQuickPick(projectsNames, {
      placeHolder:
        "Select the Code Inspector project you want to associate with this VS Code project",
    });

    // Find the selected project
    const selectedProject: Project | undefined = projects.find(
      (p) => p.name === value
    );

    if (!selectedProject) {
      return;
    }

    console.debug(`Changing associated project to ${selectedProject?.id}`);

    // Associate the project identifier with the configuration.
    const currentDocument = vscode.window.activeTextEditor.document;
    const configuration = vscode.workspace.getConfiguration(
      "",
      currentDocument.uri
    );
    const target = vscode.workspace.workspaceFolders
      ? vscode.ConfigurationTarget.WorkspaceFolder
      : vscode.ConfigurationTarget.Global;

    await configuration.update(
      "codiga.associatedProject",
      selectedProject?.id,
      target
    );

    // Show a message to the user that the operation succeeded.
    vscode.window.showInformationMessage(
      `Associating with Code Inspector project: ${selectedProject.name}`
    );
  }
}
