import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  cuisine: {
    type: String,
    required: true,
  },
  address: {
    street: String,
    city: String,
    zipCode: String,
    country: String,
  },
  location: {
    latitude: Number,
    longitude: Number,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  priceRange: {
    type: String,
    enum: ["$", "$$", "$$$", "$$$$"],
    required: true,
  },
  images: [
    {
      url: String,
      alt: String,
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
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

// Update the updatedAt field before saving
restaurantSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Restaurant = mongoose.model("Restaurant", restaurantSchema);

export default Restaurant;
