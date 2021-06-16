import { gql } from "graphql-request";

export const CREATE_FILE_ANALYSIS: string = gql`
  mutation createFileAnalysis(
    $language: LanguageEnumeration!,
    $code: String!,
    $filename: String!,
    $projectId: Long
  ) {
    createFileAnalysis(
      language: $language,
      code: $code,
      filename: $filename,
      projectId: $projectId
    )
    recordAccess(accessType: VsCode, actionType: FileAnalysisRequest)
  }
`;
