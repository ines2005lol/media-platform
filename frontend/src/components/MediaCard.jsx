import { Link } from "react-router-dom";
import Poster from "./Poster.jsx";
import { releaseYear, typeLabel } from "../utils/format.js";

export default function MediaCard({ media }) {
  return (
    <Link to={`/media/${media.id}`} className="card">
      <Poster title={media.title} posterUrl={media.posterUrl} />
      <div className="card-body">
        <h3 className="card-title">{media.title}</h3>
        <p className="card-meta">
          <span className={`badge badge-${media.type === "TV_SHOW" ? "tv" : "movie"}`}>
            {typeLabel(media.type)}
          </span>
          <span>{releaseYear(media.releaseDate)}</span>
        </p>
        <p className="card-genres">{media.genres.map((g) => g.name).join(" · ")}</p>
      </div>
    </Link>
  );
}
