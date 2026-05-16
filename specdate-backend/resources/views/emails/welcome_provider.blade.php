<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Provider application received</title>
</head>
<body style="margin: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827;">
    <div style="max-width: 620px; margin: 0 auto; padding: 24px;">
        @include('emails.partials.header')
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px;">
            <h1 style="margin: 0 0 12px; font-size: 26px; line-height: 1.2;">We received your provider application</h1>
            <p style="margin: 0 0 18px; color: #4b5563; line-height: 1.6;">Hi {{ $user->providerProfile->company_name ?? $user->name }},</p>
            <p style="margin: 0 0 18px; color: #4b5563; line-height: 1.6;">
                Thanks for applying to become a DateUsher provider. Your application is now pending review.
            </p>
            <div style="background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 14px; padding: 16px; margin: 22px 0;">
                <p style="margin: 0; color: #9d174d; font-weight: 700;">What happens next</p>
                <p style="margin: 8px 0 0; color: #831843; line-height: 1.55;">
                    Our team will review your venue or experience details. Once approved, you will be able to complete your provider profile and appear in the DateUsher marketplace.
                </p>
            </div>
            <p style="margin: 0; color: #6b7280; line-height: 1.6;">We will contact you at {{ $user->email }} if we need anything else.</p>
        </div>
        @include('emails.partials.footer')
    </div>
</body>
</html>
