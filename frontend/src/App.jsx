import { useEffect, useState } from "react";
import { api } from "./api";
import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";

function AuthScreen({ onDone }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    try { onDone((await api[mode](form)).user); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="paper flex min-h-dvh items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-box border border-base-300 bg-base-100 p-6">
        <h1 className="font-[Literata] text-3xl font-semibold">Margin</h1>
        <p className="mb-5 mt-1 text-base-content/70">Upload your notes. Ask them anything.</p>
        <input className="input input-bordered mb-3 w-full text-base" type="email" placeholder="Email" required
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input input-bordered mb-3 w-full text-base" type="password" placeholder="Password (6+ characters)" required minLength={6}
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {err && <p className="mb-3 text-sm text-error">{err}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{mode === "login" ? "Log in" : "Create account"}</button>
        <button type="button" className="btn btn-link btn-sm mt-2 w-full" onClick={() => { setErr(""); setMode(mode === "login" ? "signup" : "login"); }}>
          {mode === "login" ? "New here? Create an account" : "Have an account? Log in"}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = still checking
  const [docs, setDocs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState(() => {
    try { const s = localStorage.getItem("theme"); if (s) return s; } catch {}
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "notebook-dark" : "notebook";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);

  useEffect(() => { api.me().then((r) => setUser(r.user)).catch(() => setUser(null)); }, []);
  useEffect(() => { if (user) api.docs().then(setDocs).catch(() => {}); }, [user]);
  useEffect(() => {
    if (!docs.some((d) => d.status === "processing")) return;
    const t = setInterval(() => api.docs().then(setDocs).catch(() => {}), 3000);
    return () => clearInterval(t);
  }, [docs]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 4000); return () => clearTimeout(t); } }, [toast]);

  async function upload(file) {
    setUploading(true);
    try {
      const d = await api.upload(file);
      setDocs(await api.docs());
      setActiveId(d.id); setOpen(false);
    } catch (e) { setToast(e.message); } finally { setUploading(false); }
  }

  async function remove(id) {
    try {
      await api.remove(id);
      setDocs((d) => d.filter((x) => x._id !== id));
      if (activeId === id) setActiveId(null);
    } catch (e) { setToast(e.message); }
  }

  async function logout() { await api.logout(); setUser(null); setDocs([]); setActiveId(null); }

  if (user === undefined) return <div className="paper grid min-h-dvh place-items-center"><span className="loading loading-dots" /></div>;
  if (!user) return <AuthScreen onDone={setUser} />;

  return (
    <div className="drawer lg:drawer-open">
      <input id="nav" type="checkbox" className="drawer-toggle" checked={open} onChange={(e) => setOpen(e.target.checked)} />
      <div className="drawer-content">
        <Chat doc={docs.find((d) => d._id === activeId)} onMenu={() => setOpen(true)}
          theme={theme} onTheme={() => setTheme((t) => (t === "notebook" ? "notebook-dark" : "notebook"))} />
      </div>
      <div className="drawer-side z-30">
        <label htmlFor="nav" className="drawer-overlay" aria-label="Close menu" />
        <Sidebar docs={docs} activeId={activeId} user={user} uploading={uploading}
          onSelect={(id) => { setActiveId(id); setOpen(false); }}
          onUpload={upload} onDelete={remove} onLogout={logout} />
      </div>
      {toast && <div className="toast toast-top toast-center z-50"><div className="alert alert-error">{toast}</div></div>}
    </div>
  );
}