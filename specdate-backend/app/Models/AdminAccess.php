<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminAccess extends Model
{
    protected $fillable = [
        'admin_id',
        'can_view_financial_vouchers',
        'can_view_financial_credits',
        'can_manage_admin_users',
        'can_manage_contact_messages',
    ];

    protected $casts = [
        'can_view_financial_vouchers' => 'boolean',
        'can_view_financial_credits' => 'boolean',
        'can_manage_admin_users' => 'boolean',
        'can_manage_contact_messages' => 'boolean',
    ];

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
