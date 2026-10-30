// Retail price from the supplier's wholesale price (both in KES).
//
// For now every product is wholesale + a flat markup (KSh 2,000, Lloyd, 30 Oct 2026). The markup is read
// from edens_sync_config.markup_kes so it can be changed from /admin; a different rule (tiers, percentages)
// goes in retailPrice. Every run reprices products whose price isn't locked, so a change applies everywhere.

export const DEFAULT_MARKUP = 2000;

export function retailPrice(wholesale, { markup = DEFAULT_MARKUP } = {}) {
  return wholesale + markup;
}
