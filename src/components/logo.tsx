import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

export const LogoFonts = {
  top: 'BarlowCondensed_700Bold',
  big: 'BarlowCondensed_900Black_Italic',
} as const;

/**
 * Two-line wordmark: "B THE" on top, larger "SPORT" below, red skewed bar.
 * Same artwork as the app icon. `size` is the height of "SPORT".
 */
export function Logo({ size = 30, bar = false }: { size?: number; bar?: boolean }) {
  const top = size * 0.5;
  return (
    <View accessibilityRole="header" accessibilityLabel="B The Sport">
      <Text style={[styles.top, { fontSize: top, letterSpacing: top * 0.13, lineHeight: top * 1.02 }]}>
        B <Text style={styles.red}>THE</Text>
      </Text>
      <Text style={[styles.big, { fontSize: size, lineHeight: size * 0.95, marginLeft: -size * 0.04 }]}>SPORT</Text>
      {bar ? (
        <View
          style={[
            styles.bar,
            { height: size * 0.13, width: size * 1.6, marginTop: size * 0.1, transform: [{ skewX: '-14deg' }] },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    fontFamily: LogoFonts.top,
    color: Colors.light.headerText,
  },
  red: {
    color: '#E3343C',
  },
  big: {
    fontFamily: LogoFonts.big,
    color: Colors.light.headerText,
  },
  bar: {
    backgroundColor: '#E3343C',
  },
});
