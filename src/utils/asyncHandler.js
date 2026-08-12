/**
 * Wraps an async route handler to automatically catch errors
 * and pass them to Express error-handling middleware.
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = { asyncHandler };
