import { useEffect, useState } from "react";
import type { Seller, SellerProfilePatch } from "../lib/types";
import { APP_LIMITS } from "../lib/limits";
import { isValidArgentinaWhatsapp, normalizeArgentinaWhatsapp, whatsappHint } from "../lib/whatsapp";

const shippingOptions = ["Correo Argentino", "Mercado Libre", "Andreani", "OCA"];

export function SettingsPage({
  seller,
  sellers,
  isSuperAdmin,
  navigateCreateSeller,
  onSaveProfile,
}: {
  seller: Seller;
  sellers: Seller[];
  isSuperAdmin: boolean;
  navigateCreateSeller: () => void;
  onSaveProfile: (patch: SellerProfilePatch) => Promise<boolean>;
}) {
  const [name, setName] = useState(seller.name);
  const [whatsapp, setWhatsapp] = useState(seller.whatsapp);
  const [shippingEnabled, setShippingEnabled] = useState(seller.shippingEnabled);
  const [shippingCompanies, setShippingCompanies] = useState<string[]>(seller.shippingCompanies);
  const [otherShipping, setOtherShipping] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(seller.name);
    setWhatsapp(seller.whatsapp);
    setShippingEnabled(seller.shippingEnabled);
    setShippingCompanies(seller.shippingCompanies);
  }, [seller]);

  function toggleShipping(company: string) {
    setShippingCompanies((current) =>
      current.includes(company) ? current.filter((item) => item !== company) : [...current, company],
    );
  }

  async function saveProfile() {
    if (!name.trim()) return;
    if (!isValidArgentinaWhatsapp(whatsapp)) return;

    setSaving(true);
    const normalizedWhatsapp = normalizeArgentinaWhatsapp(whatsapp);
    const companies = [...shippingCompanies, otherShipping.trim()].filter(Boolean);
    const ok = await onSaveProfile({
      name: name.trim(),
      whatsapp: normalizedWhatsapp,
      shippingEnabled,
      shippingCompanies: shippingEnabled ? Array.from(new Set(companies)) : [],
    });
    setSaving(false);
    if (ok) setWhatsapp(normalizedWhatsapp);
  }

  return (
    <div className="settings-grid">
      <section className="tool-surface">
        <p className="eyebrow">Ajustes</p>
        <h2 className="panel-title">Datos del vendedor</h2>
        <div className="mt-4 grid gap-3">
          <label className="field">
            <span>Nombre visible</span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={APP_LIMITS.sellerDisplayNameMaxLength} />
          </label>
          <label className="field">
            <span>WhatsApp</span>
            <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} maxLength={24} placeholder="11 1234 5678" />
          </label>
          <p className={isValidArgentinaWhatsapp(whatsapp) ? "field-hint" : "field-hint error"}>{whatsappHint(whatsapp)}</p>
          <label className="field">
            <span>Nueva contrasena</span>
            <input type="password" placeholder="Opcional" maxLength={120} disabled />
          </label>
        </div>
      </section>

      <section className="tool-surface">
        <p className="eyebrow">Envios</p>
        <h2 className="panel-title">Opciones visibles al cliente</h2>
        <div className="mt-4 grid gap-3">
          <label className="check-row">
            <input type="checkbox" checked={shippingEnabled} onChange={(event) => setShippingEnabled(event.target.checked)} />
            Realizo envios
          </label>
          {shippingOptions.map((company) => (
            <label className="check-row" key={company}>
              <input type="checkbox" checked={shippingCompanies.includes(company)} onChange={() => toggleShipping(company)} disabled={!shippingEnabled} />
              {company}
            </label>
          ))}
          <label className="field">
            <span>Otro correo</span>
            <input value={otherShipping} onChange={(event) => setOtherShipping(event.target.value)} placeholder="Nombre de la empresa" maxLength={40} disabled={!shippingEnabled} />
          </label>
          <button className="primary-button compact" onClick={saveProfile} disabled={saving || !isValidArgentinaWhatsapp(whatsapp) || !name.trim()}>
            {saving ? "Guardando..." : "Guardar ajustes"}
          </button>
        </div>
      </section>

      {!isSuperAdmin && (
        <section className="tool-surface">
          <p className="eyebrow">Suscripcion</p>
          <h2 className="panel-title">Estado: {seller.status === "active" ? "activo" : "inactivo"}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Vencimiento: {seller.subscriptionUntil}. Plan actual: vendedor base.</p>
        </section>
      )}

      {isSuperAdmin && (
        <section className="tool-surface admin-only settings-wide">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Super admin</p>
              <h2 className="panel-title">Gestion de vendedores</h2>
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
