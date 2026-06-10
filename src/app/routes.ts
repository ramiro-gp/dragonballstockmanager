export type Route =
  | "/"
  | "/login"
  | "/carrito"
  | "/carga"
  | "/ventas"
  | "/panel"
  | "/ajustes"
  | "/quiero-vender"
  | "/crear-vendedor"
  | `/${string}/stock`;

export const privateRoutes: Route[] = ["/carga", "/ventas", "/panel", "/ajustes", "/crear-vendedor"];

export function getCurrentRoute(): Route {
  const path = window.location.pathname;
  const allowed: Route[] = [
    "/",
    "/login",
    "/carrito",
    "/carga",
    "/ventas",
    "/panel",
    "/ajustes",
    "/quiero-vender",
    "/crear-vendedor",
  ];
  if (allowed.includes(path as Route)) return path as Route;
  if (/^\/[a-z0-9-]+\/stock$/i.test(path)) return path as Route;
  return "/";
}
