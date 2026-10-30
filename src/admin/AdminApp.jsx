import { useEffect, useState } from "react";
import { AUTH_EVENT, call, getToken, signIn, signOut } from "./api.js";
import Dashboard from "./Dashboard.jsx";
import Products from "./Products.jsx";
import Worker from "./Worker.jsx";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "products", label: "Products" },
  { id: "worker", label: "Telegram worker" },
];

const currentTab = () => {
  const id = location.hash.replace("#", "").split("?")[0];
  return TABS.some((t) => t.id === id) ? id : "dashboard";
};

export default function AdminApp() {
  const [authed, setAuthed] = useState(() => Boolean(getToken()));
  const [tab, setTab] = useState(currentTab);
  const [me, setMe] = useState(null);

  useEffect(() => {
    const onAuth = () => setAuthed(Boolean(getToken()));
    const onHash = () => setTab(currentTab());
    window.addEventListener(AUTH_EVENT, onAuth);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener(AUTH_EVENT, onAuth);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  useEffect(() => {
    if (authed) call("me").then(setMe, () => {});
  }, [authed]);

  if (!authed) return <Login />;

  return (
    <div className="adm">
      <aside className="adm-side">
        <a className="adm-logo" href="/" title="View the store">
          <span className="logo-mark" aria-hidden="true">E</span>
          <span>
            Edens <em>Admin</em>
          </span>
        </a>
        <nav className="adm-nav" aria-label="Admin">
          {TABS.map((t) => (
            <a key={t.id} href={`#${t.id}`} aria-current={tab === t.id ? "page" : undefined}>
              {t.label}
            </a>
          ))}
        </nav>
        <div className="adm-side-foot">
          {me && <span className="adm-biz">Business: {me.businessId}</span>}
          <button className="link-btn" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="adm-main">
        {tab === "dashboard" && <Dashboard />}
        {tab === "products" && <Products />}
        {tab === "worker" && <Worker />}
      </main>
    </div>
  );
}

function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="adm-login">
      <form className="adm-login-card" onSubmit={submit}>
        <span className="logo-mark" aria-hidden="true">E</span>
        <p className="eyebrow">Edens Watches</p>
        <h1>Admin</h1>
        <label className="adm-field">
          <span>Password</span>
          <input type="password" autoFocus autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="adm-error">{error}</p>}
        <button className="btn btn-royal btn-block" disabled={busy || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
