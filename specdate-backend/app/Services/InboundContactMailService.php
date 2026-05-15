<?php

namespace App\Services;

use App\Models\InboundMailImport;
use App\Models\SupportMessage;
use App\Models\SupportTicket;
use Illuminate\Support\Facades\DB;

class InboundContactMailService
{
    public function importMessages(iterable $messages, ?string $mailbox = null): array
    {
        $summary = [
            'imported' => 0,
            'duplicate' => 0,
            'skipped' => 0,
            'failed' => 0,
        ];

        foreach ($messages as $message) {
            try {
                $result = $this->importMessage($message, $mailbox);
                $summary[$result]++;
            } catch (\Throwable) {
                $summary['failed']++;
            }
        }

        return $summary;
    }

    public function importMessage(array $message, ?string $mailbox = null): string
    {
        $mailbox = $mailbox ?: config('inbound_mail.mailbox', 'INBOX');
        $uid = $this->cleanIdentifier($message['uid'] ?? null);
        $messageId = $this->cleanIdentifier($message['message_id'] ?? null);

        if ($this->wasAlreadyProcessed($mailbox, $uid, $messageId)) {
            return 'duplicate';
        }

        $fromEmail = $this->normalizeEmail($message['from_email'] ?? $message['from'] ?? '');
        $ticketId = $this->extractTicketId(
            implode("\n", [
                (string) ($message['subject'] ?? ''),
                (string) ($message['text_body'] ?? ''),
                (string) ($message['html_body'] ?? ''),
            ])
        );

        $ticket = $ticketId ? SupportTicket::query()
            ->whereKey($ticketId)
            ->whereNull('user_id')
            ->whereNotNull('contact_email')
            ->first() : null;

        if (! $ticket) {
            $this->remember($mailbox, $uid, $messageId, 'skipped', null, 'No matching contact ticket.', $message);
            return 'skipped';
        }

        if ($fromEmail !== strtolower((string) $ticket->contact_email)) {
            $this->remember($mailbox, $uid, $messageId, 'skipped', $ticket, 'Sender does not match ticket contact email.', $message);
            return 'skipped';
        }

        $body = $this->cleanReplyBody((string) ($message['text_body'] ?? ''), (string) ($message['html_body'] ?? ''));
        if ($body === '') {
            $this->remember($mailbox, $uid, $messageId, 'skipped', $ticket, 'Reply body was empty.', $message);
            return 'skipped';
        }

        DB::transaction(function () use ($body, $mailbox, $message, $messageId, $ticket, $uid) {
            $supportMessage = $ticket->messages()->create([
                'sender_id' => null,
                'sender_role' => 'guest',
                'body' => mb_substr($body, 0, 20000),
                'read_at' => null,
            ]);

            $ticket->update([
                'status' => 'pending_admin',
                'last_message_at' => $supportMessage->created_at,
                'resolved_at' => null,
            ]);

            $this->remember($mailbox, $uid, $messageId, 'imported', $ticket, null, $message, $supportMessage);
        });

        return 'imported';
    }

    public function extractTicketId(string $content): ?int
    {
        if (preg_match('/\bDU-(\d+)\b/i', $content, $matches)) {
            return (int) $matches[1];
        }

        return null;
    }

    public function cleanReplyBody(string $textBody, string $htmlBody = ''): string
    {
        $body = trim($textBody) !== '' ? $textBody : $this->htmlToText($htmlBody);
        $body = str_replace(["\r\n", "\r"], "\n", $body);
        $body = preg_replace('/[ \t]+$/m', '', $body) ?? $body;

        $kept = [];
        foreach (explode("\n", $body) as $line) {
            $trimmed = trim($line);

            if (
                preg_match('/^On .+wrote:$/i', $trimmed)
                || preg_match('/^-{2,}\s*Original Message\s*-{2,}$/i', $trimmed)
                || preg_match('/^From:\s/i', $trimmed)
                || preg_match('/^DateUsher ticket:\s*DU-\d+/i', $trimmed)
            ) {
                break;
            }

            if (str_starts_with($trimmed, '>')) {
                continue;
            }

            $kept[] = $line;
        }

        $body = trim(implode("\n", $kept));
        $body = preg_replace('/\n{3,}/', "\n\n", $body) ?? $body;

        return trim($body);
    }

    private function htmlToText(string $html): string
    {
        $html = preg_replace('/<(br|\/p|\/div|\/li)\b[^>]*>/i', "\n", $html) ?? $html;
        $html = strip_tags($html);

        return html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    private function normalizeEmail(string $value): string
    {
        if (preg_match('/<([^>]+)>/', $value, $matches)) {
            $value = $matches[1];
        }

        return strtolower(trim($value));
    }

    private function cleanIdentifier(?string $value): ?string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }

        return trim($value, " <>\t\n\r\0\x0B");
    }

    private function wasAlreadyProcessed(string $mailbox, ?string $uid, ?string $messageId): bool
    {
        if (! $uid && ! $messageId) {
            return false;
        }

        return InboundMailImport::query()
            ->where('provider', 'imap')
            ->where('mailbox', $mailbox)
            ->where(function ($query) use ($messageId, $uid) {
                if ($uid) {
                    $query->orWhere('uid', $uid);
                }

                if ($messageId) {
                    $query->orWhere('message_id', $messageId);
                }
            })
            ->exists();
    }

    private function remember(
        string $mailbox,
        ?string $uid,
        ?string $messageId,
        string $status,
        ?SupportTicket $ticket,
        ?string $failureReason,
        array $message,
        ?SupportMessage $supportMessage = null,
    ): void {
        if (! $uid && ! $messageId) {
            return;
        }

        InboundMailImport::create([
            'provider' => 'imap',
            'mailbox' => $mailbox,
            'uid' => $uid,
            'message_id' => $messageId,
            'support_ticket_id' => $ticket?->id,
            'status' => $status,
            'failure_reason' => $failureReason,
            'raw_received_at' => $message['received_at'] ?? null,
            'imported_at' => $supportMessage ? now() : null,
        ]);
    }
}
