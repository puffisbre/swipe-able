import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  itemType: {
    type: String,
    enum: ["restaurant", "movie"],
    required: true,
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "itemModel",
  },
  itemModel: {
    type: String,
    required: true,
    enum: ["Restaurant", "Movie"],
  },
  notes: {
    type: String,
    maxlength: 500,
    default: null,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
  dateVisited: {
    type: Date,
    default: null,
  },
  isWishlist: {
    type: Boolean,
    default: false, // false = been there/seen it, true = want to go/want to see
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

// Compound index to ensure a user can't favorite the same item twice
favoriteSchema.index({ user: 1, itemId: 1, itemType: 1 }, { unique: true });

// Index for better query performance
favoriteSchema.index({ user: 1, itemType: 1 });
favoriteSchema.index({ user: 1, isWishlist: 1 });

// Update the updatedAt field before saving
favoriteSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  // Set itemModel based on itemType
  if (this.itemType === "restaurant") {
    this.itemModel = "Restaurant";
  } else if (this.itemType === "movie") {
    this.itemModel = "Movie";
  }

  next();
});

// Static method to get user's favorites by type
favoriteSchema.statics.getUserFavorites = function (
  userId,
  itemType,
  isWishlist = null
) {
  const query = { user: userId, itemType };
  if (isWishlist !== null) {
    query.isWishlist = isWishlist;
  }
  return this.find(query).populate("itemId").sort({ createdAt: -1 });
};

// Static method to check if item is favorited by user
favoriteSchema.statics.isFavorited = function (userId, itemId, itemType) {
  return this.findOne({ user: userId, itemId, itemType });
};

const Favorite = mongoose.model("Favorite", favoriteSchema);

export default Favorite;
