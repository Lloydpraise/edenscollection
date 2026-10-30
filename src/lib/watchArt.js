// Draws a watch as an SVG string from a product's `art` block. These illustrations stand in for
// product photography until real photos are added (see `images` in src/data/products.js).
//
// Views:
//   front  the whole watch on a transparent background (cards, cart)
//   dial   a close crop of the dial (gallery)
//   salon  the watch on royal green velvet with a gold frame (gallery, hero)

const H = 1000;
const CX = 400;
const CY = 500;

const METALS = {
  steel: ["#fbfbfc", "#a7adb3", "#e8eaec", "#6c727a"],
  gold: ["#fff1c4", "#c9993d", "#f5d68d", "#86601f"],
  rose: ["#fde3d5", "#c88b6d", "#f2c6af", "#875140"],
  black: ["#5a5d61", "#141516", "#3a3c3f", "#050505"],
};

function rgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function hex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}

function mix(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  return hex(A.map((v, i) => v + (B[i] - v) * t));
}

function luminance(c) {
  const [r, g, b] = rgb(c).map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const rad = (deg) => ((deg - 90) * Math.PI) / 180;
const px = (r, deg) => CX + r * Math.cos(rad(deg));
const py = (r, deg) => CY + r * Math.sin(rad(deg));
const f = (n) => Math.round(n * 10) / 10;

function metalGradient(id, metal, horizontal = false) {
  const [a, b, c, d] = METALS[metal] || METALS.steel;
  return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="${horizontal ? 0 : 1}">
    <stop offset="0" stop-color="${a}"/><stop offset=".35" stop-color="${b}"/>
    <stop offset=".6" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></linearGradient>`;
}

// ---------- Straps ----------

function bracelet(x, y, w, h, metal, rowH, flip) {
  // Three-piece links: brushed outer links, polished centre links.
  let s = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="url(#metalB)"/>`;
  const rows = Math.ceil(h / rowH);
  for (let i = 0; i <= rows; i++) {
    const ry = flip ? y + h - i * rowH : y + i * rowH;
    s += `<line x1="${f(x)}" y1="${f(ry)}" x2="${f(x + w)}" y2="${f(ry)}" stroke="rgba(0,0,0,.28)" stroke-width="2"/>`;
  }
  const cw = w * 0.36;
  s += `<rect x="${f(x + (w - cw) / 2)}" y="${f(y)}" width="${f(cw)}" height="${f(h)}" fill="url(#metalC)"/>`;
  for (let i = 0; i <= rows; i++) {
    const ry = flip ? y + h - i * rowH - rowH / 2 : y + i * rowH + rowH / 2;
    s += `<line x1="${f(x + (w - cw) / 2)}" y1="${f(ry)}" x2="${f(x + (w + cw) / 2)}" y2="${f(ry)}" stroke="rgba(0,0,0,.22)" stroke-width="1.6"/>`;
  }
  s += `<line x1="${f(x + (w - cw) / 2)}" y1="${f(y)}" x2="${f(x + (w - cw) / 2)}" y2="${f(y + h)}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>`;
  s += `<line x1="${f(x + (w + cw) / 2)}" y1="${f(y)}" x2="${f(x + (w + cw) / 2)}" y2="${f(y + h)}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>`;
  return s;
}

function leather(x, y, w, h, colour, isBottom) {
  const edge = mix(colour, "#000000", 0.35);
  let s = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="6" fill="url(#leatherG)" stroke="${edge}" stroke-width="2"/>`;
  s += `<rect x="${f(x + 9)}" y="${f(y + (isBottom ? 9 : -10))}" width="${f(w - 18)}" height="${f(h + 1)}" rx="4" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.6" stroke-dasharray="7 6"/>`;
  // Alligator scales: soft rows of rounded tiles.
  for (let ry = y + 18; ry < y + h - 10; ry += 30) {
    s += `<line x1="${f(x + 16)}" y1="${f(ry)}" x2="${f(x + w - 16)}" y2="${f(ry)}" stroke="rgba(0,0,0,.18)" stroke-width="2"/>`;
  }
  if (isBottom) {
    for (let i = 0; i < 3; i++) {
      const hy = y + h - 150 + i * 42;
      s += `<ellipse cx="${CX}" cy="${f(hy)}" rx="5" ry="6" fill="rgba(0,0,0,.55)"/>`;
    }
  }
  return s;
}

function straps(art, lugW, topEnd, botStart) {
  const metal = art.metal === "twotone" ? "steel" : art.metal;
  const type = art.strap;
  const w = lugW;
  const taper = type === "leather" ? 26 : 14;
  if (type === "leather") {
    return (
      leather(CX - (w - taper) / 2, -10, w - taper, topEnd + 10, art.strapColour || "#111", false) +
      leather(CX - (w - taper) / 2, botStart, w - taper, H - botStart + 10, art.strapColour || "#111", true)
    );
  }
  const rowH = type === "integrated" ? 34 : 46;
  const outerW = type === "integrated" ? w + 18 : w;
  return (
    `<g clip-path="url(#strapTop)">${bracelet(CX - outerW / 2, -10, outerW, topEnd + 10, metal, rowH, true)}</g>` +
    `<g clip-path="url(#strapBot)">${bracelet(CX - outerW / 2, botStart, outerW, H - botStart + 10, metal, rowH, false)}</g>`
  );
}

// ---------- Dial furniture ----------

function textures(art, r) {
  const id = "dialClip";
  if (art.texture === "lines") {
    let s = "";
    for (let y = CY - r; y < CY + r; y += 7) s += `<line x1="${CX - r}" y1="${y}" x2="${CX + r}" y2="${y}" stroke="rgba(255,255,255,.07)" stroke-width="2"/>`;
    return `<g clip-path="url(#${id})">${s}</g>`;
  }
  if (art.texture === "grid") {
    let s = "";
    for (let y = CY - r; y < CY + r; y += 13) for (let x = CX - r; x < CX + r; x += 13) s += `<rect x="${x + 1.5}" y="${y + 1.5}" width="9" height="9" rx="1" fill="rgba(255,255,255,.045)"/>`;
    return `<g clip-path="url(#${id})">${s}</g>`;
  }
  if (art.texture === "guilloche") {
    let s = "";
    for (let i = 0; i < 36; i++) s += `<circle cx="${f(px(r * 0.18, i * 10))}" cy="${f(py(r * 0.18, i * 10))}" r="${f(r * 0.62)}" fill="none" stroke="rgba(0,0,0,.05)" stroke-width="1"/>`;
    return `<g clip-path="url(#${id})">${s}</g>`;
  }
  // Default: a soft sunray.
  let s = "";
  for (let i = 0; i < 120; i++) {
    const a = i * 3;
    s += `<line x1="${CX}" y1="${CY}" x2="${f(px(r, a))}" y2="${f(py(r, a))}" stroke="rgba(255,255,255,${i % 2 ? 0.025 : 0.05})" stroke-width="3"/>`;
  }
  return `<g clip-path="url(#${id})">${s}</g>`;
}

function minuteTrack(r, ink) {
  let s = "";
  for (let i = 0; i < 60; i++) {
    if (i % 5 === 0) continue;
    const a = i * 6;
    s += `<line x1="${f(px(r, a))}" y1="${f(py(r, a))}" x2="${f(px(r - 7, a))}" y2="${f(py(r - 7, a))}" stroke="${ink}" stroke-width="1.6" opacity=".6"/>`;
  }
  return s;
}

const ROMAN = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

function markers(art, r, ink, applied) {
  const diver = art.bezelType === "diver";
  let s = "";
  for (let i = 0; i < 12; i++) {
    const a = i * 30;
    if (art.date && i === 3) continue;
    if (art.chrono && (i === 3 || i === 6 || i === 9)) continue;
    if (art.numerals === "roman") {
      const tr = r * 0.8;
      const size = i % 3 === 0 ? r * 0.17 : r * 0.12;
      s += `<text x="${f(px(tr, a))}" y="${f(py(tr, a))}" transform="rotate(${a} ${f(px(tr, a))} ${f(py(tr, a))})" font-family="Georgia, 'Times New Roman', serif" font-size="${f(size)}" fill="${ink}" text-anchor="middle" dominant-baseline="central">${ROMAN[i]}</text>`;
      continue;
    }
    if (art.numerals === "arabic" && i % 3 === 0) {
      const tr = r * 0.74;
      s += `<text x="${f(px(tr, a))}" y="${f(py(tr, a))}" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="600" font-size="${f(r * 0.2)}" fill="${ink}" text-anchor="middle" dominant-baseline="central">${i === 0 ? 12 : i}</text>`;
      continue;
    }
    if (diver && i % 3 !== 0) {
      s += `<circle cx="${f(px(r * 0.84, a))}" cy="${f(py(r * 0.84, a))}" r="${f(r * 0.055)}" fill="#f2efe6" stroke="${applied}" stroke-width="3"/>`;
      continue;
    }
    if (diver && i === 0) {
      const t = [
        [px(r * 0.93, -7), py(r * 0.93, -7)],
        [px(r * 0.93, 7), py(r * 0.93, 7)],
        [px(r * 0.72, 0), py(r * 0.72, 0)],
      ];
      s += `<polygon points="${t.map(([x, y]) => `${f(x)},${f(y)}`).join(" ")}" fill="#f2efe6" stroke="${applied}" stroke-width="3"/>`;
      continue;
    }
    const len = i === 0 ? r * 0.2 : r * 0.17;
    const wid = i === 0 ? r * 0.045 : r * 0.04;
    const r0 = r * 0.9;
    const bar = (off) =>
      `<rect x="${f(CX - wid / 2 + off)}" y="${f(CY - r0)}" width="${f(wid)}" height="${f(len)}" rx="1.5" fill="url(#appliedG)" stroke="rgba(0,0,0,.25)" stroke-width=".8" transform="rotate(${a} ${CX} ${CY})"/>`;
    s += i === 0 && !diver ? bar(-wid * 0.75) + bar(wid * 0.75) : bar(0);
  }
  return s;
}

function dateWindow(r, ink) {
  const x = CX + r * 0.66;
  const w = r * 0.2;
  const h = r * 0.15;
  return `<rect x="${f(x - w / 2)}" y="${f(CY - h / 2)}" width="${f(w)}" height="${f(h)}" rx="2" fill="#fbfaf6" stroke="url(#appliedG)" stroke-width="3"/>
    <text x="${f(x)}" y="${f(CY + 1)}" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="600" font-size="${f(h * 0.72)}" fill="#141414" text-anchor="middle" dominant-baseline="central">24</text>`;
}

function subdials(r, dial, ink) {
  const sub = mix(dial, luminance(dial) > 0.5 ? "#000000" : "#ffffff", 0.08);
  let s = "";
  for (const a of [90, 180, 270]) {
    const sx = px(r * 0.5, a);
    const sy = py(r * 0.5, a);
    const sr = r * 0.2;
    s += `<circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr)}" fill="${sub}" stroke="url(#appliedG)" stroke-width="2.5"/>`;
    for (let i = 0; i < 12; i++) {
      const ta = (i * 30 - 90) * (Math.PI / 180);
      s += `<line x1="${f(sx + sr * 0.78 * Math.cos(ta))}" y1="${f(sy + sr * 0.78 * Math.sin(ta))}" x2="${f(sx + sr * 0.92 * Math.cos(ta))}" y2="${f(sy + sr * 0.92 * Math.sin(ta))}" stroke="${ink}" stroke-width="1.4"/>`;
    }
    const ha = ((a === 90 ? 40 : a === 180 ? 200 : 300) - 90) * (Math.PI / 180);
    s += `<line x1="${f(sx)}" y1="${f(sy)}" x2="${f(sx + sr * 0.8 * Math.cos(ha))}" y2="${f(sy + sr * 0.8 * Math.sin(ha))}" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/><circle cx="${f(sx)}" cy="${f(sy)}" r="3" fill="${ink}"/>`;
  }
  return s;
}

function diamonds(r) {
  const spots = [[-0.32, -0.2], [0.28, -0.34], [0.36, 0.22], [-0.18, 0.4], [0.02, 0.12]];
  return spots
    .map(([dx, dy]) => {
      const x = CX + dx * r;
      const y = CY + dy * r;
      return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.05)}" fill="url(#diamondG)" stroke="#c9ccd0" stroke-width="1.5"/>
        <path d="M${f(x - r * 0.03)} ${f(y)} L${f(x)} ${f(y - r * 0.03)} L${f(x + r * 0.03)} ${f(y)} L${f(x)} ${f(y + r * 0.03)} Z" fill="#fff" opacity=".9"/>`;
    })
    .join("");
}

function hands(art, r, handFill, lume) {
  const hourA = 305;
  const minA = 61;
  const secA = 222;
  const style = art.hands;
  let hour;
  let minute;
  if (style === "sword") {
    hour = `<path d="M${CX} ${f(CY - r * 0.5)} L${f(CX + r * 0.045)} ${f(CY - r * 0.2)} L${CX} ${f(CY + r * 0.08)} L${f(CX - r * 0.045)} ${f(CY - r * 0.2)} Z" fill="${handFill}"/>`;
    minute = `<path d="M${CX} ${f(CY - r * 0.8)} L${f(CX + r * 0.035)} ${f(CY - r * 0.3)} L${CX} ${f(CY + r * 0.1)} L${f(CX - r * 0.035)} ${f(CY - r * 0.3)} Z" fill="${handFill}"/>`;
  } else {
    const hw = r * 0.05;
    const mw = r * 0.038;
    hour = `<rect x="${f(CX - hw / 2)}" y="${f(CY - r * 0.52)}" width="${f(hw)}" height="${f(r * 0.6)}" rx="2" fill="${handFill}"/>
      <rect x="${f(CX - hw / 4)}" y="${f(CY - r * 0.48)}" width="${f(hw / 2)}" height="${f(r * 0.3)}" rx="1" fill="${lume}"/>`;
    if (style === "mercedes") {
      hour += `<circle cx="${CX}" cy="${f(CY - r * 0.36)}" r="${f(r * 0.075)}" fill="none" stroke="${handFill}" stroke-width="${f(hw * 0.55)}"/>`;
    }
    minute = `<rect x="${f(CX - mw / 2)}" y="${f(CY - r * 0.82)}" width="${f(mw)}" height="${f(r * 0.92)}" rx="2" fill="${handFill}"/>
      <rect x="${f(CX - mw / 4)}" y="${f(CY - r * 0.78)}" width="${f(mw / 2)}" height="${f(r * 0.55)}" rx="1" fill="${lume}"/>`;
  }
  const sec = `<line x1="${CX}" y1="${f(CY + r * 0.18)}" x2="${CX}" y2="${f(CY - r * 0.86)}" stroke="#c9a24a" stroke-width="2.2"/>
    <circle cx="${CX}" cy="${f(CY - r * 0.62)}" r="${f(r * 0.03)}" fill="#c9a24a"/>`;
  const shadow = `<g transform="translate(5 7)" opacity=".28" filter="url(#handShadow)">
    <g transform="rotate(${hourA} ${CX} ${CY})">${hour}</g><g transform="rotate(${minA} ${CX} ${CY})">${minute}</g></g>`;
  return `${shadow}
    <g transform="rotate(${hourA} ${CX} ${CY})">${hour}</g>
    <g transform="rotate(${minA} ${CX} ${CY})">${minute}</g>
    <g transform="rotate(${secA} ${CX} ${CY})">${sec}</g>
    <circle cx="${CX}" cy="${CY}" r="${f(r * 0.045)}" fill="${handFill}"/><circle cx="${CX}" cy="${CY}" r="${f(r * 0.018)}" fill="#c9a24a"/>`;
}

// ---------- Bezels ----------

function bezel(art, R, rIn) {
  const type = art.bezelType;
  const colour = art.bezel || "#1a1a1a";
  const mid = (R + rIn) / 2;
  const width = R - rIn;
  if (type === "diver" || type === "tachy") {
    let s = `<circle cx="${CX}" cy="${CY}" r="${f(mid)}" fill="none" stroke="${colour}" stroke-width="${f(width)}"/>
      <circle cx="${CX}" cy="${CY}" r="${f(mid)}" fill="none" stroke="url(#bezelSheen)" stroke-width="${f(width)}"/>`;
    const ink = "#e9dfc6";
    for (let i = 0; i < 60; i++) {
      const a = i * 6;
      if (type === "diver" && i > 15 && i % 5 !== 0) continue;
      const long = i % 5 === 0;
      s += `<line x1="${f(px(R - 6, a))}" y1="${f(py(R - 6, a))}" x2="${f(px(R - (long ? 22 : 13), a))}" y2="${f(py(R - (long ? 22 : 13), a))}" stroke="${ink}" stroke-width="${long ? 3 : 1.6}"/>`;
    }
    if (type === "diver") {
      for (const n of [10, 20, 30, 40, 50]) {
        const a = n * 6;
        s += `<text x="${f(px(mid - 2, a))}" y="${f(py(mid - 2, a))}" transform="rotate(${a} ${f(px(mid - 2, a))} ${f(py(mid - 2, a))})" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="600" font-size="${f(width * 0.5)}" fill="${ink}" text-anchor="middle" dominant-baseline="central">${n}</text>`;
      }
      s += `<polygon points="${f(CX - 13)},${f(CY - R + 6)} ${f(CX + 13)},${f(CY - R + 6)} ${CX},${f(CY - R + 26)}" fill="${ink}"/><circle cx="${CX}" cy="${f(CY - R + 13)}" r="4" fill="${colour}"/>`;
    }
    return s;
  }
  if (type === "fluted") {
    const circumference = 2 * Math.PI * mid;
    const dash = circumference / 96;
    return `<circle cx="${CX}" cy="${CY}" r="${f(mid)}" fill="none" stroke="url(#metalBezel)" stroke-width="${f(width)}"/>
      <circle cx="${CX}" cy="${CY}" r="${f(mid)}" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="${f(width)}" stroke-dasharray="${f(dash * 0.45)} ${f(dash * 0.55)}"/>
      <circle cx="${CX}" cy="${CY}" r="${f(mid + width * 0.2)}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="${f(width * 0.25)}" stroke-dasharray="${f(dash * 0.3)} ${f(dash * 0.7)}"/>`;
  }
  if (type === "smooth" || type === "notched") {
    let s = `<circle cx="${CX}" cy="${CY}" r="${f(mid)}" fill="none" stroke="url(#metalBezel)" stroke-width="${f(width)}"/>`;
    if (type === "notched") {
      for (let i = 0; i < 6; i++) {
        const a = i * 60 + 30;
        s += `<line x1="${f(px(R - 2, a))}" y1="${f(py(R - 2, a))}" x2="${f(px(rIn + 4, a))}" y2="${f(py(rIn + 4, a))}" stroke="rgba(0,0,0,.4)" stroke-width="7"/>`;
      }
    }
    return s;
  }
  return `<circle cx="${CX}" cy="${CY}" r="${f(mid)}" fill="none" stroke="url(#metalBezel)" stroke-width="${f(width)}"/>`;
}

// ---------- Cases ----------

function roundCase(art) {
  const R = art.diamonds ? 165 : 182;
  const caseMetal = art.metal === "twotone" ? "steel" : art.metal;
  const lugW = R * 1.12;
  const hasBezel = art.bezelType && art.bezelType !== "none";
  const rDial = hasBezel ? R * 0.74 : R * 0.88;
  const bezelIn = hasBezel ? R * 0.77 : R * 0.9;
  const lug = (sx, sy) => {
    const x0 = CX + sx * lugW * 0.5;
    const x1 = CX + sx * lugW * 0.5 - sx * 34;
    const y0 = CY + sy * R * 0.55;
    const y1 = CY + sy * R * 1.12;
    return `<path d="M${f(x0)} ${f(y0)} L${f(x0)} ${f(y1)} L${f(x1)} ${f(y1)} L${f(x1 - sx * 10)} ${f(y0)} Z" fill="url(#metalA)" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>`;
  };
  const crown = art.shape === "round" && art.metal
    ? `<rect x="${f(CX + R - 6)}" y="${f(CY - 22)}" width="34" height="44" rx="6" fill="url(#metalA)" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/>
       ${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="${f(CX + R + 2 + i * 4.5)}" y1="${f(CY - 20)}" x2="${f(CX + R + 2 + i * 4.5)}" y2="${f(CY + 20)}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>`).join("")}
       ${art.numerals === "roman" ? `<circle cx="${f(CX + R + 30)}" cy="${CY}" r="11" fill="#2e4fa3" stroke="url(#metalA)" stroke-width="3"/>` : ""}`
    : "";
  const chronoPushers = art.chrono
    ? [-1, 1].map((s) => `<rect x="${f(CX + R * 0.68)}" y="${f(CY + s * R * 0.74 - 12)}" width="38" height="24" rx="5" transform="rotate(${s * 45} ${f(CX + R * 0.68)} ${f(CY + s * R * 0.74)})" fill="url(#metalA)" stroke="rgba(0,0,0,.3)"/>`).join("")
    : "";
  return {
    R,
    rDial,
    lugW,
    topEnd: CY - R * 1.05,
    botStart: CY + R * 1.05,
    caseMetal,
    body: `${lug(-1, -1)}${lug(1, -1)}${lug(-1, 1)}${lug(1, 1)}${crown}${chronoPushers}
      <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#metalA)" stroke="rgba(0,0,0,.35)" stroke-width="2"/>
      <circle cx="${CX}" cy="${CY}" r="${f(R - 4)}" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2"/>
      ${bezel(art, R - 6, bezelIn)}
      <circle cx="${CX}" cy="${CY}" r="${f(rDial + 6)}" fill="url(#metalA)"/>`,
  };
}

function octagonCase(art) {
  const R = 188;
  const caseW = R * 2.08;
  const caseH = R * 1.96;
  const cushion = `<rect x="${f(CX - caseW / 2)}" y="${f(CY - caseH / 2)}" width="${f(caseW)}" height="${f(caseH)}" rx="${f(R * 0.62)}" fill="url(#metalA)" stroke="rgba(0,0,0,.35)" stroke-width="2"/>`;
  const oct = Array.from({ length: 8 }, (_, i) => {
    const a = i * 45 + 22.5;
    return `${f(px(R * 0.98, a))},${f(py(R * 0.98, a))}`;
  }).join(" ");
  const screws = Array.from({ length: 8 }, (_, i) => {
    const a = i * 45 + 22.5;
    const sx = px(R * 0.86, a);
    const sy = py(R * 0.86, a);
    const hexPts = Array.from({ length: 6 }, (_, k) => `${f(sx + 9 * Math.cos((k * 60 + 15) * (Math.PI / 180)))},${f(sy + 9 * Math.sin((k * 60 + 15) * (Math.PI / 180)))}`).join(" ");
    return `<polygon points="${hexPts}" fill="url(#metalC)" stroke="rgba(0,0,0,.4)" stroke-width="1.2"/><line x1="${f(sx - 5)}" y1="${f(sy)}" x2="${f(sx + 5)}" y2="${f(sy)}" stroke="rgba(0,0,0,.5)" stroke-width="1.5" transform="rotate(${a} ${f(sx)} ${f(sy)})"/>`;
  }).join("");
  const isGrid = art.texture === "grid";
  const crown = `<rect x="${f(CX + caseW / 2 - 6)}" y="${f(CY - 20)}" width="30" height="40" rx="7" fill="url(#metalA)" stroke="rgba(0,0,0,.3)"/>`;
  return {
    R,
    rDial: R * 0.74,
    lugW: caseW * 0.82,
    topEnd: CY - caseH / 2 + 30,
    botStart: CY + caseH / 2 - 30,
    caseMetal: art.metal,
    body: `${crown}${cushion}
      <polygon points="${oct}" fill="url(#metalBezel)" stroke="rgba(0,0,0,.3)" stroke-width="2"/>
      <polygon points="${oct}" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2" transform="scale(.97) translate(${f(CX * 0.031)} ${f(CY * 0.031)})"/>
      ${isGrid ? screws : ""}
      <circle cx="${CX}" cy="${CY}" r="${f(R * 0.78)}" fill="url(#metalA)"/>`,
  };
}

function tankCase(art) {
  const w = 270;
  const h = 360;
  const dialW = w * 0.68;
  const dialH = h * 0.76;
  return {
    R: h / 2,
    rDial: dialW / 2,
    lugW: w * 0.78,
    topEnd: CY - h / 2 + 10,
    botStart: CY + h / 2 - 10,
    caseMetal: art.metal,
    tank: { w, h, dialW, dialH },
    body: `<rect x="${f(CX + w / 2 - 6)}" y="${f(CY - 18)}" width="26" height="36" rx="5" fill="url(#metalA)" stroke="rgba(0,0,0,.3)"/>
      <circle cx="${f(CX + w / 2 + 22)}" cy="${CY}" r="11" fill="#2e4fa3" stroke="url(#metalA)" stroke-width="3"/>
      <rect x="${f(CX - w / 2)}" y="${f(CY - h / 2)}" width="${w}" height="${h}" rx="14" fill="url(#metalA)" stroke="rgba(0,0,0,.35)" stroke-width="2"/>
      <rect x="${f(CX - w / 2 + 8)}" y="${f(CY - h / 2 + 4)}" width="${f(w * 0.12)}" height="${f(h - 8)}" rx="8" fill="url(#metalC)" opacity=".85"/>
      <rect x="${f(CX + w / 2 - 8 - w * 0.12)}" y="${f(CY - h / 2 + 4)}" width="${f(w * 0.12)}" height="${f(h - 8)}" rx="8" fill="url(#metalC)" opacity=".85"/>`,
  };
}

function tankDial(art, t, ink) {
  const { dialW, dialH } = t;
  const x0 = CX - dialW / 2;
  const y0 = CY - dialH / 2;
  let s = `<rect x="${f(x0)}" y="${f(y0)}" width="${f(dialW)}" height="${f(dialH)}" rx="4" fill="url(#dialG)"/>`;
  // Railway minute track
  s += `<rect x="${f(x0 + 12)}" y="${f(y0 + 12)}" width="${f(dialW - 24)}" height="${f(dialH - 24)}" fill="none" stroke="${ink}" stroke-width="1.2"/>`;
  s += `<rect x="${f(x0 + 20)}" y="${f(y0 + 20)}" width="${f(dialW - 40)}" height="${f(dialH - 40)}" fill="none" stroke="${ink}" stroke-width="1.2"/>`;
  const positions = [
    [0, -1], [0.95, -1], [1, -0.5], [1, 0], [1, 0.5], [0.95, 1], [0, 1], [-0.95, 1], [-1, 0.5], [-1, 0], [-1, -0.5], [-0.95, -1],
  ];
  positions.forEach(([dx, dy], i) => {
    const x = CX + dx * (dialW / 2 - 38);
    const y = CY + dy * (dialH / 2 - 40);
    const big = i % 3 === 0;
    s += `<text x="${f(x)}" y="${f(y)}" font-family="Georgia, 'Times New Roman', serif" font-size="${big ? 26 : 19}" fill="${ink}" text-anchor="middle" dominant-baseline="central">${ROMAN[i]}</text>`;
  });
  return s;
}

// ---------- Assembly ----------

export function watchSvg(art, view = "front") {
  const shape = art.shape || "round";
  const c = shape === "octagon" ? octagonCase(art) : shape === "tank" ? tankCase(art) : roundCase(art);
  const dial = art.dial || "#111111";
  const light = luminance(dial) > 0.45;
  const goldish = art.metal === "gold" || art.metal === "rose";
  const ink = light ? "#1b1b1b" : "#ece8de";
  const appliedMetal = goldish ? art.metal : "steel";
  const handFill = art.hands === "sword" && light ? "#23336e" : goldish ? "url(#appliedG)" : light ? "#1d1d1d" : "url(#appliedG)";
  const lume = light ? "rgba(0,0,0,0)" : "#efeadb";
  const strapColour = art.strapColour || "#111111";
  const bezelMetal = art.metal === "twotone" ? "rose" : art.bezelType === "fluted" && art.metal === "steel" ? "steel" : c.caseMetal;
  const r = c.rDial;

  const defs = `<defs>
    ${metalGradient("metalA", c.caseMetal)}
    ${metalGradient("metalB", c.caseMetal === "twotone" ? "steel" : c.caseMetal, true)}
    ${metalGradient("metalC", art.metal === "twotone" ? "rose" : c.caseMetal, true)}
    ${metalGradient("metalBezel", bezelMetal)}
    ${metalGradient("appliedG", appliedMetal)}
    <radialGradient id="dialG" cx=".42" cy=".38" r=".75">
      <stop offset="0" stop-color="${mix(dial, "#ffffff", light ? 0.35 : 0.16)}"/>
      <stop offset=".55" stop-color="${dial}"/>
      <stop offset="1" stop-color="${mix(dial, "#000000", 0.35)}"/>
    </radialGradient>
    <linearGradient id="leatherG" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${mix(strapColour, "#000000", 0.4)}"/>
      <stop offset=".5" stop-color="${mix(strapColour, "#ffffff", 0.1)}"/>
      <stop offset="1" stop-color="${mix(strapColour, "#000000", 0.4)}"/>
    </linearGradient>
    <linearGradient id="bezelSheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/>
    </linearGradient>
    <linearGradient id="glassG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="diamondG"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfd8e3"/></radialGradient>
    <radialGradient id="velvet" cx=".5" cy=".42" r=".75">
      <stop offset="0" stop-color="#1c6b4d"/><stop offset=".6" stop-color="#0d4632"/><stop offset="1" stop-color="#062619"/>
    </radialGradient>
    <clipPath id="dialClip"><circle cx="${CX}" cy="${CY}" r="${f(r)}"/></clipPath>
    <clipPath id="strapTop"><path d="M${f(CX - c.lugW / 2 - 12)} -10 H${f(CX + c.lugW / 2 + 12)} V${f(c.topEnd)} H${f(CX - c.lugW / 2 - 12)} Z"/></clipPath>
    <clipPath id="strapBot"><path d="M${f(CX - c.lugW / 2 - 12)} ${f(c.botStart)} H${f(CX + c.lugW / 2 + 12)} V${H + 10} H${f(CX - c.lugW / 2 - 12)} Z"/></clipPath>
    <filter id="dropShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#000" flood-opacity=".28"/></filter>
    <filter id="handShadow"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>`;

  let face;
  if (c.tank) {
    face = tankDial(art, c.tank, ink) + hands({ ...art, hands: "sword" }, c.tank.dialH * 0.42, "#23336e", "rgba(0,0,0,0)");
  } else {
    face = `<circle cx="${CX}" cy="${CY}" r="${f(r)}" fill="url(#dialG)"/>
      ${textures(art, r)}
      ${minuteTrack(r * 0.97, ink)}
      ${markers(art, r, ink, appliedMetal === "steel" ? "#c9ccd0" : "#c9993d")}
      ${art.date ? dateWindow(r, ink) : ""}
      ${art.chrono ? subdials(r, dial, ink) : ""}
      ${art.diamonds ? diamonds(r) : ""}
      ${hands(art, r, handFill, lume)}`;
  }

  const glass = c.tank
    ? `<rect x="${f(CX - c.tank.dialW / 2)}" y="${f(CY - c.tank.dialH / 2)}" width="${f(c.tank.dialW)}" height="${f(c.tank.dialH)}" fill="url(#glassG)"/>`
    : `<path d="M${f(px(r, 290))} ${f(py(r, 290))} A${f(r)} ${f(r)} 0 0 1 ${f(px(r, 40))} ${f(py(r, 40))} Q${CX} ${f(CY - r * 0.25)} ${f(px(r, 290))} ${f(py(r, 290))} Z" fill="url(#glassG)"/>`;

  const watch = `<g filter="url(#dropShadow)">
      ${straps(art, c.lugW, c.topEnd, c.botStart)}
      ${c.body}
    </g>
    ${face}
    ${glass}`;

  if (view === "dial") {
    const span = (c.tank ? c.tank.h : c.R * 2) * 1.08;
    const vw = span;
    const vh = span * 1.25;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(CX - vw / 2)} ${f(CY - vh / 2)} ${f(vw)} ${f(vh)}" width="600" height="750">${defs}${watch}</svg>`;
  }

  // Front and salon crop the long straps so the watch fills the frame (4:5).
  const cropW = 600;
  const cropH = 750;
  const box = `${CX - cropW / 2} ${CY - cropH / 2} ${cropW} ${cropH}`;
  // Clip to the crop: some browsers paint SVG-in-<img> content that falls outside the viewBox.
  const cropClip = `<clipPath id="crop"><rect x="${CX - cropW / 2}" y="${CY - cropH / 2}" width="${cropW}" height="${cropH}"/></clipPath>`;

  if (view === "salon") {
    const x0 = CX - cropW / 2;
    const y0 = CY - cropH / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="${cropW}" height="${cropH}" overflow="hidden">${defs}${cropClip}<g clip-path="url(#crop)">
      <rect x="${x0}" y="${y0}" width="${cropW}" height="${cropH}" fill="url(#velvet)"/>
      <g transform="translate(${CX} ${CY}) scale(.86) translate(${-CX} ${-CY})">${watch}</g>
      <rect x="${x0 + 22}" y="${y0 + 22}" width="${cropW - 44}" height="${cropH - 44}" fill="none" stroke="#c9a24a" stroke-width="1.5" opacity=".75"/>
    </g></svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="${cropW}" height="${cropH}" overflow="hidden">${defs}${cropClip}<g clip-path="url(#crop)">${watch}</g></svg>`;
}
