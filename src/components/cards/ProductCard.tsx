import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { CartLine, Product } from "../../lib/types";
import { availableProductQuantity, formatMoney } from "../../lib/helpers";
import { sanitizeExternalImageUrl } from "../../lib/security";

export function ProductCard({
  product,
  addToCart,
  canBuy,
}: {
  product: Product;
  addToCart: (line: CartLine) => void;
  canBuy: boolean;
}) {
  const [imageOpen, setImageOpen] = useState(false);
  const available = availableProductQuantity(product);
  const imageUrl = sanitizeExternalImageUrl(product.imageUrl);

  useEffect(() => {
    if (!imageOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setImageOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [imageOpen]);

  return (
    <article className="product-card">
      <button className="product-image-button" onClick={() => setImageOpen(true)} aria-label={`Ampliar imagen de ${product.name}`}>
        <img src={imageUrl} alt={product.name} />
      </button>
      <div className="p-4">
        <p className="eyebrow">{product.category}</p>
        <h3 className="font-display text-lg font-black">{product.name}</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">{product.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-bold">{formatMoney(product.price)}</span>
          {canBuy && (
            <button
              className="primary-button compact"
              onClick={() =>
                addToCart({
                  itemType: "product",
                  itemId: product.id,
                  sellerId: product.sellerId,
                  label: product.name,
                  unitPrice: product.price,
                  quantity: 1,
                  maxQuantity: available,
                })
              }
              disabled={available <= 0}
            >
              <Plus size={16} />
              Sumar
            </button>
          )}
        </div>
      </div>
      {imageOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Imagen de ${product.name}`} onClick={() => setImageOpen(false)}>
          <div className="product-lightbox" onClick={(event) => event.stopPropagation()}>
            <button className="ghost-icon" onClick={() => setImageOpen(false)} aria-label="Cerrar">X</button>
            <img src={imageUrl} alt={product.name} />
          </div>
        </div>
      )}
    </article>
  );
}
