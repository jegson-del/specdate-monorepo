<?php

namespace App\Services;

use Carbon\Carbon;

class NativeImapContactMailbox
{
    public function isAvailable(): bool
    {
        return extension_loaded('imap');
    }

    public function fetchMessages(?int $limit = null): array
    {
        if (! $this->isAvailable()) {
            throw new \RuntimeException('The PHP IMAP extension is not enabled.');
        }

        $host = (string) config('inbound_mail.host');
        $port = (int) config('inbound_mail.port', 993);
        $username = (string) config('inbound_mail.username');
        $password = (string) config('inbound_mail.password');
        $folder = (string) config('inbound_mail.mailbox', 'INBOX');
        $search = (string) config('inbound_mail.search', 'UNSEEN');
        $limit = max(1, $limit ?: (int) config('inbound_mail.limit', 25));

        if ($host === '' || $username === '' || $password === '') {
            throw new \RuntimeException('Inbound mail host, username, and password are required.');
        }

        $stream = @imap_open($this->mailboxPath($host, $port, $folder), $username, $password);
        if (! $stream) {
            throw new \RuntimeException('Could not connect to inbound mailbox: ' . (imap_last_error() ?: 'Unknown IMAP error.'));
        }

        try {
            $uids = imap_search($stream, $search, SE_UID) ?: [];
            rsort($uids, SORT_NUMERIC);
            $uids = array_slice($uids, 0, $limit);

            $messages = [];
            foreach ($uids as $uid) {
                $overview = imap_fetch_overview($stream, (string) $uid, FT_UID)[0] ?? null;
                $structure = imap_fetchstructure($stream, (string) $uid, FT_UID);
                $bodies = $this->extractBodies($stream, (int) $uid, $structure);

                $messages[] = [
                    'uid' => (string) $uid,
                    'message_id' => isset($overview->message_id) ? (string) $overview->message_id : null,
                    'from_email' => isset($overview->from) ? imap_utf8((string) $overview->from) : '',
                    'subject' => isset($overview->subject) ? imap_utf8((string) $overview->subject) : '',
                    'text_body' => $bodies['text'],
                    'html_body' => $bodies['html'],
                    'received_at' => isset($overview->date) ? Carbon::parse((string) $overview->date) : null,
                ];

                if ((bool) config('inbound_mail.mark_seen', false)) {
                    imap_setflag_full($stream, (string) $uid, '\\Seen', ST_UID);
                }
            }

            return $messages;
        } finally {
            imap_close($stream);
        }
    }

    private function mailboxPath(string $host, int $port, string $folder): string
    {
        $encryption = strtolower((string) config('inbound_mail.encryption', 'ssl'));
        $flags = '/imap';

        if ($encryption === 'ssl') {
            $flags .= '/ssl';
        } elseif ($encryption === 'tls') {
            $flags .= '/tls';
        }

        return sprintf('{%s:%d%s}%s', $host, $port, $flags, $folder);
    }

    private function extractBodies($stream, int $uid, object|false $structure): array
    {
        if (! $structure) {
            return [
                'text' => imap_body($stream, (string) $uid, FT_UID | FT_PEEK) ?: '',
                'html' => '',
            ];
        }

        $bodies = ['text' => '', 'html' => ''];
        $this->walkParts($stream, $uid, $structure, '', $bodies);

        if ($bodies['text'] === '' && $bodies['html'] === '') {
            $bodies['text'] = $this->decodePart(
                imap_body($stream, (string) $uid, FT_UID | FT_PEEK) ?: '',
                (int) ($structure->encoding ?? 0)
            );
        }

        return $bodies;
    }

    private function walkParts($stream, int $uid, object $part, string $section, array &$bodies): void
    {
        if (isset($part->parts) && is_array($part->parts)) {
            foreach ($part->parts as $index => $childPart) {
                $childSection = $section === '' ? (string) ($index + 1) : $section . '.' . ($index + 1);
                $this->walkParts($stream, $uid, $childPart, $childSection, $bodies);
            }

            return;
        }

        $disposition = strtolower((string) ($part->disposition ?? ''));
        if ($disposition === 'attachment') {
            return;
        }

        $subtype = strtolower((string) ($part->subtype ?? ''));
        if (! in_array($subtype, ['plain', 'html'], true)) {
            return;
        }

        $section = $section === '' ? '1' : $section;
        $content = imap_fetchbody($stream, (string) $uid, $section, FT_UID | FT_PEEK) ?: '';
        $content = $this->decodePart($content, (int) ($part->encoding ?? 0));

        if ($subtype === 'plain' && $bodies['text'] === '') {
            $bodies['text'] = $content;
        }

        if ($subtype === 'html' && $bodies['html'] === '') {
            $bodies['html'] = $content;
        }
    }

    private function decodePart(string $content, int $encoding): string
    {
        return match ($encoding) {
            3 => base64_decode($content, true) ?: '',
            4 => quoted_printable_decode($content),
            default => $content,
        };
    }
}
