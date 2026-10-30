// Edens admin API. The static /admin page talks only to this function; it holds the service role key, so every
// query here is pinned to the Edens business_id and nothing else in the shared VVStudios database is reachable.
//
// Auth: POST { action: "login", password } with EDENS_ADMIN_PASSWORD returns a signed token (12 h). Every other
// action needs `Authorization: Bearer <token>`.
//
// The business id comes from the single row in public.edens_sync_config, the same row the Telegram worker reads,
// so switching businesses is one UPDATE there. EDENS_BUSINESS_ID overrides it if set.
//
// Secrets: EDENS_ADMIN_PASSWORD (required). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const PASSWORD = Deno.env.get("EDENS_ADMIN_PASSWORD") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const BUCKET = "product-images";
const TOKEN_HOURS = 12;

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Set per request in the router.
let BUSINESS_ID = "";

async function resolveBusinessId() {
  const fromEnv = Deno.env.get("EDENS_BUSINESS_ID");
  if (fromEnv) return fromEnv;
  const { data, error } = await db.from("edens_sync_config").select("business_id").limit(2);
  if (error) throw error;
  if (!data?.length) throw new HttpError(500, "No row in edens_sync_config, so the Edens business id is unknown.");
  if (data.length > 1) throw new HttpError(500, "edens_sync_config has more than one row; set EDENS_BUSINESS_ID.");
  return data[0].business_id as string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---------- auth ----------

const enc = new TextEncoder();
// The password is part of the key, so changing EDENS_ADMIN_PASSWORD signs everyone out.
const hmacKey = crypto.subtle.importKey("raw", enc.encode(`edens-admin:${PASSWORD}:${SERVICE_KEY}`), { name: "HMAC", hash: "SHA-256" }, false, [
  "sign",
]);

const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function sign(payload: string) {
  return b64url(await crypto.subtle.sign("HMAC", await hmacKey, enc.encode(payload)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function issueToken() {
  const exp = Date.now() + TOKEN_HOURS * 3600_000;
  return { token: `${exp}.${await sign(String(exp))}`, expiresAt: new Date(exp).toISOString() };
}

async function checkToken(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now() || !safeEqual(sig, await sign(exp))) {
    throw new HttpError(401, "Please sign in again.");
  }
}

// ---------- products ----------

// Columns the admin reads. stock_price is the supplier's wholesale price and never leaves this function except
// to a signed-in admin.
const PRODUCT_COLUMNS =
  "id, title, description_short, description_long, price, old_price, stock_price, stock_quantity, is_visible, status, images, category, product_type, source, telegram_id, handle, key_features, discovery_meta, created_at, updated_at";

// Fields the admin may change, and how they are stored. Anything the admin edits is added to
// discovery_meta.locked so the daily sync leaves it alone.
// product_type holds the subcategory slug, category the department slug (see src/data/categories.js).
const EDITABLE = [
  "title",
  "description_short",
  "description_long",
  "price",
  "old_price",
  "stock_price",
  "stock_quantity",
  "is_visible",
  "status",
  "images",
  "category",
  "product_type",
  "handle",
  "key_features",
];
const META_EDITABLE = ["brand", "exclusive", "condition"];

type Row = Record<string, any>;

function isSold(row: Row) {
  return Boolean(row.discovery_meta?.sold_at);
}

// The worker files a post as 'discovered' when it could not read a price.
function needsReview(row: Row) {
  return row.status === "discovered" || row.price == null || Number(row.price) <= 0;
}

function toAdmin(row: Row) {
  const meta = row.discovery_meta || {};
  return {
    ...row,
    brand: meta.brand ?? null,
    exclusive: Boolean(meta.exclusive),
    sold: isSold(row),
    sold_at: meta.sold_at ?? null,
    sold_via: meta.sold_via ?? null,
    removed_at: meta.removed_at ?? null,
    needs_review: needsReview(row),
    locked: meta.locked ?? [],
    posted_at: meta.posted_at ?? null,
    caption: meta.caption ?? null,
  };
}

async function getProduct(id: string) {
  const { data, error } = await db.from("products").select(PRODUCT_COLUMNS).eq("business_id", BUSINESS_ID).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Product not found.");
  return data as Row;
}

function applyPatch(row: Row | null, patch: Row) {
  const meta = { ...(row?.discovery_meta || {}) };
  const locked = new Set<string>(meta.locked || []);
  const update: Row = {};

  for (const key of EDITABLE) {
    if (!(key in patch)) continue;
    let value = patch[key];
    if (["price", "old_price", "stock_price"].includes(key)) value = value === "" || value == null ? null : Number(value);
    if (key === "stock_quantity") value = Math.max(0, Math.round(Number(value) || 0));
    update[key] = value;
    locked.add(key);
  }
  for (const key of META_EDITABLE) {
    if (!(key in patch)) continue;
    meta[key] = patch[key];
    locked.add(key);
  }
  if ("sold" in patch) {
    // Sold is a manual decision too: lock it so a later caption without "sold" does not bring it back.
    meta.sold_at = patch.sold ? meta.sold_at || new Date().toISOString() : null;
    meta.sold_via = patch.sold ? "admin" : null;
    if (patch.sold) update.stock_quantity = 0;
    else if ((row?.stock_quantity ?? 0) === 0 && !("stock_quantity" in patch)) update.stock_quantity = 1;
    locked.add("sold");
  }
  if ("unlock" in patch) for (const key of patch.unlock as string[]) locked.delete(key);

  meta.locked = [...locked];
  update.discovery_meta = meta;
  update.updated_at = new Date().toISOString();
  return update;
}

async function listProducts(p: Row) {
  const page = Math.max(0, Number(p.page) || 0);
  const size = Math.min(100, Number(p.size) || 40);
  let q = db.from("products").select(PRODUCT_COLUMNS, { count: "exact" }).eq("business_id", BUSINESS_ID);

  if (p.q) {
    const term = String(p.q).replace(/[%,()]/g, " ").trim();
    q = q.or(`title.ilike.%${term}%,id.ilike.%${term}%,telegram_id.ilike.%${term}%`);
  }
  if (p.category) q = q.eq("category", p.category);
  if (p.subcategory) q = q.eq("product_type", p.subcategory);
  if (p.source) q = q.eq("source", p.source);
  switch (p.filter) {
    case "live":
      q = q.eq("is_visible", true).is("discovery_meta->>sold_at", null);
      break;
    case "sold":
      q = q.not("discovery_meta->>sold_at", "is", null);
      break;
    case "hidden":
      q = q.eq("is_visible", false);
      break;
    case "review":
      q = q.or("status.eq.discovered,price.is.null,price.lte.0");
      break;
    case "removed":
      q = q.not("discovery_meta->>removed_at", "is", null);
      break;
  }
  const sort = p.sort === "price" ? "price" : p.sort === "title" ? "title" : "created_at";
  q = q.order(sort, { ascending: sort === "title", nullsFirst: false }).range(page * size, page * size + size - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return { items: (data || []).map(toAdmin), total: count ?? 0, page, size };
}

async function updateProduct(p: Row) {
  const row = await getProduct(p.id);
  const { data, error } = await db
    .from("products")
    .update(applyPatch(row, p.patch || {}))
    .eq("business_id", BUSINESS_ID)
    .eq("id", p.id)
    .select(PRODUCT_COLUMNS)
    .single();
  if (error) throw error;
  return toAdmin(data);
}

async function createProduct(p: Row) {
  const patch = p.patch || {};
  if (!patch.title) throw new HttpError(400, "A product needs a title.");
  const id = `edens-${crypto.randomUUID().slice(0, 8)}`;
  const row = {
    id,
    business_id: BUSINESS_ID,
    source: "manual",
    status: "approved",
    stock_quantity: 1,
    is_visible: true,
    needs_polish: false,
    ...applyPatch(null, patch),
  };
  if (!("stock_quantity" in patch) && !patch.sold) row.stock_quantity = 1;
  const { data, error } = await db.from("products").insert(row).select(PRODUCT_COLUMNS).single();
  if (error) throw error;
  return toAdmin(data);
}

async function deleteProduct(p: Row) {
  const { error } = await db.from("products").delete().eq("business_id", BUSINESS_ID).eq("id", p.id);
  if (error) throw error;
  return { ok: true };
}

async function bulk(p: Row) {
  const ids: string[] = (p.ids || []).slice(0, 500);
  const patches: Record<string, Row> = {
    sold: { sold: true },
    unsold: { sold: false },
    hide: { is_visible: false },
    show: { is_visible: true },
    approve: { status: "approved" },
  };
  const { data: rows, error } = await db.from("products").select(PRODUCT_COLUMNS).eq("business_id", BUSINESS_ID).in("id", ids);
  if (error) throw error;
  let done = 0;
  for (const row of rows || []) {
    let patch = patches[p.op];
    if (p.op === "markup") {
      // Reprice from wholesale with a new flat markup, e.g. { op: "markup", value: 2500 }.
      if (row.stock_price == null) continue;
      patch = { price: Number(row.stock_price) + Number(p.value || 0) };
    }
    if (p.op === "unlock") patch = { unlock: row.discovery_meta?.locked || [] };
    if (!patch) throw new HttpError(400, `Unknown bulk action ${p.op}.`);
    const { error: e } = await db.from("products").update(applyPatch(row, patch)).eq("business_id", BUSINESS_ID).eq("id", row.id);
    if (e) throw e;
    done++;
  }
  return { updated: done };
}

async function uploadImage(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file.");
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) throw new HttpError(400, "Use a JPG, PNG, WebP or AVIF image.");
  if (file.size > 8 * 1024 * 1024) throw new HttpError(400, "Images must be under 8 MB.");
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `edens/admin/${crypto.randomUUID()}.${ext}`; // the worker's photos sit beside these, in edens/<id>/
  const { error } = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return { url: db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

// ---------- dashboard, runs and worker config ----------

async function stats() {
  const { data, error } = await db
    .from("products")
    .select("price, stock_price, is_visible, status, category, source, discovery_meta, created_at")
    .eq("business_id", BUSINESS_ID);
  if (error) throw error;
  const rows = data || [];
  const live = rows.filter((r) => r.is_visible && !isSold(r));
  const byCategory: Record<string, { live: number; sold: number }> = {};
  for (const r of rows) {
    const c = (byCategory[r.category || "more"] ||= { live: 0, sold: 0 });
    if (isSold(r)) c.sold++;
    else if (r.is_visible) c.live++;
  }
  const weekAgo = Date.now() - 7 * 86400_000;
  const soldDates = rows.map((r) => r.discovery_meta?.sold_at).filter(Boolean) as string[];
  // Sales per day for the last 30 days, from sold_at (the worker backdates it to the supplier's "sold" post).
  const soldByDay: Record<string, number> = {};
  for (const d of soldDates) {
    if (Date.parse(d) < Date.now() - 30 * 86400_000) continue;
    const day = d.slice(0, 10);
    soldByDay[day] = (soldByDay[day] || 0) + 1;
  }
  return {
    total: rows.length,
    live: live.length,
    sold: soldDates.length,
    soldThisWeek: soldDates.filter((d) => Date.parse(d) > weekAgo).length,
    addedThisWeek: rows.filter((r) => Date.parse(r.created_at) > weekAgo).length,
    hidden: rows.filter((r) => !r.is_visible).length,
    needsReview: rows.filter(needsReview).length,
    removed: rows.filter((r) => r.discovery_meta?.removed_at).length,
    stockValue: live.reduce((s, r) => s + Number(r.price || 0), 0),
    marginValue: live.reduce((s, r) => s + (r.stock_price != null ? Number(r.price || 0) - Number(r.stock_price) : 0), 0),
    byCategory,
    soldByDay,
  };
}

async function listRuns(p: Row) {
  const { data, error } = await db
    .from("edens_sync_runs")
    .select("*")
    .eq("business_id", BUSINESS_ID)
    .order("started_at", { ascending: false })
    .limit(Math.min(200, Number(p.limit) || 30));
  if (error) throw error;
  return { items: data || [] };
}

async function getConfig() {
  const { data, error } = await db.from("edens_sync_config").select("*").eq("business_id", BUSINESS_ID).maybeSingle();
  if (error) throw error;
  return data || { business_id: BUSINESS_ID };
}

// business_id is left out on purpose: changing which business Edens is happens in SQL, not from the admin.
const CONFIG_FIELDS = ["channel", "enabled", "markup_kes", "schedule", "sold_keywords", "runner", "edge_function", "notes"];

async function setConfig(p: Row) {
  const row: Row = { updated_at: new Date().toISOString() };
  for (const k of CONFIG_FIELDS) if (k in (p.config || {})) row[k] = p.config[k];
  if ("markup_kes" in row) row.markup_kes = Math.max(0, Math.round(Number(row.markup_kes) || 0));
  if ("sold_keywords" in row) {
    row.sold_keywords = (Array.isArray(row.sold_keywords) ? row.sold_keywords : String(row.sold_keywords).split(","))
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  const { data, error } = await db.from("edens_sync_config").update(row).eq("business_id", BUSINESS_ID).select("*").single();
  if (error) throw error;
  return data;
}

// Asks the worker for a run. The server worker checks run_requested_at every few minutes; if the worker is ever
// moved to a Supabase edge function (runner 'edge'), it is called straight away instead.
async function triggerRun(p: Row) {
  const config = await getConfig();
  const requested = new Date().toISOString();
  const mode = p.mode === "backfill" ? "backfill" : "sync";
  const { error } = await db
    .from("edens_sync_config")
    .update({ run_requested_at: requested, run_request_mode: mode })
    .eq("business_id", BUSINESS_ID);
  if (error) throw error;
  if (config.runner === "edge" && config.edge_function) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${config.edge_function}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: "manual", mode }),
      signal: AbortSignal.timeout(8000),
    }).catch((e) => ({ ok: false, status: 0, statusText: String(e) }) as Response);
    return { requested, invoked: true, ok: res.ok, status: res.status };
  }
  return { requested, invoked: false };
}

// ---------- router ----------

const ACTIONS: Record<string, (p: Row, req: Request) => Promise<unknown>> = {
  me: async () => ({ businessId: BUSINESS_ID }),
  stats,
  "products.list": listProducts,
  "products.get": async (p) => toAdmin(await getProduct(p.id)),
  "products.update": updateProduct,
  "products.create": createProduct,
  "products.delete": deleteProduct,
  "products.bulk": bulk,
  "runs.list": listRuns,
  "config.get": getConfig,
  "config.set": setConfig,
  "worker.run": triggerRun,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  try {
    if ((req.headers.get("content-type") || "").startsWith("multipart/form-data")) {
      await checkToken(req);
      BUSINESS_ID = await resolveBusinessId();
      return json(await uploadImage(req));
    }
    const body = await req.json().catch(() => ({}));
    BUSINESS_ID = await resolveBusinessId();
    if (body.action === "login") {
      if (!PASSWORD) throw new HttpError(500, "EDENS_ADMIN_PASSWORD is not set on the function.");
      await new Promise((r) => setTimeout(r, 400)); // slows password guessing
      if (!safeEqual(String(body.password || ""), PASSWORD)) throw new HttpError(401, "Wrong password.");
      return json(await issueToken());
    }
    await checkToken(req);
    const handler = ACTIONS[body.action];
    if (!handler) throw new HttpError(400, `Unknown action ${body.action}.`);
    return json(await handler(body, req));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    const message = e instanceof Error ? e.message : (e as { message?: string })?.message || "Something went wrong.";
    if (status === 500) console.error(e);
    return json({ error: message }, status);
  }
});
