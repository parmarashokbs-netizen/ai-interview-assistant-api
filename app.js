const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

// ─── Import Routes ───
const authRoutes = require("./src/routes/auth.routes");
const interviewRoutes = require("./src/routes/interview.routes");
const resumeRoutes = require("./src/routes/resume.routes");
const analyticsRoutes = require("./src/routes/analytics.routes");
const userRoutes = require("./src/routes/user.routes");

// ─── Import Error Handler ───
const { errorHandler } = require("./src/middlewares/error.middleware");

const app = express();

// ═══════════════════════════════════
//  Security Middleware
// ═══════════════════════════════════
app.use(helmet());

// ═══════════════════════════════════
//  CORS Configuration
// ═══════════════════════════════════
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ═══════════════════════════════════
//  Rate Limiting
// ═══════════════════════════════════
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: "Too many requests. Please try again after 15 minutes.",
  },
});
app.use("/api", limiter);

// ═══════════════════════════════════
//  Body Parsing & Cookies
// ═══════════════════════════════════
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

// ═══════════════════════════════════
//  HTTP Request Logging
// ═══════════════════════════════════
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ═══════════════════════════════════
//  Health Check
// ═══════════════════════════════════
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI Interview Assistant API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ═══════════════════════════════════
//  API Routes
// ═══════════════════════════════════
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/interviews", interviewRoutes);
app.use("/api/v1/resume", resumeRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/users", userRoutes);

// ═══════════════════════════════════
//  404 Handler (unknown routes)
// ═══════════════════════════════════
app.use((req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ═══════════════════════════════════
//  Global Error Handler (must be last)
// ═══════════════════════════════════
app.use(errorHandler);

module.exports = { app };
