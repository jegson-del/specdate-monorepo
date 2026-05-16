<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New contact message</title>
</head>
<body style="margin: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827;">
    <div style="max-width: 680px; margin: 0 auto; padding: 24px;">
        @include('emails.partials.header')
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px;">
            <h1 style="margin: 0 0 12px; font-size: 26px; line-height: 1.2;">New contact message</h1>
            <p style="margin: 0 0 20px; color: #4b5563; line-height: 1.6;">
                A public website visitor submitted the DateUsher contact form. A support ticket was also created for admin follow-up.
            </p>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px 0; color: #6b7280; width: 140px;">Ticket</td>
                    <td style="padding: 10px 0; font-weight: 700;">#{{ $ticket->id }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #6b7280;">Name</td>
                    <td style="padding: 10px 0;">{{ $ticket->contact_name }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #6b7280;">Email</td>
                    <td style="padding: 10px 0;">{{ $ticket->contact_email }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #6b7280;">Category</td>
                    <td style="padding: 10px 0;">{{ $ticket->category }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #6b7280;">Subject</td>
                    <td style="padding: 10px 0;">{{ $ticket->subject }}</td>
                </tr>
            </table>

            <div style="margin-top: 18px; padding: 16px; border-radius: 14px; background: #f8fafc; color: #111827; line-height: 1.6; white-space: pre-wrap;">{{ $messageBody }}</div>
        </div>
        @include('emails.partials.footer')
    </div>
</body>
</html>
