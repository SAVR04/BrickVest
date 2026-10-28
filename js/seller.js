let properties = [];
let currentUser = null;

// This formats prices in the seller dashboard.
const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

// This loads the signed-in seller and just their own MongoDB listings.
async function loadDashboard() {
  currentUser = await getCurrentUser();
  if (!currentUser) return;
  if (currentUser.role !== "seller") {
    window.location.href = "customer.html";
    return;
  }

  const result = await apiRequest("/api/properties?mine=true");
  properties = result.properties;
  document.querySelector(".account-name").textContent = currentUser.name;
  document.querySelector(".avatar").textContent = currentUser.name
    .split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  document.querySelector(".dashboard-intro h1").textContent =
    `${currentUser.name.split(" ")[0]}'s property desk.`;
  render();
}

// This draws the seller's listing totals and property cards.
function render() {
  const totalValue = properties.reduce((sum, property) => sum + property.totalValuation, 0);
  const totalTokens = properties.reduce(
    (sum, property) => sum + property.totalTokens - property.availableTokens,
    0,
  );
  const tokenCount = properties.reduce((sum, property) => sum + property.totalTokens, 0);
  document.querySelector("#seller-metrics").innerHTML =
    `<div class="metric-card"><span class="metric-icon mint">◈</span><small>Assets under management</small><strong>${money(totalValue)}</strong><span class="metric-positive">↗ Across your listings</span></div><div class="metric-card"><span class="metric-icon orange">⌁</span><small>Fractions sold</small><strong>${totalTokens.toLocaleString()}</strong><span class="metric-note">${tokenCount ? Math.round((totalTokens / tokenCount) * 100) : 0}% sell-through</span></div><div class="metric-card"><span class="metric-icon blue">↗</span><small>Active listings</small><strong>${properties.length}</strong><span class="metric-note">Visible in marketplace</span></div>`;
  document.querySelector("#listing-count").textContent =
    `${properties.length} listing${properties.length === 1 ? "" : "s"}`;
  document.querySelector("#seller-grid").innerHTML = properties.length
    ? properties.map((property) => {
      const sold = property.totalTokens - property.availableTokens;
      const progress = Math.round((sold / property.totalTokens) * 100);
      return `<article class="property-card"><div class="property-image"><img src="${escapeHtml(property.imageUrl)}" alt="${escapeHtml(property.title)}"><span class="category-tag">${escapeHtml(property.category)}</span><span class="yield-tag">${progress}% funded</span></div><div class="property-card-body"><div class="property-location">${escapeHtml(property.location || "New listing")}</div><h3>${escapeHtml(property.title)}</h3><p>${escapeHtml(property.description)}</p><div class="property-price"><span>Asset valuation</span><strong>${money(property.totalValuation)}</strong></div><div class="progress-track"><i style="width:${progress}%"></i></div><div class="property-meta"><span>${sold.toLocaleString()} / ${property.totalTokens.toLocaleString()} sold</span><span class="mono">${money(property.tokenPrice)} / token</span></div><div class="property-actions"><button class="delete-property-button" type="button" data-delete-property="${escapeHtml(property.id)}" aria-label="Remove ${escapeHtml(property.title)} listing from marketplace">Delete listing</button></div></div></article>`;
    }).join("")
    : '<p class="empty-state">You have not listed a property yet. Add one to get started.</p>';
}

// This asks first, then removes the listing from sale and refreshes the page.
async function deleteProperty(id, button) {
  const property = properties.find((item) => item.id === id);
  if (!property) return;

  const confirmed = window.confirm(
    `Remove "${property.title}" from the marketplace? Existing investor holdings will stay safe.`,
  );
  if (!confirmed) return;

  button.disabled = true;
  button.textContent = "Deleting...";
  try {
    const result = await apiRequest(`/api/properties/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await loadDashboard();
    showToast(result.warning || "Listing deleted.");
  } catch (error) {
    button.disabled = false;
    button.textContent = "Delete listing";
    showToast(error.message);
  }
}

// This briefly shows success or error messages beside the seller dashboard.
function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

// This closes the new-property dialog.
function closeModal() {
  document.querySelector("#listing-modal").classList.remove("open");
}

// This opens the form for a new marketplace listing.
document.querySelector("#open-listing").addEventListener("click", () => {
  document.querySelector("#listing-modal").classList.add("open");
});

// This closes the form from its close buttons or the shaded background.
document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", closeModal);
});
document.querySelector("#listing-modal").addEventListener("click", (event) => {
  if (event.target.id === "listing-modal") closeModal();
});

// This connects each listing's delete button to the confirmed delete action.
document.querySelector("#seller-grid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-property]");
  if (button) deleteProperty(button.dataset.deleteProperty, button);
});

// This sends the property and optional photo to Express for saving.
document.querySelector("#listing-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const image = form.querySelector("[name='image']").files[0];

  if (image && image.size > 5 * 1024 * 1024) {
    showToast("Image files must be 5 MB or smaller.");
    return;
  }

  try {
    await apiRequest("/api/properties", { method: "POST", body: data });
    form.reset();
    closeModal();
    await loadDashboard();
    showToast("Your property is now ready for investors.");
  } catch (error) {
    showToast(error.message);
  }
});

// This signs the seller out on the server and clears their browser token.
document.querySelector("#logout").addEventListener("click", signOut);

// This starts the page and explains how to recover if the server is offline.
loadDashboard().catch((error) => {
  document.querySelector("#seller-grid").innerHTML =
    `<p class="empty-state">${escapeHtml(error.message)} Start MongoDB and the Express server, then refresh.</p>`;
});
