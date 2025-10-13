import Restaurant from "../models/Restaurant.js";

const restaurantResolvers = {
  Query: {
    restaurants: async () => {
      try {
        return await Restaurant.find({ isActive: true }).sort({
          createdAt: -1,
        });
      } catch (error) {
        throw new Error(`Failed to fetch restaurants: ${error.message}`);
      }
    },

    restaurant: async (_, { id }) => {
      try {
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
          throw new Error("Restaurant not found");
        }
        return restaurant;
      } catch (error) {
        throw new Error(`Failed to fetch restaurant: ${error.message}`);
      }
    },

    restaurantsByCuisine: async (_, { cuisine }) => {
      try {
        return await Restaurant.find({
          cuisine: { $regex: cuisine, $options: "i" },
          isActive: true,
        }).sort({ rating: -1 });
      } catch (error) {
        throw new Error(
          `Failed to fetch restaurants by cuisine: ${error.message}`
        );
      }
    },

    restaurantsByPriceRange: async (_, { priceRange }) => {
      try {
        return await Restaurant.find({
          priceRange,
          isActive: true,
        }).sort({ rating: -1 });
      } catch (error) {
        throw new Error(
          `Failed to fetch restaurants by price range: ${error.message}`
        );
      }
    },
  },

  Mutation: {
    createRestaurant: async (_, { input }) => {
      try {
        const restaurant = new Restaurant(input);
        return await restaurant.save();
      } catch (error) {
        throw new Error(`Failed to create restaurant: ${error.message}`);
      }
    },

    updateRestaurant: async (_, { id, input }) => {
      try {
        const restaurant = await Restaurant.findByIdAndUpdate(
          id,
          { ...input, updatedAt: new Date() },
          { new: true, runValidators: true }
        );
        if (!restaurant) {
          throw new Error("Restaurant not found");
        }
        return restaurant;
      } catch (error) {
        throw new Error(`Failed to update restaurant: ${error.message}`);
      }
    },

    deleteRestaurant: async (_, { id }) => {
      try {
        const restaurant = await Restaurant.findByIdAndUpdate(
          id,
          { isActive: false },
          { new: true }
        );
        return !!restaurant;
      } catch (error) {
        throw new Error(`Failed to delete restaurant: ${error.message}`);
      }
    },
  },
};

export default restaurantResolvers;
