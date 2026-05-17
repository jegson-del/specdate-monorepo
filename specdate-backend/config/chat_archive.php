<?php

return [
    'days' => env('CHAT_ARCHIVE_DAYS', 30),
    'min_days' => env('CHAT_ARCHIVE_MIN_DAYS', 7),
    'disk' => env('CHAT_ARCHIVE_DISK', 's3'),
    'chunk' => env('CHAT_ARCHIVE_CHUNK', 500),
];
