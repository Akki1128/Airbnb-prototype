import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import HostModal from "./HostModal";
import "./Navbar.css";
import { travelerApi, ownerApi } from "../services/api";

const HOST_INTENT_KEY = "host_intent";

export default function Navbar() {
  const [showMenu, setShowMenu] = useState(false);
  const [showHost, setShowHost] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

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

  const initial =
    ((user?.name || user?.email || "").trim()[0] || "").toUpperCase() || "U";
  const inHostArea = location.pathname.startsWith("/owner");

  const hostUIMode = inHostArea || !!location.state?.hostMode;

  async function ensureOwnerSession() {
    const { token } = await travelerApi.sessionToken();
    await ownerApi.exchange(token);
  }

  async function confirmOwnerReady() {
    try {
      await ownerApi.dashboard();
    } catch {
      await new Promise((r) => setTimeout(r, 150));
      await ownerApi.dashboard();
    }
  }

  async function onHostCtaClick() {
    // Not logged in → remember intent and go to login
    if (!authed) {
      localStorage.setItem(HOST_INTENT_KEY, "1");
      navigate("/login");
      return;
    }

    // Already in host area → switch back to traveler view
    if (inHostArea) {
      navigate("/");
      return;
    }

    // Traveler view → enable host + go to /owner
    try {
      await ensureOwnerSession();
      await ownerApi.enableHost();
      await confirmOwnerReady();
      navigate("/owner");
    } catch {
      localStorage.setItem(HOST_INTENT_KEY, "1");
      navigate("/login");
    }
  }

  const hostCtaLabel = !authed
    ? "Become a host"
    : inHostArea
    ? "Switch to traveler"
    : "Become a host";

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
            <NavItem
              to="/experiences"
              icon="bi-balloon-heart-fill"
              label="Experiences"
            />
            <NavItem to="/services" icon="bi-bell-fill" label="Services" />
          </nav>

          <div className="nav-right">
            <button
              className="btn btn-link text-decoration-none text-dark fw-semibold px-3 nav-host"
              onClick={onHostCtaClick}
            >
              {hostCtaLabel}
            </button>

            {authed ? (
              <button
                className="btn border circle-btn nav-avatar"
                title="Profile"
                onClick={() =>
                  navigate("/profile", {
                    state: inHostArea ? { hostMode: true } : undefined,
                  })
                }
              >
                <span>{initial}</span>
              </button>
            ) : (
              <button
                className="btn btn-light border circle-btn nav-icon"
                title="Language"
              >
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
                className={`dropdown-menu dropdown-menu-end shadow ${
                  showMenu ? "show" : ""
                }`}
                style={{ right: 0, left: "auto" }}
              >
                {!authed && (
                  <>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowMenu(false);
                        localStorage.setItem(HOST_INTENT_KEY, "1");
                        navigate("/login");
                      }}
                    >
                      Become a host
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowMenu(false);
                        // 🔑 Ensure a pure login does NOT carry any stale host intent
                        localStorage.removeItem(HOST_INTENT_KEY);
                        navigate("/login");
                      }}
                    >
                      Log in or Sign up
                    </button>
                    <div className="dropdown-divider"></div>
                    <a className="dropdown-item" href="#help">
                      Help Center
                    </a>
                  </>
                )}

                {authed && (
                  <>
                    {!hostUIMode && (
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setShowMenu(false);
                          navigate("/wishlists");
                        }}
                      >
                        Wishlists
                      </button>
                    )}
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowMenu(false);
                        navigate("/profile", {
                          state: inHostArea ? { hostMode: true } : undefined,
                        });
                      }}
                    >
                      Profile
                    </button>
                    <a className="dropdown-item" href="#help">
                      Help Center
                    </a>
                    <div className="dropdown-divider"></div>
                    <button
                      className="dropdown-item text-danger"
                      onClick={handleLogout}
                    >
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
