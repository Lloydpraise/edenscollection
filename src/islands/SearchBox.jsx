// Header search: opens a panel with live suggestions; Enter goes to the shop with ?q=.
import { useEffect, useMemo, useRef, useState } from "react";
import { formatKsh } from "../lib/format.js";
import { SearchIcon, CloseIcon } from "../components/react/icons.jsx";

const POPULAR = ["Rolex", "Submariner", "Cartier", "Pre-owned", "Gold"];

export function matches(p, q) {
  const hay = `${p.brand} ${p.name} ${p.reference} ${p.condition} ${p.category} ${p.caseMaterial || ""}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

export default function SearchBox({ products }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const input = useRef(null);

  const results = useMemo(() => (q.trim() ? products.filter((p) => matches(p, q)).slice(0, 6) : []), [q, products]);

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 30);
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "/" && !/input|textarea/i.test(document.activeElement?.tagName || "")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button className="icon-btn" type="button" onClick={() => setOpen((v) => !v)} aria-label="Search watches" aria-expanded={open}>
        <SearchIcon width={18} height={18} />
      </button>
      <div className={`search-panel${open ? " open" : ""}`} role="dialog" aria-label="Search">
        <div className="wrap search-inner">
          <form action="/shop" method="get" className="search-form">
            <SearchIcon width={20} height={20} />
            <input ref={input} type="search" name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brand, model or reference" aria-label="Search watches" autoComplete="off" />
            <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close search">
              <CloseIcon width={18} height={18} />
            </button>
          </form>
          {q.trim() === "" ? (
            <div className="search-popular">
              <span className="eyebrow">Popular</span>
              {POPULAR.map((term) => (
                <button type="button" key={term} className="chip" onClick={() => setQ(term)}>{term}</button>
              ))}
            </div>
          ) : results.length === 0 ? (
            <p className="search-empty">No watches match “{q}”. Our concierge can source it for you — message us on WhatsApp.</p>
          ) : (
            <ul className="search-results">
              {results.map((p) => (
                <li key={p.id}>
                  <a href={`/product/${p.slug}`}>
                    <span className={`search-thumb${p.exclusive ? " is-dark" : ""}`}><img src={p.image} alt="" /></span>
                    <span className="search-text">
                      <span className="search-brand">{p.brand}</span>
                      <span className="search-name">{p.name}</span>
                    </span>
                    <span className="search-price">{formatKsh(p.price)}</span>
                  </a>
                </li>
              ))}
              <li className="search-all"><a href={`/shop?q=${encodeURIComponent(q)}`}>See all results →</a></li>
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
