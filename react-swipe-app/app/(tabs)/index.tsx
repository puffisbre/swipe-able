import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  View,
  ActivityIndicator,
  Image,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MapComponent } from "@/components/map-component";
import {
  fetchNearbyRestaurants,
  getCurrentLocation,
  haversineMeters,
} from "@/utils/restaurant-api";
import type { LatLng, Place } from "@/utils/restaurant-api";

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [initialRegion, setInitialRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  const handleRestaurantPress = async () => {
    console.log("Restaurant button pressed!");
    try {
      setLoading(true);
      setError(null);
      console.log("Starting location fetch...");

      // Hämta användarens position
      const location = await getCurrentLocation();
      console.log("Location received:", location);

      // Sätt initial region för kartan
      const region = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      console.log("Setting initial region:", region);
      setInitialRegion(region);

      console.log("Fetching restaurants...");
      // Hämta närliggande restauranger
      const restaurants = await fetchNearbyRestaurants(location);
      console.log("Restaurants received:", restaurants.length);

      // Beräkna avstånd och sortera
      const restaurantsWithDistance = restaurants
        .map((restaurant) => ({
          ...restaurant,
          distanceMeters: haversineMeters(location, {
            latitude: restaurant.lat,
            longitude: restaurant.lon,
          }),
        }))
        .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));

      console.log("Restaurants with distance:", restaurantsWithDistance.length);
      setPlaces(restaurantsWithDistance);
    } catch (err: any) {
      console.error("Restaurant fetch error:", err);
      setError(err.message || "Något gick fel vid hämtning av restauranger");
    } finally {
      setLoading(false);
      console.log("Restaurant fetch completed");
    }
  };

  const handleButtonPress = (category: string) => {
    console.log(`Selected: ${category}`);
    if (category === "Restaurant") {
      handleRestaurantPress();
    } else if (category === "Movie") {
      router.push("/(tabs)/movies");
    }
  };

  return (
    <ScrollView style={styles.scrollContainer}>
      <ThemedView style={styles.container}>
        {/* Header with Swipee logo */}
        <ThemedView style={styles.header}>
          <Image source={require("../../assets/images/Logo-big.svg")} />
        </ThemedView>

        {/* Main content */}
        <ThemedView style={styles.content}>
          <ThemedText style={styles.helpText}>I'm here to help.</ThemedText>

          {/* Card container */}
          <ThemedView style={styles.card}>
            <ThemedText style={styles.cardTitle}>
              Find me the best _______
            </ThemedText>

            {/* Category buttons - flex wrap layout */}
            <ThemedView style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.restaurantButton]}
                onPress={() => handleButtonPress("Restaurant")}
              >
                <ThemedText
                  style={[styles.buttonText, styles.restaurantButton]}
                >
                  Restaurant
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.activityButton]}
                onPress={() => handleButtonPress("Activity")}
              >
                <ThemedText style={[styles.buttonText, styles.activityButton]}>
                  Activity
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.attractionButton]}
                onPress={() => handleButtonPress("Attraction")}
              >
                <ThemedText
                  style={[styles.buttonText, styles.attractionButton]}
                >
                  Attraction
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.movieButton]}
                onPress={() => handleButtonPress("Movie")}
              >
                <ThemedText style={[styles.buttonText, styles.movieButton]}>
                  Movie
                </ThemedText>
              </TouchableOpacity>

              {/* Dots for more options */}
              {/* <ThemedView style={styles.dotsContainer}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </ThemedView> */}
            </ThemedView>
          </ThemedView>

          {/* Location section */}
          <ThemedView style={styles.locationSection}>
            <ThemedText style={styles.locationTitle}>Location</ThemedText>

            {/* Debug information */}
            <ThemedView style={styles.debugContainer}>
              <ThemedText style={styles.debugText}>
                Debug: Loading={loading ? "yes" : "no"}, Region=
                {initialRegion ? "set" : "not set"}, Places={places.length}
              </ThemedText>
            </ThemedView>

            {error && (
              <ThemedView style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </ThemedView>
            )}
            <MapComponent
              initialRegion={initialRegion}
              places={places}
              loading={loading}
              style={styles.mapPlaceholder}
            />
            {places.length > 0 && (
              <ThemedView style={styles.restaurantList}>
                <ThemedText style={styles.restaurantListTitle}>
                  Hittade {places.length} restauranger
                </ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalList}
                >
                  {places.slice(0, 5).map((place) => (
                    <ThemedView key={place.id} style={styles.restaurantCard}>
                      <ThemedText
                        style={styles.restaurantName}
                        numberOfLines={1}
                      >
                        {place.name}
                      </ThemedText>
                      {place.address && (
                        <ThemedText
                          style={styles.restaurantAddress}
                          numberOfLines={1}
                        >
                          {place.address}
                        </ThemedText>
                      )}
                      {typeof place.distanceMeters === "number" && (
                        <ThemedText style={styles.restaurantDistance}>
                          {Math.round(place.distanceMeters)} m bort
                        </ThemedText>
                      )}
                    </ThemedView>
                  ))}
                </ScrollView>
              </ThemedView>
            )}
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: "#FBF9F9",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 60,
    /* paddingBottom: 20, */
    alignItems: "flex-start",
  },
  logo: {},
  content: {
    flex: 1,
    margin: 28,
  },
  helpText: {
    fontSize: 32,
    fontWeight: "600",
    color: "#333",
    marginBottom: 30,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: "#ddd",
    /*   shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4, */
  },
  cardTitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 32,
    /* textAlign: "center", */
  },
  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
    gap: 10,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 80,
    alignItems: "center",
  },
  restaurantButton: {
    backgroundColor: "#FFC4E4",
    color: "#910046ff",
  },
  activityButton: {
    backgroundColor: "#CEFFC4",
    color: "#00731B",
  },
  attractionButton: {
    backgroundColor: "#C4F4FF",
    color: "#004887",
  },
  movieButton: {
    backgroundColor: "#FFEAC4",
    color: "#7a3b00ff",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ccc",
  },
  locationSection: {
    marginBottom: 30,
  },
  locationTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: "#e8f4f8",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 6,
  },
  mapText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  mapSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorText: {
    color: "#c62828",
    fontSize: 14,
  },
  restaurantList: {
    marginTop: 15,
  },
  restaurantListTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  horizontalList: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#f7f3f3ff",
    borderRadius: 12,
  },
  restaurantCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    marginRight: 12,
    minWidth: 180,
    maxWidth: 200,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  restaurantAddress: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  restaurantDistance: {
    fontSize: 12,
    color: "#FF69B4",
    marginTop: 4,
    fontWeight: "500",
  },
  debugContainer: {
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  debugText: {
    fontSize: 12,
    color: "#666",
    fontFamily: "monospace",
  },
});
