import Movie from "../models/Movie.js";

const movieResolvers = {
  Query: {
    movies: async () => {
      try {
        return await Movie.find({ isActive: true }).sort({ createdAt: -1 });
      } catch (error) {
        throw new Error(`Kunde inte hämta filmer: ${error.message}`);
      }
    },

    movie: async (_, { id }) => {
      try {
        const movie = await Movie.findById(id);
        if (!movie) {
          throw new Error("Film hittades inte");
        }
        return movie;
      } catch (error) {
        throw new Error(`Kunde inte hämta film: ${error.message}`);
      }
    },

    moviesByGenre: async (_, { genre }) => {
      try {
        return await Movie.find({
          genre: { $regex: genre, $options: "i" },
          isActive: true,
        }).sort({ rating: -1 });
      } catch (error) {
        throw new Error(
          `Kunde inte hämta filmer efter genre: ${error.message}`
        );
      }
    },

    moviesByYear: async (_, { year }) => {
      try {
        return await Movie.find({
          releaseYear: year,
          isActive: true,
        }).sort({ rating: -1 });
      } catch (error) {
        throw new Error(`Kunde inte hämta filmer efter år: ${error.message}`);
      }
    },

    searchMovies: async (_, { query }) => {
      try {
        return await Movie.find({
          $and: [
            { isActive: true },
            {
              $or: [
                { title: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } },
                { director: { $regex: query, $options: "i" } },
                { actors: { $regex: query, $options: "i" } },
                { genre: { $regex: query, $options: "i" } },
              ],
            },
          ],
        }).sort({ rating: -1 });
      } catch (error) {
        throw new Error(`Sökning misslyckades: ${error.message}`);
      }
    },
  },

  Mutation: {
    createMovie: async (_, { input }, { user }) => {
      try {
        // Only allow authenticated users to create movies (you might want admin-only)
        if (!user) {
          throw new Error("Du måste vara inloggad för att skapa filmer");
        }

        const movie = new Movie(input);
        return await movie.save();
      } catch (error) {
        throw new Error(`Kunde inte skapa film: ${error.message}`);
      }
    },

    updateMovie: async (_, { id, input }, { user }) => {
      try {
        if (!user) {
          throw new Error("Du måste vara inloggad för att uppdatera filmer");
        }

        const movie = await Movie.findByIdAndUpdate(
          id,
          { ...input, updatedAt: new Date() },
          { new: true, runValidators: true }
        );

        if (!movie) {
          throw new Error("Film hittades inte");
        }

        return movie;
      } catch (error) {
        throw new Error(`Kunde inte uppdatera film: ${error.message}`);
      }
    },

    deleteMovie: async (_, { id }, { user }) => {
      try {
        if (!user) {
          throw new Error("Du måste vara inloggad för att ta bort filmer");
        }

        const movie = await Movie.findByIdAndUpdate(
          id,
          { isActive: false },
          { new: true }
        );

        return !!movie;
      } catch (error) {
        throw new Error(`Kunde inte ta bort film: ${error.message}`);
      }
    },
  },
};

export default movieResolvers;
