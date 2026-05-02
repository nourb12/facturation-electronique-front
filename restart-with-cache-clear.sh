#!/bin/bash

# ============================================================================
# SCRIPT DE REDÉMARRAGE AVEC VIDAGE DU CACHE
# ============================================================================
# Ce script automatise le processus de vidage du cache Angular et redémarrage
# du serveur de développement pour appliquer le dark mode EY.
# ============================================================================

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                              ║"
echo "║              🔄 REDÉMARRAGE AVEC VIDAGE DU CACHE ANGULAR                     ║"
echo "║                                                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# ÉTAPE 1 : VÉRIFIER SI LE SERVEUR TOURNE
# ============================================================================
echo "🔍 Vérification du serveur Angular..."

# Chercher les processus node qui exécutent ng serve
NG_PID=$(ps aux | grep "ng serve" | grep -v grep | awk '{print $2}')

if [ ! -z "$NG_PID" ]; then
    echo "⚠️  Serveur Angular détecté (PID: $NG_PID)"
    echo "   Arrêt du serveur..."
    
    kill -9 $NG_PID 2>/dev/null
    sleep 2
    
    if [ $? -eq 0 ]; then
        echo "✅ Serveur arrêté avec succès"
    else
        echo "❌ Erreur lors de l'arrêt du serveur"
        echo "   Veuillez arrêter manuellement le serveur (Ctrl+C) et relancer ce script."
        exit 1
    fi
else
    echo "✅ Aucun serveur Angular en cours d'exécution"
fi

echo ""

# ============================================================================
# ÉTAPE 2 : SUPPRIMER LE CACHE ANGULAR
# ============================================================================
echo "🗑️  Suppression du cache Angular..."

CACHE_PATH=".angular/cache"

if [ -d "$CACHE_PATH" ]; then
    rm -rf "$CACHE_PATH"
    
    if [ $? -eq 0 ]; then
        echo "✅ Cache Angular supprimé : $CACHE_PATH"
    else
        echo "❌ Erreur lors de la suppression du cache"
        echo "   Essayez de supprimer manuellement le dossier .angular/cache"
        exit 1
    fi
else
    echo "ℹ️  Aucun cache trouvé (déjà supprimé ou première exécution)"
fi

echo ""

# ============================================================================
# ÉTAPE 3 : AFFICHER LES INFORMATIONS
# ============================================================================
echo "📋 Informations importantes :"
echo "   • Le cache Angular a été vidé"
echo "   • Le serveur va redémarrer et recompiler tous les fichiers SCSS"
echo "   • Cela peut prendre 30-60 secondes"
echo ""
echo "⚠️  APRÈS LE DÉMARRAGE DU SERVEUR :"
echo "   1. Ouvrir l'application dans le navigateur"
echo "   2. Ouvrir DevTools (F12)"
echo "   3. Clic droit sur le bouton Actualiser"
echo "   4. Choisir 'Vider le cache et actualiser'"
echo ""

# ============================================================================
# ÉTAPE 4 : DEMANDER CONFIRMATION
# ============================================================================
echo "❓ Voulez-vous démarrer le serveur maintenant ? (O/N)"
read -r response

if [[ "$response" =~ ^[OoYy]$ ]]; then
    echo ""
    echo "🚀 Démarrage du serveur Angular..."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Démarrer le serveur Angular
    ng serve
else
    echo ""
    echo "✅ Cache vidé avec succès !"
    echo ""
    echo "Pour démarrer le serveur manuellement, exécutez :"
    echo "   ng serve"
    echo ""
fi

# ============================================================================
# FIN DU SCRIPT
# ============================================================================
