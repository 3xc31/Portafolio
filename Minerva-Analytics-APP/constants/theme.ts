import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#38bdf8';

export const Colors = {
  light: {
    text: '#0f172a',
    textMuted: '#475569',
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceAlt: '#f1f5f9',
    border: '#e2e8f0',
    tint: tintColorLight,
    icon: '#475569',
    tabIconDefault: '#94a3b8',
    tabIconSelected: tintColorLight,
    positive: '#16a34a',
    negative: '#dc2626',
    accent: '#0ea5e9',
    accentText: '#ffffff',
    accentMuted: '#bae6fd',
    chipBackground: '#e2e8f0',
    chipText: '#0f172a',
    inputBackground: '#ffffff',
    inputBorder: '#cbd5f5',
    inputText: '#0f172a',
    divider: 'rgba(15, 23, 42, 0.1)',
  },
  dark: {
    text: '#ECEDEE',
    textMuted: '#9BA1A6',
    background: '#0f172a',
    surface: '#1e293b',
    surfaceAlt: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(148, 163, 184, 0.24)',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    positive: '#4ade80',
    negative: '#f87171',
    accent: '#38bdf8',
    accentText: '#0f172a',
    accentMuted: 'rgba(56, 189, 248, 0.16)',
    chipBackground: 'rgba(15, 23, 42, 0.45)',
    chipText: '#f8fafc',
    inputBackground: 'rgba(15, 23, 42, 0.45)',
    inputBorder: 'rgba(148, 163, 184, 0.25)',
    inputText: '#f8fafc',
    divider: 'rgba(148, 163, 184, 0.24)',
  },
} as const;

export type ThemeName = keyof typeof Colors;
export type ThemeColors = (typeof Colors)[ThemeName];

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
