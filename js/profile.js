let currentUser = null;

// This formats amounts as dollars for the profile cards.
const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

// This safely updates a small text label on the profile screen.
function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

// This draws the buyer's holdings and their simple portfolio totals.
function renderBuyer(portfolio) {
  const entries = Object.values(portfolio).filter((holding) => holding.tokens > 0);
  const value = entries.reduce((sum, holding) => sum + holding.tokens * holding.tokenPrice, 0);
  const tokenCount = entries.reduce((sum, holding) => sum + holding.tokens, 0);
  setText("#profile-eyebrow", "Buyer account");
  setText("#profile-title", currentUser.name);
  setText("#profile-subtitle", "Your property ownership, in one considered view.");
  setText("#holdings-eyebrow", "Owned fractions");
  setText("#holdings-title", "Properties I own");
  setText("#holding-count", `${entries.length} asset${entries.length === 1 ? "" : "s"}`);
  document.querySelector("#profile-metrics").innerHTML =
    `<div class="metric-card"><small>Portfolio value</small><strong>${money(value)}</strong><span class="metric-positive">↗ +4.2% this month</span></div><div class="metric-card"><small>Fractions owned</small><strong>${tokenCount.toLocaleString()}</strong><span class="metric-note">Across ${entries.length} assets</span></div><div class="metric-card"><small>Account</small><strong>${escapeHtml(currentUser.role)}</strong><span class="metric-note">Saved to MongoDB</span></div>`;
  document.querySelector("#profile-properties").innerHTML = entries.length
    ? entries.map((holding) => `<article class="profile-property"><div class="profile-property-art">${escapeHtml(holding.title.slice(0, 1))}</div><div><p class="property-location">${escapeHtml(holding.location || "Tokenized property")}</p><h3>${escapeHtml(holding.title)}</h3><p class="muted">${holding.tokens.toLocaleString()} fractions · ${money(holding.tokens * holding.tokenPrice)} current value</p></div><span class="yield-tag">+${holding.projectedYield || 8.2}%</span></article>`).join("")
    : '<p class="empty-state">Buy your first fraction from the marketplace to see it here.</p>';
}

// This draws the seller's listings and their simple sales totals.
function renderSeller(properties) {
  const value = properties.reduce((sum, property) => sum + property.totalValuation, 0);
  const sold = properties.reduce(
    (sum, property) => sum + property.totalTokens - property.availableTokens,
    0,
  );
  setText("#profile-eyebrow", "Seller account");
  setText("#profile-title", currentUser.name);
  setText("#profile-subtitle", "Your listings, performance, and property desk.");
  setText("#holdings-eyebrow", "Property desk");
  setText("#holdings-title", "Properties I listed");
  setText("#holding-count", `${properties.length} listing${properties.length === 1 ? "" : "s"}`);
  document.querySelector("#profile-metrics").innerHTML =
    `<div class="metric-card"><small>Listed valuation</small><strong>${money(value)}</strong><span class="metric-positive">↗ Across all listings</span></div><div class="metric-card"><small>Fractions sold</small><strong>${sold.toLocaleString()}</strong><span class="metric-note">Total across listings</span></div><div class="metric-card"><small>Active listings</small><strong>${properties.length}</strong><span class="metric-note">Visible in marketplace</span></div>`;
  document.querySelector("#profile-properties").innerHTML = properties.length
    ? properties.map((property) => {
      const progress = Math.round(
        ((property.totalTokens - property.availableTokens) / property.totalTokens) * 100,
      );
      return `<article class="profile-property"><div class="profile-property-art"><img src="${escapeHtml(property.imageUrl)}" alt="${escapeHtml(property.title)}"></div><div><p class="property-location">${escapeHtml(property.location || "New listing")}</p><h3>${escapeHtml(property.title)}</h3><p class="muted">${money(property.totalValuation)} valuation · ${progress}% funded</p></div><span class="yield-tag">${escapeHtml(property.category)}</span></article>`;
    }).join("")
    : '<p class="empty-state">Publish a property from your seller dashboard to see it here.</p>';
}

// This gets the account's data and shows the right buyer or seller profile.
async function loadProfile() {
  currentUser = await getCurrentUser();
  if (!currentUser) return;

  const initials = currentUser.name.split(" ")
    .map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const isSeller = currentUser.role === "seller";
  setText("#profile-avatar", initials);
  setText("#profile-mark", initials);
  setText("#profile-account-name", currentUser.name);
  document.querySelector("#profile-avatar").classList.toggle("avatar-green", isSeller);
  document.querySelector("#dashboard-link").href = isSeller ? "seller.html" : "customer.html";
  document.querySelector(".brand").href = isSeller ? "seller.html" : "customer.html";

  if (isSeller) {
    const result = await apiRequest("/api/properties?mine=true");
    renderSeller(result.properties);
  } else {
    const result = await apiRequest("/api/properties/portfolio");
    renderBuyer(result.portfolio);
  }
}

// This ends the server session when the user clicks the logout button.
document.querySelector("#logout").addEventListener("click", signOut);

// This starts the profile and shows the server error instead of hiding it.
loadProfile().catch((error) => {
  setText("#profile-properties", `${error.message} Start MongoDB and the Express server, then refresh.`);
});
