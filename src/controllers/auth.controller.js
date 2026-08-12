const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { ApiError } = require("../utils/ApiError");
const { ApiResponse } = require("../utils/ApiResponse");
const { asyncHandler } = require("../utils/asyncHandler");

// ─── Helper: generate JWT token ───
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || "7d",
  });
};

// ─── Helper: cookie options ───
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ═══════════════════════════════════
//  POST /api/v1/auth/register
// ═══════════════════════════════════
const register = asyncHandler(async (req, res) => {
  const { name, email, password, targetRole } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email and password are required");
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const user = await User.create({
    name,
    email,
    passwordHash,
    targetRole: targetRole || undefined,
  });

  // Generate token
  const token = generateToken(user._id);

  // Return user (without passwordHash)
  const createdUser = await User.findById(user._id).select("-passwordHash");

  return res
    .status(201)
    .cookie("token", token, cookieOptions)
    .json(new ApiResponse(201, { user: createdUser, token }, "User registered successfully"));
});

// ═══════════════════════════════════
//  POST /api/v1/auth/login
// ═══════════════════════════════════
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Generate token
  const token = generateToken(user._id);

  // Return user (without passwordHash)
  const loggedInUser = await User.findById(user._id).select("-passwordHash");

  return res
    .status(200)
    .cookie("token", token, cookieOptions)
    .json(new ApiResponse(200, { user: loggedInUser, token }, "Login successful"));
});

// ═══════════════════════════════════
//  POST /api/v1/auth/logout
// ═══════════════════════════════════
const logout = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .clearCookie("token", cookieOptions)
    .json(new ApiResponse(200, null, "Logged out successfully"));
});

// ═══════════════════════════════════
//  GET /api/v1/auth/me
// ═══════════════════════════════════
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("-passwordHash");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "User profile fetched successfully"));
});

module.exports = { register, login, logout, getMe };
