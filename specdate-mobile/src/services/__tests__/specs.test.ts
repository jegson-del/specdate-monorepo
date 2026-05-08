import { api } from '../api';
import { SpecService } from '../specs';

jest.mock('../api', () => ({
  api: {
    post: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('SpecService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits a media-only round answer without sending blank answer text', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    await SpecService.submitAnswer(9, '   ', 42);

    expect(mockedApi.post).toHaveBeenCalledWith('/rounds/9/answer', {
      media_id: 42,
    });
  });

  it('submits text and media together when both are present', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    await SpecService.submitAnswer(9, '  A proper answer  ', 42);

    expect(mockedApi.post).toHaveBeenCalledWith('/rounds/9/answer', {
      answer: 'A proper answer',
      media_id: 42,
    });
  });
});
