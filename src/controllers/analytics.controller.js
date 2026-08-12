const InterviewSession = require("../models/interviewSession.model");
const Response = require("../models/response.model");
const Question = require("../models/question.model");
const InterviewAnalytics = require("../models/interviewAnalytics.model");
const { ApiError } = require("../utils/ApiError");
const { ApiResponse } = require("../utils/ApiResponse");
const { asyncHandler } = require("../utils/asyncHandler");

// ═══════════════════════════════════
//  GET /api/v1/analytics
// ═══════════════════════════════════
const getAnalytics = asyncHandler(async (req, res) => {
  let analytics = await InterviewAnalytics.findOne({ userId: req.user.id });

  if (!analytics) {
    // Return empty analytics if none exist yet
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          analytics: {
            userId: req.user.id,
            totalInterviews: 0,
            averageScore: 0,
            avgScoreByTopic: {},
            strongTopics: [],
            weakTopics: [],
            progressTrend: [],
          },
        },
        "No analytics data yet. Complete an interview to generate analytics."
      )
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { analytics }, "Analytics fetched successfully"));
});

// ═══════════════════════════════════
//  POST /api/v1/analytics/refresh
// ═══════════════════════════════════
const refreshAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get all completed sessions for this user
  const completedSessions = await InterviewSession.find({
    userId,
    status: "completed",
  }).sort({ completedAt: 1 });

  if (completedSessions.length === 0) {
    throw new ApiError(400, "No completed interview sessions found to compute analytics");
  }

  // ─── Compute: totalInterviews & averageScore ───
  const totalInterviews = completedSessions.length;
  const totalScore = completedSessions.reduce((sum, s) => sum + (s.overallScore || 0), 0);
  const averageScore = Math.round(totalScore / totalInterviews);

  // ─── Compute: avgScoreByTopic ───
  // Gather all responses from completed sessions
  const sessionIds = completedSessions.map((s) => s._id);

  const responses = await Response.find({ sessionId: { $in: sessionIds } });
  const questionIds = responses.map((r) => r.questionId);
  const questions = await Question.find({ _id: { $in: questionIds } });

  // Build a questionId → topic map
  const questionTopicMap = {};
  questions.forEach((q) => {
    questionTopicMap[q._id.toString()] = q.topic || "General";
  });

  // Aggregate scores by topic
  const topicScores = {}; // { topic: { total: number, count: number } }
  responses.forEach((r) => {
    const topic = questionTopicMap[r.questionId.toString()] || "General";
    if (!topicScores[topic]) {
      topicScores[topic] = { total: 0, count: 0 };
    }
    topicScores[topic].total += r.score;
    topicScores[topic].count += 1;
  });

  const avgScoreByTopic = {};
  Object.entries(topicScores).forEach(([topic, { total, count }]) => {
    avgScoreByTopic[topic] = Math.round(total / count);
  });

  // ─── Compute: strongTopics & weakTopics ───
  const STRONG_THRESHOLD = 70;
  const WEAK_THRESHOLD = 50;

  const strongTopics = Object.entries(avgScoreByTopic)
    .filter(([, score]) => score >= STRONG_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic);

  const weakTopics = Object.entries(avgScoreByTopic)
    .filter(([, score]) => score < WEAK_THRESHOLD)
    .sort((a, b) => a[1] - b[1])
    .map(([topic]) => topic);

  // ─── Compute: progressTrend ───
  const progressTrend = completedSessions.map((s) => ({
    date: s.completedAt || s.updatedAt,
    score: s.overallScore || 0,
  }));

  // ─── Upsert the analytics document ───
  const analytics = await InterviewAnalytics.findOneAndUpdate(
    { userId },
    {
      userId,
      totalInterviews,
      averageScore,
      avgScoreByTopic,
      strongTopics,
      weakTopics,
      progressTrend,
      lastUpdatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { analytics }, "Analytics refreshed successfully"));
});

module.exports = { getAnalytics, refreshAnalytics };
