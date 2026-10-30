// Spotting the supplier's "SOLD" marks.
//
// The supplier marks a piece as gone in one of three ways, all handled:
//   1. replies "sold" to the post               -> sold when the reply was sent
//   2. edits the post's caption to add "SOLD"    -> sold when the edit was made
//   3. sends "SOLD" as its own message right after the post (no reply) -> sold then
// A bare "sold" much later, not a reply, can't be tied to a post and is only logged.

export const DEFAULT_KEYWORDS = ["sold", "sold out", "imeuzwa", "imeisha"];

export function soldPattern(keywords = DEFAULT_KEYWORDS) {
  const words = keywords.map((k) => k.trim()).filter(Boolean).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*"));
  return new RegExp(`(^|[^\\p{L}])(${words.join("|")})(?=$|[^\\p{L}])`, "iu");
}

// A message that is nothing but a sold mark ("SOLD", "Sold ✅", "sold out!!").
export function isSoldMark(text, pattern) {
  const stripped = (text || "").replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}!.\s✅❌]/gu, " ").trim();
  return Boolean(stripped) && pattern.test(stripped) && stripped.replace(new RegExp(pattern.source, "giu"), "").trim().length === 0;
}

export function mentionsSold(text, pattern) {
  return pattern.test(text || "");
}
