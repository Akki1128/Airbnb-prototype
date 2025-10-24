import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import HostModal from "./HostModal";
import "./Navbar.css";
import { travelerApi } from "../services/api";

export default function Navbar() {
  const [showMenu, setShowMenu] = useState(false);
  const [showHost, setShowHost] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(null); // NEW: keep user for initial
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // UPDATED: capture user details (for avatar initial)
  async function checkSession() {
    try {
      const me = await travelerApi.me();
      setAuthed(true);
      setUser(me || null);
    } catch {
      setAuthed(false);
      setUser(null);
    }
  }

  useEffect(() => {
    checkSession();
  }, [location.pathname]);

  function toggleMenu() {
    const next = !showMenu;
    setShowMenu(next);
    if (next) checkSession();
  }

  async function handleLogout() {
    try {
      await travelerApi.logout();
    } catch (_) {}
    setAuthed(false);
    setUser(null);
    setShowMenu(false);
    navigate("/");
  }

  // derive initial for avatar
  const initial =
    ((user?.name || user?.email || "").trim()[0] || "").toUpperCase() || "U";

  return (
    <>
      <header className="border-bottom bg-white">
        <div className="container py-3 nav-grid">
          <div className="nav-left">
            <NavLink to="/" className="text-decoration-none align-self-center">
              <span className="fw-bold fs-4 text-danger">airbnb</span>
            </NavLink>
          </div>

          <nav className="nav-center">
            <NavItem to="/" exact icon="bi-house-door-fill" label="Homes" />
            <NavItem to="/experiences" icon="bi-balloon-heart-fill" label="Experiences" />
            <NavItem to="/services" icon="bi-bell-fill" label="Services" />
          </nav>

          <div className="nav-right">
            <button
              className="btn btn-link text-decoration-none text-dark fw-semibold px-3 nav-host"
              onClick={() => setShowHost(true)}
            >
              Become a host
            </button>

            {/* REPLACED: globe -> avatar when authed */}
            {authed ? (
              <button
                className="btn border circle-btn nav-avatar"
                title="Profile"
                onClick={() => navigate("/profile")}
              >
                <span>{initial}</span>
              </button>
            ) : (
              <button className="btn btn-light border circle-btn nav-icon" title="Language">
                <i className="bi bi-globe"></i>
              </button>
            )}

            <div className="position-relative" ref={menuRef}>
              <button
                className="btn btn-light border rounded-pill d-flex align-items-center gap-2 px-3 nav-menu"
                onClick={toggleMenu}
                aria-expanded={showMenu}
                aria-haspopup="true"
              >
                <i className="bi bi-list"></i>
              </button>

              <div
                className={`dropdown-menu dropdown-menu-end shadow ${showMenu ? "show" : ""}`}
                style={{ right: 0, left: "auto" }}
              >
                {!authed && (
                  <>
                    <button className="dropdown-item" onClick={() => setShowHost(true)}>
                      Become a host
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowMenu(false);
                        navigate("/login");
                      }}
                    >
                      Log in or Sign up
                    </button>
                    <div className="dropdown-divider"></div>
                    <a className="dropdown-item" href="#help">Help Center</a>
                  </>
                )}

                {authed && (
                  <>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowMenu(false);
                        navigate("/wishlists");
                      }}
                    >
                      Wishlists
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowMenu(false);
                        navigate("/profile");
                      }}
                    >
                      Profile
                    </button>
                    <a className="dropdown-item" href="#help">Help Center</a>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item text-danger" onClick={handleLogout}>
                      Log out
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {showHost && <HostModal onClose={() => setShowHost(false)} />}
    </>
  );
}

function NavItem({ to, label, icon, exact }) {
  return (
    <NavLink
      to={to}
      end={exact ?? false}
      className={({ isActive }) =>
        "nav-cat-link d-flex flex-column align-items-center text-center pb-2" +
        (isActive ? " active" : "")
      }
    >
      <i className={`bi ${icon} nav-cat-icon`}></i>
      <span className="fw-semibold small">{label}</span>
    </NavLink>
  );
}
