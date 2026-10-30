// One-time Telegram login with `npm run login`: asks for the phone number, the code Telegram sends to the app
// and the 2-step verification password if one is set, then prints a session string. Put it in .env as
// TG_SESSION (on the laptop and on the server) and the worker runs without anyone at the keyboard.

import { createInterface } from "node:readline/promises";
import { connect, config } from "./lib/telegram.js";
const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => rl.question(q);

const client = await connect({ interactive: true });
await client.start({
  phoneNumber: () => ask("Phone number (with country code, e.g. +2547...): "),
  phoneCode: () => ask("Code Telegram just sent you: "),
  password: () => ask("2-step verification password (Enter if none): "),
  onError: (err) => console.error(err.message),
});
const me = await client.getMe();
console.log(`\nLogged in as ${me.firstName ?? ""} ${me.username ? `(@${me.username})` : ""}.`);
console.log("\nAdd this line to .env (keep it secret, it is full access to the account):\n");
console.log(`TG_SESSION=${client.session.save()}\n`);

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
  console.log("Put the supplier's id (or @username) in .env as TG_CHANNEL, or in /admin's sync settings.");
}

rl.close();
await client.disconnect();
process.exit(0);
