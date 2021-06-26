import { doQuery } from "./client";
import { GET_USER } from "./queries";
import { User } from "./types";

export async function getUser(): Promise<User | undefined> {
  const query = await doQuery(GET_USER);

  if (!query || query.error || query.errors) {
    return undefined;
  } else {
    return query.user;
  }
}
