const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { ApiError } = require("../utils/ApiError");
const { asyncHandler } = require("../utils/asyncHandler");

// ═══════════════════════════════════
//  JWT Authentication Middleware
//  Extracts token from cookie or Authorization header,
//  verifies it, and attaches user to req.user
// ═══════════════════════════════════
const verifyJWT = asyncHandler(async (req, res, next) => {
  // Extract token from cookie or Authorization header
  const token =
    req.cookies?.token ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized — no token provided");
  }

  // Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Token has expired. Please login again");
    }
    throw new ApiError(401, "Invalid token");
  }

  // Check if user still exists
  const user = await User.findById(decoded.id).select("-passwordHash");
  if (!user) {
    throw new ApiError(401, "User associated with this token no longer exists");
  }

  // Attach user to request
  req.user = user;
  next();
});

// ═══════════════════════════════════
//  Role Authorization Middleware
//  Restricts access to specific roles (e.g., admin-only routes)
//  Usage: authorizeRoles("admin")
// ═══════════════════════════════════
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized — please login first");
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Forbidden — role "${req.user.role}" is not authorized to access this resource`
      );
    }

    next();
  };
};

module.exports = { verifyJWT, authorizeRoles };
