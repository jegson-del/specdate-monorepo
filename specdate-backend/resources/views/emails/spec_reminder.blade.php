<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $timing === 'today' ? 'Your spec starts today' : 'Your spec starts tomorrow' }}</title>
</head>
<body style="margin: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827;">
    <div style="max-width: 620px; margin: 0 auto; padding: 24px;">
        @include('emails.partials.header')
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px;">
            <h1 style="margin: 0 0 12px; font-size: 26px;">{{ $timing === 'today' ? 'Your spec starts today' : 'Your spec starts tomorrow' }}</h1>
            <p style="margin: 0 0 16px; color: #4b5563; line-height: 1.6;">Hi {{ $user->name ?? $user->username ?? 'there' }},</p>
            <p style="margin: 0 0 16px; color: #4b5563; line-height: 1.6;">
                <strong style="color: #111827;">{{ $spec->title }}</strong>
                {{ $timing === 'today' ? 'starts today.' : 'starts tomorrow.' }}
            </p>
            <p style="margin: 0; color: #6b7280; line-height: 1.6;">Open DateUsher to review the spec and get ready for the quest.</p>
        </div>
        @include('emails.partials.footer')
    </div>
</body>
</html>
