const { z } = require("zod");

// ─── Auth Schemas ───

const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .trim(),
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format")
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be at most 100 characters"),
  targetRole: z.string().trim().optional(),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format")
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

// ─── Interview Schemas ───

const startSessionSchema = z.object({
  role: z
    .string({ required_error: "Role is required" })
    .min(2, "Role must be at least 2 characters")
    .max(100, "Role must be at most 100 characters")
    .trim(),
  difficulty: z.enum(["easy", "medium", "hard"], {
    required_error: "Difficulty is required",
    invalid_type_error: "Difficulty must be one of: easy, medium, hard",
  }),
});

const submitAnswerSchema = z.object({
  questionId: z
    .string({ required_error: "questionId is required" })
    .min(1, "questionId is required"),
  answerText: z
    .string({ required_error: "answerText is required" })
    .min(1, "Answer cannot be empty")
    .max(5000, "Answer must be at most 5000 characters"),
});

// ─── User Schemas ───

const updateProfileSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be at most 50 characters")
      .trim()
      .optional(),
    targetRole: z.string().trim().optional(),
  })
  .refine((data) => data.name || data.targetRole, {
    message: "Provide at least one field to update (name or targetRole)",
  });

const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: "Current password is required" })
    .min(1, "Current password is required"),
  newPassword: z
    .string({ required_error: "New password is required" })
    .min(6, "New password must be at least 6 characters")
    .max(100, "New password must be at most 100 characters"),
});

const deleteAccountSchema = z.object({
  password: z
    .string({ required_error: "Password is required to confirm deletion" })
    .min(1, "Password is required"),
});

module.exports = {
  registerSchema,
  loginSchema,
  startSessionSchema,
  submitAnswerSchema,
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
};
