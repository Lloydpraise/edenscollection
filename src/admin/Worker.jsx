import { useEffect, useState } from "react";
import { call } from "./api.js";
import { PageHead, Notice, formatKsh, dateTime, timeAgo, useAction } from "./shared.jsx";
import { RunList } from "./Dashboard.jsx";

export default function Worker() {
  const config = useAction("config.get", {});
  const runs = useAction("runs.list", { limit: 60 });

  // Refresh while a run is going or one has been requested.
  const running = runs.data?.items?.some((r) => r.status === "running");
  const lastStart = runs.data?.items?.[0]?.started_at;
  const pending = config.data?.run_requested_at && (!lastStart || Date.parse(lastStart) < Date.parse(config.data.run_requested_at));
  useEffect(() => {
    if (!running && !pending) return;
    const t = setInterval(() => (runs.reload(), config.reload()), 15000);
    return () => clearInterval(t);
  }, [running, pending]);

  return (
    <>
      <PageHead eyebrow="Supplier sync" title="Telegram worker">
        <button className="btn btn-ghost btn-sm" onClick={() => (runs.reload(), config.reload())}>
          Refresh
        </button>
      </PageHead>
      <Notice error={config.error || runs.error} />

      <div className="adm-grid-2 adm-grid-wide">
        <section className="adm-card">
          <h2>Settings</h2>
          {config.data ? <ConfigForm config={config.data} onSaved={config.reload} /> : <div className="adm-skeleton" style={{ height: 300 }} />}
        </section>
        <div className="adm-stack">
          <section className="adm-card">
            <h2>Run it</h2>
            <RunControls config={config.data} pending={pending} running={running} onRequested={config.reload} />
          </section>
          <section className="adm-card">
            <h2>Setup</h2>
            <ol className="adm-steps">
              <li>
                <strong>First run on your laptop.</strong> In <code>telegram-worker/</code>, copy <code>.env.example</code> to <code>.env</code>, add the
                Telegram API id and hash from my.telegram.org and the Supabase service key, then <code>npm run login</code> and{" "}
                <code>npm run backfill</code>. This imports the whole channel and backdates everything marked sold.
              </li>
              <li>
                <strong>Move it to the Heysasa server.</strong> Copy the folder and its <code>data/session.txt</code> across, <code>npm ci</code>, and add
                the daily cron line from the worker's README. Its poll mode also picks up the Run now button here.
              </li>
              <li>
                <strong>Check here.</strong> Each run shows up below with what it changed. Posts with no readable price wait under{" "}
                <a href="#products?filter=review">Needs review</a>.
              </li>
            </ol>
            <p className="muted adm-small">Full steps: telegram-worker/README.md in the repo.</p>
          </section>
        </div>
      </div>

      <section className="adm-card">
        <h2>Runs</h2>
        <p className="muted adm-card-sub">Click a run to see its log and errors.</p>
        <RunList runs={runs.data?.items} expandable />
      </section>
    </>
  );
}

function RunControls({ config, pending, running, onRequested }) {
  const [msg, setMsg] = useState("");
  if (!config) return <div className="adm-skeleton" style={{ height: 80 }} />;

  async function request(mode) {
    if (mode === "backfill" && !confirm("Re-read the whole channel from the start? This takes a while and re-checks every sold marker.")) return;
    setMsg("");
    try {
      const r = await call("worker.run", { mode });
      setMsg(r.invoked ? "Run started." : "Requested. The worker checks every few minutes, so it starts shortly.");
      onRequested();
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <>
      <p className="muted">
        Runs daily on its own{config.enabled === false ? ", but it is paused right now" : ""}. Use these when you want fresh products sooner.
      </p>
      <div className="adm-row">
        <button className="btn btn-royal btn-sm" disabled={pending || running} onClick={() => request("sync")}>
          {running ? "Running…" : pending ? "Requested" : "Run now"}
        </button>
        <button className="btn btn-ghost btn-sm" disabled={pending || running} onClick={() => request("backfill")}>
          Full re-scan
        </button>
      </div>
      {config.run_requested_at && (
        <p className="muted adm-small">
          Last request {timeAgo(config.run_requested_at)} ({config.run_request_mode || "sync"}).
        </p>
      )}
      <Notice>{msg}</Notice>
    </>
  );
}

function ConfigForm({ config, onSaved }) {
  const init = () => ({
    channel: config.channel || "",
    enabled: config.enabled !== false,
    markup_kes: config.markup_kes ?? 2000,
    schedule: config.schedule || "0 3 * * *",
    sold_keywords: (config.sold_keywords || ["sold"]).join(", "),
    runner: config.runner || "server",
    notes: config.notes || "",
  });
  const [form, setForm] = useState(init);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  useEffect(() => setForm(init()), [config]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setError("");
    try {
      await call("config.set", { config: { ...form, markup_kes: Number(form.markup_kes) } });
      setMsg("Saved. The worker uses these from its next run.");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="adm-form-grid" onSubmit={save}>
      <label className="adm-toggle adm-span-2">
        <input type="checkbox" checked={form.enabled} onChange={set("enabled")} />
        <span>Daily sync is on</span>
      </label>
      <label className="adm-field adm-span-2">
        <span>Supplier channel</span>
        <input value={form.channel} onChange={set("channel")} placeholder="@channel or -100… id" />
      </label>
      <label className="adm-field">
        <span>Markup on wholesale (KSh)</span>
        <input type="number" min="0" step="100" value={form.markup_kes} onChange={set("markup_kes")} />
        <small>A KSh 10,000 piece sells at {formatKsh(10000 + Number(form.markup_kes || 0))}.</small>
      </label>
      <label className="adm-field">
        <span>Schedule (cron, server clock)</span>
        <input value={form.schedule} onChange={set("schedule")} />
        <small>0 3 * * * is 06:00 in Nairobi on a UTC server.</small>
      </label>
      <label className="adm-field adm-span-2">
        <span>Words that mean sold</span>
        <input value={form.sold_keywords} onChange={set("sold_keywords")} />
        <small>Comma separated, any case. A reply or caption edit with one of these marks the product sold.</small>
      </label>
      <label className="adm-field">
        <span>Runs on</span>
        <select value={form.runner} onChange={set("runner")}>
          <option value="server">Heysasa server</option>
          <option value="laptop">Laptop</option>
          <option value="edge">Supabase edge function</option>
        </select>
      </label>
      <div className="adm-field">
        <span>Business</span>
        <p className="adm-static">
          {config.business_id}
          <small>Last message read: {config.last_message_id ?? "–"}</small>
        </p>
      </div>
      <label className="adm-field adm-span-2">
        <span>Notes</span>
        <textarea rows={3} value={form.notes} onChange={set("notes")} />
      </label>
      <div className="adm-row adm-span-2">
        <button className="btn btn-royal btn-sm" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
        <span className="muted adm-small">Updated {dateTime(config.updated_at)}</span>
      </div>
      <div className="adm-span-2">
        <Notice error={error}>{msg}</Notice>
      </div>
    </form>
  );
}
