import React, { useState, useRef } from "react";
import {
  View,
  Text,
  PanResponder,
  Animated,
  Dimensions,
  StyleSheet,
} from "react-native";

type Direction = "left" | "right";

export interface SwipeItem<T = any> {
  id: string | number;
  data: T;
}

export interface SimpleSwipeProps<T = any> {
  items: SwipeItem<T>[];
  renderCard: (item: SwipeItem<T>) => React.ReactElement;
  onSwipe?: (item: SwipeItem<T>, direction: Direction, index: number) => void;
  onEmpty?: () => void;
  swipeThreshold?: number;
  maxRotation?: number;
  loop?: boolean;
}

const { width: screenWidth } = Dimensions.get("window");

interface SimpleSwipeComponent {
  <T = any>(props: SimpleSwipeProps<T>): React.ReactElement;
}

const SimpleSwipe: SimpleSwipeComponent = ({
  items,
  renderCard,
  onSwipe,
  onEmpty,
  swipeThreshold = 120,
  maxRotation = 30,
  loop = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const currentItem = items[currentIndex];

  const handleSwipeComplete = (direction: Direction) => {
    if (!currentItem) return;

    onSwipe?.(currentItem, direction, currentIndex);

    const nextIndex = currentIndex + 1;
    if (nextIndex >= items.length) {
      if (loop && items.length > 0) {
        setCurrentIndex(0);
      } else {
        onEmpty?.();
      }
    } else {
      setCurrentIndex(nextIndex);
    }

    // Reset position for next card
    position.setValue({ x: 0, y: 0 });
    rotate.setValue(0);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderMove: (event, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });

      // Calculate rotation based on horizontal movement
      const rotationValue = (gesture.dx / screenWidth) * maxRotation;
      rotate.setValue(rotationValue);
    },

    onPanResponderRelease: (event, gesture) => {
      const shouldSwipe = Math.abs(gesture.dx) > swipeThreshold;

      if (shouldSwipe) {
        // Animate off screen
        const direction: Direction = gesture.dx > 0 ? "right" : "left";
        const endX =
          direction === "right" ? screenWidth * 1.5 : -screenWidth * 1.5;

        Animated.parallel([
          Animated.timing(position.x, {
            toValue: endX,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(position.y, {
            toValue: gesture.dy + gesture.vy * 100,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(rotate, {
            toValue: direction === "right" ? maxRotation : -maxRotation,
            duration: 300,
            useNativeDriver: false,
          }),
        ]).start(() => {
          handleSwipeComplete(direction);
        });
      } else {
        // Animate back to center
        Animated.parallel([
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }),
          Animated.spring(rotate, {
            toValue: 0,
            useNativeDriver: false,
          }),
        ]).start();
      }
    },
  });

  if (!currentItem) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No more cards</Text>
      </View>
    );
  }

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-maxRotation, maxRotation],
    outputRange: [`-${maxRotation}deg`, `${maxRotation}deg`],
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, swipeThreshold],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-swipeThreshold, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      {/* Background cards for stack effect */}
      {items.slice(currentIndex + 1, currentIndex + 3).map((item, index) => (
        <View
          key={item.id}
          style={[
            styles.card,
            {
              transform: [
                { scale: 1 - (index + 1) * 0.05 },
                { translateY: (index + 1) * 10 },
              ],
              opacity: 1 - (index + 1) * 0.2,
              zIndex: -index - 1,
            },
          ]}
        >
          {renderCard(item)}
        </View>
      ))}

      {/* Main card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
          {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate: rotateInterpolate },
            ],
            zIndex: 10,
          },
        ]}
      >
        {/* LIKE overlay */}
        <Animated.View
          style={[styles.overlay, styles.likeOverlay, { opacity: likeOpacity }]}
        >
          <Text style={styles.likeText}>LIKE</Text>
        </Animated.View>

        {/* NOPE overlay */}
        <Animated.View
          style={[styles.overlay, styles.nopeOverlay, { opacity: nopeOpacity }]}
        >
          <Text style={styles.nopeText}>NOPE</Text>
        </Animated.View>

        {/* Card content */}
        {renderCard(currentItem)}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    position: "absolute",
    width: "90%",
    height: "80%",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#888",
    fontSize: 18,
  },
  overlay: {
    position: "absolute",
    top: "40%",
    left: "50%",
    marginLeft: -80, // Half of width to center horizontally
    marginTop: -40, // Half of height to center vertically
    padding: 15,
    borderWidth: 4,
    borderRadius: 16,
    zIndex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: 160,
    height: 80,
  },
  likeOverlay: {
    borderColor: "#4CAF50",
    backgroundColor: "rgba(76, 175, 80, 0.2)",
  },
  nopeOverlay: {
    borderColor: "#F44336",
    backgroundColor: "rgba(244, 67, 54, 0.2)",
  },
  likeText: {
    color: "#4CAF50",
    fontWeight: "bold",
    fontSize: 32,
    textAlign: "center",
  },
  nopeText: {
    color: "#F44336",
    fontWeight: "bold",
    fontSize: 32,
    textAlign: "center",
  },
});

export default SimpleSwipe;
