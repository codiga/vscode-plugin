import { gql } from "@apollo/client/core";
import { DocumentNode } from "graphql/language/ast";

export const CREATE_FILE_ANALYSIS: DocumentNode = gql`
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
