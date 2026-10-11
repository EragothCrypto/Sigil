param([string]$EvidenceDirectory)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$repoRoot = Split-Path -Parent $PSScriptRoot
$extensionRoot = Join-Path $repoRoot 'artifacts/sigil-extension'
$manifest = Get-Content -LiteralPath (Join-Path $extensionRoot 'manifest.json') -Raw | ConvertFrom-Json
$files = @('manifest.json', 'background.js', 'core.js', 'content.js', 'inject.js', 'popup.html', 'popup.js', 'icons/icon16.png', 'icons/icon32.png', 'icons/icon48.png', 'icons/icon128.png')
$releaseRoot = Join-Path $repoRoot 'artifacts/release'
if ($EvidenceDirectory) {
    $candidate = if ([System.IO.Path]::IsPathRooted($EvidenceDirectory)) { $EvidenceDirectory } else { Join-Path $repoRoot $EvidenceDirectory }
    $releaseRoot = [System.IO.Path]::GetFullPath($candidate)
    $temporaryRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot 'tmp')) + [System.IO.Path]::DirectorySeparatorChar
    if (-not $releaseRoot.StartsWith($temporaryRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw 'EvidenceDirectory must be a subdirectory of repository tmp; release/public artifacts are not evidence targets.'
    }
}
New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
$archivePath = Join-Path $releaseRoot "sigil-chrome-extension-v$($manifest.version).zip"
$stream = [System.IO.File]::Open($archivePath, [System.IO.FileMode]::Create)
$archive = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in $files) {
        $entry = $archive.CreateEntry($file, [System.IO.Compression.CompressionLevel]::Optimal)
        $entry.LastWriteTime = [DateTimeOffset]::new(2020, 1, 1, 0, 0, 0, [TimeSpan]::Zero)
        $entryStream = $entry.Open()
        try {
            $bytes = [System.IO.File]::ReadAllBytes((Join-Path $extensionRoot $file))
            $entryStream.Write($bytes, 0, $bytes.Length)
        } finally { $entryStream.Dispose() }
    }
} finally {
    $archive.Dispose()
    $stream.Dispose()
}
$hashAlgorithm = [System.Security.Cryptography.SHA256]::Create()
$hashStream = [System.IO.File]::OpenRead($archivePath)
try {
    $hash = [System.BitConverter]::ToString($hashAlgorithm.ComputeHash($hashStream)).Replace('-', '')
} finally {
    $hashStream.Dispose()
    $hashAlgorithm.Dispose()
}
[System.IO.File]::WriteAllText([System.IO.Path]::ChangeExtension($archivePath, 'sha256.txt'), "$hash  $([System.IO.Path]::GetFileName($archivePath))`n", [System.Text.Encoding]::ASCII)
if (-not $EvidenceDirectory) {
    Copy-Item -LiteralPath $archivePath -Destination (Join-Path $repoRoot 'artifacts/sigil/public/sigil-extension.zip')
}
Write-Output "$archivePath`nSHA256 $hash"
