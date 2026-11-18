// Small readers for the two Markdown shapes Horama handles: vault notes and H-format tests.

export function splitFrontMatter(md: string): { meta: Record<string, string>; body: string } {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta: Record<string, string> = {};
  for (const line of m?.[1].split("\n") ?? []) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, "");
  }
  return { meta, body: m ? md.slice(m[0].length) : md };
}

// H-format test: "# title", then "## Setup", "## Task", "## Expected Result", "## Verification".
export function readHTest(markdown: string): { title: string; sections: Record<string, string> } {
  const body = splitFrontMatter(markdown).body.replace(/```regles[\s\S]*?```/, "");
  const [head, ...parts] = body.split(/^## /m);
  const sections = Object.fromEntries(
    parts.map((p) => {
      const i = p.indexOf("\n");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  return { title: head.match(/^# (.+)$/m)?.[1] ?? "", sections };
}

// [[note]] is shown the way Obsidian shows it: the note name, without the brackets.
export const plainText = (text: string) => text.replace(/\[\[([^\]]+)\]\]/g, "$1");
