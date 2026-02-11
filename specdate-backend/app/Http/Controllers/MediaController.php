<?php

namespace App\Http\Controllers;

use App\Services\MediaService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class MediaController extends Controller
{
    use ApiResponse;

    protected $mediaService;

    public function __construct(MediaService $mediaService)
    {
        $this->mediaService = $mediaService;
    }

    /**
     * Upload a file, or update an existing media row when media_id is sent (profile_gallery only).
     *
     * Body: file, type, and optionally media_id (int) to replace that slot's image and url.
     * For round answers: round_answer_image (images, max 10MB), round_answer_video (video, max 50MB).
     */
    public function upload(Request $request): JsonResponse
    {
        $type = $request->input('type');

        // If no file or invalid upload (e.g. exceeded PHP post_max_size), return clear error
        if (! $request->hasFile('file')) {
            $maxMb = $type === 'round_answer_video' ? 50 : 10;
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

        $fileRules = ['required', 'file'];
        if ($type === 'round_answer_video') {
            $fileRules[] = 'max:51200'; // 50MB in KB
            // Extension-based so device-recorded videos (varying MIME) are accepted
            $fileRules[] = 'mimes:mp4,mov,m4v,3gp';
        } elseif ($type === 'round_answer_image') {
            $fileRules[] = 'max:10240'; // 10MB
            $fileRules[] = 'mimetypes:image/jpeg,image/png,image/gif,image/webp';
        } else {
            $fileRules[] = 'max:10240';
        }

        $validator = Validator::make($request->all(), [
            'file' => $fileRules,
            'type' => 'required|string|in:avatar,profile_gallery,chat,proof,round_answer_image,round_answer_video',
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
        if ($mediaId !== null && !in_array($type, ['avatar', 'profile_gallery'], true)) {
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
