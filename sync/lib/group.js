// Groups raw Telegram messages into supplier posts.
//
// One product usually arrives as an album: several photo messages sharing a groupedId, with the caption on
// one of them. Some suppliers post the photos first and the price/description as a separate text message a
// moment later, so a text-only message right after a captionless post is folded into it.

const FOLLOW_UP_SECONDS = 180;

// messages: [{ id, date (unix seconds), text, hasPhoto, groupedId }] in any order.
// Returns [{ key, messageIds, photoIds, text, date }], oldest first.
export function groupPosts(messages) {
  const sorted = [...messages].sort((a, b) => a.id - b.id);
  const posts = [];
  const byGroup = new Map();

  for (const m of sorted) {
    const text = (m.text || "").trim();
    const last = posts[posts.length - 1];

    if (m.groupedId && byGroup.has(m.groupedId)) {
      const post = byGroup.get(m.groupedId);
      add(post, m, text);
      continue;
    }

    if (!m.hasPhoto) {
      if (text && last && !last.text && m.date - last.date <= FOLLOW_UP_SECONDS) add(last, m, text);
      continue; // chatter, announcements, stickers
    }

    const post = { key: m.groupedId ? `g${m.groupedId}` : `m${m.id}`, messageIds: [], photoIds: [], text: "", date: m.date };
    add(post, m, text);
    posts.push(post);
    if (m.groupedId) byGroup.set(m.groupedId, post);
  }
  return posts;
}

function add(post, m, text) {
  post.messageIds.push(m.id);
  if (m.hasPhoto) post.photoIds.push(m.id);
  if (text) post.text = post.text ? `${post.text}\n${text}` : text;
}
