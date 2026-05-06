<!DOCTYPE html>
<html>
<head>
    <title>{{ $timing === 'today' ? 'Your spec starts today' : 'Your spec starts tomorrow' }}</title>
</head>
<body>
    <h1>{{ $timing === 'today' ? 'Your spec starts today' : 'Your spec starts tomorrow' }}</h1>
    <p>Hi {{ $user->name ?? $user->username ?? 'there' }},</p>
    <p>
        <strong>{{ $spec->title }}</strong>
        {{ $timing === 'today' ? 'starts today.' : 'starts tomorrow.' }}
    </p>
    <p>Open DateUsher to review the spec and get ready for the quest.</p>
</body>
</html>
