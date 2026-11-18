import { HELP, lancerExploration, lireArguments } from "./src/exploration/cli.ts";
import { loadEnvironment } from "./src/environment.ts";

try {
  loadEnvironment();
  const options = lireArguments(process.argv.slice(2));
  if (!options) console.log(HELP);
  else if ((await lancerExploration(options)).etat !== "fini") process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Exploration impossible ; utiliser --help.");
  process.exitCode = 1;
}
