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
  onUpdateSellerPlan,
  onSaveProfile,
  onChangePassword,
}: {
  seller: Seller;
  sellers: Seller[];
  isSuperAdmin: boolean;
  navigateCreateSeller: () => void;
  onUpdateSellerPlan: (sellerId: string, input: { active: boolean; months: number; lifetime: boolean }) => Promise<boolean>;
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
  const [adminDrafts, setAdminDrafts] = useState<Record<string, { active: boolean; months: number; lifetime: boolean }>>({});

  useEffect(() => {
    setName(seller.name);
    setWhatsapp(seller.whatsapp);
    setLocation(seller.location);
    setShippingEnabled(seller.shippingEnabled);
    setShippingCompanies(seller.shippingCompanies);
  }, [seller]);
  useEffect(() => {
    setAdminDrafts(
      Object.fromEntries(
        sellers.map((item) => [
          item.id,
          {
            active: item.status === "active",
            months: 1,
            lifetime: item.subscriptionPlan === "lifetime" || item.subscriptionPlan === "owner",
          },
        ]),
      ),
    );
  }, [sellers]);

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

  function updateAdminDraft(sellerId: string, patch: Partial<{ active: boolean; months: number; lifetime: boolean }>) {
    setAdminDrafts((current) => ({
      ...current,
      [sellerId]: {
        active: current[sellerId]?.active ?? true,
        months: current[sellerId]?.months ?? 1,
        lifetime: current[sellerId]?.lifetime ?? false,
        ...patch,
      },
    }));
  }

  async function saveAdminSellerPlan(sellerId: string) {
    const draft = adminDrafts[sellerId];
    if (!draft) return;
    setSaving(true);
    await onUpdateSellerPlan(sellerId, draft);
    setSaving(false);
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
              <span>Desde</span>
              <span>Vence</span>
              <span>Renovar</span>
              <span></span>
            </div>
            {sellers.map((item) => (
              <div className="seller-row" key={item.id}>
                <span>{item.name}</span>
                <span>{item.whatsapp}</span>
                <div className="view-toggle two-choice admin-toggle">
                  <button className={(adminDrafts[item.id]?.active ?? item.status === "active") ? "active" : ""} onClick={() => updateAdminDraft(item.id, { active: true })}>Activo</button>
                  <button className={!(adminDrafts[item.id]?.active ?? item.status === "active") ? "active" : ""} onClick={() => updateAdminDraft(item.id, { active: false })}>Pausado</button>
                </div>
                <span>{item.memberSince}</span>
                <span>{item.subscriptionPlan === "lifetime" || item.subscriptionPlan === "owner" ? "Sin vencimiento" : item.subscriptionUntil}</span>
                <div className="admin-renewal">
                  <select
                    value={adminDrafts[item.id]?.lifetime ? "lifetime" : String(adminDrafts[item.id]?.months ?? 1)}
                    onChange={(event) => {
                      const value = event.target.value;
                      updateAdminDraft(item.id, { lifetime: value === "lifetime", months: value === "lifetime" ? 1 : Number(value) });
                    }}
                    disabled={item.subscriptionPlan === "owner"}
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                      <option key={month} value={month}>{month} {month === 1 ? "mes" : "meses"}</option>
                    ))}
                    <option value="lifetime">Pago unico</option>
                  </select>
                </div>
                <button className="primary-button compact" onClick={() => saveAdminSellerPlan(item.id)} disabled={saving || item.subscriptionPlan === "owner"}>
                  Guardar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
