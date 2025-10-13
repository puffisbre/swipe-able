import mongoose from "mongoose";

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  genre: [
    {
      type: String,
      required: true,
    },
  ],
  director: {
    type: String,
    required: true,
  },
  actors: [
    {
      type: String,
    },
  ],
  releaseYear: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear() + 5,
  },
  duration: {
    type: Number, // minutes
    required: true,
  },
  rating: {
    type: Number,
    min: 0,
    max: 10,
    default: 0,
  },
  imdbId: {
    type: String,
    unique: true,
    sparse: true,
  },
  tmdbId: {
    type: String,
    unique: true,
    sparse: true,
  },
  posterUrl: {
    type: String,
    default: null,
  },
  trailerUrl: {
    type: String,
    default: null,
  },
  language: {
    type: String,
    default: "en",
  },
  country: {
    type: String,
    default: "US",
  },
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
movieSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better search performance
movieSchema.index({
  title: "text",
  description: "text",
  genre: "text",
  director: "text",
});
movieSchema.index({ genre: 1 });
movieSchema.index({ releaseYear: 1 });
movieSchema.index({ rating: -1 });

const Movie = mongoose.model("Movie", movieSchema);

export default Movie;
