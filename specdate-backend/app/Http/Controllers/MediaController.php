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
     * Upload a file.
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function upload(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:10240', // Max 10MB
            'type' => 'required|string|in:avatar,profile_gallery,chat,proof',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        try {
            $media = $this->mediaService->uploadFile(
                $request->file('file'),
                $request->user(),
                $request->input('type')
            );
            
            // Append the generated URL to the response
            $media->url = $media->getUrl();

            return $this->sendResponse($media, 'File uploaded successfully.', 201);
        } catch (\Exception $e) {
            return $this->sendError('File upload failed.', ['error' => $e->getMessage()], 500);
        }
    }
}
