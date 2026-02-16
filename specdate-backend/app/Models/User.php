<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'mobile',
        'password',
        'role', // Added
        'is_paused',
        'terms_accepted',
        'expo_push_token',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_paused' => 'boolean',
            'terms_accepted' => 'boolean',
        ];
    }

    public function profile()
    {
        return $this->hasOne(UserProfile::class);
    }

    public function providerProfile()
    {
        return $this->hasOne(ProviderProfile::class);
    }

    public function balance()
    {
        return $this->hasOne(UserBalance::class);
    }

    public function transactions()
    {
        return $this->hasMany(UserTransaction::class);
    }

    public function media()
    {
        return $this->hasMany(Media::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function sparkSkin()
    {
        return $this->hasOne(SparkSkin::class);
    }

    public function discounts()
    {
        return $this->hasMany(Discount::class, 'provider_id');
    }

    /**
     * Get the profile completion status.
     *
     * @return bool
     */
    public function getProfileCompleteAttribute(): bool
    {
        if ($this->role === 'provider') {
            return $this->providerProfile !== null;
        }
        return $this->profile && $this->profile->profile_completed_at !== null;
    }

    /**
     * Get the gallery images (max 6, latest first).
     *
     * @return array<string>
     */
    public function getImagesAttribute(): array
    {
        return $this->media
            ->where('type', 'profile_gallery')
            ->sortByDesc('id')
            ->take(6)
            ->values()
            ->map(fn ($media) => $media->url)
            ->all();
    }

    /**
     * Get the avatar URL.
     *
     * @return string|null
     */
    public function getAvatarAttribute(): ?string
    {
        return $this->media
            ->where('type', 'avatar')
            ->sortByDesc('id')
            ->first()
            ?->url;
    }

    protected $appends = ['profile_complete', 'images', 'avatar'];
}
