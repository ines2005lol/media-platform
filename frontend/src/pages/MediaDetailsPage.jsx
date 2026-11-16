import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Poster from "../components/Poster.jsx";
import MediaActions from "../components/MediaActions.jsx";
import { formatDate, formatDuration, plural, releaseYear, typeLabel } from "../utils/format.js";

export default function MediaDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [media, setMedia] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return; // wait so signed-in users get their own state
    let cancelled = false;
    setMedia(null);
    setError(null);
    api(`/media/${id}`)
      .then((data) => !cancelled && setMedia(data))
      .catch((err) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, [id, user, authLoading]);

  if (error) {
    const notFound = error.status === 404 || error.status === 400;
    return (
      <div className="empty">
        <h1>{notFound ? "Title not found" : "Something went wrong"}</h1>
        <p className="muted">{notFound ? "This title doesn't exist or was removed." : error.message}</p>
        <Link to="/" className="btn btn-primary">Back to browse</Link>
      </div>
    );
  }

  if (!media) return <p className="muted">Loading…</p>;

  return (
    <article className="details">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="details-layout">
        <Poster title={media.title} posterUrl={media.posterUrl} size="large" />

        <div className="details-info">
          <h1>{media.title}</h1>
          <p className="card-meta">
            <span className={`badge badge-${media.type === "TV_SHOW" ? "tv" : "movie"}`}>
              {typeLabel(media.type)}
            </span>
            <span>{releaseYear(media.releaseDate)}</span>
          </p>

          <div className="chips">
            {media.genres.map((g) => (
              <Link key={g.id} to={`/?genre=${g.id}`} className="chip">
                {g.name}
              </Link>
            ))}
          </div>

          <MediaActions mediaId={media.id} viewer={media.viewer} />

          {media.description && <p className="description">{media.description}</p>}

          <dl className="facts">
            <div>
              <dt>{media.type === "TV_SHOW" ? "First aired" : "Released"}</dt>
              <dd>{formatDate(media.releaseDate)}</dd>
            </div>
            {media.movieDetails && (
              <div>
                <dt>Runtime</dt>
                <dd>{formatDuration(media.movieDetails.duration)}</dd>
              </div>
            )}
            {media.tvShowDetails && (
              <>
                <div>
                  <dt>Seasons</dt>
                  <dd>{plural(media.tvShowDetails.numberOfSeasons, "season")}</dd>
                </div>
                <div>
                  <dt>Episodes</dt>
                  <dd>{plural(media.tvShowDetails.numberOfEpisodes, "episode")}</dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </div>
    </article>
  );
}
