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
  const available = availableProductQuantity(product);
  const imageUrl = sanitizeExternalImageUrl(product.imageUrl);

  return (
    <article className="product-card">
      <img src={imageUrl} alt="" />
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
    </article>
  );
}
