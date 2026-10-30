// Files a parsed post under a department and subcategory from src/data/categories.js.
import { departments } from "../../src/data/categories.js";
import { WATCH_BRANDS } from "./parse.js";

// The title line is the best signal ("LV Neverfull tote"), so it is tried first. Then a watchmaker's name
// settles it, and only then the rest of the caption, because details like "comes with box and bag" would
// otherwise turn a watch into a bag.
export function classify({ title = "", text = "", brand = "" }) {
  const department =
    departments.find((d) => d.slug !== "more" && d.match.test(title)) ||
    (WATCH_BRANDS.includes(brand) ? departments.find((d) => d.slug === "watches") : null) ||
    departments.find((d) => d.match.test(text)) ||
    departments.find((d) => d.slug === "more"); // a post with no caption at all matches nothing, not even /./
  const sub =
    department.subcategories.find((s) => s.match.test(`${title}\n${text}`)) ||
    department.subcategories[department.subcategories.length - 1];
  return { department: department.slug, subcategory: sub.slug };
}
