<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpecRequirement extends Model
{
    protected $fillable = [
        'spec_id',
        'field',
        'operator',
        'value',
        'is_compulsory',
    ];

    protected $casts = [
        'is_compulsory' => 'boolean',
    ];

    public function spec()
    {
        return $this->belongsTo(Spec::class);
    }
}
