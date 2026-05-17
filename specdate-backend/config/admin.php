<?php

return [
    'seed' => [
        'email' => env('ADMIN_SEED_EMAIL', 'tayojegede1981@gmail.com'),
        'name' => env('ADMIN_SEED_NAME', 'DateUsher Admin'),
        'username' => env('ADMIN_SEED_USERNAME', 'dateusher-admin'),
        'mobile' => env('ADMIN_SEED_MOBILE', '+10000000000'),
        'password' => env('ADMIN_SEED_PASSWORD', 'password'),
    ],

    'login_otp' => [
        'review_bypass_enabled' => env('ADMIN_REVIEW_OTP_BYPASS', false),
        'review_bypass_email' => env(
            'ADMIN_REVIEW_OTP_BYPASS_EMAIL',
            env('ADMIN_SEED_EMAIL', 'tayojegede1981@gmail.com')
        ),
    ],
];
