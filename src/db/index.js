const mongoose = require("mongoose");
const { DB_name } = require("../../constants.js");

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_name}`);
    console.log("Connected to MongoDB");
    console.log(`HOST: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

module.exports = { connectDB };
