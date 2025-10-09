import SimpleSwipe, { SwipeItem } from '@/components/ui/simple-swipe';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';

type LatLng = { latitude: number; longitude: number };
type Restaurant = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address?: string;
  distanceMeters?: number;
};

const STORAGE_KEY = '@liked_restaurants';

async function fetchNearbyRestaurants(center: LatLng): Promise<Restaurant[]> {
  const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
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
  const places: Restaurant[] = (data.elements || [])
    .map((el: any) => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      const name = el.tags?.name ?? 'Unknown restaurant';
      const address =
        el.tags?.['addr:full'] ||
        [el.tags?.['addr:street'], el.tags?.['addr:housenumber']].filter(Boolean).join(' ');
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

export default function SwipeScreen() {
  const [loc, setLoc] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<SwipeItem<Restaurant>[]>([]);

  useEffect(() => {
    (async () => {
      setError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
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
        const swipeItems: SwipeItem<Restaurant>[] = withDist.map((r) => ({
          id: r.id,
          data: r,
        }));
        setRestaurants(swipeItems);
      } catch (e: any) {
        setError(e?.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    })();
  }, [loc]);

  const handleSwipe = async (
    direction: string,
    item: SwipeItem<Restaurant>
  ) => {
    console.log('Swiped', direction, item.data.name);
    if (direction === 'right') {
      // Save liked restaurant
      try {
        const existing = await AsyncStorage.getItem(STORAGE_KEY);
        const likedPlaces = existing ? JSON.parse(existing) : [];
        const updated = [...likedPlaces, item.data];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving liked place:', e);
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
          : 'No restaurants found'}
      </Text>
      <View style={styles.swipeContainer}>
        <SimpleSwipe
          items={restaurants}
          renderCard={(item: SwipeItem<Restaurant>): React.ReactElement => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.emoji}>🍽️</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.title}>{item.data.name}</Text>
                {item.data.address && (
                  <Text style={styles.address}>📍 {item.data.address}</Text>
                )}
                {typeof item.data.distanceMeters === 'number' && (
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
          onEmpty={() => console.log('No more restaurants!')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 12,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subheader: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },
  swipeContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    overflow: 'hidden',
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeader: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emoji: {
    fontSize: 40,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  address: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  distanceBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  distanceText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    fontSize: 14,
    color: '#999',
    marginTop: 'auto',
    fontStyle: 'italic',
  },
  errorContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3F3',
    padding: 16,
    margin: 16,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});
