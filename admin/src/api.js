export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1").replace(/\/$/, "");
const TOKEN_KEY = "moghene_admin_token";

export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || "Request failed.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  return parseResponse(response);
}

export async function login(email, password) {
  const payload = await apiRequest("/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (payload.token) {
    setToken(payload.token);
  }

  return payload;
}

export function logout() {
  clearToken();
}

export function getCurrentAdmin() {
  return apiRequest("/admin/me");
}

export function listItems() {
  return apiRequest("/admin/items");
}

export function listCategories() {
  return apiRequest("/admin/categories");
}

export function getLookbook() {
  return apiRequest("/admin/lookbook");
}

export function updateLookbook(lookbook) {
  return apiRequest("/admin/lookbook", { method: "PUT", body: JSON.stringify(lookbook) });
}

export function getSchool() {
  return apiRequest("/admin/school");
}

export function updateSchool(school) {
  return apiRequest("/admin/school", { method: "PUT", body: JSON.stringify(school) });
}

export function createCategory(category) {
  return apiRequest("/admin/categories", {
    method: "POST",
    body: JSON.stringify(category),
  });
}

export function updateCategory(id, category) {
  return apiRequest(`/admin/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(category),
  });
}

export function deleteCategory(id) {
  return apiRequest(`/admin/categories/${id}`, {
    method: "DELETE",
  });
}

export function createItem(item) {
  return apiRequest("/admin/items", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export function updateItem(id, item) {
  return apiRequest(`/admin/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(item),
  });
}

export function deleteItem(id) {
  return apiRequest(`/admin/items/${id}`, {
    method: "DELETE",
  });
}
