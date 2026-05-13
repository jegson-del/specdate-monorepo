import {
    clearMediaUploadLimitsCache,
    fetchMediaUploadLimits,
    formatUploadLimitLine,
    getMediaUploadLimitsCached,
    prefetchMediaUploadLimits,
    uploadMedia,
    waitForMediaModeration,
} from '../media';

jest.mock('../api', () => ({
    getAuthToken: jest.fn(() => 'test-token'),
    getApiBaseUrl: jest.fn(() => 'http://localhost/api'),
}));

const mockFetch = jest.fn();

describe('media service', () => {
    beforeAll(() => {
        global.fetch = mockFetch as unknown as typeof fetch;
    });

    beforeEach(() => {
        clearMediaUploadLimitsCache();
        mockFetch.mockClear();
    });

    it('fetchMediaUploadLimits returns types payload', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () =>
                JSON.stringify({
                    success: true,
                    data: {
                        types: {
                            chat_video: {
                                max_kb: 51200,
                                max_mb: 50,
                                mimes: ['mp4', 'mov'],
                                mimetypes: null,
                            },
                        },
                        supports_media_id: ['avatar', 'profile_gallery'],
                    },
                }),
        });

        const limits = await fetchMediaUploadLimits();
        expect(limits.types.chat_video.max_mb).toBe(50);
        expect(mockFetch).toHaveBeenCalledWith(
            'http://localhost/api/media/upload-limits',
            expect.objectContaining({ method: 'GET' })
        );
    });

    it('getMediaUploadLimitsCached uses cache on second call', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            text: async () =>
                JSON.stringify({
                    success: true,
                    data: {
                        types: { chat_image: { max_kb: 10240, max_mb: 10, mimes: null, mimetypes: ['image/jpeg'] } },
                        supports_media_id: [],
                    },
                }),
        });

        await getMediaUploadLimitsCached();
        await getMediaUploadLimitsCached();
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('prefetchMediaUploadLimits swallows fetch errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('network'));
        await expect(prefetchMediaUploadLimits()).resolves.toBeUndefined();
    });

    it('formatUploadLimitLine uses cached limits', async () => {
        expect(formatUploadLimitLine('chat_video')).toBeNull();
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () =>
                JSON.stringify({
                    success: true,
                    data: {
                        types: {
                            chat_video: {
                                max_kb: 51200,
                                max_mb: 50,
                                mimes: ['mp4', 'mov', 'webm'],
                                mimetypes: null,
                            },
                        },
                        supports_media_id: [],
                    },
                }),
        });
        await getMediaUploadLimitsCached();
        const line = formatUploadLimitLine('chat_video');
        expect(line).toContain('50');
        expect(line).toContain('mp4');
    });

    it('uploadMedia returns data on 201', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 201,
            text: async () =>
                JSON.stringify({
                    success: true,
                    data: {
                        id: 1,
                        user_id: 2,
                        file_path: 'uploads/2/chat_image/x.jpg',
                        url: 'http://cdn/x.jpg',
                        type: 'chat_image',
                        mime_type: 'image/jpeg',
                        size: 100,
                        created_at: '2026-01-01T00:00:00.000000Z',
                    },
                }),
        });

        const item = await uploadMedia('file:///tmp/photo.jpg', 'chat_image');
        expect(item.id).toBe(1);
        expect(item.url).toContain('cdn');
        expect(mockFetch).toHaveBeenCalledWith(
            'http://localhost/api/media/upload',
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('uploadMedia surfaces validation file error from data.file', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 422,
            text: async () =>
                JSON.stringify({
                    success: false,
                    message: 'Validation Error.',
                    data: { file: ['The file must not be greater than 51200 kilobytes.'] },
                }),
        });

        await expect(uploadMedia('file:///tmp/huge.mp4', 'chat_video')).rejects.toThrow(/kilobytes/);
    });

    it('waitForMediaModeration resolves immediately for approved media', async () => {
        await expect(waitForMediaModeration({
            id: 9,
            user_id: 2,
            file_path: 'uploads/2/chat_image/x.jpg',
            url: 'http://cdn/x.jpg',
            type: 'chat_image',
            mime_type: 'image/jpeg',
            size: 100,
            created_at: '2026-01-01T00:00:00.000000Z',
            moderation_status: 'approved',
        })).resolves.toMatchObject({ id: 9 });
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('waitForMediaModeration rejects flagged media with neutral copy', async () => {
        await expect(waitForMediaModeration({
            id: 9,
            user_id: 2,
            file_path: 'uploads/2/chat_image/x.jpg',
            url: 'http://cdn/x.jpg',
            type: 'chat_image',
            mime_type: 'image/jpeg',
            size: 100,
            created_at: '2026-01-01T00:00:00.000000Z',
            moderation_status: 'flagged',
        })).rejects.toThrow('This file could not be sent. Please choose another file.');
    });
});
