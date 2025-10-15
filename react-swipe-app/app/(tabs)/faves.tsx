import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { FlatList, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


//Typer för plats. Vi använder samma typer som i restaurants.tsx.
type Place = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address?: string;
  distanceMeters?: number;
};

//Nyckel för att lagra favoriter i AsyncStorage. 
//AsyncStorage är en async storage library i React Native för att lagra data lokalt på enheten.
const STORAGE_KEY = '@liked_restaurants';

//Huvudkomponent för att visa favoriter. 
//Använder useSafeAreaInsets för att få insets för att säkerställa att innehållet inte skräpar över toppen av skärmen.
//Safe area är de delar av skärmen som inte är upptagna av statusbar, navigationbar, etc.
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [likedPlaces, setLikedPlaces] = useState<Place[]>([]);

  const loadLikedPlaces = async () => {
    try {
      if (!AsyncStorage) {
        console.warn('AsyncStorage is not available');
        return;
      }
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setLikedPlaces(JSON.parse(data));
      }
    } catch (e) {
      console.error('Error loading liked places:', e);
    }
  };
  //Här använder vi useFocusEffect för att köra loadLikedPlaces när komponenten fokuseras.
  //useFocusEffect är en hook som körs när komponenten fokuseras. Alltså när skärmen blir aktiv.
  useFocusEffect(
    useCallback(() => {
      loadLikedPlaces();
    }, [])
  );

  //Funktion för att öppna platsen i kartan. Kollar vilken platform användaren har och öppnar platsen i rätt karta. 
  //Som i restaurants.tsx: IOS öppnar i apple maps och android öppnar i google maps.
  const openInMaps = (lat: number, lon: number, name: string) => {
    const url = Platform.select({
      ios: `maps:?q=${name}&ll=${lat},${lon}`,
      android: `geo:${lat},${lon}?q=${lat},${lon}(${encodeURIComponent(name)})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    });
    Linking.openURL(url!);
  };

  //Funktion för att ta bort en plats från favoritlistan.
  const removePlace = async (id: string) => {
    try {
      const updated = likedPlaces.filter((p) => p.id !== id);
      setLikedPlaces(updated);
      if (AsyncStorage) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Error removing place:', e);
    }
  };

  //Funktion för att ta bort alla favoriter från listan. Vi clearar helt enkelt listan här.
  const clearAll = async () => {
    try {
      setLikedPlaces([]);
      if (AsyncStorage) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      }
    } catch (e) {
      console.error('Error clearing places:', e);
    }
  };

  //Här returnerar vi en lista med alla favoriter.
  //Vi har inte en loader här eftersom vi inte hämtar data från någon API, dock så kollar vi om listan är tom och visar ett meddelande om det.
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Favorites</Text>
        <Text style={styles.subtitle}>
          {likedPlaces.length === 0
            ? 'No favorites yet'
            : `${likedPlaces.length} favorite ${likedPlaces.length === 1 ? 'place' : 'places'}`}
        </Text>
      </View>

      {likedPlaces.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>❤️</Text>
          <Text style={styles.emptyTitle}>No favorites yet!</Text>
          <Text style={styles.emptySubtitle}>Go to the Swipe tab to find restaurants you like</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={likedPlaces}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 16 }}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Pressable
                  style={styles.mainContent}
                  onPress={() => openInMaps(item.lat, item.lon, item.name)}
                >
                  <View style={styles.iconContainer}>
                    <Text style={styles.icon}>🍽️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.address ? (
                      <Text style={styles.sub} numberOfLines={1}>
                        📍 {item.address}
                      </Text>
                    ) : null}
                    {typeof item.distanceMeters === 'number' && (
                      <View style={styles.distanceBadge}>
                        <Text style={styles.distanceText}>
                          {item.distanceMeters < 1000
                            ? `${Math.round(item.distanceMeters)} m`
                            : `${(item.distanceMeters / 1000).toFixed(1)} km`}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
                <Pressable
                  style={styles.removeButton}
                  onPress={() => removePlace(item.id)}
                >
                  <Text style={styles.removeIcon}>✕</Text>
                </Pressable>
              </View>
            )}
          />
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [styles.clearButton, pressed && styles.clearButtonPressed]}
              onPress={clearAll}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

//Och längst ner har vi styles för att styla vår komponent, exakt som i restaurants.tsx.
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: 6,
  },
  distanceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  distanceText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '700',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF3F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  removeIcon: {
    fontSize: 18,
    color: '#F44336',
    fontWeight: '700',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  clearButton: {
    backgroundColor: '#F44336',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  clearButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
