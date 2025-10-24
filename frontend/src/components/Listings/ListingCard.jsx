import "./ListingCard.css";
import { Link } from "react-router-dom";

export default function ListingCard({ item }) {
  const title = item.title || "Untitled";
  const type = item.type || "";
  const city = item.city || "";
  const address = item.address || "";
  const location = [city, address].filter(Boolean).join(" · ");
  const price = item.price != null ? Number(item.price) : null;
  const beds = item.bedrooms != null ? Number(item.bedrooms) : null;
  const baths = item.bathrooms != null ? Number(item.bathrooms) : null;
  const cap = item.capacity != null ? Number(item.capacity) : null;

  return (
    <Link to={`/properties/${item.id}`} className="text-decoration-none text-reset">
      <div className="card listing-card h-100 shadow-sm">
        <div className="listing-thumb-wrap">
          <div className="listing-thumb placeholder-wave">
            <div className="placeholder w-100 h-100"></div>
          </div>
        </div>

        <div className="card-body">
          <h6 className="card-title mb-1 text-truncate">{title}</h6>
          {type && <div className="text-muted small mb-1 text-truncate">{type}</div>}
          {location && <div className="text-muted small text-truncate">{location}</div>}

          <div className="mt-2 small text-muted">
            {beds != null && <span className="me-2">{beds} bd</span>}
            {baths != null && <span className="me-2">{baths} ba</span>}
            {cap != null && <span className="me-2">{cap} guests</span>}
          </div>

          {price != null && (
            <div className="mt-2">
              <span className="fw-semibold">${price}</span>
              <span className="text-muted"> night</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
