import { Plus } from "lucide-react";
import type { CartLine, Product } from "../../lib/types";
import { formatMoney } from "../../lib/helpers";

export function ProductCard({ product, addToCart }: { product: Product; addToCart: (line: CartLine) => void }) {
  return (
    <article className="product-card">
      <img src={product.imageUrl} alt="" />
      <div className="p-4">
        <p className="eyebrow">{product.category}</p>
        <h3 className="font-display text-lg font-black">{product.name}</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">{product.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-bold">{formatMoney(product.price)}</span>
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
                maxQuantity: product.quantity,
              })
            }
          >
            <Plus size={16} />
            Sumar
          </button>
        </div>
      </div>
    </article>
  );
}
