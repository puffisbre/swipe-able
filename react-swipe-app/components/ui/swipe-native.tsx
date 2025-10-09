import React, { useRef, useState, useCallback } from "react";
import { View, Text } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";

type Direction = "left" | "right";

export interface SwipeItem<T = any> {
  id: string | number;
  data: T;
}

export interface SwipeStackProps<T = any> {
  items: SwipeItem<T>[];
  renderCard: (item: SwipeItem<T>) => React.ReactElement;
  onSwipe?: (item: SwipeItem<T>, direction: Direction, index: number) => void;
  onEmpty?: () => void;
  swipeThreshold?: number;
  maxRotation?: number;
  loop?: boolean;
}

interface SwipeStackComponent {
  <T = any>(props: SwipeStackProps<T>): React.ReactElement;
}

const SwipeStack: SwipeStackComponent = ({
  items,
  renderCard,
  onSwipe,
  onEmpty,
  swipeThreshold = 120,
  maxRotation = 30,
  loop = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  const currentItem = items[currentIndex];

  const handleSwipeComplete = useCallback(
    (direction: Direction) => {
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
      translateX.value = 0;
      translateY.value = 0;
      rotate.value = 0;
    },
    [
      currentItem,
      currentIndex,
      items,
      loop,
      onSwipe,
      onEmpty,
      translateX,
      translateY,
      rotate,
    ]
  );

  const gesture = Gesture.Pan()
    .onBegin(() => {
      // Optional: Add haptic feedback or sound here
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;

      // Calculate rotation based on horizontal movement
      const rotationValue = interpolate(
        event.translationX,
        [-200, 0, 200],
        [-maxRotation, 0, maxRotation],
        Extrapolate.CLAMP
      );
      rotate.value = rotationValue;
    })
    .onEnd((event) => {
      const shouldSwipe = Math.abs(event.translationX) > swipeThreshold;

      if (shouldSwipe) {
        // Animate off screen
        const direction: Direction = event.translationX > 0 ? "right" : "left";
        const endX = direction === "right" ? 500 : -500;

        translateX.value = withTiming(endX, { duration: 300 });
        translateY.value = withTiming(
          event.translationY + event.velocityX * 0.1,
          { duration: 300 }
        );
        rotate.value = withTiming(
          direction === "right" ? maxRotation : -maxRotation,
          { duration: 300 }
        );

        // Call swipe handler after animation
        setTimeout(() => {
          runOnJS(handleSwipeComplete)(direction);
        }, 300);
      } else {
        // Animate back to center
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate.value}deg` },
      ],
    };
  });

  const overlayOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, swipeThreshold],
      [0, 1],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const likeOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, swipeThreshold],
      [0, 1],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const nopeOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-swipeThreshold, 0],
      [1, 0],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  if (!currentItem) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#888", fontSize: 18 }}>No more cards</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        {/* Background cards (optional - for stack effect) */}
        {items.slice(currentIndex + 1, currentIndex + 3).map((item, index) => (
          <View
            key={item.id}
            style={{
              position: "absolute",
              width: "90%",
              height: "80%",
              transform: [
                { scale: 1 - (index + 1) * 0.05 },
                { translateY: (index + 1) * 10 },
              ],
              opacity: 1 - (index + 1) * 0.2,
            }}
          >
            {renderCard(item)}
          </View>
        ))}

        {/* Main card */}
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[
              {
                width: "90%",
                height: "80%",
                position: "absolute",
              },
              animatedStyle,
            ]}
          >
            <View style={{ flex: 1, position: "relative" }}>
              {/* LIKE overlay */}
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    top: 20,
                    left: 20,
                    padding: 10,
                    borderWidth: 3,
                    borderColor: "#4CAF50",
                    borderRadius: 8,
                    backgroundColor: "rgba(76, 175, 80, 0.1)",
                    zIndex: 1,
                  },
                  likeOverlayStyle,
                ]}
              >
                <Text
                  style={{ color: "#4CAF50", fontWeight: "bold", fontSize: 18 }}
                >
                  LIKE
                </Text>
              </Animated.View>

              {/* NOPE overlay */}
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    top: 20,
                    right: 20,
                    padding: 10,
                    borderWidth: 3,
                    borderColor: "#F44336",
                    borderRadius: 8,
                    backgroundColor: "rgba(244, 67, 54, 0.1)",
                    zIndex: 1,
                  },
                  nopeOverlayStyle,
                ]}
              >
                <Text
                  style={{ color: "#F44336", fontWeight: "bold", fontSize: 18 }}
                >
                  NOPE
                </Text>
              </Animated.View>

              {/* Card content */}
              {renderCard(currentItem)}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
};

export default SwipeStack;
