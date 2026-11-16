import { existsSync } from "node:fs";
import path from "node:path";
import type { ScreenshotImage } from "../components/Screenshot";

// A local screenshot (served from public/) may not have been dropped yet: the screen then shows a frame with the expected file name.
export const screenshot = (url: string): ScreenshotImage => ({
  url,
  nom: path.basename(url),
  disponible: !url.startsWith("/") || existsSync(path.join(process.cwd(), "public", url)),
});
