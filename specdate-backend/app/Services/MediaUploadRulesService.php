<?php

namespace App\Services;

class MediaUploadRulesService
{
    /**
     * @return list<string>
     */
    public function allowedTypes(): array
    {
        return array_keys(config('media-upload.types', []));
    }

    /**
     * Laravel validation rules for the uploaded file under key "file".
     *
     * @return list<string>
     */
    public function fileRulesForType(string $type): array
    {
        $def = config('media-upload.types.'.$type);
        if (! is_array($def)) {
            throw new \InvalidArgumentException("Unknown media upload type: {$type}");
        }

        $maxKb = (int) ($def['max_kb'] ?? 10240);
        $rules = ['required', 'file', 'max:'.$maxKb];

        $mimes = $def['mimes'] ?? null;
        if (is_array($mimes) && $mimes !== []) {
            $rules[] = 'mimes:'.implode(',', $mimes);
        }

        $mimetypes = $def['mimetypes'] ?? null;
        if (is_array($mimetypes) && $mimetypes !== []) {
            $rules[] = 'mimetypes:'.implode(',', $mimetypes);
        }

        return $rules;
    }

    public function maxMegabytesHintForType(string $type): int
    {
        $def = config('media-upload.types.'.$type);
        if (! is_array($def)) {
            return 10;
        }

        return (int) floor(((int) ($def['max_kb'] ?? 10240)) / 1024);
    }

    /**
     * Payload for GET /media/upload-limits (client-safe).
     *
     * @return array{types: array<string, array<string, mixed>>, supports_media_id: list<string>}
     */
    public function publicLimitsPayload(): array
    {
        $types = [];
        foreach (config('media-upload.types', []) as $type => $def) {
            if (! is_array($def)) {
                continue;
            }
            $maxKb = (int) ($def['max_kb'] ?? 10240);
            $types[$type] = [
                'max_kb' => $maxKb,
                'max_mb' => (int) floor($maxKb / 1024),
                'mimes' => $def['mimes'] ?? null,
                'mimetypes' => $def['mimetypes'] ?? null,
            ];
        }

        return [
            'types' => $types,
            'supports_media_id' => config('media-upload.supports_media_id', []),
        ];
    }
}
