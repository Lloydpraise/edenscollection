// products.js
// Replace these with your Supabase project values
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-public-anon-key';

document.addEventListener('DOMContentLoaded', () => {
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.error('Supabase client not found. Ensure the CDN script is loaded.');
    if (window.showToast) showToast('Supabase client not loaded');
    return;
  }

  const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  async function loadProducts() {
    try {
      const { data, error } = await client.from('products').select('*');
      if (error) throw error;
      renderProducts(data || []);
    } catch (err) {
      console.error('Failed to load products:', err);
      if (window.showToast) showToast('Failed to load products');
    }
  }

  function renderProducts(list) {
    const grids = {
      bestsellers: document.getElementById('grid-bestsellers'),
      newin: document.getElementById('grid-newin'),
      sale: document.getElementById('grid-sale')
    };

    // clear grids
    Object.values(grids).forEach(g => { if (g) g.innerHTML = ''; });

    list.forEach((p, idx) => {
      const cat = (p.category || 'bestsellers').toLowerCase();
      const grid = grids[cat] || grids.bestsellers;
      if (!grid) return;

      const card = document.createElement('div');
      card.className = 'product-card reveal reveal-delay-' + ((idx % 4) + 1);

      const imgWrap = document.createElement('div');
      imgWrap.className = 'product-img-wrap';

      if (p.badge) {
        const badge = document.createElement('span');
        badge.className = 'product-badge' + (p.badge_type === 'sale' ? ' sale' : '');
        badge.textContent = p.badge;
        imgWrap.appendChild(badge);
      }

      const wishBtn = document.createElement('button');
      wishBtn.className = 'product-wishlist-btn';
      wishBtn.title = 'Wishlist';
      wishBtn.textContent = '♡';
      imgWrap.appendChild(wishBtn);

      const img = document.createElement('img');
      img.src = p.image_url || p.image || 'https://via.placeholder.com/400?text=No+image';
      img.alt = p.name || p.title || 'Product image';
      imgWrap.appendChild(img);

      card.appendChild(imgWrap);

      const brand = document.createElement('div'); brand.className = 'product-brand'; brand.textContent = p.brand || '';
      const name = document.createElement('div'); name.className = 'product-name'; name.textContent = p.name || p.title || '';
      const desc = document.createElement('div'); desc.className = 'product-desc'; desc.textContent = p.description || p.desc || '';

      const price = document.createElement('div'); price.className = 'product-price';
      if (p.sale_price && p.old_price) {
        const saleSpan = document.createElement('span'); saleSpan.className = 'sale-price'; saleSpan.textContent = p.sale_price;
        const oldSpan = document.createElement('span'); oldSpan.className = 'old'; oldSpan.textContent = p.old_price;
        price.appendChild(saleSpan); price.appendChild(oldSpan);
      } else {
        price.textContent = p.price || p.sale_price || '';
      }

      const actions = document.createElement('div'); actions.className = 'product-actions';
      const cartBtn = document.createElement('button'); cartBtn.className = 'btn-cart'; cartBtn.textContent = 'Add to Cart';
      cartBtn.addEventListener('click', () => {
        if (window.addToCart) addToCart(p.name || p.title || 'Item'); else if (window.showToast) showToast((p.name || p.title || 'Item') + ' added to cart');
      });
      const buyBtn = document.createElement('button'); buyBtn.className = 'btn-buy'; buyBtn.textContent = 'Buy Now';
      buyBtn.addEventListener('click', () => { if (window.showToast) showToast('Redirecting to checkout...'); });

      actions.appendChild(cartBtn); actions.appendChild(buyBtn);

      card.appendChild(brand);
      card.appendChild(name);
      card.appendChild(desc);
      card.appendChild(price);
      card.appendChild(actions);

      grid.appendChild(card);
    });

    // observe newly inserted reveal elements so animations still work
    if (window.observer) {
      document.querySelectorAll('.products-grid .reveal').forEach(el => window.observer.observe(el));
    }
  }

  loadProducts();
});
