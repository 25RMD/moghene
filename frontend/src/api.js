export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1").replace(/\/$/, "");

export async function fetchCatalog() {
  const response = await fetch(`${API_URL}/catalog`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Unable to load the catalog right now.");
  }

  return payload;
}

async function fetchContent(path) {
  const response = await fetch(`${API_URL}${path}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Unable to load editorial content.");
  return payload;
}

export function fetchLookbook() {
  return fetchContent("/lookbook");
}

export function fetchSchool() {
  return fetchContent("/school");
}
