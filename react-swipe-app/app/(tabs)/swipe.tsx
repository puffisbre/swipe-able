import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Image } from "react-native";
import SimpleSwipe, { SwipeItem } from "../../components/ui/simple-swipe"; // Using relative path

// app/(tabs)/swipe.tsx

// Example data (adjust to your real use-case)
type Card = { title: string; description: string; image: string };
const cards: SwipeItem<Card>[] = [
  {
    id: "1",
    data: {
      title: "Mountain Adventure",
      description: "Breathtaking views and fresh mountain air",
      image:
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    },
  },
  {
    id: "2",
    data: {
      title: "Ocean Paradise",
      description: "Crystal clear waters and endless horizons",
      image:
        "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=400&h=300&fit=crop",
    },
  },
  {
    id: "3",
    data: {
      title: "Forest Escape",
      description: "Peaceful trails through ancient trees",
      image:
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop",
    },
  },
];

export default function SwipeScreen() {
  const handleSwipe = (direction: string, item: SwipeItem<Card>) => {
    console.log("Swiped", direction, item.data);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Swipe Demo</Text>
      <View style={styles.swipeContainer}>
        <SimpleSwipe
          items={cards}
          renderCard={(item: SwipeItem<Card>): React.ReactElement => (
            <View style={styles.card}>
              <Image
                source={{ uri: item.data.image }}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.cardContent}>
                <Text style={styles.title}>{item.data.title}</Text>
                <Text style={styles.desc}>{item.data.description}</Text>
              </View>
            </View>
          )}
          onSwipe={(item, direction, index) => handleSwipe(direction, item)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#101014", paddingHorizontal: 16 },
  header: {
    fontSize: 24,
    fontWeight: "600",
    color: "#fff",
    marginTop: 8,
    marginBottom: 8,
  },
  swipeContainer: { flex: 1, justifyContent: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    overflow: "hidden",
    flex: 1,
  },
  cardImage: {
    width: "100%",
    height: "60%",
  },
  cardContent: {
    padding: 16,
    flex: 1,
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "600", color: "#000", marginBottom: 8 },
  desc: { fontSize: 14, color: "#666", lineHeight: 20 },
});
