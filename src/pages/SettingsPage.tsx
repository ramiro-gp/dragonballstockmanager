import { useEffect, useMemo, useState } from "react";
import type { Seller, SellerProfilePatch } from "../lib/types";
import { APP_LIMITS } from "../lib/limits";
import { isValidArgentinaWhatsapp, normalizeArgentinaWhatsapp, whatsappHint } from "../lib/whatsapp";

const shippingOptions = ["Correo Argentino", "Mercado Libre", "Andreani", "OCA"];
const provinces = [
  "CABA", "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos",
  "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
  "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

type AdminDraft = { active: boolean; months: number; lifetime: boolean };

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
  onUpdateSellerPlan: (sellerId: string, input: AdminDraft) => Promise<boolean>;
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
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);
  const [savingSellerId, setSavingSellerId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [adminDrafts, setAdminDrafts] = useState<Record<string, AdminDraft>>({});

  useEffect(() => {
    setName(seller.name);
    setWhatsapp(seller.whatsapp);
    setLocation(seller.location);
    setShippingEnabled(seller.shippingEnabled);
    setShippingCompanies(seller.shippingCompanies);
  }, [seller]);

  useEffect(() => {
    setAdminDrafts(Object.fromEntries(sellers.map((item) => [item.id, draftFromSeller(item)])));
  }, [sellers]);

  const passwordMismatch = Boolean(password || passwordConfirm) && password !== passwordConfirm;
  const passwordTooShort = Boolean(password || passwordConfirm) && password.length > 0 && password.length < 8;
  const profileValid = Boolean(name.trim()) && isValidArgentinaWhatsapp(whatsapp) && !passwordMismatch && !passwordTooShort;
  const customShippingCompanies = useMemo(() => shippingCompanies.filter((company) => !shippingOptions.includes(company)), [shippingCompanies]);

  function toggleShipping(company: string) {
    setFeedback("");
    setShippingCompanies((current) =>
      current.includes(company) ? current.filter((item) => item !== company) : [...current, company],
    );
  }

  function addOtherShipping() {
    const value = otherShipping.trim();
    if (!value) return;
    setFeedback("");
    setShippingCompanies((current) => Array.from(new Set([...current, value])));
    setOtherShipping("");
  }

  async function saveProfile() {
    if (!profileValid) return;
    setSavingProfile(true);
    setFeedback("");

    const ok = await onSaveProfile(buildProfilePatch({ includeShipping: true }));
    if (ok && password) {
      const passwordOk = await onChangePassword(password);
      if (passwordOk) {
        setPassword("");
        setPasswordConfirm("");
      }
    }

    setSavingProfile(false);
    if (ok) setFeedback("Datos del vendedor guardados.");
  }

  async function saveShipping() {
    if (!profileValid) return;
    setSavingShipping(true);
    setFeedback("");
    const ok = await onSaveProfile(buildProfilePatch({ includeShipping: true }));
    setSavingShipping(false);
    if (ok) setFeedback("Envíos guardados.");
  }

  function buildProfilePatch({ includeShipping }: { includeShipping: boolean }): SellerProfilePatch {
    return {
      name: name.trim(),
      whatsapp: normalizeArgentinaWhatsapp(whatsapp),
      location,
      shippingEnabled: includeShipping ? shippingEnabled : seller.shippingEnabled,
      shippingCompanies: includeShipping && shippingEnabled ? shippingCompanies : [],
    };
  }

  function updateAdminDraft(sellerId: string, patch: Partial<AdminDraft>) {
    setFeedback("");
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
    setSavingSellerId(sellerId);
    setFeedback("");
    const ok = await onUpdateSellerPlan(sellerId, draft);
    setSavingSellerId("");
    if (ok) setFeedback("Vendedor actualizado.");
  }

  return (
    <div className="settings-grid">
      {feedback && <p className="save-feedback settings-wide">{feedback}</p>}

      <section className="tool-surface">
        <p className="eyebrow">Ajustes</p>
        <h2 className="panel-title">Datos del vendedor</h2>
        <div className="mt-4 grid gap-3">
          <label className="field">
            <span>Nombre visible</span>
            <input value={name} onChange={(event) => { setName(event.target.value); setFeedback(""); }} maxLength={APP_LIMITS.sellerDisplayNameMaxLength} />
          </label>
          <label className="field">
            <span>Ubicación</span>
            <select value={location} onChange={(event) => { setLocation(event.target.value); setFeedback(""); }}>
              {provinces.map((province) => <option key={province} value={province}>{province}</option>)}
            </select>
          </label>
          <label className="field">
            <span>WhatsApp</span>
            <input value={whatsapp} onChange={(event) => { setWhatsapp(event.target.value); setFeedback(""); }} maxLength={24} placeholder="11 1234 5678" />
          </label>
          <p className={isValidArgentinaWhatsapp(whatsapp) ? "field-hint" : "field-hint error"}>{whatsappHint(whatsapp)}</p>
          <label className="field">
            <span>Nueva contraseña</span>
            <input value={password} onChange={(event) => { setPassword(event.target.value); setFeedback(""); }} type="password" placeholder="Opcional" maxLength={120} />
          </label>
          <label className="field">
            <span>Confirmar nueva contraseña</span>
            <input value={passwordConfirm} onChange={(event) => { setPasswordConfirm(event.target.value); setFeedback(""); }} type="password" placeholder="Repetí la contraseña" maxLength={120} />
          </label>
          {passwordMismatch && <p className="field-hint error">Las contraseñas no coinciden.</p>}
          {passwordTooShort && <p className="field-hint error">La contraseña debe tener al menos 8 caracteres.</p>}
          <p className="field-hint">Si completás contraseña y confirmación, también se actualizará el login.</p>
          <button className="primary-button compact" onClick={saveProfile} disabled={savingProfile || savingShipping || !profileValid}>
            {savingProfile ? "Guardando..." : "Guardar datos"}
          </button>
        </div>
      </section>

      <section className="tool-surface">
        <p className="eyebrow">Envíos</p>
        <h2 className="panel-title">Opciones visibles al cliente</h2>
        <div className="mt-4 grid gap-3">
          <label className="check-row">
            <input type="checkbox" checked={shippingEnabled} onChange={(event) => { setShippingEnabled(event.target.checked); setFeedback(""); }} />
            Realizo envíos
          </label>
          {shippingOptions.map((company) => (
            <label className="check-row" key={company}>
              <input type="checkbox" checked={shippingCompanies.includes(company)} onChange={() => toggleShipping(company)} disabled={!shippingEnabled} />
              {company}
            </label>
          ))}
          {customShippingCompanies.length > 0 && (
            <div className="chip-list">
              {customShippingCompanies.map((company) => (
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
          <button className="primary-button compact" onClick={saveShipping} disabled={savingProfile || savingShipping || !profileValid}>
            {savingShipping ? "Guardando..." : "Guardar envíos"}
          </button>
        </div>
      </section>

      {!isSuperAdmin && (
        <section className="tool-surface">
          <p className="eyebrow">Suscripción</p>
          <h2 className="panel-title">Estado: {seller.status === "active" ? "activo" : "inactivo"}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Vencimiento: {planDateLabel(seller)}. Plan actual: vendedor base.</p>
        </section>
      )}

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
              <span>Desde</span>
              <span>Vence</span>
              <span>Renovar</span>
              <span></span>
            </div>
            {sellers.map((item) => {
              const draft = adminDrafts[item.id] ?? draftFromSeller(item);
              const isOwner = item.subscriptionPlan === "owner";
              const isSavingThisSeller = savingSellerId === item.id;
              return (
                <div className="seller-row" key={item.id}>
                  <span>{item.name}</span>
                  <span>{item.whatsapp}</span>
                  <div className="view-toggle two-choice admin-toggle">
                    <button className={draft.active ? "active" : ""} onClick={() => updateAdminDraft(item.id, { active: true })} disabled={isOwner || isSavingThisSeller}>Activo</button>
                    <button className={!draft.active ? "active" : ""} onClick={() => updateAdminDraft(item.id, { active: false })} disabled={isOwner || isSavingThisSeller}>Pausado</button>
                  </div>
                  <span>{item.memberSince}</span>
                  <span>{planDateLabel(item)}</span>
                  <div className="admin-renewal">
                    <select
                      value={draft.lifetime ? "lifetime" : String(draft.months)}
                      onChange={(event) => {
                        const value = event.target.value;
                        updateAdminDraft(item.id, { lifetime: value === "lifetime", months: value === "lifetime" ? 1 : Number(value) });
                      }}
                      disabled={isOwner || isSavingThisSeller}
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                        <option key={month} value={month}>{month} {month === 1 ? "mes" : "meses"}</option>
                      ))}
                      <option value="lifetime">Pago único</option>
                    </select>
                  </div>
                  <button className="primary-button compact" onClick={() => saveAdminSellerPlan(item.id)} disabled={isOwner || Boolean(savingSellerId)}>
                    {isSavingThisSeller ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function draftFromSeller(seller: Seller): AdminDraft {
  return {
    active: seller.status === "active",
    months: 1,
    lifetime: seller.subscriptionPlan === "lifetime" || seller.subscriptionPlan === "owner",
  };
}

function planDateLabel(seller: Seller) {
  return seller.subscriptionPlan === "lifetime" || seller.subscriptionPlan === "owner" ? "Sin vencimiento" : seller.subscriptionUntil;
}
