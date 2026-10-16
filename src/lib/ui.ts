const COLORS = ['#f2b705', '#9fd3c7', '#f4b6a0', '#c7c2f0', '#e8e4d8', '#b8d98f', '#f0c3dc', '#a9cbe8'];

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function lb(n: number) {
  return `${Number.isInteger(n) ? n : n.toFixed(1)} lb`;
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}
