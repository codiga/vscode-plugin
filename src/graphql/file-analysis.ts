import { doMutation, doQuery } from "./client";
import { FileAnalysisViolation } from "./types";
import { CREATE_FILE_ANALYSIS } from "./mutations";
import { POLLING_DEADLINE_MILLISECONDS, POLLING_INTERVAL_MILLISECONDS, STATUS_DONE, STATUS_ERROR } from "../constants";
import { GET_FILE_ANALYSIS } from "./queries";

function sleep(time: number){
    return new Promise((resolve)=>setTimeout(resolve,time));
}

export async function getViolations(
  filename: string,
  content: string,
  language: string
): Promise<FileAnalysisViolation[]> {
  const variables: Record<string, string | undefined | null> = {
    language: language,
    code: content,
    filename: filename,
    projectId: null,
  };

  // First, we create a file analysis through the API
  const fileAnalysis = await doMutation(CREATE_FILE_ANALYSIS, variables);

  if (! fileAnalysis) {
    console.debug('no file analysis created');
    return [];
  }

  const fileAnalysisIdentifier: number = fileAnalysis.data.createFileAnalysis;


  const deadline: number = new Date().getTime() + POLLING_DEADLINE_MILLISECONDS;
  var now = new Date().getTime();

  while (now < deadline) {
    const fileAnalysis = await doQuery(
      GET_FILE_ANALYSIS, {"identifier": fileAnalysisIdentifier}, true);
    
    if (!fileAnalysis){
      console.debug('no file analysis found');
      return [];
    }

    if (fileAnalysis.data.getFileAnalysis) {
      const status = fileAnalysis.data.getFileAnalysis.status;

      if (status === STATUS_ERROR) {
        console.debug('analysis error');
        return [];
      }

      if (status === STATUS_DONE) {
        const analysisViolations: [Record<any, any>] = fileAnalysis.data.getFileAnalysis.violations;
        const analysisToReturn = analysisViolations.map((violation) => {
          return {
            identifier: violation.id,
            language: violation.language,
            description: violation.description,
            severity: violation.severity,
            category: violation.category,
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

  console.debug('analysis timeout');

  return [];
}
