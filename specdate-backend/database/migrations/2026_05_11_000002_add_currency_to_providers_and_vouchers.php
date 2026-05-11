<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('provider_profiles', 'currency')) {
                $table->string('currency', 3)->nullable()->after('country');
            }
        });

        Schema::table('date_vouchers', function (Blueprint $table) {
            if (!Schema::hasColumn('date_vouchers', 'currency')) {
                $table->string('currency', 3)->nullable()->after('minimum_spend');
            }
        });

        $countryCurrency = [
            'united kingdom' => 'GBP',
            'uk' => 'GBP',
            'great britain' => 'GBP',
            'england' => 'GBP',
            'scotland' => 'GBP',
            'wales' => 'GBP',
            'northern ireland' => 'GBP',
            'united states' => 'USD',
            'usa' => 'USD',
            'us' => 'USD',
            'canada' => 'CAD',
            'nigeria' => 'NGN',
            'ghana' => 'GHS',
            'kenya' => 'KES',
            'south africa' => 'ZAR',
            'france' => 'EUR',
            'germany' => 'EUR',
            'spain' => 'EUR',
            'italy' => 'EUR',
            'ireland' => 'EUR',
            'netherlands' => 'EUR',
            'belgium' => 'EUR',
            'portugal' => 'EUR',
            'australia' => 'AUD',
            'new zealand' => 'NZD',
            'india' => 'INR',
            'united arab emirates' => 'AED',
            'uae' => 'AED',
        ];

        DB::table('provider_profiles')
            ->select(['id', 'country'])
            ->whereNull('currency')
            ->orderBy('id')
            ->chunkById(200, function ($profiles) use ($countryCurrency) {
                foreach ($profiles as $profile) {
                    $country = strtolower(trim((string) $profile->country));
                    DB::table('provider_profiles')
                        ->where('id', $profile->id)
                        ->update(['currency' => $countryCurrency[$country] ?? 'USD']);
                }
            });

        DB::table('date_vouchers')
            ->select(['id', 'provider_profile_id'])
            ->whereNull('currency')
            ->orderBy('id')
            ->chunkById(200, function ($vouchers) {
                $providerCurrencies = DB::table('provider_profiles')
                    ->whereIn('id', $vouchers->pluck('provider_profile_id')->filter()->unique()->values())
                    ->pluck('currency', 'id');

                foreach ($vouchers as $voucher) {
                    DB::table('date_vouchers')
                        ->where('id', $voucher->id)
                        ->update(['currency' => $providerCurrencies[$voucher->provider_profile_id] ?? 'USD']);
                }
            });
    }

    public function down(): void
    {
        Schema::table('date_vouchers', function (Blueprint $table) {
            if (Schema::hasColumn('date_vouchers', 'currency')) {
                $table->dropColumn('currency');
            }
        });

        Schema::table('provider_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('provider_profiles', 'currency')) {
                $table->dropColumn('currency');
            }
        });
    }
};
