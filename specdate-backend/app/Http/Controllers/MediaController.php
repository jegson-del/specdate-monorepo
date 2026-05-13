<?php

namespace App\Http\Controllers;

use App\Models\Media;
use App\Services\MediaService;
use App\Services\MediaUploadRulesService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class MediaController extends Controller
{
    use ApiResponse;

    protected $mediaService;

    public function __construct(
        MediaService $mediaService,
        protected MediaUploadRulesService $mediaUploadRules,
    ) {
        $this->mediaService = $mediaService;
    }

    /**
     * Max upload size and allowed extensions/MIME groups per `type` (for pickers and copy).
     */
    public function uploadLimits(): JsonResponse
    {
        return $this->sendResponse(
            $this->mediaUploadRules->publicLimitsPayload(),
            'Media upload limits.',
            200
        );
    }

    /**
     * Poll moderation status after upload (pending → scanning → approved / flagged / failed).
     */
    public function show(Request $request, Media $media): JsonResponse
    {
        if ($media->user_id !== $request->user()->id) {
            return $this->sendError('Forbidden.', [], 403);
        }

        return $this->sendResponse($media, 'Media retrieved.', 200);
    }

    /**
     * Upload a file, or update an existing media row when media_id is sent (profile_gallery only).
     *
     * Body: file, type, and optionally media_id (int) to replace that slot's image and url.
     * For round media: round_answer_image/round_question_image (images, max 10MB),
     * round_answer_video/round_question_video (video, max 50MB),
     * round_answer_audio/round_question_audio (audio, max 10MB).
     */
    public function upload(Request $request): JsonResponse
    {
        $type = $request->input('type');

        // If no file or invalid upload (e.g. exceeded PHP post_max_size), return clear error
        if (! $request->hasFile('file')) {
            $maxMb = 10;
            if (is_string($type) && $type !== '') {
                try {
                    $maxMb = $this->mediaUploadRules->maxMegabytesHintForType($type);
                } catch (\InvalidArgumentException) {
                    $maxMb = 10;
                }
            }
            Log::warning('Media upload: no file in request', ['type' => $type]);

            return $this->sendError(
                'No file received. The file may be too large (max '.$maxMb.'MB for '.$type.') or the request was invalid.',
                [],
                422
            );
        }

        $uploadedFile = $request->file('file');
        if (! $uploadedFile->isValid()) {
            Log::warning('Media upload: file invalid', [
                'type' => $type,
                'error' => $uploadedFile->getErrorMessage(),
            ]);

            return $this->sendError(
                'The uploaded file is not valid: '.$uploadedFile->getErrorMessage(),
                ['error' => $uploadedFile->getErrorMessage()],
                422
            );
        }

        try {
            $fileRules = $this->mediaUploadRules->fileRulesForType((string) $type);
        } catch (\InvalidArgumentException) {
            return $this->sendError('Validation Error.', ['type' => ['Invalid upload type.']], 422);
        }

        $allowedIn = implode(',', $this->mediaUploadRules->allowedTypes());

        $validator = Validator::make($request->all(), [
            'file' => $fileRules,
            'type' => 'required|string|in:'.$allowedIn,
            'media_id' => 'nullable|integer|exists:media,id',
        ]);

        if ($validator->fails()) {
            Log::warning('Media upload validation failed', [
                'type' => $type,
                'errors' => $validator->errors()->toArray(),
                'file_client_name' => $request->file('file')?->getClientOriginalName(),
                'file_mime' => $request->file('file')?->getMimeType(),
            ]);

            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $type = $request->input('type');
        $mediaId = $request->has('media_id') ? (int) $request->input('media_id') : null;
        if ($mediaId !== null && ! in_array($type, ['avatar', 'profile_gallery'], true)) {
            return $this->sendError('media_id is only supported for avatar or profile_gallery.', [], 422);
        }

        try {
            $media = $this->mediaService->uploadFile(
                $request->file('file'),
                $request->user(),
                $type,
                $mediaId
            );

            return $this->sendResponse($media, $mediaId ? 'Image updated successfully.' : 'File uploaded successfully.', 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return $this->sendError('Media not found or not yours.', [], 404);
        } catch (\Exception $e) {
            Log::error('Media upload failed', [
                'type' => $type,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->sendError('File upload failed.', ['error' => $e->getMessage()], 500);
        }
    }
}
