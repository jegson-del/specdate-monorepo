<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Date Usher admin invitation</title>
</head>
<body style="margin: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827;">
    <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
        @include('emails.partials.header')
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px;">
            <p style="margin: 0 0 10px; color: #be185d; font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;">Admin invitation</p>
            <h1 style="margin: 0 0 14px; font-size: 24px; line-height: 30px;">You have been invited to Date Usher admin.</h1>
            <p style="margin: 0 0 16px; color: #4b5563; line-height: 24px;">Use this private link to verify your email and create your admin account. Your account will still need approval before dashboard access is enabled.</p>
            <a href="{{ $inviteUrl }}" style="display: inline-block; margin-top: 12px; border-radius: 999px; background: #111827; color: #ffffff; padding: 13px 22px; font-weight: 800; text-decoration: none;">Accept admin invite</a>
            <p style="margin: 22px 0 0; color: #6b7280; font-size: 13px; line-height: 20px;">This link expires {{ $invite->expires_at->diffForHumans() }}. Do not forward it.</p>
        </div>
        @include('emails.partials.footer')
    </div>
</body>
</html>
