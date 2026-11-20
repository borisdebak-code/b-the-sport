import '@/global.css';

import { Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const Colors = {
  light: {
    text: '#0E1726',
    textSecondary: '#5B6576',
    background: '#F4F5F7',
    surface: '#FFFFFF',
    border: '#E3E6EB',
    chip: '#E9ECF1',
    chipText: '#2A3342',
    accent: '#D6262E',
    accentText: '#FFFFFF',
    header: '#0B1F3A',
    headerText: '#FFFFFF',
    headerMuted: '#9FB0C8',
  },
  dark: {
    text: '#F1F3F6',
    textSecondary: '#A3ACBA',
    background: '#0A0F18',
    surface: '#141B27',
    border: '#232C3A',
    chip: '#1C2534',
    chipText: '#D5DBE4',
    accent: '#F0434B',
    accentText: '#FFFFFF',
    header: '#0B1F3A',
    headerText: '#FFFFFF',
    headerMuted: '#8EA0BA',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

export function usePalette(): Palette {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}

export const Fonts = Platform.select({
  web: { sans: 'var(--font-display)' },
  default: { sans: undefined },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
} as const;

export const MaxContentWidth = 720;
