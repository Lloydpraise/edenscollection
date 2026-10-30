// Builds store products from the private ledger and writes the public feed the Astro site reads.
//
// Ledger entry (sync/data/ledger.json, never committed because it holds wholesale prices):
//   { id, key, messageIds, photoIds, caption, date, images, status, firstSeen, updatedAt, wholesale, retail }
//   status: live | needs-review (no price found) | removed (supplier deleted the post)
//
// Everything below is recomputed from the stored caption on every run, so improvements to the parser,
// categories or pricing apply to old posts too.

import { parseCaption } from "./parse.js";
import { classify } from "./classify.js";
import { retailPrice } from "./pricing.js";
import { getSubcategory } from "../../src/data/categories.js";

export function slugify(s) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Refreshes the derived fields of a ledger entry in place and returns the store product (or null if the
// entry should not be on the site).
export function buildProduct(entry, override = {}) {
  const parsed = parseCaption(entry.caption);
  const title = entry.caption.split("\n").find((l) => l.trim()) || "";
  const { department, subcategory } = classify({ title, text: entry.caption, brand: parsed.brand });

  entry.wholesale = override.wholesale ?? parsed.wholesale;
  if (entry.status !== "removed") entry.status = entry.wholesale ? "live" : "needs-review";

  const sub = getSubcategory(override.department || department, override.subcategory || subcategory);
  const brand = parsed.brand;
  const name = parsed.name || singular(sub?.label || "Piece");
  const audience = { women: "women", men: "men", couples: "unisex" }[subcategory] || parsed.category;

  const product = {
    id: entry.id,
    slug: slugify(`${parsed.brandFound ? brand : ""} ${name} ${entry.id.replace(/^tg-/, "")}`),
    brand,
    name,
    reference: `ED-${entry.id.replace(/^tg-/, "")}`, // stock code; maps back to the supplier's post
    price: 0,
    compareAt: 0,
    department,
    subcategory,
    category: audience,
    condition: "new",
    exclusive: false,
    tags: [],
    stock: 1,
    year: "",
    movement: parsed.movement,
    caseSize: parsed.caseSize,
    caseMaterial: "",
    dialColour: "",
    strap: parsed.strap,
    waterResistance: parsed.waterResistance,
    boxPapers: "",
    description: parsed.description || `${parsed.brandFound ? `${brand} ` : ""}${name}, sourced and checked by the Edens team.`,
    highlights: parsed.highlights,
    images: entry.images,
    addedAt: new Date(entry.date * 1000).toISOString(),
    source: "telegram",
    ...strip(override),
  };
  product.price = override.price ?? (entry.wholesale ? retailPrice(entry.wholesale, product) : 0);
  entry.retail = product.price;

  if (entry.status !== "live" && override.price == null) return null;
  if (override.hidden || !entry.images.length) return null;
  return product;
}

// Override keys that only steer the sync, not fields of the product itself.
function strip({ hidden, wholesale, ...rest }) {
  return rest;
}

function singular(label) {
  return label.split(/ & | and /)[0].replace(/(es|s)$/i, (m) => (/(ches|shes|sses|xes)$/i.test(label.split(" ")[0]) ? "" : m === "es" ? "e" : ""));
}

export function buildFeed(ledger, overrides = {}) {
  return Object.values(ledger.entries)
    .sort((a, b) => b.date - a.date)
    .map((entry) => buildProduct(entry, overrides[entry.id]))
    .filter(Boolean);
}
