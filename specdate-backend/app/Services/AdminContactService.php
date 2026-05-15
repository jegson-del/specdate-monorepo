<?php

namespace App\Services;

use App\Models\SupportMessage;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminContactService
{
    public function __construct(
        private AdminAccessService $adminAccessService,
        private EmailService $emailService,
    ) {}

    public function list(User $admin, ?string $status = null, int $perPage = 25): LengthAwarePaginator
    {
        $this->ensureCanManageContact($admin);
        $perPage = max(1, min($perPage, 100));

        $tickets = $this->contactQuery()
            ->withCount(['messages as unread_count' => fn ($query) => $query
                ->where('sender_role', 'guest')
                ->whereNull('read_at')])
            ->when($status && in_array($status, SupportTicket::STATUSES, true), fn ($query) => $query->where('status', $status))
            ->orderByDesc(DB::raw('COALESCE(last_message_at, created_at)'))
            ->paginate($perPage);

        $tickets->getCollection()->transform(fn (SupportTicket $ticket) => $this->ticketPayload($ticket));

        return $tickets;
    }

    public function show(User $admin, int $ticketId): array
    {
        $this->ensureCanManageContact($admin);

        $ticket = $this->contactQuery()
            ->with(['messages' => fn ($query) => $query->orderBy('id')])
            ->findOrFail($ticketId);

        $ticket->messages()
            ->where('sender_role', 'guest')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return [
            'ticket' => $this->ticketPayload($ticket->fresh()),
            'messages' => $ticket->messages->map(fn (SupportMessage $message) => $this->messagePayload($message))->values(),
        ];
    }

    public function reply(User $admin, int $ticketId, string $body): array
    {
        $this->ensureCanManageContact($admin);

        $ticket = $this->contactQuery()->findOrFail($ticketId);
        if (in_array($ticket->status, ['resolved', 'closed'], true)) {
            $ticket->forceFill(['status' => 'pending_admin', 'resolved_at' => null])->save();
        }

        $message = DB::transaction(function () use ($admin, $body, $ticket) {
            $message = $ticket->messages()->create([
                'sender_id' => $admin->id,
                'sender_role' => 'admin',
                'body' => trim($body),
            ]);

            $ticket->update([
                'status' => 'pending_user',
                'last_message_at' => $message->created_at,
                'resolved_at' => null,
            ]);

            return $message;
        });

        $this->emailService->sendContactTicketReply($ticket->fresh(), trim($body));

        return $this->messagePayload($message->fresh('sender:id,name,username'));
    }

    public function updateStatus(User $admin, int $ticketId, string $status): array
    {
        $this->ensureCanManageContact($admin);

        $ticket = $this->contactQuery()->findOrFail($ticketId);
        $ticket->update([
            'status' => $status,
            'resolved_at' => in_array($status, ['resolved', 'closed'], true) ? now() : null,
        ]);

        return $this->ticketPayload($ticket->fresh());
    }

    public function delete(User $admin, int $ticketId): void
    {
        $this->ensureCanManageContact($admin);
        $this->contactQuery()->findOrFail($ticketId)->delete();
    }

    private function contactQuery()
    {
        return SupportTicket::query()
            ->whereNull('user_id')
            ->whereNotNull('contact_email');
    }

    private function ticketPayload(SupportTicket $ticket): array
    {
        return [
            'id' => $ticket->id,
            'contact_name' => $ticket->contact_name,
            'contact_email' => $ticket->contact_email,
            'category' => $ticket->category,
            'subject' => $ticket->subject,
            'status' => $ticket->status,
            'last_message_at' => $ticket->last_message_at,
            'resolved_at' => $ticket->resolved_at,
            'unread_count' => (int) ($ticket->unread_count ?? 0),
            'created_at' => $ticket->created_at,
        ];
    }

    private function messagePayload(SupportMessage $message): array
    {
        return [
            'id' => $message->id,
            'support_ticket_id' => $message->support_ticket_id,
            'sender_id' => $message->sender_id,
            'sender_role' => $message->sender_role,
            'body' => $message->body,
            'read_at' => $message->read_at,
            'created_at' => $message->created_at,
            'sender' => $message->sender ? [
                'id' => $message->sender->id,
                'name' => $message->sender->name,
                'username' => $message->sender->username,
            ] : null,
        ];
    }

    private function ensureCanManageContact(?User $admin): void
    {
        if (! $admin || $admin->role !== 'admin') {
            throw new HttpException(403, 'Admin access required.');
        }

        $this->adminAccessService->assertCan($admin, AdminAccessService::MANAGE_CONTACT_MESSAGES);
    }
}
