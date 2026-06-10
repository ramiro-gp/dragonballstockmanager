import { LogIn } from "lucide-react";
import type { Route } from "../app/routes";

export function LoginPage({ login, navigate }: { login: () => void; navigate: (route: Route) => void }) {
  return (
    <div className="auth-layout single">
      <section className="tool-surface auth-card">
        <p className="eyebrow">Acceso vendedor</p>
        <h1 className="hero-title auth-title">Login</h1>
        <div className="mt-5 grid gap-3">
          <label className="field">
            <span>Email</span>
            <input defaultValue="ramiro@dbstock.app" maxLength={80} />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input type="password" defaultValue="dragonball" maxLength={120} />
          </label>
          <button className="primary-button" onClick={login}>
            <LogIn size={18} />
            Entrar
          </button>
          <button className="secondary-button" onClick={() => navigate("/quiero-vender")}>
            Quiero ser vendedor
          </button>
        </div>
      </section>
    </div>
  );
}
