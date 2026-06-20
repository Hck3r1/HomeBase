export const brand = {
  name: 'HomeBase',
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
    success: '#2E7D5B',
  },
} as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}
