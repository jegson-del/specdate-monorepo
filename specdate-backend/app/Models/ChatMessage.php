<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatMessage extends Model
{
    protected $fillable = [
        'chat_thread_id',
        'sender_id',
        'body',
        'media_id',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public function thread()
    {
        return $this->belongsTo(ChatThread::class, 'chat_thread_id');
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function media()
    {
        return $this->belongsTo(Media::class);
    }
}
