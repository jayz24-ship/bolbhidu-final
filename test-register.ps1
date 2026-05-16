$body = @{
    email = "test@example.com"
    password = "password123"
    name = "Test User"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8080/auth/register" -Method Post -Body $body -ContentType "application/json"

Write-Host "Registration successful!"
Write-Host "Token: $($response.token)"
Write-Host "User: $($response.user | ConvertTo-Json)"
