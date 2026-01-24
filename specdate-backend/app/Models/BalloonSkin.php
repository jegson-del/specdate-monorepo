<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BalloonSkin extends Model
{
    /** @use HasFactory<\Database\Factories\BalloonSkinFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'color_hex',
        'label',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
