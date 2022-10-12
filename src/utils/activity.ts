/**
 * Set of functions to detect if the user was recently active (or not).
 */

let lastActivityTimestamp: number = Date.now();

/**
 * Report if the editor was active recently. If the editor
 * was not active, we will not refresh the cache.
 * @returns
 */
export const wasActiveRecently = (): boolean => {
  const tenMinutesInMilliseconds = 60 * 10 * 1000;
  const tenMinutesAgo = Date.now() - tenMinutesInMilliseconds;
  return lastActivityTimestamp > tenMinutesAgo;
};

/**
 * Record the timestamp of the last activity to know
 * if we refresh the cache or not.
 */
export const recordLastActivity = (): void => {
  lastActivityTimestamp = Date.now();
};
