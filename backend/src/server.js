import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/database.js";
import typeDefs from "./schemas/index.js";
import resolvers from "./resolvers/index.js";
import { getUser } from "./middleware/auth.js";

// Load environment variables
dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// Connect to MongoDB
connectDB();

// Global CORS middleware for all routes
app.use(cors({
  origin: [
    "http://localhost:3000",     // React web
    "http://localhost:8081",     // Expo web
    "http://localhost:19006",    // Expo dev tools
    "http://localhost:19000",    // Expo dev server
    "exp://localhost:19000",     // Expo development build
    "exp://192.168.1.100:19000", // Expo on local network
    /^http:\/\/.*\.local:.*$/,   // Local network addresses
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

// Start the server
async function startServer() {
  // Ensure we wait for our server to start
  await server.start();

  // Set up our Express middleware for GraphQL
  app.use(
    "/graphql",
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        // Get authenticated user from token
        const user = await getUser(req);
        return {
          user,
        };
      },
    })
  );

  // Basic health check endpoint
  app.get("/", (req, res) => {
    res.json({
      message: "Swipe-able Backend API is running!",
      graphql: "/graphql",
      status: "OK",
    });
  });

  const PORT = process.env.PORT || 4000;

  // Modified server startup
  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));

  console.log(`🚀 Server ready at http://localhost:${PORT}/`);
  console.log(`🚀 GraphQL endpoint ready at http://localhost:${PORT}/graphql`);
}

startServer().catch((error) => {
  console.error("Error starting server:", error);
});
