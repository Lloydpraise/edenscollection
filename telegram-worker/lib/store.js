// Supabase (VVStudios) access: products, photos, and the sync config/run tables shared with /admin.
import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";

export function connectStore() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (VVStudios > Project settings > API).");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const check = ({ data, error }, what) => {
    if (error) throw new Error(`${what}: ${error.message}`);
    return data;
  };

  return {
    // The sync settings row /admin edits. There is one row; its business_id says which Heysasa business
    // the products belong to. EDENS_BUSINESS_ID in .env only overrides it.
    async config(businessId) {
      let query = db.from("edens_sync_config").select("*");
      if (businessId) query = query.eq("business_id", businessId);
      const { data, error } = await query.limit(1).maybeSingle();
      if (error && !/does not exist|schema cache/i.test(error.message)) throw new Error(`config: ${error.message}`);
      return data || null;
    },

    async saveConfig(businessId, fields) {
      check(await db.from("edens_sync_config").update({ ...fields, updated_at: new Date().toISOString() }).eq("business_id", businessId), "save config");
    },

    async startRun(fields) {
      const { data, error } = await db.from("edens_sync_runs").insert({ ...fields, status: "running", started_at: new Date().toISOString() }).select("id").single();
      if (error) {
        console.warn(`(couldn't record the run: ${error.message})`);
        return null;
      }
      return data.id;
    },

    async finishRun(id, fields) {
      if (!id) return;
      const { error } = await db.from("edens_sync_runs").update({ ...fields, finished_at: new Date().toISOString() }).eq("id", id);
      if (error) console.warn(`(couldn't update the run: ${error.message})`);
    },

    async telegramProducts(businessId) {
      const rows = [];
      for (let from = 0; ; from += 1000) {
        const page = check(
          await db.from("products").select("id, status, title, description_short, description_long, price, stock_quantity, is_visible, images, key_features, category, product_type, handle, telegram_id, discovery_meta").eq("business_id", businessId).eq("source", "telegram").range(from, from + 999),
          "load products",
        );
        rows.push(...page);
        if (page.length < 1000) return rows;
      }
    },

    async upsert(rows) {
      for (let i = 0; i < rows.length; i += 200) {
        check(await db.from("products").upsert(rows.slice(i, i + 200), { onConflict: "id" }), "save products");
      }
    },

    async uploadPhoto(path, buffer) {
      check(await db.storage.from(BUCKET).upload(path, buffer, { contentType: "image/jpeg", upsert: true }), `upload ${path}`);
      return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    },

    async removePhotos(paths) {
      if (paths.length) await db.storage.from(BUCKET).remove(paths);
    },
  };
}
