require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const connectToDatabase = require("./config/database");
const User = require("./models/User");
const Property = require("./models/Property");
const authRoutes = require("./routes/authRoutes");
const { router: propertyRoutes } = require("./routes/propertyRoutes");
const { requirePageAuth } = require("./middleware/auth");
const seedProperties = require("./data/properties.json");

const app = express();
const port = Number(process.env.PORT) || 3000;
const rootDirectory = __dirname;
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/brickvest";
const pageFiles = {
  "/": "index.html",
  "/index.html": "index.html",
  "/login.html": "login.html",
  "/signup.html": "signup.html",
  "/customer.html": "customer.html",
  "/seller.html": "seller.html",
  "/profile.html": "profile.html",
};

// This makes sure the app has the secrets needed for login before it boots.
function checkEnvironment() {
  for (const name of ["SESSION_SECRET", "JWT_SECRET"]) {
    if (!process.env[name] || process.env[name].length < 32) {
      throw new Error(`${name} must be set to a random string of at least 32 characters in .env.`);
    }
  }
}

// This adds the two sample accounts and listings the first time MongoDB is empty.
async function seedDemoData() {
  const demoUsers = [
    { name: "Jordan Davis", email: "jordan@bricklane.demo", password: "bricklane", role: "investor" },
    { name: "Alex Kim", email: "alex@bricklane.demo", password: "bricklane", role: "seller" },
  ];

  for (const demo of demoUsers) {
    if (!(await User.exists({ email: demo.email }))) {
      await User.create({
        name: demo.name,
        email: demo.email,
        passwordHash: await bcrypt.hash(demo.password, 10),
        role: demo.role,
      });
    }
  }

  if ((await Property.countDocuments()) === 0) {
    const seller = await User.findOne({ email: "alex@bricklane.demo" });
    await Property.insertMany(
      seedProperties.map((property) => ({ ...property, sellerId: seller._id.toString() })),
    );
  }
}

// This wires up the session, APIs, safe static files, and friendly errors.
function configureApp() {
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));
  app.use(
    session({
      name: "brickvest.sid",
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: mongoUri,
        collectionName: "sessions",
        ttl: 24 * 60 * 60,
      }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.use("/api/auth", authRoutes);
  app.use("/api/properties", propertyRoutes);
  app.use("/css", express.static(path.join(rootDirectory, "css")));
  app.use("/js", express.static(path.join(rootDirectory, "js")));
  app.use("/uploads", express.static(path.join(rootDirectory, "uploads")));

  app.get(["/customer.html", "/seller.html", "/profile.html"], requirePageAuth, (req, res) => {
    res.sendFile(path.join(rootDirectory, pageFiles[req.path]));
  });

  app.get(Object.keys(pageFiles).filter((page) => ![
    "/customer.html",
    "/seller.html",
    "/profile.html",
  ].includes(page)), (req, res) => {
    res.sendFile(path.join(rootDirectory, pageFiles[req.path]));
  });

  app.use((req, res) => {
    res.status(404).json({ message: "That page or API route was not found." });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.name === "MulterError") {
      return res.status(400).json({
        message: error.code === "LIMIT_FILE_SIZE"
          ? "Image files must be 5 MB or smaller."
          : "Only one image can be uploaded at a time.",
      });
    }
    if (error.message === "Upload a JPG, PNG, or WebP image.") {
      return res.status(400).json({ message: error.message });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Some of the submitted details are not valid." });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: "That email address is already registered." });
    }

    console.error("Request failed:", error);
    res.status(500).json({ message: "Something went wrong. Check the server terminal for details." });
  });
}

// This starts MongoDB, seeds the demo, and only then opens the web server.
async function startServer() {
  checkEnvironment();
  await connectToDatabase();
  await seedDemoData();
  configureApp();
  app.listen(port, () => console.log(`BrickVest is ready at http://localhost:${port}`));
}

startServer().catch((error) => {
  console.error("BrickVest could not start:", error.message);
  process.exitCode = 1;
});
