import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePrice, parseCaption, findBrand } from "../lib/parse.js";

test("reads the common ways suppliers write a price", () => {
  const cases = {
    "Price: 4,500": 4500,
    "Bei 4500": 4500,
    "Ksh 12,000 only": 12000,
    "KES. 3.500": 3500,
    "💰 2500": 2500,
    "3500/=": 3500,
    "4,800/-": 4800,
    "1,800ksh": 1800,
    "bei 2.5k": 2500,
    "Gucci sneakers @4500": 4500,
    "Price 4500 2 colours": 4500,
  };
  for (const [text, price] of Object.entries(cases)) assert.equal(parsePrice(text)?.price, price, text);
});

test("ignores sizes and model numbers", () => {
  assert.equal(parsePrice("Rolex Datejust 41mm\nRef 126300"), null);
  assert.equal(parsePrice("Size 40-45"), null);
});

test("finds the brand mentioned first, including short forms", () => {
  assert.equal(findBrand("Casio G-Shock GA2100"), "Casio");
  assert.equal(findBrand("AP Royal Oak"), "Audemars Piguet");
  assert.equal(findBrand("LV Neverfull"), "Louis Vuitton");
  assert.equal(findBrand("Christian Dior saddle bag"), "Christian Dior");
  assert.equal(findBrand("Quality leather wallet"), null);
});

test("splits a caption into name, details and price", () => {
  const p = parseCaption("⌚ ROLEX DATEJUST 41MM\nAutomatic movement\nSapphire glass\nWhatsApp 0712345678\nPrice: 4,500");
  assert.equal(p.wholesale, 4500);
  assert.equal(p.brand, "Rolex");
  assert.equal(p.name, "Datejust 41mm");
  assert.equal(p.caseSize, "41 mm");
  assert.equal(p.movement, "Automatic");
  assert.equal(p.description, "Automatic movement. Sapphire glass.");
});

test("keeps the name when the price shares its line", () => {
  const p = parseCaption("Gucci men sneakers sizes 40-45 @4500");
  assert.equal(p.name, "Men sneakers sizes 40-45");
  assert.equal(p.wholesale, 4500);
});
