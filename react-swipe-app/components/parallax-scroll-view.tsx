import type { PropsWithChildren, ReactElement } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollOffset,
} from 'react-native-reanimated';

// TODO: Remove or replace the following imports if the modules do not exist or cannot be resolved.
// import { ThemedView } from '@/components/themed-view';
// import { useColorScheme } from '@/hooks/use-color-scheme';
// import { useThemeColor } from '@/hooks/use-theme-color';

// Temporary fallback implementations to avoid import errors
import { View } from 'react-native';
const ThemedView = View;
const useColorScheme = () => 'light';
const useThemeColor = (_: any, __: string) => '#fff';

const HEADER_HEIGHT = 250;

// Create an animated ScrollView using Reanimated's createAnimatedComponent
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
const AnimatedView = Animated.createAnimatedComponent(View);

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const backgroundColor = useThemeColor({}, 'background');
  const colorScheme = useColorScheme() ?? 'light';
  const scrollRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(scrollRef);
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
          ),
        },
        {
          scale: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [2, 1, 1]),
        },
      ],
    };
  });

  return (
    <AnimatedScrollView
      ref={scrollRef}
      style={{ backgroundColor, flex: 1 }}
      scrollEventThrottle={16}
    >
      <AnimatedView
        style={[
          styles.header,
          { backgroundColor: headerBackgroundColor[colorScheme as 'light' | 'dark'] },
          headerAnimatedStyle,
        ]}>
        {headerImage}
      </AnimatedView>
      <ThemedView style={styles.content}>{children}</ThemedView>
    </AnimatedScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: 'hidden',
  },
});
