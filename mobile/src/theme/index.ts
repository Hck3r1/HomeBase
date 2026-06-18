export const theme = {
  colors: {
    primary: '#3B7A6F',
    primaryDark: '#2F6359',
    ink: '#15201D',
    muted: '#8A938F',
    line: '#E6EAE8',
    card: '#F3F5F4',
    chip: '#EAF1EF',
    white: '#FFFFFF',
    danger: '#C0392B',
  },
  radii: { sm: 8, md: 14, lg: 16, pill: 30 },
  spacing: (n: number) => n * 8,
  font: {
    sizeXs: 11,
    sizeSm: 13,
    sizeMd: 15,
    sizeLg: 19,
    sizeXl: 25,
    weightRegular: '400' as const,
    weightSemibold: '600' as const,
    weightBold: '700' as const,
  },
} as const;

export type Theme = typeof theme;
