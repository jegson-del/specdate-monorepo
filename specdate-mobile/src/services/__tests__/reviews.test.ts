import { api } from '../api';
import { ReviewService } from '../reviews';

jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('ReviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads review context for a redeemed voucher', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: { voucher: { id: 10 } } } });

    await ReviewService.getContext(10);

    expect(mockedApi.get).toHaveBeenCalledWith('/date-vouchers/10/review-context');
  });

  it('submits provider review payloads', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    await ReviewService.submitProviderReview(10, { rating: 5, comment: ' Great visit ' });

    expect(mockedApi.post).toHaveBeenCalledWith('/date-vouchers/10/provider-review', {
      rating: 5,
      comment: 'Great visit',
    });
  });

  it('submits partner review payloads with optional scores', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    await ReviewService.submitPartnerReview(10, {
      rating: 4,
      chemistry_rating: 4,
      safety_rating: 5,
      would_meet_again: true,
      comment: 'Respectful',
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/date-vouchers/10/partner-review', {
      rating: 4,
      chemistry_rating: 4,
      safety_rating: 5,
      would_meet_again: true,
      comment: 'Respectful',
    });
  });
});
