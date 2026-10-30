// Slide-in bag, opened by the header button and after every "add to bag".
import { useEffect, useState } from "react";
import { useCart } from "../lib/useStore.js";
import { cartTotals, setQty, removeFromCart, OPEN_EVENT } from "../lib/cart.js";
import { formatKsh } from "../lib/format.js";
import { CloseIcon, MinusIcon, PlusIcon, ShieldIcon } from "../components/react/icons.jsx";

export function QtyStepper({ item }) {
  return (
    <div className="qty" role="group" aria-label={`Quantity of ${item.name}`}>
      <button type="button" onClick={() => setQty(item.id, item.qty - 1)} aria-label="Decrease quantity">
        <MinusIcon width={14} height={14} />
      </button>
      <span aria-live="polite">{item.qty}</span>
      <button type="button" onClick={() => setQty(item.id, item.qty + 1)} disabled={item.qty >= (item.stock || 99)} aria-label="Increase quantity">
        <PlusIcon width={14} height={14} />
      </button>
    </div>
  );
}

export default function CartDrawer() {
  const items = useCart();
  const [open, setOpen] = useState(false);
  const { count, subtotal, savings } = cartTotals(items);

  useEffect(() => {
    const show = () => setOpen(true);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener(OPEN_EVENT, show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, show);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("no-scroll", open);
  }, [open]);

  return (
    <>
      <div className={`drawer-scrim${open ? " open" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside className={`drawer${open ? " open" : ""}`} aria-label="Shopping bag" aria-hidden={!open} inert={open ? undefined : true}>
        <header className="drawer-head">
          <div>
            <span className="eyebrow">Your bag</span>
            <h2>{count === 0 ? "Empty for now" : `${count} ${count === 1 ? "timepiece" : "timepieces"}`}</h2>
          </div>
          <button className="icon-btn" type="button" onClick={() => setOpen(false)} aria-label="Close bag">
            <CloseIcon width={18} height={18} />
          </button>
        </header>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="drawer-empty">
              <p>Nothing in your bag yet. Every watch we sell is authenticated and delivered insured.</p>
              <a className="btn btn-royal" href="/shop">Explore the collection</a>
            </div>
          ) : (
            <ul className="line-list">
              {items.map((item) => (
                <li className="line" key={item.id}>
                  <a className={`line-img${item.exclusive ? " is-dark" : ""}`} href={`/product/${item.slug}`}>
                    <img src={item.image} alt="" />
                  </a>
                  <div className="line-info">
                    <span className="line-brand">{item.brand}</span>
                    <a className="line-name" href={`/product/${item.slug}`}>{item.name}</a>
                    <span className="line-meta">Ref. {item.reference}</span>
                    <div className="line-row">
                      <QtyStepper item={item} />
                      <button className="link-btn" type="button" onClick={() => removeFromCart(item.id)}>Remove</button>
                    </div>
                  </div>
                  <span className="line-price">{formatKsh(item.price * item.qty)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="drawer-foot">
            {savings > 0 && (
              <div className="sum-row save">
                <span>You're saving</span>
                <span>{formatKsh(savings)}</span>
              </div>
            )}
            <div className="sum-row">
              <span>Delivery</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="sum-row total">
              <span>Subtotal</span>
              <span>{formatKsh(subtotal)}</span>
            </div>
            <a className="btn btn-royal btn-block" href="/checkout">Checkout securely</a>
            <a className="btn btn-ghost btn-block" href="/cart">View full bag</a>
            <p className="drawer-note">
              <ShieldIcon width={16} height={16} /> Authenticity guaranteed · Insured delivery
            </p>
          </footer>
        )}
      </aside>
    </>
  );
}
