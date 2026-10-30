// The supplier's stock, read from Supabase (VVStudios) when the site is built. The Telegram worker
// (telegram-worker/) fills the products table; this reads the public `edens_storefront_products` view,
// which only exposes approved, visible products and never the wholesale price.
//
// Needs SUPABASE_URL and SUPABASE_ANON_KEY at build time. Without them the site builds with the samples only.

const url = import.meta.env.SUPABASE_URL;
const key = import.meta.env.SUPABASE_ANON_KEY;
const FALLBACK_BRAND = "Edens Selection";

export async function loadSupplierProducts() {
  if (!url || !key) return [];
  const res = await fetch(`${url}/rest/v1/edens_storefront_products?select=*&order=discovered_at.desc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Couldn't load supplier products from Supabase: ${res.status} ${await res.text()}`);
  return (await res.json()).map(toSiteProduct);
}

function toSiteProduct(r) {
  const brand = r.brand_found && r.brand ? r.brand : FALLBACK_BRAND;
  const name = r.brand_found && r.title.startsWith(`${r.brand} `) ? r.title.slice(r.brand.length + 1) : r.title;
  const audience = { women: "women", men: "men", couples: "unisex" }[r.product_type] || r.audience || "unisex";
  const specs = r.specs || {};
  return {
    id: r.id,
    slug: r.handle || r.id,
    brand,
    name,
    reference: r.telegram_id ? `ED-${r.telegram_id}` : "",
    price: Number(r.price),
    compareAt: Number(r.old_price) || 0,
    department: r.category || "more",
    subcategory: r.product_type || "other",
    category: audience,
    condition: "new",
    exclusive: false,
    tags: [],
    stock: r.stock_quantity ?? 1,
    soldAt: r.sold_at || null,
    year: "",
    movement: specs.movement || "",
    caseSize: specs.caseSize || "",
    caseMaterial: "",
    dialColour: "",
    strap: specs.strap || "",
    waterResistance: specs.waterResistance || "",
    boxPapers: "",
    description: r.description_long || r.description_short || "",
    highlights: r.key_features || [],
    images: r.images || [],
    addedAt: r.discovered_at,
    source: "telegram",
  };
}
