const TOKEN_KEY = "brickvestAccessToken";

// This calls our Express API and adds the saved JWT when the user has one.
async function apiRequest(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = sessionStorage.getItem(TOKEN_KEY);

  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  const result = response.headers.get("content-type")?.includes("application/json")
    ? await response.json()
    : {};

  if (!response.ok) {
    const error = new Error(result.message || "The request could not be completed.");
    error.status = response.status;
    throw error;
  }

  return result;
}

// This safely displays user-supplied text inside our HTML templates.
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

// This checks who is signed in and sends expired sessions back to login.
async function getCurrentUser() {
  try {
    const result = await apiRequest("/api/auth/me");
    return result.user;
  } catch (error) {
    if (error.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      window.location.href = "login.html";
      return null;
    }
    throw error;
  }
}

// This tells the server to log out, then clears the browser's JWT either way.
async function signOut() {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch (error) {
    console.error("Could not end the server session:", error);
  } finally {
    sessionStorage.removeItem(TOKEN_KEY);
    window.location.href = "index.html";
  }
}
