import { Plus } from "lucide-react";
import type { CardStock, CartLine } from "../../lib/types";
import { availableQuantity, formatMoney, kindLabel } from "../../lib/helpers";
import { variantDisplayLabel } from "../../data/cromerosCatalog";

export function CardResult({
  items,
  addToCart,
  canBuy,
}: {
  items: CardStock[];
  addToCart: (line: CartLine) => void;
  canBuy: boolean;
}) {
  return (
    <article className="item-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{items[0].expansion}</p>
          <h3 className="card-number">Carta {items[0].number}</h3>
        </div>
        {items[0].special && <span className="rare-badge">{items[0].special}</span>}
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="variant-row">
            <div>
              <p>{kindLabel[item.kind]} - {variantDisplayLabel(item.variant)}</p>
              <span>x{availableQuantity(item)} disponible - {formatMoney(item.price)}</span>
            </div>
            {canBuy && (
              <button
                className="icon-button small"
                onClick={() =>
                  addToCart({
                    itemType: "card",
                    itemId: item.id,
                    sellerId: item.sellerId,
                    label: `Carta ${item.number} - ${kindLabel[item.kind]} ${variantDisplayLabel(item.variant)}`,
                    unitPrice: item.price,
                    quantity: 1,
                    maxQuantity: availableQuantity(item),
                  })
                }
                disabled={availableQuantity(item) <= 0}
                aria-label="Agregar al carrito"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}
