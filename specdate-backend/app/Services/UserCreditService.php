<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserBalance;
use Symfony\Component\HttpKernel\Exception\HttpException;

class UserCreditService
{
    public function debitCredit(
        User $user,
        string $purpose,
        array $metadata = [],
        string $insufficientMessage = 'Insufficient credits. Please purchase more.',
        int $statusCode = 403,
    ): UserBalance {
        $balance = UserBalance::where('user_id', $user->id)->lockForUpdate()->first();

        if (!$balance || $balance->credits < 1) {
            throw new HttpException($statusCode, $insufficientMessage);
        }

        $balance->decrement('credits', 1);
        $balance->refresh();

        $user->transactions()->create([
            'type' => 'DEBIT',
            'item_type' => 'credit',
            'quantity' => 1,
            'amount' => null,
            'currency' => null,
            'purpose' => $purpose,
            'metadata' => $metadata,
        ]);

        return $balance;
    }
}
