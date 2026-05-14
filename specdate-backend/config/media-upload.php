<?php

/**
 * Single source of truth for POST /media/upload validation and GET /media/upload-limits.
 * max_kb: Laravel file rule uses KiB (1024 bytes) per framework convention.
 */
return [
    'supports_media_id' => ['avatar', 'profile_gallery', 'provider_gallery'],

    'types' => [
        'avatar' => [
            'max_kb' => 10240,
            'mimes' => null,
            'mimetypes' => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        ],
        'profile_gallery' => [
            'max_kb' => 10240,
            'mimes' => null,
            'mimetypes' => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        ],
        'provider_gallery' => [
            'max_kb' => 10240,
            'mimes' => null,
            'mimetypes' => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        ],
        'proof' => [
            'max_kb' => 10240,
            'mimes' => null,
            'mimetypes' => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        ],
        'chat' => [
            'max_kb' => 51200,
            'mimes' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'm4v', '3gp', 'm4a', 'mp3', 'wav', 'webm', 'aac'],
            'mimetypes' => null,
        ],
        'chat_image' => [
            'max_kb' => 10240,
            'mimes' => null,
            'mimetypes' => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        ],
        'chat_video' => [
            'max_kb' => 51200,
            'mimes' => ['mp4', 'mov', 'm4v', '3gp', 'webm'],
            'mimetypes' => null,
        ],
        'chat_audio' => [
            'max_kb' => 10240,
            'mimes' => ['m4a', 'mp4', 'mp3', 'wav', 'webm', 'aac', '3gp'],
            'mimetypes' => null,
        ],
        'round_answer_image' => [
            'max_kb' => 10240,
            'mimes' => null,
            'mimetypes' => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        ],
        'round_answer_video' => [
            'max_kb' => 51200,
            'mimes' => ['mp4', 'mov', 'm4v', '3gp', 'webm'],
            'mimetypes' => null,
        ],
        'round_question_image' => [
            'max_kb' => 10240,
            'mimes' => null,
            'mimetypes' => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        ],
        'round_question_video' => [
            'max_kb' => 51200,
            'mimes' => ['mp4', 'mov', 'm4v', '3gp', 'webm'],
            'mimetypes' => null,
        ],
        'round_answer_audio' => [
            'max_kb' => 10240,
            'mimes' => ['m4a', 'mp4', 'mp3', 'wav', 'webm', 'aac', '3gp'],
            'mimetypes' => null,
        ],
        'round_question_audio' => [
            'max_kb' => 10240,
            'mimes' => ['m4a', 'mp4', 'mp3', 'wav', 'webm', 'aac', '3gp'],
            'mimetypes' => null,
        ],
    ],
];
