import { useEffect, useRef, useState } from "react";
import { call, uploadImage } from "./api.js";
import { Notice, departments, formatKsh, dateTime } from "./shared.jsx";
import { Badges } from "./Products.jsx";

const NUM = ["price", "old_price", "stock_price", "stock_quantity"];

function toForm(p) {
  return {
    title: p.title || "",
    brand: p.brand || "",
    category: p.category || "watches",
    product_type: p.product_type || "",
    stock_price: p.stock_price ?? "",
    price: p.price ?? "",
    old_price: p.old_price ?? "",
    stock_quantity: p.stock_quantity ?? 1,
    is_visible: p.is_visible ?? true,
    sold: Boolean(p.sold),
    exclusive: Boolean(p.exclusive),
    status: p.status || "approved",
    description_short: p.description_short || "",
    description_long: p.description_long || "",
    key_features: (p.key_features || []).join("\n"),
    images: p.images || [],
  };
}

// Only the fields that actually changed, so the sync keeps control of everything the admin did not touch.
function diff(before, after) {
  const patch = {};
  for (const [k, v] of Object.entries(after)) {
    const a = JSON.stringify(before[k]);
    const b = JSON.stringify(v);
    if (a === b) continue;
    if (k === "key_features") patch[k] = v.split("\n").map((s) => s.trim()).filter(Boolean);
    else if (NUM.includes(k)) patch[k] = v === "" ? null : Number(v);
    else patch[k] = v;
  }
  return patch;
}

export default function ProductEditor({ product, onClose, onSaved }) {
  const isNew = !product.id;
  const [initial, setInitial] = useState(() => toForm(product));
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const fileRef = useRef(null);
  const dep = departments.find((d) => d.slug === form.category);

  useEffect(() => {
    const f = toForm(product);
    setInitial(f);
    setForm(f);
  }, [product]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("no-scroll");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("no-scroll");
    };
  }, [onClose]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const patch = diff(initial, form);
  const dirty = Object.keys(patch).length > 0;
  const margin = form.price !== "" && form.stock_price !== "" ? Number(form.price) - Number(form.stock_price) : null;

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const result = isNew
        ? await call("products.create", { patch: diff({}, form) })
        : await call("products.update", { id: product.id, patch });
      setSaved("Saved.");
      onSaved(result);
      if (isNew) onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${product.title}" for good? If it is still on the supplier's channel, the next sync adds it back; hide it instead to keep it off the site.`)) return;
    try {
      await call("products.delete", { id: product.id });
      onSaved(null);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  async function unlock() {
    try {
      onSaved(await call("products.update", { id: product.id, patch: { unlock: product.locked } }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function addImages(files) {
    setError("");
    try {
      for (const file of files) {
        const url = await uploadImage(file);
        setForm((f) => ({ ...f, images: [...f.images, url] }));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  const moveImage = (i, by) =>
    setForm((f) => {
      const imgs = [...f.images];
      const j = i + by;
      if (j < 0 || j >= imgs.length) return f;
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      return { ...f, images: imgs };
    });

  return (
    <div className="adm-drawer-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="adm-drawer" onSubmit={save} aria-label={isNew ? "New product" : `Edit ${product.title}`}>
        <header className="adm-drawer-head">
          <div>
            <p className="eyebrow">{isNew ? "New product" : product.id}</p>
            <h2>{form.title || "Untitled"}</h2>
            {!isNew && <Badges p={product} />}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="adm-drawer-body">
          <section>
            <h3>Photos</h3>
            <div className="adm-images">
              {form.images.map((src, i) => (
                <figure key={src} className="adm-image">
                  <img src={src} alt="" />
                  <div>
                    <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="Move left">
                      ‹
                    </button>
                    <button type="button" onClick={() => setForm((f) => ({ ...f, images: f.images.filter((x) => x !== src) }))} aria-label="Remove photo">
                      ✕
                    </button>
                    <button type="button" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} aria-label="Move right">
                      ›
                    </button>
                  </div>
                  {i === 0 && <span className="adm-image-main">Cover</span>}
                </figure>
              ))}
              <button type="button" className="adm-image-add" onClick={() => fileRef.current?.click()}>
                + Add photos
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => addImages([...e.target.files])} />
            </div>
          </section>

          <section className="adm-form-grid">
            <label className="adm-field adm-span-2">
              <span>Title</span>
              <input value={form.title} onChange={set("title")} required />
            </label>
            <label className="adm-field">
              <span>Brand</span>
              <input value={form.brand} onChange={set("brand")} />
            </label>
            <label className="adm-field">
              <span>Department</span>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, product_type: "" }))}>
                {departments.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-field">
              <span>Subcategory</span>
              <select value={form.product_type} onChange={set("product_type")}>
                <option value="">–</option>
                {dep?.subcategories.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-field">
              <span>In stock</span>
              <input type="number" min="0" value={form.stock_quantity} onChange={set("stock_quantity")} />
            </label>
          </section>

          <section className="adm-form-grid adm-pricing">
            <label className="adm-field">
              <span>Wholesale (private)</span>
              <input type="number" min="0" value={form.stock_price} onChange={set("stock_price")} />
            </label>
            <label className="adm-field">
              <span>Retail price</span>
              <input type="number" min="0" value={form.price} onChange={set("price")} />
            </label>
            <label className="adm-field">
              <span>Was (strike-through)</span>
              <input type="number" min="0" value={form.old_price} onChange={set("old_price")} />
            </label>
            <p className="adm-margin">
              {margin != null ? (
                <>
                  Margin <strong>{formatKsh(margin)}</strong>
                </>
              ) : (
                <span className="muted">Add both prices to see the margin.</span>
              )}
            </p>
          </section>

          <section className="adm-toggles">
            <label className="adm-toggle">
              <input type="checkbox" checked={form.is_visible} onChange={set("is_visible")} />
              <span>Show on the site</span>
            </label>
            <label className="adm-toggle">
              <input type="checkbox" checked={form.sold} onChange={set("sold")} />
              <span>Sold out</span>
            </label>
            <label className="adm-toggle">
              <input type="checkbox" checked={form.exclusive} onChange={set("exclusive")} />
              <span>Black Collection (exclusive)</span>
            </label>
            <label className="adm-toggle">
              <input type="checkbox" checked={form.status === "approved"} onChange={(e) => setForm((f) => ({ ...f, status: e.target.checked ? "approved" : "discovered" }))} />
              <span>Reviewed</span>
            </label>
          </section>
          {product.sold_at && (
            <p className="adm-note">
              Sold {dateTime(product.sold_at)}
              {product.sold_via ? ` (from ${product.sold_via})` : ""}.
            </p>
          )}

          <section className="adm-form-grid">
            <label className="adm-field adm-span-2">
              <span>Short description</span>
              <input value={form.description_short} onChange={set("description_short")} />
            </label>
            <label className="adm-field adm-span-2">
              <span>Description</span>
              <textarea rows={5} value={form.description_long} onChange={set("description_long")} />
            </label>
            <label className="adm-field adm-span-2">
              <span>Highlights, one per line</span>
              <textarea rows={4} value={form.key_features} onChange={set("key_features")} />
            </label>
          </section>

          {!isNew && product.caption && (
            <section>
              <h3>Supplier's post</h3>
              <pre className="adm-caption">{product.caption}</pre>
              <p className="muted adm-small">
                Telegram post {product.telegram_id}, {dateTime(product.posted_at)}.
              </p>
            </section>
          )}

          {!isNew && product.locked?.length > 0 && (
            <section className="adm-locked">
              <p>
                You edited <strong>{product.locked.join(", ")}</strong> by hand, so the daily sync leaves those alone.
              </p>
              <button type="button" className="link-btn" onClick={unlock}>
                Let the sync update them again
              </button>
            </section>
          )}
        </div>

        <footer className="adm-drawer-foot">
          <Notice error={error}>{saved}</Notice>
          {!isNew && (
            <button type="button" className="btn btn-sm adm-danger" onClick={remove}>
              Delete
            </button>
          )}
          <span className="adm-grow" />
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-sm btn-royal" disabled={busy || (!isNew && !dirty)}>
            {busy ? "Saving…" : isNew ? "Create" : "Save changes"}
          </button>
        </footer>
      </form>
    </div>
  );
}
