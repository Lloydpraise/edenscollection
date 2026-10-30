// Full bag page.
import { useCart } from "../lib/useStore.js";
import { cartTotals, removeFromCart } from "../lib/cart.js";
import { formatKsh } from "../lib/format.js";
import { QtyStepper } from "./CartDrawer.jsx";
import { ShieldIcon, TruckIcon } from "../components/react/icons.jsx";

export default function CartPage() {
  const items = useCart();
  const { count, subtotal, savings } = cartTotals(items);

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <h2>Your bag is empty</h2>
        <p>Find something worth keeping. Every watch is authenticated, certified and delivered insured.</p>
        <div className="empty-actions">
          <a className="btn btn-royal" href="/shop">Shop all watches</a>
          <a className="btn btn-ghost" href="/exclusive">See The Black Collection</a>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-layout">
      <div className="cart-lines">
        <div className="cart-lines-head">
          <span>Timepiece</span>
          <span>Quantity</span>
          <span>Total</span>
        </div>
        {items.map((item) => (
          <div className="cart-line" key={item.id}>
            <a className={`cart-line-img${item.exclusive ? " is-dark" : ""}`} href={`/product/${item.slug}`}>
              <img src={item.image} alt="" />
            </a>
            <div className="cart-line-info">
              <span className="line-brand">{item.brand}</span>
              <a className="line-name" href={`/product/${item.slug}`}>{item.name}</a>
              <span className="line-meta">{[`Ref. ${item.reference}`, item.caseSize, item.condition === "new" ? "New" : "Pre-owned"].filter(Boolean).join(" · ")}</span>
              <span className="line-meta">{formatKsh(item.price)} each</span>
              <button className="link-btn" type="button" onClick={() => removeFromCart(item.id)}>Remove</button>
            </div>
            <QtyStepper item={item} />
            <span className="cart-line-total">{formatKsh(item.price * item.qty)}</span>
          </div>
        ))}
      </div>

      <aside className="summary-card">
        <h2>Order summary</h2>
        <div className="sum-row"><span>Items ({count})</span><span>{formatKsh(subtotal + savings)}</span></div>
        {savings > 0 && <div className="sum-row save"><span>Savings</span><span>−{formatKsh(savings)}</span></div>}
        <div className="sum-row"><span>Delivery</span><span>Free in Nairobi</span></div>
        <div className="sum-row total"><span>Subtotal</span><span>{formatKsh(subtotal)}</span></div>
        <a className="btn btn-royal btn-lg btn-block" href="/checkout">Proceed to checkout</a>
        <a className="btn btn-ghost btn-block" href="/shop">Continue shopping</a>
        <ul className="assurances">
          <li><ShieldIcon width={18} height={18} /> Certificate of authenticity with every watch</li>
          <li><TruckIcon width={18} height={18} /> Insured delivery, signed for on arrival</li>
        </ul>
      </aside>
    </div>
  );
}
