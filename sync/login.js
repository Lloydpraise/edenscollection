// One-time Telegram login. Run on the server with `npm run login`: it asks for the phone number, the code
// Telegram sends to the app, and the 2-step verification password if one is set, then saves the session to
// data/session.txt so the daily sync can run without anyone at the keyboard.

import { createInterface } from "node:readline/promises";
import { mkdir } from "node:fs/promises";
import { connect, saveSession, config } from "./lib/telegram.js";

await mkdir(new URL("./data/", import.meta.url), { recursive: true });
const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => rl.question(q);

const client = await connect({ interactive: true });
await client.start({
  phoneNumber: () => ask("Phone number (with country code, e.g. +2547...): "),
  phoneCode: () => ask("Code Telegram just sent you: "),
  password: () => ask("2-step verification password (Enter if none): "),
  onError: (err) => console.error(err.message),
});
await saveSession(client);

const me = await client.getMe();
console.log(`\nLogged in as ${me.firstName ?? ""} ${me.username ? `(@${me.username})` : ""}. Session saved to sync/data/session.txt.`);

const { channel } = config();
if (channel) {
  try {
    const entity = await client.getEntity(channel);
    console.log(`Supplier channel found: ${entity.title}.`);
  } catch {
    console.log(`Couldn't open TG_CHANNEL "${channel}". Make sure this account has joined it, and use its @username, t.me link or numeric id.`);
  }
} else {
  console.log("\nTG_CHANNEL isn't set yet. Channels and groups this account can see:");
  for await (const d of client.iterDialogs({ limit: 200 })) {
    if (d.isChannel || d.isGroup) console.log(`  ${d.id}  ${d.title}`);
  }
  console.log("Put the supplier's id (or @username) in sync/.env as TG_CHANNEL.");
}

rl.close();
await client.disconnect();
process.exit(0);
