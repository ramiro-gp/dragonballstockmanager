import { type FormEvent, useState } from "react";
import { LogIn } from "lucide-react";
import type { Route } from "../app/routes";

type LoginPageProps = {
  login: (email: string, password: string) => Promise<void>;
  navigate: (route: Route) => void;
  authLoading: boolean;
  authError: string;
};

export function LoginPage({ login, navigate, authLoading, authError }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await login(email, password);
  }

  return (
    <div className="auth-layout single">
      <section className="tool-surface auth-card">
        <p className="eyebrow">Acceso vendedor</p>
        <h1 className="hero-title auth-title">Login</h1>
        <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              maxLength={80}
              required
            />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              maxLength={120}
              required
            />
          </label>
          {authError && <p className="form-error">{authError}</p>}
          <button className="primary-button" type="submit" disabled={authLoading}>
            <LogIn size={18} />
            {authLoading ? "Entrando..." : "Entrar"}
          </button>
          <button className="secondary-button" type="button" onClick={() => navigate("/quiero-vender")}>
            Quiero ser vendedor
          </button>
        </form>
      </section>
    </div>
  );
}
