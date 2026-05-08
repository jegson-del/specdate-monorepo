import { api } from '../api';
import { SupportService } from '../support';

jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('SupportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates support tickets with category, subject, and message', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true, data: { id: 1 } } });

    await SupportService.createTicket({
      category: 'safety',
      subject: 'Unsafe behavior',
      message: 'A user is harassing me.',
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/support/tickets', {
      category: 'safety',
      subject: 'Unsafe behavior',
      message: 'A user is harassing me.',
    });
  });

  it('sends support thread replies to the ticket message endpoint', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    await SupportService.sendMessage(12, 'Thanks for the update.');

    expect(mockedApi.post).toHaveBeenCalledWith('/support/tickets/12/messages', {
      body: 'Thanks for the update.',
    });
  });

  it('marks support tickets as read', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    await SupportService.markRead(12);

    expect(mockedApi.post).toHaveBeenCalledWith('/support/tickets/12/read');
  });
});
