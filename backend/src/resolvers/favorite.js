import Favorite from "../models/Favorite.js";
import Restaurant from "../models/Restaurant.js";
import Movie from "../models/Movie.js";

const favoriteResolvers = {
  Query: {
    myFavorites: async (_, { itemType, isWishlist }, { user }) => {
      try {
        if (!user) {
          throw new Error("Du måste vara inloggad för att se dina favoriter");
        }

        return await Favorite.getUserFavorites(user.id, itemType, isWishlist);
      } catch (error) {
        throw new Error(`Kunde inte hämta favoriter: ${error.message}`);
      }
    },

    getFavorite: async (_, { itemId, itemType }, { user }) => {
      try {
        if (!user) {
          throw new Error("Du måste vara inloggad");
        }

        return await Favorite.isFavorited(user.id, itemId, itemType);
      } catch (error) {
        throw new Error(`Kunde inte kontrollera favorit: ${error.message}`);
      }
    },
  },

  Mutation: {
    addToFavorites: async (_, { input }, { user }) => {
      try {
        if (!user) {
          throw new Error(
            "Du måste vara inloggad för att lägga till favoriter"
          );
        }

        // Check if item exists
        const Model = input.itemType === "restaurant" ? Restaurant : Movie;
        const item = await Model.findById(input.itemId);
        if (!item) {
          throw new Error(
            `${
              input.itemType === "restaurant" ? "Restaurang" : "Film"
            } hittades inte`
          );
        }

        // Check if already favorited
        const existingFavorite = await Favorite.isFavorited(
          user.id,
          input.itemId,
          input.itemType
        );
        if (existingFavorite) {
          throw new Error("Redan tillagd som favorit");
        }

        const favorite = new Favorite({
          user: user.id,
          itemId: input.itemId,
          itemType: input.itemType,
          notes: input.notes,
          rating: input.rating,
          tags: input.tags,
          dateVisited: input.dateVisited,
          isWishlist: input.isWishlist || false,
        });

        const savedFavorite = await favorite.save();
        return await Favorite.findById(savedFavorite._id).populate("itemId");
      } catch (error) {
        throw new Error(`Kunde inte lägga till favorit: ${error.message}`);
      }
    },

    updateFavorite: async (_, { id, input }, { user }) => {
      try {
        if (!user) {
          throw new Error("Du måste vara inloggad");
        }

        const favorite = await Favorite.findOne({ _id: id, user: user.id });
        if (!favorite) {
          throw new Error("Favorit hittades inte");
        }

        const updatedFavorite = await Favorite.findByIdAndUpdate(
          id,
          { ...input, updatedAt: new Date() },
          { new: true, runValidators: true }
        ).populate("itemId");

        return updatedFavorite;
      } catch (error) {
        throw new Error(`Kunde inte uppdatera favorit: ${error.message}`);
      }
    },

    removeFromFavorites: async (_, { id }, { user }) => {
      try {
        if (!user) {
          throw new Error("Du måste vara inloggad");
        }

        const favorite = await Favorite.findOneAndDelete({
          _id: id,
          user: user.id,
        });
        return !!favorite;
      } catch (error) {
        throw new Error(`Kunde inte ta bort favorit: ${error.message}`);
      }
    },
  },

  // Union type resolver for FavoriteItem
  FavoriteItem: {
    __resolveType(obj) {
      if (obj.cuisine) {
        return "Restaurant";
      }
      if (obj.director) {
        return "Movie";
      }
      return null;
    },
  },

  // Field resolver for Favorite.item
  Favorite: {
    item: async (favorite) => {
      return favorite.itemId;
    },
    user: async (favorite) => {
      return await favorite.populate("user");
    },
  },
};

export default favoriteResolvers;
