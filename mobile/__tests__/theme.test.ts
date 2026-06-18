import { theme } from '../src/theme';

describe('theme', () => {
  it('exposes the HomeBase teal primary', () => {
    expect(theme.colors.primary).toBe('#3B7A6F');
  });

  it('exposes a pill radius and base spacing', () => {
    expect(theme.radii.pill).toBeGreaterThanOrEqual(24);
    expect(theme.spacing(2)).toBe(16);
  });
});
