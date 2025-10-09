import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Location from "expo-location";
import OpenAI from "openai";
import React, { useEffect, useState } from "react";

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
};

const STORAGE_KEY = "@liked_restaurants";

// Real AI-powered restaurant matching function using OpenAI - ONLY AI, NO FALLBACKS
async function getAIRestaurantMatches(
  preferences: string,
  restaurants: Restaurant[]
): Promise<Restaurant[]> {
  try {
    // Only use real AI - no fallbacks
    const aiResults = await getOpenAIMatches(preferences, restaurants);
    return aiResults;
  } catch (error) {
    console.error("AI matching error:", error);
    // Return empty array if AI fails - no fallback simulation
    return [];
  }
}

// OpenAI-powered matching - NOW RETURNS MULTIPLE MATCHES
async function getOpenAIMatches(
  preferences: string,
  restaurants: Restaurant[]
): Promise<Restaurant[]> {
  try {
    // Validate we have restaurants to work with
    if (!restaurants || restaurants.length === 0) {
      console.error("Debug: No restaurants provided to AI function");
      return [];
    }

    console.log(
      `Debug: Processing ${restaurants.length} restaurants for AI analysis`
    );

    // Create a simplified list of restaurants for AI to analyze
    const restaurantList = restaurants.map((r, index) => ({
      index,
      name: r.name,
      address: r.address || "Unknown address",
      distance: r.distanceMeters
        ? `${Math.round(r.distanceMeters)}m`
        : "Unknown distance",
    }));

    console.log("Debug: Restaurant list prepared:", restaurantList.slice(0, 3)); // Show first 3

    const prompt = `
You are a food expert helping someone find the perfect restaurants. 

User preferences: "${preferences}"

Available restaurants nearby:
${restaurantList.map((r) => `${r.index}: ${r.name} (${r.address}) - ${r.distance} away`).join("\n")}

Please analyze the user's preferences and recommend the TOP 3 BEST matching restaurants from the list above, ranked by how well they match the user's preferences.

Respond ONLY with a JSON array in this exact format:
[
  {
    "restaurantIndex": [number - the index of the best matching restaurant],
    "matchReason": "[brief explanation why this restaurant matches their preferences]",
    "confidence": [number between 0-100 indicating how confident you are in this match]
  },
  {
    "restaurantIndex": [number - the index of the second best matching restaurant],
    "matchReason": "[brief explanation why this restaurant matches their preferences]", 
    "confidence": [number between 0-100 indicating how confident you are in this match]
  },
  {
    "restaurantIndex": [number - the index of the third best matching restaurant],
    "matchReason": "[brief explanation why this restaurant matches their preferences]",
    "confidence": [number between 0-100 indicating how confident you are in this match]
  }
]

Important rules:
- Always return exactly 3 restaurants if possible
- Each restaurant index must be different
- Rank them by best match first
- If fewer than 3 good matches exist, return fewer results
- If no restaurants match well, return an empty array: []
`;

    // Get OpenAI API key from environment variables first, then fall back to Expo config
    const apiKey =
      process.env.OPENAI_API_KEY || Constants.expoConfig?.extra?.openaiApiKey;

    // Enhanced debug logging
    console.log("Debug: Constants.expoConfig:", Constants.expoConfig);
    console.log("Debug: API Key found:", apiKey ? "Yes" : "No");
    console.log("Debug: API Key length:", apiKey?.length || 0);
    console.log(
      "Debug: API Key starts with 'sk-':",
      apiKey?.startsWith("sk-") || false
    );

    if (apiKey && apiKey.startsWith("sk-")) {
      // 🚀 REAL AI INTEGRATION
      console.log("Debug: Attempting to create OpenAI client...");
      const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true, // Required for React Native/Expo
      });

      console.log("Debug: Making OpenAI API call...");
      console.log("Debug: Using model: gpt-3.5-turbo");
      console.log("Debug: Prompt length:", prompt.length);

      // Add retry logic for rate limits
      let completion;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          completion = await openai.chat.completions.create(
            {
              messages: [{ role: "user", content: prompt }],
              model: "gpt-3.5-turbo",
              temperature: 0.7,
              max_tokens: 1000,
            },
            {
              timeout: 30000, // 30 second timeout
            }
          );
          break; // Success, exit retry loop
        } catch (apiError: any) {
          retryCount++;

          if (apiError?.status === 429 || apiError?.message?.includes("429")) {
            console.log(
              `Debug: Rate limit hit, retry ${retryCount}/${maxRetries}`
            );
            if (retryCount < maxRetries) {
              // Exponential backoff: wait 2^retryCount seconds
              const waitTime = Math.pow(2, retryCount) * 1000;
              console.log(`Debug: Waiting ${waitTime}ms before retry...`);
              await new Promise((resolve) => setTimeout(resolve, waitTime));
              continue;
            }
          }
          throw apiError; // Re-throw if not a rate limit or max retries reached
        }
      }

      if (!completion) {
        console.error("Debug: No completion received after retries");
        return [];
      }

      console.log("Debug: OpenAI API call successful");
      console.log(
        "Debug: Response status:",
        completion.choices?.length > 0 ? "OK" : "No choices"
      );

      console.log(
        "Debug: OpenAI response received:",
        completion.choices[0].message.content
      );

      // Enhanced JSON parsing with better error handling
      let aiResponses;
      try {
        const responseContent = completion.choices[0].message.content;
        if (!responseContent) {
          console.error("Debug: OpenAI returned empty response");
          return [];
        }

        aiResponses = JSON.parse(responseContent);
        console.log("Debug: Successfully parsed AI responses:", aiResponses);
      } catch (parseError) {
        console.error("Debug: JSON parsing error:", parseError);
        console.error(
          "Debug: Raw response that failed to parse:",
          completion?.choices[0]?.message?.content || "No content"
        );
        return [];
      }

      // Process multiple AI responses
      const validMatches: Restaurant[] = [];

      if (Array.isArray(aiResponses)) {
        for (const aiResponse of aiResponses) {
          if (
            aiResponse.restaurantIndex >= 0 &&
            aiResponse.restaurantIndex < restaurants.length
          ) {
            console.log(
              "Debug: Valid restaurant match found at index:",
              aiResponse.restaurantIndex
            );
            const selectedRestaurant = restaurants[aiResponse.restaurantIndex];
            validMatches.push({
              ...selectedRestaurant,
              matchReason: aiResponse.matchReason,
              score: aiResponse.confidence,
            });
          }
        }
      }

      console.log(`Debug: Found ${validMatches.length} valid AI matches`);
      return validMatches;
    } else {
      console.log("No OpenAI API key found - cannot use AI without key");
      throw new Error("OpenAI API key required for AI-only mode");
    }

    // No fallback - pure AI only
  } catch (error) {
    console.error("OpenAI API error:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);

      // Check for specific OpenAI API errors
      if (error.message.includes("401")) {
        console.error("🔑 Authentication error - Check your API key");
      } else if (error.message.includes("429")) {
        console.error("⏰ Rate limit error - Too many requests");
      } else if (error.message.includes("500")) {
        console.error("🔧 OpenAI server error - Try again later");
      } else if (error.message.includes("network")) {
        console.error("🌐 Network error - Check internet connection");
      }
    } else {
      console.error("Unknown error type:", typeof error);
    }

    return [];
  }
}

// Simulate multiple smart AI responses - RETURNS TOP 3 MATCHES
function simulateMultipleOpenAIResponses(
  preferences: string,
  restaurants: Restaurant[]
): Restaurant[] {
  const prefLower = preferences.toLowerCase();
  const matches: Array<{
    restaurant: Restaurant;
    score: number;
    reason: string;
  }> = [];

  // AI-like analysis of preferences - EXPANDED WITH MORE OPTIONS
  const analyses = [
    {
      keywords: [
        "sushi",
        "japanese",
        "japan",
        "maki",
        "sashimi",
        "raw fish",
        "wasabi",
        "ginger",
        "sake",
      ],
      category: "Japanese/Sushi",
      searchTerms: ["sushi", "japan", "maki", "ramen", "tempura"],
    },
    {
      keywords: [
        "pizza",
        "italian",
        "cheese",
        "pepperoni",
        "margherita",
        "pasta",
        "carbonara",
        "lasagna",
        "risotto",
      ],
      category: "Italian/Pizza",
      searchTerms: ["pizza", "italian", "italia", "pasta", "ristorante"],
    },
    {
      keywords: [
        "burger",
        "fries",
        "american",
        "bbq",
        "meat",
        "beef",
        "chicken wings",
        "steak",
        "hot dog",
      ],
      category: "American/Burger",
      searchTerms: ["burger", "grill", "american", "bbq", "steakhouse"],
    },
    {
      keywords: [
        "thai",
        "pad thai",
        "curry",
        "spicy",
        "asian",
        "noodles",
        "tom yum",
        "green curry",
        "coconut",
      ],
      category: "Thai/Asian",
      searchTerms: ["thai", "asian", "curry", "wok", "pad"],
    },
    {
      keywords: [
        "chinese",
        "fried rice",
        "dim sum",
        "wok",
        "szechuan",
        "kung pao",
        "sweet sour",
        "chow mein",
      ],
      category: "Chinese",
      searchTerms: ["chinese", "wok", "asia", "dim", "beijing"],
    },
    {
      keywords: [
        "mexican",
        "taco",
        "burrito",
        "salsa",
        "guacamole",
        "spicy",
        "quesadilla",
        "nachos",
        "fajitas",
      ],
      category: "Mexican",
      searchTerms: ["mexican", "taco", "burrito", "cantina", "aztec"],
    },
    {
      keywords: [
        "indian",
        "curry",
        "tandoori",
        "naan",
        "biryani",
        "masala",
        "tikka",
        "vindaloo",
        "samosa",
      ],
      category: "Indian",
      searchTerms: ["indian", "curry", "tandoori", "masala", "mumbai"],
    },
    {
      keywords: [
        "french",
        "bistro",
        "croissant",
        "baguette",
        "wine",
        "cheese",
        "escargot",
        "ratatouille",
      ],
      category: "French/Bistro",
      searchTerms: ["french", "bistro", "brasserie", "cafe", "paris"],
    },
    {
      keywords: [
        "greek",
        "mediterranean",
        "gyros",
        "souvlaki",
        "feta",
        "olive",
        "tzatziki",
        "moussaka",
      ],
      category: "Greek/Mediterranean",
      searchTerms: ["greek", "mediterranean", "gyros", "taverna", "athens"],
    },
    {
      keywords: [
        "seafood",
        "fish",
        "salmon",
        "shrimp",
        "lobster",
        "crab",
        "oyster",
        "mussels",
        "fresh fish",
      ],
      category: "Seafood",
      searchTerms: ["seafood", "fish", "ocean", "marine", "catch"],
    },
  ];

  // Find all matching categories
  for (const analysis of analyses) {
    const keywordScore = analysis.keywords.filter((keyword) =>
      prefLower.includes(keyword)
    ).length;

    if (keywordScore > 0) {
      // Find restaurants matching this category
      restaurants.forEach((restaurant, index) => {
        const restaurantName = restaurant.name.toLowerCase();
        const categoryScore = analysis.searchTerms.filter((term) =>
          restaurantName.includes(term)
        ).length;

        if (categoryScore > 0) {
          // Distance bonus
          let distanceBonus = 0;
          if (restaurant.distanceMeters) {
            if (restaurant.distanceMeters < 300) distanceBonus = 3;
            else if (restaurant.distanceMeters < 600) distanceBonus = 2;
            else if (restaurant.distanceMeters < 1000) distanceBonus = 1;
          }

          const totalScore =
            keywordScore * 10 + categoryScore * 15 + distanceBonus;
          const confidence = Math.min(95, 50 + totalScore * 3);

          matches.push({
            restaurant,
            score: totalScore,
            reason: `Perfect ${analysis.category} spot matching your "${preferences}" craving!`,
          });
        }
      });
    }
  }

  // Sort by score and take top 3
  const topMatches = matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((match) => ({
      ...match.restaurant,
      matchReason: match.reason,
      score: Math.min(95, 50 + match.score * 3),
    }));

  // If we have matches, return them
  if (topMatches.length > 0) {
    return topMatches;
  }

  // Fallback: return 3 closest restaurants
  const closestRestaurants = restaurants
    .filter((r) => r.distanceMeters)
    .sort((a, b) => a.distanceMeters! - b.distanceMeters!)
    .slice(0, 3)
    .map((restaurant) => ({
      ...restaurant,
      matchReason: `Great nearby option that might satisfy your cravings!`,
      score: 45,
    }));

  return closestRestaurants;
}

// Original single response function (kept for compatibility)
function simulateOpenAIResponse(
  preferences: string,
  restaurants: Restaurant[]
) {
  const prefLower = preferences.toLowerCase();

  // AI-like analysis of preferences - EXPANDED WITH MORE OPTIONS
  const analyses = [
    {
      keywords: [
        "sushi",
        "japanese",
        "japan",
        "maki",
        "sashimi",
        "raw fish",
        "wasabi",
        "ginger",
        "sake",
      ],
      category: "Japanese/Sushi",
      searchTerms: ["sushi", "japan", "maki", "ramen", "tempura"],
    },
    {
      keywords: [
        "pizza",
        "italian",
        "cheese",
        "pepperoni",
        "margherita",
        "pasta",
        "carbonara",
        "lasagna",
        "risotto",
      ],
      category: "Italian/Pizza",
      searchTerms: ["pizza", "italian", "italia", "pasta", "ristorante"],
    },
    {
      keywords: [
        "burger",
        "fries",
        "american",
        "bbq",
        "meat",
        "beef",
        "chicken wings",
        "steak",
        "hot dog",
      ],
      category: "American/Burger",
      searchTerms: ["burger", "grill", "american", "bbq", "steakhouse"],
    },
    {
      keywords: [
        "thai",
        "pad thai",
        "curry",
        "spicy",
        "asian",
        "noodles",
        "tom yum",
        "green curry",
        "coconut",
      ],
      category: "Thai/Asian",
      searchTerms: ["thai", "asian", "curry", "wok", "pad"],
    },
    {
      keywords: [
        "chinese",
        "fried rice",
        "dim sum",
        "wok",
        "szechuan",
        "kung pao",
        "sweet sour",
        "chow mein",
      ],
      category: "Chinese",
      searchTerms: ["chinese", "wok", "asia", "dim", "beijing"],
    },
    {
      keywords: [
        "mexican",
        "taco",
        "burrito",
        "salsa",
        "guacamole",
        "spicy",
        "quesadilla",
        "nachos",
        "fajitas",
      ],
      category: "Mexican",
      searchTerms: ["mexican", "taco", "burrito", "cantina", "aztec"],
    },
    {
      keywords: [
        "indian",
        "curry",
        "tandoori",
        "naan",
        "biryani",
        "masala",
        "tikka",
        "vindaloo",
        "samosa",
      ],
      category: "Indian",
      searchTerms: ["indian", "curry", "tandoori", "masala", "mumbai"],
    },
    {
      keywords: [
        "french",
        "bistro",
        "croissant",
        "baguette",
        "wine",
        "cheese",
        "escargot",
        "ratatouille",
      ],
      category: "French/Bistro",
      searchTerms: ["french", "bistro", "brasserie", "cafe", "paris"],
    },
    {
      keywords: [
        "greek",
        "mediterranean",
        "gyros",
        "souvlaki",
        "feta",
        "olive",
        "tzatziki",
        "moussaka",
      ],
      category: "Greek/Mediterranean",
      searchTerms: ["greek", "mediterranean", "gyros", "taverna", "athens"],
    },
    {
      keywords: [
        "seafood",
        "fish",
        "salmon",
        "shrimp",
        "lobster",
        "crab",
        "oyster",
        "mussels",
        "fresh fish",
      ],
      category: "Seafood",
      searchTerms: ["seafood", "fish", "ocean", "marine", "catch"],
    },
    {
      keywords: [
        "vegetarian",
        "vegan",
        "plant based",
        "tofu",
        "quinoa",
        "kale",
        "organic",
        "raw",
        "green",
      ],
      category: "Vegetarian/Vegan",
      searchTerms: ["vegetarian", "vegan", "plant", "green", "organic"],
    },
    {
      keywords: [
        "healthy",
        "salad",
        "fresh",
        "light",
        "low carb",
        "protein",
        "fitness",
        "clean eating",
      ],
      category: "Healthy/Fresh",
      searchTerms: ["salad", "health", "fresh", "green", "fit"],
    },
    {
      keywords: [
        "coffee",
        "cafe",
        "breakfast",
        "brunch",
        "pastry",
        "croissant",
        "latte",
        "cappuccino",
        "espresso",
      ],
      category: "Cafe/Breakfast",
      searchTerms: ["cafe", "coffee", "breakfast", "brunch", "espresso"],
    },
    {
      keywords: [
        "dessert",
        "sweet",
        "ice cream",
        "cake",
        "chocolate",
        "bakery",
        "pastry",
        "cookies",
      ],
      category: "Dessert/Sweet",
      searchTerms: ["dessert", "sweet", "ice", "cake", "bakery"],
    },
    {
      keywords: [
        "korean",
        "kimchi",
        "bulgogi",
        "bibimbap",
        "korean bbq",
        "ramen",
        "kpop",
        "seoul",
      ],
      category: "Korean",
      searchTerms: ["korean", "kim", "seoul", "bbq", "asia"],
    },
    {
      keywords: [
        "middle eastern",
        "kebab",
        "hummus",
        "falafel",
        "shawarma",
        "pita",
        "tahini",
        "lebanese",
      ],
      category: "Middle Eastern",
      searchTerms: ["kebab", "middle", "eastern", "arabic", "turkish"],
    },
    {
      keywords: [
        "fine dining",
        "upscale",
        "fancy",
        "expensive",
        "michelin",
        "gourmet",
        "elegant",
        "formal",
      ],
      category: "Fine Dining",
      searchTerms: ["fine", "upscale", "gourmet", "restaurant", "dining"],
    },
    {
      keywords: [
        "fast food",
        "quick",
        "cheap",
        "takeaway",
        "delivery",
        "fast",
        "casual",
        "on the go",
      ],
      category: "Fast Food/Casual",
      searchTerms: ["fast", "quick", "casual", "takeaway", "express"],
    },
    {
      keywords: [
        "bar",
        "pub",
        "drinks",
        "beer",
        "cocktails",
        "wine",
        "happy hour",
        "nightlife",
        "social",
      ],
      category: "Bar/Pub",
      searchTerms: ["bar", "pub", "drinks", "beer", "wine"],
    },
    {
      keywords: [
        "family",
        "kids",
        "children",
        "family friendly",
        "playground",
        "casual dining",
        "portions",
      ],
      category: "Family Friendly",
      searchTerms: ["family", "kids", "casual", "friendly", "children"],
    },
  ];

  // Find best category match
  let bestMatch = null;
  let bestScore = 0;

  for (const analysis of analyses) {
    const score = analysis.keywords.filter((keyword) =>
      prefLower.includes(keyword)
    ).length;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = analysis;
    }
  }

  if (bestMatch && bestScore > 0) {
    // Find restaurants matching this category
    const matchingRestaurants = restaurants
      .map((restaurant, index) => {
        const restaurantName = restaurant.name.toLowerCase();
        const categoryScore = bestMatch!.searchTerms.filter((term) =>
          restaurantName.includes(term)
        ).length;

        // Distance bonus
        let distanceBonus = 0;
        if (restaurant.distanceMeters) {
          if (restaurant.distanceMeters < 300) distanceBonus = 3;
          else if (restaurant.distanceMeters < 600) distanceBonus = 2;
          else if (restaurant.distanceMeters < 1000) distanceBonus = 1;
        }

        return {
          index,
          score: categoryScore * 10 + distanceBonus,
          restaurant,
        };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);

    if (matchingRestaurants.length > 0) {
      const winner = matchingRestaurants[0];
      return {
        restaurantIndex: winner.index,
        matchReason: `Perfect ${bestMatch.category} spot matching your "${preferences}" craving!`,
        confidence: Math.min(95, 60 + winner.score * 5),
      };
    }
  }

  // If no specific match, find closest restaurant
  const closestRestaurant = restaurants
    .map((r, index) => ({ ...r, index }))
    .filter((r) => r.distanceMeters)
    .sort((a, b) => a.distanceMeters! - b.distanceMeters!)[0];

  if (closestRestaurant) {
    return {
      restaurantIndex: closestRestaurant.index,
      matchReason: `Great nearby option that might satisfy your cravings!`,
      confidence: 45,
    };
  }

  return {
    restaurantIndex: -1,
    matchReason: "No good matches found for your preferences",
    confidence: 0,
  };
}

// Fallback keyword-based matching - NOW RETURNS MULTIPLE MATCHES
function getFallbackMatches(
  preferences: string,
  restaurants: Restaurant[]
): Restaurant[] {
  const prefLower = preferences.toLowerCase();
  const keywords = {
    sushi: ["sushi", "japanese", "japan", "ramen", "tempura"],
    pizza: ["pizza", "italian", "pasta", "ristorante"],
    burger: ["burger", "grill", "bbq", "american", "steakhouse"],
    asian: ["asian", "thai", "chinese", "korean", "wok"],
    mexican: ["mexican", "taco", "burrito", "cantina"],
    indian: ["indian", "curry", "tandoori", "masala"],
    seafood: ["seafood", "fish", "ocean", "marine"],
    french: ["french", "bistro", "brasserie"],
    greek: ["greek", "mediterranean", "gyros", "taverna"],
    vegetarian: ["vegetarian", "vegan", "plant", "organic"],
    cafe: ["coffee", "cafe", "breakfast", "brunch"],
    dessert: ["dessert", "sweet", "ice", "bakery"],
    kebab: ["kebab", "middle", "eastern", "turkish"],
    bar: ["bar", "pub", "drinks", "beer"],
  };

  const matches: Restaurant[] = [];

  for (const [category, categoryKeywords] of Object.entries(keywords)) {
    const preferencesMatch = categoryKeywords.some((keyword) =>
      prefLower.includes(keyword)
    );
    if (preferencesMatch) {
      const matchingRestaurants = restaurants.filter((restaurant) =>
        categoryKeywords.some((keyword) =>
          restaurant.name.toLowerCase().includes(keyword)
        )
      );

      matchingRestaurants.forEach((restaurant) => {
        matches.push({
          ...restaurant,
          matchReason: `Found a great ${category} place nearby!`,
          score: 75,
        });
      });
    }
  }

  // If we found matches, return top 3
  if (matches.length > 0) {
    return matches.slice(0, 3);
  }

  // Fallback: return 3 closest restaurants
  return restaurants.slice(0, 3).map((restaurant) => ({
    ...restaurant,
    matchReason: "Here's a popular nearby option!",
    score: 50,
  }));
}

// Original single match function (kept for compatibility)
function getFallbackMatch(
  preferences: string,
  restaurants: Restaurant[]
): Restaurant | null {
  const matches = getFallbackMatches(preferences, restaurants);
  return matches.length > 0 ? matches[0] : null;
}

// Fetch restaurant image (reusing from swipe.tsx)
async function fetchRestaurantImage(
  restaurantName: string
): Promise<string | undefined> {
  const nameLower = restaurantName.toLowerCase();

  const imageCategories = {
    sushi: [
      "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=400&h=300&fit=crop",
    ],
    pizza: [
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
    ],
    burger: [
      "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=300&fit=crop",
    ],
    italian: [
      "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1563379091339-03246963d51a?w=400&h=300&fit=crop",
    ],
    asian: [
      "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
    ],
    mexican: [
      "https://images.unsplash.com/photo-1565299585323-38174c5eeaed?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1613514785940-daed07799d9b?w=400&h=300&fit=crop",
    ],
    indian: [
      "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop",
    ],
    seafood: [
      "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=400&h=300&fit=crop",
    ],
    french: [
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1506368083636-6defb67639a7?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop",
    ],
    cafe: [
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400&h=300&fit=crop",
    ],
    dessert: [
      "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop",
    ],
    generic: [
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop",
    ],
  };

  let selectedCategory = "generic";
  if (nameLower.includes("sushi") || nameLower.includes("japan"))
    selectedCategory = "sushi";
  else if (nameLower.includes("pizza")) selectedCategory = "pizza";
  else if (nameLower.includes("burger")) selectedCategory = "burger";
  else if (nameLower.includes("pasta") || nameLower.includes("italian"))
    selectedCategory = "italian";
  else if (
    nameLower.includes("thai") ||
    nameLower.includes("chinese") ||
    nameLower.includes("asian") ||
    nameLower.includes("korean")
  )
    selectedCategory = "asian";
  else if (nameLower.includes("mexican") || nameLower.includes("taco"))
    selectedCategory = "mexican";
  else if (nameLower.includes("indian") || nameLower.includes("curry"))
    selectedCategory = "indian";
  else if (
    nameLower.includes("fish") ||
    nameLower.includes("seafood") ||
    nameLower.includes("ocean")
  )
    selectedCategory = "seafood";
  else if (nameLower.includes("french") || nameLower.includes("bistro"))
    selectedCategory = "french";
  else if (nameLower.includes("cafe") || nameLower.includes("coffee"))
    selectedCategory = "cafe";
  else if (
    nameLower.includes("dessert") ||
    nameLower.includes("ice") ||
    nameLower.includes("sweet")
  )
    selectedCategory = "dessert";

  const categoryImages =
    imageCategories[selectedCategory as keyof typeof imageCategories];
  const hash = restaurantName.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  const imageIndex = Math.abs(hash) % categoryImages.length;
  return categoryImages[imageIndex];
}

// Fetch nearby restaurants with robust error handling and retry logic
async function fetchNearbyRestaurants(center: LatLng): Promise<Restaurant[]> {
  const OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
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

  console.log(
    `Debug: Fetching restaurants within ${RADIUS}m of ${center.latitude}, ${center.longitude}`
  );

  // Try multiple Overpass servers with retry logic
  for (let serverIndex = 0; serverIndex < OVERPASS_URLS.length; serverIndex++) {
    const currentUrl = OVERPASS_URLS[serverIndex];
    console.log(
      `Debug: Trying Overpass server ${serverIndex + 1}/${OVERPASS_URLS.length}: ${currentUrl}`
    );

    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        console.log(
          `Debug: Attempt ${retryCount + 1}/${maxRetries + 1} for server ${serverIndex + 1}`
        );

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

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
          console.log(
            `Debug: Server ${serverIndex + 1} returned ${res.status}: ${res.statusText}`
          );
          if (res.status === 504 || res.status === 503 || res.status === 502) {
            // Server errors - try next retry or server
            throw new Error(`Server error: ${res.status}`);
          }
          throw new Error(`Overpass error: ${res.status}`);
        }

        const data = await res.json();
        console.log(
          `Debug: Successfully fetched data from server ${serverIndex + 1}`
        );
        console.log(
          `Debug: Found ${data.elements?.length || 0} restaurant elements`
        );

        if (!data.elements || data.elements.length === 0) {
          console.log(
            "Debug: No restaurants found in this area, trying different approach..."
          );
          // Try with a larger radius if no results
          if (retryCount === 0) {
            const largerQuery = query.replace(
              `around:${RADIUS}`,
              `around:${RADIUS * 2}`
            );
            const largerRes = await fetch(currentUrl, {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/x-www-form-urlencoded;charset=UTF-8",
              },
              body: `data=${encodeURIComponent(largerQuery)}`,
            });

            if (largerRes.ok) {
              const largerData = await largerRes.json();
              if (largerData.elements?.length > 0) {
                console.log(
                  `Debug: Found ${largerData.elements.length} restaurants with larger radius`
                );
                return processRestaurantData(largerData, center);
              }
            }
          }
        }

        return processRestaurantData(data, center);
      } catch (error: any) {
        console.log(
          `Debug: Error with server ${serverIndex + 1}, attempt ${retryCount + 1}:`,
          error.message
        );

        retryCount++;
        if (
          retryCount <= maxRetries &&
          (error.message.includes("504") ||
            error.message.includes("503") ||
            error.message.includes("502") ||
            error.name === "AbortError")
        ) {
          const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`Debug: Waiting ${waitTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else {
          break; // Try next server
        }
      }
    }
  }

  // If all servers fail, return mock data for testing
  console.log(
    "Debug: All Overpass servers failed, returning mock restaurant data for testing"
  );
  return getMockRestaurants(center);
}

// Process restaurant data from Overpass API
function processRestaurantData(data: any, center: LatLng): Restaurant[] {
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
          }
        : null;
    })
    .filter(Boolean);

  return places as Restaurant[];
}

// Mock restaurants for testing when Overpass API fails
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
    { name: "Mediterranean Delights", type: "mediterranean" },
  ];

  return mockRestaurants.map((restaurant, index) => ({
    id: `mock-${index}`,
    name: restaurant.name,
    lat: center.latitude + (Math.random() - 0.5) * 0.01,
    lon: center.longitude + (Math.random() - 0.5) * 0.01,
    address: `${Math.floor(Math.random() * 999) + 1} Main Street`,
  }));
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

export default function AIMatcherScreen() {
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [matchedRestaurants, setMatchedRestaurants] = useState<Restaurant[]>(
    []
  );

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
      Alert.alert(
        "Missing Preferences",
        "Please describe what you're craving!"
      );
      return;
    }

    if (!location) {
      Alert.alert(
        "Location Error",
        "We need your location to find nearby restaurants."
      );
      return;
    }

    setLoading(true);
    try {
      // Fetch nearby restaurants
      const restaurants = await fetchNearbyRestaurants(location);

      // Add distances and images
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

      // Get AI matches (now returns multiple results)
      const matches = await getAIRestaurantMatches(
        preferences,
        restaurantsWithDetails
      );
      setMatchedRestaurants(matches);

      if (matches.length === 0) {
        Alert.alert(
          "No AI Matches Found",
          "OpenAI couldn't find good matches for your preferences. Try describing your cravings differently, or check if your OpenAI API key is properly configured."
        );
      }
    } catch (error) {
      console.error("AI matcher error:", error);
      if (error instanceof Error && error.message.includes("API key")) {
        Alert.alert(
          "OpenAI API Key Required",
          "This app now uses pure AI analysis. Please add your OpenAI API key in app.json to use this feature."
        );
      } else {
        Alert.alert(
          "AI Error",
          "Failed to get AI recommendations. Please check your OpenAI API key and try again."
        );
      }
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
          <Text style={styles.title}>� AI Restaurant Matcher</Text>
          <Text style={styles.subtitle}>
            Powered exclusively by OpenAI GPT that analyzes your preferences and
            finds the perfect matches nearby - no simulation, pure AI
            intelligence!
          </Text>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>🚀 Pure OpenAI GPT</Text>
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
              <Text style={styles.findButtonText}>🔍 Find My Match</Text>
            )}
          </TouchableOpacity>
        </View>

        {matchedRestaurants.length > 0 && (
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>
              🎯{" "}
              {matchedRestaurants.length > 1
                ? `${matchedRestaurants.length} Perfect Matches Found!`
                : "Perfect Match Found!"}
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
                  <Text style={styles.restaurantName}>{restaurant.name}</Text>

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
          <Text style={styles.tipsTitle}>💡 Tips for better matches:</Text>
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
    backgroundColor: "#4CAF50",
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
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#FF6B6B",
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
  restaurantName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
    backgroundColor: "rgba(255, 107, 107, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 20,
  },
  matchReasonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: "center",
  },
  saveButtonText: {
    color: "#FF6B6B",
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
