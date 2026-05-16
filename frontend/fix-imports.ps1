Get-ChildItem -Path "src" -Recurse -Include *.tsx,*.ts | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace '@[0-9]+\.[0-9]+\.[0-9]+"', '"'
    Set-Content $_.FullName -Value $content -NoNewline
    Write-Host "Fixed: $($_.FullName)"
}
Write-Host "All imports fixed!"
