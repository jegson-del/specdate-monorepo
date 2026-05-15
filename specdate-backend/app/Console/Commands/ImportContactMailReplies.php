<?php

namespace App\Console\Commands;

use App\Services\InboundContactMailService;
use App\Services\NativeImapContactMailbox;
use Illuminate\Console\Command;

class ImportContactMailReplies extends Command
{
    protected $signature = 'contact-mail:import-replies {--limit= : Maximum IMAP messages to inspect}';

    protected $description = 'Import inbound email replies into public contact admin threads.';

    public function handle(NativeImapContactMailbox $mailbox, InboundContactMailService $importer): int
    {
        if (! (bool) config('inbound_mail.enabled')) {
            $this->warn('Inbound contact mail import is disabled. Set INBOUND_MAIL_ENABLED=true to enable it.');
            return self::SUCCESS;
        }

        if (config('inbound_mail.driver') !== 'imap') {
            $this->error('Only the imap inbound mail driver is currently supported.');
            return self::FAILURE;
        }

        if (! $mailbox->isAvailable()) {
            $this->error('PHP IMAP extension is not enabled. Enable ext-imap on the server before running this command.');
            return self::FAILURE;
        }

        $limit = $this->option('limit') ? (int) $this->option('limit') : null;
        $summary = $importer->importMessages(
            $mailbox->fetchMessages($limit),
            (string) config('inbound_mail.mailbox', 'INBOX')
        );

        $this->info(sprintf(
            'Imported: %d, duplicates: %d, skipped: %d, failed: %d',
            $summary['imported'],
            $summary['duplicate'],
            $summary['skipped'],
            $summary['failed'],
        ));

        return self::SUCCESS;
    }
}
