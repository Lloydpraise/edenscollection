// The Edens Watches catalogue.
//
// Each watch has an `art` block that drives the illustrated renders in /watches/<slug>-<view>.svg,
// used until real photography is added. To use photos, fill `images` with URLs (first one is the cover)
// and the illustrations are skipped for that watch.
//
//   category   men | women | unisex
//   condition  new | pre-owned
//   exclusive  true puts the watch in The Black Collection (shown on black)
//   tags       bestseller | new  (drive the home page rails)
//   department / subcategory  see categories.js (the sample watches below all sit under watches)
//
// Real stock arrives from the supplier's Telegram channel: telegram-worker/ saves it in Supabase and
// supplier.js reads it at build time. It is listed after the samples here.

import { loadSupplierProducts } from "./supplier.js";
import { departments, getDepartment } from "./categories.js";

const NEW_FOR_DAYS = 21;

const sampleProducts = [
  {
    id: "w001",
    slug: "rolex-submariner-date-126610lv",
    brand: "Rolex",
    name: "Submariner Date",
    reference: "126610LV",
    price: 2450000,
    compareAt: 0,
    category: "men",
    condition: "new",
    exclusive: false,
    tags: ["bestseller"],
    stock: 2,
    year: 2025,
    movement: "Automatic, Calibre 3235",
    caseSize: "41 mm",
    caseMaterial: "Oystersteel",
    dialColour: "Black",
    strap: "Oyster bracelet",
    waterResistance: "300 m",
    boxPapers: "Full set: box, papers, warranty card",
    description:
      "The diver's watch that defined a category, finished with the green Cerachrom bezel collectors call the 'Starbucks'. Unworn, with a full set and the remainder of the manufacturer warranty.",
    highlights: ["Green Cerachrom bezel", "70-hour power reserve", "Unworn, full set"],
    images: [],
    art: { shape: "round", metal: "steel", dial: "#0d0f0e", bezel: "#0f5a3a", bezelType: "diver", strap: "bracelet", hands: "mercedes", date: true },
  },
  {
    id: "w002",
    slug: "omega-seamaster-diver-300m",
    brand: "Omega",
    name: "Seamaster Diver 300M",
    reference: "210.30.42.20.03.001",
    price: 845000,
    compareAt: 920000,
    category: "men",
    condition: "new",
    exclusive: false,
    tags: ["bestseller"],
    stock: 4,
    year: 2025,
    movement: "Automatic, Co-Axial Master Chronometer 8800",
    caseSize: "42 mm",
    caseMaterial: "Stainless steel",
    dialColour: "Wave blue",
    strap: "Steel bracelet",
    waterResistance: "300 m",
    boxPapers: "Full set",
    description:
      "Laser-engraved wave dial, ceramic bezel and a helium escape valve at ten. One of the most complete everyday divers you can own, now at our best price of the season.",
    highlights: ["Master Chronometer certified", "Ceramic bezel", "Helium escape valve"],
    images: [],
    art: { shape: "round", metal: "steel", dial: "#16365e", bezel: "#122c4d", bezelType: "diver", strap: "bracelet", hands: "sword", date: true },
  },
  {
    id: "w003",
    slug: "cartier-tank-must-large",
    brand: "Cartier",
    name: "Tank Must, Large",
    reference: "WSTA0041",
    price: 465000,
    compareAt: 0,
    category: "women",
    condition: "new",
    exclusive: false,
    tags: ["new"],
    stock: 3,
    year: 2025,
    movement: "Quartz",
    caseSize: "33.7 × 25.5 mm",
    caseMaterial: "Stainless steel",
    dialColour: "Silvered, Roman numerals",
    strap: "Black alligator leather",
    waterResistance: "30 m",
    boxPapers: "Full set",
    description:
      "A rectangle that has stayed in style for over a century. Roman numerals, a railway minute track and blued sword hands; quietly perfect on any wrist.",
    highlights: ["Blued steel hands", "Synthetic spinel cabochon crown", "Interchangeable strap"],
    images: [],
    art: { shape: "tank", metal: "steel", dial: "#ece8df", bezelType: "none", strap: "leather", strapColour: "#121212", hands: "sword", numerals: "roman" },
  },
  {
    id: "w004",
    slug: "patek-philippe-nautilus-5711-1a",
    brand: "Patek Philippe",
    name: "Nautilus",
    reference: "5711/1A-010",
    price: 14800000,
    compareAt: 0,
    category: "men",
    condition: "pre-owned",
    exclusive: true,
    tags: ["bestseller"],
    stock: 1,
    year: 2019,
    movement: "Automatic, Calibre 26-330 S C",
    caseSize: "40 mm",
    caseMaterial: "Stainless steel",
    dialColour: "Blue-grey, horizontal embossing",
    strap: "Integrated steel bracelet",
    waterResistance: "120 m",
    boxPapers: "Full set, 2019 papers",
    description:
      "The discontinued blue Nautilus in excellent condition. Serviced, authenticated and offered privately; viewings by appointment at our Nairobi salon.",
    highlights: ["Discontinued reference", "Recently serviced", "Private viewing available"],
    images: [],
    art: { shape: "octagon", metal: "steel", dial: "#24384f", bezelType: "none", strap: "integrated", hands: "baton", date: true, texture: "lines" },
  },
  {
    id: "w005",
    slug: "audemars-piguet-royal-oak-15510st",
    brand: "Audemars Piguet",
    name: "Royal Oak Selfwinding",
    reference: "15510ST.OO.1320ST.06",
    price: 9650000,
    compareAt: 0,
    category: "men",
    condition: "new",
    exclusive: true,
    tags: ["new"],
    stock: 1,
    year: 2024,
    movement: "Automatic, Calibre 4302",
    caseSize: "41 mm",
    caseMaterial: "Stainless steel",
    dialColour: "Black Grande Tapisserie",
    strap: "Integrated steel bracelet",
    waterResistance: "50 m",
    boxPapers: "Full set",
    description:
      "Eight hexagonal screws, a Grande Tapisserie dial and the bracelet that started the luxury sports watch. Unworn and allocated to Edens clients only.",
    highlights: ["Grande Tapisserie dial", "70-hour power reserve", "Unworn"],
    images: [],
    art: { shape: "octagon", metal: "steel", dial: "#121417", bezelType: "none", strap: "integrated", hands: "baton", date: true, texture: "grid" },
  },
  {
    id: "w006",
    slug: "rolex-datejust-36-mint-green",
    brand: "Rolex",
    name: "Datejust 36",
    reference: "126234",
    price: 1650000,
    compareAt: 0,
    category: "unisex",
    condition: "new",
    exclusive: false,
    tags: ["new", "bestseller"],
    stock: 2,
    year: 2025,
    movement: "Automatic, Calibre 3235",
    caseSize: "36 mm",
    caseMaterial: "Oystersteel & white gold",
    dialColour: "Mint green",
    strap: "Jubilee bracelet",
    waterResistance: "100 m",
    boxPapers: "Full set",
    description:
      "The fluted white-gold bezel catches light from across the room while the mint green dial keeps it fresh. Sized at 36 mm, it wears beautifully on any wrist.",
    highlights: ["Fluted white-gold bezel", "Jubilee bracelet", "Cyclops date"],
    images: [],
    art: { shape: "round", metal: "steel", dial: "#a9cdb8", bezel: "#d9dbdd", bezelType: "fluted", strap: "bracelet", hands: "baton", date: true },
  },
  {
    id: "w007",
    slug: "tag-heuer-carrera-chronograph",
    brand: "TAG Heuer",
    name: "Carrera Chronograph",
    reference: "CBN2A1B.BA0643",
    price: 685000,
    compareAt: 760000,
    category: "men",
    condition: "new",
    exclusive: false,
    tags: ["bestseller"],
    stock: 5,
    year: 2025,
    movement: "Automatic, Heuer 02",
    caseSize: "44 mm",
    caseMaterial: "Stainless steel",
    dialColour: "Black",
    strap: "Steel bracelet",
    waterResistance: "100 m",
    boxPapers: "Full set",
    description:
      "A racing chronograph with an 80-hour in-house movement and a crisp black dial. Sporty enough for the weekend, sharp enough for a suit.",
    highlights: ["In-house Heuer 02", "80-hour power reserve", "Sapphire caseback"],
    images: [],
    art: { shape: "round", metal: "steel", dial: "#151515", bezel: "#1b1b1b", bezelType: "tachy", strap: "bracelet", hands: "baton", chrono: true },
  },
  {
    id: "w008",
    slug: "cartier-ballon-bleu-33-rose-gold",
    brand: "Cartier",
    name: "Ballon Bleu 33",
    reference: "WGBB0054",
    price: 2180000,
    compareAt: 0,
    category: "women",
    condition: "new",
    exclusive: false,
    tags: ["new"],
    stock: 1,
    year: 2025,
    movement: "Automatic, Calibre 076",
    caseSize: "33 mm",
    caseMaterial: "18k rose gold",
    dialColour: "Silvered guilloché",
    strap: "Rose gold bracelet",
    waterResistance: "30 m",
    boxPapers: "Full set",
    description:
      "A rounded case that floats on the wrist, a guilloché dial and the signature crown guard holding a blue spinel. Solid rose gold throughout.",
    highlights: ["Solid 18k rose gold", "Guilloché dial", "Blue spinel crown"],
    images: [],
    art: { shape: "round", metal: "rose", dial: "#efe9e2", bezelType: "none", strap: "bracelet", hands: "sword", numerals: "roman", texture: "guilloche" },
  },
  {
    id: "w009",
    slug: "a-lange-sohne-lange-1",
    brand: "A. Lange & Söhne",
    name: "Lange 1",
    reference: "191.032",
    price: 8900000,
    compareAt: 0,
    category: "men",
    condition: "pre-owned",
    exclusive: true,
    tags: [],
    stock: 1,
    year: 2021,
    movement: "Manual, Calibre L121.1",
    caseSize: "38.5 mm",
    caseMaterial: "18k pink gold",
    dialColour: "Argenté",
    strap: "Brown alligator leather",
    waterResistance: "30 m",
    boxPapers: "Full set, 2021 papers",
    description:
      "Off-centre dial, outsize date and German silver bridges you can study for hours. A collector's dress watch in near-mint condition.",
    highlights: ["Outsize date", "Hand-engraved balance cock", "Near-mint"],
    images: [],
    art: { shape: "round", metal: "gold", dial: "#ece6da", bezelType: "none", strap: "leather", strapColour: "#3a2418", hands: "baton", date: false },
  },
  {
    id: "w010",
    slug: "iwc-pilot-mark-xx",
    brand: "IWC",
    name: "Pilot's Watch Mark XX",
    reference: "IW328201",
    price: 610000,
    compareAt: 0,
    category: "men",
    condition: "new",
    exclusive: false,
    tags: ["new"],
    stock: 3,
    year: 2025,
    movement: "Automatic, Calibre 32111",
    caseSize: "40 mm",
    caseMaterial: "Stainless steel",
    dialColour: "Black",
    strap: "Black calfskin",
    waterResistance: "100 m",
    boxPapers: "Full set",
    description:
      "Cockpit legibility in a slimmer 40 mm case, with a 120-hour movement and a soft-iron inner case against magnetism.",
    highlights: ["120-hour power reserve", "Anti-magnetic", "EasX-CHANGE strap system"],
    images: [],
    art: { shape: "round", metal: "steel", dial: "#111213", bezelType: "none", strap: "leather", strapColour: "#1a1a1a", hands: "sword", numerals: "arabic", date: true },
  },
  {
    id: "w011",
    slug: "rolex-day-date-40-yellow-gold",
    brand: "Rolex",
    name: "Day-Date 40",
    reference: "228238",
    price: 6750000,
    compareAt: 0,
    category: "men",
    condition: "pre-owned",
    exclusive: true,
    tags: ["bestseller"],
    stock: 1,
    year: 2022,
    movement: "Automatic, Calibre 3255",
    caseSize: "40 mm",
    caseMaterial: "18k yellow gold",
    dialColour: "Green",
    strap: "President bracelet",
    waterResistance: "100 m",
    boxPapers: "Full set, 2022 papers",
    description:
      "The President, in yellow gold with a deep green dial. Day and date spelled out in full, on the bracelet made only in precious metals.",
    highlights: ["Solid 18k yellow gold", "President bracelet", "Excellent condition"],
    images: [],
    art: { shape: "round", metal: "gold", dial: "#0f4a33", bezel: "#d8b56a", bezelType: "fluted", strap: "bracelet", hands: "baton", date: true },
  },
  {
    id: "w012",
    slug: "tudor-black-bay-58",
    brand: "Tudor",
    name: "Black Bay 58",
    reference: "M79030B-0001",
    price: 520000,
    compareAt: 0,
    category: "unisex",
    condition: "new",
    exclusive: false,
    tags: ["bestseller", "new"],
    stock: 6,
    year: 2025,
    movement: "Automatic, MT5402",
    caseSize: "39 mm",
    caseMaterial: "Stainless steel",
    dialColour: "Navy blue",
    strap: "Riveted steel bracelet",
    waterResistance: "200 m",
    boxPapers: "Full set",
    description:
      "Vintage diver proportions in a 39 mm case that suits almost every wrist. Snowflake hands, gilt-free navy dial and a five-year warranty.",
    highlights: ["Snowflake hands", "Manufacture calibre", "5-year warranty"],
    images: [],
    art: { shape: "round", metal: "steel", dial: "#1b2b46", bezel: "#1d2d4a", bezelType: "diver", strap: "bracelet", hands: "baton", date: false },
  },
  {
    id: "w013",
    slug: "chopard-happy-sport-30",
    brand: "Chopard",
    name: "Happy Sport 30",
    reference: "278590-3001",
    price: 980000,
    compareAt: 1080000,
    category: "women",
    condition: "new",
    exclusive: false,
    tags: ["new"],
    stock: 2,
    year: 2025,
    movement: "Quartz",
    caseSize: "30 mm",
    caseMaterial: "Stainless steel",
    dialColour: "White mother-of-pearl",
    strap: "Steel bracelet",
    waterResistance: "30 m",
    boxPapers: "Full set",
    description:
      "Five diamonds dance freely between two sapphire crystals over a mother-of-pearl dial. Playful, polished and made to be worn every day.",
    highlights: ["Five moving diamonds", "Mother-of-pearl dial", "Steel bracelet"],
    images: [],
    art: { shape: "round", metal: "steel", dial: "#f3efea", bezelType: "none", strap: "bracelet", hands: "baton", numerals: "roman", diamonds: true },
  },
  {
    id: "w014",
    slug: "vacheron-constantin-overseas",
    brand: "Vacheron Constantin",
    name: "Overseas Self-Winding",
    reference: "4500V/110A-B483",
    price: 7400000,
    compareAt: 0,
    category: "men",
    condition: "new",
    exclusive: true,
    tags: [],
    stock: 1,
    year: 2024,
    movement: "Automatic, Calibre 5100",
    caseSize: "41 mm",
    caseMaterial: "Stainless steel",
    dialColour: "Lacquered black",
    strap: "Steel bracelet + rubber & leather",
    waterResistance: "150 m",
    boxPapers: "Full set, three straps",
    description:
      "Maltese-cross bracelet links, a translucent lacquered dial and a quick-change system for three straps in the box. Haute horlogerie, ready for travel.",
    highlights: ["Three straps included", "Hallmark of Geneva", "60-hour power reserve"],
    images: [],
    art: { shape: "round", metal: "steel", dial: "#0f1114", bezel: "#c9ccd0", bezelType: "notched", strap: "bracelet", hands: "baton", date: true },
  },
  {
    id: "w015",
    slug: "longines-master-collection-moonphase",
    brand: "Longines",
    name: "Master Collection",
    reference: "L2.909.4.78.3",
    price: 395000,
    compareAt: 0,
    category: "men",
    condition: "new",
    exclusive: false,
    tags: [],
    stock: 4,
    year: 2025,
    movement: "Automatic, L899",
    caseSize: "40 mm",
    caseMaterial: "Stainless steel",
    dialColour: "Sunray blue",
    strap: "Blue alligator leather",
    waterResistance: "30 m",
    boxPapers: "Full set",
    description:
      "A sunray blue dial, applied numerals and a 72-hour silicon-sprung movement. Classic Swiss dress watch at a sensible price.",
    highlights: ["Silicon balance spring", "72-hour power reserve", "Sunray dial"],
    images: [],
    art: { shape: "round", metal: "steel", dial: "#203e72", bezelType: "none", strap: "leather", strapColour: "#14223f", hands: "baton", numerals: "arabic", date: true },
  },
  {
    id: "w016",
    slug: "rolex-lady-datejust-28",
    brand: "Rolex",
    name: "Lady-Datejust 28",
    reference: "279171",
    price: 1980000,
    compareAt: 0,
    category: "women",
    condition: "pre-owned",
    exclusive: false,
    tags: ["bestseller"],
    stock: 1,
    year: 2023,
    movement: "Automatic, Calibre 2236",
    caseSize: "28 mm",
    caseMaterial: "Oystersteel & Everose gold",
    dialColour: "Chocolate",
    strap: "Jubilee bracelet",
    waterResistance: "100 m",
    boxPapers: "Full set, 2023 papers",
    description:
      "Two-tone Everose and steel with a rich chocolate dial. Worn lightly and freshly polished, it arrives looking close to new.",
    highlights: ["Everose gold bezel", "Chocolate dial", "Excellent condition"],
    images: [],
    art: { shape: "round", metal: "twotone", dial: "#4a2c22", bezel: "#d6a88c", bezelType: "smooth", strap: "bracelet", hands: "baton", date: true },
  },
].map((p) => ({ department: "watches", subcategory: p.category === "women" ? "women" : "men", ...p }));

// Supplier pieces have photos, so they skip the illustrations; recent ones get the "new" tag.
const supplierProducts = (await loadSupplierProducts()).map((p) => ({
  ...p,
  art: null,
  tags: p.stock > 0 && Date.now() - Date.parse(p.addedAt) < NEW_FOR_DAYS * 864e5 ? ["new"] : [],
}));

export const products = [...sampleProducts, ...supplierProducts];

// Departments and subcategories that have at least one product, with counts, for menus and /category pages.
// Watches lead, the rest follow the order in categories.js.
export const catalogueTree = [...departments]
  .sort((a, b) => (b.slug === "watches") - (a.slug === "watches"))
  .map((d) => {
    const items = products.filter((p) => p.department === d.slug);
    const subcategories = d.subcategories
      .map((s) => ({ slug: s.slug, label: s.label, count: items.filter((p) => p.subcategory === s.slug).length }))
      .filter((s) => s.count);
    return { slug: d.slug, label: d.label, count: items.length, subcategories };
  })
  .filter((d) => d.count);

export function departmentLabel(slug) {
  return getDepartment(slug)?.label ?? slug;
}

export const brands = [...new Set(products.map((p) => p.brand))].sort();

export function getProduct(slug) {
  return products.find((p) => p.slug === slug);
}

export function coverImage(product) {
  return product.images?.[0] || `/watches/${product.slug}-front.svg`;
}

export function galleryImages(product) {
  if (product.images?.length) return product.images;
  return ["front", "dial", "salon"].map((view) => `/watches/${product.slug}-${view}.svg`);
}

// The fields the cart and React islands need. Keeps the island payload small.
export function toCardProduct(p) {
  return {
    id: p.id,
    slug: p.slug,
    brand: p.brand,
    name: p.name,
    reference: p.reference,
    price: p.price,
    compareAt: p.compareAt || 0,
    category: p.category,
    condition: p.condition,
    exclusive: p.exclusive,
    tags: p.tags,
    stock: p.stock,
    caseSize: p.caseSize,
    department: p.department,
    subcategory: p.subcategory,
    image: coverImage(p),
  };
}

export function relatedProducts(product, limit = 4) {
  return products
    .filter((p) => p.id !== product.id)
    .map((p) => ({
      p,
      score: (p.brand === product.brand ? 2 : 0) + (p.category === product.category ? 1 : 0) + (p.exclusive === product.exclusive ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p);
}
