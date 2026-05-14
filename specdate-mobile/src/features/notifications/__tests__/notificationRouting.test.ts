import { routeNotification } from '../notificationRouting';

describe('routeNotification', () => {
  it('routes appeal decision notifications to moderation status', () => {
    const navigation = { navigate: jest.fn() };
    const queryClient = { invalidateQueries: jest.fn() } as any;

    const routed = routeNotification(
      { type: 'moderation_appeal_granted', data: { appeal_id: 12 } },
      navigation,
      queryClient,
    );

    expect(routed).toBe(true);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['moderation-status'] });
    expect(navigation.navigate).toHaveBeenCalledWith('ModerationStatus');
  });
});
