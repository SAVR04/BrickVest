let properties = [];
let currentUser = null;
let portfolio = {};
let selectedProperty = null;
let activeFilter = "all";

// This formats prices the same way across the buyer dashboard.
const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

// This loads the marketplace, the buyer's holdings, and the account details.
async function loadDashboard() {
  currentUser = await getCurrentUser();
  if (!currentUser) return;
  if (currentUser.role !== "investor") {
    window.location.href = "seller.html";
    return;
  }

  const [propertyResult, portfolioResult] = await Promise.all([
    apiRequest("/api/properties"),
    apiRequest("/api/properties/portfolio"),
  ]);
  properties = propertyResult.properties;
  portfolio = portfolioResult.portfolio;
  document.querySelector(".account-name").textContent = currentUser.name;
  document.querySelector(".avatar").textContent = currentUser.name
    .split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  document.querySelector(".dashboard-intro h1").textContent =
    `Good morning, ${currentUser.name.split(" ")[0]}.`;
  renderMarketplace();
  renderPortfolio();
}

// This builds a safe marketplace card for one property.
function cardTemplate(property) {
  const sold = property.totalTokens - property.availableTokens;
  const progress = Math.round((sold / property.totalTokens) * 100);
  return `<article class="property-card"><div class="property-image"><img src="${escapeHtml(property.imageUrl)}" alt="${escapeHtml(property.title)}"><span class="category-tag">${escapeHtml(property.category)}</span><span class="yield-tag">${property.projectedYield || 8.2}% yield</span></div><div class="property-card-body"><div class="property-location">${escapeHtml(property.location || "Global asset")}</div><h3>${escapeHtml(property.title)}</h3><p>${escapeHtml(property.description)}</p><div class="property-price"><span>1 fraction</span><strong>${money(property.tokenPrice)}</strong></div><div class="progress-track"><i style="width:${progress}%"></i></div><div class="property-meta"><span>${property.availableTokens.toLocaleString()} available</span><button class="button button-small button-dark" data-buy="${escapeHtml(property.id)}">Buy fractions <span>↗</span></button></div></div></article>`;
}

// This shows all properties or only the category the buyer picked.
function renderMarketplace() {
  const visible = activeFilter === "all"
    ? properties
    : properties.filter((property) => property.category === activeFilter);
  document.querySelector("#marketplace-grid").innerHTML = visible.length
    ? visible.map(cardTemplate).join("")
    : '<p class="empty-state">No properties match this filter.</p>';

  document.querySelectorAll("[data-buy]").forEach((button) => {
    button.addEventListener("click", () => openBuyModal(button.dataset.buy));
  });
}

// This refreshes the buyer's totals and the portfolio table.
function renderPortfolio() {
  const entries = Object.entries(portfolio).filter(([, holding]) => holding.tokens > 0);
  const value = entries.reduce((sum, [, holding]) => sum + holding.tokens * holding.tokenPrice, 0);
  const tokenCount = entries.reduce((sum, [, holding]) => sum + holding.tokens, 0);

  document.querySelector("#portfolio-metrics").innerHTML =
    `<div class="metric-card"><span class="metric-icon mint">◈</span><small>Total portfolio value</small><strong>${money(value)}</strong><span class="metric-positive">↗ +4.2% this month</span></div><div class="metric-card"><span class="metric-icon orange">↗</span><small>Total invested</small><strong>${money(value)}</strong><span class="metric-note">Across ${entries.length} assets</span></div><div class="metric-card"><span class="metric-icon blue">⌁</span><small>Fractions owned</small><strong>${tokenCount.toLocaleString()}</strong><span class="metric-note">Saved to your account</span></div>`;
  document.querySelector("#portfolio-count").textContent =
    `${entries.length} asset${entries.length === 1 ? "" : "s"}`;
  document.querySelector("#portfolio-list").innerHTML = entries.length
    ? `<div class="portfolio-head"><span>Asset</span><span>Tokens owned</span><span>Current value</span><span></span></div>${entries.map(([id, holding]) => `<div class="portfolio-row"><div class="portfolio-asset"><span class="mini-property">${escapeHtml(holding.title.slice(0, 1))}</span><span><strong>${escapeHtml(holding.title)}</strong><small>${escapeHtml(holding.location || "Tokenized property")}</small></span></div><span>${holding.tokens.toLocaleString()}</span><strong>${money(holding.tokens * holding.tokenPrice)}</strong><span class="gain">+${holding.projectedYield || 8.2}%</span></div>`).join("")}`
    : '<div class="empty-state">Your first property is waiting above.</div>';
}

// This opens the buy dialog with the selected property's price and token limit.
function openBuyModal(id) {
  selectedProperty = properties.find((property) => property.id === id);
  if (!selectedProperty) return;
  document.querySelector("#buy-title").textContent = selectedProperty.title;
  document.querySelector("#buy-price").textContent =
    `${money(selectedProperty.tokenPrice)} per token · ${selectedProperty.availableTokens.toLocaleString()} available`;
  const input = document.querySelector("#token-amount");
  input.value = 1;
  input.max = selectedProperty.availableTokens;
  document.querySelector("#buy-total").textContent = money(selectedProperty.tokenPrice);
  document.querySelector("#buy-modal").classList.add("open");
  input.focus();
}

// This closes any open dialog on the page.
function closeModals() {
  document.querySelectorAll(".modal-backdrop").forEach((modal) => modal.classList.remove("open"));
}

// This briefly shows a status message after a buyer action.
function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

// This records the purchase on the server and redraws with fresh MongoDB data.
document.querySelector("#buy-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const amount = Number(document.querySelector("#token-amount").value);
  if (!selectedProperty || !Number.isInteger(amount) || amount < 1 ||
      amount > selectedProperty.availableTokens) {
    showToast("Choose a whole number of tokens that are still available.");
    return;
  }

  try {
    await apiRequest(`/api/properties/${encodeURIComponent(selectedProperty.id)}/purchase`, {
      method: "POST",
      body: JSON.stringify({ tokens: amount }),
    });
    closeModals();
    await loadDashboard();
    showToast(`${amount.toLocaleString()} fraction${amount === 1 ? "" : "s"} added to your portfolio.`);
  } catch (error) {
    showToast(error.message);
  }
});

// This updates the estimated total as the token amount changes.
document.querySelector("#token-amount").addEventListener("input", (event) => {
  document.querySelector("#buy-total").textContent = money(
    (Number(event.target.value) || 0) * (selectedProperty?.tokenPrice || 0),
  );
});

// This closes the dialog from its close buttons and shaded background.
document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", closeModals);
});
document.querySelectorAll(".modal-backdrop").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModals();
  });
});

// This switches between all, residential, and commercial listings.
document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    renderMarketplace();
  });
});

// This ends the server session when the buyer clicks the logout button.
document.querySelector("#logout").addEventListener("click", signOut);

// This starts the page and shows a useful message if the API is unavailable.
loadDashboard().catch((error) => {
  document.querySelector("#marketplace-grid").innerHTML =
    `<p class="empty-state">${escapeHtml(error.message)} Start MongoDB and the Express server, then refresh.</p>`;
});
