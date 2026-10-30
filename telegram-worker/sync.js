// Imports the supplier's Telegram channel into the VVStudios products table for Edens.
//
//   npm run backfill   first run (on the laptop): reads the whole channel history, marks everything that was
//                      ever marked SOLD as sold, dated to when it was marked
//   npm run sync       daily run: new posts since last time, plus re-checks of known posts
//   npm run dry        shows what a run would do, writes nothing
//   npm run watch      stays running on the server and does a run whenever /admin's "Run now" is pressed
//
// Flags: --dry-run, --backfill, --runner=laptop|server, --trigger=cron|manual|backfill, --watch

import { connect, config as tgConfig, resolveChannel, simplify, fetchSince, fetchByIds } from "./lib/telegram.js";
import { connectStore } from "./lib/store.js";
import { groupPosts } from "./lib/group.js";
import { buildRow, stateFromRow, productId } from "./lib/catalogue.js";
import { DEFAULT_MARKUP } from "./lib/pricing.js";
import { DEFAULT_KEYWORDS, soldPattern as makeSoldPattern, isSoldMark, mentionsSold } from "./lib/sold.js";

const flags = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const DRY = Boolean(flags["dry-run"]);
const SETTLE_SECONDS = 15 * 60; // very fresh posts wait for the next run, the supplier may still be adding photos
const WATCH_EVERY_MS = 5 * 60 * 1000;

const store = connectStore();
const businessId = process.env.EDENS_BUSINESS_ID || (await store.config())?.business_id;
if (!businessId) throw new Error("No edens_sync_config row in VVStudios and no EDENS_BUSINESS_ID in .env, so I don't know which business to fill.");
const maxOf = (values, start = 0) => values.reduce((a, b) => (b > a ? b : a), start); // safe for huge lists
const log = (...a) => console.log(new Date().toISOString(), ...a);

if (flags.watch) await watch();
else await run({ backfill: Boolean(flags.backfill), trigger: flags.trigger || (flags.backfill ? "backfill" : "cron") });
process.exit(0);

async function watch() {
  log(`Watching for "Run now" requests every ${WATCH_EVERY_MS / 60000} min.`);
  for (;;) {
    try {
      const cfg = await store.config(businessId);
      if (cfg?.run_requested_at) {
        const backfill = cfg.run_request_mode === "backfill";
        await store.saveConfig(businessId, { run_requested_at: null, run_request_mode: null });
        await run({ backfill, trigger: backfill ? "backfill" : "manual" });
      }
    } catch (err) {
      log(`watch: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, WATCH_EVERY_MS));
  }
}

async function run({ backfill, trigger }) {
  const cfg = (await store.config(businessId)) || {};
  if (cfg.enabled === false && trigger === "cron") {
    log("Sync is switched off in /admin, skipping.");
    return;
  }
  const markup = cfg.markup_kes ?? DEFAULT_MARKUP;
  const soldPattern = makeSoldPattern(cfg.sold_keywords?.length ? cfg.sold_keywords : DEFAULT_KEYWORDS);
  const counts = { posts_scanned: 0, created: 0, updated: 0, sold_marked: 0, removed: 0, needs_review: 0 };
  const errors = [];
  const runId = DRY ? null : await store.startRun({ business_id: businessId, trigger, runner: flags.runner || "server" });

  const client = await connect();
  try {
    await client.connect();
    const channel = await resolveChannel(client, cfg.channel || tgConfig().channel);
    const channelId = channel.id.toString();

    // Where we stand: every Telegram product already saved for Edens.
    const existing = new Map((await store.telegramProducts(businessId)).map((r) => [r.id, r]));
    const states = new Map([...existing.values()].map((r) => [r.id, stateFromRow(r)]));
    const changed = new Set();
    const ownerOf = new Map();
    for (const s of states.values()) for (const id of s.messageIds) ownerOf.set(id, s.id);

    const markSold = (state, when, via) => {
      if (state.soldAt) return;
      state.soldAt = when;
      state.soldVia = via;
      changed.add(state.id);
      counts.sold_marked++;
    };

    // 1. Re-check known posts: deleted ones come off the site, edited captions are re-read (a "SOLD" added
    //    to a caption counts from the moment of the edit).
    const live = [...states.values()].filter((s) => !s.removedAt);
    const current = await fetchByIds(client, channel, live.flatMap((s) => s.messageIds));
    for (const state of live) {
      if (state.photoIds.length && !state.photoIds.some((id) => current.has(id))) {
        state.removedAt = Math.floor(Date.now() / 1000);
        changed.add(state.id);
        counts.removed++;
        continue;
      }
      const msgs = state.messageIds.map((id) => current.get(id)).filter(Boolean);
      const caption = msgs.map((m) => m.message?.trim()).filter((t) => t && !isSoldMark(t, soldPattern)).join("\n");
      if (caption && caption !== state.caption) {
        state.caption = caption;
        changed.add(state.id);
        counts.updated++;
      }
      if (mentionsSold(caption, soldPattern)) {
        const edited = maxOf(msgs.map((m) => m.editDate || m.date));
        markSold(state, edited, "caption");
      }
    }

    // 2. New messages since the last run (or the whole history on a backfill).
    const minId = backfill ? 0 : cfg.last_message_id || maxOf([...ownerOf.keys()]);
    log(`Reading "${channel.title}" ${minId ? `after message ${minId}` : "from the beginning"}...`);
    const now = Date.now() / 1000;
    const all = await fetchSince(client, channel, { minId, onProgress: (n) => n && log(`  ${n} messages read`) });
    const raw = all.filter((m) => now - m.date >= SETTLE_SECONDS);
    // Next run starts just before the first message left waiting, so nothing is skipped.
    const waiting = all.filter((m) => now - m.date < SETTLE_SECONDS).map((m) => m.id);
    const lastId = waiting.length ? -maxOf(waiting.map((id) => -id), -Infinity) - 1 : maxOf(all.map((m) => m.id), minId);
    counts.posts_scanned = raw.length;
    const byId = new Map(raw.map((m) => [m.id, m]));
    const simple = raw.map(simplify);
    const posts = groupPosts(simple, { soldPattern });

    for (const post of posts) {
      const id = productId(channelId, post.messageIds[0]);
      let state = states.get(id);
      if (!state) {
        state = { id, messageIds: post.messageIds, photoIds: post.photoIds, caption: post.text, postedAt: post.date, images: [], soldAt: null, soldVia: null, removedAt: null };
        states.set(id, state);
        changed.add(id);
        counts.created++;
        for (const mid of post.messageIds) ownerOf.set(mid, id);
        if (mentionsSold(post.text, soldPattern)) {
          const m = byId.get(post.messageIds[0]);
          markSold(state, m?.editDate || post.date, "caption");
        }
      }
      if (post.soldAt) markSold(state, post.soldAt, post.soldVia);
    }

    // Replies saying "sold" mark the post they reply to, however old it is.
    let unmatched = 0;
    for (const m of simple) {
      if (!m.replyTo || m.hasPhoto || !mentionsSold(m.text, soldPattern)) continue;
      const target = states.get(ownerOf.get(m.replyTo));
      if (target) markSold(target, m.date, "reply");
      else unmatched++;
    }
    if (unmatched) log(`${unmatched} "sold" replies point at posts that aren't products (text posts or already gone).`);

    // 3. Photos for new products. A piece that was already sold only gets its cover photo.
    for (const id of changed) {
      const state = states.get(id);
      if (state.images.length || state.removedAt || DRY) continue;
      const photoIds = state.soldAt ? state.photoIds.slice(0, 1) : state.photoIds;
      for (const [i, msgId] of photoIds.entries()) {
        try {
          const buffer = await client.downloadMedia(byId.get(msgId) || current.get(msgId));
          if (buffer?.length) state.images.push(await store.uploadPhoto(`edens/${id}/${i + 1}.jpg`, buffer));
        } catch (err) {
          errors.push({ product: id, photo: msgId, error: err.message });
        }
      }
    }

    // 4. Save. Every product is rebuilt so markup and category changes reach the whole catalogue.
    const rows = [...states.values()].map((s) => buildRow(s, { businessId, markup, soldPattern, existing: existing.get(s.id) }));
    counts.needs_review = rows.filter((r) => r.status === "discovered").length;

    log(`${counts.created} new, ${counts.updated} edited, ${counts.sold_marked} marked sold, ${counts.removed} removed, ${counts.needs_review} need review (no price).`);
    if (DRY) {
      for (const r of rows.filter((r) => changed.has(r.id)).slice(0, 30)) {
        log(`  ${r.id}  ${r.status}  KSh ${r.price ?? "?"}  ${r.category}/${r.product_type}  ${r.stock_quantity ? "" : `SOLD ${r.discovery_meta.sold_at?.slice(0, 10)} `}${r.title}`);
      }
      return;
    }
    await store.upsert(rows);
    if (cfg.business_id) await store.saveConfig(businessId, { last_message_id: lastId });
    await store.finishRun(runId, { status: errors.length ? "error" : "ok", ...counts, errors });
    // Rebuild the static site so the changes show (Netlify/Vercel/Cloudflare "deploy hook" URL).
    if (process.env.DEPLOY_HOOK_URL && changed.size) {
      const res = await fetch(process.env.DEPLOY_HOOK_URL, { method: "POST" }).catch((err) => ({ ok: false, statusText: err.message }));
      log(res.ok ? "Asked the site to rebuild." : `Site rebuild hook failed: ${res.statusText}`);
    }
  } catch (err) {
    await store.finishRun(runId, { status: "error", ...counts, errors: [...errors, { error: err.message }] });
    throw err;
  } finally {
    await client.disconnect();
  }
}
