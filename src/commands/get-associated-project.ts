import * as vscode from "vscode";
import { Project } from "../graphql-api/types";
import { doQuery } from "../graphql-api/client";
import { GET_PROJECTS } from "../graphql-api/queries";
import { getAssociatedProjectIdentifier } from "../utils/configurationUtils";

/**
 * Command to show an information with the current associated project.
 * @returns nothing
 */
export async function getAssociatedProject(): Promise<void> {
  // Get the current value
  const currentValue = getAssociatedProjectIdentifier();

  if (!currentValue) {
    vscode.window.showInformationMessage(
      "No project configured, associate a project first"
    );
    return;
  }

  // Get the list of all projects.
  const getProjectsQuery = await doQuery(GET_PROJECTS);

  // Get the list of all projects for the current user
  if (!getProjectsQuery) {
    vscode.window.showInformationMessage(
      "No project found. Make sure your API keys are correct and that you have projects on Code Inspector."
    );
    return;
  }

  const projects: Project[] = getProjectsQuery.projects;

  // Find the associated project.
  const project: Project | undefined = projects.find(
    (p) => p.id === currentValue
  );

  if (!project) {
    vscode.window.showInformationMessage("Associated project not found.");
    return;
  }

  // Show the information to the user.
  vscode.window.showInformationMessage(
    `Code Inspector project: ${project.name} (${project.repository?.url})`
  );
}
