# Supplier sync

Reads the supplier's Telegram channel once a day and turns each post (photos, description, wholesale price)
into a product on the site.

What a run does:

1. Re-checks posts it already knows. A post the supplier deleted comes off the site; an edited caption
   (say, a new price) is re-read.
2. Fetches posts since the last run. An album of photos is one product; a text message sent right after a
   captionless photo is treated as that photo's caption. Posts under 15 minutes old wait for the next run,
   in case the supplier is still adding photos.
3. Downloads the photos to `public/products/<id>/`.
4. Reads brand, name, price and details from the caption (`lib/parse.js`), files the product under a
   department and subcategory (`src/data/categories.js`) and prices it (`lib/pricing.js`).
5. Writes `src/data/supplier-products.json` for the site. With `--publish` it commits and pushes that file
   and the photos, so the site host rebuilds.

The wholesale price is stored only in `sync/data/ledger.json` on the server. The public feed holds the retail
price alone.

## Pricing

`lib/pricing.js`: retail = wholesale + KSh 2,000 for every product. Change `retailPrice` and the next run
reprices the whole catalogue.

## Why a user account and not a bot

Telegram bots can only read channels they are an admin of, and the supplier's channel belongs to the
supplier. So the sync logs in as an ordinary Telegram account that has joined the channel, using the official
client API (GramJS). It only reads. Use your own number or a spare SIM; the account has to stay a member
of the channel. Logging in once on the server is enough: the session is saved in `sync/data/session.txt`.
Treat that file like a password, since it gives full access to the account.

## Setting it up on the Heysasa server

Needs Node 22.12+ and git. On the Contabo VPS (Ubuntu/Debian assumed):

```sh
# 1. Get the code into its own folder, next to the Heysasa bots
cd ~ && git clone git@github.com:Lloydpraise/edenscollection.git edens
cd edens/sync && npm ci

# 2. Telegram API keys: log in at https://my.telegram.org > API development tools,
#    create an app (any name), copy api_id and api_hash
cp .env.example .env && nano .env

# 3. Log in once (asks for phone number, the code Telegram sends, 2FA password if set).
#    With TG_CHANNEL empty it lists your channels so you can copy the supplier's id into .env.
npm run login

# 4. Try it without writing anything
npm run sync:dry

# 5. First real run, then check sync/data/needs-review.txt for posts with no readable price
npm run sync
```

The server pushes to GitHub, so it needs write access: add a deploy key with write access
(GitHub repo > Settings > Deploy keys) using the server's SSH key, or reuse the key the Heysasa bots use.

### Run it daily

`crontab -e` and add (06:00 Nairobi time; the server's clock may be UTC, `0 3 * * *` is 06:00 EAT):

```
0 3 * * * /home/<user>/edens/sync/run-daily.sh
```

`run-daily.sh` pulls the latest code, runs the sync with `--publish` and logs to `sync/logs/sync.log`. It
skips a run if the previous one is still going.

## Fixing a product by hand

`sync/overrides.json` (committed) wins over whatever the parser read. Key it by the product id (`tg-<n>`, also
shown as `Ref. ED-<n>` on the site):

```json
{
  "tg-1042": { "name": "Datejust 41 Wimbledon", "brand": "Rolex" },
  "tg-1043": { "price": 9500 },
  "tg-1050": { "department": "bags", "subcategory": "totes" },
  "tg-1051": { "exclusive": true },
  "tg-1060": { "hidden": true }
}
```

A `price` here also publishes a post the parser couldn't price. New departments, subcategories or keywords go
in `src/data/categories.js`.

## Tests

`npm test` covers price reading, brand detection, categories, pricing and album grouping.
