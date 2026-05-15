<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your verification code</title>
</head>
<body style="margin: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827;">
    <div style="max-width: 520px; margin: 0 auto; padding: 24px;">
        @include('emails.partials.header')
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px; text-align: center;">
            <h1 style="margin: 0 0 12px; font-size: 24px;">Your verification code</h1>
            <p style="margin: 0 0 20px; color: #4b5563;">Use this code to complete your verification.</p>
            <p style="display: inline-block; margin: 0; padding: 14px 20px; border-radius: 14px; background: #fdf2f8; color: #be185d; font-size: 30px; font-weight: 800; letter-spacing: 8px;">{{ $code }}</p>
            <p style="margin: 22px 0 0; color: #6b7280; font-size: 14px;">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
        </div>
    </div>
</body>
</html>
