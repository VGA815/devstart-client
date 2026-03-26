const AVATAR_COLORS = ['var(--accent)', 'var(--green)', 'var(--purple)', 'var(--yellow)'] as const;

export function getAvatarColor(name: string): string {
  if (!name) return AVATAR_COLORS[0];
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(/[\s_@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}
