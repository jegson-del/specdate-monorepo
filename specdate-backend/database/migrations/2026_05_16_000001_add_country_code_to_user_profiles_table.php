<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('user_profiles', 'country_code')) {
                $table->string('country_code', 2)->nullable()->after('country')->index();
            }
        });

        $countryCodes = [
            'australia' => 'AU',
            'belgium' => 'BE',
            'canada' => 'CA',
            'denmark' => 'DK',
            'france' => 'FR',
            'germany' => 'DE',
            'ghana' => 'GH',
            'india' => 'IN',
            'ireland' => 'IE',
            'italy' => 'IT',
            'kenya' => 'KE',
            'netherlands' => 'NL',
            'new zealand' => 'NZ',
            'nigeria' => 'NG',
            'norway' => 'NO',
            'portugal' => 'PT',
            'south africa' => 'ZA',
            'spain' => 'ES',
            'sweden' => 'SE',
            'united kingdom' => 'GB',
            'uk' => 'GB',
            'great britain' => 'GB',
            'england' => 'GB',
            'united states' => 'US',
            'united states of america' => 'US',
            'usa' => 'US',
            'us' => 'US',
        ];

        DB::table('user_profiles')
            ->select(['id', 'country'])
            ->whereNull('country_code')
            ->orderBy('id')
            ->chunkById(200, function ($profiles) use ($countryCodes) {
                foreach ($profiles as $profile) {
                    $country = trim((string) $profile->country);
                    if ($country === '') {
                        continue;
                    }

                    $upper = strtoupper($country);
                    $code = preg_match('/^[A-Z]{2}$/', $upper)
                        ? $upper
                        : ($countryCodes[strtolower($country)] ?? null);

                    if ($code) {
                        DB::table('user_profiles')->where('id', $profile->id)->update(['country_code' => $code]);
                    }
                }
            });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('user_profiles', 'country_code')) {
                $table->dropIndex(['country_code']);
                $table->dropColumn('country_code');
            }
        });
    }
};
