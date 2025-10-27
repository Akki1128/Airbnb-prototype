import os
import math
import random
from datetime import datetime, timedelta, date
from typing import Any, Dict, List, Optional, Tuple

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------- Env ----------
load_dotenv()
AGENT_PORT = int(os.getenv("AGENT_PORT", "8500"))
CORS_ORIGINS = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000").split(",") if o.strip()
]
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "").strip()
LLM_PROVIDER = os.getenv("AGENT_LLM_PROVIDER", "").strip().lower()  

# ---------- FastAPI ----------
app = FastAPI(title="AI Concierge Agent")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Schemas ----------
class Party(BaseModel):
    adults: int = 2
    kids: int = 0
    type: str = "family"  # family | couple | friends | solo

class Booking(BaseModel):
    location: str
    startDate: str
    endDate: str
    party: Optional[Party] = None
    budgetTier: Optional[str] = "moderate"

class Preferences(BaseModel):
    interests: Optional[List[str]] = None
    dietary: Optional[List[str]] = None
    mobility: Optional[str] = None
    notes: Optional[str] = None

class PlanRequest(BaseModel):
    booking: Booking
    preferences: Optional[Preferences] = None
    freeText: Optional[str] = None
    includeWeather: Optional[bool] = True

# ---------- Helpers ----------
def _parse_date(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()

def _daterange_inclusive(a: date, b: date) -> List[date]:
    if b < a:
        a, b = b, a
    days = (b - a).days + 1
    return [a + timedelta(days=i) for i in range(days)]

async def geocode(name: str) -> Optional[Tuple[float, float, str]]:
    """Open-Meteo free geocoder (no API key)."""
    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {"name": name, "count": 1, "language": "en", "format": "json"}
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url, params=params)
        if r.status_code != 200:
            return None
        data = r.json()
    if data.get("results"):
        hit = data["results"][0]
        lat, lon = float(hit["latitude"]), float(hit["longitude"])
        label = hit.get("name")
        admin = hit.get("admin1")
        country = hit.get("country")
        pretty = ", ".join([x for x in [label, admin, country] if x])
        return lat, lon, pretty or name
    return None

async def daily_weather(lat: float, lon: float, start: date, end: date) -> Dict[str, Dict[str, float]]:
    """Open-Meteo daily forecast keyed by YYYY-MM-DD."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
        "timezone": "auto",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        d = r.json()
    out: Dict[str, Dict[str, float]] = {}
    if "daily" not in d:
        return out
    dates = d["daily"]["time"]
    tmax = d["daily"].get("temperature_2m_max", [None] * len(dates))
    tmin = d["daily"].get("temperature_2m_min", [None] * len(dates))
    p_rain = d["daily"].get("precipitation_probability_max", [0] * len(dates))
    wind = d["daily"].get("wind_speed_10m_max", [0] * len(dates))
    for i, ds in enumerate(dates):
        out[ds] = {
            "tmax": float(tmax[i]) if tmax[i] is not None else None,
            "tmin": float(tmin[i]) if tmin[i] is not None else None,
            "precipProb": float(p_rain[i]) if p_rain[i] is not None else 0.0,
            "wind": float(wind[i]) if wind[i] is not None else 0.0,
        }
    return out

def _seeded_rng(*parts: str) -> random.Random:
    seed = abs(hash("||".join(parts))) % (2**32)
    return random.Random(seed)

def _pick(rng: random.Random, options: List[str]) -> str:
    return rng.choice(options) if options else ""

def _price_from_budget(budget: str) -> str:
    mapping = {"budget": "cheap", "moderate": "moderate", "premium": "expensive", "luxury": "expensive"}
    return mapping.get((budget or "moderate").lower(), "moderate")

def _packing_from_weather(daily: Dict[str, Dict[str, float]]) -> List[str]:
    base = ["Comfortable walking shoes", "Water bottle", "Portable phone charger"]
    if not daily:
        return base + ["Sunscreen"]
    rain = any((v.get("precipProb", 0) or 0) >= 50 for v in daily.values())
    hot = any((v.get("tmax", 0) or 0) >= 28 for v in daily.values())
    cold = any((v.get("tmin", 99) or 99) <= 10 for v in daily.values())
    windy = any((v.get("wind", 0) or 0) >= 35 for v in daily.values())
    if rain: base.append("Light rain jacket / umbrella")
    if hot: base += ["Sunscreen", "Sun hat"]
    if cold: base += ["Warm layer"]
    if windy: base += ["Wind-resistant layer"]
    # de-dupe while preserving order
    seen, out = set(), []
    for item in base:
        if item not in seen:
            seen.add(item); out.append(item)
    return out

def _blocks_for_day(rng: random.Random, prefs: Preferences, w: Dict[str, float]) -> Dict[str, str]:
    rainy = (w.get("precipProb", 0) or 0) >= 50
    hot = (w.get("tmax", 0) or 0) >= 28
    cold = (w.get("tmin", 99) or 99) <= 10

    # interests guide some options
    ints = {i.lower() for i in (prefs.interests or [])}

    morning_opts = []
    afternoon_opts = []
    evening_opts = []

    if rainy:
        morning_opts += ["Museum / indoor exhibit", "Science center", "Local market (covered)"]
        afternoon_opts += ["Aquarium visit", "Indoor kids discovery center", "Historic gallery"]
        evening_opts += ["Cozy cafe + board games", "Casual indoor dinner", "Movie night"]
    else:
        morning_opts += ["Promenade/riverfront stroll", "Neighborhood coffee walk", "Short ferry/tram ride"]
        afternoon_opts += ["Local landmark visit", "Botanical garden visit", "Relax in a local park with viewpoints"]
        evening_opts += ["Scenic overlook (no long hike)", "Casual dinner near city center", "Neighborhood food crawl"]

    if hot:
        afternoon_opts += ["Shaded park picnic", "Short museum stop (cool down)"]
        evening_opts += ["Sunset viewpoint", "Gelato + window shopping"]
    if cold:
        morning_opts += ["Art museum", "Cafe crawl"]
        evening_opts += ["Warm pub/restaurant dinner"]

    if "museums" in ints: morning_opts += ["Art museum highlights", "History museum highlights"]
    if "kids" in ints: afternoon_opts += ["Playground stop", "Hands-on kids museum"]
    if "coffee" in ints: morning_opts += ["Specialty coffee crawl"]

    return {
        "morning": _pick(rng, morning_opts),
        "afternoon": _pick(rng, afternoon_opts),
        "evening": _pick(rng, evening_opts),
    }

def _activity_cards(
    rng: random.Random, loc_label: str, coords: Optional[Tuple[float, float]], day: date,
    prefs: Preferences, budget: str
) -> List[Dict[str, Any]]:
    lat, lon = (coords or (None, None))
    kid = (prefs is not None and (prefs.mobility or "") == "stroller-friendly") or False
    price = _price_from_budget(budget)
    interests = {i.lower() for i in (prefs.interests or [])}

    catalog = [
        ("Downtown walk", ["walkable", "scenic"], 90),
        ("Observation deck", ["viewpoint"], 75),
        ("Botanical garden", ["outdoors", "flowers"], 120),
        ("Science center", ["indoor", "interactive"], 120),
        ("Riverfront promenade", ["waterfront", "walkable"], 80),
        ("Neighborhood cafe crawl", ["coffee", "food"], 90),
        ("Short ferry ride", ["family", "waterfront"], 60),
        ("Hands-on kids museum", ["indoor", "kids"], 100),
    ]
    # bias to interests
    if "museums" in interests:
        catalog += [("Art museum highlights", ["indoor", "culture"], 100)]
    if "parks" in interests:
        catalog += [("City park loop", ["outdoors", "greenery"], 90)]

    rng.shuffle(catalog)
    take = min(3, len(catalog))
    picks = catalog[:take]

    out: List[Dict[str, Any]] = []
    for title, tags, dur in picks:
        out.append({
            "title": title,
            "address": loc_label,
            "geo": {"lat": lat, "lon": lon} if lat and lon else None,
            "priceTier": price,
            "durationMins": dur + rng.randint(-10, 20),
            "tags": tags,
            "wheelchairFriendly": True,  # conservative
            "childFriendly": kid or ("kids" in tags),
            "when": day.isoformat(),
        })
    return out

async def _restaurants_via_tavily(location: str, dietary: List[str], budget: str) -> List[Dict[str, Any]]:
    if not TAVILY_API_KEY:
        return []
    query = f"{', '.join(dietary) if dietary else ''} restaurants in {location}".strip()
    if not query:
        query = f"restaurants in {location}"
    payload = {
        "api_key": TAVILY_API_KEY,
        "query": query,
        "search_depth": "basic",
        "max_results": 3,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post("https://api.tavily.com/search", json=payload)
        if r.status_code != 200:
            return []
        data = r.json()
    out = []
    for hit in (data.get("results") or [])[:3]:
        out.append({
            "name": hit.get("title", "Restaurant"),
            "address": location,
            "url": hit.get("url"),
            "dietTags": dietary or [],
            "priceTier": _price_from_budget(budget),
        })
    return out

# ---------- API ----------
@app.get("/health")
def health():
    return {"status": "ok", "service": "AI Concierge Agent", "db": True}

@app.get("/debug/config")
def debug_config():
    return {
        "llm_provider": LLM_PROVIDER or None,
        "tavily_key_present": bool(TAVILY_API_KEY),
        "cors": CORS_ORIGINS,
    }

@app.post("/plan")
async def plan(req: PlanRequest):
    if not (req.booking and req.booking.location and req.booking.startDate and req.booking.endDate):
        raise HTTPException(status_code=422, detail="location/startDate/endDate required")

    party = req.booking.party or Party()
    prefs = req.preferences or Preferences()

    # seed randomness per requested trip so results vary across days but are stable for same inputs
    rng = _seeded_rng(
        req.booking.location,
        req.booking.startDate,
        req.booking.endDate,
        party.type,
        ",".join(sorted(prefs.interests or [])),
        ",".join(sorted(prefs.dietary or [])),
    )

    start_d = _parse_date(req.booking.startDate)
    end_d = _parse_date(req.booking.endDate)
    days = _daterange_inclusive(start_d, end_d)

    # Geocode + Weather
    source_parts = []
    loc_label = req.booking.location
    coords = await geocode(req.booking.location)
    daily = {}
    if coords and req.includeWeather:
        lat, lon, pretty = coords
        loc_label = pretty
        source_parts.append("weather")
        daily = await daily_weather(lat, lon, start_d, end_d)
    else:
        lat = lon = None

    # Build itinerary (weather-aware + randomized)
    itinerary: List[Dict[str, Any]] = []
    activities: List[Dict[str, Any]] = []
    for d in days:
        dstr = d.isoformat()
        w = daily.get(dstr, {})
        blocks = _blocks_for_day(rng, prefs, w)
        itinerary.append({"date": dstr, **blocks})
        activities.extend(_activity_cards(rng, loc_label, (lat, lon) if lat and lon else None, d, prefs, req.booking.budgetTier or "moderate"))

    # Restaurants (Tavily if available)
    restaurants: List[Dict[str, Any]] = []
    if TAVILY_API_KEY:
        source_parts.append("tavily")
        restaurants = await _restaurants_via_tavily(loc_label, prefs.dietary or [], req.booking.budgetTier or "moderate")
    else:
        # simple stub
        restaurants = [
            {"name": "Local Kitchen", "address": loc_label, "dietTags": prefs.dietary or [], "priceTier": _price_from_budget(req.booking.budgetTier or "moderate")},
            {"name": "Garden Table", "address": loc_label, "dietTags": prefs.dietary or [], "priceTier": _price_from_budget(req.booking.budgetTier or "moderate")},
        ]

    # Weather-aware packing
    packing = _packing_from_weather(daily)

    return {
        "meta": {
            "location": loc_label,
            "dates": [d.isoformat() for d in days],
            "party": party.model_dump(),
            "budgetTier": req.booking.budgetTier or "moderate",
            "notes": prefs.notes,
        },
        "itinerary": itinerary,
        "activities": activities,
        "restaurants": restaurants,
        "packingList": packing,
        "source": "+".join(source_parts) if source_parts else "fallback",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=AGENT_PORT, reload=True)
