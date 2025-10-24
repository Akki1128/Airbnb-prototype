import "./TravelerHome.css";
import { useState } from "react";
import ListingSection from "../components/Listings/ListingSection";

export default function TravelerHome() {
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("");

  // Filters actually sent to the backend (only when user hits Search)
  const [committed, setCommitted] = useState({
    location: undefined,
    startDate: undefined,
    endDate: undefined,
    guests: undefined,
  });

  const submit = () => {
    let start = checkIn || undefined;
    let end = checkOut || undefined;

    if (start && end && new Date(end) < new Date(start)) {
      console.warn("End date must be after start date");
      return;
    }

    setCommitted({
      location: location || undefined,
      startDate: start,
      endDate: end,
      guests: guests || undefined,
    });
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div className="container py-4">
      <div className="shadow-sm border rounded-pill d-flex align-items-center px-3 py-2 search-bar">
        <div className="flex-grow-1 px-3 border-end">
          <label className="search-label">Where</label>
          <input
            type="text"
            className="form-control border-0 p-0 shadow-none search-input"
            placeholder="Search destinations"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>

        <div className="px-3 border-end">
          <label className="search-label">Check in</label>
          <input
            type="date"
            className="form-control border-0 p-0 shadow-none search-input"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>

        <div className="px-3 border-end">
          <label className="search-label">Check out</label>
          <input
            type="date"
            className="form-control border-0 p-0 shadow-none search-input"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>

        <div className="px-3 d-flex align-items-center">
          <div>
            <label className="search-label">Guests</label>
            <input
              type="number"
              min="1"
              className="form-control border-0 p-0 shadow-none search-input"
              placeholder="Add guests"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              onKeyDown={onKeyDown}
            />
          </div>
          <button className="btn-search ms-3" onClick={submit} title="Search">
            <i className="bi bi-search"></i>
          </button>
        </div>
      </div>

      <ListingSection filters={committed} />
    </div>
  );
}
