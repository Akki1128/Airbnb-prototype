import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { travelerApi } from "../services/api";
import "./Login.css"; 

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      await travelerApi.signup({ name: name.trim(), email, password });
      navigate("/login");
    } catch (e) {
      setErr(e.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-header">Create your account</div>
        <h1 className="auth-title">Welcome to Airbnb</h1>

        {err && <div className="alert alert-danger py-2">{err}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold small">Full name</label>
            <input
              className="form-control form-control-lg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="mt-3">
            <label className="form-label fw-semibold small">Email address</label>
            <input
              type="email"
              className="form-control form-control-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="mt-3">
            <label className="form-label fw-semibold small">Password</label>
            <input
              type="password"
              className="form-control form-control-lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              minLength={6}
            />
          </div>

          <button className="btn btn-danger btn-lg w-100 mt-3 auth-cta" disabled={loading}>
            {loading ? "Creating account…" : "Agree and continue"}
          </button>
        </form>

        <div className="auth-or"><span>or</span></div>

        <div className="d-grid gap-2">
          <button
            className="btn btn-outline-dark btn-lg"
            type="button"
            onClick={() => navigate("/login")}
          >
            <i className="bi bi-envelope me-2"></i> Log in
          </button>
        </div>

        <div className="auth-footer mt-3">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
