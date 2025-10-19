export const decisionColors: Record<string, string> = {
  allow: '#16a34a',
  review: '#f59e0b',
  deny: '#dc2626',
};

export const decisionAreaFill = (decision: string) => {
  const hex = decisionColors[decision] ?? '#94a3b8';
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.2)`;
};

export const defaultPalette = ['#2563eb', '#0ea5e9', '#14b8a6', '#f97316', '#a855f7'];
