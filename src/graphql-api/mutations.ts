import { gql } from "graphql-request";

export const CREATE_FILE_ANALYSIS: string = gql`
  mutation createFileAnalysis(
    $language: LanguageEnumeration!
    $code: String!
    $filename: String!
    $projectId: Long
    $parameters: String
    $fingerprint: String
  ) {
    createFileAnalysis(
      language: $language
      code: $code
      filename: $filename
      projectId: $projectId
      parameters: $parameters
      fingerprint: $fingerprint
    )
    recordAccess(accessType: VsCode, actionType: FileAnalysisRequest)
  }
`;

/**
 * Mutation used to ignore a file, either at the project-scope
 * or file-scope.
 */
export const IGNORE_VIOLATION: string = gql`
  mutation addViolationToIgnore(
    $projectId: Long!
    $description: String!
    $filename: String
    $rule: String!
    $tool: String!
    $language: LanguageEnumeration
  ) {
    addViolationToIgnore(
      projectId: $projectId
      description: $description
      filename: $filename
      rule: $rule
      tool: $tool
      language: $language
    ) {
      filename
      description
    }
  }
`;
