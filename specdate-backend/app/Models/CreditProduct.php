<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Credit product: maps RevenueCat product_id to quantity (credits).
 * When RevenueCat (or app) sends product_id, we look up this table and apply the quantity.
 */
class CreditProduct extends Model
{
    protected $table = 'credit_products';

    protected $fillable = ['product_id', 'quantity', 'name', 'sort_order'];

    protected $casts = [
        'quantity' => 'integer',
        'sort_order' => 'integer',
    ];
}
