import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ChatSafetySheet from '../ChatSafetySheet';

describe('ChatSafetySheet', () => {
  it('shows user safety actions', () => {
    const onOpenReport = jest.fn();
    const onOpenBlock = jest.fn();

    const screen = render(
      <ChatSafetySheet
        visible
        mode="actions"
        title="Ada"
        subtitle="Choose a safety action."
        onDismiss={jest.fn()}
        onOpenReport={onOpenReport}
        onOpenBlock={onOpenBlock}
      />
    );

    fireEvent.press(screen.getByText('Report user'));
    fireEvent.press(screen.getByText('Block user'));

    expect(onOpenReport).toHaveBeenCalledTimes(1);
    expect(onOpenBlock).toHaveBeenCalledTimes(1);
  });

  it('shows media reporting only when media exists', () => {
    const withoutMedia = render(
      <ChatSafetySheet
        visible
        mode="message_actions"
        title="Message options"
        onDismiss={jest.fn()}
        hasMedia={false}
      />
    );

    expect(withoutMedia.getByText('Report message')).toBeTruthy();
    expect(withoutMedia.queryByText('Report media')).toBeNull();
    withoutMedia.unmount();

    const withMedia = render(
      <ChatSafetySheet
        visible
        mode="message_actions"
        title="Message options"
        onDismiss={jest.fn()}
        hasMedia
      />
    );

    expect(withMedia.getByText('Report message')).toBeTruthy();
    expect(withMedia.getByText('Report media')).toBeTruthy();
  });

  it('uses custom labels for answer reporting menus', () => {
    const screen = render(
      <ChatSafetySheet
        visible
        mode="message_actions"
        title="Answer options"
        onDismiss={jest.fn()}
        hasMedia
        primaryReportLabel="Report answer"
        mediaReportLabel="Report media"
      />
    );

    expect(screen.getByText('Report answer')).toBeTruthy();
    expect(screen.getByText('Report media')).toBeTruthy();
  });

  it('uses custom labels for provider chat safety actions', () => {
    const screen = render(
      <ChatSafetySheet
        visible
        mode="actions"
        title="Nile Bites"
        onDismiss={jest.fn()}
        userReportLabel="Report provider"
        userBlockLabel="Block provider"
      />
    );

    expect(screen.getByText('Report provider')).toBeTruthy();
    expect(screen.getByText('Block provider')).toBeTruthy();
  });
});
