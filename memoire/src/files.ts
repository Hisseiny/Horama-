import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n/;

export function splitFrontMatter(text: string): { header: Record<string, unknown>; body: string } {
  const match = FRONT_MATTER.exec(text);
  if (!match) return { header: {}, body: text };
  let header: unknown;
  try {
    header = parse(match[1]) ?? {};
  } catch (error) {
    throw new Error(`en-tête YAML invalide (${(error as Error).message.split("\n")[0]})`);
  }
  if (typeof header !== "object" || Array.isArray(header)) throw new Error("en-tête YAML invalide");
  return { header: header as Record<string, unknown>, body: text.slice(match[0].length) };
}

// Plain YAML scalar when it reads back as the same string, double-quoted otherwise.
export function yamlScalar(value: string, flow = false): string {
  try {
    const read = flow ? parse(`[{ k: ${value} }]`)[0].k : parse(`k: ${value}`).k;
    if (read === value) return value;
  } catch {
    // not a valid plain scalar: quoted below
  }
  return JSON.stringify(value);
}

// One-line JSON with spaces inside braces, as in the hand-written tests of the vault.
export function compactJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(compactJson).join(", ")}]`;
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  const fields = Object.entries(value).filter(([, item]) => item !== undefined);
  return `{ ${fields.map(([key, item]) => `${JSON.stringify(key)}: ${compactJson(item)}`).join(", ")} }`;
}

export function listMarkdown(folder: string): string[] {
  return existsSync(folder) ? readdirSync(folder).filter((name) => name.endsWith(".md")).sort() : [];
}

export function derniersFichiers(vault: string, n: number): Array<{ chemin: string; date: string }> {
  return (readdirSync(vault, { recursive: true }) as string[])
    .filter((path) => !path.split(/[\\/]/).some((part) => part.startsWith(".")))
    .map((path) => ({ path, stat: statSync(join(vault, path)) }))
    .filter(({ stat }) => stat.isFile())
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
    .slice(0, n)
    .map(({ path, stat }) => ({ chemin: path, date: stat.mtime.toISOString() }));
}
