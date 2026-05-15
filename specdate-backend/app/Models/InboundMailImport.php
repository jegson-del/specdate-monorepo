<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InboundMailImport extends Model
{
    protected $fillable = [
        'provider',
        'mailbox',
        'uid',
        'message_id',
        'support_ticket_id',
        'status',
        'failure_reason',
        'raw_received_at',
        'imported_at',
    ];

    protected $casts = [
        'raw_received_at' => 'datetime',
        'imported_at' => 'datetime',
    ];

    public function ticket()
    {
        return $this->belongsTo(SupportTicket::class, 'support_ticket_id');
    }
}
