import SimpleSwipe, { SwipeItem } from "@/components/ui/simple-swipe";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

//här har vi ett interface med olika properties som en film har
interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
}
//här har vi en lista som olika katgorier av filmer. Siffran är id för varje genre
const genres: { [key: number]: string } = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

const STORAGE_KEY = "@liked_movies";

//Huvudkomponent för skärmen med swipebara filmer.
export default function MoviesScreen() {
  const [loading, setLoading] = useState(false);
  const [movies, setMovies] = useState<SwipeItem<Movie>[]>([]);

  // TMDB API configuration
  const TMDB_API_KEY = "a07e22bc18f5cb106bfe4cc1f83ad8ed"; // Public demo key
  const TMDB_BASE_URL = "https://api.themoviedb.org/3";
  const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
  //här hämtar vi filmer från TMDB API när komponenten mountas.
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        console.log("Fetching movies from TMDB...");

        // Hämta flera sidor samtidigt (parallellt)
        const pages = [1, 2, 3, 4, 5]; // Hämta 5 sidor
        const promises = pages.map((page) =>
          fetch(
            `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
          )
        );

        const responses = await Promise.all(promises);

        // Kontrollera att alla requests lyckades
        responses.forEach((response, index) => {
          if (!response.ok) {
            throw new Error(
              `HTTP error on page ${pages[index]}! status: ${response.status}`
            );
          }
        });

        // Konvertera alla responses till JSON
        const dataPromises = responses.map((response) => response.json());
        const allData = await Promise.all(dataPromises);

        // Kombinera alla filmer från alla sidor
        const allMovies = allData.flatMap((data) => data.results || []);
        console.log(
          "Movies fetched successfully:",
          allMovies.length,
          "movies from",
          pages.length,
          "pages"
        );
        // Mappa filmer till SwipeItem format
        const swipeItems: SwipeItem<Movie>[] = allMovies.map(
          (movie: Movie) => ({
            id: String(movie.id),
            data: movie,
          })
        );
        setMovies(swipeItems);
      } catch (error) {
        console.error("Error fetching movies:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  //hanterar swipe händelsen. Sparar filmer som swipats höger i AsyncStorage (not)
  const handleSwipe = async (direction: string, item: SwipeItem<Movie>) => {
    console.log("Swiped", direction, item.data.title);
    if (direction === "right") {
      // Sparar den gillade filmen via AsyncStorage. Asyncsotrage ingår i Reactnative. Asynkron lagring av data lokalt på enheten om det är på telefon, annars localstorage i webbläsaren.
      try {
        if (!AsyncStorage) {
          console.warn("AsyncStorage is not available");
          return;
        }
        // Hämta befintliga gillade filmer
        const existing = await AsyncStorage.getItem(STORAGE_KEY);
        const likedMovies = existing ? JSON.parse(existing) : [];
        const updated = [...likedMovies, item.data];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Error saving liked movie:", e);
      }
    }
  };
  //Hjälpfunktion för att få genre namn från genre id.
  const getMovieGenres = (genreIds: number[]) => {
    return genreIds
      .slice(0, 3)
      .map((id) => genres[id])
      .filter(Boolean)
      .join(", ");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Finding movies...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Swipe Movies</Text>
      <Text style={styles.subheader}>
        {movies.length > 0
          ? `${movies.length} movies found`
          : "No movies found"}
      </Text>
      <View style={styles.swipeContainer}>
        <SimpleSwipe
          items={movies}
          renderCard={(item: SwipeItem<Movie>): React.ReactElement => (
            <View style={styles.card}>
              {item.data.poster_path && (
                <Image
                  source={{
                    uri: `${TMDB_IMAGE_BASE_URL}${item.data.poster_path}`,
                  }}
                  style={styles.cardImage}
                  resizeMode="cover"
                  onError={() =>
                    console.log("Failed to load image for", item.data.title)
                  }
                  onLoad={() =>
                    console.log(
                      "Successfully loaded image for",
                      item.data.title
                    )
                  }
                />
              )}
              <View
                style={[
                  styles.imageOverlay,
                  !item.data.poster_path && styles.noImageBackground,
                ]}
              />
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.emoji}>🎬</Text>
                </View>
                <Text style={styles.title}>{item.data.title}</Text>
                <Text style={styles.address}>
                  {new Date(item.data.release_date).getFullYear()} • ⭐{" "}
                  {item.data.vote_average.toFixed(1)}
                </Text>
                {getMovieGenres(item.data.genre_ids) && (
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>
                      {getMovieGenres(item.data.genre_ids)}
                    </Text>
                  </View>
                )}
                <Text style={styles.hint}>👆 Drag or use buttons below</Text>
              </View>
            </View>
          )}
          onSwipe={(item, direction, index) => handleSwipe(direction, item)}
          onEmpty={() => console.log("No more movies!")}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 16,
  },

  header: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
    marginTop: 12,
    marginBottom: 4,
    letterSpacing: -0.5,
  },

  subheader: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    fontWeight: "500",
  },
  swipeContainer: {
    flex: 1,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    overflow: "hidden",
    flex: 1,
    position: "relative",
  },
  cardImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  noImageBackground: {
    backgroundColor: "#667eea",
  },
  cardHeader: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  emoji: {
    fontSize: 40,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    position: "relative",
    zIndex: 1,
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  address: {
    fontSize: 16,
    color: "#F0F0F0",
    textAlign: "center",
    marginBottom: 16,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  distanceBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  distanceText: {
    color: "#2E7D32",
    fontSize: 14,
    fontWeight: "700",
  },

  hint: {
    fontSize: 14,
    color: "#E0E0E0",
    marginTop: "auto",
    fontStyle: "italic",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  errorContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3F3",
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFCCCC",
  },
  errorIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  error: {
    color: "#D93025",
    fontSize: 14,
    flex: 1,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    margin: 16,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});

//Felix fil 
