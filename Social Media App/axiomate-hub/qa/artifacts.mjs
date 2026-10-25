import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("./artifacts/", import.meta.url));

export function screenshotPath(filename) {
  fs.mkdirSync(directory, { recursive: true });
  return path.join(directory, filename);
}
