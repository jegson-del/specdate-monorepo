<?php

namespace App\Services;

use App\Models\PhoneBlacklistEntry;

class PhoneBlacklistService
{
    public function isBlacklisted(?string $phone): bool
    {
        $normalized = $this->normalize($phone);
        if ($normalized === '') {
            return false;
        }

        return PhoneBlacklistEntry::query()
            ->where('normalized_phone', $normalized)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->exists();
    }

    public function normalize(?string $phone): string
    {
        $phone = trim((string) $phone);
        if ($phone === '') {
            return '';
        }

        $prefix = str_starts_with($phone, '+') ? '+' : '';
        $digits = preg_replace('/\D+/', '', $phone) ?: '';

        return $prefix.$digits;
    }

    public function blockedValidationMessage(): string
    {
        return 'This phone number cannot be used on DateUsher.';
    }
}
