<!DOCTYPE html>
<html>
<head>
    <title>New Provider Registration</title>
</head>
<body>
    <h1>New Provider Registration</h1>
    <p>A new provider has registered and is awaiting verification.</p>
    <ul>
        <li><strong>Name:</strong> {{ $user->name }}</li>
        <li><strong>Email:</strong> {{ $user->email }}</li>
        <li><strong>Company Name:</strong> {{ $user->providerProfile->company_name ?? 'N/A' }}</li>
    </ul>
    <p>Please review their details in the admin panel.</p>
</body>
</html>
