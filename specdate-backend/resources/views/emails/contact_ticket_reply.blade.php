<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DateUsher support reply</title>
</head>
<body style="margin: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827;">
    
    <div style="max-width: 640px; margin: 0 auto; padding: 24px;">
        
        @include('emails.partials.header')

        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
            
            <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 700; color: #111827;">
                DateUsher support replied
            </h1>

            <p style="margin: 0 0 18px; color: #4b5563; line-height: 1.7; font-size: 15px;">
                We replied to your message regarding 
                <strong>"{{ $ticket->subject }}"</strong>.
            </p>

            <div style="
                padding: 18px;
                border-radius: 14px;
                background: #fdf2f8;
                border: 1px solid #fbcfe8;
                color: #111827;
                line-height: 1.7;
                white-space: pre-wrap;
                font-size: 15px;
            ">
                {{ $replyBody }}
            </div>

            <p style="
                margin: 22px 0 0;
                color: #6b7280;
                font-size: 14px;
                line-height: 1.7;
            ">
                You can reply directly to this email if you would like to provide any additional information or context.
            </p>

            <div style="
                margin-top: 32px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
            ">
                <p style="
                    margin: 0;
                    font-size: 15px;
                    color: #374151;
                    line-height: 1.8;
                ">
                    Kind regards,
                </p>

                <p style="
                    margin: 4px 0 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: #7C3AED;
                    line-height: 1.8;
                ">
                    The DateUsher Team
                </p>
            </div>

        </div>
        @include('emails.partials.footer')

    </div>

</body>
</html>
