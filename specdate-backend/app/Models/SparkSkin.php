<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SparkSkin extends Model
{
    /** @use HasFactory<\Database\Factories\SparkSkinFactory> */
    use HasFactory;

    protected $table = 'spark_skins';

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
