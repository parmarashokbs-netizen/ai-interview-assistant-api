require("dotenv").config({ path: "./src/.env" });

const { app } = require("./app");
const { connectDB } = require("./src/db/index");

const PORT = process.env.PORT || 8000;

// ─── Connect to MongoDB, then start the server ───
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n⚡ Server is running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/v1/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}\n`);
    });
  })
  .catch((error) => {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  });
