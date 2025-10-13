import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/swipe-able";

    const conn = await mongoose.connect(mongoURI);

    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on("connected", () => {
  console.log("📄 Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("📄 Mongoose disconnected");
});

// Handle process termination
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("📄 Mongoose connection closed due to app termination");
  process.exit(0);
});

export default connectDB;
