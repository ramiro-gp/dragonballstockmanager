export function CreateSellerPage() {
  const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);
  return (
    <section className="tool-surface">
      <p className="eyebrow">Super admin</p>
      <h1 className="panel-title">Crear vendedor</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        El estado se activa automáticamente al crearlo. Si elegís meses, la fecha de vencimiento se calcula desde hoy; si elegís pago único, queda sin vencimiento.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="field"><span>Nombre visible</span><input maxLength={60} placeholder="Nombre del vendedor" /></label>
        <label className="field"><span>Slug público</span><input maxLength={32} placeholder="nombre-vendedor" /></label>
        <label className="field"><span>Email</span><input maxLength={80} placeholder="vendedor@email.com" /></label>
        <label className="field"><span>WhatsApp</span><input maxLength={24} placeholder="+54..." /></label>
        <label className="field">
          <span>Tiempo activo</span>
          <select defaultValue="1">
            {monthOptions.map((month) => <option key={month} value={month}>{month} {month === 1 ? "mes" : "meses"}</option>)}
            <option value="lifetime">Pago único · sin vencimiento</option>
          </select>
        </label>
      </div>
      <button className="primary-button mt-4">Crear vendedor</button>
    </section>
  );
}
