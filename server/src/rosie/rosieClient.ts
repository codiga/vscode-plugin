import {RosieResponse, Rule, RuleResponse} from "./rosieTypes";
import { asRelativePath, getLanguageForFile } from '../utils/fileUtils';
import {getRosieLanguage} from "./rosieLanguage";
import axios from "axios";
import {ROSIE_ENDPOINT_PROD} from "./rosieConstants";
import { TextDocument } from 'vscode-languageserver-textdocument';
import {getMockRuleResponses as getMockRuleResponses} from "./rosieClientMocks";
import * as console from '../utils/connectionLogger';

/**
 * Sends a request to Rosie for the current document, and returns the received rule responses.
 *
 * An empty array is returned when
 * <ul>
 *   <li>The current document's language is not supported by Rosie.</li>
 *   <li>There is no response from Rosie.</li>
 *   <li>An error occurred during processing the request and response.</li>
 * <ul>
 *
 * @param document - the document being analyzed
 * @param rules - the list of rules
 * @returns - the list of rule responses received from Rosie, or empty
 */
export const getRuleResponses = async (
  document: TextDocument,
  rules: Rule[]
): Promise<RuleResponse[]> => {
  if (global.isInTestMode) {
    return getMockRuleResponses(document);
  }

  const relativePath = asRelativePath(document);
  const language = getLanguageForFile(relativePath);
  const rosieLanguage = getRosieLanguage(language);

  if (!rosieLanguage) {
    // console.log("language not supported by Rosie");
    return [];
  }

  // Convert the code to Base64
  const codeBuffer = Buffer.from(document.getText());
  const codeBase64 = codeBuffer.toString("base64");

  // Build the request post data
  const data = {
    filename: relativePath,
    fileEncoding: "utf-8",
    language: rosieLanguage,
    codeBase64: codeBase64,
    rules: rules,
    logOutput: false,
  };

  try {
    // Make the initial request to Rosie
    const response = await axios.post<RosieResponse>(ROSIE_ENDPOINT_PROD, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response || !response.data) {
      // console.log("no response from Rosie");
      return [];
    }

    return response.data.ruleResponses as RuleResponse[];
  } catch (err) {
    console.log(`ERROR: ${err}`);
    return [];
  }
};
