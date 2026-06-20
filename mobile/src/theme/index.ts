export const theme = {
  colors: {
    primary: '#3B7A6F',
    primaryDark: '#2F6359',
    primaryLight: '#EAF1EF',
    ink: '#15201D',
    muted: '#8A938F',
    line: '#E6EAE8',
    card: '#F3F5F4',
    chip: '#EAF1EF',
    white: '#FFFFFF',
    surface: '#FAFBFA',
    danger: '#C0392B',
  },
  radii: { sm: 8, md: 14, lg: 16, xl: 20, pill: 30 },
  spacing: (n: number) => n * 8,
  font: {
    sizeXs: 11,
    sizeSm: 13,
    sizeMd: 15,
    sizeLg: 19,
    sizeXl: 25,
    size2xl: 32,
    weightRegular: '400' as const,
    weightSemibold: '600' as const,
    weightBold: '700' as const,
  },
  shadow: {
    card: {
      shadowColor: '#15201D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 16,
      elevation: 4,
    },
    sm: {
      shadowColor: '#15201D',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
  },
} as const;

export type Theme = typeof theme;
