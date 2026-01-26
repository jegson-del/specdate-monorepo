<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpecLike extends Model
{
    protected $fillable = ['user_id', 'spec_id'];

    public function spec()
    {
        return $this->belongsTo(Spec::class);
    }
}
