import SimpleSwipe, { SwipeItem } from "@/components/ui/simple-swipe";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type LatLng = { latitude: number; longitude: number };
type Restaurant = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address?: string;
  distanceMeters?: number;
  imageUrl?: string;
};

const STORAGE_KEY = "@liked_restaurants";

async function fetchRestaurantImage(
  restaurantName: string
): Promise<string | undefined> {
  try {
    // Smart image categorization based on restaurant name
    const nameLower = restaurantName.toLowerCase();

    // Define image categories with specific matching - expanded collection
    const imageCategories = {
      sushi: [
        "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=300&fit=crop", // Sushi
        "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop", // Sushi platter
        "https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&h=300&fit=crop", // Sushi rolls
        "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=400&h=300&fit=crop", // Japanese sushi
        "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&h=300&fit=crop", // Sashimi
        "https://images.unsplash.com/photo-1607123189980-f7c8b12ce91f?w=400&h=300&fit=crop", // Nigiri
        "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400&h=300&fit=crop", // Maki rolls
        "https://images.unsplash.com/photo-1564489563601-c53cfc451e93?w=400&h=300&fit=crop", // Japanese dining
      ],
      pizza: [
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop", // Pizza
        "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop", // Pizza slice
        "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop", // Margherita pizza
        "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=400&h=300&fit=crop", // Wood fired pizza
        "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop", // Supreme pizza
        "https://images.unsplash.com/photo-1520201163981-8cc95007dd2a?w=400&h=300&fit=crop", // Pepperoni pizza
        "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&h=300&fit=crop", // Artisan pizza
        "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=400&h=300&fit=crop", // Neapolitan pizza
      ],
      italian: [
        "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=400&h=300&fit=crop", // Pasta
        "https://images.unsplash.com/photo-1621996346565-e3dbc92d2abb?w=400&h=300&fit=crop", // Spaghetti
        "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop", // Italian food
        "https://images.unsplash.com/photo-1572441713132-51c75654db73?w=400&h=300&fit=crop", // Fresh pasta
        "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&h=300&fit=crop", // Carbonara
        "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=300&fit=crop", // Fettuccine
        "https://images.unsplash.com/photo-1551248429-40975aa4de74?w=400&h=300&fit=crop", // Lasagna
        "https://images.unsplash.com/photo-1608219992873-67cf95cf9842?w=400&h=300&fit=crop", // Gnocchi
        "https://images.unsplash.com/photo-1565299585323-38174c4a6471?w=400&h=300&fit=crop", // Risotto
      ],
      burger: [
        "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop", // Burger
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop", // Gourmet burger
        "https://images.unsplash.com/photo-1586816001966-79b736744398?w=400&h=300&fit=crop", // Cheeseburger
        "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop", // Loaded burger
        "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=400&h=300&fit=crop", // Double burger
        "https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=400&h=300&fit=crop", // BBQ burger
        "https://images.unsplash.com/photo-1607013251379-e6eecfffe234?w=400&h=300&fit=crop", // Bacon burger
        "https://images.unsplash.com/photo-1596662951482-0c4ba82d6651?w=400&h=300&fit=crop", // Veggie burger
      ],
      asian: [
        "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&h=300&fit=crop", // Ramen
        "https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&h=300&fit=crop", // Pho
        "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop", // Thai food
        "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop", // Asian noodles
        "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&h=300&fit=crop", // Pad Thai
        "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop", // Fried rice
        "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop", // Dumplings
        "https://images.unsplash.com/photo-1606755962773-d324e2013455?w=400&h=300&fit=crop", // Korean BBQ
        "https://images.unsplash.com/photo-1496412705862-e0fed21ba591?w=400&h=300&fit=crop", // Chinese cuisine
      ],
      mexican: [
        "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop", // Tacos
        "https://images.unsplash.com/photo-1613564834361-9436948817d1?w=400&h=300&fit=crop", // Mexican food
        "https://images.unsplash.com/photo-1545093149-618ce3bcf49d?w=400&h=300&fit=crop", // Burrito bowl
        "https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=400&h=300&fit=crop", // Mexican feast
        "https://images.unsplash.com/photo-1565299543923-37dd37887442?w=400&h=300&fit=crop", // Quesadillas
        "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop", // Nachos
        "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=300&fit=crop", // Enchiladas
        "https://images.unsplash.com/photo-1512427355685-3c656b3c9321?w=400&h=300&fit=crop", // Guacamole
      ],
      seafood: [
        "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&h=300&fit=crop", // Seafood
        "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&h=300&fit=crop", // Fish dish
        "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=400&h=300&fit=crop", // Lobster
        "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&h=300&fit=crop", // Salmon
        "https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=400&h=300&fit=crop", // Grilled fish
        "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&h=300&fit=crop", // Seafood platter
        "https://images.unsplash.com/photo-1606478859670-8845e7d3b017?w=400&h=300&fit=crop", // Crab
        "https://images.unsplash.com/photo-1611599539962-c0123d887d81?w=400&h=300&fit=crop", // Shrimp
        "https://images.unsplash.com/photo-1558818498-28c1e002b655?w=400&h=300&fit=crop", // Fish & chips
      ],
      steakhouse: [
        "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop", // Steak
        "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop", // BBQ ribs
        "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=300&fit=crop", // Grilled meat
        "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&h=300&fit=crop", // Lamb chops
        "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop", // Prime rib
        "https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop", // T-bone steak
        "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=300&fit=crop", // Ribeye
        "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop", // Filet mignon
      ],
      cafe: [
        "https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?w=400&h=300&fit=crop", // Coffee shop
        "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&h=300&fit=crop", // Breakfast
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop", // Avocado toast
        "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop", // Pancakes
        "https://images.unsplash.com/photo-1504113888839-1c8eb50233d3?w=400&h=300&fit=crop", // Croissant
        "https://images.unsplash.com/photo-1481833761820-0509d3217039?w=400&h=300&fit=crop", // Cafe interior
        "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400&h=300&fit=crop", // Latte art
        "https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=400&h=300&fit=crop", // Breakfast spread
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop", // French toast
      ],
      generic: [
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop", // Restaurant interior
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop", // Restaurant dining
        "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=300&fit=crop", // Food plating
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop", // Delicious food
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop", // Elegant restaurant
        "https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=400&h=300&fit=crop", // Cozy restaurant
        "https://images.unsplash.com/photo-1552566063-b4caca1d3e83?w=400&h=300&fit=crop", // Modern dining
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop", // Street food
        "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop", // Food preparation
        "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&h=300&fit=crop", // Fine dining
      ],
    };

    // Determine category based on restaurant name
    let selectedCategory = "generic";

    if (nameLower.includes("sushi") || nameLower.includes("japan")) {
      selectedCategory = "sushi";
    } else if (nameLower.includes("pizza") || nameLower.includes("pizzeria")) {
      selectedCategory = "pizza";
    } else if (
      nameLower.includes("pasta") ||
      nameLower.includes("italian") ||
      nameLower.includes("italia")
    ) {
      selectedCategory = "italian";
    } else if (
      nameLower.includes("burger") ||
      nameLower.includes("grill") ||
      nameLower.includes("bbq")
    ) {
      selectedCategory = "burger";
    } else if (
      nameLower.includes("thai") ||
      nameLower.includes("chinese") ||
      nameLower.includes("asian") ||
      nameLower.includes("vietnam") ||
      nameLower.includes("korean") ||
      nameLower.includes("ramen")
    ) {
      selectedCategory = "asian";
    } else if (
      nameLower.includes("mexican") ||
      nameLower.includes("taco") ||
      nameLower.includes("burrito")
    ) {
      selectedCategory = "mexican";
    } else if (
      nameLower.includes("fish") ||
      nameLower.includes("seafood") ||
      nameLower.includes("ocean")
    ) {
      selectedCategory = "seafood";
    } else if (
      nameLower.includes("steak") ||
      nameLower.includes("meat") ||
      nameLower.includes("steakhouse")
    ) {
      selectedCategory = "steakhouse";
    } else if (
      nameLower.includes("cafe") ||
      nameLower.includes("coffee") ||
      nameLower.includes("bistro")
    ) {
      selectedCategory = "cafe";
    }

    // Get images from selected category
    const categoryImages =
      imageCategories[selectedCategory as keyof typeof imageCategories];

    // Use restaurant name to get consistent image for same restaurant within category
    const hash = restaurantName.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    const imageIndex = Math.abs(hash) % categoryImages.length;
    const selectedImage = categoryImages[imageIndex];

    console.log(
      "Restaurant:",
      restaurantName,
      "| Category:",
      selectedCategory,
      "| Image:",
      selectedImage
    );
    return selectedImage;
  } catch (error) {
    console.log("Error fetching image:", error);
    // Fallback to a generic food image
    return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop";
  }
}

async function fetchNearbyRestaurants(center: LatLng): Promise<Restaurant[]> {
  const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
  const RADIUS = 1500;
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="restaurant"](around:${RADIUS},${center.latitude},${center.longitude});
      way["amenity"="restaurant"](around:${RADIUS},${center.latitude},${center.longitude});
      relation["amenity"="restaurant"](around:${RADIUS},${center.latitude},${center.longitude});
    );
    out center tags;
  `;
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
  const data = await res.json();
  const places: Restaurant[] = (data.elements || [])
    .map((el: any) => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      const name = el.tags?.name ?? "Unknown restaurant";
      const address =
        el.tags?.["addr:full"] ||
        [el.tags?.["addr:street"], el.tags?.["addr:housenumber"]]
          .filter(Boolean)
          .join(" ");
      return lat && lon
        ? {
            id: String(el.id),
            name,
            lat,
            lon,
            address,
            imageUrl: undefined, // Will be set later
          }
        : null;
    })
    .filter(Boolean);
  return places as Restaurant[];
}

function haversineMeters(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const c =
    2 *
    Math.asin(
      Math.sqrt(
        sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
      )
    );
  return R * c;
}

export default function SwipeScreen() {
  const [loc, setLoc] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<SwipeItem<Restaurant>[]>([]);

  useEffect(() => {
    (async () => {
      setError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied");
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const center = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      setLoc(center);
    })();
  }, []);

  useEffect(() => {
    if (!loc) return;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchNearbyRestaurants(loc);
        const withDist = data.map((p) => ({
          ...p,
          distanceMeters: haversineMeters(loc, {
            latitude: p.lat,
            longitude: p.lon,
          }),
        }));

        // Add images to restaurants
        const withImages = await Promise.all(
          withDist.map(async (restaurant) => {
            const imageUrl = await fetchRestaurantImage(restaurant.name);
            console.log("Restaurant:", restaurant.name, "Image URL:", imageUrl);
            return {
              ...restaurant,
              imageUrl,
            };
          })
        );

        const swipeItems: SwipeItem<Restaurant>[] = withImages.map((r) => ({
          id: r.id,
          data: r,
        }));
        setRestaurants(swipeItems);
      } catch (e: any) {
        setError(e?.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [loc]);

  const handleSwipe = async (
    direction: string,
    item: SwipeItem<Restaurant>
  ) => {
    console.log("Swiped", direction, item.data.name);
    if (direction === "right") {
      // Save liked restaurant
      try {
        const existing = await AsyncStorage.getItem(STORAGE_KEY);
        const likedPlaces = existing ? JSON.parse(existing) : [];
        const updated = [...likedPlaces, item.data];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Error saving liked place:", e);
      }
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.error}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Finding restaurants...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Swipe Restaurants</Text>
      <Text style={styles.subheader}>
        {restaurants.length > 0
          ? `${restaurants.length} places found`
          : "No restaurants found"}
      </Text>
      <View style={styles.swipeContainer}>
        <SimpleSwipe
          items={restaurants}
          renderCard={(item: SwipeItem<Restaurant>): React.ReactElement => (
            <View style={styles.card}>
              {item.data.imageUrl && (
                <Image
                  source={{ uri: item.data.imageUrl }}
                  style={styles.cardImage}
                  resizeMode="cover"
                  onError={() =>
                    console.log("Failed to load image for", item.data.name)
                  }
                  onLoad={() =>
                    console.log("Successfully loaded image for", item.data.name)
                  }
                />
              )}
              <View
                style={[
                  styles.imageOverlay,
                  !item.data.imageUrl && styles.noImageBackground,
                ]}
              />
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.emoji}>🍽️</Text>
                </View>
                <Text style={styles.title}>{item.data.name}</Text>
                {item.data.address && (
                  <Text style={styles.address}>📍 {item.data.address}</Text>
                )}
                {typeof item.data.distanceMeters === "number" && (
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>
                      {item.data.distanceMeters < 1000
                        ? `${Math.round(item.data.distanceMeters)} m away`
                        : `${(item.data.distanceMeters / 1000).toFixed(1)} km away`}
                    </Text>
                  </View>
                )}
                <Text style={styles.hint}>👆 Drag or use buttons below</Text>
              </View>
            </View>
          )}
          onSwipe={(item, direction, index) => handleSwipe(direction, item)}
          onEmpty={() => console.log("No more restaurants!")}
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
});
