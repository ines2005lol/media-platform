import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="empty">
      <h1>Page not found</h1>
      <p className="muted">The page you are looking for doesn’t exist.</p>
      <Link to="/" className="btn btn-primary">Back to browse</Link>
    </div>
  );
}
