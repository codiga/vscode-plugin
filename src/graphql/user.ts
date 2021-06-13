import { doQuery } from "./client";
import { GET_USER } from "./queries";

export async function getUser(): Promise<string | undefined> {
  const query = await doQuery(GET_USER);

  if (!query || query.error || query.errors) {
    return undefined;
  } else {
    return query.data.user.username;
  }
}
