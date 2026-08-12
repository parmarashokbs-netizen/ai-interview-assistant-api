const { Router } = require("express");
const { getAnalytics, refreshAnalytics } = require("../controllers/analytics.controller");
const { verifyJWT } = require("../middlewares/auth.middleware");

const router = Router();

// All analytics routes require authentication
router.use(verifyJWT);

router.get("/", getAnalytics);
router.post("/refresh", refreshAnalytics);

module.exports = router;
