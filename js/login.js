const roleButtons = document.querySelectorAll("[data-role]");
roleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const role = button.dataset.role;
    localStorage.setItem("bricklaneRole", role);
    localStorage.setItem(
      "bricklaneUserId",
      role === "seller" ? "seller-demo" : "investor-demo",
    );
    window.location.href = role === "seller" ? "seller.html" : "customer.html";
  });
});
