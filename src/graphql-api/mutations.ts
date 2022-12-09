import { gql } from "graphql-request";

export const USE_RECIPE: string = gql`
  mutation recordAccess($fingerprint: String, $recipeId: Long!) {
    recordAccess(
      accessType: VsCode
      actionType: AssistantRecipeUse
      recipeId: $recipeId
      userFingerprint: $fingerprint
    )
  }
`;

export const USE_RULE_FIX: string = gql`
  mutation recordAccess($fingerprint: String, $ruleId: Long) {
    recordAccess(
      accessType: VsCode
      actionType: RuleFix
      ruleId: $ruleId
      userFingerprint: $fingerprint
    )
  }
`;

export const USE_CREATE_CODIGA_YAML: string = gql`
  mutation recordAccess($fingerprint: String) {
    recordAccess(
      accessType: VsCode
      actionType: CreateCodigaYaml
      userFingerprint: $fingerprint
    )
  }
`;
