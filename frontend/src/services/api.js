const TRAVELER_API = process.env.REACT_APP_TRAVELER_API;
const OWNER_API = process.env.REACT_APP_OWNER_API;

async function request(base, path, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    method: opts.method || "GET",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: opts.body,
    credentials: "include",
  });
  const ct = res.headers.get("content-type") || "";
  const isJSON = ct.includes("application/json");
  const data = isJSON ? await res.json().catch(() => null) : await res.text().catch(() => "");
  if (!res.ok) {
    const msg = (isJSON && data && (data.error || data.message)) || res.statusText || "Request failed";
    throw new Error(msg);
  }
  return data;
}

export const travelerApi = {
  signup: (body) => request(TRAVELER_API, "/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login:  (body) => request(TRAVELER_API, "/api/auth/login",  { method: "POST", body: JSON.stringify(body) }),
  logout: ()      => request(TRAVELER_API, "/api/auth/logout", { method: "POST" }),

  me:       ()     => request(TRAVELER_API, "/api/users/me"),
  updateMe: (body) => request(TRAVELER_API, "/api/users/me", { method: "PUT", body: JSON.stringify(body) }),

  uploadAvatar: async (file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${TRAVELER_API}/api/users/me/avatar`, {
      method: "POST",
      body: form,
      credentials: "include",
    });
    const ct = res.headers.get("content-type") || "";
    const isJSON = ct.includes("application/json");
    const data = isJSON ? await res.json().catch(() => null) : await res.text().catch(() => "");
    if (!res.ok) {
      const msg = (isJSON && data && (data.error || data.message)) || res.statusText || "Upload failed";
      throw new Error(msg);
    }
    return data;
  },

  listings: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(TRAVELER_API, `/api/properties${qs ? `?${qs}` : ""}`);
  },

  property:    (id) => request(TRAVELER_API, `/api/properties/${id}`),
  getProperty: (id) => request(TRAVELER_API, `/api/properties/${id}`), 
};

export const ownerApi = {
};
