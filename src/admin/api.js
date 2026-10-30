// Client for the edens-admin Supabase edge function. The token lives in localStorage so a refresh keeps you
// signed in until it expires (12 h).

const API =
  import.meta.env.PUBLIC_EDENS_ADMIN_API || "https://xgtnbxdxbbywvzrttixf.supabase.co/functions/v1/edens-admin";
const KEY = "edens-admin-token";

export const AUTH_EVENT = "edens-admin-auth";

export function getToken() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && Date.parse(saved.expiresAt) > Date.now()) return saved.token;
  } catch {}
  return null;
}

export function signOut() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(AUTH_EVENT));
}

async function send(body, headers = {}) {
  const token = getToken();
  const res = await fetch(API, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body,
  });
  const data = await res.json().catch(() => ({ error: `The admin API answered ${res.status}.` }));
  if (res.status === 401 && token) signOut();
  if (!res.ok) throw new Error(data.error || `The admin API answered ${res.status}.`);
  return data;
}

export const call = (action, params = {}) =>
  send(JSON.stringify({ action, ...params }), { "Content-Type": "application/json" });

export async function signIn(password) {
  const data = await call("login", { password });
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function uploadImage(file) {
  const form = new FormData();
  form.append("file", file);
  return send(form).then((d) => d.url);
}
