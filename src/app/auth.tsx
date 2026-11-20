import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { usePalette } from '@/constants/theme';
import { useSession } from '@/lib/auth';

/** Landing screen of the sign-in link; the root layout reads the tokens from the URL. */
export default function AuthScreen() {
  const p = usePalette();
  const session = useSession();
  useEffect(() => {
    const t = setTimeout(() => router.replace('/postavke'), session ? 0 : 4000);
    return () => clearTimeout(t);
  }, [session]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.background }}>
      <ActivityIndicator color={p.textSecondary} />
    </View>
  );
}
