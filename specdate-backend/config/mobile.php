<?php

return [
    'update_message' => env('MOBILE_UPDATE_MESSAGE', 'A newer DateUsher app version is available. Update for the latest safety, purchase, and performance improvements.'),
    'release_notes' => array_values(array_filter(array_map('trim', explode('|', (string) env('MOBILE_RELEASE_NOTES', ''))))),

    'ios' => [
        'latest_version' => env('MOBILE_IOS_LATEST_VERSION', '1.0.0'),
        'minimum_supported_version' => env('MOBILE_IOS_MINIMUM_SUPPORTED_VERSION', '1.0.0'),
        'latest_build' => env('MOBILE_IOS_LATEST_BUILD'),
        'store_url' => env('IOS_APP_STORE_URL', 'https://dateusher.com'),
    ],

    'android' => [
        'latest_version' => env('MOBILE_ANDROID_LATEST_VERSION', '1.0.0'),
        'minimum_supported_version' => env('MOBILE_ANDROID_MINIMUM_SUPPORTED_VERSION', '1.0.0'),
        'latest_build' => env('MOBILE_ANDROID_LATEST_BUILD'),
        'store_url' => env('ANDROID_PLAY_STORE_URL', 'https://dateusher.com'),
    ],
];
