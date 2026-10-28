const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    location: { type: String, default: "New marketplace listing", trim: true },
    category: { type: String, enum: ["residential", "commercial"], required: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    imageUrl: { type: String, required: true },
    totalValuation: { type: Number, required: true, min: 1 },
    totalTokens: { type: Number, required: true, min: 1 },
    tokenPrice: { type: Number, required: true, min: 0.01 },
    availableTokens: { type: Number, required: true, min: 0 },
    sellerId: { type: String, required: true },
    projectedYield: { type: Number, default: 8.2 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Property", propertySchema);
