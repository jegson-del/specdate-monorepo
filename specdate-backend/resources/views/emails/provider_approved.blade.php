<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Provider application approved</title>
</head>
<body style="margin: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827;">
    <div style="max-width: 620px; margin: 0 auto; padding: 24px;">
        @include('emails.partials.header')
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px;">
            <h1 style="margin: 0 0 12px; font-size: 26px; line-height: 1.2;">Congratulations, you are approved</h1>
            <p style="margin: 0 0 18px; color: #4b5563; line-height: 1.6;">Hi {{ $user->providerProfile->company_name ?? $user->name }},</p>
            <p style="margin: 0 0 18px; color: #4b5563; line-height: 1.6;">
                Your DateUsher provider application has been approved. Set your provider password to access your account.
            </p>

            <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 26px 0;">
                <tr>
                    <td style="border-radius: 999px; background: #db2777;">
                        <a href="{{ $setupUrl }}" style="display: inline-block; padding: 14px 24px; color: #ffffff; font-weight: 700; text-decoration: none;">
                            Set provider password
                        </a>
                    </td>
                </tr>
            </table>

            <div style="background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 14px; padding: 16px; margin: 22px 0;">
                <p style="margin: 0; color: #9d174d; font-weight: 700;">After setting your password</p>
                <p style="margin: 8px 0 0; color: #831843; line-height: 1.55;">
                    Download the DateUsher app and log in with {{ $user->email }} and your new password.
                </p>
            </div>

            <p style="margin: 0; color: #6b7280; line-height: 1.6;">
                This secure link expires in 60 minutes. If it expires, contact DateUsher support and we will send a fresh setup link.
            </p>
        </div>
        @include('emails.partials.footer')
    </div>
</body>
</html>
