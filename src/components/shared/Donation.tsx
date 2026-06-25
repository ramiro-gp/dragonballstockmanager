import { useState } from "react";

const mercadoPagoData = {
  alias: import.meta.env.VITE_MP_ALIAS || "Configurar alias",
  cvu: import.meta.env.VITE_MP_CVU || "Configurar CVU",
  holder: import.meta.env.VITE_MP_HOLDER || "Configurar titular",
  donationUrl: getMercadoPagoDonationUrl(import.meta.env.VITE_MP_DONATION_URL),
};

export function Donation() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="support-box">
        <p className="text-sm font-bold">Apoyá la plataforma</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Si te sirve, podés dejar una mano para mantenerla viva.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a className="small-button" href="https://cafecito.app/ramitag" target="_blank" rel="noopener noreferrer">
            Cafecito
          </a>
          <button className="small-button" onClick={() => setOpen(true)}>Mercado Pago</button>
        </div>
      </div>
      {open && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Donación</p>
                <h3 className="panel-title">Mercado Pago</h3>
              </div>
              <button className="ghost-icon" onClick={() => setOpen(false)} aria-label="Cerrar">X</button>
            </div>
            <div className="mt-4 space-y-3">
              <MercadoPagoLink />
              <CopyRow label="Alias" value={mercadoPagoData.alias} />
              <CopyRow label="CVU" value={mercadoPagoData.cvu} />
              <InfoRow label="Titular" value={mercadoPagoData.holder} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function MercadoPagoButton({ className = "small-button" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>Mercado Pago</button>
      {open && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Donación</p>
                <h3 className="panel-title">Mercado Pago</h3>
              </div>
              <button className="ghost-icon" onClick={() => setOpen(false)} aria-label="Cerrar">X</button>
            </div>
            <div className="mt-4 space-y-3">
              <MercadoPagoLink />
              <CopyRow label="Alias" value={mercadoPagoData.alias} />
              <CopyRow label="CVU" value={mercadoPagoData.cvu} />
              <InfoRow label="Titular" value={mercadoPagoData.holder} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MercadoPagoLink() {
  if (!mercadoPagoData.donationUrl) {
    return <button className="small-button" disabled>Configurá el link de Mercado Pago</button>;
  }

  return (
    <a className="small-button" href={mercadoPagoData.donationUrl} target="_blank" rel="noopener noreferrer">
      Abrir MP
    </a>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copy-row">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <button
        className="small-button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        }}
      >
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

function getMercadoPagoDonationUrl(value: string | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="copy-row no-action">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
