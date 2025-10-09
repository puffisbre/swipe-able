import { fetchNearbyRestaurants } from "@/providers/overpass";
import type { LatLng, Place } from "@/types";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";

export default function App() {
  const mapRef = useRef<MapView | null>(null);
  const [loc, setLoc] = useState<LatLng | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Platsbehörighet nekad.");
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const center = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setLoc(center);
      setRegion({
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      });
    })();
  }, []);

  useEffect(() => {
    if (!loc) return;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchNearbyRestaurants(loc);
        // beräkna avstånd enkelt (approx)
        const withDist = data.map(p => ({
          ...p,
          distanceMeters: haversineMeters(loc, { latitude: p.lat, longitude: p.lon })
        })).sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
        setPlaces(withDist);
      } catch (e: any) {
        setError(e.message ?? "Något gick fel");
      } finally {
        setLoading(false);
      }
    })();
  }, [loc]);

  const onRecenter = () => {
    if (loc && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      });
    }
  };

  if (!region) {
    return (
      <View style={styles.center}>
        {error ? <Text>{error}</Text> : <ActivityIndicator />}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {Platform.OS === 'web' ? (
        <View style={{ flex: 1, backgroundColor: '#e6e6e6', alignItems: 'center', justifyContent: 'center' }}>
          <Text>Map unavailable on web in this setup</Text>
        </View>
      ) : (
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={region}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        onRegionChangeComplete={setRegion}
      >
        {places.map(p => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lon }}
            title={p.name}
            description={p.address}
            pinColor={p.id === selectedId ? "tomato" : undefined}
            onPress={() => setSelectedId(p.id)}
          />
        ))}
      </MapView>
      )}

      <View style={styles.listWrap}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Restauranger nära dig</Text>
          <Pressable onPress={onRecenter} style={styles.recenterBtn}>
            <Text style={{ fontWeight: "600" }}>Centrera</Text>
          </Pressable>
        </View>

        {loading && <ActivityIndicator style={{ marginVertical: 8 }} />}

        <FlatList
          data={places}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setSelectedId(item.id);
                mapRef.current?.animateToRegion({
                  latitude: item.lat,
                  longitude: item.lon,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01
                }, 300);
              }}
              style={[styles.card, selectedId === item.id && styles.cardSelected]}
            >
              <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
              {item.address ? <Text numberOfLines={1} style={styles.cardSub}>{item.address}</Text> : null}
              {typeof item.distanceMeters === "number" ? (
                <Text style={styles.cardMeta}>{Math.round(item.distanceMeters)} m bort</Text>
              ) : null}
            </Pressable>
          )}
        />
      </View>
    </View>
  );
}

// enkel haversine
function haversineMeters(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const c = 2 * Math.asin(Math.sqrt(sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon));
  return R * c;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listWrap: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 8
  },
  header: { fontSize: 16, fontWeight: "700" },
  recenterBtn: {
    backgroundColor: "#eee",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  card: {
    width: 240,
    padding: 12,
    backgroundColor: "white",
    borderRadius: 12,
    marginRight: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3
  },
  cardSelected: { borderWidth: 1, borderColor: "tomato" },
  cardTitle: { fontWeight: "700" },
  cardSub: { color: "#555", marginTop: 4 },
  cardMeta: { color: "#333", marginTop: 6, fontSize: 12 }
});
