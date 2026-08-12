const { Router } = require("express");
const { register, login, logout, getMe } = require("../controllers/auth.controller");
const { verifyJWT } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { registerSchema, loginSchema } = require("../utils/validators");

const router = Router();

// Public routes
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

// Protected routes
router.post("/logout", verifyJWT, logout);
router.get("/me", verifyJWT, getMe);

module.exports = router;
