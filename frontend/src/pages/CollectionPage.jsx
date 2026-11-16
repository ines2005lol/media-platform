import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import MediaCard from "../components/MediaCard.jsx";
import { plural } from "../utils/format.js";

export default function CollectionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setCollection(null);
    setError(null);
    api(`/collections/${id}`)
      .then((data) => !cancelled && setCollection(data))
      .catch((err) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    const notFound = error.status === 404 || error.status === 400;
    return (
      <div className="empty">
        <h1>{notFound ? "Collection not found" : "Something went wrong"}</h1>
        <p className="muted">{notFound ? "This collection doesn't exist or isn't yours." : error.message}</p>
        <Link to="/collections" className="btn btn-primary">Back to collections</Link>
      </div>
    );
  }

  if (!collection) return <p className="muted">Loading…</p>;

  async function handleDelete() {
    if (!window.confirm(`Delete "${collection.name}"? The titles stay in the catalogue.`)) return;
    try {
      await api(`/collections/${id}`, { method: "DELETE" });
      navigate("/collections", { replace: true });
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function removeItem(mediaId) {
    setActionError("");
    try {
      await api(`/collections/${id}/items/${mediaId}`, { method: "DELETE" });
      setCollection((c) => ({
        ...c,
        itemCount: c.itemCount - 1,
        items: c.items.filter((m) => m.id !== mediaId),
      }));
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <section>
      <Link to="/collections" className="back-link">← All collections</Link>

      {editing ? (
        <EditCollectionForm
          collection={collection}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setCollection((c) => ({ ...c, ...updated }));
            setEditing(false);
          }}
        />
      ) : (
        <div className="page-head collection-head">
          <div>
            <h1>{collection.name}</h1>
            {collection.description && <p className="description">{collection.description}</p>}
            <p className="muted">{plural(collection.itemCount, "title")}</p>
          </div>
          <div className="collection-head-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className="btn btn-ghost btn-danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>
      )}

      {actionError && <p className="alert alert-error">{actionError}</p>}

      {collection.items.length === 0 ? (
        <div className="empty">
          <p>This collection is empty. Open any title and use “Collections” to add it here.</p>
          <Link to="/" className="btn btn-primary">Browse titles</Link>
        </div>
      ) : (
        <div className="grid">
          {collection.items.map((m) => (
            <div key={m.id} className="card-wrap">
              <MediaCard media={m} />
              <button
                type="button"
                className="card-remove"
                aria-label={`Remove ${m.title} from this collection`}
                title="Remove from collection"
                onClick={() => removeItem(m.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function EditCollectionForm({ collection, onCancel, onSaved }) {
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description || "");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const updated = await api(`/collections/${collection.id}`, {
        method: "PATCH",
        body: { name, description },
      });
      onSaved(updated);
    } catch (err) {
      setErrors({ ...err.details, form: Object.keys(err.details).length ? "" : err.message });
      setSubmitting(false);
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit} noValidate>
      <h2>Edit collection</h2>
      {errors.form && <p className="alert alert-error">{errors.form}</p>}
      <label className="field">
        Name
        <input value={name} maxLength={50} onChange={(e) => setName(e.target.value)} required />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>
      <label className="field">
        Description
        <textarea value={description} maxLength={500} rows={3} onChange={(e) => setDescription(e.target.value)} />
        {errors.description && <span className="field-error">{errors.description}</span>}
      </label>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting || !name.trim()}>
          {submitting ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
