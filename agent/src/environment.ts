import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

export function loadEnvironment(path: string | URL = new URL("../../.env.local", import.meta.url)): void {
  if (existsSync(path)) loadEnvFile(path);
}
