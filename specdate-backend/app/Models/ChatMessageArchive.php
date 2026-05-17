<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatMessageArchive extends Model
{
    protected $fillable = [
        'chat_thread_id',
        'from_message_id',
        'to_message_id',
        'from_sent_at',
        'to_sent_at',
        'message_count',
        'disk',
        'path',
        'checksum',
        'status',
        'stored_at',
    ];

    protected $casts = [
        'from_sent_at' => 'datetime',
        'to_sent_at' => 'datetime',
        'stored_at' => 'datetime',
    ];

    public function thread()
    {
        return $this->belongsTo(ChatThread::class, 'chat_thread_id');
    }
}
