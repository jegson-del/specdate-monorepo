import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { RoundResponsesList } from '../RoundResponsesList';

jest.mock('../AudioMessagePlayer', () => ({
  AudioMessagePlayer: 'AudioMessagePlayer',
}));

jest.mock('../VideoThumbnailPlayer', () => ({
  VideoThumbnailPlayer: 'VideoThumbnailPlayer',
}));

const theme = {
  colors: {
    primary: '#7C3AED',
    error: '#EF4444',
    surface: '#FFFFFF',
    surfaceVariant: '#F3F4F6',
    outline: '#D1D5DB',
    outlineVariant: '#E5E7EB',
    onSurface: '#111827',
    onSurfaceVariant: '#6B7280',
  },
};

describe('RoundResponsesList', () => {
  it('shows a compact report action and opens the report menu callback', () => {
    const onOpenReportMenu = jest.fn();
    const answer = {
      id: 10,
      user_id: 3,
      answer_text: 'I value kindness and effort.',
      is_eliminated: false,
      user: { name: 'Taylor', profile: { full_name: 'Taylor' } },
    };

    const screen = render(
      <RoundResponsesList
        answers={[answer]}
        roundStatus="ACTIVE"
        theme={theme}
        onEliminate={jest.fn()}
        onOpenVideo={jest.fn()}
        onOpenReportMenu={onOpenReportMenu}
      />
    );

    fireEvent.press(screen.getByText('Report'));

    expect(onOpenReportMenu).toHaveBeenCalledWith(answer);
  });

  it('shows eliminate only for active or reviewing non-eliminated answers', () => {
    const answer = {
      id: 10,
      user_id: 3,
      answer_text: 'My answer',
      is_eliminated: false,
      user: { name: 'Taylor', profile: { full_name: 'Taylor' } },
    };

    const active = render(
      <RoundResponsesList
        answers={[answer]}
        roundStatus="ACTIVE"
        theme={theme}
        onEliminate={jest.fn()}
        onOpenVideo={jest.fn()}
      />
    );

    expect(active.getByText('Eliminate')).toBeTruthy();
    active.unmount();

    const completed = render(
      <RoundResponsesList
        answers={[answer]}
        roundStatus="COMPLETED"
        theme={theme}
        onEliminate={jest.fn()}
        onOpenVideo={jest.fn()}
      />
    );

    expect(completed.queryByText('Eliminate')).toBeNull();
  });
});
