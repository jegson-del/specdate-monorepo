import { MediaService, moderationFailureMessage, type MediaItem, type MediaUploadType } from '../../services/media';
import type { RoundMediaAsset } from './components';

type ResolveRoundMediaParams = {
  asset: RoundMediaAsset;
  uploadType: MediaUploadType;
  onAssetChange: (asset: RoundMediaAsset) => void;
};

export async function resolveShareableRoundMedia({
  asset,
  uploadType,
  onAssetChange,
}: ResolveRoundMediaParams): Promise<MediaItem> {
  const uploaded = asset.uploadedMediaId
    ? await MediaService.fetchById(asset.uploadedMediaId)
    : await MediaService.upload(asset.uri, uploadType, null, asset.mimeType);

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
    throw new Error(moderationFailureMessage('reviewing'));
  }

  throw new Error(moderationFailureMessage(String(reviewed.moderation_status ?? 'failed')));
}

export function isRoundMediaReviewing(asset?: RoundMediaAsset | null): boolean {
  return asset?.moderationStatus === 'pending' || asset?.moderationStatus === 'scanning';
}
