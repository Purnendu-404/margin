const BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    credentials: "include",
    ...opts,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data.error || "Request failed"
    );
  }

  return data;
}

const json = (method, body) => ({
  method,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

export const api = {
  // Authentication
  me: () =>
    req("/auth/me"),

  login: (b) =>
    req("/auth/login", json("POST", b)),

  signup: (b) =>
    req("/auth/signup", json("POST", b)),

  logout: () =>
    req("/auth/logout", {
      method: "POST",
    }),

  // Documents
  docs: () =>
    req("/documents"),

  messages: (id) =>
    req(`/documents/${id}/messages`),

  remove: (id) =>
    req(`/documents/${id}`, {
      method: "DELETE",
    }),

  // PDF upload
  upload: (file) => {
    const f = new FormData();

    f.append("pdf", file);

    return req("/upload", {
      method: "POST",
      body: f,
    });
  },

  // Streaming RAG query
  ask: (documentId, question) =>
    fetch(`${BASE}/query`, {
      ...json("POST", {
        documentId,
        question,
      }),
      credentials: "include",
    }),
};