import restaurantTypeDefs from "./restaurant.js";
import userTypeDefs from "./user.js";
import movieTypeDefs from "./movie.js";
import favoriteTypeDefs from "./favorite.js";

// Combine all type definitions
const typeDefs = [
  restaurantTypeDefs,
  userTypeDefs,
  movieTypeDefs,
  favoriteTypeDefs,
];

export default typeDefs;
