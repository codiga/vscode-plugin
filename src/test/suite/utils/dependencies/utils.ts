const path = require("path");

export function getDataFile(filename: string): string {
  const completePath = `${__dirname}${path.sep}data${path.sep}${filename}`;
  return completePath;
}
