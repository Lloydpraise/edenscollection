# Edens Telegram worker

Reads the supplier's Telegram channel and keeps the Edens products in Supabase (VVStudios, the same
`products` table Heysasa uses) up to date: photos, description, wholesale price, retail price, category,
and whether the piece has been sold.

## What a run does

1. **Re-checks every product it already has.** A post the supplier deleted is hidden (`is_visible = false`).
   An edited caption is re-read; if the edit adds "SOLD", the piece is marked sold from the time of the edit.
2. **Reads new messages** since the last run (`edens_sync_config.last_message_id`), or the whole history on a
   backfill. An album of photos is one product. A text message sent within 3 minutes of a captionless photo
   becomes its caption. Posts under 15 minutes old wait for the next run.
3. **Finds sold pieces.** The supplier's "sold" marks are matched to posts three ways: a reply saying sold
   (dated to the reply), "SOLD" in the caption (dated to the edit), or a "SOLD" message straight after the
   post. Keywords come from `edens_sync_config.sold_keywords` (default: sold, sold out, imeuzwa, imeisha).
   Sold pieces keep showing on the site with a Sold badge and `stock_quantity = 0`.
4. **Uploads photos** of new products to the `product-images` bucket (`edens/<id>/<n>.jpg`). A piece that was
   already sold before we first saw it only gets its cover photo.
5. **Saves every product** with retail = wholesale + `markup_kes` (KSh 2,000 for now). Wholesale is kept in
   `stock_price`, which the public site never sees. Posts with no readable price are saved as
   `status = 'discovered'` for review in /admin. Priced ones are `approved`, which also lets Heysasa's
   vectorizer index them for the WhatsApp AI.
6. **Logs the run** in `edens_sync_runs` (shown in /admin) and, if `DEPLOY_HOOK_URL` is set, asks the site
   host to rebuild.

Anything edited in /admin and listed in `discovery_meta.locked` (price, title, sold, …) is never overwritten.

## Why a user account and not a bot

Telegram bots only read channels they are an admin of, and the channel belongs to the supplier. So the
worker logs in as a normal Telegram account that has joined the channel (your number or a spare SIM), using
Telegram's official client API through GramJS. It only reads.

## Why a server and not a Supabase edge function

The data lives in Supabase either way, so this was only about where the code runs. A server wins because:

- Telegram watches where a user account logs in from. A fixed server IP is what Telegram expects. Logging
  in from a different Supabase datacenter IP every day risks the account being flagged or logged out,
  which would stop the sync until someone logs in again.
- Edge functions are stopped after a few minutes and have little memory. The first import reads the whole
  channel history and copies every photo, which takes much longer than that.
- GramJS is a Node library and isn't proven on Deno, the runtime edge functions use.

So you run the first full import on your laptop, and after that the Heysasa server runs the daily sync.
Because everything lives in Supabase, either machine picks up where the other stopped.

## First run (laptop)

Needs Node 22.12+.

```sh
cd telegram-worker
npm ci
cp .env.example .env      # fill in TG_API_ID / TG_API_HASH (my.telegram.org) and SUPABASE_SERVICE_ROLE_KEY
npm run login             # phone number, code from Telegram, 2FA password; prints TG_SESSION for .env
                          # (with no channel set it lists your channels so you can pick the supplier's)
npm run dry               # shows what it found, writes nothing
npm run backfill          # the real full import, with every past SOLD marked and dated
```

## Daily (Heysasa server)

```sh
git clone https://github.com/Lloydpraise/edenscollection.git ~/edens
cd ~/edens/telegram-worker && npm ci
# copy the same .env from the laptop (scp), then:
npm run dry
crontab -e
# 06:00 Nairobi (server on UTC):
0 3 * * * /home/<user>/edens/telegram-worker/run-daily.sh
```

`run-daily.sh` pulls the latest code, runs one sync and logs to `telegram-worker/logs/sync.log`.

For the "Run now" button in /admin, keep a watcher running next to the Heysasa bots:

```sh
pm2 start "npm run watch" --name edens-telegram --cwd ~/edens/telegram-worker
```

It checks `edens_sync_config.run_requested_at` every 5 minutes.

## Changing things

| What | Where |
| --- | --- |
| Markup, channel, sold keywords, on/off | /admin, or the `edens_sync_config` row |
| A different pricing rule | `lib/pricing.js` |
| Departments, subcategories, their keywords | `../src/data/categories.js` |
| How captions are read (price formats, brands) | `lib/parse.js` |
| One product's price, title, sold state | /admin (locks the field) |

## Tests

`npm test` covers price reading, brands, sold marks, categories, pricing, locked fields and album grouping.
