# ⚡ QUICK START - DARK MODE EY

## 🎯 PROBLÈME
Le dark mode EY ne s'affiche pas → Cache à vider

## ✅ SOLUTION (2-3 MINUTES)

```bash
# 1. Arrêter le serveur
Ctrl + C

# 2. Supprimer le cache (PowerShell)
Remove-Item -Recurse -Force .angular/cache

# 2. Supprimer le cache (Git Bash)
rm -rf .angular/cache

# 3. Redémarrer le serveur
ng serve

# 4. Vider le cache du navigateur
F12 → Clic droit sur Actualiser → Vider le cache
```

## 🤖 SCRIPTS AUTOMATIQUES

```powershell
# PowerShell
.\restart-with-cache-clear.ps1
```

```bash
# Git Bash
./restart-with-cache-clear.sh
```

## 📚 DOCUMENTATION

- **`README-DARK-MODE.md`** - README principal
- **`INDEX-DARK-MODE.md`** - Index complet
- **`INSTRUCTIONS-RAPIDES.md`** - Guide rapide
- **`GUIDE-VISUEL.md`** - Guide visuel
- **`REDEMARRAGE-DARK-MODE.md`** - Guide complet
- **`DIAGNOSTIC-DARK-MODE.md`** - Analyse technique

## ✅ RÉSULTAT

- ✅ Fond : #2E2E38 (gris-bleu foncé)
- ✅ Cartes : #3A3A45 (gris-bleu moyen)
- ✅ Texte : #FFFFFF (blanc pur)
- ✅ Badge "TEIF 2026" : Jaune vif
- ✅ Texte surligné : Blanc sur jaune

## 🎉 C'EST TOUT !

Le dark mode sera appliqué sur **TOUTES LES PAGES**.

---

**Version** : 3.2.1 | **Temps** : 2-3 minutes | **Difficulté** : ⭐ Facile
