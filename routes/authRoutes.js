const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// This gives a signed-in user a short-lived JWT for API requests.
function createToken(user) {
  return jwt.sign(
    { role: user.role },
    process.env.JWT_SECRET,
    { subject: user._id.toString(), expiresIn: "1h" },
  );
}

// This gives every login a fresh MongoDB-backed session before replying.
function saveLoginSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((regenerateError) => {
      if (regenerateError) return reject(regenerateError);
      req.session.userId = user._id.toString();
      req.session.save((saveError) => (saveError ? reject(saveError) : resolve()));
    });
  });
}

// This sends the same safe account details after signup and login.
function sendSignedInUser(req, res, user, status = 200) {
  return saveLoginSession(req, user).then(() => {
    res.status(status).json({
      token: createToken(user),
      user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
    });
  });
}

// This creates an account, hashes its password, and signs it in.
router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const role = req.body.role;

    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ message: "Name must be between 2 and 80 characters." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (password.length < 6 || password.length > 72) {
      return res.status(400).json({ message: "Password must be between 6 and 72 characters." });
    }
    if (!["investor", "seller"].includes(role)) {
      return res.status(400).json({ message: "Choose either a buyer or seller account." });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ message: "This email already has an account. Sign in instead." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role });
    return await sendSignedInUser(req, res, user, 201);
  } catch (error) {
    next(error);
  }
});

// This checks the password against its saved hash and starts a session.
router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "That email or password does not match. Try again." });
    }
    if (req.body.role && user.role !== req.body.role) {
      return res.status(401).json({ message: "That account is for a different workspace." });
    }

    return await sendSignedInUser(req, res, user);
  } catch (error) {
    next(error);
  }
});

// This ends the server session and clears the browser's session cookie.
router.post("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("brickvest.sid");
    res.json({ message: "You are signed out." });
  });
});

// This returns the signed-in account without sending password details.
router.get("/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user._id.toString(),
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

module.exports = router;
