import { gql } from "graphql-request";

export const CREATE_FILE_ANALYSIS: string = gql`
  mutation createFileAnalysis(
    $language: LanguageEnumeration!
    $code: String!
    $filename: String!
    $projectId: Long
    $parameters: String
  ) {
    createFileAnalysis(
      language: $language
      code: $code
      filename: $filename
      projectId: $projectId
      parameters: $parameters
    )
    recordAccess(accessType: VsCode, actionType: FileAnalysisRequest)
  }
`;
