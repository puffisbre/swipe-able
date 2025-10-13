import React, { useRef, useEffect, useState } from "react";
import { Platform, StyleSheet, Text, ActivityIndicator } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import type { LatLng, Place } from "../utils/restaurant-api";

// Dynamic imports for maps
let MapView: any = null;
let Marker: any = null;
let UrlTile: any = null;
let mapLoadError = false;

if (Platform.OS !== "web") {
  try {
    const maps = require("react-native-maps");
    MapView = maps.default;
    Marker = maps.Marker;
    UrlTile = maps.UrlTile;
    console.log("react-native-maps loaded successfully");
  } catch (error) {
    mapLoadError = true;
    console.warn("Failed to load react-native-maps:", error);
  }
}

let Leaflet: any = null;

interface MapComponentProps {
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null;
  places: Place[];
  loading?: boolean;
  style?: any;
}

export function MapComponent({
  initialRegion,
  places,
  loading,
  style,
}: MapComponentProps) {
  const leafletMapRef = useRef<HTMLDivElement | null>(null);
  const leafletInstanceRef = useRef<any>(null);

  console.log("MapComponent rendered with:", {
    hasInitialRegion: !!initialRegion,
    placesCount: places.length,
    loading,
    platform: Platform.OS,
  });

  // Web map initialization
  useEffect(() => {
    if (Platform.OS !== "web") return;

    console.log("Initializing web map...");

    // Load Leaflet CSS
    const id = "leaflet-css";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
      console.log("Leaflet CSS loaded");
    }

    try {
      Leaflet = require("leaflet");
      console.log("Leaflet loaded successfully");
    } catch (error) {
      console.warn("Failed to load Leaflet:", error);
    }
  }, []);

  // Initialize Leaflet map on web when ready
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!Leaflet || !leafletMapRef.current || !initialRegion) return;
    if (leafletInstanceRef.current) return; // already initialized

    console.log("Creating Leaflet map with region:", initialRegion);

    try {
      const L = Leaflet;
      const map = L.map(leafletMapRef.current).setView(
        [initialRegion.latitude, initialRegion.longitude],
        14
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      leafletInstanceRef.current = map;
      console.log("Leaflet map created successfully");
    } catch (error) {
      console.error("Failed to create Leaflet map:", error);
    }
  }, [initialRegion]);

  // Update Leaflet markers when places change
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const map = leafletInstanceRef.current;
    if (!map || !Leaflet) return;

    const L = Leaflet;
    // clear existing layer group if any
    if ((map as any)._markersGroup) {
      (map as any)._markersGroup.clearLayers();
    }
    const group = L.layerGroup();
    places.forEach((p) => {
      L.marker([p.lat, p.lon])
        .bindPopup(`<b>${p.name}</b><br/>${p.address ?? ""}`)
        .addTo(group);
    });
    group.addTo(map);
    (map as any)._markersGroup = group;
  }, [places]);

  if (loading) {
    return (
      <ThemedView style={[styles.mapContainer, style]}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>
          Hämtar restauranger...
        </ThemedText>
      </ThemedView>
    );
  }

  if (!initialRegion) {
    return (
      <ThemedView style={[styles.mapContainer, style]}>
        <ThemedText style={styles.placeholderText}>📍 Stockholm</ThemedText>
        <ThemedText style={styles.subText}>
          Klicka på "Restaurant" för att visa närliggande restauranger
        </ThemedText>
      </ThemedView>
    );
  }

  // Om vi har data men karta inte fungerar, visa en enkel lista
  if (
    places.length > 0 &&
    (mapLoadError ||
      (!MapView && Platform.OS !== "web") ||
      (!Leaflet && Platform.OS === "web"))
  ) {
    return (
      <ThemedView style={[styles.mapContainer, style]}>
        <ThemedText style={styles.placeholderText}>📍 Restauranger</ThemedText>
        <ThemedText style={styles.subText}>
          {places.length} restauranger hittade omkring{" "}
          {initialRegion.latitude.toFixed(4)},{" "}
          {initialRegion.longitude.toFixed(4)}
        </ThemedText>
      </ThemedView>
    );
  }

  // Web map
  if (Platform.OS === "web") {
    return (
      <ThemedView style={[styles.mapContainer, style]}>
        <div
          ref={leafletMapRef as any}
          id="leaflet-map"
          style={{ height: "100%", width: "100%", borderRadius: 12 }}
        />
      </ThemedView>
    );
  }

  // Native map (iOS/Android)
  if (Platform.OS === "ios" || Platform.OS === "android") {
    console.log("Rendering native map, MapView available:", !!MapView);

    if (mapLoadError || !MapView) {
      return (
        <ThemedView style={[styles.mapContainer, style]}>
          <ThemedText style={styles.placeholderText}>📍</ThemedText>
          <ThemedText style={styles.errorText}>
            Kartan är inte tillgänglig på denna plattform
          </ThemedText>
          <ThemedText style={styles.subText}>
            {places.length > 0
              ? `Visar ${places.length} restauranger`
              : "Inga restauranger hittade"}
          </ThemedText>
        </ThemedView>
      );
    }

    return (
      <ThemedView style={[styles.mapContainer, style]}>
        <MapView
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation
        >
          <UrlTile
            urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
          {places.map((p) => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.lat, longitude: p.lon }}
              title={p.name}
              description={p.address}
            />
          ))}
        </MapView>
      </ThemedView>
    );
  }

  // Fallback för andra plattformar
  return (
    <ThemedView style={[styles.mapContainer, style]}>
      <ThemedText style={styles.placeholderText}>📍</ThemedText>
      <ThemedText style={styles.subText}>
        Karta stöds inte på denna plattform
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 200,
    backgroundColor: "#e8f4f8",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    overflow: "hidden",
  },
  map: {
    flex: 1,
    width: "100%",
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  subText: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
    marginTop: 10,
  },
  errorText: {
    fontSize: 14,
    color: "#c62828",
    textAlign: "center",
    marginTop: 5,
  },
});