import mongoose from "mongoose";
import dotenv from "dotenv";
import Restaurant from "../models/Restaurant.js";
import User from "../models/User.js";
import Movie from "../models/Movie.js";
import Favorite from "../models/Favorite.js";

dotenv.config();

const sampleRestaurants = [
  {
    name: "Pizza Palace",
    description: "Autentisk italiensk pizza med färska ingredienser",
    cuisine: "Italiensk",
    address: {
      street: "Storgatan 15",
      city: "Stockholm",
      zipCode: "11122",
      country: "Sverige",
    },
    location: {
      latitude: 59.3293,
      longitude: 18.0686,
    },
    rating: 4.5,
    priceRange: "$$",
    images: [
      {
        url: "https://example.com/pizza-palace.jpg",
        alt: "Pizza Palace uteservering",
      },
    ],
  },
  {
    name: "Sushi Zen",
    description: "Traditionell japansk sushi och sashimi",
    cuisine: "Japansk",
    address: {
      street: "Drottninggatan 42",
      city: "Stockholm",
      zipCode: "11151",
      country: "Sverige",
    },
    location: {
      latitude: 59.3345,
      longitude: 18.0632,
    },
    rating: 4.8,
    priceRange: "$$$",
    images: [
      {
        url: "https://example.com/sushi-zen.jpg",
        alt: "Sushi Zen interiör",
      },
    ],
  },
  {
    name: "Burgerlicious",
    description: "Saftiga gourmetburgare med lokala ingredienser",
    cuisine: "Amerikansk",
    address: {
      street: "Götgatan 88",
      city: "Stockholm",
      zipCode: "11662",
      country: "Sverige",
    },
    location: {
      latitude: 59.3157,
      longitude: 18.0747,
    },
    rating: 4.2,
    priceRange: "$$",
    images: [
      {
        url: "https://example.com/burgerlicious.jpg",
        alt: "Burgerlicious klassisk burger",
      },
    ],
  },
  {
    name: "Taco Fiesta",
    description: "Mexikanska smaker med färska råvaror",
    cuisine: "Mexikansk",
    address: {
      street: "Södermalmsallén 10",
      city: "Stockholm",
      zipCode: "11838",
      country: "Sverige",
    },
    location: {
      latitude: 59.3098,
      longitude: 18.0686,
    },
    rating: 4.0,
    priceRange: "$",
    images: [
      {
        url: "https://example.com/taco-fiesta.jpg",
        alt: "Taco Fiesta färska tacos",
      },
    ],
  },
  {
    name: "Fine Dining Stockholm",
    description: "Exklusiv gastronomi med nordiska smaker",
    cuisine: "Nordisk",
    address: {
      street: "Östermalmsallen 5",
      city: "Stockholm",
      zipCode: "11442",
      country: "Sverige",
    },
    location: {
      latitude: 59.3365,
      longitude: 18.0755,
    },
    rating: 4.9,
    priceRange: "$$$$",
    images: [
      {
        url: "https://example.com/fine-dining.jpg",
        alt: "Fine Dining elegant presentation",
      },
    ],
  },
];

const sampleUsers = [
  {
    username: "anna_svensson",
    email: "anna@example.com",
    password: "password123",
    firstName: "Anna",
    lastName: "Svensson",
  },
  {
    username: "erik_johansson",
    email: "erik@example.com",
    password: "password123",
    firstName: "Erik",
    lastName: "Johansson",
  },
  {
    username: "maria_andersson",
    email: "maria@example.com",
    password: "password123",
    firstName: "Maria",
    lastName: "Andersson",
  },
];

const sampleMovies = [
  {
    title: "The Shawshank Redemption",
    description:
      "Två fångar skapar vänskap under flera år och finner tröst och eventuell befrielse genom handlingar av vanlig anständighet.",
    genre: ["Drama", "Crime"],
    director: "Frank Darabont",
    actors: ["Tim Robbins", "Morgan Freeman", "Bob Gunton"],
    releaseYear: 1994,
    duration: 142,
    rating: 9.3,
    imdbId: "tt0111161",
    posterUrl: "https://example.com/shawshank.jpg",
    language: "en",
    country: "US",
  },
  {
    title: "The Godfather",
    description:
      "En italiensk-amerikansk familjs historia från 1940-talet till 1950-talet.",
    genre: ["Crime", "Drama"],
    director: "Francis Ford Coppola",
    actors: ["Marlon Brando", "Al Pacino", "James Caan"],
    releaseYear: 1972,
    duration: 175,
    rating: 9.2,
    imdbId: "tt0068646",
    posterUrl: "https://example.com/godfather.jpg",
    language: "en",
    country: "US",
  },
  {
    title: "Pulp Fiction",
    description:
      "Historier från Los Angeles kriminella undre värld sammanbinds av våld och förbudt.",
    genre: ["Crime", "Drama"],
    director: "Quentin Tarantino",
    actors: ["John Travolta", "Uma Thurman", "Samuel L. Jackson"],
    releaseYear: 1994,
    duration: 154,
    rating: 8.9,
    imdbId: "tt0110912",
    posterUrl: "https://example.com/pulpfiction.jpg",
    language: "en",
    country: "US",
  },
  {
    title: "Forrest Gump",
    description:
      "Historien om Forrest Gump och hans resa genom några av de mest turbulenta åren i amerikansk historia.",
    genre: ["Drama", "Romance"],
    director: "Robert Zemeckis",
    actors: ["Tom Hanks", "Robin Wright", "Gary Sinise"],
    releaseYear: 1994,
    duration: 142,
    rating: 8.8,
    imdbId: "tt0109830",
    posterUrl: "https://example.com/forrestgump.jpg",
    language: "en",
    country: "US",
  },
  {
    title: "Inception",
    description:
      "En skicklig tjuv som stjäl företagshemligheter genom drömdelningsteknologi.",
    genre: ["Action", "Sci-Fi", "Thriller"],
    director: "Christopher Nolan",
    actors: ["Leonardo DiCaprio", "Marion Cotillard", "Tom Hardy"],
    releaseYear: 2010,
    duration: 148,
    rating: 8.7,
    imdbId: "tt1375666",
    posterUrl: "https://example.com/inception.jpg",
    language: "en",
    country: "US",
  },
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/swipe-able"
    );
    console.log("🍃 Connected to MongoDB");

    // Clear existing data
    await Restaurant.deleteMany({});
    await User.deleteMany({});
    await Movie.deleteMany({});
    await Favorite.deleteMany({});
    console.log("🗑️  Cleared existing data");

    // Insert sample restaurants
    const restaurants = await Restaurant.insertMany(sampleRestaurants);
    console.log(`✅ Inserted ${restaurants.length} sample restaurants`);

    // Insert sample users (one by one to trigger friendCode generation)
    const users = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      const savedUser = await user.save();
      users.push(savedUser);
    }
    console.log(`✅ Inserted ${users.length} sample users`);

    // Insert sample movies
    const movies = await Movie.insertMany(sampleMovies);
    console.log(`✅ Inserted ${movies.length} sample movies`);

    // Display created data
    console.log("\n📋 Created data:");
    console.log("🍽️  Restaurants:");
    restaurants.forEach((restaurant) => {
      console.log(`  - ${restaurant.name} (${restaurant.cuisine})`);
    });

    console.log("\n👥 Users:");
    users.forEach((user) => {
      console.log(
        `  - ${user.firstName} ${user.lastName} (@${user.username}) - Vänkod: ${user.friendCode}`
      );
    });

    console.log("\n🎬 Movies:");
    movies.forEach((movie) => {
      console.log(
        `  - ${movie.title} (${movie.releaseYear}) - ${movie.rating}/10`
      );
    });

    console.log("\n🎉 Database seeded successfully!");
    console.log("\n💡 Tips:");
    console.log("- Använd vänkoderna ovan för att testa vänsystemet");
    console.log(
      "- Testa att logga in med någon av användarna (lösenord: password123)"
    );
    console.log("- Lägg till restauranger och filmer som favoriter");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
