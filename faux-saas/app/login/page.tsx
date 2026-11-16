export default async function Login({ searchParams }: { searchParams: Promise<{ suite?: string | string[]; erreur?: string | string[] }> }) {
  const { suite, erreur } = await searchParams;
  const available = Boolean(process.env.FACTURO_LOGIN && process.env.FACTURO_PASSWORD);

  return (
    <main className="login">
      <h1>Facturo</h1>
      {available ? (
        <form method="post" action="/login/envoi">
          <input type="hidden" name="suite" value={typeof suite === "string" ? suite : ""} />
          <label htmlFor="identifiant">Identifiant</label>
          <input id="identifiant" name="identifiant" type="text" />
          <label htmlFor="mot-de-passe">Mot de passe</label>
          <input id="mot-de-passe" name="mot_de_passe" type="password" />
          <button type="submit" className="primary">Se connecter</button>
          {erreur && <p>Identifiant ou mot de passe incorrect</p>}
        </form>
      ) : (
        <p>Connexion indisponible</p>
      )}
    </main>
  );
}
