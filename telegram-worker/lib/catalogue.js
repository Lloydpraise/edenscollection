// Turns a supplier post into a row of the VVStudios `products` table (the table Heysasa already uses).
//
//   id            tg_<channelId>_<firstMessageId>     telegram_id   first message id of the post/album
//   stock_price   wholesale (never shown publicly)    price         retail = wholesale + markup
//   category      department slug (watches, bags…)    product_type  subcategory slug
//   status        approved when a price was read, discovered when not (needs review in /admin)
//   sold          stock_quantity 0 + discovery_meta.sold_at, stays visible with a Sold badge
//   removed       supplier deleted the post: is_visible false + discovery_meta.removed_at
//
// Edits made in /admin survive: any column listed in discovery_meta.locked keeps its current value.
// Everything else is recomputed from the stored caption on every run, so parser, category and pricing
// improvements reach old posts too.

import { parseCaption } from "./parse.js";
import { classify } from "./classify.js";
import { retailPrice } from "./pricing.js";

export function slugify(s) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const productId = (channelId, firstMessageId) => `tg_${channelId}_${firstMessageId}`;

const iso = (unix) => (unix ? new Date(unix * 1000).toISOString() : null);

// state: { id, messageIds, photoIds, caption, postedAt, images, soldAt, soldVia, removedAt } (unix seconds)
// existing: the current row, if any.
export function buildRow(state, { businessId, markup, soldPattern, existing = null }) {
  const parsed = parseCaption(state.caption, { soldPattern });
  const title = state.caption.split("\n").find((l) => l.trim()) || "";
  const { department, subcategory } = classify({ title, text: state.caption, brand: parsed.brand });
  const name = parsed.name || subcategory.charAt(0).toUpperCase() + subcategory.slice(1);
  const fullTitle = parsed.brandFound ? `${parsed.brand} ${name}` : name;
  const wholesale = parsed.wholesale;
  const keptStatus = ["approved", "dismissed"].includes(existing?.status) ? existing.status : null;

  const row = {
    id: state.id,
    business_id: businessId,
    title: fullTitle,
    description_short: parsed.highlights[0] || null,
    description_long: parsed.description || `${fullTitle}, sourced and checked by the Edens team.`,
    price: wholesale ? retailPrice(wholesale, { markup }) : null,
    old_price: null,
    stock_price: wholesale,
    stock_quantity: state.soldAt ? 0 : 1,
    is_visible: !state.removedAt && state.images.length > 0,
    images: state.images,
    type: "product",
    key_features: parsed.highlights,
    telegram_id: String(state.messageIds[0]),
    needs_polish: false,
    handle: slugify(`${fullTitle} ${state.messageIds[0]}`),
    source: "telegram",
    status: keptStatus || (wholesale ? "approved" : "discovered"),
    category: department,
    category_source: "telegram",
    product_type: subcategory,
    discovered_at: iso(state.postedAt),
    discovery_meta: {
      ...(existing?.discovery_meta || {}),
      message_ids: state.messageIds,
      photo_ids: state.photoIds,
      caption: state.caption,
      posted_at: iso(state.postedAt),
      brand: parsed.brand,
      brand_found: parsed.brandFound,
      subcategory,
      audience: parsed.category,
      specs: { movement: parsed.movement, caseSize: parsed.caseSize, strap: parsed.strap, waterResistance: parsed.waterResistance },
      sold_at: iso(state.soldAt),
      sold_via: state.soldVia || null,
      removed_at: iso(state.removedAt),
    },
  };

  // /admin also locks two meta fields: "sold" (its own sold / not-sold call) and "brand".
  const locked = existing?.discovery_meta?.locked || [];
  for (const column of locked) {
    if (column in existing && column !== "discovery_meta") row[column] = existing[column];
  }
  const oldMeta = existing?.discovery_meta || {};
  if (locked.includes("sold")) {
    Object.assign(row.discovery_meta, { sold_at: oldMeta.sold_at ?? null, sold_via: oldMeta.sold_via ?? null });
    row.stock_quantity = existing.stock_quantity;
  }
  if (locked.includes("brand")) row.discovery_meta.brand = oldMeta.brand;
  return row;
}

// The parts of an existing row the worker needs to carry on where the last run stopped.
export function stateFromRow(row) {
  const meta = row.discovery_meta || {};
  const unix = (s) => (s ? Math.floor(Date.parse(s) / 1000) : null);
  return {
    id: row.id,
    messageIds: meta.message_ids || [Number(row.telegram_id)],
    photoIds: meta.photo_ids || [],
    caption: meta.caption || "",
    postedAt: unix(meta.posted_at),
    images: row.images || [],
    soldAt: unix(meta.sold_at),
    soldVia: meta.sold_via || null,
    removedAt: unix(meta.removed_at),
  };
}
