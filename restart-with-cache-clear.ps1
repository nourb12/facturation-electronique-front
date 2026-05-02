# ============================================================================
# SCRIPT DE REDÉMARRAGE AVEC VIDAGE DU CACHE
# ============================================================================
# Ce script automatise le processus de vidage du cache Angular et redémarrage
# du serveur de développement pour appliquer le dark mode EY.
# ============================================================================

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║                                                                              ║" -ForegroundColor Yellow
Write-Host "║              🔄 REDÉMARRAGE AVEC VIDAGE DU CACHE ANGULAR                     ║" -ForegroundColor Yellow
Write-Host "║                                                                              ║" -ForegroundColor Yellow
Write-Host "╚══════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

# ============================================================================
# ÉTAPE 1 : VÉRIFIER SI LE SERVEUR TOURNE
# ============================================================================
Write-Host "🔍 Vérification du serveur Angular..." -ForegroundColor Cyan

$ngProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*ng serve*" -or $_.CommandLine -like "*angular*"
}

if ($ngProcess) {
    Write-Host "⚠️  Serveur Angular détecté (PID: $($ngProcess.Id))" -ForegroundColor Yellow
    Write-Host "   Arrêt du serveur..." -ForegroundColor Yellow
    
    try {
        Stop-Process -Id $ngProcess.Id -Force
        Start-Sleep -Seconds 2
        Write-Host "✅ Serveur arrêté avec succès" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Erreur lors de l'arrêt du serveur : $_" -ForegroundColor Red
        Write-Host "   Veuillez arrêter manuellement le serveur (Ctrl+C) et relancer ce script." -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "✅ Aucun serveur Angular en cours d'exécution" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# ÉTAPE 2 : SUPPRIMER LE CACHE ANGULAR
# ============================================================================
Write-Host "🗑️  Suppression du cache Angular..." -ForegroundColor Cyan

$cachePath = ".angular/cache"

if (Test-Path $cachePath) {
    try {
        Remove-Item -Path $cachePath -Recurse -Force
        Write-Host "✅ Cache Angular supprimé : $cachePath" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Erreur lors de la suppression du cache : $_" -ForegroundColor Red
        Write-Host "   Essayez de supprimer manuellement le dossier .angular/cache" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "ℹ️  Aucun cache trouvé (déjà supprimé ou première exécution)" -ForegroundColor Gray
}

Write-Host ""

# ============================================================================
# ÉTAPE 3 : AFFICHER LES INFORMATIONS
# ============================================================================
Write-Host "📋 Informations importantes :" -ForegroundColor Cyan
Write-Host "   • Le cache Angular a été vidé" -ForegroundColor White
Write-Host "   • Le serveur va redémarrer et recompiler tous les fichiers SCSS" -ForegroundColor White
Write-Host "   • Cela peut prendre 30-60 secondes" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  APRÈS LE DÉMARRAGE DU SERVEUR :" -ForegroundColor Yellow
Write-Host "   1. Ouvrir l'application dans le navigateur" -ForegroundColor White
Write-Host "   2. Ouvrir DevTools (F12)" -ForegroundColor White
Write-Host "   3. Clic droit sur le bouton Actualiser" -ForegroundColor White
Write-Host "   4. Choisir 'Vider le cache et actualiser'" -ForegroundColor White
Write-Host ""

# ============================================================================
# ÉTAPE 4 : DEMANDER CONFIRMATION
# ============================================================================
Write-Host "❓ Voulez-vous démarrer le serveur maintenant ? (O/N)" -ForegroundColor Cyan
$response = Read-Host

if ($response -eq "O" -or $response -eq "o" -or $response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "🚀 Démarrage du serveur Angular..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
    
    # Démarrer le serveur Angular
    ng serve
}
else {
    Write-Host ""
    Write-Host "✅ Cache vidé avec succès !" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pour démarrer le serveur manuellement, exécutez :" -ForegroundColor Cyan
    Write-Host "   ng serve" -ForegroundColor White
    Write-Host ""
}

# ============================================================================
# FIN DU SCRIPT
# ============================================================================
