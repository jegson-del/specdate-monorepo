<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to DateUsher</title>
</head>
<body style="margin: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827;">
    <div style="max-width: 620px; margin: 0 auto; padding: 24px;">
        @include('emails.partials.header')
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px;">
            <h1 style="margin: 0 0 12px; font-size: 26px;">Welcome, {{ $user->name }}.</h1>
            <p style="margin: 0; color: #4b5563; line-height: 1.6;">
                Thanks for joining DateUsher. Start exploring specs, meet intentional people, and choose memorable provider-backed dates.
            </p>
        </div>
    </div>
</body>
</html>
