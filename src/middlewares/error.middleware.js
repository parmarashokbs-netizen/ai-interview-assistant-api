const { ApiError } = require("../utils/ApiError");

// ═══════════════════════════════════
//  Global Error Handler Middleware
//  Catches all errors thrown in the app and returns
//  a consistent JSON error response.
//  Must be registered LAST (after all routes).
// ═══════════════════════════════════
const errorHandler = (err, req, res, next) => {
  // If it's our custom ApiError, use its properties directly
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }

  // ─── Handle specific Mongoose errors ───

  // Duplicate key error (e.g., unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      statusCode: 409,
      message: `Duplicate value for "${field}". This ${field} already exists.`,
      errors: [],
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "Validation Error",
      errors: messages,
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: `Invalid ${err.path}: ${err.value}`,
      errors: [],
    });
  }

  // JSON parse error
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "Invalid JSON in request body",
      errors: [],
    });
  }

  // ─── Fallback: unknown/unhandled errors ───
  console.error("UNHANDLED ERROR:", err);

  return res.status(500).json({
    success: false,
    statusCode: 500,
    message: process.env.NODE_ENV === "development"
      ? err.message
      : "Internal Server Error",
    errors: [],
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
