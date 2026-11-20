import { usePathname } from 'expo-router';
import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

const C = Colors.light;

/** Web: same layout as mobile, section switcher as a bottom bar. */
export default function AppTabs() {
  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <View style={styles.bar}>
          <View style={styles.inner}>
            <TabTrigger name="index" href="/" asChild>
              <TabButton path="/">Portali</TabButton>
            </TabTrigger>
            <TabTrigger name="mreze" href="/mreze" asChild>
              <TabButton path="/mreze">Mreže</TabButton>
            </TabTrigger>
            <TabTrigger name="spremljeno" href="/spremljeno" asChild>
              <TabButton path="/spremljeno">Spremljeno</TabButton>
            </TabTrigger>
            <TabTrigger name="postavke" href="/postavke" asChild>
              <TabButton path="/postavke">Postavke</TabButton>
            </TabTrigger>
          </View>
        </View>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, ref: _ref, path, ...props }: TabTriggerSlotProps & { path: string }) {
  const pathname = usePathname();
  const focused = isFocused || pathname === path;
  return (
    <Pressable {...props} accessibilityRole="link" accessibilityState={{ selected: focused }} style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}>
      <Text style={[styles.label, focused && styles.labelFocused]}>{children}</Text>
      <View style={[styles.underline, focused && styles.underlineFocused]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: C.header,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },
  button: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
    alignItems: 'center',
    minWidth: 72,
  },
  label: {
    color: C.headerMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  labelFocused: {
    color: C.headerText,
  },
  underline: {
    height: 3,
    marginTop: Spacing.two,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  underlineFocused: {
    backgroundColor: C.accent,
  },
});
