// Thin wrapper around GramJS (the `telegram` package), which logs in as a normal Telegram user account.
//
// A bot can't be used here: bots only see channels where they are an admin, and the supplier's channel is
// someone else's. A user account (Lloyd's, or a spare number) sees whatever channels it has joined.

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

export function config() {
  const apiId = Number(process.env.TG_API_ID);
  const apiHash = process.env.TG_API_HASH;
  const channel = process.env.TG_CHANNEL;
  if (!apiId || !apiHash) throw new Error("Set TG_API_ID and TG_API_HASH in telegram-worker/.env (from https://my.telegram.org > API development tools).");
  return { apiId, apiHash, channel, session: process.env.TG_SESSION || "" };
}

// The login lives in TG_SESSION (printed by `npm run login`), so the same .env works on the laptop and the
// server. Treat it like a password: it is full access to the Telegram account.
export async function connect({ interactive = false } = {}) {
  const { apiId, apiHash, session } = config();
  if (!session && !interactive) throw new Error("Not logged in to Telegram yet. Run `npm run login` and put the session it prints in .env as TG_SESSION.");

  const client = new TelegramClient(new StringSession(session.trim()), apiId, apiHash, { connectionRetries: 5 });
  client.setLogLevel("error");
  return client;
}

// Telegram message -> the plain shape groupPosts() works with.
export function simplify(m) {
  const imageDocument = m.document?.mimeType?.startsWith("image/");
  return {
    id: m.id,
    date: m.date,
    text: m.message || "",
    hasPhoto: Boolean(m.photo || imageDocument),
    groupedId: m.groupedId ? m.groupedId.toString() : null,
    replyTo: m.replyTo?.replyToMsgId ?? null,
    editDate: m.editDate ?? null,
  };
}

// Every message after `minId` (0 = the whole channel history).
export async function fetchSince(client, channel, { minId = 0, onProgress } = {}) {
  const out = [];
  for await (const m of client.iterMessages(channel, { minId, limit: undefined })) {
    if (onProgress && out.length % 500 === 0) onProgress(out.length);
    if (m.className === "Message") out.push(m);
  }
  return out;
}

// Looks up known messages again, to catch deleted posts and edited captions. Missing ids come back absent.
export async function fetchByIds(client, channel, ids) {
  const found = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const batch = await client.getMessages(channel, { ids: ids.slice(i, i + 100) });
    for (const m of batch) if (m?.className === "Message") found.set(m.id, m);
  }
  return found;
}

// TG_CHANNEL can be an @username, a t.me link, a numeric id or the channel's exact title. Private channels
// can't be looked up by id from a fresh session, so fall back to scanning the account's chat list.
export async function resolveChannel(client, channel) {
  if (!channel) throw new Error("Set TG_CHANNEL in sync/.env. `npm run login` lists the channels this account can see.");
  const asId = /^-?\d+$/.test(channel) ? channel : null;
  if (!asId) {
    try {
      return await client.getEntity(channel);
    } catch {}
  }
  for await (const d of client.iterDialogs({})) {
    if ((asId && d.id?.toString() === asId) || d.title === channel) return d.entity;
  }
  throw new Error(`Couldn't find the channel "${channel}". Has this Telegram account joined it?`);
}
