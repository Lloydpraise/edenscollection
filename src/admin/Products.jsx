import { useEffect, useState } from "react";
import { call } from "./api.js";
import { PageHead, Notice, departments, departmentLabel, subcategoryLabel, formatKsh, timeAgo, useAction } from "./shared.jsx";
import ProductEditor from "./ProductEditor.jsx";

const FILTERS = [
  { id: "", label: "All" },
  { id: "live", label: "Live" },
  { id: "sold", label: "Sold" },
  { id: "review", label: "Needs review" },
  { id: "hidden", label: "Hidden" },
  { id: "removed", label: "Removed by supplier" },
];
const PAGE = 40;

const hashParams = () => new URLSearchParams(location.hash.split("?")[1] || "");

export default function Products() {
  const [filter, setFilter] = useState(() => hashParams().get("filter") || "");
  const [category, setCategory] = useState(() => hashParams().get("category") || "");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("created_at");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(null); // product, or {} for a new one
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(q), 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    setPage(0);
    setSelected(new Set());
  }, [filter, category, search, sort]);

  const list = useAction("products.list", { filter, category, q: search, sort, page, size: PAGE }, [filter, category, search, sort, page]);
  const items = list.data?.items || [];
  const total = list.data?.total || 0;

  function replace(updated) {
    list.reload();
    if (editing?.id === updated?.id) setEditing(updated);
  }

  async function quick(product, patch) {
    setMsg("");
    try {
      await call("products.update", { id: product.id, patch });
      list.reload();
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function bulk(op) {
    let value;
    if (op === "markup") {
      const v = prompt("New markup on wholesale, in KSh (e.g. 2500). Products with no wholesale price are skipped.");
      if (v == null) return;
      value = Number(v);
      if (!Number.isFinite(value)) return;
    }
    if (op === "delete" && !confirm(`Delete ${selected.size} product(s) for good?`)) return;
    try {
      if (op === "delete") {
        for (const id of selected) await call("products.delete", { id });
        setMsg(`Deleted ${selected.size}.`);
      } else {
        const r = await call("products.bulk", { ids: [...selected], op, value });
        setMsg(`Updated ${r.updated}.`);
      }
      setSelected(new Set());
      list.reload();
    } catch (e) {
      setMsg(e.message);
    }
  }

  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const allOnPage = items.length > 0 && items.every((p) => selected.has(p.id));

  return (
    <>
      <PageHead eyebrow="Catalogue" title="Products">
        <button className="btn btn-royal btn-sm" onClick={() => setEditing({})}>
          New product
        </button>
      </PageHead>

      <div className="adm-toolbar">
        <input className="adm-search" type="search" placeholder="Search title, id or Telegram post…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Department">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.label}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="created_at">Newest first</option>
          <option value="price">Highest price</option>
          <option value="title">A to Z</option>
        </select>
      </div>
      <div className="adm-chips">
        {FILTERS.map((f) => (
          <button key={f.id} className={`chip${filter === f.id ? " chip-on" : ""}`} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="adm-bulk">
          <strong>{selected.size} selected</strong>
          <button className="btn btn-sm btn-dark" onClick={() => bulk("sold")}>
            Mark sold
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => bulk("unsold")}>
            Back in stock
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => bulk("hide")}>
            Hide
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => bulk("show")}>
            Show
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => bulk("approve")}>
            Approve
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => bulk("markup")}>
            Reprice
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => bulk("unlock")} title="Let the daily sync overwrite your edits again">
            Unlock edits
          </button>
          <button className="btn btn-sm adm-danger" onClick={() => bulk("delete")}>
            Delete
          </button>
          <button className="link-btn" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}
      <Notice error={list.error}>{msg}</Notice>

      <div className="adm-card adm-card-flush">
        <table className="adm-table adm-products">
          <thead>
            <tr>
              <th className="adm-check">
                <input
                  type="checkbox"
                  aria-label="Select page"
                  checked={allOnPage}
                  onChange={() => setSelected(allOnPage ? new Set() : new Set(items.map((p) => p.id)))}
                />
              </th>
              <th>Product</th>
              <th>Department</th>
              <th className="num">Wholesale</th>
              <th className="num">Retail</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className={p.sold ? "is-sold" : ""}>
                <td className="adm-check">
                  <input type="checkbox" aria-label={`Select ${p.title}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                </td>
                <td>
                  <button className="adm-prod" onClick={() => setEditing(p)}>
                    <span className="adm-thumb">{p.images?.[0] ? <img src={p.images[0]} alt="" loading="lazy" /> : <span>E</span>}</span>
                    <span>
                      <strong>{p.title}</strong>
                      <span className="adm-sub">
                        {p.brand ? `${p.brand} · ` : ""}
                        {p.id} · {timeAgo(p.posted_at || p.created_at)}
                      </span>
                    </span>
                  </button>
                </td>
                <td>
                  {departmentLabel(p.category)}
                  <span className="adm-sub">{subcategoryLabel(p.category, p.product_type)}</span>
                </td>
                <td className="num">{p.stock_price != null ? formatKsh(p.stock_price) : "–"}</td>
                <td className="num">
                  {p.price ? formatKsh(p.price) : "–"}
                  {p.stock_price != null && p.price ? <span className="adm-sub">+{formatKsh(p.price - p.stock_price)}</span> : null}
                </td>
                <td>
                  <Badges p={p} />
                </td>
                <td className="adm-actions">
                  <button className="btn btn-sm btn-ghost" onClick={() => quick(p, { sold: !p.sold })}>
                    {p.sold ? "Unsell" : "Sold"}
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => quick(p, { is_visible: !p.is_visible })}>
                    {p.is_visible ? "Hide" : "Show"}
                  </button>
                </td>
              </tr>
            ))}
            {!list.loading && !items.length && (
              <tr>
                <td colSpan={7} className="adm-empty">
                  {search || filter || category ? "Nothing matches these filters." : "No products yet. Run the Telegram worker or add one by hand."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > PAGE && (
        <div className="adm-pager">
          <button className="btn btn-sm btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="muted">
            {page * PAGE + 1}–{Math.min(total, (page + 1) * PAGE)} of {total}
          </span>
          <button className="btn btn-sm btn-ghost" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}

      {editing && <ProductEditor product={editing} onClose={() => setEditing(null)} onSaved={replace} />}
    </>
  );
}

export function Badges({ p }) {
  return (
    <span className="adm-badges">
      {p.sold && <span className="badge badge-ink">Sold</span>}
      {p.needs_review && <span className="badge badge-gold">Review</span>}
      {p.removed_at && <span className="badge badge-line">Removed</span>}
      {!p.is_visible && !p.removed_at && <span className="badge badge-line">Hidden</span>}
      {p.is_visible && !p.sold && !p.needs_review && <span className="badge badge-royal">Live</span>}
      {p.exclusive && <span className="badge badge-ink">Black</span>}
      {p.locked?.length > 0 && (
        <span className="adm-lock" title={`Edited by hand, the sync leaves these alone: ${p.locked.join(", ")}`}>
          Edited
        </span>
      )}
    </span>
  );
}
