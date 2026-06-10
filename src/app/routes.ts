export type Route =
  | "/"
  | "/login"
  | "/carrito"
  | "/carga"
  | "/ventas"
  | "/panel"
  | "/ajustes"
  | "/quiero-vender"
  | "/crear-vendedor";

export const privateRoutes: Route[] = ["/carga", "/ventas", "/panel", "/ajustes", "/crear-vendedor"];

export function getCurrentRoute(): Route {
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
  return allowed.includes(window.location.pathname as Route) ? (window.location.pathname as Route) : "/";
}
