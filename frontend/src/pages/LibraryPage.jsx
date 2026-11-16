import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import MediaCard from "../components/MediaCard.jsx";
import Pagination from "../components/Pagination.jsx";
import { plural } from "../utils/format.js";

const TABS = [
  { value: "saved", label: "Saved", path: "/me/library", empty: "You haven't saved any titles yet." },
  { value: "liked", label: "Liked", path: "/me/preferences?type=LIKE", empty: "You haven't liked any titles yet." },
  { value: "disliked", label: "Disliked", path: "/me/preferences?type=DISLIKE", empty: "You haven't disliked any titles." },
];

export default function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.value === params.get("tab")) || TABS[0];
  const page = Number(params.get("page")) || 1;

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const sep = tab.path.includes("?") ? "&" : "?";
    setLoading(true);
    setError("");
    api(`${tab.path}${sep}page=${page}&limit=20`)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab, page]);

  function go(changes) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next);
  }

  return (
    <section>
      <div className="page-head">
        <h1>My library</h1>
        <p className="muted">Titles you've saved, liked or disliked.</p>
      </div>

      <div className="filters">
        <div className="segmented" role="tablist" aria-label="Library lists">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={t.value === tab.value}
              className={t.value === tab.value ? "active" : ""}
              onClick={() => go({ tab: t.value === "saved" ? "" : t.value, page: "" })}
            >
              {t.label}
            </button>
          ))}
        </div>
        {result && !error && <span className="muted">{plural(result.total, "title")}</span>}
      </div>

      {error && <p className="alert alert-error">{error}</p>}
      {loading && !result && <p className="muted">Loading…</p>}

      {result && !error && result.items.length === 0 && !loading && (
        <div className="empty">
          <p>{tab.empty}</p>
          <Link to="/" className="btn btn-primary">Browse titles</Link>
        </div>
      )}

      {result && result.items.length > 0 && (
        <div className={`grid ${loading ? "is-loading" : ""}`}>
          {result.items.map((m) => (
            <MediaCard key={m.id} media={m} />
          ))}
        </div>
      )}

      {result && (
        <Pagination page={result.page} totalPages={result.totalPages} onChange={(p) => go({ page: String(p) })} />
      )}
    </section>
  );
}
