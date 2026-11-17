import { HELP, lancerCommande, lireArguments, UnknownTestsError } from "./src/cli.ts";
import { loadEnvironment } from "./src/environment.ts";

try {
  loadEnvironment();
  const options = lireArguments(process.argv.slice(2));
  if (!options) console.log(HELP);
  else if ((await lancerCommande(options)).passage.etat !== "joue") process.exitCode = 1;
} catch (error) {
  console.error(error instanceof UnknownTestsError ? error.message : "Passage impossible : vérifier les arguments (--help), les clés serveur, Supabase, le vault, Chrome et le pont H.");
  process.exitCode = 1;
}
