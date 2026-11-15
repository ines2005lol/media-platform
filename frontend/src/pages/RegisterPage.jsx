import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/";

  const [fields, setFields] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={redirectTo} replace />;

  function change(e) {
    setFields({ ...fields, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSubmitting(true);
    try {
      await register(fields);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.details || {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>Create an account</h1>
      <form onSubmit={handleSubmit} noValidate>
        {error && Object.keys(fieldErrors).length === 0 && <p className="alert alert-error">{error}</p>}

        <label className="field">
          Username
          <input name="username" autoComplete="username" value={fields.username} onChange={change} maxLength={30} />
          <small className={fieldErrors.username ? "field-error" : "hint"}>
            {fieldErrors.username || "3–30 characters: letters, numbers or underscores"}
          </small>
        </label>

        <label className="field">
          Email
          <input name="email" type="email" autoComplete="email" value={fields.email} onChange={change} />
          {fieldErrors.email && <small className="field-error">{fieldErrors.email}</small>}
        </label>

        <label className="field">
          Password
          <input name="password" type="password" autoComplete="new-password" value={fields.password} onChange={change} />
          <small className={fieldErrors.password ? "field-error" : "hint"}>
            {fieldErrors.password || "At least 8 characters"}
          </small>
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="muted auth-switch">
        Already have an account? <Link to="/login" state={location.state}>Log in</Link>
      </p>
    </div>
  );
}
