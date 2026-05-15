<?php

return [
    'enabled' => filter_var(env('INBOUND_MAIL_ENABLED', false), FILTER_VALIDATE_BOOL),
    'driver' => env('INBOUND_MAIL_DRIVER', 'imap'),
    'host' => env('INBOUND_MAIL_HOST'),
    'port' => (int) env('INBOUND_MAIL_PORT', 993),
    'encryption' => env('INBOUND_MAIL_ENCRYPTION', 'ssl'),
    'username' => env('INBOUND_MAIL_USERNAME'),
    'password' => env('INBOUND_MAIL_PASSWORD'),
    'mailbox' => env('INBOUND_MAIL_MAILBOX', 'INBOX'),
    'search' => env('INBOUND_MAIL_SEARCH', 'UNSEEN'),
    'limit' => (int) env('INBOUND_MAIL_LIMIT', 25),
    'mark_seen' => filter_var(env('INBOUND_MAIL_MARK_SEEN', false), FILTER_VALIDATE_BOOL),
];
