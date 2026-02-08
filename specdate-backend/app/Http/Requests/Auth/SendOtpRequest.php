<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\ApiFormRequest;
use Illuminate\Validation\Rule;

class SendOtpRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'channel' => ['required', 'string', Rule::in(['email', 'mobile'])],
            'target' => ['required', 'string', 'max:255'],
        ];
    }
}
