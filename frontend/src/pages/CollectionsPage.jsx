import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import Poster from "../components/Poster.jsx";
import { plural } from "../utils/format.js";

export default function CollectionsPage() {
  const [collections, setCollections] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/collections")
      .then((data) => setCollections(data.items))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section>
      <div className="page-head">
        <h1>Collections</h1>
        <p className="muted">Group titles into your own lists.</p>
      </div>

      <CreateCollectionForm onCreated={(c) => setCollections((list) => [{ ...c, preview: [] }, ...(list || [])])} />

      {error && <p className="alert alert-error">{error}</p>}
      {!collections && !error && <p className="muted">Loading…</p>}

      {collections && collections.length === 0 && (
        <div className="empty">
          <p>No collections yet. Create your first one above, or from any title's page.</p>
        </div>
      )}

      {collections && collections.length > 0 && (
        <div className="collection-grid">
          {collections.map((c) => (
            <Link key={c.id} to={`/collections/${c.id}`} className="collection-card">
              <div className="collection-preview">
                {Array.from({ length: 4 }, (_, i) =>
                  c.preview[i] ? (
                    <Poster key={c.preview[i].id} title={c.preview[i].title} posterUrl={c.preview[i].posterUrl} />
                  ) : (
                    <div key={i} className="collection-preview-empty" />
                  ),
                )}
              </div>
              <div className="card-body">
                <h3 className="card-title">{c.name}</h3>
                <p className="card-meta">{plural(c.itemCount, "title")}</p>
                {c.description && <p className="card-genres collection-desc">{c.description}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function CreateCollectionForm({ onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const collection = await api("/collections", { method: "POST", body: { name, description } });
      onCreated(collection);
      setName("");
      setDescription("");
    } catch (err) {
      setErrors({ ...err.details, form: Object.keys(err.details).length ? "" : err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel create-collection" onSubmit={handleSubmit} noValidate>
      <h2>New collection</h2>
      {errors.form && <p className="alert alert-error">{errors.form}</p>}
      <div className="create-collection-fields">
        <label className="field">
          Name
          <input value={name} maxLength={50} onChange={(e) => setName(e.target.value)} required />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>
        <label className="field">
          <span>
            Description <span className="hint">(optional)</span>
          </span>
          <input value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
          {errors.description && <span className="field-error">{errors.description}</span>}
        </label>
        <button type="submit" className="btn btn-primary" disabled={submitting || !name.trim()}>
          {submitting ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}
