import ProductCard from "../components/react/ProductCard.jsx";
import { useWishlist } from "../lib/useStore.js";

export default function WishlistPage() {
  const list = useWishlist();
  if (list.length === 0) {
    return (
      <div className="empty-state">
        <h2>No saved watches yet</h2>
        <p>Tap the heart on any watch to keep it here while you decide.</p>
        <a className="btn btn-royal" href="/shop">Browse watches</a>
      </div>
    );
  }
  return (
    <div className="product-grid product-grid-4">
      {list.map((p) => (
        <ProductCard key={p.id} product={p} wished />
      ))}
    </div>
  );
}
