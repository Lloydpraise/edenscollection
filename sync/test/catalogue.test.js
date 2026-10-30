import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProduct } from "../lib/catalogue.js";
import { classify } from "../lib/classify.js";
import { groupPosts } from "../lib/group.js";

const entry = (caption) => ({ id: "tg-42", caption, date: 1761800000, images: ["/products/tg-42/1.jpg"], status: "new" });

test("retail is wholesale plus KSh 2,000", () => {
  const p = buildProduct(entry("Omega Seamaster\nPrice 6,000"));
  assert.equal(p.price, 8000);
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

test("a watchmaker's name files a vague post under watches", () => {
  assert.equal(classify({ title: "Rolex Datejust 41", text: "Rolex Datejust 41", brand: "Rolex" }).department, "watches");
});

test("posts without a price are held back for review", () => {
  const e = entry("Lovely handbag");
  assert.equal(buildProduct(e), null);
  assert.equal(e.status, "needs-review");
});

test("an override can price or hide a product", () => {
  assert.equal(buildProduct(entry("Lovely handbag"), { price: 9000 }).price, 9000);
  assert.equal(buildProduct(entry("Handbag 3000/="), { hidden: true }), null);
});

test("an album becomes one post, and a quick text follow-up joins a captionless post", () => {
  const posts = groupPosts([
    { id: 1, date: 100, hasPhoto: true, groupedId: "9", text: "Rolex Datejust\nPrice 4500" },
    { id: 2, date: 100, hasPhoto: true, groupedId: "9", text: "" },
    { id: 3, date: 200, hasPhoto: true, text: "" },
    { id: 4, date: 230, hasPhoto: false, text: "LV bag 6000/=" },
    { id: 5, date: 5000, hasPhoto: false, text: "Good morning family" },
  ]);
  assert.equal(posts.length, 2);
  assert.deepEqual(posts[0].photoIds, [1, 2]);
  assert.deepEqual(posts[1].messageIds, [3, 4]);
  assert.equal(posts[1].text, "LV bag 6000/=");
});
