// One product card for every grid and rail. Rendered to static HTML by Astro pages and live inside
// islands (shop filters, wishlist). The add and wishlist buttons are wired by one listener in
// Layout.astro (data-add-to-cart / data-wish), so they work in both places.
import { formatKsh, percentOff } from "../../lib/format.js";
import { BagIcon, HeartIcon } from "./icons.jsx";

export default function ProductCard({ product, eager = false, dark, wished = false }) {
  const isDark = dark ?? product.exclusive;
  const off = percentOff(product.price, product.compareAt);
  const href = `/product/${product.slug}`;
  const payload = JSON.stringify(product);
  return (
    <article className={`pcard${isDark ? " is-dark" : ""}`} data-product-id={product.id}>
      <div className="pcard-media">
        <a href={href} className="pcard-img" aria-label={`${product.brand} ${product.name}`} tabIndex={-1}>
          <img src={product.image} alt={`${product.brand} ${product.name}`} loading={eager ? "eager" : "lazy"} decoding="async" width="600" height="750" />
        </a>
        <div className="pcard-badges">
          {product.exclusive && <span className="badge badge-gold">Black Collection</span>}
          {off > 0 && <span className="badge badge-royal">−{off}%</span>}
          {!product.exclusive && product.tags?.includes("new") && <span className="badge badge-ink">New in</span>}
          {product.condition === "pre-owned" && <span className="badge badge-line">Pre-owned</span>}
        </div>
        <button className="pcard-wish" type="button" data-wish={payload} aria-pressed={wished ? "true" : "false"} aria-label={`Save ${product.name} to wishlist`}>
          <HeartIcon width={18} height={18} />
        </button>
      </div>
      <div className="pcard-body">
        <a href={href} className="pcard-link">
          <span className="pcard-brand">{product.brand}</span>
          <h3 className="pcard-name">{product.name}</h3>
          <span className="pcard-meta">
            {product.caseSize} · Ref. {product.reference}
          </span>
        </a>
        <div className="pcard-buy">
          <div className="pcard-prices">
            {off > 0 && <span className="price-strike">{formatKsh(product.compareAt)}</span>}
            <span className="price-now">{formatKsh(product.price)}</span>
            {off > 0 ? (
              <span className="price-save">Save {formatKsh(product.compareAt - product.price)}</span>
            ) : product.stock === 1 ? (
              <span className="price-note">Only one available</span>
            ) : null}
          </div>
          <button className="pcard-add" type="button" data-add-to-cart={payload} aria-label={`Add ${product.brand} ${product.name} to bag`} title="Add to bag">
            <BagIcon width={19} height={19} />
          </button>
        </div>
      </div>
    </article>
  );
}
