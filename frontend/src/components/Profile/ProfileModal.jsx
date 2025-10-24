import { useEffect, useState } from "react";
import { travelerApi } from "../../services/api";
import "./ProfileModal.css"; // <-- new stylesheet

const countries = [
  "United States", "Canada", "India", "United Kingdom", "Australia",
  "Germany", "France", "Singapore", "Japan", "Mexico"
];

const genders = ["Female", "Male", "Non-binary", "Prefer not to say"];

export default function ProfileModal({ initial, onClose, onSaved }) {
  const [name, setName] = useState(initial?.name || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [about, setAbout] = useState(initial?.about || "");
  const [city, setCity] = useState(initial?.city || "");
  const [state, setState] = useState(initial?.state || "");
  const [country, setCountry] = useState(initial?.country || "");
  const [gender, setGender] = useState(initial?.gender || "");
  const [avatarFile, setAvatarFile] = useState(null);

  const initialLangs = Array.isArray(initial?.languages) ? initial.languages
    : typeof initial?.languages === "string" ? safeParseArray(initial.languages)
    : [];
  const [languagesRaw, setLanguagesRaw] = useState(initialLangs.join(", "));

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onStateChange(v) {
    setState(v.toUpperCase().slice(0, 2));
  }

  function parseLanguages(str) {
    return (str || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }

  async function handleSave() {
    setErr("");
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        about: about.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        languages: parseLanguages(languagesRaw),
        gender,
      };

      await travelerApi.updateMe(payload);

      if (avatarFile) {
        await travelerApi.uploadAvatar(avatarFile);
      }

      const fresh = await travelerApi.me();
      if (typeof fresh.languages === "string") {
        try { fresh.languages = JSON.parse(fresh.languages); } catch { fresh.languages = []; }
      }
      onSaved(fresh);
    } catch (e) {
      setErr(e.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div
        className="profile-modal-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
          <h5 className="mb-0">Profile details</h5>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>

        <div className="p-3">
          {err && <div className="alert alert-danger">{err}</div>}

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Name</label>
              <input className="form-control" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="col-md-6">
              <label className="form-label">Phone</label>
              <input className="form-control" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <div className="col-12">
              <label className="form-label">About me</label>
              <textarea rows={3} className="form-control" value={about} onChange={e => setAbout(e.target.value)} />
            </div>

            <div className="col-md-5">
              <label className="form-label">City</label>
              <input className="form-control" value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">State (2-letter)</label>
              <input className="form-control text-uppercase" value={state} onChange={e => onStateChange(e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Country</label>
              <select className="form-select" value={country} onChange={e => setCountry(e.target.value)}>
                <option value="">Select a country…</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="col-md-8">
              <label className="form-label">Languages (comma separated)</label>
              <input
                className="form-control"
                value={languagesRaw}
                onChange={(e) => setLanguagesRaw(e.target.value)}
                onBlur={(e) => setLanguagesRaw(parseLanguages(e.target.value).join(", "))}
                placeholder="English, Spanish"
              />
              <div className="form-text">Example: English, Spanish, Hindi</div>
            </div>

            <div className="col-md-4">
              <label className="form-label">Gender</label>
              <select className="form-select" value={gender} onChange={e => setGender(e.target.value)}>
                <option value="">Select…</option>
                {genders.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="col-md-12">
              <label className="form-label">Profile picture</label>
              <input
                type="file"
                accept="image/*"
                className="form-control"
                onChange={e => setAvatarFile(e.target.files?.[0] || null)}
              />
              <div className="form-text">Optional — uploaded after saving.</div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 p-3 border-top">
          <button className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-danger" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function safeParseArray(maybeJson) {
  try {
    const v = JSON.parse(maybeJson);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
