$ErrorActionPreference = 'Stop'
$port = 8787
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$prefix = "http://localhost:$port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  Write-Host "Nao foi possivel iniciar na porta $port. Feche outra janela do IA Sem Paciencia e tente novamente." -ForegroundColor Red
  Read-Host "Pressione Enter para sair"
  exit 1
}

Start-Process $prefix
Write-Host "IA Sem Paciencia aberto no navegador." -ForegroundColor Green
Write-Host "Mantenha esta janela aberta enquanto estiver testando o site." -ForegroundColor Yellow
Write-Host "Para encerrar, feche esta janela ou pressione Ctrl+C."

$mime = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8';
  '.json'='application/json; charset=utf-8'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg';
  '.svg'='image/svg+xml'; '.ico'='image/x-icon'; '.webp'='image/webp'; '.txt'='text/plain; charset=utf-8'
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
    $rel = $rel -replace '/', [IO.Path]::DirectorySeparatorChar
    $full = [IO.Path]::GetFullPath((Join-Path $root $rel))

    if (-not $full.StartsWith([IO.Path]::GetFullPath($root))) {
      $ctx.Response.StatusCode = 403
      $ctx.Response.Close()
      continue
    }

    if (Test-Path $full -PathType Leaf) {
      $bytes = [IO.File]::ReadAllBytes($full)
      $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
      $ctx.Response.ContentType = $(if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' })
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.Headers['Cache-Control'] = 'no-store'
      $ctx.Response.OutputStream.Write($bytes,0,$bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
  } catch {
    try { $ctx.Response.StatusCode = 500; $ctx.Response.Close() } catch {}
  }
}
