const bcrypt = require("bcrypt");
const User = require("../models/user.model");
const InterviewSession = require("../models/interviewSession.model");
const ResumeAnalysis = require("../models/resumeAnalysis.model");
const InterviewAnalytics = require("../models/interviewAnalytics.model");
const Response = require("../models/response.model");
const Question = require("../models/question.model");
const { ApiError } = require("../utils/ApiError");
const { ApiResponse } = require("../utils/ApiResponse");
const { asyncHandler } = require("../utils/asyncHandler");

// ═══════════════════════════════════
//  PATCH /api/v1/users/profile
// ═══════════════════════════════════
const updateProfile = asyncHandler(async (req, res) => {
  const { name, targetRole } = req.body;

  if (!name && !targetRole) {
    throw new ApiError(400, "Provide at least one field to update (name or targetRole)");
  }

  const updateFields = {};
  if (name) updateFields.name = name.trim();
  if (targetRole) updateFields.targetRole = targetRole.trim();

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: updateFields },
    { new: true, runValidators: true }
  ).select("-passwordHash");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "Profile updated successfully"));
});

// ═══════════════════════════════════
//  PATCH /api/v1/users/change-password
// ═══════════════════════════════════
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters long");
  }

  if (currentPassword === newPassword) {
    throw new ApiError(400, "New password must be different from current password");
  }

  // Get user with passwordHash
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError(401, "Current password is incorrect");
  }

  // Hash and save new password
  const saltRounds = 10;
  user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully"));
});

// ═══════════════════════════════════
//  DELETE /api/v1/users/account
// ═══════════════════════════════════
const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    throw new ApiError(400, "Password is required to confirm account deletion");
  }

  // Verify password before deletion
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError(401, "Incorrect password");
  }

  // Get all session IDs for cleanup
  const sessions = await InterviewSession.find({ userId: user._id }).select("_id");
  const sessionIds = sessions.map((s) => s._id);

  // Delete all user data in parallel
  await Promise.all([
    Response.deleteMany({ sessionId: { $in: sessionIds } }),
    Question.deleteMany({ sessionId: { $in: sessionIds } }),
    InterviewSession.deleteMany({ userId: user._id }),
    ResumeAnalysis.deleteMany({ userId: user._id }),
    InterviewAnalytics.deleteOne({ userId: user._id }),
    User.findByIdAndDelete(user._id),
  ]);

  return res
    .status(200)
    .clearCookie("token")
    .json(new ApiResponse(200, null, "Account and all associated data deleted successfully"));
});

// ═══════════════════════════════════
//  GET /api/v1/users/dashboard
// ═══════════════════════════════════
const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [
    totalSessions,
    completedSessions,
    inProgressSessions,
    totalResumeAnalyses,
    recentSessions,
    analytics,
  ] = await Promise.all([
    InterviewSession.countDocuments({ userId }),
    InterviewSession.countDocuments({ userId, status: "completed" }),
    InterviewSession.countDocuments({ userId, status: "in-progress" }),
    ResumeAnalysis.countDocuments({ userId }),
    InterviewSession.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("role difficulty status overallScore createdAt completedAt"),
    InterviewAnalytics.findOne({ userId }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        stats: {
          totalSessions,
          completedSessions,
          inProgressSessions,
          totalResumeAnalyses,
          averageScore: analytics?.averageScore || 0,
        },
        recentSessions,
        strongTopics: analytics?.strongTopics || [],
        weakTopics: analytics?.weakTopics || [],
      },
      "Dashboard data fetched successfully"
    )
  );
});

module.exports = { updateProfile, changePassword, deleteAccount, getDashboard };
