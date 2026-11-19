// The list of the files of the vault of the clone, written at build time: the page reads it instead of the trees API of
// GitHub, limited to 60 calls per hour and per IP without a key (a jury behind the one IP of the school would exhaust
// it). The contents of the notes are still read online, on raw.githubusercontent.com, which has no such limit.
// Run from anywhere in the repository, after `git fetch origin dev`: node automatisation/tour/scripts/manifeste-vault.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const PREFIX = "vault-horama/eugenia-clone/";
const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

const fichiers = git("ls-tree", "-r", "--name-only", "origin/dev", "--", PREFIX).split("\n").filter(Boolean);
const manifeste = {
  format: "horama-vault-manifeste-1",
  depot: "Hisseiny/Horama-",
  branche: "dev",
  commit: git("rev-parse", "--short", "origin/dev"),
  genere_le: new Date().toISOString(),
  fichiers,
};
const out = join(root, "automatisation/tour/public/vault-manifeste.json");
writeFileSync(out, `${JSON.stringify(manifeste, null, 2)}\n`);
console.log(`${fichiers.length} fichiers du vault au commit ${manifeste.commit} : ${out}`);
