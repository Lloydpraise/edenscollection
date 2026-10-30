// Departments and subcategories for the whole catalogue. The Telegram sync (sync/lib/classify.js) uses the
// `match` patterns to file each supplier post; the site uses the labels for /category pages and menus.
//
// Order matters: the first department whose pattern matches a caption wins, and the same for subcategories.
// A post that matches nothing lands in "more" / "other" so nothing is lost.

export const departments = [
  {
    slug: "bags",
    label: "Bags",
    match: /\b(bag|bags|handbag|backpack|purse|tote|clutch|crossbody|cross-body|sling|duffel|duffle|satchel|briefcase|luggage|suitcase)\b/i,
    subcategories: [
      { slug: "backpacks", label: "Backpacks", match: /backpack/i },
      { slug: "travel", label: "Travel & luggage", match: /\b(duffel|duffle|travel|luggage|suitcase|trolley)\b/i },
      { slug: "laptop", label: "Laptop & work bags", match: /\b(laptop|briefcase|office|messenger)\b/i },
      { slug: "crossbody", label: "Crossbody & sling", match: /\b(crossbody|cross-body|sling|shoulder)\b/i },
      { slug: "clutches", label: "Clutches & evening", match: /\b(clutch|evening|purse)\b/i },
      { slug: "totes", label: "Totes", match: /\btote\b/i },
      { slug: "handbags", label: "Handbags", match: /./ },
    ],
  },
  {
    slug: "watches",
    label: "Watches",
    match: /\b(watch|watches|wristwatch|smartwatch|chronograph|timepiece|dial|automatic|quartz)\b/i,
    subcategories: [
      { slug: "smart", label: "Smart watches", match: /\b(smart ?watch|smart|fitness|bluetooth)\b/i },
      { slug: "couples", label: "Couple sets", match: /\b(couple|couples|pair|his and hers)\b/i },
      { slug: "women", label: "Women's watches", match: /\b(ladies|lady|women'?s?|woman|female)\b/i },
      { slug: "men", label: "Men's watches", match: /./ },
    ],
  },
  {
    slug: "shoes",
    label: "Shoes",
    match: /\b(shoe|shoes|sneaker|sneakers|heels|sandal|sandals|loafer|loafers|boots?|slides|trainers)\b/i,
    subcategories: [
      { slug: "sneakers", label: "Sneakers", match: /\b(sneaker|sneakers|trainers|airforce|jordan)\b/i },
      { slug: "heels", label: "Heels", match: /\bheels?\b/i },
      { slug: "sandals", label: "Sandals & slides", match: /\b(sandal|sandals|slides|slippers)\b/i },
      { slug: "boots", label: "Boots", match: /\bboots?\b/i },
      { slug: "formal", label: "Formal & loafers", match: /./ },
    ],
  },
  {
    slug: "jewellery",
    label: "Jewellery",
    match: /\b(jewel+ery|jewelry|necklace|chain|pendant|earrings?|rings?|bangle|anklet|cufflinks)\b/i,
    subcategories: [
      { slug: "necklaces", label: "Necklaces & chains", match: /\b(necklace|chain|pendant)\b/i },
      { slug: "earrings", label: "Earrings", match: /\bearrings?\b/i },
      { slug: "rings", label: "Rings", match: /\brings?\b/i },
      { slug: "bracelets", label: "Bracelets & bangles", match: /\b(bracelet|bangle|anklet)\b/i },
      { slug: "sets", label: "Sets & more", match: /./ },
    ],
  },
  {
    slug: "fragrance",
    label: "Fragrance",
    match: /\b(perfume|cologne|fragrance|eau de|edp|edt|body mist|oud)\b/i,
    subcategories: [
      { slug: "women", label: "For her", match: /\b(ladies|lady|women'?s?|her|femme)\b/i },
      { slug: "men", label: "For him", match: /./ },
    ],
  },
  {
    slug: "accessories",
    label: "Accessories",
    match: /\b(wallet|belt|sunglass(es)?|glasses|shades|cap|hat|scarf|tie|card holder|keychain|watch box)\b/i,
    subcategories: [
      { slug: "wallets", label: "Wallets & card holders", match: /\b(wallet|card holder)\b/i },
      { slug: "belts", label: "Belts", match: /\bbelt\b/i },
      { slug: "eyewear", label: "Sunglasses", match: /\b(sunglass(es)?|glasses|shades)\b/i },
      { slug: "headwear", label: "Caps & hats", match: /\b(cap|hat|beanie)\b/i },
      { slug: "other", label: "More accessories", match: /./ },
    ],
  },
  {
    slug: "more",
    label: "More",
    match: /./,
    subcategories: [{ slug: "other", label: "Other", match: /./ }],
  },
];

export function getDepartment(slug) {
  return departments.find((d) => d.slug === slug);
}

export function getSubcategory(departmentSlug, subSlug) {
  return getDepartment(departmentSlug)?.subcategories.find((s) => s.slug === subSlug);
}
