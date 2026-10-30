// Checkout: contact, delivery and payment details, then an order confirmation.
// There is no payment gateway yet, so placing an order records it on this device and hands the
// customer a ready-written WhatsApp message to the concierge, who confirms and sends payment details.
import { useState } from "react";
import { useCart } from "../lib/useStore.js";
import { cartTotals, clearCart } from "../lib/cart.js";
import { formatKsh } from "../lib/format.js";
import { CheckIcon, ShieldIcon, WhatsAppIcon } from "../components/react/icons.jsx";

function Field({ name, label, type = "text", optional, errors, ...rest }) {
  return (
    <label className={`field${errors[name] ? " has-error" : ""}`}>
      <span>{label}{optional && <em> (optional)</em>}</span>
      <input name={name} type={type} {...rest} aria-invalid={Boolean(errors[name])} />
      {errors[name] && <small role="alert">{errors[name]}</small>}
    </label>
  );
}

const COUNTIES = ["Nairobi", "Kiambu", "Mombasa", "Kisumu", "Nakuru", "Machakos", "Kajiado", "Uasin Gishu", "Nyeri", "Kilifi", "Other"];

export default function CheckoutForm({ deliveryOptions, paymentOptions, whatsapp }) {
  const items = useCart();
  const [delivery, setDelivery] = useState(deliveryOptions[0].id);
  const [payment, setPayment] = useState(paymentOptions[0].id);
  const [errors, setErrors] = useState({});
  const [order, setOrder] = useState(null);
  const { count, subtotal, savings } = cartTotals(items);
  const fee = deliveryOptions.find((d) => d.id === delivery)?.fee || 0;
  const total = subtotal + fee;

  if (order) {
    const lines = order.items.map((i) => `• ${i.qty} × ${i.brand} ${i.name} (Ref. ${i.reference}) — ${formatKsh(i.price * i.qty)}`).join("\n");
    const msg = encodeURIComponent(
      `Hello Edens Watches, I've just placed order ${order.ref}.\n\n${lines}\n\nTotal: ${formatKsh(order.total)}\nDelivery: ${order.deliveryLabel}\nPayment: ${order.paymentLabel}\nName: ${order.name}`
    );
    return (
      <div className="confirm">
        <span className="confirm-icon"><CheckIcon width={30} height={30} /></span>
        <span className="eyebrow">Order {order.ref}</span>
        <h2>Thank you, {order.name.split(" ")[0]}.</h2>
        <p>
          Your order is reserved. Our concierge will call you on <strong>{order.phone}</strong> within the hour to confirm and send
          {order.payment === "mpesa" ? " your M-Pesa payment prompt." : order.payment === "card" ? " a secure card payment link." : " our bank details."}
        </p>
        <div className="confirm-summary">
          {order.items.map((i) => (
            <div className="sum-row" key={i.id}><span>{i.qty} × {i.brand} {i.name}</span><span>{formatKsh(i.price * i.qty)}</span></div>
          ))}
          <div className="sum-row"><span>{order.deliveryLabel}</span><span>{order.fee ? formatKsh(order.fee) : "Free"}</span></div>
          <div className="sum-row total"><span>Total</span><span>{formatKsh(order.total)}</span></div>
        </div>
        <div className="empty-actions">
          <a className="btn btn-royal" href={`https://wa.me/${whatsapp}?text=${msg}`} target="_blank" rel="noopener">
            <WhatsAppIcon width={18} height={18} /> Send order on WhatsApp
          </a>
          <a className="btn btn-ghost" href="/shop">Continue shopping</a>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <h2>Your bag is empty</h2>
        <p>Add a watch to your bag to check out.</p>
        <a className="btn btn-royal" href="/shop">Shop watches</a>
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const next = {};
    if (!data.name?.trim()) next.name = "Please enter your full name";
    if (!/^(\+?254|0)?[17]\d{8}$/.test((data.phone || "").replace(/\s/g, ""))) next.phone = "Enter a Kenyan number, e.g. 0712 345 678";
    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) next.email = "That email doesn't look right";
    if (delivery !== "pickup" && !data.address?.trim()) next.address = "Where should we deliver?";
    setErrors(next);
    if (Object.keys(next).length) {
      e.currentTarget.querySelector(`[name="${Object.keys(next)[0]}"]`)?.focus();
      return;
    }
    const placed = {
      ref: "ED-" + Date.now().toString(36).toUpperCase().slice(-6),
      name: data.name.trim(),
      phone: data.phone.trim(),
      items,
      fee,
      total,
      payment,
      deliveryLabel: deliveryOptions.find((d) => d.id === delivery).label,
      paymentLabel: paymentOptions.find((p) => p.id === payment).label,
    };
    try {
      const past = JSON.parse(localStorage.getItem("edens-orders") || "[]");
      localStorage.setItem("edens-orders", JSON.stringify([...past, { ...placed, data, at: new Date().toISOString() }]));
    } catch {}
    setOrder(placed);
    clearCart();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <form className="checkout-layout" onSubmit={submit} noValidate>
      <div className="checkout-main">
        <section className="checkout-step">
          <h2><span>1</span> Contact</h2>
          <div className="field-grid">
            <Field errors={errors} name="name" label="Full name" autoComplete="name" />
            <Field errors={errors} name="phone" label="Phone (M-Pesa)" type="tel" autoComplete="tel" placeholder="0712 345 678" />
            <Field errors={errors} name="email" label="Email" type="email" autoComplete="email" optional />
          </div>
        </section>

        <section className="checkout-step">
          <h2><span>2</span> Delivery</h2>
          <div className="option-cards">
            {deliveryOptions.map((d) => (
              <label key={d.id} className={`option-card${delivery === d.id ? " on" : ""}`}>
                <input type="radio" name="delivery" value={d.id} checked={delivery === d.id} onChange={() => setDelivery(d.id)} />
                <span className="option-title">{d.label}</span>
                <span className="option-note">{d.note}</span>
                <span className="option-fee">{d.fee ? formatKsh(d.fee) : "Free"}</span>
              </label>
            ))}
          </div>
          {delivery !== "pickup" && (
            <div className="field-grid">
              <label className="field">
                <span>County</span>
                <select name="county" defaultValue={delivery === "nairobi" ? "Nairobi" : ""}>
                  <option value="" disabled>Select county</option>
                  {COUNTIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <Field errors={errors} name="address" label="Building, street & area" autoComplete="street-address" placeholder="e.g. Delta Towers, Westlands" />
              <Field errors={errors} name="notes" label="Delivery notes" optional placeholder="Gate code, best time to call…" />
            </div>
          )}
        </section>

        <section className="checkout-step">
          <h2><span>3</span> Payment</h2>
          <div className="option-cards">
            {paymentOptions.map((p) => (
              <label key={p.id} className={`option-card${payment === p.id ? " on" : ""}`}>
                <input type="radio" name="payment" value={p.id} checked={payment === p.id} onChange={() => setPayment(p.id)} />
                <span className="option-title">{p.label}</span>
                <span className="option-note">{p.note}</span>
              </label>
            ))}
          </div>
          <p className="fine">Nothing is charged now. Our concierge confirms availability and sends payment details once you place the order.</p>
        </section>
      </div>

      <aside className="summary-card checkout-summary">
        <h2>Your order</h2>
        <ul className="mini-lines">
          {items.map((i) => (
            <li key={i.id}>
              <span className={`mini-img${i.exclusive ? " is-dark" : ""}`}><img src={i.image} alt="" /><em>{i.qty}</em></span>
              <span className="mini-text"><span className="line-brand">{i.brand}</span>{i.name}</span>
              <span>{formatKsh(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="sum-row"><span>Subtotal ({count})</span><span>{formatKsh(subtotal)}</span></div>
        {savings > 0 && <div className="sum-row save"><span>You're saving</span><span>{formatKsh(savings)}</span></div>}
        <div className="sum-row"><span>Delivery</span><span>{fee ? formatKsh(fee) : "Free"}</span></div>
        <div className="sum-row total"><span>Total</span><span>{formatKsh(total)}</span></div>
        <button className="btn btn-royal btn-lg btn-block" type="submit">Place order</button>
        <p className="drawer-note"><ShieldIcon width={16} height={16} /> Authenticity guaranteed · 14-day returns</p>
      </aside>
    </form>
  );
}
