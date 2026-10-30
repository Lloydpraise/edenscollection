// Product page purchase controls: quantity, add to bag, buy now, wishlist and a WhatsApp enquiry.
import { useState } from "react";
import { addToCart, openCart, toggleWishlist } from "../lib/cart.js";
import { useCart, useWishlist } from "../lib/useStore.js";
import { BagIcon, HeartIcon, MinusIcon, PlusIcon, WhatsAppIcon } from "../components/react/icons.jsx";

export default function BuyBox({ product, whatsapp, dark = false }) {
  const [qty, setQty] = useState(1);
  const cart = useCart();
  const wish = useWishlist();
  const inBag = cart.find((i) => i.id === product.id)?.qty || 0;
  const left = Math.max(0, product.stock - inBag);
  const wished = wish.some((w) => w.id === product.id);
  const soldOut = product.stock <= 0;
  const message = encodeURIComponent(`Hello Edens Watches, I'm interested in the ${product.brand} ${product.name} (Ref. ${product.reference}). Is it available for viewing?`);

  const add = () => {
    addToCart(product, qty);
    openCart();
    setQty(1);
  };

  return (
    <div className={`buybox${dark ? " is-dark" : ""}`}>
      {product.stock > 1 && (
        <div className="buy-qty">
          <span className="label">Quantity</span>
          <div className="qty qty-lg">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity"><MinusIcon width={16} height={16} /></button>
            <span aria-live="polite">{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(Math.max(1, left), q + 1))} disabled={qty >= left} aria-label="Increase quantity"><PlusIcon width={16} height={16} /></button>
          </div>
        </div>
      )}
      <div className="buy-actions">
        <button className="btn btn-royal btn-lg" type="button" onClick={add} disabled={soldOut || left === 0}>
          <BagIcon width={18} height={18} /> {soldOut ? "Sold out" : left === 0 ? "All in your bag" : "Add to bag"}
        </button>
        <button className={`btn btn-icon btn-lg wish-toggle${wished ? " on" : ""}`} type="button" onClick={() => toggleWishlist(product)} aria-pressed={wished} aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}>
          <HeartIcon width={20} height={20} filled={wished} />
        </button>
      </div>
      <a
        className="btn btn-dark btn-lg btn-block"
        href="/checkout"
        onClick={(e) => {
          if (left > 0 && inBag === 0) addToCart(product, qty);
          else if (soldOut) e.preventDefault();
        }}
      >
        Buy it now
      </a>
      <a className="btn btn-ghost btn-block wa-btn" href={`https://wa.me/${whatsapp}?text=${message}`} target="_blank" rel="noopener">
        <WhatsAppIcon width={18} height={18} /> Ask the concierge or book a viewing
      </a>
      <p className="stock-note">
        <span className={`stock-dot${product.stock <= 1 ? " low" : ""}`} />
        {soldOut ? "Sold out — ask us to source one" : product.stock === 1 ? "One piece available, ready to ship" : `In stock, ${product.stock} available`}
      </p>
    </div>
  );
}
