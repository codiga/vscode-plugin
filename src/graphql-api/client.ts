import { GraphQLClient } from "graphql-request";
import { GRAPHQL_ENDPOINT } from "../constants";
import { getAccessKey, getSecretKey } from "./configuration";

var client: GraphQLClient;

/**
 * Initialize the GraphQL client that will be used
 * to perform all the GraphQL request.
 */
export function initializeClient(): void {
  client = new GraphQLClient(GRAPHQL_ENDPOINT);
}

function generateHeaders() {
  const accessKey = getAccessKey();
  const secretKey = getSecretKey();

  if (!accessKey || !secretKey) {
    return {};
  }

  const headers = {
    "X-Access-Key": getAccessKey(),
    "X-Secret-Key": getSecretKey(),
  };
  return headers;
}

/**
 * That is the main function to perform a GraphQL query. This is the main function
 * being used across the codebase.
 * @param graphqlQuery
 * @returns
 */
export function doQuery(
  graphqlQuery: string,
  variables: Record<string, string | undefined | null | number> = {}
) {
  const query = client
    .request(graphqlQuery, variables, generateHeaders())
    .catch(() => {
      return undefined;
    });
  return query;
}

/**
 * Similar than doQuery but for a mutation.
 * @param graphqlMutation - mutation to execute
 * @param variables - variable to pass
 * @returns - the result of the mutation or undefined if an error was raised.
 */
export function doMutation(
  graphqlMutation: string,
  variables: Record<string, string | undefined | number | null> = {}
) {
  const query = client
    .request(graphqlMutation, variables, generateHeaders())
    .catch((e) => {
      console.debug(e);
      return undefined;
    });
  return query;
}
