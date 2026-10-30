// Shop grid with filters and sorting. Starts from the collection the page was built for and reads
// ?q= and ?brand= from the address so header search and brand links land on a filtered grid.
import { useEffect, useMemo, useState } from "react";
import ProductCard from "../components/react/ProductCard.jsx";
import { matches } from "./SearchBox.jsx";
import { formatKsh } from "../lib/format.js";
import { CloseIcon } from "../components/react/icons.jsx";
import { useWishlist } from "../lib/useStore.js";

const PRICE_BANDS = [
  { id: "u500", label: "Under KSh 500k", test: (p) => p.price < 500000 },
  { id: "500-2m", label: "KSh 500k – 2M", test: (p) => p.price >= 500000 && p.price <= 2000000 },
  { id: "2m-8m", label: "KSh 2M – 8M", test: (p) => p.price > 2000000 && p.price <= 8000000 },
  { id: "o8m", label: "Above KSh 8M", test: (p) => p.price > 8000000 },
];

const SORTS = {
  featured: { label: "Featured", fn: (a, b) => (b.tags.includes("bestseller") - a.tags.includes("bestseller")) },
  "price-asc": { label: "Price: low to high", fn: (a, b) => a.price - b.price },
  "price-desc": { label: "Price: high to low", fn: (a, b) => b.price - a.price },
  newest: { label: "New arrivals", fn: (a, b) => b.tags.includes("new") - a.tags.includes("new") },
};

const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Group({ title, name, options, products, sel, setSel }) {
  return (
    <fieldset className="filter-group">
      <legend>{title}</legend>
      {options.map(([value, label]) => {
        const count = products.filter((p) => (name === "price" ? PRICE_BANDS.find((b) => b.id === value).test(p) : p[name] === value)).length;
        return (
          <label key={value} className="check">
            <input type="checkbox" checked={sel[name].includes(value)} onChange={() => setSel((s) => ({ ...s, [name]: toggle(s[name], value) }))} />
            <span className="check-box" aria-hidden="true" />
            <span>{label}</span>
            <span className="check-count">{count}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

export default function ShopBrowser({ products, brands, preset = {}, noun = ["watch", "watches"] }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState({ brand: [], category: preset.category || [], condition: preset.condition || [], price: [] });
  const [saleOnly, setSaleOnly] = useState(Boolean(preset.sale));
  const [sort, setSort] = useState("featured");
  const [panel, setPanel] = useState(false);
  const wish = useWishlist();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("q")) setQ(params.get("q"));
    const brand = params.get("brand");
    if (brand && brands.includes(brand)) setSel((s) => ({ ...s, brand: [brand] }));
  }, []);

  const list = useMemo(() => {
    const out = products.filter((p) => {
      if (q && !matches(p, q)) return false;
      if (sel.brand.length && !sel.brand.includes(p.brand)) return false;
      if (sel.category.length && !sel.category.includes(p.category)) return false;
      if (sel.condition.length && !sel.condition.includes(p.condition)) return false;
      if (sel.price.length && !PRICE_BANDS.filter((b) => sel.price.includes(b.id)).some((b) => b.test(p))) return false;
      if (saleOnly && !(p.compareAt > p.price)) return false;
      return true;
    });
    return out.sort(SORTS[sort].fn);
  }, [products, q, sel, saleOnly, sort]);

  const active = [
    ...(q ? [{ key: "q", label: `“${q}”`, clear: () => setQ("") }] : []),
    ...sel.brand.map((b) => ({ key: b, label: b, clear: () => setSel((s) => ({ ...s, brand: toggle(s.brand, b) })) })),
    ...sel.category.map((c) => ({ key: c, label: c[0].toUpperCase() + c.slice(1), clear: () => setSel((s) => ({ ...s, category: toggle(s.category, c) })) })),
    ...sel.condition.map((c) => ({ key: c, label: c === "new" ? "New" : "Pre-owned", clear: () => setSel((s) => ({ ...s, condition: toggle(s.condition, c) })) })),
    ...sel.price.map((id) => ({ key: id, label: PRICE_BANDS.find((b) => b.id === id).label, clear: () => setSel((s) => ({ ...s, price: toggle(s.price, id) })) })),
    ...(saleOnly ? [{ key: "sale", label: "On sale", clear: () => setSaleOnly(false) }] : []),
  ];

  const clearAll = () => {
    setQ("");
    setSel({ brand: [], category: [], condition: [], price: [] });
    setSaleOnly(false);
  };

  return (
    <div className="shop-layout">
      <aside className={`filters${panel ? " open" : ""}`} aria-label="Filters">
        <div className="filters-head">
          <h2>Refine</h2>
          <button className="icon-btn filters-close" type="button" onClick={() => setPanel(false)} aria-label="Close filters">
            <CloseIcon width={18} height={18} />
          </button>
        </div>
        <Group products={products} sel={sel} setSel={setSel} title="Brand" name="brand" options={brands.map((b) => [b, b])} />
        <Group products={products} sel={sel} setSel={setSel} title="For" name="category" options={[["men", "Men"], ["women", "Women"], ["unisex", "Unisex"]]} />
        <Group products={products} sel={sel} setSel={setSel} title="Condition" name="condition" options={[["new", "New / unworn"], ["pre-owned", "Pre-owned"]]} />
        <Group products={products} sel={sel} setSel={setSel} title="Price" name="price" options={PRICE_BANDS.map((b) => [b.id, b.label])} />
        <label className="check switch-row">
          <input type="checkbox" checked={saleOnly} onChange={() => setSaleOnly((v) => !v)} />
          <span className="check-box" aria-hidden="true" />
          <span>On sale only</span>
        </label>
        <button className="btn btn-royal btn-block filters-apply" type="button" onClick={() => setPanel(false)}>
          Show {list.length} {list.length === 1 ? noun[0] : noun[1]}
        </button>
      </aside>

      <div className="shop-main">
        <div className="shop-toolbar">
          <button className="btn btn-ghost btn-sm filters-toggle" type="button" onClick={() => setPanel(true)}>
            Filters {active.length > 0 && `(${active.length})`}
          </button>
          <p className="shop-count">
            {list.length} {list.length === 1 ? noun[0] : noun[1]}
            {list.length > 0 && <span> · from {formatKsh(Math.min(...list.map((p) => p.price)))}</span>}
          </p>
          <label className="sort">
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([id, s]) => (
                <option key={id} value={id}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>

        {active.length > 0 && (
          <div className="active-filters">
            {active.map((a) => (
              <button key={a.key} type="button" className="chip chip-on" onClick={a.clear}>
                {a.label} <CloseIcon width={12} height={12} />
              </button>
            ))}
            <button type="button" className="link-btn" onClick={clearAll}>Clear all</button>
          </div>
        )}

        {list.length === 0 ? (
          <div className="shop-empty">
            <h3>No {noun[1]} match those filters</h3>
            <p>Try removing a filter, or ask our concierge to source a specific reference for you.</p>
            <button className="btn btn-royal" type="button" onClick={clearAll}>Clear filters</button>
          </div>
        ) : (
          <div className="product-grid">
            {list.map((p, i) => (
              <ProductCard key={p.id} product={p} eager={i < 3} wished={wish.some((w) => w.id === p.id)} />
            ))}
          </div>
        )}
      </div>
      <div className={`drawer-scrim filters-scrim${panel ? " open" : ""}`} onClick={() => setPanel(false)} aria-hidden="true" />
    </div>
  );
}
