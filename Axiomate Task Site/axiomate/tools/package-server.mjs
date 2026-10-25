import { cp, mkdir } from "node:fs/promises";
await mkdir("dist/_server", { recursive: true });
await cp("server", "dist/_server", { recursive: true });
