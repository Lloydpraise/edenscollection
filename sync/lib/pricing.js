// Retail price from the supplier's wholesale price (both in KES).
//
// For now every product is wholesale + KSh 2,000 (Lloyd, 30 Oct 2026). To change the rule, edit retailPrice
// and re-run the sync: every product is repriced from its stored wholesale price on each run, so a new rule
// applies to the whole catalogue at once. `product` carries department/subcategory/brand if the markup ever
// needs to differ by category.

export const FLAT_MARKUP = 2000;

export function retailPrice(wholesale, product = {}) {
  return wholesale + FLAT_MARKUP;
}
