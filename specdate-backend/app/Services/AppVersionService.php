<?php

namespace App\Services;

class AppVersionService
{
    /**
     * @return array<string, mixed>
     */
    public function status(string $platform, ?string $currentVersion = null, ?string $currentBuild = null): array
    {
        $platform = strtolower($platform) === 'ios' ? 'ios' : 'android';
        $platformConfig = config("mobile.{$platform}", []);
        $latestVersion = (string) ($platformConfig['latest_version'] ?? '1.0.0');
        $minimumVersion = (string) ($platformConfig['minimum_supported_version'] ?? $latestVersion);
        $currentVersion = $this->normaliseVersion($currentVersion ?: $latestVersion);

        return [
            'platform' => $platform,
            'current_version' => $currentVersion,
            'current_build' => $currentBuild,
            'latest_version' => $latestVersion,
            'minimum_supported_version' => $minimumVersion,
            'latest_build' => $platformConfig['latest_build'] ?? null,
            'update_available' => version_compare($currentVersion, $latestVersion, '<'),
            'force_update' => version_compare($currentVersion, $minimumVersion, '<'),
            'store_url' => $platformConfig['store_url'] ?? null,
            'message' => config('mobile.update_message'),
            'release_notes' => config('mobile.release_notes', []),
        ];
    }

    private function normaliseVersion(string $version): string
    {
        $version = trim($version);

        return preg_match('/^\d+(\.\d+){0,2}$/', $version) ? $version : '0.0.0';
    }
}
