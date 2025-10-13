import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Middleware to extract and verify JWT token from request
export const getUser = async (req) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return null; // No token provided, user is not authenticated
    }

    // Extract token (format: "Bearer TOKEN")
    const token = authHeader.split(" ")[1];

    if (!token) {
      return null;
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default-secret"
    );

    // Get user from database
    const user = await User.findById(decoded.userId).select("-password");

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  } catch (error) {
    // Token is invalid or expired
    console.error("Authentication error:", error.message);
    return null;
  }
};

// Helper function to require authentication
export const requireAuth = (user) => {
  if (!user) {
    throw new Error("Du måste vara inloggad för att utföra denna åtgärd");
  }
  return user;
};

// Helper function to check if user is admin (for future use)
export const requireAdmin = (user) => {
  requireAuth(user);
  if (!user.isAdmin) {
    throw new Error("Du har inte behörighet att utföra denna åtgärd");
  }
  return user;
};
