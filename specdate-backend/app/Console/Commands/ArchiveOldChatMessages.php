<?php

namespace App\Console\Commands;

use App\Services\ChatMessageArchiveService;
use Illuminate\Console\Command;

class ArchiveOldChatMessages extends Command
{
    protected $signature = 'chats:archive-old-messages
        {--days= : Archive messages older than this many days; defaults to CHAT_ARCHIVE_DAYS}
        {--disk= : Filesystem disk for archive files; defaults to CHAT_ARCHIVE_DISK}
        {--chunk= : Number of messages to process per batch; defaults to CHAT_ARCHIVE_CHUNK}
        {--commit : Actually write archive files and delete archived hot-table messages}';

    protected $description = 'Archive old chat messages to configured storage before removing them from the hot chat_messages table.';

    public function handle(ChatMessageArchiveService $archiveService): int
    {
        $days = $this->option('days') !== null ? (int) $this->option('days') : null;
        $chunk = $this->option('chunk') !== null ? (int) $this->option('chunk') : null;
        $disk = $this->option('disk') ?: null;

        if (! $this->option('commit')) {
            $result = $archiveService->dryRun($days);

            if ((int) $result['message_count'] === 0) {
                $this->info(sprintf(
                    'No old chat messages eligible for archive before %s.',
                    $result['cutoff']->toDateTimeString()
                ));
                $this->warn('Dry run only. Scheduler uses --commit to archive when messages become eligible.');

                return self::SUCCESS;
            }

            $this->info(sprintf(
                '%d old safe chat messages across %d thread(s) are eligible for archive before %s.',
                $result['message_count'],
                $result['thread_count'],
                $result['cutoff']->toDateTimeString()
            ));
            $this->warn('Dry run only. Re-run with --commit to archive and remove eligible messages from chat_messages.');

            return self::SUCCESS;
        }

        $result = $archiveService->archiveOldMessages($days, $chunk, $disk);

        if ((int) $result['messages_archived'] === 0 && (int) $result['failed_chunks'] === 0) {
            $this->info(sprintf(
                'No old chat messages eligible for archive before %s.',
                $result['cutoff']->toDateTimeString()
            ));

            return self::SUCCESS;
        }

        $this->info(sprintf(
            'Created %d archive file(s), archived %d message(s), cutoff %s.',
            $result['archives_created'],
            $result['messages_archived'],
            $result['cutoff']->toDateTimeString()
        ));

        if ($result['failed_chunks'] > 0) {
            $this->error("{$result['failed_chunks']} archive chunk(s) failed. Messages in failed chunks were not deleted.");
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
