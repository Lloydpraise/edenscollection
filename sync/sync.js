// Daily import of the supplier's Telegram channel into the Edens catalogue.
//
//   npm run sync              fetch new posts, download photos, write the feed
//   npm run sync -- --publish also commit and push the feed + photos so the site rebuilds
//   npm run sync:dry          show what would change, write nothing
//
// Private data (wholesale prices, Telegram session) stays in sync/data/, which is never committed.
// The public feed is src/data/supplier-products.json and photos go to public/products/<id>/.

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { connect, config, resolveChannel, simplify, fetchSince, fetchByIds } from "./lib/telegram.js";
import { groupPosts } from "./lib/group.js";
import { buildFeed } from "./lib/catalogue.js";

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const PUBLISH = args.has("--publish");

const repo = new URL("../", import.meta.url);
const files = {
  ledger: new URL("data/ledger.json", import.meta.url),
  review: new URL("data/needs-review.txt", import.meta.url),
  overrides: new URL("overrides.json", import.meta.url),
  feed: new URL("src/data/supplier-products.json", repo),
  images: new URL("public/products/", repo),
};

const INITIAL_LIMIT = Number(process.env.INITIAL_LIMIT || 500); // first run: how far back to go
const SETTLE_SECONDS = 15 * 60; // leave very fresh posts for tomorrow, the supplier may still be adding photos

const readJson = async (url, fallback) => JSON.parse(await readFile(url, "utf8").catch(() => JSON.stringify(fallback)));
const log = (...a) => console.log(new Date().toISOString(), ...a);

const ledger = await readJson(files.ledger, { lastMessageId: 0, entries: {} });
const overrides = await readJson(files.overrides, {});
const { channel: channelName } = config();

const client = await connect();
await client.connect();
const channel = await resolveChannel(client, channelName);
log(`Reading "${channel.title}" from message ${ledger.lastMessageId || `(latest ${INITIAL_LIMIT})`}`);

// 1. Re-check what we already have: deleted posts come off the site, edited captions are re-read.
const known = Object.values(ledger.entries).filter((e) => e.status !== "removed");
const current = await fetchByIds(client, channel, known.flatMap((e) => e.messageIds));
let removed = 0;
let edited = 0;
for (const entry of known) {
  if (!entry.photoIds.some((id) => current.has(id))) {
    entry.status = "removed";
    entry.updatedAt = new Date().toISOString();
    if (!DRY) await rm(new URL(`${entry.id}/`, files.images), { recursive: true, force: true });
    entry.images = [];
    removed++;
    continue;
  }
  const caption = entry.messageIds.map((id) => current.get(id)?.message?.trim()).filter(Boolean).join("\n");
  if (caption && caption !== entry.caption) {
    entry.caption = caption;
    entry.updatedAt = new Date().toISOString();
    edited++;
  }
}

// 2. New posts since the last run.
const now = Date.now() / 1000;
const fresh = (await fetchSince(client, channel, { minId: ledger.lastMessageId, limit: INITIAL_LIMIT })).filter(
  (m) => now - m.date >= SETTLE_SECONDS,
);
const raw = new Map(fresh.map((m) => [m.id, m]));
const posts = groupPosts(fresh.map(simplify));
let added = 0;

for (const post of posts) {
  const id = `tg-${post.messageIds[0]}`;
  if (ledger.entries[id]) continue;
  const entry = {
    id,
    key: post.key,
    messageIds: post.messageIds,
    photoIds: post.photoIds,
    caption: post.text,
    date: post.date,
    images: [],
    status: "new",
    firstSeen: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!DRY) entry.images = await downloadPhotos(entry);
  ledger.entries[id] = entry;
  added++;
}
if (fresh.length) ledger.lastMessageId = Math.max(ledger.lastMessageId, ...fresh.map((m) => m.id));
await client.disconnect();

// 3. Rebuild the public feed from the whole ledger (applies the current pricing and categories to everything).
const feed = buildFeed(ledger, overrides);
const review = Object.values(ledger.entries).filter((e) => e.status === "needs-review" && !overrides[e.id]);

log(`${added} new, ${edited} edited, ${removed} removed. ${feed.length} on the site, ${review.length} need review.`);
if (DRY) {
  for (const p of feed.slice(0, 20)) log(`  ${p.id}  KSh ${p.price}  ${p.department}/${p.subcategory}  ${p.brand} ${p.name}`);
  process.exit(0);
}

await mkdir(new URL("data/", import.meta.url), { recursive: true });
await writeFile(files.ledger, JSON.stringify(ledger, null, 2));
await writeFile(files.feed, JSON.stringify(feed, null, 2) + "\n");
await writeFile(
  files.review,
  review.length
    ? `No price found in these posts. Add a "price" for them in sync/overrides.json, or fix the parser.\n\n` +
        review.map((e) => `${e.id}\n${e.caption || "(no caption)"}\n`).join("\n")
    : "Nothing to review.\n",
);

if (PUBLISH) publish();

async function downloadPhotos(entry) {
  const dir = new URL(`${entry.id}/`, files.images);
  await mkdir(dir, { recursive: true });
  const images = [];
  for (const [i, msgId] of entry.photoIds.entries()) {
    try {
      const buffer = await client.downloadMedia(raw.get(msgId));
      if (!buffer?.length) continue;
      await writeFile(new URL(`${i + 1}.jpg`, dir), buffer);
      images.push(`/products/${entry.id}/${i + 1}.jpg`);
    } catch (err) {
      log(`  couldn't download photo ${msgId}: ${err.message}`);
    }
  }
  return images;
}

function publish() {
  const git = (...a) => execFileSync("git", a, { cwd: repo, encoding: "utf8" }).trim();
  git("add", "src/data/supplier-products.json", "public/products");
  if (!git("status", "--porcelain", "--", "src/data/supplier-products.json", "public/products")) {
    log("No catalogue changes to publish.");
    return;
  }
  git("commit", "-m", `Supplier sync: ${added} new, ${edited} edited, ${removed} removed`);
  git("push");
  log("Pushed catalogue update.");
}
