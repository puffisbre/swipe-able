import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please enter a valid email",
    ],
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  profileImage: {
    type: String,
    default: null,
  },
  friendCode: {
    type: String,
    unique: true,
    sparse: true, // Allows null values for unique index
  },
  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  friendRequests: [
    {
      from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      status: {
        type: String,
        enum: ["pending", "accepted", "declined"],
        default: "pending",
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  favorites: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Favorite",
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Generate unique friend code before saving
userSchema.pre("save", async function (next) {
  try {
    if (!this.friendCode) {
      this.friendCode = await generateUniqueFriendCode(this.constructor);
    }

    // Hash password if it's modified
    if (this.isModified("password")) {
      this.password = await bcrypt.hash(this.password, 12);
    }

    this.updatedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Generate a unique 8-character friend code
async function generateUniqueFriendCode(UserModel) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let friendCode;
  let isUnique = false;

  while (!isUnique) {
    friendCode = "";
    for (let i = 0; i < 8; i++) {
      friendCode += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    // Check if this code already exists
    const existingUser = await UserModel.findOne({ friendCode });
    if (!existingUser) {
      isUnique = true;
    }
  }

  return friendCode;
}

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Static method to find user by friend code
userSchema.statics.findByFriendCode = function (friendCode) {
  return this.findOne({ friendCode: friendCode.toUpperCase() });
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model("User", userSchema);

export default User;
