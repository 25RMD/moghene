export const API_URL = (
  import.meta.env.VITE_API_URL || "https://moghene-backend-production.up.railway.app/api/v1"
).replace(/\/$/, "");
const CLIENT_CACHE_MS = 5 * 60 * 1000;
const requestCache = new Map();

function readSessionCache(key) {
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(key) || "null");
    if (cached && cached.expiresAt > Date.now()) return cached.payload;
  } catch {
    // Ignore unavailable storage.
  }
  return null;
}

function writeSessionCache(key, payload) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ payload, expiresAt: Date.now() + CLIENT_CACHE_MS }));
  } catch {
    // Ignore unavailable storage.
  }
}

async function fetchCachedJson(path, fallbackMessage) {
  const key = `moghene:${API_URL}:${path}`;
  const cached = readSessionCache(key);
  if (cached) return cached;

  if (requestCache.has(key)) return requestCache.get(key);

  const request = fetch(`${API_URL}${path}`, { cache: "default" })
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || fallbackMessage);
      }

      writeSessionCache(key, payload);
      return payload;
    })
    .finally(() => requestCache.delete(key));

  requestCache.set(key, request);
  return request;
}

export async function fetchCatalog() {
  return fetchCachedJson("/catalog", "Unable to load the catalog right now.");
}

async function fetchContent(path) {
  return fetchCachedJson(path, "Unable to load editorial content.");
}

export function fetchLookbook() {
  return fetchContent("/lookbook");
}

export function fetchSchool() {
  return fetchContent("/school");
}
