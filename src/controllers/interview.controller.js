const { GoogleGenerativeAI } = require("@google/generative-ai");
const InterviewSession = require("../models/interviewSession.model");
const Question = require("../models/question.model");
const Response = require("../models/response.model");
const { ApiError } = require("../utils/ApiError");
const { ApiResponse } = require("../utils/ApiResponse");
const { asyncHandler } = require("../utils/asyncHandler");

// ─── Initialize Gemini AI ───
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// ─── Helper: Generate interview questions via Gemini ───
const generateQuestions = async (role, difficulty, numQuestions = 5) => {
  const prompt = `You are an expert technical interviewer. Generate exactly ${numQuestions} interview questions for a "${role}" position at "${difficulty}" difficulty level.

Return ONLY a valid JSON array with this exact structure (no markdown, no code fences, no extra text):
[
  {
    "text": "The interview question",
    "type": "technical | behavioral | hr",
    "topic": "The specific topic area (e.g., React, System Design, Leadership)"
  }
]

Requirements:
- Mix question types: include technical, behavioral, and hr questions
- Questions should be appropriate for the "${difficulty}" difficulty level
- Each question should be clear, specific, and professional
- Topics should be relevant to the "${role}" role`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Parse the JSON response (handle potential markdown code fences)
  let cleaned = responseText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const questions = JSON.parse(cleaned);

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("AI returned invalid question format");
  }

  return questions;
};

// ─── Helper: Evaluate an answer via Gemini ───
const evaluateAnswer = async (questionText, answerText, role, difficulty) => {
  const prompt = `You are an expert interviewer evaluating a candidate's answer.

Role: ${role}
Difficulty: ${difficulty}
Question: "${questionText}"
Candidate's Answer: "${answerText}"

Evaluate the answer and return ONLY a valid JSON object (no markdown, no code fences, no extra text):
{
  "score": <number between 0 and 100>,
  "aiFeedback": "<detailed feedback on the answer — what was good, what was missing, how to improve>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement suggestion 1>", "<improvement suggestion 2>"]
}

Scoring guide:
- 0-20: Very poor / irrelevant answer
- 21-40: Below average, major gaps
- 41-60: Average, covers basics but lacks depth
- 61-80: Good, solid understanding with minor gaps
- 81-100: Excellent, comprehensive and insightful`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  let cleaned = responseText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const evaluation = JSON.parse(cleaned);
  return evaluation;
};

// ═══════════════════════════════════
//  POST /api/v1/interviews/start
// ═══════════════════════════════════
const startSession = asyncHandler(async (req, res) => {
  const { role, difficulty } = req.body;

  if (!role || !difficulty) {
    throw new ApiError(400, "Role and difficulty are required");
  }

  const validDifficulties = ["easy", "medium", "hard"];
  if (!validDifficulties.includes(difficulty)) {
    throw new ApiError(400, "Difficulty must be one of: easy, medium, hard");
  }

  // Create the session
  const session = await InterviewSession.create({
    userId: req.user.id,
    role,
    difficulty,
    status: "in-progress",
    startedAt: new Date(),
  });

  // Generate questions using Gemini AI
  let aiQuestions;
  try {
    aiQuestions = await generateQuestions(role, difficulty);
  } catch (error) {
    // If AI fails, cancel the session and throw
    await InterviewSession.findByIdAndDelete(session._id);
    throw new ApiError(500, `Failed to generate questions: ${error.message}`);
  }

  // Save questions to DB
  const questionDocs = await Question.insertMany(
    aiQuestions.map((q, index) => ({
      sessionId: session._id,
      text: q.text,
      type: q.type || "technical",
      topic: q.topic || "General",
      order: index + 1,
      generatedBy: "ai",
    }))
  );

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { session, questions: questionDocs },
        "Interview session started successfully"
      )
    );
});

// ═══════════════════════════════════
//  GET /api/v1/interviews/:sessionId
// ═══════════════════════════════════
const getSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await InterviewSession.findOne({
    _id: sessionId,
    userId: req.user.id,
  });

  if (!session) {
    throw new ApiError(404, "Interview session not found");
  }

  // Get questions for this session
  const questions = await Question.find({ sessionId: session._id }).sort({ order: 1 });

  // Get responses for this session
  const responses = await Response.find({ sessionId: session._id });

  // Map responses to their question IDs for easy lookup
  const responseMap = {};
  responses.forEach((r) => {
    responseMap[r.questionId.toString()] = r;
  });

  // Combine questions with their responses
  const questionsWithResponses = questions.map((q) => ({
    ...q.toObject(),
    response: responseMap[q._id.toString()] || null,
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { session, questions: questionsWithResponses },
        "Session details fetched successfully"
      )
    );
});

// ═══════════════════════════════════
//  GET /api/v1/interviews
// ═══════════════════════════════════
const getUserSessions = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = { userId: req.user.id };
  if (status) {
    filter.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [sessions, total] = await Promise.all([
    InterviewSession.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    InterviewSession.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        sessions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
      "Sessions fetched successfully"
    )
  );
});

// ═══════════════════════════════════
//  POST /api/v1/interviews/:sessionId/answer
// ═══════════════════════════════════
const submitAnswer = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { questionId, answerText } = req.body;

  if (!questionId || !answerText) {
    throw new ApiError(400, "questionId and answerText are required");
  }

  // Verify session belongs to user and is in-progress
  const session = await InterviewSession.findOne({
    _id: sessionId,
    userId: req.user.id,
    status: "in-progress",
  });

  if (!session) {
    throw new ApiError(404, "Active interview session not found");
  }

  // Verify question belongs to this session
  const question = await Question.findOne({
    _id: questionId,
    sessionId: session._id,
  });

  if (!question) {
    throw new ApiError(404, "Question not found in this session");
  }

  // Check if already answered
  const existingResponse = await Response.findOne({
    sessionId: session._id,
    questionId: question._id,
  });

  if (existingResponse) {
    throw new ApiError(409, "This question has already been answered");
  }

  // Evaluate the answer using Gemini AI
  let evaluation;
  try {
    evaluation = await evaluateAnswer(
      question.text,
      answerText,
      session.role,
      session.difficulty
    );
  } catch (error) {
    throw new ApiError(500, `Failed to evaluate answer: ${error.message}`);
  }

  // Save the response
  const response = await Response.create({
    sessionId: session._id,
    questionId: question._id,
    answerText,
    score: Math.min(100, Math.max(0, evaluation.score)),
    aiFeedback: evaluation.aiFeedback,
    strengths: evaluation.strengths || [],
    improvements: evaluation.improvements || [],
    submittedAt: new Date(),
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { response }, "Answer submitted and evaluated successfully"));
});

// ═══════════════════════════════════
//  PATCH /api/v1/interviews/:sessionId/complete
// ═══════════════════════════════════
const completeSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await InterviewSession.findOne({
    _id: sessionId,
    userId: req.user.id,
    status: "in-progress",
  });

  if (!session) {
    throw new ApiError(404, "Active interview session not found");
  }

  // Calculate overall score from all responses
  const responses = await Response.find({ sessionId: session._id });

  if (responses.length === 0) {
    throw new ApiError(400, "Cannot complete session with no answers submitted");
  }

  const totalScore = responses.reduce((sum, r) => sum + r.score, 0);
  const overallScore = Math.round(totalScore / responses.length);

  // Update session
  session.status = "completed";
  session.completedAt = new Date();
  session.overallScore = overallScore;
  await session.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { session, totalAnswered: responses.length, overallScore },
        "Interview session completed successfully"
      )
    );
});

// ═══════════════════════════════════
//  PATCH /api/v1/interviews/:sessionId/cancel
// ═══════════════════════════════════
const cancelSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await InterviewSession.findOne({
    _id: sessionId,
    userId: req.user.id,
    status: "in-progress",
  });

  if (!session) {
    throw new ApiError(404, "Active interview session not found");
  }

  session.status = "cancelled";
  await session.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { session }, "Interview session cancelled"));
});

module.exports = {
  startSession,
  getSession,
  getUserSessions,
  submitAnswer,
  completeSession,
  cancelSession,
};
