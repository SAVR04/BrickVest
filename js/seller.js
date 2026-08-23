const PROPERTY_KEY = "bricklaneProperties";
const userId = localStorage.getItem("bricklaneUserId");
if (!userId) window.location.href = "login.html?role=seller";
document.querySelector(".brand").href = "seller.html";
let properties = [];
function setAccountName() {
  const users = JSON.parse(localStorage.getItem("bricklaneUsers") || "[]");
  const user = users.find((item) => item.id === userId);
  if (user) {
    document.querySelector(".account-name").textContent = user.name;
    document.querySelector(".avatar").textContent = user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    document.querySelector(".dashboard-intro h1").textContent = `${user.name.split(" ")[0]}'s property desk.`;
  }
}
const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
async function loadProperties() {
  const saved = localStorage.getItem(PROPERTY_KEY);
  if (saved) return JSON.parse(saved);
  const response = await fetch("data/properties.json");
  const seeded = await response.json();
  localStorage.setItem(PROPERTY_KEY, JSON.stringify(seeded));
  return seeded;
}
function render() {
  const totalValue = properties.reduce(
    (sum, property) => sum + property.totalValuation,
    0,
  );
  const totalTokens = properties.reduce(
    (sum, property) => sum + property.totalTokens - property.availableTokens,
    0,
  );
  document.querySelector("#seller-metrics").innerHTML =
    `<div class="metric-card"><span class="metric-icon mint">◈</span><small>Assets under management</small><strong>${money(totalValue)}</strong><span class="metric-positive">↗ Across all listings</span></div><div class="metric-card"><span class="metric-icon orange">⌁</span><small>Fractions sold</small><strong>${totalTokens.toLocaleString()}</strong><span class="metric-note">${properties.length ? Math.round((totalTokens / properties.reduce((sum, property) => sum + property.totalTokens, 0)) * 100) : 0}% sell-through</span></div><div class="metric-card"><span class="metric-icon blue">↗</span><small>Investor interest</small><strong>184</strong><span class="metric-note">Unique watchlist adds</span></div>`;
  document.querySelector("#listing-count").textContent =
    `${properties.length} listing${properties.length === 1 ? "" : "s"}`;
  document.querySelector("#seller-grid").innerHTML = properties
    .map((property) => {
      const sold = property.totalTokens - property.availableTokens;
      const progress = Math.round((sold / property.totalTokens) * 100);
      return `<article class="property-card"><div class="property-image"><img src="${property.imageUrl}" alt="${property.title}"><span class="category-tag">${property.category}</span><span class="yield-tag">${progress}% funded</span></div><div class="property-card-body"><div class="property-location">${property.location || "New listing"}</div><h3>${property.title}</h3><p>${property.description}</p><div class="property-price"><span>Asset valuation</span><strong>${money(property.totalValuation)}</strong></div><div class="progress-track"><i style="width:${progress}%"></i></div><div class="property-meta"><span>${sold.toLocaleString()} / ${property.totalTokens.toLocaleString()} sold</span><span class="mono">${money(property.tokenPrice)} / token</span></div></div></article>`;
    })
    .join("");
}
function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}
function closeModal() {
  document.querySelector("#listing-modal").classList.remove("open");
}
document
  .querySelector("#open-listing")
  .addEventListener("click", () =>
    document.querySelector("#listing-modal").classList.add("open"),
  );
document
  .querySelectorAll("[data-close-modal]")
  .forEach((button) => button.addEventListener("click", closeModal));
document.querySelector("#listing-modal").addEventListener("click", (event) => {
  if (event.target.id === "listing-modal") closeModal();
});
document.querySelector("#listing-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const totalValuation = Number(form.get("totalValuation"));
  const totalTokens = Number(form.get("totalTokens"));
  if (totalValuation <= 0 || totalTokens <= 0) {
    return showToast("Valuation and tokens must be positive values.");
  }
  properties.unshift({
    id: `asset-${Date.now()}`,
    title: form.get("title"),
    location: "New marketplace listing",
    category: form.get("category"),
    description: form.get("description"),
    imageUrl: form.get("imageUrl"),
    totalValuation,
    totalTokens,
    tokenPrice: Math.round((totalValuation / totalTokens) * 100) / 100,
    availableTokens: totalTokens,
    sellerId: userId || "seller-demo",
    projectedYield: 8.2,
  });
  localStorage.setItem(PROPERTY_KEY, JSON.stringify(properties));
  event.target.reset();
  closeModal();
  render();
  showToast("Your property is now ready for investors.");
});
document.querySelector("#logout").addEventListener("click", () => {
  localStorage.removeItem("bricklaneRole");
  window.location.href = "index.html";
});
setAccountName();
loadProperties()
  .then((loaded) => {
    properties = loaded;
    render();
  })
  .catch(() => {
    document.querySelector("#seller-grid").innerHTML =
      '<p class="empty-state">Start the app through a local server to load listings.</p>';
  });
