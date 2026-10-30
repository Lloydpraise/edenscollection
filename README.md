# Edens Watches

Storefront for Edens Watches, a Nairobi retailer of new and pre-owned luxury watches. Built with
[Astro](https://astro.build) and React islands for the interactive parts (bag, search, filters, checkout).

## Run it

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```

Node 22.12 or newer.

## Where things live

| Path | What |
| --- | --- |
| `src/data/products.js` | The catalogue: sample watches plus the supplier's stock from `supplier-products.json`. |
| `src/data/categories.js` | Departments and subcategories (watches, bags, shoes, jewellery…) with the keywords that file each product. |
| `src/data/supplier-products.json`, `public/products/` | Written by the Telegram sync, don't edit by hand. |
| `sync/` | Daily import from the supplier's Telegram channel. See [sync/README.md](sync/README.md). |
| `src/data/reviews.js`, `faqs.js`, `info.js`, `site.js` | Mock reviews, product FAQs, client-care pages, contact details, delivery and payment options. |
| `src/lib/watchArt.js` | Draws the illustrated watch renders served at `/watches/<slug>-<view>.svg` until photography exists. |
| `src/lib/cart.js` | Bag and wishlist, kept in `localStorage` and shared by every island. |
| `src/islands/` | React islands: header bag button, bag drawer, search, shop filters, gallery, buy box, cart, checkout, wishlist. |
| `src/components/` | Astro components (header, footer, rails, reviews…) and the shared `react/ProductCard.jsx`. |
| `src/styles/global.css` | Design tokens and all styles. Off-white canvas, royal green, gold, black for The Black Collection. |

## Pages

Home, shop (all, men, women, pre-owned, new arrivals, sale, with filters and `?q=` / `?brand=`), product
detail, categories (`/category`, `/category/<department>/<subcategory>`), The Black Collection, bag, checkout, wishlist, contact, client-care pages and a 404.

## Not wired up yet

- Payments: checkout records the order on the device and hands the customer a pre-written WhatsApp
  message to the concierge. M-Pesa / card integration comes next.
- The catalogue, reviews and newsletter/contact forms use mock data with no backend.
