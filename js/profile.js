const PROPERTY_KEY = "bricklaneProperties";
const userId = localStorage.getItem("bricklaneUserId");
if (!userId) window.location.href = "login.html";
const PORTFOLIO_KEY = `bricklanePortfolio:${userId || "guest"}`;
const role = localStorage.getItem("bricklaneRole") || "investor";
const users = JSON.parse(localStorage.getItem("bricklaneUsers") || "[]");
const demoUsers = { "investor-demo": { name: "Jordan Davis", role: "investor" }, "seller-demo": { name: "Alex Kim", role: "seller" } };
const currentUser = users.find((user) => user.id === userId) || demoUsers[userId] || { name: "Your profile", role };
const initials = currentUser.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
document.querySelector("#profile-avatar").textContent = initials;
document.querySelector("#profile-mark").textContent = initials;
document.querySelector("#profile-account-name").textContent = currentUser.name;
document.querySelector("#profile-avatar").classList.toggle("avatar-green", currentUser.role === "seller");
const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

async function loadProperties() {
  const saved = localStorage.getItem(PROPERTY_KEY);
  if (saved) return JSON.parse(saved);
  const response = await fetch("data/properties.json");
  return response.json();
}
function setText(selector, value) { document.querySelector(selector).textContent = value; }
function renderBuyer(portfolio) {
  const entries = Object.values(portfolio).filter((holding) => holding.tokens > 0);
  const value = entries.reduce((sum, holding) => sum + holding.tokens * holding.tokenPrice, 0);
  setText("#profile-eyebrow", "Buyer account");
  setText("#profile-title", currentUser.name);
  setText("#profile-subtitle", "Your property ownership, in one considered view.");
  setText("#holdings-eyebrow", "Owned fractions");
  setText("#holdings-title", "Properties I own");
  setText("#holding-count", `${entries.length} asset${entries.length === 1 ? "" : "s"}`);
  document.querySelector("#profile-metrics").innerHTML = `<div class="metric-card"><small>Portfolio value</small><strong>${money(value)}</strong><span class="metric-positive">↗ +4.2% this month</span></div><div class="metric-card"><small>Fractions owned</small><strong>${entries.reduce((sum, holding) => sum + holding.tokens, 0).toLocaleString()}</strong><span class="metric-note">Across ${entries.length} assets</span></div><div class="metric-card"><small>Account balance</small><strong>$12,500</strong><span class="metric-note">Demo wallet balance</span></div>`;
  document.querySelector("#profile-properties").innerHTML = entries.length ? entries.map((holding) => `<article class="profile-property"><div class="profile-property-art">${holding.title.slice(0, 1)}</div><div><p class="property-location">${holding.location || "Tokenized property"}</p><h3>${holding.title}</h3><p class="muted">${holding.tokens.toLocaleString()} fractions · ${money(holding.tokens * holding.tokenPrice)} current value</p></div><span class="yield-tag">+${holding.projectedYield || 8.2}%</span></article>`).join("") : '<p class="empty-state">Buy your first fraction from the marketplace to see it here.</p>';
}
function renderSeller(properties) {
  const listings = properties.filter((property) => property.sellerId === userId);
  const value = listings.reduce((sum, property) => sum + property.totalValuation, 0);
  setText("#profile-eyebrow", "Seller account");
  setText("#profile-title", currentUser.name);
  setText("#profile-subtitle", "Your listings, performance, and property desk.");
  setText("#holdings-eyebrow", "Property desk");
  setText("#holdings-title", "Properties I listed");
  setText("#holding-count", `${listings.length} listing${listings.length === 1 ? "" : "s"}`);
  document.querySelector("#profile-metrics").innerHTML = `<div class="metric-card"><small>Listed valuation</small><strong>${money(value)}</strong><span class="metric-positive">↗ Across all listings</span></div><div class="metric-card"><small>Fractions sold</small><strong>${listings.reduce((sum, property) => sum + property.totalTokens - property.availableTokens, 0).toLocaleString()}</strong><span class="metric-note">Total across listings</span></div><div class="metric-card"><small>Active listings</small><strong>${listings.length}</strong><span class="metric-note">Visible in marketplace</span></div>`;
  document.querySelector("#profile-properties").innerHTML = listings.length ? listings.map((property) => { const sold = property.totalTokens - property.availableTokens; const progress = Math.round((sold / property.totalTokens) * 100); return `<article class="profile-property"><div class="profile-property-art"><img src="${property.imageUrl}" alt="${property.title}"></div><div><p class="property-location">${property.location || "New listing"}</p><h3>${property.title}</h3><p class="muted">${money(property.totalValuation)} valuation · ${progress}% funded</p></div><span class="yield-tag">${property.category}</span></article>`; }).join("") : '<p class="empty-state">Publish a property from your seller dashboard to see it here.</p>';
}
loadProperties().then((properties) => {
  const isSeller = role === "seller";
  setText("#profile-avatar", initials);
  setText("#profile-mark", initials);
  setText("#profile-account-name", currentUser.name);
  document.querySelector("#profile-avatar").classList.toggle("avatar-green", isSeller);
  document.querySelector("#dashboard-link").href = isSeller ? "seller.html" : "customer.html";
  document.querySelector(".brand").href = isSeller ? "seller.html" : "customer.html";
  if (isSeller) renderSeller(properties); else renderBuyer(JSON.parse(localStorage.getItem(PORTFOLIO_KEY) || (userId === "investor-demo" ? localStorage.getItem("bricklanePortfolio") : null) || "{}"));
}).catch(() => setText("#profile-properties", "Start the app through a local server to load your profile."));
document.querySelector("#logout").addEventListener("click", () => { localStorage.removeItem("bricklaneRole"); localStorage.removeItem("bricklaneUserId"); window.location.href = "index.html"; });
