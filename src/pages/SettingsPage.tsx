import { useEffect, useState } from "react";
import type { Seller, SellerProfilePatch } from "../lib/types";
import { APP_LIMITS } from "../lib/limits";
import { isValidArgentinaWhatsapp, normalizeArgentinaWhatsapp, whatsappHint } from "../lib/whatsapp";

const shippingOptions = ["Correo Argentino", "Mercado Libre", "Andreani", "OCA"];
const provinces = [
  "CABA", "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Cordoba", "Corrientes", "Entre Rios",
  "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquen", "Rio Negro",
  "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucuman",
];

export function SettingsPage({
  seller,
  sellers,
  isSuperAdmin,
  navigateCreateSeller,
  onSaveProfile,
  onChangePassword,
}: {
  seller: Seller;
  sellers: Seller[];
  isSuperAdmin: boolean;
  navigateCreateSeller: () => void;
  onSaveProfile: (patch: SellerProfilePatch) => Promise<boolean>;
  onChangePassword: (password: string) => Promise<boolean>;
}) {
  const [name, setName] = useState(seller.name);
  const [whatsapp, setWhatsapp] = useState(seller.whatsapp);
  const [location, setLocation] = useState(seller.location);
  const [shippingEnabled, setShippingEnabled] = useState(seller.shippingEnabled);
  const [shippingCompanies, setShippingCompanies] = useState<string[]>(seller.shippingCompanies);
  const [otherShipping, setOtherShipping] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(seller.name);
    setWhatsapp(seller.whatsapp);
    setLocation(seller.location);
    setShippingEnabled(seller.shippingEnabled);
    setShippingCompanies(seller.shippingCompanies);
  }, [seller]);

  function toggleShipping(company: string) {
    setShippingCompanies((current) =>
      current.includes(company) ? current.filter((item) => item !== company) : [...current, company],
    );
  }

  function addOtherShipping() {
    const value = otherShipping.trim();
    if (!value) return;
    setShippingCompanies((current) => Array.from(new Set([...current, value])));
    setOtherShipping("");
  }

  async function saveProfile() {
    if (!name.trim() || !isValidArgentinaWhatsapp(whatsapp)) return;
    const ok = await save({
      name: name.trim(),
      whatsapp: normalizeArgentinaWhatsapp(whatsapp),
      location,
      shippingEnabled,
      shippingCompanies,
    });

    if (ok && password && !passwordMismatch) {
      const passwordOk = await onChangePassword(password);
      if (passwordOk) {
        setPassword("");
        setPasswordConfirm("");
      }
    }
  }

  async function saveShipping() {
    await save({
      name: name.trim(),
      whatsapp: normalizeArgentinaWhatsapp(whatsapp),
      location,
      shippingEnabled,
      shippingCompanies: shippingEnabled ? shippingCompanies : [],
    });
  }

  async function save(patch: SellerProfilePatch) {
    setSaving(true);
    const ok = await onSaveProfile(patch);
    setSaving(false);
    if (ok) setWhatsapp(patch.whatsapp);
    return ok;
  }

  const passwordMismatch = Boolean(password || passwordConfirm) && password !== passwordConfirm;

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
            <span>Ubicacion</span>
            <select value={location} onChange={(event) => setLocation(event.target.value)}>
              {provinces.map((province) => <option key={province} value={province}>{province}</option>)}
            </select>
          </label>
          <label className="field">
            <span>WhatsApp</span>
            <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} maxLength={24} placeholder="11 1234 5678" />
          </label>
          <p className={isValidArgentinaWhatsapp(whatsapp) ? "field-hint" : "field-hint error"}>{whatsappHint(whatsapp)}</p>
          <label className="field">
            <span>Nueva contrasena</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Opcional" maxLength={120} />
          </label>
          <label className="field">
            <span>Confirmar nueva contrasena</span>
            <input value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} type="password" placeholder="Repeti la contrasena" maxLength={120} />
          </label>
          {passwordMismatch && <p className="field-hint error">Las contrasenas no coinciden.</p>}
          <button className="primary-button compact" onClick={saveProfile} disabled={saving || passwordMismatch || !isValidArgentinaWhatsapp(whatsapp) || !name.trim()}>
            {saving ? "Guardando..." : "Guardar datos"}
          </button>
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
          {shippingCompanies.filter((company) => !shippingOptions.includes(company)).length > 0 && (
            <div className="chip-list">
              {shippingCompanies.filter((company) => !shippingOptions.includes(company)).map((company) => (
                <button key={company} className="chip-remove" onClick={() => setShippingCompanies((current) => current.filter((item) => item !== company))}>
                  {company} x
                </button>
              ))}
            </div>
          )}
          <div className="inline-field">
            <label className="field">
              <span>Otro correo</span>
              <input value={otherShipping} onChange={(event) => setOtherShipping(event.target.value)} placeholder="Nombre de la empresa" maxLength={40} disabled={!shippingEnabled} />
            </label>
            <button className="secondary-button compact" onClick={addOtherShipping} disabled={!shippingEnabled || !otherShipping.trim()}>Agregar</button>
          </div>
          <button className="primary-button compact" onClick={saveShipping} disabled={saving}>
            {saving ? "Guardando..." : "Guardar envios"}
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
