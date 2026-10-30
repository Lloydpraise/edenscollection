import { useCallback, useEffect, useState } from "react";
import { call } from "./api.js";
import { departments } from "../data/categories.js";

export { formatKsh } from "../lib/format.js";

// Loads an admin action and reloads it on demand. `deps` re-runs it when filters change.
export function useAction(action, params, deps = []) {
  const [state, setState] = useState({ data: null, error: "", loading: true });
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    return call(action, params).then(
      (data) => setState({ data, error: "", loading: false }),
      (err) => setState((s) => ({ ...s, error: err.message, loading: false }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
}

export const departmentLabel = (slug) => departments.find((d) => d.slug === slug)?.label || slug || "Uncategorised";
export const subcategoryLabel = (dep, sub) =>
  departments.find((d) => d.slug === dep)?.subcategories.find((s) => s.slug === sub)?.label || sub || "";
export { departments };

export function timeAgo(iso) {
  if (!iso) return "never";
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export const dateTime = (iso) =>
  iso ? new Date(iso).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "–";

export function duration(a, b) {
  if (!a || !b) return "–";
  const s = Math.round((Date.parse(b) - Date.parse(a)) / 1000);
  return s < 90 ? `${s}s` : `${Math.round(s / 60)} min`;
}

export function PageHead({ eyebrow, title, children }) {
  return (
    <header className="adm-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {children && <div className="adm-head-actions">{children}</div>}
    </header>
  );
}

export function Notice({ error, children }) {
  if (!error && !children) return null;
  return <p className={error ? "adm-error" : "adm-note"}>{error || children}</p>;
}

export function RunStatus({ status }) {
  const label = { ok: "Finished", error: "Failed", running: "Running" }[status] || status;
  return (
    <span className={`adm-status adm-status-${status}`}>
      <i aria-hidden="true" />
      {label}
    </span>
  );
}
