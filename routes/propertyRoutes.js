const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const multer = require("multer");
const Property = require("../models/Property");
const Holding = require("../models/Holding");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
const uploadDirectory = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

// This gives uploaded images a safe random name and keeps them in one folder.
const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (req, file, callback) => {
    const extensions = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
    callback(null, `${crypto.randomUUID()}${extensions[file.mimetype]}`);
  },
});

// This only accepts common image formats and caps uploads at five megabytes.
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return callback(new Error("Upload a JPG, PNG, or WebP image."));
    }
    callback(null, true);
  },
});

// This returns all marketplace properties, or only the seller's own listings.
router.get("/", requireAuth, async (req, res) => {
  const filter = {
    isActive: { $ne: false },
    ...(req.query.mine === "true" ? { sellerId: req.user._id.toString() } : {}),
  };
  res.json({ properties: await Property.find(filter).sort({ createdAt: -1 }).lean() });
});

// This saves a seller's listing and its optional uploaded image in MongoDB.
router.post("/", requireAuth, requireRole("seller"), upload.single("image"), async (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const category = req.body.category;
  const totalValuation = Number(req.body.totalValuation);
  const totalTokens = Number(req.body.totalTokens);
  const suppliedImageUrl = String(req.body.imageUrl || "").trim();

  if (title.length < 3 || title.length > 120 || description.length < 5 || description.length > 2000) {
    return res.status(400).json({ message: "Add a title and description with the required length." });
  }
  if (!["residential", "commercial"].includes(category)) {
    return res.status(400).json({ message: "Choose a residential or commercial property." });
  }
  if (!Number.isFinite(totalValuation) || totalValuation <= 0 ||
      !Number.isInteger(totalTokens) || totalTokens <= 0) {
    return res.status(400).json({ message: "Valuation and token count must be positive numbers." });
  }

  let imageUrl = req.file ? `/uploads/${req.file.filename}` : suppliedImageUrl;
  if (!imageUrl) {
    return res.status(400).json({ message: "Upload an image or enter an image URL." });
  }
  if (!req.file && !imageUrl.startsWith("/uploads/")) {
    try {
      const parsedImageUrl = new URL(imageUrl);
      if (!["http:", "https:"].includes(parsedImageUrl.protocol)) throw new Error("Invalid URL");
    } catch {
      return res.status(400).json({ message: "Image URL must start with http:// or https://." });
    }
  }

  const property = await Property.create({
    id: `asset-${crypto.randomUUID()}`,
    title,
    location: String(req.body.location || "New marketplace listing").trim(),
    category,
    description,
    imageUrl,
    totalValuation,
    totalTokens,
    tokenPrice: Math.round((totalValuation / totalTokens) * 100) / 100,
    availableTokens: totalTokens,
    sellerId: req.user._id.toString(),
    projectedYield: 8.2,
  });

  res.status(201).json({ property });
});

// This hides the seller's listing but keeps it around for existing investors.
router.delete("/:id", requireAuth, requireRole("seller"), async (req, res) => {
  const sellerId = req.user._id.toString();
  const property = await Property.findOneAndUpdate({
    id: req.params.id,
    sellerId,
    isActive: { $ne: false },
  }, { $set: { isActive: false } }, { new: true });

  if (!property) {
    return res.status(404).json({ message: "Listing not found in your property desk." });
  }

  res.json({ message: "Listing removed from the marketplace." });
});

// This records a buyer's tokens and reduces the number still available.
router.post("/:id/purchase", requireAuth, requireRole("investor"), async (req, res) => {
  const tokens = Number(req.body.tokens);
  if (!Number.isInteger(tokens) || tokens < 1) {
    return res.status(400).json({ message: "Choose a whole number of tokens greater than zero." });
  }

  const property = await Property.findOneAndUpdate(
    { id: req.params.id, isActive: { $ne: false }, availableTokens: { $gte: tokens } },
    { $inc: { availableTokens: -tokens } },
    { new: true },
  );
  if (!property) {
    const exists = await Property.exists({ id: req.params.id, isActive: { $ne: false } });
    return res.status(exists ? 400 : 404).json({
      message: exists ? "There are not enough tokens left for that purchase." : "Property not found.",
    });
  }

  try {
    const holding = await Holding.findOneAndUpdate(
      { userId: req.user._id.toString(), propertyId: property.id },
      { $inc: { tokens } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return res.json({ property, holding });
  } catch (error) {
    await Property.updateOne({ id: property.id }, { $inc: { availableTokens: tokens } });
    throw error;
  }
});

// This shows the signed-in buyer's holdings with the latest property details.
router.get("/portfolio", requireAuth, requireRole("investor"), async (req, res) => {
  const holdings = await Holding.find({ userId: req.user._id.toString() }).lean();
  const properties = await Property.find({
    id: { $in: holdings.map((holding) => holding.propertyId) },
  }).lean();
  const propertyById = new Map(properties.map((property) => [property.id, property]));
  const portfolio = {};

  for (const holding of holdings) {
    const property = propertyById.get(holding.propertyId);
    if (!property) continue;
    portfolio[property.id] = {
      tokens: holding.tokens,
      tokenPrice: property.tokenPrice,
      title: property.title,
      location: property.location,
      projectedYield: property.projectedYield,
    };
  }

  res.json({ portfolio });
});

module.exports = { router, upload };
