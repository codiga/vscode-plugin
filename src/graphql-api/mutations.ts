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
