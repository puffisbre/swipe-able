import { Text } from 'react-native';
import Animated from 'react-native-reanimated';

const AnimatedText = Animated.createAnimatedComponent(Text);

export function HelloWave() {
  return (
    <AnimatedText
      style={{
        fontSize: 28,
        lineHeight: 32,
        marginTop: -6,
        animationName: {
          '50%': { transform: [{ rotate: '25deg' }] },
        },
        animationIterationCount: 4,
        animationDuration: '300ms',
      }}>
      👋
    </AnimatedText>
  );
}
