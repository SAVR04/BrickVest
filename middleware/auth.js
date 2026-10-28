const jwt = require("jsonwebtoken");
const User = require("../models/User");

// This redirects signed-out visitors away from dashboards and profiles.
async function requirePageAuth(req, res, next) {
  try {
    const user = req.session.userId
      ? await User.findById(req.session.userId).select("role")
      : null;

    if (!user) {
      return res.redirect(`/login.html?role=${req.path === "/seller.html" ? "seller" : "investor"}`);
    }

    if (req.path === "/customer.html" && user.role !== "investor") {
      return res.redirect("/seller.html");
    }
    if (req.path === "/seller.html" && user.role !== "seller") {
      return res.redirect("/customer.html");
    }

    next();
  } catch (error) {
    next(error);
  }
}

// This checks the session and JWT before letting an API request through.
async function requireAuth(req, res, next) {
  try {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    let userId = req.session.userId;

    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (!userId || userId !== payload.sub) {
        return res.status(401).json({ message: "Your session and token do not match." });
      }
      userId = payload.sub;
    }

    if (!userId) {
      return res.status(401).json({ message: "Please sign in to continue." });
    }

    req.user = await User.findById(userId);
    if (!req.user) {
      return res.status(401).json({ message: "This account is no longer available." });
    }

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Your sign-in token is invalid or has expired." });
    }
    next(error);
  }
}

// This keeps seller-only actions off buyer accounts.
function requireRole(role) {
  return function checkRole(req, res, next) {
    if (req.user.role !== role) {
      return res.status(403).json({ message: `This action is for ${role} accounts only.` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, requirePageAuth };
