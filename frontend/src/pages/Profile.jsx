import { useEffect, useMemo, useState } from "react";
import { travelerApi } from "../services/api";
import ProfileModal from "../components/Profile/ProfileModal";

export default function Profile() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await travelerApi.me();
      if (typeof data.languages === "string") {
        try { data.languages = JSON.parse(data.languages); } catch { data.languages = []; }
      }
      setMe(data);
    } catch (e) {
      setErr(e.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const isComplete = useMemo(() => {
    if (!me) return false;
    const hasAny =
      !!(me.about && me.about.trim()) ||
      !!(me.city && me.city.trim()) ||
      !!(me.state && me.state.trim()) ||
      !!(me.country && me.country.trim()) ||
      (!!me.languages && me.languages.length > 0) ||
      !!(me.gender && me.gender.trim()) ||
      !!(me.phone && me.phone.trim());
    return hasAny;
  }, [me]);

  function openComplete() { setShowModal(true); }
  function openEdit() { setShowModal(true); }
  function onSaved(updated) { setMe(updated); setShowModal(false); }

  if (loading) return <div className="container py-5">Loading…</div>;
  if (err) return <div className="container py-5 text-danger">{err}</div>;
  if (!me) return null;

  const initial = String(me.name || me.email || "U").trim().charAt(0).toUpperCase();

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">About me</h3>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-3">
          <div className="list-group">
            <div className="list-group-item d-flex align-items-center">
              <div className="rounded-circle bg-dark text-white d-inline-flex align-items-center justify-content-center me-3"
                   style={{ width: 36, height: 36, fontWeight: 600 }}>
                {initial}
              </div>
              <span className="fw-semibold">About me</span>
            </div>

            <button type="button" className="list-group-item list-group-item-action fw-semibold">
              Past trips
            </button>
            <button type="button" className="list-group-item list-group-item-action fw-semibold">
              Connections
            </button>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body d-flex align-items-center flex-column py-4">
              <div
                className="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center"
                style={{ width: 96, height: 96, fontSize: 36, fontWeight: 700 }}
              >
                {initial}
              </div>
              <h4 className="mt-3 mb-1">{me.name || me.email}</h4>
              <div className="text-muted">{/* role placeholder */}Guest</div>
            </div>
          </div>

          {isComplete && (
            <div className="card shadow-sm mt-3 position-relative">
              <button
                className="btn btn-outline-dark btn-sm position-absolute top-0 end-0 m-2"
                onClick={openEdit}
              >
                Edit
              </button>

              <div className="card-body">
                <h6 className="fw-semibold mb-3">Profile information</h6>
                <dl className="row mb-0">
                  <dt className="col-sm-4">Name</dt>
                  <dd className="col-sm-8">{me.name}</dd>

                  <dt className="col-sm-4">Email</dt>
                  <dd className="col-sm-8">{me.email}</dd>

                  {me.phone ? <>
                    <dt className="col-sm-4">Phone</dt>
                    <dd className="col-sm-8">{me.phone}</dd>
                  </> : null}

                  {me.about ? <>
                    <dt className="col-sm-4">About me</dt>
                    <dd className="col-sm-8">{me.about}</dd>
                  </> : null}

                  {(me.city || me.state || me.country) ? <>
                    <dt className="col-sm-4">Location</dt>
                    <dd className="col-sm-8">
                      {[me.city, me.state, me.country].filter(Boolean).join(", ")}
                    </dd>
                  </> : null}

                  {me.languages?.length ? <>
                    <dt className="col-sm-4">Languages</dt>
                    <dd className="col-sm-8">{me.languages.join(", ")}</dd>
                  </> : null}

                  {me.gender ? <>
                    <dt className="col-sm-4">Gender</dt>
                    <dd className="col-sm-8">{me.gender}</dd>
                  </> : null}
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Right: “Complete your profile” card (only if incomplete) */}
        <div className="col-12 col-lg-3">
          {!isComplete && (
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="mb-2">Complete your profile</h5>
                <p className="text-muted small mb-3">
                  Your profile helps hosts and guests know you better. Add your
                  details to get the best experience.
                </p>
                <button className="btn btn-danger w-100" onClick={openComplete}>
                  Get started
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Complete/Edit */}
      {showModal && (
        <ProfileModal
          initial={me}
          onClose={() => setShowModal(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
