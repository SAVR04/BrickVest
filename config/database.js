const mongoose = require("mongoose");

// This hooks the app up to MongoDB using the address from .env.
async function connectToDatabase() {
  const connectionString =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/brickvest";
  await mongoose.connect(connectionString);
  console.log("Connected to MongoDB.");
}

module.exports = connectToDatabase;
