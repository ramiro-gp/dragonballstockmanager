import { useMemo, useState } from "react";
import { isValidArgentinaWhatsapp, normalizeArgentinaWhatsapp, whatsappHint } from "../lib/whatsapp";

const provinces = [
  "CABA", "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos",
  "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
  "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

export type CreateSellerInput = {
  email: string;
  password: string;
  slug: string;
  displayName: string;
  whatsapp: string;
  location: string;
  months: number;
  lifetime: boolean;
};

export function CreateSellerPage({
  onCreateSeller,
}: {
  onCreateSeller: (input: CreateSellerInput) => Promise<boolean>;
}) {
  const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [location, setLocation] = useState("CABA");
  const [planValue, setPlanValue] = useState("1");
  const [saving, setSaving] = useState(false);

  const normalizedSlug = useMemo(() => normalizeSlug(slug || displayName), [displayName, slug]);
  const valid = email.includes("@")
    && password.length >= 8
    && normalizedSlug.length >= 3
    && displayName.trim().length >= 2
    && isValidArgentinaWhatsapp(whatsapp);

  async function createSeller() {
    if (!valid) return;
    setSaving(true);
    const ok = await onCreateSeller({
      email: email.trim(),
      password,
      slug: normalizedSlug,
      displayName: displayName.trim(),
      whatsapp: normalizeArgentinaWhatsapp(whatsapp),
      location,
      months: planValue === "lifetime" ? 1 : Number(planValue),
      lifetime: planValue === "lifetime",
    });
    setSaving(false);

    if (ok) {
      setEmail("");
      setPassword("");
      setDisplayName("");
      setSlug("");
      setWhatsapp("");
      setLocation("CABA");
      setPlanValue("1");
    }
  }

  return (
    <section className="tool-surface">
      <p className="eyebrow">Super admin</p>
      <h1 className="panel-title">Crear vendedor</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Crea el login, el perfil vendedor, su link público y sus ajustes iniciales desde una sola pantalla.
      </p>

      <div className="mt-4 assistant-summary">
        <span><strong>Email:</strong> será el usuario con el que el vendedor inicia sesión.</span>
        <span><strong>Contraseña temporal:</strong> pasásela al vendedor y después puede cambiarla en Ajustes.</span>
        <span><strong>Link público:</strong> el slug define la URL /nombre-vendedor/stock.</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="field">
          <span>Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} maxLength={80} placeholder="vendedor@email.com" />
        </label>
        <label className="field">
          <span>Contraseña temporal</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} maxLength={120} placeholder="Mínimo 8 caracteres" />
        </label>
        <label className="field">
          <span>Nombre visible</span>
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} placeholder="Nombre del vendedor" />
        </label>
        <label className="field">
          <span>Slug público</span>
          <input value={slug} onChange={(event) => setSlug(event.target.value)} maxLength={32} placeholder={normalizedSlug || "nombre-vendedor"} />
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
        <label className="field">
          <span>Tiempo activo</span>
          <select value={planValue} onChange={(event) => setPlanValue(event.target.value)}>
            {monthOptions.map((month) => <option key={month} value={month}>{month} {month === 1 ? "mes" : "meses"}</option>)}
            <option value="lifetime">Pago único - sin vencimiento</option>
          </select>
        </label>
      </div>

      <p className={isValidArgentinaWhatsapp(whatsapp) ? "field-hint" : "field-hint error"}>{whatsappHint(whatsapp)}</p>
      {password && password.length < 8 && <p className="field-hint error">La contraseña temporal debe tener al menos 8 caracteres.</p>}
      <p className="field-hint">Link público: /{normalizedSlug || "slug-vendedor"}/stock</p>

      <button className="primary-button mt-4" disabled={!valid || saving} onClick={createSeller}>
        {saving ? "Creando..." : "Crear perfil vendedor"}
      </button>
    </section>
  );
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}
