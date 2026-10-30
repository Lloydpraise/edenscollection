// Groups raw Telegram messages into supplier posts.
//
// One product usually arrives as an album: several photo messages sharing a groupedId, with the caption on
// one of them. Some suppliers post the photos first and the price/description as a separate text message a
// moment later, so a text-only message right after a captionless post is folded into it. A quick "SOLD"
// right after a post marks that post sold instead.

import { isSoldMark } from "./sold.js";

const FOLLOW_UP_SECONDS = 180;

// messages: [{ id, date (unix seconds), text, hasPhoto, groupedId, replyTo }] in any order.
// Returns [{ key, messageIds, photoIds, text, date, soldAt?, soldVia? }], oldest first.
export function groupPosts(messages, { soldPattern } = {}) {
  const sorted = [...messages].sort((a, b) => a.id - b.id);
  const posts = [];
  const byGroup = new Map();

  for (const m of sorted) {
    const text = (m.text || "").trim();
    const last = posts[posts.length - 1];

    if (m.groupedId && byGroup.has(m.groupedId)) {
      add(byGroup.get(m.groupedId), m, text);
      continue;
    }

    if (!m.hasPhoto) {
      // Replies are handled by the caller (they may point at much older posts).
      const quick = last && !m.replyTo && m.date - last.date <= FOLLOW_UP_SECONDS;
      if (quick && soldPattern && isSoldMark(text, soldPattern)) {
        last.soldAt = m.date;
        last.soldVia = "follow-up";
        last.messageIds.push(m.id);
      } else if (quick && text && !last.text) {
        add(last, m, text);
      }
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
