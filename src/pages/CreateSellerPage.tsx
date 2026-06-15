import { useMemo, useState } from "react";
import { isValidArgentinaWhatsapp, normalizeArgentinaWhatsapp, whatsappHint } from "../lib/whatsapp";

const provinces = [
  "CABA", "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Cordoba", "Corrientes", "Entre Rios",
  "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquen", "Rio Negro",
  "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucuman",
];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CreateSellerInput = {
  userId: string;
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
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [location, setLocation] = useState("CABA");
  const [planValue, setPlanValue] = useState("1");
  const [saving, setSaving] = useState(false);

  const normalizedSlug = useMemo(() => normalizeSlug(slug || displayName), [displayName, slug]);
  const valid = uuidPattern.test(userId.trim())
    && normalizedSlug.length >= 3
    && displayName.trim().length >= 2
    && isValidArgentinaWhatsapp(whatsapp);

  async function createSeller() {
    if (!valid) return;
    setSaving(true);
    const ok = await onCreateSeller({
      userId: userId.trim(),
      slug: normalizedSlug,
      displayName: displayName.trim(),
      whatsapp: normalizeArgentinaWhatsapp(whatsapp),
      location,
      months: planValue === "lifetime" ? 1 : Number(planValue),
      lifetime: planValue === "lifetime",
    });
    setSaving(false);

    if (ok) {
      setUserId("");
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
        Primero crea el usuario en Supabase Auth y copia su User UID. Este formulario crea el perfil vendedor, su link publico y sus ajustes iniciales.
      </p>

      <div className="mt-4 assistant-summary">
        <span><strong>Paso 1:</strong> Supabase &gt; Authentication &gt; Users &gt; Add user.</span>
        <span><strong>Paso 2:</strong> Copia el User UID del usuario creado.</span>
        <span><strong>Paso 3:</strong> Completa este formulario y guarda el perfil vendedor.</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="field">
          <span>User UID de Supabase</span>
          <input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
        </label>
        <label className="field">
          <span>Nombre visible</span>
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} placeholder="Nombre del vendedor" />
        </label>
        <label className="field">
          <span>Slug publico</span>
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
            <option value="lifetime">Pago unico - sin vencimiento</option>
          </select>
        </label>
      </div>

      <p className={isValidArgentinaWhatsapp(whatsapp) ? "field-hint" : "field-hint error"}>{whatsappHint(whatsapp)}</p>
      {userId && !uuidPattern.test(userId.trim()) && <p className="field-hint error">El User UID tiene que ser un UUID valido de Supabase Auth.</p>}
      <p className="field-hint">Link publico: /{normalizedSlug || "slug-vendedor"}/stock</p>

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
