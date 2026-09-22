# =============================================================================
#  dev.ps1  —  Lance l'environnement de dev complet (backend + frontend).
#
#  Ouvre DEUX fenetres PowerShell :
#    - API Laravel  -> http://localhost:8001   (php artisan serve)
#    - SPA React    -> http://localhost:5174   (npm run dev, hot-reload Vite)
#
#  Usage :  depuis la racine du projet, clic droit > "Executer avec PowerShell"
#           ou en terminal :  .\dev.ps1
#  (equivalent double-clic : dev.bat)
# =============================================================================

$ErrorActionPreference = 'Stop'
$root     = $PSScriptRoot
$backend  = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'

# --- Localise un PHP >= 8.3 (requis par Laravel 13) --------------------------
# Le "php" du PATH Windows est souvent une vieille version WAMP (ici 8.1) qui
# ne peut PAS lancer Laravel 13. On selectionne donc automatiquement le PHP
# >= 8.3 le plus recent installe dans WAMP.
#
# Besoin d'un chemin precis ? Decommente et adapte la ligne suivante :
# $php = 'D:\wamp64\bin\php\php8.4.24\php.exe'

if (-not $php) {
    $found = Get-ChildItem 'D:\wamp64\bin\php' -Directory -ErrorAction SilentlyContinue |
        ForEach-Object {
            if ($_.Name -match '^php(\d+)\.(\d+)\.(\d+)') {
                [pscustomobject]@{
                    Version = [version]("{0}.{1}.{2}" -f $Matches[1], $Matches[2], $Matches[3])
                    Exe     = Join-Path $_.FullName 'php.exe'
                }
            }
        } |
        Where-Object { $_.Version -ge [version]'8.3.0' -and (Test-Path $_.Exe) } |
        Sort-Object Version -Descending |
        Select-Object -First 1

    if ($found) { $php = $found.Exe }
}

# --- Verifications rapides ---------------------------------------------------
if (-not $php -or -not (Test-Path $php)) {
    Write-Host "[X] Aucun PHP >= 8.3 trouve dans D:\wamp64\bin\php." -ForegroundColor Red
    Write-Host "    Installe PHP 8.3+ via WAMP, ou fixe la variable \$php en haut de dev.ps1." -ForegroundColor Yellow
    exit 1
}
if (-not (Test-Path (Join-Path $backend 'vendor'))) {
    Write-Host "[!] backend\vendor absent. Lance d'abord :  cd backend ; composer install" -ForegroundColor Yellow
}
if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
    Write-Host "[!] frontend\node_modules absent. Lance d'abord :  cd frontend ; npm install" -ForegroundColor Yellow
}

# --- Commandes des deux fenetres --------------------------------------------
# `$Host (backtick) reste litteral : il s'evalue dans la fenetre enfant.
$backendCmd  = "`$Host.UI.RawUI.WindowTitle = 'API Laravel  ->  http://localhost:8001'; " +
               "Set-Location '$backend'; " +
               "& '$php' artisan serve --port=8001"

$frontendCmd = "`$Host.UI.RawUI.WindowTitle = 'SPA React (Vite)  ->  http://localhost:5174'; " +
               "Set-Location '$frontend'; " +
               "npm run dev"

Start-Process powershell -ArgumentList '-NoExit', '-NoProfile', '-Command', $backendCmd
Start-Process powershell -ArgumentList '-NoExit', '-NoProfile', '-Command', $frontendCmd

# --- Recap -------------------------------------------------------------------
Write-Host ""
Write-Host "  Deux serveurs de dev lances (une fenetre chacun) :" -ForegroundColor Green
Write-Host "    - API  Laravel   http://localhost:8001    (test : /api/health)"
Write-Host "    - SPA  React      http://localhost:5174"
Write-Host ""
Write-Host "  PHP utilise : $php" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Rappels :"
Write-Host "    - WAMP doit tourner (icone verte) pour que MySQL reponde."
Write-Host "    - Front : les modifs .tsx s'affichent toutes seules (hot-reload)."
Write-Host "    - Back  : rafraichis l'appel API apres modif. Un changement de .env"
Write-Host "              ou de config -> Ctrl+C puis relance la fenetre API."
Write-Host ""
Write-Host "  Pour arreter : ferme les deux fenetres (ou Ctrl+C dans chacune)."
