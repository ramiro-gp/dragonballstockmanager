import type { Seller } from "../lib/types";
import { APP_LIMITS } from "../lib/limits";

export function SettingsPage({
  seller,
  sellers,
  isSuperAdmin,
  navigateCreateSeller,
}: {
  seller: Seller;
  sellers: Seller[];
  isSuperAdmin: boolean;
  navigateCreateSeller: () => void;
}) {
  return (
    <div className="settings-grid">
      <section className="tool-surface">
        <p className="eyebrow">Ajustes</p>
        <h2 className="panel-title">Datos del vendedor</h2>
        <div className="mt-4 grid gap-3">
          <label className="field"><span>Nombre visible</span><input defaultValue={seller.name} maxLength={APP_LIMITS.sellerDisplayNameMaxLength} /></label>
          <label className="field"><span>Email</span><input defaultValue="ramiro@dbstock.app" maxLength={80} /></label>
          <label className="field"><span>WhatsApp</span><input defaultValue="+54 9 11 51354489" maxLength={24} /></label>
          <label className="field"><span>Nueva contraseña</span><input type="password" placeholder="Opcional" maxLength={120} /></label>
        </div>
      </section>

      <section className="tool-surface">
        <p className="eyebrow">Envíos</p>
        <h2 className="panel-title">Opciones visibles al cliente</h2>
        <div className="mt-4 grid gap-3">
          <label className="check-row"><input type="checkbox" defaultChecked={seller.shippingEnabled} /> Realizo envíos</label>
          {["Correo Argentino", "Mercado Libre", "Andreani", "OCA"].map((company) => (
            <label className="check-row" key={company}>
              <input type="checkbox" defaultChecked={seller.shippingCompanies.includes(company)} />
              {company}
            </label>
          ))}
          <label className="field"><span>Otro correo</span><input placeholder="Nombre de la empresa" maxLength={40} /></label>
        </div>
      </section>

      {!isSuperAdmin && (
        <section className="tool-surface">
          <p className="eyebrow">Suscripción</p>
          <h2 className="panel-title">Estado: activo</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Vencimiento: {seller.subscriptionUntil}. Plan actual: vendedor base.</p>
        </section>
      )}

      <section className="tool-surface">
        <p className="eyebrow">Seguridad</p>
        <h2 className="panel-title">Mailing y acceso</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Para backend real conviene usar emails de invitación, recuperación de contraseña y primer acceso seguro.
        </p>
      </section>

      {isSuperAdmin && (
        <section className="tool-surface admin-only settings-wide">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Super admin</p>
              <h2 className="panel-title">Gestión de vendedores</h2>
            </div>
            <button className="primary-button compact" onClick={navigateCreateSeller}>Crear vendedor</button>
          </div>
          <div className="seller-table">
            <div className="seller-row header">
              <span>Vendedor</span>
              <span>WhatsApp</span>
              <span>Estado</span>
              <span>Miembro desde</span>
              <span>Vence</span>
            </div>
            {sellers.map((item) => (
              <div className="seller-row" key={item.id}>
                <span>{item.name}</span>
                <span>{item.whatsapp}</span>
                <strong className={item.status === "active" ? "status-active" : "status-inactive"}>{item.status === "active" ? "Activo" : "Inactivo"}</strong>
                <span>{item.memberSince}</span>
                <span>{item.subscriptionPlan === "lifetime" || item.subscriptionPlan === "owner" ? "Sin vencimiento" : item.subscriptionUntil}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
