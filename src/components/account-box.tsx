import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Spacing, usePalette } from '@/constants/theme';
import { sendSignInLink, signOut } from '@/lib/auth';
import { useAppState } from '@/state/app-state';

/** Optional sign-in: keeps favourites, saved articles and hidden sources on the account. */
export function AccountBox() {
  const p = usePalette();
  const { userEmail, syncError } = useAppState();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const send = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setState('error');
      setMessage('Upiši ispravnu e-mail adresu.');
      return;
    }
    setState('sending');
    try {
      await sendSignInLink(email);
      setState('sent');
      setMessage(`Poslali smo poveznicu na ${email.trim()}. Otvori e-mail na ovom mobitelu i dodirni poveznicu.`);
    } catch (e) {
      setState('error');
      setMessage(String((e as Error).message ?? e));
    }
  };

  return (
    <View style={[styles.box, { backgroundColor: p.surface, borderColor: p.border }]}>
      <Text style={[styles.title, { color: p.text }]}>Račun</Text>
      {userEmail ? (
        <>
          <Text style={[styles.body, { color: p.textSecondary }]}>
            Prijavljen/a kao <Text style={{ color: p.text, fontWeight: '700' }}>{userEmail}</Text>. Favoriti, spremljeni
            članci i isključeni izvori spremaju se na račun.
          </Text>
          {syncError ? <Text style={[styles.body, { color: p.accent }]}>Usklađivanje nije uspjelo: {syncError}</Text> : null}
          <Pressable onPress={() => void signOut()} style={({ pressed }) => [styles.secondary, { borderColor: p.border }, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.secondaryText, { color: p.text }]}>Odjava</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={[styles.body, { color: p.textSecondary }]}>
            Prijava nije obavezna. S njom favoriti, spremljeni članci i postavke izvora ostaju sačuvani i na drugom
            mobitelu. Prijava ide poveznicom na e-mail, bez lozinke.
          </Text>
          <TextInput
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (state !== 'sending') setState('idle');
            }}
            placeholder="tvoj@email.com"
            placeholderTextColor={p.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            style={[styles.input, { color: p.text, borderColor: p.border, backgroundColor: p.background }]}
          />
          <Pressable
            onPress={send}
            disabled={state === 'sending'}
            style={({ pressed }) => [styles.primary, { backgroundColor: p.accent }, pressed && { opacity: 0.85 }]}>
            {state === 'sending' ? (
              <ActivityIndicator color={p.accentText} />
            ) : (
              <Text style={[styles.primaryText, { color: p.accentText }]}>Pošalji poveznicu za prijavu</Text>
            )}
          </Pressable>
          {message && state !== 'idle' ? (
            <Text style={[styles.body, { color: state === 'error' ? p.accent : p.textSecondary }]}>{message}</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.four,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.three,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  body: {
    fontSize: 14,
    lineHeight: 19,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
    fontSize: 16,
  },
  primary: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondary: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
