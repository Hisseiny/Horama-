// The login of the prototype of Axil (interface/login/), on the team account of the service (#238): POST /tour/session,
// then back to the screen the visitor came from. No example account, no SSO, no forgotten password: the service has
// none. Without connection everything stays readable; the connection only lets one decide.
import { useState, type FormEvent } from "react";
import "../../interface/login/styles.css";
import { Icon } from "../../interface/screen-11-1/Icons";
import { connecter } from "../donnees";
import { Logo, Mascot } from "./Commun";

type Errors = { email?: string; password?: string; service?: string };

export default function Connexion({ retour }: { retour: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: Errors = {};
    if (!email.trim()) next.email = "Indiquez votre adresse e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Cette adresse e-mail n'est pas valide.";
    if (!password) next.password = "Indiquez votre mot de passe.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    if (loading || !validate()) return;
    setLoading(true);
    const result = await connecter(email.trim(), password);
    setLoading(false);
    if (result === "ok") window.location.hash = retour;
    else setErrors({ service: result });
  };

  return (
    <div className="app-shell login-screen is-light">
      <aside className="login-aside">
        <Logo />
        <div className="login-pitch">
          <h1>La tour de contrôle d'Horama.</h1>
          <p>Connecté, vous tranchez chaque cas à relire : c'est un bug, ou c'est voulu. Sans connexion, tout se lit.</p>
        </div>
      </aside>

      <main className="login-main">
        <form className="login-card" onSubmit={signIn} noValidate>
          <p className="card-label">Connexion</p>
          <h2>Compte de l'équipe</h2>
          <p className="login-intro">Le compte d'équipe que vérifie le service Horama.</p>

          <label className="login-field">
            <span>Adresse e-mail</span>
            <input type="email" name="email" autoComplete="email" value={email} aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }} />
            {errors.email && <span className="login-error" id="login-email-error">{errors.email}</span>}
          </label>

          <label className="login-field">
            <span>Mot de passe</span>
            <span className="login-password">
              <input type={showPassword ? "text" : "password"} name="password" autoComplete="current-password" placeholder="Votre mot de passe" value={password}
                aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "login-password-error" : undefined}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }} />
              <button type="button" className="login-reveal" aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </span>
            {errors.password && <span className="login-error" id="login-password-error">{errors.password}</span>}
          </label>

          {errors.service && <p className="login-error" role="alert">{errors.service}</p>}

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
            {!loading && <Icon name="arrow" />}
          </button>

          <p className="login-footer">
            <a className="login-link" href={`#${retour}`}>Revenir à la tour sans se connecter</a>
          </p>
        </form>
      </main>

      <Mascot />
    </div>
  );
}
