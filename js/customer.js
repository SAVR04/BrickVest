const PROPERTY_KEY = "bricklaneProperties";
const PORTFOLIO_KEY = "bricklanePortfolio";
let properties = [];
let selectedProperty = null;
let activeFilter = "all";

const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
const getPortfolio = () =>
  JSON.parse(localStorage.getItem(PORTFOLIO_KEY) || "{}");
const saveProperties = () =>
  localStorage.setItem(PROPERTY_KEY, JSON.stringify(properties));
async function loadProperties() {
  const saved = localStorage.getItem(PROPERTY_KEY);
  if (saved) return JSON.parse(saved);
  const response = await fetch("data/properties.json");
  const seeded = await response.json();
  localStorage.setItem(PROPERTY_KEY, JSON.stringify(seeded));
  return seeded;
}
function cardTemplate(property) {
  const sold = property.totalTokens - property.availableTokens;
  const progress = Math.round((sold / property.totalTokens) * 100);
  return `<article class="property-card"><div class="property-image"><img src="${property.imageUrl}" alt="${property.title}"><span class="category-tag">${property.category}</span><span class="yield-tag">${property.projectedYield || 8.2}% yield</span></div><div class="property-card-body"><div class="property-location">${property.location || "Global asset"}</div><h3>${property.title}</h3><p>${property.description}</p><div class="property-price"><span>1 fraction</span><strong>${money(property.tokenPrice)}</strong></div><div class="progress-track"><i style="width:${progress}%"></i></div><div class="property-meta"><span>${property.availableTokens.toLocaleString()} available</span><button class="button button-small button-dark" data-buy="${property.id}">Buy fractions <span>↗</span></button></div></div></article>`;
}
function renderMarketplace() {
  const visible =
    activeFilter === "all"
      ? properties
      : properties.filter((property) => property.category === activeFilter);
  document.querySelector("#marketplace-grid").innerHTML = visible.length
    ? visible.map(cardTemplate).join("")
    : '<p class="empty-state">No properties match this filter.</p>';
  document
    .querySelectorAll("[data-buy]")
    .forEach((button) =>
      button.addEventListener("click", () => openBuyModal(button.dataset.buy)),
    );
}
function renderPortfolio() {
  const portfolio = getPortfolio();
  const entries = Object.entries(portfolio).filter(
    ([, holding]) => holding.tokens > 0,
  );
  const value = entries.reduce(
    (sum, [, holding]) => sum + holding.tokens * holding.tokenPrice,
    0,
  );
  const invested = entries.reduce(
    (sum, [, holding]) => sum + holding.tokens * holding.tokenPrice,
    0,
  );
  document.querySelector("#portfolio-metrics").innerHTML =
    `<div class="metric-card"><span class="metric-icon mint">◈</span><small>Total portfolio value</small><strong>${money(value)}</strong><span class="metric-positive">↗ +4.2% this month</span></div><div class="metric-card"><span class="metric-icon orange">↗</span><small>Total invested</small><strong>${money(invested)}</strong><span class="metric-note">Across ${entries.length} assets</span></div><div class="metric-card"><span class="metric-icon blue">⌁</span><small>Available balance</small><strong>$12,500</strong><span class="metric-note">Demo wallet balance</span></div>`;
  document.querySelector("#portfolio-count").textContent =
    `${entries.length} asset${entries.length === 1 ? "" : "s"}`;
  document.querySelector("#portfolio-list").innerHTML = entries.length
    ? `<div class="portfolio-head"><span>Asset</span><span>Tokens owned</span><span>Current value</span><span></span></div>${entries.map(([id, holding]) => `<div class="portfolio-row"><div class="portfolio-asset"><span class="mini-property">${holding.title.slice(0, 1)}</span><span><strong>${holding.title}</strong><small>${holding.location || "Tokenized property"}</small></span></div><span>${holding.tokens.toLocaleString()}</span><strong>${money(holding.tokens * holding.tokenPrice)}</strong><span class="gain">+${holding.projectedYield || 8.2}%</span></div>`).join("")}`
    : '<div class="empty-state">Your first property is waiting above.</div>';
}
function openBuyModal(id) {
  selectedProperty = properties.find((property) => property.id === id);
  document.querySelector("#buy-title").textContent = selectedProperty.title;
  document.querySelector("#buy-price").textContent =
    `${money(selectedProperty.tokenPrice)} per token · ${selectedProperty.availableTokens.toLocaleString()} available`;
  const input = document.querySelector("#token-amount");
  input.value = 1;
  input.max = selectedProperty.availableTokens;
  document.querySelector("#buy-total").textContent = money(
    selectedProperty.tokenPrice,
  );
  document.querySelector("#buy-modal").classList.add("open");
  input.focus();
}
function closeModals() {
  document
    .querySelectorAll(".modal-backdrop")
    .forEach((modal) => modal.classList.remove("open"));
}
function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}
document.querySelector("#buy-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(document.querySelector("#token-amount").value);
  if (
    !Number.isInteger(amount) ||
    amount < 1 ||
    amount > selectedProperty.availableTokens
  )
    return showToast(
      `Choose between 1 and ${selectedProperty.availableTokens.toLocaleString()} tokens.`,
    );
  selectedProperty.availableTokens -= amount;
  saveProperties();
  const portfolio = getPortfolio();
  const current = portfolio[selectedProperty.id] || {
    tokens: 0,
    tokenPrice: selectedProperty.tokenPrice,
    title: selectedProperty.title,
    location: selectedProperty.location,
    projectedYield: selectedProperty.projectedYield,
  };
  current.tokens += amount;
  portfolio[selectedProperty.id] = current;
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio));
  closeModals();
  renderMarketplace();
  renderPortfolio();
  showToast(
    `${amount.toLocaleString()} fraction${amount === 1 ? "" : "s"} added to your portfolio.`,
  );
});
document.querySelector("#token-amount").addEventListener("input", (event) => {
  document.querySelector("#buy-total").textContent = money(
    (Number(event.target.value) || 0) * (selectedProperty?.tokenPrice || 0),
  );
});
document
  .querySelectorAll("[data-close-modal]")
  .forEach((button) => button.addEventListener("click", closeModals));
document.querySelectorAll(".modal-backdrop").forEach((modal) =>
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModals();
  }),
);
document.querySelectorAll("[data-filter]").forEach((button) =>
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document
      .querySelectorAll("[data-filter]")
      .forEach((item) => item.classList.toggle("active", item === button));
    renderMarketplace();
  }),
);
document.querySelector("#logout").addEventListener("click", () => {
  localStorage.removeItem("bricklaneRole");
  window.location.href = "index.html";
});
document.querySelector("#reset-demo").addEventListener("click", () => {
  localStorage.removeItem(PROPERTY_KEY);
  localStorage.removeItem(PORTFOLIO_KEY);
  window.location.reload();
});
loadProperties()
  .then((loaded) => {
    properties = loaded;
    renderMarketplace();
    renderPortfolio();
  })
  .catch(() => {
    document.querySelector("#marketplace-grid").innerHTML =
      '<p class="empty-state">Start the app through a local server to load property data.</p>';
  });
