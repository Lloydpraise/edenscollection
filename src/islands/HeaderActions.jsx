// Wishlist link and the royal green bag button in the header.
import { useEffect, useState } from "react";
import { useCart, useWishlist } from "../lib/useStore.js";
import { cartTotals, openCart, CART_EVENT } from "../lib/cart.js";
import { BagIcon, HeartIcon } from "../components/react/icons.jsx";

export default function HeaderActions() {
  const items = useCart();
  const wish = useWishlist();
  const { count } = cartTotals(items);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setBump(true);
      setTimeout(() => setBump(false), 450);
    };
    window.addEventListener(CART_EVENT, onChange);
    return () => window.removeEventListener(CART_EVENT, onChange);
  }, []);

  return (
    <>
      <a className="icon-btn wish-link" href="/wishlist" aria-label={`Wishlist, ${wish.length} saved`}>
        <HeartIcon width={18} height={18} />
        {wish.length > 0 && <span className="dot-count">{wish.length}</span>}
      </a>
      <button className={`bag-btn${bump ? " bump" : ""}`} type="button" onClick={openCart} aria-label={`Open bag, ${count} items`}>
        <BagIcon width={19} height={19} />
        <span className="bag-label">Bag</span>
        <span className="bag-count" aria-hidden="true">{count}</span>
      </button>
    </>
  );
}
