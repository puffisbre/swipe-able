import restaurantResolvers from "./restaurant.js";
import userResolvers from "./user.js";
import movieResolvers from "./movie.js";
import favoriteResolvers from "./favorite.js";

// Combine all resolvers
const resolvers = {
  Query: {
    ...restaurantResolvers.Query,
    ...userResolvers.Query,
    ...movieResolvers.Query,
    ...favoriteResolvers.Query,
  },
  Mutation: {
    ...restaurantResolvers.Mutation,
    ...userResolvers.Mutation,
    ...movieResolvers.Mutation,
    ...favoriteResolvers.Mutation,
  },
  // Union and custom field resolvers
  FavoriteItem: favoriteResolvers.FavoriteItem,
  Favorite: favoriteResolvers.Favorite,
};

export default resolvers;
