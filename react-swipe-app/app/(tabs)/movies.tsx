import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { router } from "expo-router";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

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

export default function MoviesScreen() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [likedMovies, setLikedMovies] = useState<Movie[]>([]);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);

  // TMDB API configuration
  const TMDB_API_KEY = "a07e22bc18f5cb106bfe4cc1f83ad8ed"; // Public demo key
  const TMDB_BASE_URL = "https://api.themoviedb.org/3";
  const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

  useEffect(() => {
    fetchMovies();
    loadLikedMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      console.log("Fetching movies from TMDB...");

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Movies fetched successfully:", data.results.length);

      setMovies(data.results || []);
    } catch (error) {
      console.error("Error fetching movies:", error);
      Alert.alert("Error", "Failed to load movies. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadLikedMovies = async () => {
    try {
      const stored = await AsyncStorage.getItem("likedMovies");
      if (stored) {
        setLikedMovies(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading liked movies:", error);
    }
  };

  const saveLikedMovies = async (movies: Movie[]) => {
    try {
      await AsyncStorage.setItem("likedMovies", JSON.stringify(movies));
    } catch (error) {
      console.error("Error saving liked movies:", error);
    }
  };

  const handleLike = () => {
    const currentMovie = movies[currentIndex];
    if (currentMovie) {
      const newLikedMovies = [...likedMovies, currentMovie];
      setLikedMovies(newLikedMovies);
      saveLikedMovies(newLikedMovies);
      console.log("Liked movie:", currentMovie.title);
    }
    nextMovie();
  };

  const handlePass = () => {
    console.log("Passed on movie:", movies[currentIndex]?.title);
    nextMovie();
  };

  const nextMovie = () => {
    if (currentIndex < movies.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Fetch more movies or show end message
      Alert.alert("No more movies", "You've seen all available movies!");
    }

    // Reset animation values
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    rotate.value = withSpring(0);
    scale.value = withSpring(1);
  };

  const previousMovie = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      console.log(
        "Going back to previous movie:",
        movies[currentIndex - 1]?.title
      );
    } else {
      Alert.alert(
        "Already at first movie",
        "This is the first movie in the list!"
      );
    }

    // Reset animation values
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    rotate.value = withSpring(0);
    scale.value = withSpring(1);
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      scale.value = withSpring(0.95);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotate.value = event.translationX * 0.1;
    })
    .onEnd((event) => {
      const threshold = screenWidth * 0.3;

      if (event.translationX > threshold) {
        // Swipe right - like
        translateX.value = withSpring(screenWidth * 1.5);
        runOnJS(handleLike)();
      } else if (event.translationX < -threshold) {
        // Swipe left - pass
        translateX.value = withSpring(-screenWidth * 1.5);
        runOnJS(handlePass)();
      } else {
        // Return to center
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotate.value = withSpring(0);
      }

      scale.value = withSpring(1);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

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
          <Text style={styles.loadingText}>Loading movies...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (movies.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>🎬</Text>
          <Text style={styles.error}>No movies found</Text>
        </View>
        <TouchableOpacity style={styles.retryButton} onPress={fetchMovies}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentMovie = movies[currentIndex];

  if (!currentMovie) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>🎬</Text>
          <Text style={styles.error}>No more movies!</Text>
        </View>
        <TouchableOpacity style={styles.retryButton} onPress={fetchMovies}>
          <Text style={styles.retryButtonText}>Load More</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Swipe Movies</Text>
        <View style={styles.placeholder} />
      </View>
      <Text style={styles.subheader}>
        {movies.length > 0
          ? `${movies.length} movies found`
          : "No movies found"}
      </Text>

      <View style={styles.swipeContainer}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.card, animatedStyle]}>
            {currentMovie.poster_path && (
              <Image
                source={{
                  uri: `${TMDB_IMAGE_BASE_URL}${currentMovie.poster_path}`,
                }}
                style={styles.cardImage}
                resizeMode="cover"
                onError={() =>
                  console.log("Failed to load image for", currentMovie.title)
                }
              />
            )}
            <View
              style={[
                styles.imageOverlay,
                !currentMovie.poster_path && styles.noImageBackground,
              ]}
            />
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.emoji}>🎬</Text>
              </View>
              <Text style={styles.title}>{currentMovie.title}</Text>

              <View style={styles.movieMeta}>
                <Text style={styles.releaseDate}>
                  {new Date(currentMovie.release_date).getFullYear()}
                </Text>
                <Text style={styles.rating}>
                  ⭐ {currentMovie.vote_average.toFixed(1)}
                </Text>
              </View>

              <Text style={styles.genres}>
                {getMovieGenres(currentMovie.genre_ids)}
              </Text>

              <ScrollView
                style={styles.overviewContainer}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.overview}>{currentMovie.overview}</Text>
              </ScrollView>

              <Text style={styles.hint}>👆 Drag or use buttons below</Text>
            </View>
          </Animated.View>
        </GestureDetector>

        {/* Swipe buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.passButton} onPress={handlePass}>
            <Text style={styles.buttonText}>❌</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.previousButton,
              currentIndex === 0 && styles.disabledButton,
            ]}
            onPress={previousMovie}
            disabled={currentIndex === 0}
          >
            <Text
              style={[
                styles.buttonText,
                currentIndex === 0 && styles.disabledButtonText,
              ]}
            >
              ↶
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
            <Text style={styles.buttonText}>✓</Text>
          </TouchableOpacity>
        </View>
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
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    marginBottom: 4,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.5,
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 50, // Same width as back button to center header
  },
  subheader: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    fontWeight: "500",
    textAlign: "center",
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
  movieMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    width: "100%",
    paddingHorizontal: 20,
  },
  releaseDate: {
    fontSize: 16,
    color: "#F0F0F0",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rating: {
    fontSize: 16,
    color: "#FFD700",
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  genres: {
    fontSize: 16,
    color: "#FF6B6B",
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  overviewContainer: {
    maxHeight: 120,
    marginBottom: 16,
  },
  overview: {
    fontSize: 14,
    color: "#E0E0E0",
    textAlign: "center",
    lineHeight: 20,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 50,
    paddingVertical: 20,
    backgroundColor: "#F8F9FA",
  },
  passButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FF4458",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  likeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4FC3F7",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  previousButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFA726",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
    shadowOpacity: 0.1,
  },
  buttonText: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  disabledButtonText: {
    color: "#888888",
  },
});
