import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { travelerApi } from "../services/api";
import "./Login.css";

export default function Login() {
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
      await travelerApi.login({ email, password }); 
      navigate("/"); 
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-header">Log in or sign up</div>

        <h1 className="auth-title">Welcome to Airbnb</h1>

        {err && <div className="alert alert-danger py-2">{err}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold small">Email address</label>
            <input
              type="email"
              className="form-control form-control-lg"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold small">Password</label>
            <input
              type="password"
              className="form-control form-control-lg"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button className="btn btn-danger btn-lg w-100 auth-cta" disabled={loading}>
            {loading ? "Signing in…" : "Continue"}
          </button>
        </form>

        <div className="auth-or">
          <span>or</span>
        </div>

        <div className="d-grid gap-2">
          <button className="btn btn-outline-dark btn-lg" type="button">
            <i className="bi bi-google me-2"></i> Continue with Google
          </button>
          <button className="btn btn-outline-dark btn-lg" type="button">
            <i className="bi bi-apple me-2"></i> Continue with Apple
          </button>
          <button
            className="btn btn-outline-dark btn-lg"
            type="button"
            onClick={() => navigate("/signup")}
          >
            <i className="bi bi-envelope me-2"></i> Create an account
          </button>
        </div>

        <div className="auth-footer mt-3">
          New here? <Link to="/signup">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
