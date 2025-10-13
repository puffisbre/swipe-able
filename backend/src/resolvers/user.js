import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "default-secret", {
    expiresIn: "7d",
  });
};

// Helper function to verify authentication
const requireAuth = (user) => {
  if (!user) {
    throw new Error("Du måste vara inloggad för att utföra denna åtgärd");
  }
  return user;
};

const userResolvers = {
  Query: {
    me: async (_, __, { user }) => {
      requireAuth(user);
      return await User.findById(user.id)
        .populate(
          "friends",
          "username firstName lastName profileImage friendCode"
        )
        .populate(
          "friendRequests.from",
          "username firstName lastName profileImage friendCode"
        );
    },

    getUserByFriendCode: async (_, { friendCode }) => {
      const user = await User.findByFriendCode(friendCode);
      if (!user) {
        throw new Error("Ingen användare hittades med den vänkoden");
      }
      return user;
    },

    myFriends: async (_, __, { user }) => {
      requireAuth(user);
      const currentUser = await User.findById(user.id).populate(
        "friends",
        "username firstName lastName profileImage friendCode lastLogin"
      );
      return currentUser.friends;
    },

    myFriendRequests: async (_, __, { user }) => {
      requireAuth(user);
      const currentUser = await User.findById(user.id).populate(
        "friendRequests.from",
        "username firstName lastName profileImage friendCode"
      );
      return currentUser.friendRequests.filter(
        (req) => req.status === "pending"
      );
    },
  },

  Mutation: {
    register: async (_, { input }) => {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({
          $or: [
            { email: input.email.toLowerCase() },
            { username: input.username },
          ],
        });

        if (existingUser) {
          throw new Error(
            "En användare med denna email eller användarnamn existerar redan"
          );
        }

        // Create new user
        const user = new User({
          ...input,
          email: input.email.toLowerCase(),
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        return {
          token,
          user,
        };
      } catch (error) {
        throw new Error(`Registrering misslyckades: ${error.message}`);
      }
    },

    login: async (_, { input }) => {
      try {
        // Find user by email
        const user = await User.findOne({ email: input.email.toLowerCase() });
        if (!user) {
          throw new Error("Felaktig email eller lösenord");
        }

        // Check password
        const isValidPassword = await user.comparePassword(input.password);
        if (!isValidPassword) {
          throw new Error("Felaktig email eller lösenord");
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        return {
          token,
          user,
        };
      } catch (error) {
        throw new Error(`Inloggning misslyckades: ${error.message}`);
      }
    },

    logout: async (_, __, { user }) => {
      requireAuth(user);
      // In a stateless JWT system, logout is handled client-side by removing the token
      // You could implement a token blacklist here if needed
      return true;
    },

    updateProfile: async (_, { input }, { user }) => {
      try {
        requireAuth(user);

        const updatedUser = await User.findByIdAndUpdate(
          user.id,
          { ...input, updatedAt: new Date() },
          { new: true, runValidators: true }
        );

        return updatedUser;
      } catch (error) {
        throw new Error(`Profiluppdatering misslyckades: ${error.message}`);
      }
    },

    sendFriendRequest: async (_, { friendCode }, { user }) => {
      try {
        requireAuth(user);

        // Find target user by friend code
        const targetUser = await User.findByFriendCode(friendCode);
        if (!targetUser) {
          throw new Error("Ingen användare hittades med den vänkoden");
        }

        // Check if trying to add themselves
        if (targetUser._id.toString() === user.id) {
          throw new Error("Du kan inte lägga till dig själv som vän");
        }

        // Check if already friends
        const currentUser = await User.findById(user.id);
        if (currentUser.friends.includes(targetUser._id)) {
          throw new Error("Ni är redan vänner");
        }

        // Check if request already exists
        const existingRequest = targetUser.friendRequests.find(
          (req) => req.from.toString() === user.id && req.status === "pending"
        );
        if (existingRequest) {
          throw new Error("En vänförfrågan har redan skickats");
        }

        // Add friend request
        targetUser.friendRequests.push({
          from: user.id,
          status: "pending",
        });

        await targetUser.save();
        return true;
      } catch (error) {
        throw new Error(`Kunde inte skicka vänförfrågan: ${error.message}`);
      }
    },

    respondToFriendRequest: async (_, { requestId, accept }, { user }) => {
      try {
        requireAuth(user);

        const currentUser = await User.findById(user.id);
        const requestIndex = currentUser.friendRequests.findIndex(
          (req) => req._id.toString() === requestId
        );

        if (requestIndex === -1) {
          throw new Error("Vänförfrågan hittades inte");
        }

        const request = currentUser.friendRequests[requestIndex];

        if (accept) {
          // Add each other as friends
          currentUser.friends.push(request.from);
          const requestSender = await User.findById(request.from);
          requestSender.friends.push(user.id);

          await requestSender.save();
          request.status = "accepted";
        } else {
          request.status = "declined";
        }

        // Remove the request from pending
        currentUser.friendRequests.splice(requestIndex, 1);
        await currentUser.save();

        return true;
      } catch (error) {
        throw new Error(`Kunde inte svara på vänförfrågan: ${error.message}`);
      }
    },

    removeFriend: async (_, { friendId }, { user }) => {
      try {
        requireAuth(user);

        // Remove friend from current user's friends list
        const currentUser = await User.findById(user.id);
        currentUser.friends = currentUser.friends.filter(
          (friend) => friend.toString() !== friendId
        );

        // Remove current user from friend's friends list
        const friend = await User.findById(friendId);
        if (friend) {
          friend.friends = friend.friends.filter(
            (f) => f.toString() !== user.id
          );
          await friend.save();
        }

        await currentUser.save();
        return true;
      } catch (error) {
        throw new Error(`Kunde inte ta bort vän: ${error.message}`);
      }
    },
  },
};

export default userResolvers;
