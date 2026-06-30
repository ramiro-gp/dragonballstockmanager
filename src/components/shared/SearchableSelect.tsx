import { useMemo, useRef, useState } from "react";
import clsx from "clsx";

export type SearchableSelectOption = {
  value: string;
  label: string;
  hint?: string;
};

export function SearchableSelect({
  options,
  placeholder,
  disabled,
  emptyLabel = "Sin resultados",
  onSelect,
}: {
  options: SearchableSelectOption[];
  placeholder: string;
  disabled?: boolean;
  emptyLabel?: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const blurTimer = useRef<number | undefined>(undefined);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleOptions = useMemo(() => {
    if (!normalizedQuery) return options.slice(0, 80);
    return options
      .filter((option) => `${option.label} ${option.hint ?? ""}`.toLowerCase().includes(normalizedQuery))
      .slice(0, 80);
  }, [normalizedQuery, options]);

  function choose(value: string) {
    onSelect(value);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="searchable-select">
      <input
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "Enter" && visibleOptions[0]) {
            event.preventDefault();
            choose(visibleOptions[0].value);
          }
        }}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 120);
        }}
      />
      {open && !disabled && (
        <div className="searchable-select-menu" role="listbox">
          {visibleOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={clsx("searchable-select-option", option.hint && "with-hint")}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option.value)}
            >
              <span>{option.label}</span>
              {option.hint && <small>{option.hint}</small>}
            </button>
          ))}
          {!visibleOptions.length && <p className="searchable-select-empty">{emptyLabel}</p>}
        </div>
      )}
    </div>
  );
}
