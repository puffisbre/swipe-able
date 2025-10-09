import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
let MapView: any = null;
let Marker: any = null;
let UrlTile: any = null;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    UrlTile = maps.UrlTile;
  } catch {}
}
let Leaflet: any = null;

type LatLng = { latitude: number; longitude: number };
type Place = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address?: string;
  distanceMeters?: number;
};

async function fetchNearbyRestaurants(center: LatLng): Promise<Place[]> {
  const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
  // 1500m radius
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
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
  const data = await res.json();
  const places: Place[] = (data.elements || [])
    .map((el: any) => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      const name = el.tags?.name ?? 'Unknown restaurant';
      const address = el.tags?.['addr:full'] || [el.tags?.['addr:street'], el.tags?.['addr:housenumber']].filter(Boolean).join(' ');
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
  return places as Place[];
}

export default function RestaurantsScreen() {
  const leafletMapRef = useRef<HTMLDivElement | null>(null);
  const leafletInstanceRef = useRef<any>(null);
  const [loc, setLoc] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [webMapReady, setWebMapReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS === 'web') {
      // load Leaflet CSS
      const id = 'leaflet-css';
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      try {
        Leaflet = require('leaflet');
        setWebMapReady(true);
      } catch {
        setWebMapReady(false);
      }
    }
    (async () => {
      setError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const center = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setLoc(center);
      setInitialRegion({
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    })();
  }, []);

  // Initialize Leaflet map on web when ready
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!webMapReady || !leafletMapRef.current || !initialRegion) return;
    if (leafletInstanceRef.current) return; // already initialized
    const L = Leaflet;
    const map = L.map(leafletMapRef.current).setView([initialRegion.latitude, initialRegion.longitude], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    leafletInstanceRef.current = map;
  }, [webMapReady, initialRegion]);

  // Update Leaflet markers when places change
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const map = leafletInstanceRef.current;
    if (!map) return;
    const L = Leaflet;
    // clear existing layer group if any
    if ((map as any)._markersGroup) {
      (map as any)._markersGroup.clearLayers();
    }
    const group = L.layerGroup();
    places.forEach((p) => {
      L.marker([p.lat, p.lon]).bindPopup(`<b>${p.name}</b><br/>${p.address ?? ''}`).addTo(group);
    });
    group.addTo(map);
    (map as any)._markersGroup = group;
  }, [places]);

  useEffect(() => {
    if (!loc) return;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchNearbyRestaurants(loc);
        const withDist = data
          .map((p) => ({
            ...p,
            distanceMeters: haversineMeters(loc, { latitude: p.lat, longitude: p.lon }),
          }))
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setPlaces(withDist);
      } catch (e: any) {
        setError(e?.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    })();
  }, [loc]);

  return (
    <View style={styles.container}>
      {(!MapView && Platform.OS !== 'web') || (Platform.OS === 'web' && !webMapReady) ? (
        <View style={styles.mapPlaceholder}>
          <Text>Loading map...</Text>
        </View>
      ) : (
        <View style={styles.mapWrap}>
          {initialRegion ? (
            Platform.OS === 'web' ? (
              <div ref={leafletMapRef as any} id="leaflet-map" style={{ height: '100%', width: '100%' }} />
            ) : (
              <MapView
                style={{ flex: 1 }}
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
            )
          ) : (
            <View style={styles.mapLoading}><ActivityIndicator /></View>
          )}
        </View>
      )}
      <Text style={styles.title}>Restaurants near you</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && <ActivityIndicator style={{ marginVertical: 8 }} />}
      <FlatList
        data={places}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8 }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => {}}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              {item.address ? <Text style={styles.sub} numberOfLines={1}>{item.address}</Text> : null}
            </View>
            {typeof item.distanceMeters === 'number' ? (
              <Text style={styles.meta}>{Math.round(item.distanceMeters)} m</Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
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
  const c = 2 * Math.asin(Math.sqrt(sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon));
  return R * c;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  error: { color: 'tomato', marginBottom: 8 },
  sep: { height: 8 },
  row: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  name: { fontWeight: '700' },
  sub: { color: '#555', marginTop: 4 },
  meta: { color: '#333', fontSize: 12 },
  mapWrap: { height: 240, borderRadius: 10, overflow: 'hidden', marginBottom: 12 },
  mapPlaceholder: { height: 240, borderRadius: 10, overflow: 'hidden', marginBottom: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e6e6e6' },
  mapLoading: { height: 240, alignItems: 'center', justifyContent: 'center' },
});


