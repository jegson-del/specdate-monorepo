<?php

namespace App\Services;

use App\Models\SupportMessage;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class SupportService
{
    public function __construct(private NotificationService $notificationService)
    {
    }

    public function listTickets(User $user)
    {
        $query = SupportTicket::query()
            ->with('user:id,name,username')
            ->withCount(['messages as unread_count' => function ($q) use ($user) {
                if ($user->role === 'admin') {
                    $q->where('sender_role', 'user')->whereNull('read_at');
                } else {
                    $q->where('sender_role', 'admin')->whereNull('read_at');
                }
            }])
            ->orderByDesc(DB::raw('COALESCE(last_message_at, created_at)'));

        if ($user->role !== 'admin') {
            $query->where('user_id', $user->id);
        }

        return $query->paginate(30);
    }

    public function createTicket(User $user, array $data): SupportTicket
    {
        $ticket = DB::transaction(function () use ($user, $data) {
            $ticket = SupportTicket::create([
                'user_id' => $user->id,
                'category' => $data['category'],
                'subject' => trim($data['subject']),
                'status' => 'pending_admin',
                'last_message_at' => now(),
            ]);

            $ticket->messages()->create([
                'sender_id' => $user->id,
                'sender_role' => 'user',
                'body' => trim($data['message']),
            ]);

            return $ticket;
        });

        $this->notifyAdmins($ticket, 'New support ticket', "{$user->name} opened a support ticket.");

        return $ticket->fresh(['user:id,name,username', 'messages.sender:id,name,username']);
    }

    public function getTicket(User $user, int $ticketId): array
    {
        $ticket = SupportTicket::with(['user:id,name,username'])->findOrFail($ticketId);
        $this->authorizeTicket($user, $ticket);

        $messages = $ticket->messages()
            ->with('sender:id,name,username')
            ->orderBy('created_at')
            ->get()
            ->map(fn (SupportMessage $message) => $this->messagePayload($message));

        return [
            'ticket' => $this->ticketPayload($ticket, $user),
            'messages' => $messages,
        ];
    }

    public function addMessage(User $user, int $ticketId, string $body): SupportMessage
    {
        $ticket = SupportTicket::findOrFail($ticketId);
        $this->authorizeTicket($user, $ticket);

        if (in_array($ticket->status, ['resolved', 'closed'], true) && $user->role !== 'admin') {
            $ticket->update(['status' => 'pending_admin', 'resolved_at' => null]);
        }

        $role = $user->role === 'admin' ? 'admin' : 'user';
        $message = DB::transaction(function () use ($ticket, $user, $role, $body) {
            $message = $ticket->messages()->create([
                'sender_id' => $user->id,
                'sender_role' => $role,
                'body' => trim($body),
            ]);

            $ticket->update([
                'status' => $role === 'admin' ? 'pending_user' : 'pending_admin',
                'last_message_at' => $message->created_at,
                'resolved_at' => null,
            ]);

            return $message;
        });

        $message->load('sender:id,name,username');

        if ($role === 'admin') {
            $recipient = $ticket->user;
            if ($recipient) {
                $this->notificationService->notify(
                    $recipient,
                    'support_reply',
                    ['ticket_id' => $ticket->id],
                    'Support replied',
                    'The DateUsher support team replied to your ticket.'
                );
            }
        } else {
            $this->notifyAdmins($ticket, 'Support message', "{$user->name} replied to a support ticket.");
        }

        return $message;
    }

    public function markRead(User $user, int $ticketId): void
    {
        $ticket = SupportTicket::findOrFail($ticketId);
        $this->authorizeTicket($user, $ticket);

        $senderRole = $user->role === 'admin' ? 'user' : 'admin';
        $ticket->messages()
            ->where('sender_role', $senderRole)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    public function updateStatus(User $admin, int $ticketId, string $status): SupportTicket
    {
        if ($admin->role !== 'admin') {
            throw new HttpException(403, 'Admin access required.');
        }

        $ticket = SupportTicket::findOrFail($ticketId);
        $ticket->update([
            'status' => $status,
            'resolved_at' => in_array($status, ['resolved', 'closed'], true) ? now() : null,
        ]);

        return $ticket->fresh(['user:id,name,username']);
    }

    public function ticketPayload(SupportTicket $ticket, User $viewer): array
    {
        $unreadCount = $ticket->unread_count ?? $ticket->messages()
            ->where('sender_role', $viewer->role === 'admin' ? 'user' : 'admin')
            ->whereNull('read_at')
            ->count();

        return [
            'id' => $ticket->id,
            'user_id' => $ticket->user_id,
            'category' => $ticket->category,
            'subject' => $ticket->subject,
            'status' => $ticket->status,
            'last_message_at' => $ticket->last_message_at,
            'resolved_at' => $ticket->resolved_at,
            'unread_count' => $unreadCount,
            'created_at' => $ticket->created_at,
            'user' => $ticket->user ? [
                'id' => $ticket->user->id,
                'name' => $ticket->user->name,
                'username' => $ticket->user->username,
            ] : null,
        ];
    }

    public function messagePayload(SupportMessage $message): array
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

    private function authorizeTicket(User $user, SupportTicket $ticket): void
    {
        if ($user->role === 'admin' || (int) $ticket->user_id === (int) $user->id) {
            return;
        }

        throw new HttpException(403, 'You cannot access this support ticket.');
    }

    private function notifyAdmins(SupportTicket $ticket, string $title, string $body): void
    {
        User::where('role', 'admin')->get()->each(function (User $admin) use ($ticket, $title, $body) {
            $this->notificationService->notify(
                $admin,
                'support_ticket',
                ['ticket_id' => $ticket->id],
                $title,
                $body
            );
        });
    }
}
