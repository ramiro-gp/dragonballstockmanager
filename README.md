# Dragon Ball Stock Manager

Primera versión local con datos mock para validar UI/UX.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- lucide-react
- Recharts
- pnpm

## Ejecutar

```bash
corepack pnpm install
corepack pnpm dev
```

Abrir `http://127.0.0.1:5173/`.

## Decisiones de producto incluidas

- Multi-vendedor preparado desde la estructura de datos.
- Home orientado al stock principal de Ramiro.
- Carga por lista y por rango con excepciones.
- Cartas con número alfanumérico como `504F`.
- Carrito público con pedido pendiente y link a WhatsApp.
- Ventas con estados: pendiente, reservada, confirmada y cancelada.
- `reservada` y `confirmada` aplican stock una sola vez mediante `stockApplied`.
- Al cancelar una venta con stock aplicado, el stock se devuelve.
- Otros productos con foto, descripción, precio y stock.
- Footer/lateral con apoyo al creador vía Cafecito.

## Siguiente etapa sugerida

Mantener esta UI y cambiar los mocks por Supabase:

- Auth con email y contraseña.
- Postgres para vendedores, stock, productos, pedidos, ventas y movimientos.
- Storage para fotos de productos.
- Row Level Security para separar vendedores y panel admin.
