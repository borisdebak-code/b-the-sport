import { NativeTabs } from 'expo-router/native-tabs';

import { usePalette } from '@/constants/theme';

export default function AppTabs() {
  const p = usePalette();

  return (
    <NativeTabs
      backgroundColor={p.surface}
      indicatorColor={p.chip}
      labelStyle={{ selected: { color: p.accent } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Portali</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="newspaper" md="newspaper" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mreze">
        <NativeTabs.Trigger.Label>Mreže</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right" md="forum" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="postavke">
        <NativeTabs.Trigger.Label>Postavke</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
