@php
    $logoUrl = config('mail.logo_url');
@endphp

<div style="padding: 28px 0 22px; text-align: center;">
    <a href="{{ config('app.url') }}" style="display: inline-block; text-decoration: none;">
        <img
            src="{{ $logoUrl }}"
            width="188"
            alt="DateUsher"
            style="display: block; width: 188px; max-width: 188px; height: auto; margin: 0 auto; border: 0; outline: none; text-decoration: none;"
        >
    </a>
</div>
