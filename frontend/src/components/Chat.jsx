import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Markdown from "./Markdown";

const STARTERS = [
  "Summarize this in simple points",
  "List the key terms with definitions",
  "Quiz me with 5 questions",
  "What are the most likely exam questions?",
];

export default function Chat({ doc, onMenu, theme, onTheme }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const end = useRef();

  useEffect(() => {
    setMsgs([]);
    setErr("");

    if (doc?.status === "ready") {
      api
        .messages(doc._id)
        .then(setMsgs)
        .catch((e) => setErr(e.message));
    }
  }, [doc?._id, doc?.status]);

  useEffect(() => {
    end.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [msgs, busy]);

  async function send(q) {
    q = (q ?? text).trim();

    if (!q || busy) return;

    setText("");
    setErr("");
    setBusy(true);

    // Immediately show the user's message
    setMsgs((m) => [
      ...m,
      {
        role: "user",
        text: q,
      },
    ]);

    try {
      const response = await api.ask(doc._id, q);

      // Backend returned an error
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(data.error || "Failed to generate answer");
      }

      if (!response.body) {
        throw new Error("Streaming response is not available");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let answer = "";

      // Create an empty model message first
      setMsgs((m) => [
        ...m,
        {
          role: "model",
          text: "",
        },
      ]);

      // Read chunks as they arrive
      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, {
          stream: true,
        });

        if (!chunk) continue;

        answer += chunk;

        // Update the last model message
        setMsgs((m) => {
          const copy = [...m];

          copy[copy.length - 1] = {
            role: "model",
            text: answer,
          };

          return copy;
        });
      }

      // Flush anything remaining in TextDecoder
      const finalChunk = decoder.decode();

      if (finalChunk) {
        answer += finalChunk;

        setMsgs((m) => {
          const copy = [...m];

          copy[copy.length - 1] = {
            role: "model",
            text: answer,
          };

          return copy;
        });
      }
    } catch (e) {
      console.error("Chat error:", e);
      setErr(e.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const ready = doc?.status === "ready";

  return (
    <div className="paper flex h-dvh flex-col">
      {/* Header */}
      <header className="flex items-center gap-2 border-b border-base-300 bg-base-100/90 px-3 py-2 backdrop-blur">
        <button
          className="btn btn-ghost btn-sm lg:hidden"
          onClick={onMenu}
          aria-label="Open your PDFs"
        >
          ☰
        </button>

        <h2 className="truncate font-[Literata] text-lg font-semibold">
          {doc ? doc.filename.replace(/\.pdf$/i, "") : "Margin"}
        </h2>

        <button
          className="btn btn-ghost btn-sm ml-auto"
          onClick={onTheme}
          aria-label={
            theme === "notebook-dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
        >
          {theme === "notebook-dark" ? "☀" : "☾"}
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {!doc && (
            <p className="note pt-10 text-center text-base-content/70">
              Add a PDF from the menu, or open one you studied before. Your chat
              with it is saved.
            </p>
          )}

          {doc && doc.status === "processing" && (
            <div className="alert alert-warning">
              <span className="loading loading-spinner loading-sm" />
              Reading your PDF. Handwritten notes can take a minute or two.
            </div>
          )}

          {doc && doc.status === "failed" && (
            <div className="alert alert-error">
              Couldn’t read this PDF. {doc.error}
            </div>
          )}

          {ready && msgs.length === 0 && (
            <div className="pt-6">
              <p className="note mb-3">Where do you want to start?</p>

              <div className="flex flex-wrap gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    className="btn btn-sm btn-outline border-base-300 bg-base-100 font-normal"
                    onClick={() => send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-primary-content">
                  {m.text}
                </p>
              </div>
            ) : (
              <div
                key={i}
                className="border-l-2 border-accent/50 bg-base-100/80 py-1 pl-4 pr-2"
              >
                <Markdown>{m.text}</Markdown>
              </div>
            ),
          )}

          {busy && (
            <p className="note text-base-content/60">
              <span className="loading loading-dots loading-sm" />
              Thinking…
            </p>
          )}

          {err && <div className="alert alert-error">{err}</div>}

          <div ref={end} />
        </div>
      </div>

      {/* Input */}
      {ready && (
        <form
          className="border-t border-base-300 bg-base-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <textarea
              className="textarea textarea-bordered max-h-40 min-h-11 flex-1 resize-none text-base"
              rows={1}
              placeholder="Ask about this PDF"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />

            <button className="btn btn-primary" disabled={busy || !text.trim()}>
              {busy ? "Thinking..." : "Ask"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
