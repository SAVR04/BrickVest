const USERS_KEY = "bricklaneUsers", seededUsers = [{ id: "investor-demo", role: "investor", email: "jordan@bricklane.demo", password: "bricklane", name: "Jordan Davis" }, { id: "seller-demo", role: "seller", email: "alex@bricklane.demo", password: "bricklane", name: "Alex Kim" }], roleButtons = document.querySelectorAll("[data-auth-role]"), loginForm = document.querySelector("#login-form"), signupForm = document.querySelector("#signup-form");
let selectedRole = new URLSearchParams(window.location.search).get("role") || "investor";
const signedInRole = localStorage.getItem("bricklaneRole");
const brandLink = document.querySelector(".brand");
if (brandLink && signedInRole) brandLink.href = signedInRole === "seller" ? "seller.html" : "customer.html";
function getUsers() { return JSON.parse(localStorage.getItem(USERS_KEY) || JSON.stringify(seededUsers)); }

function updateRole(role) {
  selectedRole = role;
  roleButtons.forEach(button => { const active = button.dataset.authRole === role; button.classList.toggle("active", active); button.setAttribute("aria-selected", String(active)); });
  const email = document.querySelector("[name=email]"), hint = document.querySelector("#login-hint"), seller = role === "seller";
  if (email && hint && loginForm) {
    if (!email.value || email.value.includes("bricklane.demo")) email.value = seller ? "alex@bricklane.demo" : "jordan@bricklane.demo";
    hint.textContent = `Demo ${seller ? "seller" : "buyer"}: ${seller ? "alex@bricklane.demo" : "jordan@bricklane.demo"}`;
  }
  const signupHint = document.querySelector("#signup-hint");
  if (signupHint) signupHint.textContent = `Create a ${seller ? "seller" : "buyer"} account`;
}

roleButtons.forEach(button => button.addEventListener("click", () => updateRole(button.dataset.authRole)));

if (loginForm) {
  loginForm.addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const user = getUsers().find(item => item.email.toLowerCase() === form.get("email").toLowerCase());
    if (!user) return window.location.href = `signup.html?role=${selectedRole}&email=${encodeURIComponent(form.get("email"))}`;
    if (user.role !== selectedRole || user.password !== form.get("password")) return document.querySelector("#login-hint").textContent = "That account or password does not match. Try again.";
    localStorage.setItem("bricklaneRole", user.role);
    localStorage.setItem("bricklaneUserId", user.id);
    window.location.href = user.role === "seller" ? "seller.html" : "customer.html";
  });
  updateRole(selectedRole);
}

if (signupForm) {
  const params = new URLSearchParams(window.location.search);
  const email = signupForm.querySelector("[name=email]");
  if (params.get("email")) email.value = params.get("email");
  updateRole(selectedRole);
  signupForm.addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const users = getUsers();
    if (users.some(user => user.email.toLowerCase() === form.get("email").toLowerCase())) return document.querySelector("#signup-hint").textContent = "This email already has an account. Sign in instead.";
    const user = { id: `${selectedRole}-${Date.now()}`, role: selectedRole, name: form.get("name"), email: form.get("email"), password: form.get("password") };
    localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
    localStorage.setItem("bricklaneRole", user.role);
    localStorage.setItem("bricklaneUserId", user.id);
    window.location.href = user.role === "seller" ? "seller.html" : "customer.html";
  });
}
