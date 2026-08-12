const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const ResumeAnalysis = require("../models/resumeAnalysis.model");
const { ApiError } = require("../utils/ApiError");
const { ApiResponse } = require("../utils/ApiResponse");
const { asyncHandler } = require("../utils/asyncHandler");

// ─── Initialize Gemini AI ───
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// ─── Helper: Extract text from PDF buffer ───
const extractTextFromPDF = async (buffer) => {
  // Use pdf-parse to extract text from the uploaded PDF
  const { PDFParse } = require("pdf-parse");

  try {
    const parser = new PDFParse({ verbosity: 0 });
    await parser.load({ data: new Uint8Array(buffer) });
    const info = await parser.getInfo();
    let fullText = "";
    for (let i = 1; i <= info.numPages; i++) {
      const pageText = await parser.getText(i);
      fullText += pageText + "\n";
    }
    return fullText.trim();
  } catch (error) {
    // Fallback: try reading the buffer as text directly
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

// ─── Helper: Analyze resume via Gemini ───
const analyzeResumeWithAI = async (resumeText, targetRole) => {
  const prompt = `You are an expert HR recruiter and ATS (Applicant Tracking System) specialist.

Analyze the following resume text and provide a detailed analysis.
${targetRole ? `The candidate is targeting a "${targetRole}" role.` : ""}

Resume Text:
"""
${resumeText}
"""

Return ONLY a valid JSON object (no markdown, no code fences, no extra text):
{
  "extractedSkills": ["skill1", "skill2", "skill3"],
  "skillGaps": ["missing skill 1", "missing skill 2"],
  "atsScore": <number between 0 and 100>,
  "recommendations": [
    "Specific recommendation 1 to improve the resume",
    "Specific recommendation 2 to improve the resume"
  ]
}

ATS Score Guide:
- 0-30: Poor formatting, missing key sections, not ATS-friendly
- 31-50: Basic structure but missing important keywords and sections
- 51-70: Decent resume with room for keyword optimization
- 71-85: Well-structured, good keywords, minor improvements needed
- 86-100: Excellent ATS-optimized resume

Be specific and actionable in your recommendations. Extract ALL identifiable technical and soft skills.`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  let cleaned = responseText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(cleaned);
};

// ═══════════════════════════════════
//  POST /api/v1/resume/analyze
// ═══════════════════════════════════
const analyzeResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Please upload a PDF resume file");
  }

  const { targetRole } = req.body;

  // Extract text from the uploaded PDF
  let extractedText;
  try {
    extractedText = await extractTextFromPDF(req.file.buffer);
  } catch (error) {
    throw new ApiError(422, `Could not read the PDF file: ${error.message}`);
  }

  if (!extractedText || extractedText.trim().length < 50) {
    throw new ApiError(
      422,
      "Could not extract meaningful text from the PDF. Ensure the file is not scanned/image-based."
    );
  }

  // Analyze with Gemini AI
  let analysis;
  try {
    analysis = await analyzeResumeWithAI(extractedText, targetRole);
  } catch (error) {
    throw new ApiError(500, `AI analysis failed: ${error.message}`);
  }

  // Save the analysis
  const resumeAnalysis = await ResumeAnalysis.create({
    userId: req.user.id,
    originalFileName: req.file.originalname,
    fileType: path.extname(req.file.originalname).replace(".", "") || "pdf",
    fileSize: req.file.size,
    extractedText,
    extractedSkills: analysis.extractedSkills || [],
    skillGaps: analysis.skillGaps || [],
    atsScore: Math.min(100, Math.max(0, analysis.atsScore)),
    recommendations: analysis.recommendations || [],
    analyzedAt: new Date(),
  });

  return res
    .status(201)
    .json(
      new ApiResponse(201, { analysis: resumeAnalysis }, "Resume analyzed successfully")
    );
});

// ═══════════════════════════════════
//  GET /api/v1/resume/:analysisId
// ═══════════════════════════════════
const getAnalysis = asyncHandler(async (req, res) => {
  const { analysisId } = req.params;

  const analysis = await ResumeAnalysis.findOne({
    _id: analysisId,
    userId: req.user.id,
  });

  if (!analysis) {
    throw new ApiError(404, "Resume analysis not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { analysis }, "Resume analysis fetched successfully"));
});

// ═══════════════════════════════════
//  GET /api/v1/resume
// ═══════════════════════════════════
const getUserAnalyses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [analyses, total] = await Promise.all([
    ResumeAnalysis.find({ userId: req.user.id })
      .select("-extractedText") // Exclude large text field from listing
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    ResumeAnalysis.countDocuments({ userId: req.user.id }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        analyses,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
      "Resume analyses fetched successfully"
    )
  );
});

module.exports = { analyzeResume, getAnalysis, getUserAnalyses };
