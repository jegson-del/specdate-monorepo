import type { SpecCardItem } from '../home/types';

export type SpecStatusTone = {
  label: string;
  backgroundColor: string;
  textColor: string;
};

export function normalizeSpecStatus(status?: string | null): string {
  return String(status || '').trim().toUpperCase();
}

export function isClosedSpecStatus(status?: string | null): boolean {
  return ['COMPLETED', 'CLOSED', 'EXPIRED'].includes(normalizeSpecStatus(status));
}

export function specStatusLabel(status?: string | null): string {
  switch (normalizeSpecStatus(status)) {
    case 'OPEN':
      return 'Live';
    case 'ACTIVE':
      return 'In progress';
    case 'REVIEWING':
      return 'Reviewing';
    case 'COMPLETED':
    case 'CLOSED':
      return 'Closed';
    case 'EXPIRED':
      return 'Expired';
    default:
      return status ? String(status).replace(/_/g, ' ') : 'Unknown';
  }
}

export function specStatusTone(status?: string | null): SpecStatusTone {
  switch (normalizeSpecStatus(status)) {
    case 'OPEN':
      return { label: 'Live', backgroundColor: '#16A34A', textColor: '#FFFFFF' };
    case 'ACTIVE':
      return { label: 'In progress', backgroundColor: '#7C3AED', textColor: '#FFFFFF' };
    case 'REVIEWING':
      return { label: 'Reviewing', backgroundColor: '#EAB308', textColor: '#111827' };
    case 'COMPLETED':
    case 'CLOSED':
      return { label: 'Closed', backgroundColor: '#475569', textColor: '#FFFFFF' };
    case 'EXPIRED':
      return { label: 'Expired', backgroundColor: '#64748B', textColor: '#FFFFFF' };
    default:
      return { label: specStatusLabel(status), backgroundColor: '#64748B', textColor: '#FFFFFF' };
  }
}

export function specCardTagForStatus(status?: string | null): SpecCardItem['tag'] {
  if (normalizeSpecStatus(status) === 'OPEN') return 'LIVE';
  if (isClosedSpecStatus(status)) return 'CLOSED';
  return 'ONGOING';
}
