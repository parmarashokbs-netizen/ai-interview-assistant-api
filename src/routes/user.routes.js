const { Router } = require("express");
const {
  updateProfile,
  changePassword,
  deleteAccount,
  getDashboard,
} = require("../controllers/user.controller");
const { verifyJWT } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
} = require("../utils/validators");

const router = Router();

// All user routes require authentication
router.use(verifyJWT);

router.get("/dashboard", getDashboard);
router.patch("/profile", validate(updateProfileSchema), updateProfile);
router.patch("/change-password", validate(changePasswordSchema), changePassword);
router.delete("/account", validate(deleteAccountSchema), deleteAccount);

module.exports = router;
