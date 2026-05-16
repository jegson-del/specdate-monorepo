<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You are invited to Date Usher</title>
</head>
<body style="margin: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827;">
    <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
        @include('emails.partials.header')
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px;">
            <p style="margin: 0 0 10px; color: #be185d; font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;">Partner invitation</p>
            <h1 style="margin: 0 0 14px; font-size: 26px; line-height: 32px;">{{ $invite->provider_name }}, join Date Usher as a trusted date partner.</h1>
            <p style="margin: 0 0 16px; color: #4b5563; line-height: 24px;">Date Usher connects quality venues, experiences, restaurants, hotels, and date-friendly businesses with people actively planning meaningful dates.</p>
            <p style="margin: 0 0 16px; color: #4b5563; line-height: 24px;">Create your provider profile so our team can review your business and prepare your listing for the Date Usher marketplace.</p>
            @if($invite->personal_message)
                <div style="margin: 20px 0; border-left: 4px solid #db2777; background: #fdf2f8; padding: 14px 16px; color: #4b5563; line-height: 22px;">
                    {{ $invite->personal_message }}
                </div>
            @endif
            <a href="{{ $inviteUrl }}" style="display: inline-block; margin-top: 12px; border-radius: 999px; background: #db2777; color: #ffffff; padding: 13px 22px; font-weight: 800; text-decoration: none;">Create provider profile</a>
            <p style="margin: 22px 0 0; color: #6b7280; font-size: 13px; line-height: 20px;">This private invite expires {{ $invite->expires_at->diffForHumans() }}. Provider listings are reviewed before appearing publicly.</p>
        </div>
        @include('emails.partials.footer')
    </div>
</body>
</html>
