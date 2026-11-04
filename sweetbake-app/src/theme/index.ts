export interface ThemePalette {
  isDark: boolean;
  colors: {
    // Brand pink & pastel tones
    blushPink: string;
    pastelRose: string;
    deepRose: string;
    roseGold: string;

    // Backgrounds & Surfaces
    background: string;
    card: string;
    surfaceElevated: string;
    cream: string;
    warmIvory: string;
    white: string;

    // Lavender accents
    lavenderLight: string;
    lavenderAccent: string;
    softLilac: string;

    // Status colors
    status: {
      pending: string;
      pendingDark: string;
      baking: string;
      bakingDark: string;
      decorating: string;
      decoratingDark: string;
      delivered: string;
      deliveredDark: string;
    };

    // Text & Borders
    textDark: string;
    textMauve: string;
    textSecondary: string;
    border: string;
  };
  borderRadius: {
    card: number;
    button: number;
    pill: number;
    input: number;
  };
}

export const LightTheme: ThemePalette = {
  isDark: false,
  colors: {
    blushPink: '#FAE4E8',
    pastelRose: '#F4B8C4',
    deepRose: '#DB7093',
    roseGold: '#B76E79',

    background: '#FEFBF6',
    card: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    cream: '#FEFBF6',
    warmIvory: '#F7F3EC',
    white: '#FFFFFF',

    lavenderLight: '#F0EBF8',
    lavenderAccent: '#C2B2E4',
    softLilac: '#A58CC3',

    status: {
      pending: '#FAD6A5',
      pendingDark: '#C86A1A',
      baking: '#C5E1F5',
      bakingDark: '#2B72A3',
      decorating: '#E4CDF5',
      decoratingDark: '#7C3AED',
      delivered: '#C8ECD6',
      deliveredDark: '#1E7E34',
    },

    textDark: '#2C2830',
    textMauve: '#5A4858',
    textSecondary: '#8C7D87',
    border: '#F4B8C440',
  },
  borderRadius: {
    card: 20,
    button: 16,
    pill: 12,
    input: 14,
  },
};

export const DarkTheme: ThemePalette = {
  isDark: true,
  colors: {
    blushPink: '#3A2730',
    pastelRose: '#E297A6',
    deepRose: '#F080A4',
    roseGold: '#D89BA4',

    background: '#161318',
    card: '#241F27',
    surfaceElevated: '#2E2733',
    cream: '#161318',
    warmIvory: '#201A24',
    white: '#241F27',

    lavenderLight: '#2C2237',
    lavenderAccent: '#BCA3E5',
    softLilac: '#C7B0E6',

    status: {
      pending: '#483318',
      pendingDark: '#FFAE52',
      baking: '#1B374D',
      bakingDark: '#79C1F8',
      decorating: '#371F52',
      decoratingDark: '#C084FC',
      delivered: '#153C24',
      deliveredDark: '#56DF82',
    },

    textDark: '#F7EFF4',
    textMauve: '#DCCCD9',
    textSecondary: '#A99BA6',
    border: '#453540',
  },
  borderRadius: {
    card: 20,
    button: 16,
    pill: 12,
    input: 14,
  },
};

// Global active theme reference that components read from:
// It dynamically proxies color lookups to the currently active palette
let _activeTheme: ThemePalette = LightTheme;

export const setActiveTheme = (theme: ThemePalette) => {
  _activeTheme = theme;
  Object.assign(Theme.colors, theme.colors);
  Theme.isDark = theme.isDark;
};

export const Theme: ThemePalette = {
  isDark: false,
  colors: { ...LightTheme.colors },
  borderRadius: { ...LightTheme.borderRadius },
};
