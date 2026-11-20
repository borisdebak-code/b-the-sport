import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { FeedList } from '@/components/feed-list';
import { MaxContentWidth, Spacing, usePalette } from '@/constants/theme';
import { useAppState } from '@/state/app-state';

/** Search titles from the last 30 days, portals and social posts together. */
export default function PretragaScreen() {
  const p = usePalette();
  const { hiddenSources } = useAppState();
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');

  // wait until typing pauses before querying
  useEffect(() => {
    const t = setTimeout(() => setTerm(text.trim()), 400);
    return () => clearTimeout(t);
  }, [text]);

  const query = useMemo(() => ({ kind: null, search: term, hiddenSources }), [term, hiddenSources]);

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      <View style={styles.bar}>
        <View style={[styles.inputWrap, { backgroundColor: p.surface, borderColor: p.border }]}>
          <Ionicons name="search" size={18} color={p.textSecondary} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Igrač, klub, natjecanje…"
            placeholderTextColor={p.textSecondary}
            style={[styles.input, { color: p.text }]}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>
      {term.length >= 2 ? (
        <FeedList query={query} showSport emptyText={`Nema vijesti za „${term}” u zadnjih 30 dana.`} />
      ) : (
        <Text style={[styles.hint, { color: p.textSecondary }]}>
          Upiši barem dva slova. Pretražuju se naslovi s portala i društvenih mreža iz zadnjih 30 dana, i u originalu i u
          prijevodu.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  hint: {
    paddingHorizontal: Spacing.six,
    paddingTop: Spacing.five,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});
