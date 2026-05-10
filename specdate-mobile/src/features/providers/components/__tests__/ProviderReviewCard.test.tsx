import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ProviderReviewCard } from '../ProviderReviewCard';

describe('ProviderReviewCard', () => {
  const review = {
    id: '12',
    userName: 'Ada',
    rating: 4,
    text: 'Helpful venue review.',
    date: 'Today',
  };

  it('renders provider review content', () => {
    render(<ProviderReviewCard review={review} />);

    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.getByText('Helpful venue review.')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('opens report action when available', () => {
    const onReport = jest.fn();
    render(<ProviderReviewCard review={review} onReport={onReport} />);

    fireEvent.press(screen.getByLabelText('Report review'));

    expect(onReport).toHaveBeenCalledWith(review);
  });
});
