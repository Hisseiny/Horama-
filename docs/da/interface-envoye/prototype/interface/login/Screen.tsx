import { useState, type FormEvent } from "react";
import { usePrototype } from "../../src/PrototypeContext";
import { Icon } from "../screen-11-1/Icons";
import "./styles.css";

function Logo() {
  return (
    <div className="brand login-brand" aria-label="Horama">
      <span>H</span>
      <svg className="brand-eye" viewBox="26 26 44 44" aria-hidden="true">
        <circle cx="48" cy="48" r="20" fill="#fff" stroke="#1C1C1C" strokeWidth="3" />
        <circle cx="48" cy="48" r="10.5" fill="#7F77DD" />
        <circle cx="48" cy="48" r="4.6" fill="#1C1C1C" />
        <circle cx="51.6" cy="44.4" r="2.2" fill="#fff" />
      </svg>
      <span>rama</span>
    </div>
  );
}

function Mascot() {
  return (
    <div className="mascot login-mascot" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 4 96 66">
        <g fill="#AFA9EC" stroke="#1C1C1C" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M30 46C24 30 10 24 2 28c6 3 7 7 5 10 5 1 7 5 5 8 5 1 8 5 7 9 5-1 9-4 11-9Z" />
          <path d="M66 46C72 30 86 24 94 28c-6 3-7 7-5 10-5 1-7 5-5 8-5 1-8 5-7 9-5-1-9-4-11-9Z" />
        </g>
        <circle cx="48" cy="48" r="20" fill="#fff" stroke="#1C1C1C" strokeWidth="3" />
        <circle cx="48" cy="48" r="10.5" fill="#7F77DD" />
        <circle cx="48" cy="48" r="4.6" fill="#1C1C1C" />
        <circle cx="51.6" cy="44.4" r="2.2" fill="#fff" />
      </svg>
    </div>
  );
}

type Errors = { email?: string; password?: string };

export default function LoginScreen() {
  const { lightMode, toggleTheme, showToast } = usePrototype();
  const [email, setEmail] = useState("jane.doe@facturo.fr");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: Errors = {};
    if (!email.trim()) next.email = "Indiquez votre adresse e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "Cette adresse e-mail n'est pas valide.";
    if (!password) next.password = "Indiquez votre mot de passe.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const signIn = (event: FormEvent) => {
    event.preventDefault();
    if (loading || !validate()) return;
    setLoading(true);
    window.setTimeout(() => {
      showToast("Connexion réussie. Bonjour, Jane.");
      window.location.hash = "";
    }, 600);
  };

  const forgotPassword = () => {
    if (!email.trim()) {
      setErrors({ email: "Indiquez votre adresse e-mail pour recevoir le lien." });
      return;
    }
    showToast(`Lien de réinitialisation envoyé à ${email.trim()}`);
  };

  return (
    <div className={`app-shell login-screen${lightMode ? " is-light" : ""}`}>
      <aside className="login-aside">
        <Logo />
        <div className="login-pitch">
          <h1>Vos écrans, vérifiés à chaque version.</h1>
          <p>
            Horama passe sur votre produit comme un utilisateur. Vous relisez seulement ce qui a
            changé.
          </p>
        </div>
        <button className="theme-toggle login-theme" type="button" onClick={toggleTheme}>
          <Icon name={lightMode ? "moon" : "sun"} />
          {lightMode ? "Mode sombre" : "Mode clair"}
        </button>
      </aside>

      <main className="login-main">
        <form className="login-card" onSubmit={signIn} noValidate>
          <p className="card-label">Connexion</p>
          <h2>Bon retour</h2>
          <p className="login-intro">Connectez-vous pour retrouver vos passages.</p>

          <label className="login-field">
            <span>Adresse e-mail</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
            />
            {errors.email && (
              <span className="login-error" id="login-email-error">
                {errors.email}
              </span>
            )}
          </label>

          <label className="login-field">
            <span className="login-field-head">
              <span>Mot de passe</span>
              <button type="button" className="login-link" onClick={forgotPassword}>
                Mot de passe oublié ?
              </button>
            </span>
            <span className="login-password">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Votre mot de passe"
                value={password}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "login-password-error" : undefined}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
              />
              <button
                type="button"
                className="login-reveal"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </span>
            {errors.password && (
              <span className="login-error" id="login-password-error">
                {errors.password}
              </span>
            )}
          </label>

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
            {!loading && <Icon name="arrow" />}
          </button>

          <div className="login-divider" role="separator">
            <span>ou</span>
          </div>

          <button
            className="login-sso"
            type="button"
            onClick={() => {
              showToast("Connexion par SSO réussie. Bonjour, Jane.");
              window.location.hash = "";
            }}
          >
            Continuer avec le SSO de l'entreprise
          </button>

          <p className="login-footer">
            Pas encore de compte ?{" "}
            <button
              type="button"
              className="login-link"
              onClick={() => showToast("Demande d'accès envoyée à l'administrateur de Facturo")}
            >
              Demander un accès
            </button>
          </p>
        </form>
      </main>

      <Mascot />
    </div>
  );
}
