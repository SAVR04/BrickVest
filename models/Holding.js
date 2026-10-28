const mongoose = require("mongoose");

const holdingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    propertyId: { type: String, required: true },
    tokens: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);

holdingSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

module.exports = mongoose.model("Holding", holdingSchema);
