import { useRef } from "react";

export default function Sidebar({ docs, activeId, onSelect, onUpload, onDelete, uploading, user, onLogout }) {
  const input = useRef();
  return (
    <aside className="flex h-dvh w-72 max-w-[85vw] flex-col border-r border-base-300 bg-base-200">
      <div className="p-4">
        <h1 className="font-[Literata] text-xl font-semibold">Margin</h1>
        <p className="text-sm text-base-content/60">Your PDFs, ready to study.</p>
      </div>
      <div className="px-4">
        <input ref={input} type="file" accept="application/pdf" hidden
          onChange={(e) => { const f = e.target.files[0]; e.target.value = ""; if (f) onUpload(f); }} />
        <button className="btn btn-primary btn-block" disabled={uploading} onClick={() => input.current.click()}>
          {uploading ? <><span className="loading loading-spinner loading-sm" /> Uploading…</> : "Add a PDF"}
        </button>
      </div>
      <ul className="mt-4 flex-1 overflow-y-auto px-2">
        {docs.length === 0 && <li className="px-2 text-sm text-base-content/60">No PDFs yet. Add one to start studying.</li>}
        {docs.map((d) => (
          <li key={d._id} className={`flex items-center rounded-lg ${d._id === activeId ? "bg-base-100 shadow-sm" : "hover:bg-base-300/50"}`}>
            <button className="min-w-0 flex-1 px-3 py-2.5 text-left" onClick={() => onSelect(d._id)}>
              <span className="block truncate text-sm font-medium">{d.filename.replace(/\.pdf$/i, "")}</span>
              {d.status === "processing" && <span className="flex items-center gap-1 text-xs text-base-content/60"><span className="loading loading-spinner loading-xs" /> Reading…</span>}
              {d.status === "failed" && <span className="text-xs text-error">Couldn’t read this PDF</span>}
            </button>
            <button className="btn btn-ghost btn-xs mr-1" aria-label={`Delete ${d.filename}`}
              onClick={() => confirm("Delete this PDF and its chat?") && onDelete(d._id)}>✕</button>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-2 border-t border-base-300 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-sm">
        <span className="truncate">{user.email}</span>
        <button className="btn btn-ghost btn-sm" onClick={onLogout}>Log out</button>
      </div>
    </aside>
  );
}