export type SpecCardItem = {
  id: string;
  title: string;
  owner: string;
  expiresIn: string;
  joinCount: number;
  maxParticipants: number;
  eliminatedCount: number;
  firstDateProvider: string;
  likesCount: number;
  tag: 'LIVE' | 'ONGOING' | 'POPULAR' | 'HOTTEST';
  ownerAvatar?: string;
};

export type FeedKey = SpecCardItem['tag'];

export type HomeTopTab = 'Specs' | 'People';

export type BottomTabKey = 'Home' | 'Dates' | 'Specs' | 'Requests';

export type HomeColors = {
  bg: string;
  surface: string;
  text: string;
  subtext: string;
  cardBg: string;
  cardText: string;
  cardSubtext: string;
};

export type SpecDateItem = {
  id: number;
  spec_id: number;
  date_code: string;
  chat_thread_id?: number | null;
  matched_at: string;
  is_owner: boolean;
  spec?: {
    id: number;
    title: string;
    description?: string | null;
    location_city?: string | null;
  } | null;
  winner?: {
    id: number;
    name: string;
    username?: string | null;
    avatar?: string | null;
  } | null;
  other_user?: {
    id: number;
    name: string;
    username?: string | null;
    avatar?: string | null;
  } | null;
};
