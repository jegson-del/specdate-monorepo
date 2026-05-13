import { confirmMediaShareWithAiScan } from '../confirmMediaShareWithAiScan';
import { appConfirm } from '../../components/AppDialogProvider';

jest.mock('../../components/AppDialogProvider', () => ({
    appConfirm: jest.fn(),
}));

const appConfirmMock = appConfirm as jest.MockedFunction<typeof appConfirm>;

describe('confirmMediaShareWithAiScan', () => {
    beforeEach(() => {
        appConfirmMock.mockReset();
    });

    it('resolves true when user taps Share', async () => {
        appConfirmMock.mockResolvedValueOnce(true);

        await expect(confirmMediaShareWithAiScan()).resolves.toBe(true);
        expect(appConfirmMock).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Share this media?',
            cancelText: 'Cancel',
            confirmText: 'Share',
            type: 'warning',
            cancelable: true,
        }));
    });

    it('resolves false when user taps Cancel', async () => {
        appConfirmMock.mockResolvedValueOnce(false);

        await expect(confirmMediaShareWithAiScan()).resolves.toBe(false);
    });
});
