import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Layout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="app">
      <header className="header">
        <div className="container header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">▶</span> Media Discovery
          </Link>
          <nav className="nav">
            <NavLink to="/" end>Browse</NavLink>
            {!loading &&
              (user ? (
                <>
                  <NavLink to="/library">Library</NavLink>
                  <NavLink to="/collections">Collections</NavLink>
                  <span className="nav-user">Hi, {user.username}</span>
                  <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/login">Log in</NavLink>
                  <Link to="/register" className="btn btn-primary">Sign up</Link>
                </>
              ))}
          </nav>
        </div>
      </header>

      <main className="container main">
        <Outlet />
      </main>
    </div>
  );
}
