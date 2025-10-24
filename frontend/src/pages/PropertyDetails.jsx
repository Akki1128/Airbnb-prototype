import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { travelerApi } from "../services/api";
import "./PropertyDetails.css";

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [p, setP] = useState(null);

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);

  const [showAll, setShowAll] = useState(false);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const a = new Date(checkIn);
    const b = new Date(checkOut);
    const diff = (b - a) / (1000 * 60 * 60 * 24);
    return Number.isFinite(diff) && diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const data = await travelerApi.property(Number(id));
        if (!ignore) setP(data);
      } catch (e) {
        if (!ignore) setErr(e.message || "Failed to load property");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [id]);

  async function handleReserve() {
    setErr("");
    try {
      if (!checkIn || !checkOut) {
        setErr("Please select check-in and check-out.");
        return;
      }
      if (new Date(checkOut) <= new Date(checkIn)) {
        setErr("Check-out must be after check-in.");
        return;
      }
      await travelerApi.createBooking({
        propertyId: Number(id),
        startDate: checkIn,
        endDate: checkOut,
        guests: Number(guests) || 1,
      });
      alert("Reservation request submitted!");
    } catch (e) {
      if ((e.message || "").toLowerCase().includes("unauthorized")) {
        navigate("/login", { state: { from: `/property/${id}` } });
        return;
      }
      setErr(e.message || "Failed to reserve");
    }
  }

  
  const photos = (() => {
    const arr = Array.isArray(p?.photos) ? p.photos : [];
    if (arr.length) return arr;
    
    return [
      "https://picsum.photos/1200/800?blur=1",
      "https://picsum.photos/600/400?blur=2",
      "https://picsum.photos/600/401?blur=2",
      "https://picsum.photos/600/402?blur=2",
      "https://picsum.photos/600/403?blur=2",
      "https://picsum.photos/600/404?blur=2",
    ];
  })();

  if (loading) {
    return (
      <div className="container py-4">
        <div className="placeholder-glow">
          <span className="placeholder col-6" style={{ height: 36 }}></span>
        </div>
        <div className="pd-gallery mt-3">
          <div className="pd-hero placeholder-wave"></div>
          <div className="pd-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div className="pd-thumb placeholder-wave" key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (err && !p) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{err}</div>
      </div>
    );
  }

  if (!p) return null;

  
  const priceNum = p.price != null ? Number(p.price) : null;
  const priceLine =
    nights > 0 && priceNum != null
      ? `$${(priceNum * nights).toLocaleString()} for ${nights} night${nights > 1 ? "s" : ""}`
      : priceNum != null
      ? `$${priceNum.toLocaleString()} night`
      : "";

  const todayISO = new Date().toISOString().slice(0, 10);
  const endMin = checkIn || todayISO;

  
  const thumbsCount = Math.min(4, Math.max(0, photos.length - 1));
  const thumbs = photos.slice(1, 1 + thumbsCount);
  const showMoreButton = photos.length >= 5; 
  const primary = photos[0];

  
  const galleryClass = thumbsCount === 0 ? "pd-gallery pd-gallery--single" : "pd-gallery";
  
  const rightGridClass = thumbsCount === 1 ? "pd-grid pd-grid--c1" : "pd-grid pd-grid--c2";

  return (
    <div className="container py-4">
      <h3 className="mb-3">{p.title}</h3>

      
      <div className={galleryClass}>
        <div className="pd-hero">
          <img src={primary} alt="Primary" />
        </div>

        
        {thumbsCount > 0 && (
          <div className={rightGridClass}>
            {thumbs.map((src, i) => {
              const isLastTile = showMoreButton && i === thumbs.length - 1;
              return (
                <div className="pd-thumb" key={i}>
                  <img src={src} alt={`Photo ${i + 2}`} />
                  {isLastTile && (
                    <button
                      type="button"
                      className="pd-showmore-btn btn btn-light"
                      onClick={() => setShowAll(true)}
                    >
                      <i className="bi bi-grid-3x3-gap me-2" />
                      Show all photos
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      
      {showAll && (
        <div className="pd-lightbox" onClick={() => setShowAll(false)}>
          <div className="pd-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-light pd-lightbox-close"
              onClick={() => setShowAll(false)}
            >
              <i className="bi bi-x-lg" />
            </button>
            <div className="pd-lightbox-grid">
              {photos.map((src, i) => (
                <div key={i} className="pd-lightbox-item">
                  <img src={src} alt={`Large ${i + 1}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="row mt-4">
        <div className="col-12 col-lg-7">
          <div className="mb-3 text-muted">
            {p.type && <span className="me-2">{p.type}</span>}
            {p.city && <span className="me-2">· {p.city}</span>}
            {p.address && <span className="me-2">· {p.address}</span>}
          </div>

          <div className="small text-muted">
            {p.bedrooms != null && <span className="me-3">{p.bedrooms} bedroom</span>}
            {p.bathrooms != null && <span className="me-3">{p.bathrooms} bathroom</span>}
            {p.capacity != null && <span className="me-3">{p.capacity} guests</span>}
          </div>

          {p.description && <p className="mt-3">{p.description}</p>}
        </div>

        <div className="col-12 col-lg-5">
          <div className="reserve-card card shadow-sm">
            <div className="card-body">
              {priceLine && (
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="price-pill">
                    <i className="bi bi-tag-fill me-2"></i>
                    {priceLine}
                  </div>
                </div>
              )}

              <div className="row g-0 border rounded-3 overflow-hidden">
                <div className="col-6 p-2 border-end">
                  <div className="reserve-label">CHECK-IN</div>
                  <input
                    type="date"
                    className="reserve-input"
                    min={todayISO}
                    value={checkIn}
                    onChange={(e) => {
                      setCheckIn(e.target.value);
                      if (checkOut && new Date(e.target.value) >= new Date(checkOut)) {
                        setCheckOut("");
                      }
                    }}
                  />
                </div>
                <div className="col-6 p-2">
                  <div className="reserve-label">CHECK-OUT</div>
                  <input
                    type="date"
                    className="reserve-input"
                    min={endMin}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </div>
              </div>

              <div className="border rounded-3 p-2 mt-2">
                <div className="reserve-label">GUESTS</div>
                <select
                  className="reserve-input"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                >
                  {Array.from({ length: Math.max(1, Number(p.capacity || 8)) }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} guest{i + 1 > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <button type="button" className="free-cancel mt-3" disabled>
                Free cancellation
              </button>

              {err && <div className="alert alert-danger mt-3 mb-2">{err}</div>}

              <button className="btn btn-primary w-100 reserve-btn mt-2" onClick={handleReserve}>
                Reserve
              </button>

              <div className="text-center text-muted small mt-2">
                You won’t be charged yet
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
