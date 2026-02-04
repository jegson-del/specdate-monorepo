<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpecRoundAnswer extends Model
{
    protected $fillable = [
        'spec_round_id',
        'user_id',
        'answer_text',
        'is_eliminated',
        'media_id',
    ];

    protected $casts = [
        'is_eliminated' => 'boolean',
    ];

    public function round()
    {
        return $this->belongsTo(SpecRound::class, 'spec_round_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function media()
    {
        return $this->belongsTo(Media::class);
    }
}
