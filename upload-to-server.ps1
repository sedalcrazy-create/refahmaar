# PowerShell Script to Upload Project to Server
# Run this from Windows (PowerShell)

$SERVER = "root@37.152.174.87"
$PASSWORD = "UJIr3a9UyH#b"
$REMOTE_PATH = "/opt/yalda-snake"
$LOCAL_PATH = "E:\project\marrefah"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📤 Uploading Yalda Snake Project to Server" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if scp/ssh available (from Git Bash or WSL)
$scpCommand = Get-Command scp -ErrorAction SilentlyContinue

if (-not $scpCommand) {
    Write-Host "❌ Error: scp command not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "1. Install Git for Windows (includes Git Bash with SSH)"
    Write-Host "2. Use WinSCP (GUI tool)"
    Write-Host "3. Use WSL (Windows Subsystem for Linux)"
    Write-Host ""
    Write-Host "Manual upload instructions:" -ForegroundColor Yellow
    Write-Host "1. Install WinSCP from: https://winscp.net/"
    Write-Host "2. Connect to: 37.152.174.87"
    Write-Host "3. Username: root"
    Write-Host "4. Password: UJIr3a9UyH#b"
    Write-Host "5. Upload all files to: /opt/yalda-snake"
    Write-Host ""
    exit 1
}

Write-Host "✓ SCP command found" -ForegroundColor Green

# Create exclusion list
$excludeFile = "$env:TEMP\rsync-exclude.txt"
@"
node_modules/
sample-code/
.git/
*.tar.gz
*.log
"@ | Out-File -FilePath $excludeFile -Encoding ASCII

Write-Host ""
Write-Host "📦 Preparing files..." -ForegroundColor Yellow

# Create archive (excluding unnecessary files)
$archiveName = "yalda-snake-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz"
$archivePath = "$env:TEMP\$archiveName"

Write-Host "Creating archive: $archiveName" -ForegroundColor Yellow

# Use tar if available (Windows 10+)
if (Get-Command tar -ErrorAction SilentlyContinue) {
    Push-Location $LOCAL_PATH
    tar -czf $archivePath `
        --exclude='node_modules' `
        --exclude='sample-code' `
        --exclude='.git' `
        --exclude='*.tar.gz' `
        .
    Pop-Location
    Write-Host "✓ Archive created" -ForegroundColor Green
} else {
    Write-Host "⚠️  tar not found, will upload files directly" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📤 Uploading to server..." -ForegroundColor Yellow

# Using sshpass if available, otherwise manual
if (Test-Path $archivePath) {
    # Upload archive
    Write-Host "Uploading archive..." -ForegroundColor Yellow

    # Note: This requires Git Bash or WSL
    $bashScript = @"
#!/bin/bash
sshpass -p '$PASSWORD' scp '$archivePath' $SERVER:/tmp/
sshpass -p '$PASSWORD' ssh $SERVER "mkdir -p $REMOTE_PATH && cd $REMOTE_PATH && tar -xzf /tmp/$archiveName && rm /tmp/$archiveName"
"@

    $bashScript | bash

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Upload complete!" -ForegroundColor Green
    } else {
        Write-Host "❌ Upload failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Manual upload required" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ Files Uploaded Successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. SSH to server: ssh $SERVER"
Write-Host "2. Run deployment: cd $REMOTE_PATH && chmod +x auto-deploy.sh && ./auto-deploy.sh"
Write-Host ""
