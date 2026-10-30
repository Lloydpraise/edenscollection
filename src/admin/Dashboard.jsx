import { useState } from "react";
import { call } from "./api.js";
import { PageHead, Notice, RunStatus, departmentLabel, formatKsh, timeAgo, dateTime, duration, useAction } from "./shared.jsx";

export default function Dashboard() {
  const stats = useAction("stats", {});
  const runs = useAction("runs.list", { limit: 8 });
  const config = useAction("config.get", {});
  const s = stats.data;
  const lastRun = runs.data?.items?.[0];

  return (
    <>
      <PageHead eyebrow="Overview" title="Dashboard">
        <button className="btn btn-ghost btn-sm" onClick={() => (stats.reload(), runs.reload(), config.reload())}>
          Refresh
        </button>
      </PageHead>
      <Notice error={stats.error || runs.error} />

      <section className="adm-tiles">
        <Tile label="Live on the site" value={s?.live} href="#products?filter=live" />
        <Tile label="Sold" value={s?.sold} sub={s && `${s.soldThisWeek} this week`} href="#products?filter=sold" />
        <Tile label="Added this week" value={s?.addedThisWeek} sub={s && `${s.total} products in total`} />
        <Tile
          label="Needs review"
          value={s?.needsReview}
          sub="no price read"
          href="#products?filter=review"
          tone={s?.needsReview ? "gold" : ""}
        />
        <Tile label="Live stock at retail" value={s && formatKsh(s.stockValue)} />
        <Tile label="Margin on live stock" value={s && formatKsh(s.marginValue)} sub="retail minus wholesale" />
      </section>

      <div className="adm-grid-2">
        <section className="adm-card">
          <h2>Sold per day</h2>
          <p className="muted adm-card-sub">Last 30 days, dated from the supplier's "sold" post.</p>
          {s ? <SoldChart byDay={s.soldByDay} /> : <div className="adm-skeleton" style={{ height: 160 }} />}
        </section>

        <section className="adm-card">
          <h2>Telegram worker</h2>
          <WorkerSummary config={config.data} lastRun={lastRun} onRequested={config.reload} />
        </section>
      </div>

      <div className="adm-grid-2">
        <section className="adm-card">
          <h2>By department</h2>
          <table className="adm-table adm-table-compact">
            <thead>
              <tr>
                <th>Department</th>
                <th className="num">Live</th>
                <th className="num">Sold</th>
              </tr>
            </thead>
            <tbody>
              {s &&
                Object.entries(s.byCategory)
                  .sort((a, b) => b[1].live - a[1].live)
                  .map(([slug, c]) => (
                    <tr key={slug}>
                      <td>
                        <a href={`#products?category=${encodeURIComponent(slug)}`}>{departmentLabel(slug)}</a>
                      </td>
                      <td className="num">{c.live}</td>
                      <td className="num">{c.sold}</td>
                    </tr>
                  ))}
              {s && !Object.keys(s.byCategory).length && (
                <tr>
                  <td colSpan={3} className="muted">
                    No products yet. They appear after the worker's first run.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="adm-card">
          <h2>Recent runs</h2>
          <RunList runs={runs.data?.items} />
          <a className="text-link" href="#worker">
            All runs
          </a>
        </section>
      </div>
    </>
  );
}

function Tile({ label, value, sub, href, tone }) {
  const body = (
    <>
      <span className="adm-tile-label">{label}</span>
      <strong className="adm-tile-value">{value ?? "–"}</strong>
      {sub && <span className="adm-tile-sub">{sub}</span>}
    </>
  );
  const cls = `adm-tile${tone ? ` adm-tile-${tone}` : ""}`;
  return href ? (
    <a className={cls} href={href}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

// One series, so no legend: the heading names it. Bars grow from the baseline, hover shows the day's count.
function SoldChart({ byDay }) {
  const [hover, setHover] = useState(null);
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    days.push({ day: d, n: byDay[d] || 0 });
  }
  const max = Math.max(1, ...days.map((d) => d.n));
  const total = days.reduce((s, d) => s + d.n, 0);
  const W = 600,
    H = 150,
    gap = 2,
    bw = W / days.length - gap;
  const label = (d) => new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short" });

  return (
    <figure className="adm-chart">
      <svg viewBox={`0 0 ${W} ${H + 20}`} role="img" aria-label={`${total} products sold in the last 30 days`}>
        <line x1="0" x2={W} y1={H} y2={H} className="adm-chart-base" />
        {days.map((d, i) => {
          const h = d.n ? Math.max(4, (d.n / max) * (H - 10)) : 0;
          const x = i * (bw + gap);
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x} y="0" width={bw + gap} height={H} fill="transparent" />
              {h > 0 && <path className="adm-chart-bar" d={barPath(x, H - h, bw, h)} opacity={hover == null || hover === i ? 1 : 0.55} />}
            </g>
          );
        })}
        <text x="0" y={H + 16} className="adm-chart-axis">
          {label(days[0].day)}
        </text>
        <text x={W} y={H + 16} textAnchor="end" className="adm-chart-axis">
          Today
        </text>
      </svg>
      {hover != null && (
        <div className="adm-chart-tip" style={{ left: `${((hover + 0.5) / days.length) * 100}%` }}>
          <strong>{days[hover].n}</strong> sold · {label(days[hover].day)}
        </div>
      )}
      <figcaption className="muted">
        {total} sold in 30 days{total ? `, busiest day ${max}` : ""}.
      </figcaption>
    </figure>
  );
}

// Rounded top corners only, square at the baseline.
function barPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function WorkerSummary({ config, lastRun, onRequested }) {
  const [msg, setMsg] = useState("");
  if (!config) return <div className="adm-skeleton" style={{ height: 120 }} />;
  const pending = config.run_requested_at && (!lastRun || Date.parse(lastRun.started_at) < Date.parse(config.run_requested_at));

  async function runNow() {
    setMsg("");
    try {
      const r = await call("worker.run", { mode: "sync" });
      setMsg(r.invoked ? "Run started." : "Run requested. The worker picks it up within a few minutes.");
      onRequested();
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div className="adm-worker-sum">
      <dl className="adm-dl">
        <dt>Status</dt>
        <dd>{config.enabled === false ? "Paused" : lastRun ? <RunStatus status={lastRun.status} /> : "Waiting for its first run"}</dd>
        <dt>Last run</dt>
        <dd>{lastRun ? `${timeAgo(lastRun.started_at)} (${lastRun.runner || "?"}, ${lastRun.trigger})` : "never"}</dd>
        <dt>Channel</dt>
        <dd>{config.channel || <span className="muted">not set</span>}</dd>
        <dt>Markup</dt>
        <dd>{formatKsh(config.markup_kes ?? 2000)} on wholesale</dd>
        <dt>Last message</dt>
        <dd>{config.last_message_id ?? "–"}</dd>
      </dl>
      <div className="adm-row">
        <button className="btn btn-royal btn-sm" onClick={runNow} disabled={pending}>
          {pending ? "Run requested" : "Run now"}
        </button>
        <a className="text-link" href="#worker">
          Settings
        </a>
      </div>
      <Notice>{msg}</Notice>
    </div>
  );
}

export function RunList({ runs, expandable }) {
  const [open, setOpen] = useState(null);
  if (!runs) return <div className="adm-skeleton" style={{ height: 120 }} />;
  if (!runs.length) return <p className="muted">No runs yet. The first one is the backfill from Lloyd's laptop.</p>;
  return (
    <div className="adm-scroll">
      <table className="adm-table adm-table-compact">
        <thead>
          <tr>
            <th>Started</th>
            <th>Status</th>
            <th className="num">New</th>
            <th className="num">Updated</th>
            <th className="num">Sold</th>
            <th className="num">Removed</th>
            {expandable && <th className="num">Review</th>}
            {expandable && <th>Took</th>}
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <RunRow key={r.id} run={r} expandable={expandable} open={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RunRow({ run: r, expandable, open, onToggle }) {
  const errors = Array.isArray(r.errors) ? r.errors : [];
  return (
    <>
      <tr className={expandable ? "adm-click" : ""} onClick={expandable ? onToggle : undefined}>
        <td title={dateTime(r.started_at)}>
          {dateTime(r.started_at)}
          <span className="adm-sub">
            {r.runner || "?"} · {r.trigger}
          </span>
        </td>
        <td>
          <RunStatus status={r.status} />
        </td>
        <td className="num">{r.created}</td>
        <td className="num">{r.updated}</td>
        <td className="num">{r.sold_marked}</td>
        <td className="num">{r.removed}</td>
        {expandable && <td className="num">{r.needs_review}</td>}
        {expandable && <td>{duration(r.started_at, r.finished_at)}</td>}
      </tr>
      {expandable && open && (
        <tr className="adm-run-detail">
          <td colSpan={8}>
            <p>
              Scanned {r.posts_scanned} posts. {errors.length ? `${errors.length} error(s):` : "No errors."}
            </p>
            {errors.length > 0 && (
              <ul className="adm-errors">
                {errors.map((e, i) => (
                  <li key={i}>{typeof e === "string" ? e : e.message || JSON.stringify(e)}</li>
                ))}
              </ul>
            )}
            {r.log ? <pre className="adm-log">{r.log}</pre> : <p className="muted">No log saved for this run.</p>}
          </td>
        </tr>
      )}
    </>
  );
}
