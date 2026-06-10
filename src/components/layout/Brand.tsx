import clsx from "clsx";

export function Brand({ compact = false, collapsed = false }: { compact?: boolean; collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={clsx("logo-mark", compact && "compact")} />
      {!collapsed && (
        <div>
          <p className={clsx("font-display font-black", compact ? "text-sm" : "text-lg")}>DB Stock</p>
          <p className="text-xs text-[var(--muted)]">Dragon Ball Stock Manager</p>
        </div>
      )}
    </div>
  );
}
