import { writeFileSync } from "node:fs";
import { CHANGES } from "../regressions.ts";

writeFileSync(new URL("../verite.json", import.meta.url), `${JSON.stringify(CHANGES, null, 2)}\n`);
console.log(`verite.json écrit : ${CHANGES.length} changements.`);
