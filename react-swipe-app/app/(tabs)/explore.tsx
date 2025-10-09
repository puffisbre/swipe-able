import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;
const STORAGE_KEY = '@liked_restaurants';

async function fetchNearbyRestaurants(center: LatLng): Promise<Place[]> {
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
  const insets = useSafeAreaInsets();
  const [loc, setLoc] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });

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
        const withDist = data.map((p) => ({
          ...p,
          distanceMeters: haversineMeters(loc, { latitude: p.lat, longitude: p.lon }),
        }));
        setPlaces(withDist);
      } catch (e: any) {
        setError(e?.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    })();
  }, [loc]);

  const saveLikedPlace = async (place: Place) => {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const likedPlaces = existing ? JSON.parse(existing) : [];
      const updated = [...likedPlaces, place];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving liked place:', e);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const forceSwipe = (direction: 'left' | 'right') => {
    const x = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = async (direction: 'left' | 'right') => {
    const item = places[currentIndex];
    if (direction === 'right' && item) {
      await saveLikedPlace(item);
    }
    position.setValue({ x: 0, y: 0 });
    setCurrentIndex(currentIndex + 1);
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const handleLike = () => {
    forceSwipe('right');
  };

  const handleNope = () => {
    forceSwipe('left');
  };

  const renderCard = () => {
    if (currentIndex >= places.length) {
      return (
        <View style={styles.noMoreCards}>
          <Text style={styles.noMoreText}>🎉</Text>
          <Text style={styles.noMoreTitle}>No more restaurants!</Text>
          <Text style={styles.noMoreSubtitle}>Check the Home tab to see your liked places</Text>
        </View>
      );
    }

    const place = places[currentIndex];
    if (!place) return null;

    return (
      <Animated.View
        key={place.id}
        style={[
          styles.card,
          {
            transform: [...position.getTranslateTransform(), { rotate }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Animated.View style={[styles.likeLabel, { opacity: likeOpacity }]}>
          <Text style={styles.labelText}>LIKE</Text>
        </Animated.View>
        <Animated.View style={[styles.nopeLabel, { opacity: nopeOpacity }]}>
          <Text style={styles.labelText}>NOPE</Text>
        </Animated.View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.emoji}>🍽️</Text>
          </View>
          <Text style={styles.cardName}>{place.name}</Text>
          {place.address && <Text style={styles.cardAddress}>📍 {place.address}</Text>}
          {typeof place.distanceMeters === 'number' && (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>
                {place.distanceMeters < 1000
                  ? `${Math.round(place.distanceMeters)} m away`
                  : `${(place.distanceMeters / 1000).toFixed(1)} km away`}
              </Text>
            </View>
          )}
          <Text style={styles.hint}>👆 Drag or use buttons below</Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Swipe Restaurants</Text>
        <Text style={styles.subtitle}>
          {currentIndex < places.length ? `${currentIndex + 1} / ${places.length}` : 'Done!'}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Finding restaurants...</Text>
        </View>
      ) : (
        <View style={styles.cardContainer}>{renderCard()}</View>
      )}

      <View style={styles.buttonsContainer}>
        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [styles.button, styles.nopeButton, pressed && styles.buttonPressed]}
            onPress={handleNope}
            disabled={currentIndex >= places.length}
          >
            <Text style={styles.buttonIcon}>✕</Text>
            <Text style={styles.buttonLabel}>Nope</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.button, styles.likeButton, pressed && styles.buttonPressed]}
            onPress={handleLike}
            disabled={currentIndex >= places.length}
          >
            <Text style={[styles.buttonIcon, styles.likeButtonText]}>♥</Text>
            <Text style={[styles.buttonLabel, styles.likeButtonText]}>Like</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
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
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.6,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 0,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    position: 'absolute',
  },
  cardContent: {
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
  cardName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  cardAddress: {
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
  likeLabel: {
    position: 'absolute',
    top: 50,
    right: 40,
    zIndex: 1000,
    transform: [{ rotate: '30deg' }],
    borderWidth: 4,
    borderColor: '#4CAF50',
    borderRadius: 12,
    padding: 12,
  },
  nopeLabel: {
    position: 'absolute',
    top: 50,
    left: 40,
    zIndex: 1000,
    transform: [{ rotate: '-30deg' }],
    borderWidth: 4,
    borderColor: '#F44336',
    borderRadius: 12,
    padding: 12,
  },
  labelText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  noMoreCards: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noMoreText: {
    fontSize: 80,
    marginBottom: 20,
  },
  noMoreTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  noMoreSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  buttonsContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  button: {
    width: 140,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  nopeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F44336',
  },
  likeButton: {
    backgroundColor: '#4CAF50',
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  buttonIcon: {
    fontSize: 28,
    marginBottom: 2,
    color: '#F44336',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F44336',
  },
  likeButtonText: {
    color: '#FFFFFF',
  },
});
