export interface ThemePalette {
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

export const Theme: ThemePalette = {
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

export const LightTheme = Theme;

