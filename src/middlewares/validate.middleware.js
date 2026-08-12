const { ApiError } = require("../utils/ApiError");

// ═══════════════════════════════════
//  Zod Validation Middleware
//  Validates req.body against a Zod schema.
//  Usage in routes: validate(myZodSchema)
//
//  Example:
//    const { z } = require("zod");
//    const loginSchema = z.object({
//      email: z.string().email(),
//      password: z.string().min(6),
//    });
//    router.post("/login", validate(loginSchema), loginController);
// ═══════════════════════════════════
const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Extract readable error messages from Zod
      const errorMessages = result.error.issues.map((issue) => {
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        return `${path}${issue.message}`;
      });

      throw new ApiError(400, "Validation failed", errorMessages);
    }

    // Replace req.body with the parsed (and transformed) data
    // This ensures defaults and transforms from the schema are applied
    req.body = result.data;
    next();
  };
};

module.exports = { validate };
