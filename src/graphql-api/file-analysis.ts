import { doMutation, doQuery } from "./client";
import { FileAnalysisViolation } from "./types";
import { CREATE_FILE_ANALYSIS } from "./mutations";
import {
  POLLING_DEADLINE_MILLISECONDS,
  POLLING_INTERVAL_MILLISECONDS,
  STATUS_DONE,
  STATUS_ERROR,
} from "../constants";
import { GET_FILE_ANALYSIS } from "./queries";
import { getAssociatedProjectIdentifier } from "../utils/configurationUtils";
import { getUserFingerprint } from "../utils/configurationUtils";

function sleep(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

/**
 * Get the list of violations to report on a particular file.
 *
 * @param filename - the filename to analyse
 * @param content - the content of the code
 * @param language - the language to analyze
 * @param parameters - the analysis parameters separated by ;
 * @returns
 */
export async function getViolations(
  filename: string,
  content: string,
  language: string,
  parameters: string[]
): Promise<FileAnalysisViolation[]> {
  // Convert array of parameters into k1=v1;k2=v2
  const parametersString = parameters.join(";");

  let associatedProjectId: number | null = null;

  const associatedProjectIdentifier = getAssociatedProjectIdentifier();
  if (associatedProjectIdentifier) {
    associatedProjectId = associatedProjectIdentifier;
  }

  // Get the fingerprint from localstorage to initiate the request
  const userFingerprint = getUserFingerprint();

  const variables: Record<string, string | undefined | number | null> = {
    language: language,
    code: content,
    filename: filename,
    projectId: associatedProjectId,
    fingerprint: userFingerprint,
    parameters: parametersString.length > 0 ? parametersString : null,
  };

  // First, we create a file analysis through the API
  const fileAnalysis = await doMutation(CREATE_FILE_ANALYSIS, variables);

  if (!fileAnalysis) {
    console.debug("no file analysis created");
    return [];
  }

  const fileAnalysisIdentifier: number = fileAnalysis.createFileAnalysis;

  const deadline: number = new Date().getTime() + POLLING_DEADLINE_MILLISECONDS;
  let now = new Date().getTime();

  while (now < deadline) {
    const fileAnalysis = await doQuery(GET_FILE_ANALYSIS, {
      identifier: fileAnalysisIdentifier,
      fingerprint: userFingerprint,
    });

    if (!fileAnalysis) {
      console.debug("no file analysis found");
      return [];
    }

    if (fileAnalysis.getFileAnalysis) {
      const status = fileAnalysis.getFileAnalysis.status;

      if (status === STATUS_ERROR) {
        console.debug("analysis error");
        return [];
      }

      if (status === STATUS_DONE) {
        const analysisViolations: [FileAnalysisViolation] =
          fileAnalysis.getFileAnalysis.violations;
        const analysisToReturn: FileAnalysisViolation[] =
          analysisViolations.map((violation) => {
            return {
              id: violation.id,
              language: violation.language,
              description: violation.description,
              severity: violation.severity,
              category: violation.category,
              filename: fileAnalysis.getFileAnalysis.filename,
              line: violation.line,
              lineCount: violation.lineCount,
              tool: violation.tool,
              rule: violation.rule,
              ruleUrl: violation.ruleUrl,
            };
          });
        return analysisToReturn;
      }
    }

    await sleep(POLLING_INTERVAL_MILLISECONDS);
    now = new Date().getTime();
  }

  console.debug("analysis timeout");

  return [];
}
