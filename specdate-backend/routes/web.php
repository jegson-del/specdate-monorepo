<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response('', 404)
        ->header('X-Robots-Tag', 'noindex, nofollow');
});

Route::get('/robots.txt', function () {
    return response("User-agent: *\nDisallow: /\n", 200)
        ->header('Content-Type', 'text/plain');
});
