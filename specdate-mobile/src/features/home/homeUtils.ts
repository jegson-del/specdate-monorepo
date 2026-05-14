import { SpecCardItem, FeedKey } from './types';

export const FEED_KEYS: FeedKey[] = ['LIVE', 'ONGOING', 'POPULAR', 'HOTTEST'];

export function withAlpha(color: string, alpha: number) {
  if (typeof color !== 'string') return color as any;
  if (!color.startsWith('#')) return color;
  const hex = color.slice(1);
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  if (full.length !== 6) return color;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function tagColor(tag: string) {
  switch (tag) {
    case 'LIVE':
      return '#7C3AED';
    case 'ONGOING':
      return '#8B5CF6';
    case 'POPULAR':
      return '#A78BFA';
    case 'HOTTEST':
      return '#5B21B6';
    default:
      return '#7C3AED';
  }
}

export function formatMatchedDate(value?: string) {
  if (!value) return 'Matched recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Matched recently';
  return `Matched ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export async function mapSpecsResponse(res: any, fallbackFeed: FeedKey): Promise<SpecCardItem[]> {
  const paginator = res?.data;
  const fetched: any[] = Array.isArray(paginator) ? paginator : (paginator?.data || []);

  return fetched.map((s: any) => {
    const end = new Date(s.expires_at);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const expiresText = diffDays > 0 ? `Ends in ${diffDays} d` : 'Ending soon';

    return {
      id: String(s.id),
      title: s.title,
      owner: s.owner?.profile?.full_name || s.owner?.name || 'Unknown',
      expiresIn: expiresText,
      joinCount: s.applications_count || 0,
      locationCity: s.location_city || null,
      maxParticipants: s.max_participants,
      eliminatedCount: 0,
      firstDateProvider: '—',
      likesCount: s.likes_count || 0,
      tag: s.tag || fallbackFeed,
      ownerAvatar: s.owner?.avatar || s.owner?.profile?.avatar,
    } as SpecCardItem;
  });
}
