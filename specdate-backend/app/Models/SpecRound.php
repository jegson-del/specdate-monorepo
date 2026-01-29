<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpecRound extends Model
{
    protected $fillable = [
        'spec_id',
        'round_number',
        'question_text',
        'status',
        'elimination_count',
    ];

    public function spec()
    {
        return $this->belongsTo(Spec::class);
    }

    public function answers()
    {
        return $this->hasMany(SpecRoundAnswer::class);
    }
}
