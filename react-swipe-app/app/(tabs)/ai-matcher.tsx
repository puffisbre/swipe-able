import { GoogleGenerativeAI } from "@google/generative-ai";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
  matchReason?: string;
  score?: number;
  isAIPowered?: boolean;
};

const STORAGE_KEY = "@liked_restaurants";

// Gemini AI setup
const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("⚠️ Gemini API key not found! AI matching will use fallback.");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const model = genAI?.getGenerativeModel({ model: "gemini-flash-latest" });

// Riktig Gemini AI-funktion för att matcha restauranger
async function getGeminiMatches(
  preferences: string,
  restaurants: Restaurant[]
): Promise<Restaurant[]> {
  try {
    console.log("🤖 Using REAL Gemini AI for restaurant matching...");
    
    if (!model) {
      throw new Error("Gemini API not configured");
    }
    
    if (!restaurants || restaurants.length === 0) {
      console.error("No restaurants provided to Gemini AI");
      return [];
    }

    // Skapa en detaljerad prompt för Gemini
    const restaurantData = restaurants.map(r => ({
      name: r.name,
      address: r.address || "Address not available",
      distance: r.distanceMeters ? `${Math.round(r.distanceMeters)}m away` : "Distance unknown"
    }));

    const prompt = `Du är en expert på restaurangrekommendationer. Användaren har följande preferenser: "${preferences}"

Här är närliggande restauranger:
${JSON.stringify(restaurantData, null, 2)}

Analysera användarens preferenser och välj de 3 BÄSTA matchningarna. 

Svara ENDAST med JSON i detta format (inga extra tecken, inga markdown):
[
  {
    "name": "Restaurangnamn",
    "matchReason": "Förklaring varför denna restaurang matchar",
    "confidence": 85
  }
]

Välj baserat på:
- Mattyp och preferenser
- Avstånd (närmare är bättre)
- Namn som indikerar rätt typ av mat
- Allmän passform för användarens humör/preferenser`;

    console.log("📤 Sending request to Gemini AI...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    console.log("📥 Gemini AI raw response:", text);

    // Clean up the response - remove markdown if present
    text = text.trim();
    if (text.startsWith("```json")) {
      text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (text.startsWith("```")) {
      text = text.replace(/```\n?/g, "");
    }

    // Extract JSON from text if it's wrapped in other text
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    console.log("📥 Cleaned response:", text);

    // Parse the JSON response
    const geminiMatches = JSON.parse(text);
    
    // Match Gemini's results with our restaurants
    const matchedRestaurants: Restaurant[] = [];
    
    if (Array.isArray(geminiMatches)) {
      for (const geminiMatch of geminiMatches) {
        const restaurant = restaurants.find(r => 
          r.name.toLowerCase() === geminiMatch.name.toLowerCase()
        );
        
        if (restaurant) {
          matchedRestaurants.push({
            ...restaurant,
            matchReason: geminiMatch.matchReason,
            score: geminiMatch.confidence,
            isAIPowered: true
          });
        }
      }
    }

    console.log(`✅ Gemini AI found ${matchedRestaurants.length} matches`);
    return matchedRestaurants;

  } catch (error) {
    console.error("❌ Gemini AI error:", error);
    throw error; // Let the fallback handle it
  }
}

// Fallback-funktion för när Gemini misslyckas
function getFallbackMatches(
  preferences: string,
  restaurants: Restaurant[]
): Restaurant[] {
  console.log("🔄 Using fallback keyword matching...");
  
  const prefLower = preferences.toLowerCase();
  const matches: Restaurant[] = [];

  // Enkel nyckelordsmatching som fallback
  const keywords = {
    sushi: ['sushi', 'japanese', 'japan', 'ramen'],
    pizza: ['pizza', 'italian', 'pasta'],
    burger: ['burger', 'grill', 'bbq', 'american'],
    asian: ['asian', 'thai', 'chinese', 'korean'],
    mexican: ['mexican', 'taco', 'burrito'],
    indian: ['indian', 'curry', 'tandoori'],
    seafood: ['seafood', 'fish', 'ocean'],
    french: ['french', 'bistro', 'brasserie'],
    cafe: ['coffee', 'cafe', 'breakfast'],
    dessert: ['dessert', 'sweet', 'ice', 'bakery']
  };

  for (const [category, categoryKeywords] of Object.entries(keywords)) {
    const preferencesMatch = categoryKeywords.some(keyword => 
      prefLower.includes(keyword)
    );
    
    if (preferencesMatch) {
      const matchingRestaurants = restaurants.filter(restaurant =>
        categoryKeywords.some(keyword =>
          restaurant.name.toLowerCase().includes(keyword)
        )
      );

      matchingRestaurants.forEach(restaurant => {
        matches.push({
          ...restaurant,
          matchReason: `Found a great ${category} place nearby!`,
          score: 75,
          isAIPowered: false
        });
      });
    }
  }

    return matches.slice(0, 3);
  }

// Huvudfunktion för AI-matchning
async function getAIRestaurantMatches(
  preferences: string,
  restaurants: Restaurant[]
): Promise<Restaurant[]> {
  try {
    // Försök först med riktig Gemini AI
    const aiResults = await getGeminiMatches(preferences, restaurants);
    // Mark as AI-powered
    return aiResults.map(r => ({ ...r, isAIPowered: true }));
  } catch (error) {
    console.error("Gemini AI failed, using fallback:", error);
    // Fallback till enkel nyckelordsmatching
    const fallbackResults = getFallbackMatches(preferences, restaurants);
    // Mark as fallback
    return fallbackResults.map(r => ({ ...r, isAIPowered: false }));
  }
}

// Hämta restaurangbilder
async function fetchRestaurantImage(restaurantName: string): Promise<string | undefined> {
  const nameLower = restaurantName.toLowerCase();

  const imageCategories = {
    sushi: [
      "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop"
    ],
    pizza: [
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop"
    ],
    burger: [
      "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop"
    ],
    asian: [
      "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop"
    ],
    mexican: [
      "https://images.unsplash.com/photo-1565299585323-38174c5eeaed?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop"
    ],
    indian: [
      "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&h=300&fit=crop"
    ],
    seafood: [
      "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop"
    ],
    french: [
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1506368083636-6defb67639a7?w=400&h=300&fit=crop"
    ],
    cafe: [
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop"
    ],
    dessert: [
      "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=300&fit=crop"
    ],
    generic: [
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop"
    ]
  };

  //Här väljer vi kategori baserat på restaurangnamnet.
  let selectedCategory = "generic";
  if (nameLower.includes("sushi") || nameLower.includes("japan")) selectedCategory = "sushi";
  else if (nameLower.includes("pizza")) selectedCategory = "pizza";
  else if (nameLower.includes("burger")) selectedCategory = "burger";
  else if (nameLower.includes("pasta") || nameLower.includes("italian")) selectedCategory = "pizza";
  else if (nameLower.includes("thai") || nameLower.includes("chinese") || nameLower.includes("asian")) selectedCategory = "asian";
  else if (nameLower.includes("mexican") || nameLower.includes("taco")) selectedCategory = "mexican";
  else if (nameLower.includes("indian") || nameLower.includes("curry")) selectedCategory = "indian";
  else if (nameLower.includes("fish") || nameLower.includes("seafood")) selectedCategory = "seafood";
  else if (nameLower.includes("french") || nameLower.includes("bistro")) selectedCategory = "french";
  else if (nameLower.includes("cafe") || nameLower.includes("coffee")) selectedCategory = "cafe";
  else if (nameLower.includes("dessert") || nameLower.includes("sweet")) selectedCategory = "dessert";

  //Här väljer vi bild baserat på kategori.
  const categoryImages = imageCategories[selectedCategory as keyof typeof imageCategories];
  //Här hashar vi restaurangnamnet för att få en unik bild.
  const hash = restaurantName.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  const imageIndex = Math.abs(hash) % categoryImages.length;
  return categoryImages[imageIndex];
}

// Hämta närliggande restauranger från Overpass API
async function fetchNearbyRestaurants(center: LatLng): Promise<Restaurant[]> {
  const OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter"
  ];
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

  console.log(`🔍 Fetching restaurants within ${RADIUS}m of ${center.latitude}, ${center.longitude}`);

  //Här försöker vi hämta restauranger från olika serverar.
  for (let serverIndex = 0; serverIndex < OVERPASS_URLS.length; serverIndex++) {
    const currentUrl = OVERPASS_URLS[serverIndex];
    console.log(`🌐 Trying Overpass server ${serverIndex + 1}/${OVERPASS_URLS.length}`);

      try {
        const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(currentUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Overpass error: ${res.status}`);
        }

        const data = await res.json();
      console.log(`✅ Found ${data.elements?.length || 0} restaurant elements`);

        if (!data.elements || data.elements.length === 0) {
        continue; 
        }

        return processRestaurantData(data, center);
      } catch (error: any) {
      console.log(`❌ Server ${serverIndex + 1} failed:`, error.message);
      continue; 
    }
  }

  // Om servern misslyckas, returnera mock data.
  console.log("🔄 All Overpass servers failed, returning mock data");
  return getMockRestaurants(center);
}

// Processera restaurangdata från Overpass API
function processRestaurantData(data: any, center: LatLng): Restaurant[] {
  const places: Restaurant[] = (data.elements || [])
    .map((el: any) => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      const name = el.tags?.name ?? "Unknown restaurant";
      const address = el.tags?.["addr:full"] || 
        [el.tags?.["addr:street"], el.tags?.["addr:housenumber"]]
          .filter(Boolean)
          .join(" ");

      return lat && lon ? {
            id: String(el.id),
            name,
            lat,
            lon,
            address,
      } : null;
    })
    .filter(Boolean);

  return places as Restaurant[];
}

// Mock restauranger för testning
function getMockRestaurants(center: LatLng): Restaurant[] {
  const mockRestaurants = [
    { name: "Pizza Palace", type: "pizza" },
    { name: "Sushi Zen", type: "sushi" },
    { name: "Burger House", type: "burger" },
    { name: "Thai Garden", type: "thai" },
    { name: "Italian Corner", type: "italian" },
    { name: "Mexican Fiesta", type: "mexican" },
    { name: "Café Central", type: "cafe" },
    { name: "Steakhouse Prime", type: "steak" },
    { name: "Asian Fusion", type: "asian" },
    { name: "Mediterranean Delights", type: "mediterranean" }
  ];

  return mockRestaurants.map((restaurant, index) => ({
    id: `mock-${index}`,
    name: restaurant.name,
    lat: center.latitude + (Math.random() - 0.5) * 0.01,
    lon: center.longitude + (Math.random() - 0.5) * 0.01,
    address: `${Math.floor(Math.random() * 999) + 1} Main Street`
  }));
}

// Beräkna avstånd mellan två punkter
function haversineMeters(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const c = 2 * Math.asin(
      Math.sqrt(
        sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
      )
    );
  return R * c;
}

// Huvudkomponent som visar AI-matcher
export default function AIMatcherScreen() {
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [matchedRestaurants, setMatchedRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    })();
  }, []);

  const handleFindMatch = async () => {
    if (!preferences.trim()) {
      Alert.alert("Missing Preferences", "Please describe what you're craving!");
      return;
    }

    if (!location) {
      Alert.alert("Location Error", "We need your location to find nearby restaurants.");
      return;
    }

    setLoading(true);
    try {
      // Hämta närliggande restauranger
      const restaurants = await fetchNearbyRestaurants(location);

      // Lägg till avstånd och bilder
      const restaurantsWithDetails = await Promise.all(
        restaurants.map(async (restaurant) => ({
          ...restaurant,
          distanceMeters: haversineMeters(location, {
            latitude: restaurant.lat,
            longitude: restaurant.lon,
          }),
          imageUrl: await fetchRestaurantImage(restaurant.name),
        }))
      );

      // Hämta AI-matchningar
      const matches = await getAIRestaurantMatches(preferences, restaurantsWithDetails);
      setMatchedRestaurants(matches);

      if (matches.length === 0) {
        Alert.alert(
          "No Matches Found",
          "Couldn't find good matches for your preferences. Try describing your cravings differently!"
        );
      }
    } catch (error) {
      console.error("AI matcher error:", error);
      Alert.alert(
        "Search Error",
        "Something went wrong while searching. Please try again!"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMatch = async (restaurant: Restaurant) => {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const likedPlaces = existing ? JSON.parse(existing) : [];
      const updated = [...likedPlaces, restaurant];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      Alert.alert("Saved!", "Restaurant added to your favorites.");
    } catch (error) {
      Alert.alert("Error", "Failed to save restaurant.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>🤖 Real Gemini AI Matcher</Text>
          <Text style={styles.subtitle}>
            Powered by Google's Gemini AI - Advanced natural language processing 
            that understands your cravings and finds perfect restaurant matches!
          </Text>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>🚀 Real Gemini AI</Text>
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>What are you in the mood for?</Text>
          <TextInput
            style={styles.textInput}
            value={preferences}
            onChangeText={setPreferences}
            placeholder="e.g., 'spicy Asian food', 'cozy Italian place', 'healthy breakfast'..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.findButton, loading && styles.findButtonDisabled]}
            onPress={handleFindMatch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.findButtonText}>🤖 Ask Gemini AI</Text>
            )}
          </TouchableOpacity>
        </View>

        {matchedRestaurants.length > 0 && (
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>
              🎯 {matchedRestaurants.length > 1 
                ? `${matchedRestaurants.length} AI Matches Found!` 
                : "Perfect AI Match Found!"}
            </Text>

            {matchedRestaurants.map((restaurant, index) => (
              <View key={restaurant.id || index} style={styles.restaurantCard}>
                {restaurant.imageUrl && (
                  <Image
                    source={{ uri: restaurant.imageUrl }}
                    style={styles.restaurantImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.restaurantOverlay} />

                <View style={styles.restaurantContent}>
                  <View style={styles.restaurantHeader}>
                    <Text style={styles.restaurantName}>{restaurant.name}</Text>
                    <View style={[
                        styles.aiSourceBadge,
                        restaurant.isAIPowered
                          ? styles.aiSourceBadgeAI
                        : styles.aiSourceBadgeFallback
                    ]}>
                      <Text style={styles.aiSourceText}>
                        {restaurant.isAIPowered ? "🤖 Gemini AI" : "🧠 Fallback"}
                      </Text>
                    </View>
                  </View>

                  {restaurant.address && (
                    <Text style={styles.restaurantAddress}>
                      📍 {restaurant.address}
                    </Text>
                  )}

                  {restaurant.distanceMeters && (
                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceText}>
                        {restaurant.distanceMeters < 1000
                          ? `${Math.round(restaurant.distanceMeters)} m away`
                          : `${(restaurant.distanceMeters / 1000).toFixed(1)} km away`}
                      </Text>
                    </View>
                  )}

                  {restaurant.matchReason && (
                    <View style={styles.matchReasonBadge}>
                      <Text style={styles.matchReasonText}>
                        ✨ {restaurant.matchReason}
                      </Text>
                    </View>
                  )}

                  {restaurant.score && restaurant.isAIPowered && (
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        🎯 AI Confidence: {restaurant.score}%
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => handleSaveMatch(restaurant)}
                  >
                    <Text style={styles.saveButtonText}>
                      ❤️ Save to Favorites
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Tips for better AI matches:</Text>
          <Text style={styles.tipText}>
            • Be specific: "spicy Thai noodles" vs "Asian food"
          </Text>
          <Text style={styles.tipText}>
            • Mention atmosphere: "cozy", "casual", "upscale"
          </Text>
          <Text style={styles.tipText}>
            • Include dietary needs: "vegetarian", "gluten-free"
          </Text>
          <Text style={styles.tipText}>
            • Describe mood: "comfort food", "healthy", "indulgent"
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 12,
  },
  aiBadge: {
    backgroundColor: "#4285F4",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "center",
  },
  aiBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  inputSection: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1A1A1A",
    borderWidth: 2,
    borderColor: "#E5E5E5",
    minHeight: 100,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  findButton: {
    backgroundColor: "#4285F4",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#4285F4",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  findButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
  },
  findButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  resultSection: {
    marginBottom: 32,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
    textAlign: "center",
  },
  restaurantCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    position: "relative",
    minHeight: 300,
    marginBottom: 20,
  },
  restaurantImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  restaurantOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  restaurantContent: {
    padding: 24,
    position: "relative",
    zIndex: 1,
    flex: 1,
    justifyContent: "center",
  },
  restaurantHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  restaurantName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    flex: 1,
  },
  aiSourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
    alignItems: "center",
  },
  aiSourceBadgeAI: {
    backgroundColor: "#4285F4",
  },
  aiSourceBadgeFallback: {
    backgroundColor: "#FF9800",
  },
  aiSourceText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  restaurantAddress: {
    fontSize: 16,
    color: "#F0F0F0",
    textAlign: "center",
    marginBottom: 16,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  distanceBadge: {
    backgroundColor: "rgba(46, 125, 50, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: "center",
    marginBottom: 12,
  },
  distanceText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  matchReasonBadge: {
    backgroundColor: "rgba(66, 133, 244, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 12,
  },
  matchReasonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  confidenceBadge: {
    backgroundColor: "rgba(255, 193, 7, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: "center",
    marginBottom: 20,
  },
  confidenceText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: "center",
  },
  saveButtonText: {
    color: "#4285F4",
    fontSize: 16,
    fontWeight: "700",
  },
  tipsSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
    lineHeight: 20,
  },
});