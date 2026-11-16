import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

// Like / dislike, save to library and add to collections for one title.
// `viewer` is the signed-in user's state from GET /api/media/:id.
export default function MediaActions({ mediaId, viewer }) {
  const { user } = useAuth();
  const location = useLocation();
  const [preference, setPreference] = useState(viewer?.preference ?? null);
  const [saved, setSaved] = useState(viewer?.saved ?? false);
  const [collectionIds, setCollectionIds] = useState(viewer?.collectionIds ?? []);
  // Which request is in flight ("preference" | "save"), so one doesn't block the other
  const [busy, setBusy] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    setPreference(viewer?.preference ?? null);
    setSaved(viewer?.saved ?? false);
    setCollectionIds(viewer?.collectionIds ?? []);
  }, [viewer]);

  if (!user) {
    return (
      <p className="actions-signin muted">
        <Link to="/login" state={{ from: location.pathname }}>Log in</Link> to like, save or collect this title.
      </p>
    );
  }

  // Runs a request; on failure, restores the previous state and shows the error
  async function run(key, request, rollback) {
    setBusy((b) => ({ ...b, [key]: true }));
    setError("");
    try {
      await request();
    } catch (err) {
      rollback();
      setError(err.message);
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  }

  function togglePreference(type) {
    const previous = preference;
    const next = preference === type ? null : type; // clicking the active one clears it
    setPreference(next);
    run(
      "preference",
      () =>
        next
          ? api(`/media/${mediaId}/preference`, { method: "PUT", body: { type: next } })
          : api(`/media/${mediaId}/preference`, { method: "DELETE" }),
      () => setPreference(previous),
    );
  }

  function toggleSaved() {
    const previous = saved;
    setSaved(!saved);
    run(
      "save",
      () => api(`/media/${mediaId}/save`, { method: previous ? "DELETE" : "PUT" }),
      () => setSaved(previous),
    );
  }

  return (
    <div className="actions">
      <div className="actions-row">
        <div className="segmented" role="group" aria-label="Your rating">
          <button
            type="button"
            className={preference === "LIKE" ? "active like" : ""}
            aria-pressed={preference === "LIKE"}
            disabled={busy.preference}
            onClick={() => togglePreference("LIKE")}
          >
            👍 Like
          </button>
          <button
            type="button"
            className={preference === "DISLIKE" ? "active dislike" : ""}
            aria-pressed={preference === "DISLIKE"}
            disabled={busy.preference}
            onClick={() => togglePreference("DISLIKE")}
          >
            👎 Dislike
          </button>
        </div>

        <button
          type="button"
          className={`btn ${saved ? "btn-primary" : "btn-ghost"}`}
          aria-pressed={saved}
          disabled={busy.save}
          onClick={toggleSaved}
        >
          {saved ? "✓ In your library" : "+ Save to library"}
        </button>

        <CollectionPicker mediaId={mediaId} selected={collectionIds} onChange={setCollectionIds} />
      </div>
      {error && <p className="alert alert-error actions-error">{error}</p>}
    </div>
  );
}

// Dropdown listing the user's collections with a checkbox each, plus quick create
function CollectionPicker({ mediaId, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null);
  const [alignRight, setAlignRight] = useState(false);
  const ref = useRef(null);

  function toggleOpen() {
    // Open towards the left when the menu would run off the right edge
    if (!open && ref.current) {
      const { left } = ref.current.getBoundingClientRect();
      setAlignRight(left + 290 > window.innerWidth);
    }
    setOpen(!open);
  }

  // Load collections the first time the menu opens
  useEffect(() => {
    if (!open || collections) return;
    api("/collections")
      .then((data) => setCollections(data.items))
      .catch((err) => setError(err.message));
  }, [open, collections]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggle(collectionId) {
    const inIt = selected.includes(collectionId);
    setPending(collectionId);
    setError("");
    try {
      await api(`/collections/${collectionId}/items/${mediaId}`, { method: inIt ? "DELETE" : "PUT" });
      onChange(inIt ? selected.filter((id) => id !== collectionId) : [...selected, collectionId]);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(null);
    }
  }

  async function create(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError("");
    setPending("new");
    try {
      const collection = await api("/collections", { method: "POST", body: { name } });
      await api(`/collections/${collection.id}/items/${mediaId}`, { method: "PUT" });
      setCollections((list) => [collection, ...(list || [])]);
      onChange([...selected, collection.id]);
      setNewName("");
    } catch (err) {
      setError(err.details?.name || err.message);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="picker" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={toggleOpen}
      >
        ☰ Collections{selected.length > 0 && ` (${selected.length})`}
      </button>

      {open && (
        <div className={`picker-menu ${alignRight ? "picker-menu-right" : ""}`}>
          <p className="picker-title">Add to collection</p>
          {!collections && !error && <p className="muted picker-note">Loading…</p>}
          {collections && collections.length === 0 && (
            <p className="muted picker-note">No collections yet. Create one below.</p>
          )}
          {collections && collections.length > 0 && (
            <ul className="picker-list">
              {collections.map((c) => (
                <li key={c.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      disabled={pending !== null}
                      onChange={() => toggle(c.id)}
                    />
                    <span>{c.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <form className="picker-create" onSubmit={create}>
            <input
              type="text"
              placeholder="New collection"
              value={newName}
              maxLength={50}
              onChange={(e) => setNewName(e.target.value)}
              aria-label="New collection name"
            />
            <button type="submit" className="btn btn-primary" disabled={!newName.trim() || pending !== null}>
              Add
            </button>
          </form>
          {error && <p className="field-error picker-note">{error}</p>}
          <Link to="/collections" className="picker-link">Manage collections →</Link>
        </div>
      )}
    </div>
  );
}
