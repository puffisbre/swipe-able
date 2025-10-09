import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const [loc, setLoc] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
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
    })();
  }, []);

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

  const openInMaps = (lat: number, lon: number, name: string) => {
    const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
    const url = Platform.select({
      ios: `maps:?q=${name}&ll=${lat},${lon}`,
      android: `geo:${lat},${lon}?q=${lat},${lon}(${encodeURIComponent(name)})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    });
    Linking.openURL(url!);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Nearby Restaurants</Text>
        <Text style={styles.subtitle}>{places.length} places found</Text>
      </View>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Finding restaurants...</Text>
        </View>
      )}
      
      <FlatList
        data={places}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 16 }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable 
            style={({ pressed }) => [
              styles.row,
              pressed && styles.rowPressed
            ]} 
            onPress={() => openInMaps(item.lat, item.lon, item.name)}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🍽️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              {item.address ? (
                <Text style={styles.sub} numberOfLines={1}>📍 {item.address}</Text>
              ) : null}
            </View>
            <View style={styles.rightContainer}>
              {typeof item.distanceMeters === 'number' && (
                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceText}>
                    {item.distanceMeters < 1000 
                      ? `${Math.round(item.distanceMeters)} m` 
                      : `${(item.distanceMeters / 1000).toFixed(1)} km`}
                  </Text>
                </View>
              )}
              <Text style={styles.mapLink}>Open in Maps →</Text>
            </View>
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
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3F3',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCCCC',
  },
  errorIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  error: { 
    color: '#D93025', 
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sep: { height: 12 },
  row: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  rowPressed: {
    backgroundColor: '#F8F9FA',
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  name: { 
    fontWeight: '700', 
    fontSize: 17,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  sub: { 
    color: '#666', 
    fontSize: 13,
    fontWeight: '400',
  },
  rightContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  distanceBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '700',
  },
  mapLink: { 
    color: '#007AFF', 
    fontSize: 13, 
    fontWeight: '600',
  },
});


