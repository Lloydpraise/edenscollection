import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRow, stateFromRow } from "../lib/catalogue.js";
import { classify } from "../lib/classify.js";
import { groupPosts } from "../lib/group.js";
import { soldPattern, isSoldMark } from "../lib/sold.js";

const sold = soldPattern();
const state = (caption, extra = {}) => ({
  id: "tg_1_42", messageIds: [42], photoIds: [42], caption, postedAt: 1761800000,
  images: ["https://x/edens/tg_1_42/1.jpg"], soldAt: null, soldVia: null, removedAt: null, ...extra,
});
const ctx = { businessId: "edens", markup: 2000, soldPattern: sold };

test("retail is wholesale plus the markup, wholesale kept in stock_price", () => {
  const row = buildRow(state("Omega Seamaster\nPrice 6,000"), ctx);
  assert.equal(row.price, 8000);
  assert.equal(row.stock_price, 6000);
  assert.equal(row.title, "Omega Seamaster");
  assert.equal(row.status, "approved");
  assert.equal(row.category, "watches");
  assert.equal(buildRow(state("Omega Seamaster\nPrice 6,000"), { ...ctx, markup: 3500 }).price, 9500);
});

test("posts without a price wait for review", () => {
  const row = buildRow(state("Lovely handbag"), ctx);
  assert.equal(row.status, "discovered");
  assert.equal(row.price, null);
});

test("an approved or dismissed status from /admin is kept", () => {
  const existing = { status: "approved", discovery_meta: {} };
  assert.equal(buildRow(state("Lovely handbag"), { ...ctx, existing }).status, "approved");
});

test("sold pieces stay visible with no stock; removed ones are hidden", () => {
  const s = buildRow(state("LV tote 6000/=", { soldAt: 1761900000, soldVia: "reply" }), ctx);
  assert.equal(s.stock_quantity, 0);
  assert.equal(s.is_visible, true);
  assert.equal(s.discovery_meta.sold_at, new Date(1761900000 * 1000).toISOString());
  assert.equal(buildRow(state("LV tote 6000/=", { removedAt: 1761900000 }), ctx).is_visible, false);
});

test("SOLD in a caption doesn't end up in the title", () => {
  assert.equal(buildRow(state("SOLD ✅ Rolex Datejust\nPrice 4500"), ctx).title, "Rolex Datejust");
});

test("locked columns keep the /admin value", () => {
  const existing = {
    status: "approved", price: 15000, title: "Datejust 41 Wimbledon", stock_quantity: 1,
    discovery_meta: { locked: ["price", "title", "sold", "brand"], brand: "Rolex", sold_at: null },
  };
  const row = buildRow(state("Rolx datejust\nPrice 4500", { soldAt: 1761900000 }), { ...ctx, existing });
  assert.equal(row.price, 15000);
  assert.equal(row.title, "Datejust 41 Wimbledon");
  assert.equal(row.stock_quantity, 1);
  assert.equal(row.discovery_meta.sold_at, null);
  assert.equal(row.discovery_meta.brand, "Rolex");
});

test("a saved row turns back into the same state", () => {
  const s = state("LV tote 6000/=", { soldAt: 1761900000, soldVia: "reply" });
  const back = stateFromRow(buildRow(s, ctx));
  assert.deepEqual(back, s);
});

test("files products under departments and subcategories", () => {
  const cases = [
    ["Rolex Submariner\nComes with box and bag", "watches", "men"],
    ["Ladies Cartier watch", "watches", "women"],
    ["Smart watch series 9", "watches", "smart"],
    ["LV Neverfull tote bag", "bags", "totes"],
    ["Leather backpack", "bags", "backpacks"],
    ["Gucci men sneakers", "shoes", "sneakers"],
    ["Gold chain necklace", "jewellery", "necklaces"],
    ["Leather belt for men", "accessories", "belts"],
    ["Mystery box", "more", "other"],
  ];
  for (const [caption, department, subcategory] of cases) {
    const [title] = caption.split("\n");
    const brand = caption.startsWith("Rolex") ? "Rolex" : "";
    assert.deepEqual(classify({ title, text: caption, brand }), { department, subcategory }, caption);
  }
});

test("an album becomes one post, a quick text follow-up joins a captionless post, a quick SOLD marks it", () => {
  const posts = groupPosts(
    [
      { id: 1, date: 100, hasPhoto: true, groupedId: "9", text: "Rolex Datejust\nPrice 4500" },
      { id: 2, date: 100, hasPhoto: true, groupedId: "9", text: "" },
      { id: 3, date: 200, hasPhoto: true, text: "" },
      { id: 4, date: 230, hasPhoto: false, text: "LV bag 6000/=" },
      { id: 5, date: 250, hasPhoto: false, text: "SOLD" },
      { id: 6, date: 5000, hasPhoto: false, text: "Good morning family" },
    ],
    { soldPattern: sold },
  );
  assert.equal(posts.length, 2);
  assert.deepEqual(posts[0].photoIds, [1, 2]);
  assert.deepEqual(posts[1].messageIds, [3, 4, 5]);
  assert.equal(posts[1].text, "LV bag 6000/=");
  assert.equal(posts[1].soldAt, 250);
});

test("recognises sold marks", () => {
  for (const t of ["SOLD", "Sold ✅", "sold out!!", "Imeuzwa"]) assert.ok(isSoldMark(t, sold), t);
  for (const t of ["Rolex sold separately", "resold", "Price 4500"]) assert.ok(!isSoldMark(t, sold), t);
});

test("a post with no caption is filed under more/other instead of crashing", () => {
  assert.deepEqual(classify({ title: "", text: "", brand: "" }), { department: "more", subcategory: "other" });
  const row = buildRow(state(""), { businessId: "b", markup: 2000, soldPattern: sold });
  assert.equal(row.category, "more");
  assert.equal(row.price, null);
});
