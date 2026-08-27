/**
 * Paleta de la app. El tema es oscuro fijo (ver `useColorScheme`); la variante
 * clara queda definida porque `useThemeColor` espera ambas.
 */

import { Platform } from 'react-native';

const tintDark = '#2DD4BF';
const tintLight = '#0F766E';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',
    tint: tintLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintLight,
    card: '#F4F6F8',
    border: '#DDE2E6',
    muted: '#687076',
    danger: '#C0392B',
  },
  dark: {
    text: '#E8EAED',
    background: '#0E1116',
    tint: tintDark,
    icon: '#9AA3AE',
    tabIconDefault: '#7C858F',
    tabIconSelected: tintDark,
    card: '#171B21',
    border: '#272D36',
    muted: '#9AA3AE',
    danger: '#FF7A70',
  },
};

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
