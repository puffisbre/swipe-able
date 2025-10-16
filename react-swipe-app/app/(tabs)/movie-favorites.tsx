import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Typ för film - samma som i movies.tsx
type Movie = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
};

// Genre-mappning från movies.tsx
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

// Storage-nyckel för favorit-filmer
const STORAGE_KEY = "@liked_movies";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

// Huvudkomponent för att visa favorit-filmer
export default function MovieFavoritesScreen() {
  const insets = useSafeAreaInsets();
  const [likedMovies, setLikedMovies] = useState<Movie[]>([]);

  const loadLikedMovies = async () => {
    try {
      if (!AsyncStorage) {
        console.warn("AsyncStorage is not available");
        return;
      }
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setLikedMovies(JSON.parse(data));
      }
    } catch (e) {
      console.error("Error loading liked movies:", e);
    }
  };

  // Ladda favorit-filmer när skärmen fokuseras
  useFocusEffect(
    useCallback(() => {
      loadLikedMovies();
    }, [])
  );

  // Funktion för att öppna filmen i IMDb eller Google search
  const openMovieInfo = (movie: Movie) => {
    const searchQuery = encodeURIComponent(
      `${movie.title} ${new Date(movie.release_date).getFullYear()} imdb`
    );
    const url = Platform.select({
      ios: `https://www.google.com/search?q=${searchQuery}`,
      android: `https://www.google.com/search?q=${searchQuery}`,
      default: `https://www.google.com/search?q=${searchQuery}`,
    });
    Linking.openURL(url!);
  };

  // Funktion för att ta bort en film från favoriter
  const removeMovie = async (id: number) => {
    try {
      const updated = likedMovies.filter((m) => m.id !== id);
      setLikedMovies(updated);
      if (AsyncStorage) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.error("Error removing movie:", e);
    }
  };

  // Funktion för att ta bort alla favorit-filmer
  const clearAll = async () => {
    try {
      setLikedMovies([]);
      if (AsyncStorage) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      }
    } catch (e) {
      console.error("Error clearing movies:", e);
    }
  };

  // Hämta genre-namn för en film
  const getMovieGenres = (genreIds: number[]) => {
    return genreIds
      .slice(0, 3)
      .map((id) => genres[id])
      .filter(Boolean)
      .join(", ");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Movie Favorites</Text>
        <Text style={styles.subtitle}>
          {likedMovies.length === 0
            ? "No favorite movies yet"
            : `${likedMovies.length} favorite ${likedMovies.length === 1 ? "movie" : "movies"}`}
        </Text>
      </View>

      {likedMovies.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🎬</Text>
          <Text style={styles.emptyTitle}>No favorite movies yet!</Text>
          <Text style={styles.emptySubtitle}>
            Go to the Movies tab to find films you like
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={likedMovies}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 16 }}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Pressable
                  style={styles.mainContent}
                  onPress={() => openMovieInfo(item)}
                >
                  <View style={styles.posterContainer}>
                    {item.poster_path ? (
                      <Image
                        source={{
                          uri: `${TMDB_IMAGE_BASE_URL}${item.poster_path}`,
                        }}
                        style={styles.poster}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.noPoster}>
                        <Text style={styles.noPosterText}>🎬</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      📅 {new Date(item.release_date).getFullYear()} • ⭐{" "}
                      {item.vote_average.toFixed(1)}
                    </Text>
                    {getMovieGenres(item.genre_ids) && (
                      <View style={styles.genreBadge}>
                        <Text style={styles.genreText}>
                          {getMovieGenres(item.genre_ids)}
                        </Text>
                      </View>
                    )}
                    {item.overview && (
                      <Text style={styles.overview} numberOfLines={2}>
                        {item.overview}
                      </Text>
                    )}
                  </View>
                </Pressable>
                <Pressable
                  style={styles.removeButton}
                  onPress={() => removeMovie(item.id)}
                >
                  <Text style={styles.removeIcon}>✕</Text>
                </Pressable>
              </View>
            )}
          />
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.clearButtonPressed,
              ]}
              onPress={clearAll}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  sep: { height: 12 },
  row: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  mainContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  posterContainer: {
    width: 60,
    height: 90,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#F0F0F0",
  },
  poster: {
    width: "100%",
    height: "100%",
  },
  noPoster: {
    width: "100%",
    height: "100%",
    backgroundColor: "#667eea",
    alignItems: "center",
    justifyContent: "center",
  },
  noPosterText: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  name: {
    fontWeight: "700",
    fontSize: 17,
    color: "#1A1A1A",
    marginBottom: 4,
    lineHeight: 22,
  },
  sub: {
    color: "#666",
    fontSize: 13,
    fontWeight: "400",
    marginBottom: 6,
  },
  genreBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  genreText: {
    color: "#2E7D32",
    fontSize: 11,
    fontWeight: "700",
  },
  overview: {
    color: "#888",
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF3F3",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  removeIcon: {
    fontSize: 18,
    color: "#F44336",
    fontWeight: "700",
  },
  footer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
  },
  clearButton: {
    backgroundColor: "#F44336",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  clearButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  clearButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
