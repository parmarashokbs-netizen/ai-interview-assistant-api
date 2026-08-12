const { Router } = require("express");
const {
  analyzeResume,
  getAnalysis,
  getUserAnalyses,
} = require("../controllers/resume.controller");
const { verifyJWT } = require("../middlewares/auth.middleware");
const { uploadResume, handleMulterError } = require("../middlewares/multer.middleware");

const router = Router();

// All resume routes require authentication
router.use(verifyJWT);

router.post("/analyze", uploadResume, handleMulterError, analyzeResume);
router.get("/", getUserAnalyses);
router.get("/:analysisId", getAnalysis);

module.exports = router;
