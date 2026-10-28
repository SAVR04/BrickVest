const roleButtons = document.querySelectorAll("[data-auth-role]");
const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");
const brandLink = document.querySelector(".brand");
let selectedRole = new URLSearchParams(window.location.search).get("role") || "investor";

if (!["investor", "seller"].includes(selectedRole)) selectedRole = "investor";

// This picks the demo email that matches the selected workspace.
function getDemoEmail(role) {
  return role === "seller" ? "alex@bricklane.demo" : "jordan@bricklane.demo";
}

// This sends each account type to its own dashboard after login.
function getRolePage(role) {
  return role === "seller" ? "seller.html" : "customer.html";
}

// This stores the short-lived token and opens the right dashboard.
function finishSignIn(result) {
  sessionStorage.setItem(TOKEN_KEY, result.token);
  window.location.href = getRolePage(result.user.role);
}

// This updates the role buttons and the demo hint on the form.
function updateRole(role) {
  selectedRole = role;
  const buyerLabel = role === "seller" ? "seller" : "buyer";

  roleButtons.forEach((button) => {
    const active = button.dataset.authRole === role;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  const emailInput = document.querySelector("[name='email']");
  const loginHint = document.querySelector("#login-hint");
  if (emailInput && loginForm && (!emailInput.value || emailInput.value.includes("bricklane.demo"))) {
    emailInput.value = getDemoEmail(role);
  }
  if (loginHint) loginHint.textContent = `Demo ${buyerLabel}: ${getDemoEmail(role)}`;

  const signupHint = document.querySelector("#signup-hint");
  if (signupHint) signupHint.textContent = `Create a ${buyerLabel} account`;

  const accountLink = document.querySelector(".auth-footer a");
  if (accountLink) {
    accountLink.href = `${loginForm ? "signup" : "login"}.html?role=${role}`;
  }
}

// This connects each role button to its small workspace switch.
roleButtons.forEach((button) => {
  button.addEventListener("click", () => updateRole(button.dataset.authRole));
});

// This sends the login form to the server instead of checking browser storage.
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const hint = document.querySelector("#login-hint");
    const form = new FormData(loginForm);

    try {
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          role: selectedRole,
        }),
      });
      finishSignIn(result);
    } catch (error) {
      hint.textContent = error.message;
    }
  });

  updateRole(selectedRole);
}

// This fills an email passed over from the login page's create-account link.
if (signupForm) {
  const params = new URLSearchParams(window.location.search);
  const emailInput = signupForm.querySelector("[name='email']");
  if (emailInput && params.get("email")) emailInput.value = params.get("email");

  updateRole(selectedRole);

  // This asks the server to hash the password, create the account, and sign in.
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const hint = document.querySelector("#signup-hint");
    const form = new FormData(signupForm);

    try {
      const result = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          role: selectedRole,
        }),
      });
      finishSignIn(result);
    } catch (error) {
      hint.textContent = error.message;
    }
  });
}

// This points the brand back to the signed-in user's workspace when known.
if (brandLink && sessionStorage.getItem(TOKEN_KEY)) {
  brandLink.addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      const { user } = await apiRequest("/api/auth/me");
      window.location.href = getRolePage(user.role);
    } catch (error) {
      sessionStorage.removeItem(TOKEN_KEY);
      window.location.href = "index.html";
    }
  });
}
