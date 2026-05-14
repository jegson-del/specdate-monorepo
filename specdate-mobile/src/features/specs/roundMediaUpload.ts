import { MediaModerationError, MediaService, moderationFailureMessage, type MediaItem, type MediaUploadType } from '../../services/media';
import type { UploadProgressState } from '../../components';
import type { RoundMediaAsset } from './components';

type ResolveRoundMediaParams = {
  asset: RoundMediaAsset;
  uploadType: MediaUploadType;
  onAssetChange: (asset: RoundMediaAsset) => void;
  onProgress?: (progress: UploadProgressState) => void;
  label?: string;
};

export async function resolveShareableRoundMedia({
  asset,
  uploadType,
  onAssetChange,
  onProgress,
  label,
}: ResolveRoundMediaParams): Promise<MediaItem> {
  const mediaLabel = label ?? (asset.assetType === 'video' ? 'video' : asset.assetType === 'audio' ? 'voice note' : 'image');
  onProgress?.({
    title: asset.uploadedMediaId ? 'Checking media' : 'Uploading media',
    message: asset.uploadedMediaId ? `Checking your ${mediaLabel}.` : `Uploading your ${mediaLabel}.`,
  });
  const uploaded = asset.uploadedMediaId
    ? await MediaService.fetchById(asset.uploadedMediaId)
    : await MediaService.upload(asset.uri, uploadType, null, asset.mimeType);

  onProgress?.({
    title: 'Reviewing media',
    message: `Checking your ${mediaLabel} before it is used.`,
  });
  const reviewed = await MediaService.waitForModeration(uploaded, {
    returnLatestOnTimeout: asset.assetType === 'video',
  });

  onAssetChange({
    ...asset,
    uploadedMediaId: reviewed.id,
    moderationStatus: reviewed.moderation_status,
  });

  if (MediaService.isAllowedToShare(reviewed)) {
    return reviewed;
  }

  if (MediaService.isModerationInProgress(reviewed)) {
    throw new MediaModerationError(moderationFailureMessage('reviewing'), 'reviewing');
  }

  throw new MediaModerationError(
    moderationFailureMessage(String(reviewed.moderation_status ?? 'failed')),
    String(reviewed.moderation_status ?? 'failed'),
  );
}

export function isRoundMediaReviewing(asset?: RoundMediaAsset | null): boolean {
  return asset?.moderationStatus === 'pending' || asset?.moderationStatus === 'scanning';
}
