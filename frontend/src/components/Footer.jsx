import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();

  const LinkBtn = ({ children, onClick }) => (
    <li className="mb-1">
      <button
        type="button"
        className="footer-link"
        onClick={onClick}
        aria-label={typeof children === "string" ? children : undefined}
      >
        {children}
      </button>
    </li>
  );

  return (
    <footer className="border-top mt-5 py-4">
      <div className="container">
        <div className="row gy-3">
          <div className="col-12 col-md-4">
            <h6 className="text-muted mb-3">Support</h6>
            <ul className="list-unstyled small mb-0">
              <LinkBtn>Help Center</LinkBtn>
              <LinkBtn>Get help with a safety issue</LinkBtn>
              <LinkBtn>AirCover</LinkBtn>
              <LinkBtn>Anti-discrimination</LinkBtn>
              <LinkBtn>Disability support</LinkBtn>
              <LinkBtn>Cancellation options</LinkBtn>
              <LinkBtn>Report neighborhood concern</LinkBtn>
            </ul>
          </div>

          <div className="col-12 col-md-4">
            <h6 className="text-muted mb-3">Hosting</h6>
            <ul className="list-unstyled small mb-0">
              <LinkBtn>Airbnb your home</LinkBtn>
              <LinkBtn>Airbnb your experience</LinkBtn>
              <LinkBtn>Airbnb your service</LinkBtn>
              <LinkBtn>AirCover for Hosts</LinkBtn>
              <LinkBtn>Hosting resources</LinkBtn>
              <LinkBtn>Community forum</LinkBtn>
              <LinkBtn>Hosting responsibly</LinkBtn>
              <LinkBtn>Airbnb-friendly apartments</LinkBtn>
              <LinkBtn>Join a free Hosting class</LinkBtn>
              <LinkBtn>Find a co-host</LinkBtn>
            </ul>
          </div>

          <div className="col-12 col-md-4">
            <h6 className="text-muted mb-3">Airbnb</h6>
            <ul className="list-unstyled small mb-0">
              <LinkBtn>2025 Summer Release</LinkBtn>
              <LinkBtn>Newsroom</LinkBtn>
              <LinkBtn>Careers</LinkBtn>
              <LinkBtn>Investors</LinkBtn>
              <LinkBtn>Gift cards</LinkBtn>
              <LinkBtn>Airbnb.org emergency stays</LinkBtn>
            </ul>
          </div>
        </div>

        <div className="d-flex flex-wrap justify-content-between align-items-center pt-3 mt-3 border-top small text-muted">
          <div>© {year} Airbnb, Inc · Terms · Sitemap · Privacy · Your Privacy Choices</div>

          <div className="d-flex align-items-center gap-3 mt-2 mt-md-0">
            <button type="button" className="footer-link">
              <i className="bi bi-globe me-1" /> English (US)
            </button>
            <button type="button" className="footer-link">
              <i className="bi bi-currency-dollar me-1" /> USD
            </button>
            <span className="d-flex align-items-center gap-3">
              <button type="button" className="footer-link" aria-label="Facebook">
                <i className="bi bi-facebook" />
              </button>
              <button type="button" className="footer-link" aria-label="X/Twitter">
                <i className="bi bi-x" />
              </button>
              <button type="button" className="footer-link" aria-label="Instagram">
                <i className="bi bi-instagram" />
              </button>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
