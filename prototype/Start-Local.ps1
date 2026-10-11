param([string]$VideoFolder = '', [string]$Model = '', [ValidateSet('transformers','script','ollama')][string]$Engine = 'transformers', [int]$Port = 4317)
$ErrorActionPreference = 'Stop'
$vpSettingsPath = Join-Path $PSScriptRoot 'local-settings.json'
if (-not $VideoFolder -and (Test-Path -LiteralPath $vpSettingsPath -PathType Leaf)) {
  $vpSettings = Get-Content -LiteralPath $vpSettingsPath -Raw | ConvertFrom-Json
  $VideoFolder = [string]$vpSettings.videoFolder
}
$vpNodeCommand = Get-Command node -ErrorAction SilentlyContinue
$vpNodePath = if ($vpNodeCommand) { $vpNodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' }
if (-not (Test-Path -LiteralPath $vpNodePath)) { throw 'Node.js 22 or later is required. Install Node.js, then run this launcher again.' }
if ($VideoFolder -and -not (Test-Path -LiteralPath $VideoFolder -PathType Container)) { throw 'The video folder could not be found.' }
$env:VIDEO_DIR = $VideoFolder
$env:AI_MODEL = $Model
$env:AI_ENGINE = $Engine
$env:HOST = '127.0.0.1'
$env:PORT = "$Port"
& $vpNodePath (Join-Path $PSScriptRoot 'server.mjs')
