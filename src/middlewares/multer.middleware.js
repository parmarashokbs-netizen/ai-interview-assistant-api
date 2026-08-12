const multer = require("multer");
const { ApiError } = require("../utils/ApiError");

// ═══════════════════════════════════
//  Multer Configuration for Resume Uploads
//  - Stores files in memory (Buffer) for direct processing
//  - Limits file size to 5MB
//  - Only allows PDF files
// ═══════════════════════════════════

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept only PDF files
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new ApiError(400, "Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
    files: 1, // Only 1 file per request
  },
});

// Pre-built middleware for single resume upload
// Usage in routes: uploadResume, then the controller
const uploadResume = upload.single("resume");

// Wrapper to handle multer errors gracefully
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(new ApiError(400, "File size exceeds the 5MB limit"));
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return next(new ApiError(400, "Only one file can be uploaded at a time"));
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return next(new ApiError(400, "Unexpected field name. Use 'resume' as the field name"));
    }
    return next(new ApiError(400, `Upload error: ${err.message}`));
  }
  next(err);
};

module.exports = { uploadResume, handleMulterError };
