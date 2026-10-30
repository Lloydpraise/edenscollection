// Turns a supplier caption into the fields the store needs. Works for any product (watches, bags, shoes...);
// the watch-only fields (movement, case size) are simply left empty when the caption doesn't mention them.
//
// Supplier captions are free text, e.g.
//   ROLEX DATEJUST 41MM
//   Automatic movement, sapphire glass
//   Price: 4,500
// so everything here is a best guess. Posts where no price is found are held back for review.

export const WATCH_BRANDS = [
  "Audemars Piguet", "Patek Philippe", "Vacheron Constantin", "Richard Mille", "A. Lange & Söhne", "Jacob & Co",
  "Franck Muller", "TAG Heuer", "Daniel Wellington",
  "Rolex", "Omega", "Cartier", "Hublot", "Breitling", "IWC", "Panerai", "Tudor", "Longines", "Tissot", "Rado",
  "Chopard", "Bvlgari", "Zenith", "Blancpain", "Breguet", "Jaeger-LeCoultre", "Ulysse Nardin", "Seiko", "Citizen",
  "Casio", "G-Shock", "Invicta", "Swatch", "Hamilton",
  "Orient", "Movado", "Curren", "Naviforce", "Poedagar", "Skmei", "Lige", "Megir", "Benyar", "Forsining",
];

// Fashion houses: these sell watches too, so they don't decide the department on their own.
const FASHION_BRANDS = [
  "Michael Kors", "Hugo Boss", "Emporio Armani", "Tommy Hilfiger", "Armani", "Gucci", "Versace", "Diesel", "Guess",
  "Fossil",
  "Louis Vuitton", "Yves Saint Laurent", "Saint Laurent", "Christian Dior", "Kate Spade", "Calvin Klein",
  "Ralph Lauren", "Tom Ford", "Ray-Ban", "Off-White", "New Balance", "Dolce & Gabbana", "Salvatore Ferragamo",
  "Bottega Veneta", "Chanel", "Dior", "Hermès", "Prada", "Fendi", "Balenciaga", "Givenchy", "Valentino",
  "Burberry", "Celine", "Coach", "Goyard", "Lacoste", "Nike", "Adidas", "Jordan", "Puma", "Zara", "Pandora",
  "Tiffany", "Swarovski", "Montblanc", "Ferragamo", "Polo", "Timberland", "Clarks", "Aldo",
];

// Longest first, so "Emporio Armani" wins over "Armani" and "Christian Dior" over "Dior".
const BRANDS = [...WATCH_BRANDS, ...FASHION_BRANDS].sort((a, b) => b.length - a.length);

const ALIASES = {
  AP: "Audemars Piguet", PP: "Patek Philippe", Patek: "Patek Philippe", Tag: "TAG Heuer", RM: "Richard Mille",
  MK: "Michael Kors", Bulgari: "Bvlgari", LV: "Louis Vuitton", YSL: "Saint Laurent", "D&G": "Dolce & Gabbana",
  CK: "Calvin Klein", Hermes: "Hermès",
};
const FALLBACK_BRAND = "Edens Selection";

// A number like 4500, 4,500, 4.500, 4 500 or 4.5 (for "4.5k").
const NUM = String.raw`(\d{1,3}(?:[,. ]\d{3})+|\d+(?:\.\d+)?)`;

const PRICE_PATTERNS = [
  // "Price: 4,500", "Bei 4500", "Ksh 4,500", "KES. 4500", "💰4500"
  new RegExp(String.raw`(?:\b(?:price|bei|cost|kshs?|kes|sh)|💰|💵)\.?\s*[:=\-–@]?\s*${NUM}(\s*k\b)?`, "i"),
  // "4,500/=", "4500/-", "4500 ksh", "4.5k"
  new RegExp(String.raw`${NUM}(\s*k\b|\s*(?:\/=|\/-)|\s*(?:kshs?|kes|bob)\b)`, "i"),
  // "@4500"
  new RegExp(String.raw`@\s*${NUM}(\s*k\b)?`, "i"),
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const MIN_PRICE = 100; // anything lower is a model number or a size, not a price

export function parsePrice(text) {
  for (const pattern of PRICE_PATTERNS) {
    for (const line of text.split("\n")) {
      const match = line.match(pattern);
      if (!match) continue;
      const thousands = /^\s*k$/i.test(match[2] || "");
      const value = thousands ? Number(match[1]) * 1000 : Number(match[1].replace(/[,. ]/g, ""));
      if (Number.isFinite(value) && value >= MIN_PRICE) return { price: Math.round(value), line, match: match[0] };
    }
  }
  return null;
}

// The brand mentioned first wins ("Casio G-Shock" is Casio); on a tie the longer name wins.
export function findBrand(text) {
  const lower = text.toLowerCase();
  let best = null;
  const consider = (index, brand) => {
    if (index >= 0 && (!best || index < best.index)) best = { index, brand };
  };
  for (const brand of BRANDS) consider(lower.indexOf(brand.toLowerCase()), brand);
  for (const [alias, brand] of Object.entries(ALIASES)) {
    const m = text.match(new RegExp(`(^|[^\\w])${escape(alias)}($|[^\\w])`));
    if (m) consider(m.index + m[1].length, brand);
  }
  return best?.brand ?? null;
}

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

function clean(line) {
  return line.replace(EMOJI, "").replace(/^[\s*•\-–—#>]+/, "").replace(/\s+/g, " ").trim();
}

function titleCase(s) {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\b(\d+)Mm\b/g, "$1mm");
}

function guessCategory(text) {
  if (/\b(couple|couples|unisex|pair)\b/i.test(text)) return "unisex";
  if (/\b(ladies|lady|women'?s?|woman|female|her)\b/i.test(text)) return "women";
  if (/\b(men'?s?|gents?|male|his)\b/i.test(text)) return "men";
  return "unisex";
}

function guess(text, options) {
  for (const [pattern, value] of options) if (pattern.test(text)) return value;
  return "";
}

// soldPattern (optional) strips "SOLD" marks so they don't end up in the name or description.
export function parseCaption(caption = "", { soldPattern } = {}) {
  let text = caption.replace(/\r/g, "");
  if (soldPattern) text = text.replace(new RegExp(soldPattern.source, "giu"), "$1").replace(/[ \t]+/g, " ");
  const priceHit = parsePrice(text);
  const brand = findBrand(text);

  // Contact lines, hashtags and the price line say nothing about the watch.
  const noise = /(whats\s?app|call|inbox|dm\b|order now|available|t\.me|https?:|^#|\+?254|07\d{8})/i;
  // The price is cut out of its line, so "Gucci sneakers @4500" still gives a name.
  const lines = text
    .split("\n")
    .map((l) => (priceHit && l === priceHit.line ? l.replace(priceHit.match, "") : l))
    .map(clean)
    .filter((l) => l && !noise.test(l));

  let name = lines[0] || "";
  if (brand) name = name.replace(new RegExp(escape(brand), "i"), "");
  for (const alias of Object.keys(ALIASES)) name = name.replace(new RegExp(`^\\s*${escape(alias)}(?=$|[^\\w])`), "");
  name = titleCase(clean(name)).slice(0, 70);
  name = name.charAt(0).toUpperCase() + name.slice(1);

  const details = lines.slice(1).map(titleCase);
  const size = text.match(/(\d{2}(?:\.\d)?)\s*mm\b/i);

  return {
    wholesale: priceHit?.price ?? null,
    brand: brand || FALLBACK_BRAND,
    brandFound: Boolean(brand),
    name,
    description: details.length ? details.map((d) => (/[.!?]$/.test(d) ? d : `${d}.`)).join(" ") : "",
    highlights: details.filter((d) => d.length <= 40).slice(0, 3),
    category: guessCategory(text),
    caseSize: size ? `${size[1]} mm` : "",
    movement: guess(text, [[/automatic|self.?winding/i, "Automatic"], [/mechanical|hand.?wound/i, "Mechanical"], [/solar/i, "Solar quartz"], [/quartz|battery/i, "Quartz"]]),
    strap: guess(text, [[/leather/i, "Leather strap"], [/rubber|silicone/i, "Rubber strap"], [/mesh/i, "Mesh bracelet"], [/chain|bracelet|stainless|steel/i, "Steel bracelet"]]),
    waterResistance: guess(text, [[/water\s?(proof|resistant)/i, "Water resistant"]]),
  };
}
