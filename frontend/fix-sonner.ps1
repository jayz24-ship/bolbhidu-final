$files = @(
    "src/components/CreatePostModal.tsx",
    "src/pages/Admin.tsx",
    "src/pages/Feed.tsx",
    "src/pages/Login.tsx",
    "src/pages/PostDetails.tsx",
    "src/pages/Profile.tsx",
    "src/pages/Register.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $content = $content -replace "sonner@2\.0\.3", "sonner"
        Set-Content $file -Value $content -NoNewline
        Write-Host "Fixed: $file"
    }
}

Write-Host "All sonner imports fixed!"
