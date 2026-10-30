// Cart and wishlist, kept in localStorage so they survive reloads and are shared by every island.
// Any change fires a window event, so separate islands (header button, drawer, pages) stay in sync.

const CART_KEY = "edens-cart-v1";
const WISH_KEY = "edens-wishlist-v1";
export const CART_EVENT = "edens:cart";
export const WISH_EVENT = "edens:wishlist";
export const OPEN_EVENT = "edens:cart-open";

const isBrowser = typeof window !== "undefined";

function read(key) {
  if (!isBrowser) return [];
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function write(key, value, eventName) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage full: the cart still works for this page view.
  }
  cache[key] = value;
  window.dispatchEvent(new CustomEvent(eventName, { detail: value }));
}

// useSyncExternalStore needs a stable snapshot between changes.
const cache = {};
const EMPTY = [];

function snapshot(key) {
  if (!isBrowser) return EMPTY;
  if (!(key in cache)) cache[key] = read(key);
  return cache[key];
}

if (isBrowser) {
  window.addEventListener("storage", (e) => {
    if (e.key === CART_KEY) {
      cache[CART_KEY] = read(CART_KEY);
      window.dispatchEvent(new CustomEvent(CART_EVENT));
    }
    if (e.key === WISH_KEY) {
      cache[WISH_KEY] = read(WISH_KEY);
      window.dispatchEvent(new CustomEvent(WISH_EVENT));
    }
  });
}

// ---------- Cart ----------

export const getCart = () => snapshot(CART_KEY);

export function subscribeCart(callback) {
  window.addEventListener(CART_EVENT, callback);
  return () => window.removeEventListener(CART_EVENT, callback);
}

// `product` is the small card shape from toCardProduct().
export function addToCart(product, qty = 1) {
  const items = getCart().map((i) => ({ ...i }));
  const line = items.find((i) => i.id === product.id);
  const max = product.stock || 99;
  if (line) line.qty = Math.min(max, line.qty + qty);
  else items.push({ ...product, qty: Math.min(max, qty) });
  write(CART_KEY, items, CART_EVENT);
}

export function setQty(id, qty) {
  const items = getCart()
    .map((i) => (i.id === id ? { ...i, qty: Math.max(0, Math.min(i.stock || 99, qty)) } : i))
    .filter((i) => i.qty > 0);
  write(CART_KEY, items, CART_EVENT);
}

export const removeFromCart = (id) => setQty(id, 0);
export const clearCart = () => write(CART_KEY, [], CART_EVENT);

export function cartTotals(items) {
  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const savings = items.reduce((s, i) => s + (i.compareAt > i.price ? (i.compareAt - i.price) * i.qty : 0), 0);
  return { count, subtotal, savings };
}

export function openCart() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

// ---------- Wishlist ----------

export const getWishlist = () => snapshot(WISH_KEY);

export function subscribeWishlist(callback) {
  window.addEventListener(WISH_EVENT, callback);
  return () => window.removeEventListener(WISH_EVENT, callback);
}

export function toggleWishlist(product) {
  const list = getWishlist();
  const next = list.some((p) => p.id === product.id) ? list.filter((p) => p.id !== product.id) : [...list, product];
  write(WISH_KEY, next, WISH_EVENT);
  return next.some((p) => p.id === product.id);
}

export const isWished = (id) => getWishlist().some((p) => p.id === id);
