const { Router } = require("express");
const {
  startSession,
  getSession,
  getUserSessions,
  submitAnswer,
  completeSession,
  cancelSession,
} = require("../controllers/interview.controller");
const { verifyJWT } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { startSessionSchema, submitAnswerSchema } = require("../utils/validators");

const router = Router();

// All interview routes require authentication
router.use(verifyJWT);

router.post("/start", validate(startSessionSchema), startSession);
router.get("/", getUserSessions);
router.get("/:sessionId", getSession);
router.post("/:sessionId/answer", validate(submitAnswerSchema), submitAnswer);
router.patch("/:sessionId/complete", completeSession);
router.patch("/:sessionId/cancel", cancelSession);

module.exports = router;
