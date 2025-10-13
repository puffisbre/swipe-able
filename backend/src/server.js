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

  // Set up our Express middleware to handle CORS, body parsing,
  // and our expressMiddleware function
  app.use(
    "/graphql",
    cors({
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      credentials: true,
    }),
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
