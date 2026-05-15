<?php

namespace App\Services;

use App\Mail\NewProviderAdminNotificationMail;
use App\Mail\ContactFormSubmittedMail;
use App\Mail\ContactTicketReplyMail;
use App\Mail\OtpMail;
use App\Mail\ProviderApprovedMail;
use App\Mail\SpecReminderMail;
use App\Mail\WelcomeProviderMail;
use App\Mail\WelcomeUserMail;
use App\Models\Spec;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EmailService
{
    public function sendOtpEmail(string $target, string $code): bool
    {
        return $this->sendNow(
            trim($target),
            new OtpMail($code, $target),
            'OTP email send failed',
            ['target' => $target]
        );
    }

    public function sendWelcomeUser(User $user): bool
    {
        return $this->sendNow(
            $user->email,
            new WelcomeUserMail($user),
            'Welcome user email send failed',
            ['user_id' => $user->id]
        );
    }

    public function sendWelcomeProvider(User $user): bool
    {
        return $this->dispatch(
            $user->email,
            new WelcomeProviderMail($user),
            'Welcome provider email queue failed',
            ['user_id' => $user->id]
        );
    }

    public function sendNewProviderAdminNotification(User $user): bool
    {
        $adminEmail = $this->adminAddress();
        if (!$adminEmail) {
            return false;
        }

        return $this->dispatch(
            $adminEmail,
            new NewProviderAdminNotificationMail($user),
            'Provider admin notification email queue failed',
            [
                'provider_user_id' => $user->id,
                'admin_email' => $adminEmail,
            ]
        );
    }

    public function sendProviderApproved(User $user, string $setupUrl): bool
    {
        return $this->dispatch(
            $user->email,
            new ProviderApprovedMail($user, $setupUrl),
            'Provider approval email queue failed',
            ['provider_user_id' => $user->id]
        );
    }

    public function sendSpecReminder(User $user, Spec $spec, string $timing): bool
    {
        return $this->dispatch(
            $user->email,
            new SpecReminderMail($user, $spec, $timing),
            'Spec reminder email queue failed',
            [
                'user_id' => $user->id,
                'spec_id' => $spec->id,
                'timing' => $timing,
            ]
        );
    }

    public function sendContactFormSubmitted(SupportTicket $ticket, string $messageBody): bool
    {
        $contactEmail = config('mail.contact_address') ?: config('mail.admin_address') ?: config('mail.from.address');

        return $this->dispatch(
            $contactEmail,
            new ContactFormSubmittedMail($ticket, $messageBody),
            'Contact form notification email queue failed',
            [
                'ticket_id' => $ticket->id,
                'contact_email' => $ticket->contact_email,
                'recipient' => $contactEmail,
            ]
        );
    }

    public function sendContactTicketReply(SupportTicket $ticket, string $replyBody): bool
    {
        if (!$ticket->contact_email) {
            return false;
        }

        return $this->dispatch(
            $ticket->contact_email,
            new ContactTicketReplyMail($ticket, $replyBody),
            'Contact ticket reply email queue failed',
            [
                'ticket_id' => $ticket->id,
                'contact_email' => $ticket->contact_email,
            ]
        );
    }

    private function adminAddress(): ?string
    {
        return config('mail.admin_address') ?: config('mail.from.address');
    }

    private function dispatch(string $recipient, Mailable $mailable, string $failureMessage, array $context = []): bool
    {
        try {
            // Queue by default; when QUEUE_CONNECTION=sync this executes immediately.
            Mail::to($recipient)->queue($mailable);
            return true;
        } catch (\Throwable $e) {
            Log::warning($failureMessage, array_merge($context, ['error' => $e->getMessage()]));
            return false;
        }
    }

    private function sendNow(string $recipient, Mailable $mailable, string $failureMessage, array $context = []): bool
    {
        try {
            Mail::to($recipient)->send($mailable);
            return true;
        } catch (\Throwable $e) {
            Log::warning($failureMessage, array_merge($context, ['error' => $e->getMessage()]));
            return false;
        }
    }
}
