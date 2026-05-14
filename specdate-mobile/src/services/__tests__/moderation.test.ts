import { api } from '../api';
import { ModerationService } from '../moderation';

jest.mock('../api', () => ({
  api: {
    post: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('ModerationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits report payload to the reports endpoint', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    await ModerationService.reportContent({
      target_type: 'message',
      target_id: 42,
      reason: 'Harassment or abuse',
      details: 'Threatening language',
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/reports', {
      target_type: 'message',
      target_id: 42,
      reason: 'Harassment or abuse',
      details: 'Threatening language',
    });
  });

  it('blocks and unblocks users through the block endpoints', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });
    mockedApi.delete.mockResolvedValueOnce({ data: { success: true } });

    await ModerationService.blockUser(7, 'Spam');
    await ModerationService.unblockUser(7);

    expect(mockedApi.post).toHaveBeenCalledWith('/blocks', { user_id: 7, reason: 'Spam' });
    expect(mockedApi.delete).toHaveBeenCalledWith('/blocks/7');
  });

  it('loads account moderation status', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: { user: { moderation_status: 'active' } } } });

    await ModerationService.getModerationStatus();

    expect(mockedApi.get).toHaveBeenCalledWith('/me/moderation');
  });

  it('submits moderation appeals', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    await ModerationService.submitModerationAppeal({
      action_id: 9,
      appeal_text: 'Please review this decision again.',
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/moderation/appeals', {
      action_id: 9,
      appeal_text: 'Please review this decision again.',
    });
  });
});
