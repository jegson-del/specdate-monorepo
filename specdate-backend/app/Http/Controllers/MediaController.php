<?php

namespace App\Http\Controllers;

use App\Services\MediaService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
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
     */
    public function upload(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:10240', // Max 10MB
            'type' => 'required|string|in:avatar,profile_gallery,chat,proof',
            'media_id' => 'nullable|integer|exists:media,id',
        ]);

        if ($validator->fails()) {
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
            return $this->sendError('File upload failed.', ['error' => $e->getMessage()], 500);
        }
    }
}
