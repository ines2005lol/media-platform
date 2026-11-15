import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import MediaCard from "../components/MediaCard.jsx";
import { plural } from "../utils/format.js";

const TYPES = [
  { value: "", label: "All" },
  { value: "MOVIE", label: "Movies" },
  { value: "TV_SHOW", label: "TV shows" },
];

export default function BrowsePage() {
  // Filters live in the URL, so they survive refresh and the back button
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const type = params.get("type") || "";
  const genre = params.get("genre") || "";
  const sort = params.get("sort") || "title";
  const page = Number(params.get("page")) || 1;

  const [searchInput, setSearchInput] = useState(search);
  const [genres, setGenres] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => setSearchInput(search), [search]);

  useEffect(() => {
    api("/genres").then((data) => setGenres(data.items)).catch(() => setGenres([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ sort, page: String(page), limit: "20" });
    if (search) query.set("search", search);
    if (type) query.set("type", type);
    if (genre) query.set("genre", genre);

    setLoading(true);
    setError("");
    api(`/media?${query}`)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true; // ignore responses from outdated requests
    };
  }, [search, type, genre, sort, page]);

  // Updates one or more filters; any filter change goes back to page 1
  function update(changes) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page");
    setParams(next);
  }

  function handleSearch(e) {
    e.preventDefault();
    update({ search: searchInput.trim() });
  }

  return (
    <section>
      <div className="page-head">
        <h1>Browse</h1>
        <p className="muted">Find movies and TV shows by title, type or genre.</p>
      </div>

      <form className="search-bar" onSubmit={handleSearch} role="search">
        <input
          type="search"
          placeholder="Search titles and descriptions…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Search"
          maxLength={100}
        />
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      <div className="filters">
        <div className="segmented" role="group" aria-label="Type">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={type === t.value ? "active" : ""}
              onClick={() => update({ type: t.value })}
            >
              {t.label}
            </button>
          ))}
        </div>

        <label className="select-label">
          Genre
          <select value={genre} onChange={(e) => update({ genre: e.target.value })}>
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.mediaCount})
              </option>
            ))}
          </select>
        </label>

        <label className="select-label">
          Sort
          <select value={sort} onChange={(e) => update({ sort: e.target.value })}>
            <option value="title">Title A–Z</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {!error && result && (
        <p className="muted result-count">
          {plural(result.total, "title")}
          {search && <> matching “{search}”</>}
        </p>
      )}

      {loading && !result && <p className="muted">Loading…</p>}

      {result && result.items.length === 0 && !loading && (
        <div className="empty">
          <p>No titles match these filters.</p>
          <button type="button" className="btn btn-ghost" onClick={() => setParams({})}>
            Clear filters
          </button>
        </div>
      )}

      {result && result.items.length > 0 && (
        <div className={`grid ${loading ? "is-loading" : ""}`}>
          {result.items.map((m) => (
            <MediaCard key={m.id} media={m} />
          ))}
        </div>
      )}

      {result && result.totalPages > 1 && (
        <nav className="pagination" aria-label="Pagination">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={page <= 1}
            onClick={() => update({ page: String(page - 1) })}
          >
            ← Previous
          </button>
          <span className="muted">
            Page {result.page} of {result.totalPages}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={page >= result.totalPages}
            onClick={() => update({ page: String(page + 1) })}
          >
            Next →
          </button>
        </nav>
      )}
    </section>
  );
}
