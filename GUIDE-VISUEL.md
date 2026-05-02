# 🎨 GUIDE VISUEL - APPLIQUER LE DARK MODE EY

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    🌙 DARK MODE EY - GUIDE VISUEL                            ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## 📍 VOUS ÊTES ICI

```
┌─────────────────────────────────────────────────────────────────┐
│  ❌ ACTUELLEMENT                                                │
│                                                                 │
│  • Le dark mode ne s'affiche pas                                │
│  • Les couleurs sont incorrectes                                │
│  • Le code est pourtant correct                                 │
│                                                                 │
│  ❓ POURQUOI ?                                                  │
│  → Le cache contient l'ancienne version                         │
│                                                                 │
│  ✅ SOLUTION                                                    │
│  → Redémarrer avec vidage du cache (2-3 minutes)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 MÉTHODE RAPIDE (2-3 MINUTES)

```
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1 : ARRÊTER LE SERVEUR                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Dans le terminal où tourne `ng serve` :                        │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Ctrl + C                                                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ✅ Le serveur s'arrête                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 2 : SUPPRIMER LE CACHE                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  PowerShell :                                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Remove-Item -Recurse -Force .angular/cache              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Git Bash :                                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  rm -rf .angular/cache                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ✅ Le cache est supprimé                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 3 : REDÉMARRER LE SERVEUR                               │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  ng serve                                                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ⏳ Attendre 30-60 secondes (compilation)                       │
│  ✅ Le serveur redémarre avec les nouveaux styles               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 4 : VIDER LE CACHE DU NAVIGATEUR                        │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  1. Ouvrir l'application dans le navigateur                     │
│  2. Appuyer sur F12 (DevTools)                                  │
│  3. Clic droit sur le bouton "Actualiser"                       │
│  4. Choisir "Vider le cache et actualiser"                      │
│                                                                 │
│  ✅ Le navigateur télécharge les nouveaux styles                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🤖 MÉTHODE AUTOMATIQUE (1 MINUTE)

```
┌─────────────────────────────────────────────────────────────────┐
│  OPTION A : POWERSHELL (WINDOWS)                                │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  .\restart-with-cache-clear.ps1                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Le script fait automatiquement :                               │
│  • Arrête le serveur                                            │
│  • Supprime le cache                                            │
│  • Redémarre le serveur                                         │
│                                                                 │
│  Vous devez juste :                                             │
│  • Vider le cache du navigateur (Étape 4 ci-dessus)            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  OPTION B : GIT BASH (WINDOWS/LINUX/MACOS)                     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  ./restart-with-cache-clear.sh                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Le script fait automatiquement :                               │
│  • Arrête le serveur                                            │
│  • Supprime le cache                                            │
│  • Redémarre le serveur                                         │
│                                                                 │
│  Vous devez juste :                                             │
│  • Vider le cache du navigateur (Étape 4 ci-dessus)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ RÉSULTAT ATTENDU

```
┌─────────────────────────────────────────────────────────────────┐
│  AVANT (ACTUELLEMENT)                                           │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ❌ Fond : Couleur incorrecte                                   │
│  ❌ Cartes : Couleur incorrecte                                 │
│  ❌ Texte : Couleur incorrecte                                  │
│  ❌ Badge "TEIF 2026" : Peut-être modifié                       │
│  ❌ Texte surligné : Peut-être invisible                        │
└─────────────────────────────────────────────────────────────────┘

                            ⬇️  APRÈS  ⬇️

┌─────────────────────────────────────────────────────────────────┐
│  APRÈS (RÉSULTAT ATTENDU)                                       │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ✅ Fond : #2E2E38 (gris-bleu foncé)                            │
│  ✅ Cartes : #3A3A45 (gris-bleu moyen)                          │
│  ✅ Texte : #FFFFFF (blanc pur)                                 │
│  ✅ Badge "TEIF 2026" : Jaune vif                               │
│  ✅ Texte surligné : Blanc sur fond jaune                       │
│                                                                 │
│  🎉 DARK MODE EY APPLIQUÉ SUR TOUTES LES PAGES !                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 APERÇU DES COULEURS

```
┌─────────────────────────────────────────────────────────────────┐
│  PALETTE DARK MODE EY                                           │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  🌑 FOND PRINCIPAL                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  #2E2E38  │  Gris-bleu foncé                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🔲 CARTES / SURFACES                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  #3A3A45  │  Gris-bleu moyen (bien visible)            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📝 TEXTE PRINCIPAL                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  #FFFFFF  │  Blanc pur (haute lisibilité)              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📝 TEXTE SECONDAIRE                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  #D1D5DB  │  Gris clair                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⚡ JAUNE EY (ACCENT)                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  #FFE600  │  Jaune vif EY (inchangé)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 VÉRIFICATION VISUELLE

```
┌─────────────────────────────────────────────────────────────────┐
│  CHECKLIST VISUELLE                                             │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  LANDING PAGE                                                   │
│  ☐ Fond gris-bleu foncé                                         │
│  ☐ Navbar gris-bleu moyen                                       │
│  ☐ Badge "TEIF 2026" jaune vif                                  │
│  ☐ Texte surligné blanc sur jaune                               │
│  ☐ Titres blanc pur                                             │
│                                                                 │
│  DASHBOARD                                                      │
│  ☐ Fond gris-bleu foncé                                         │
│  ☐ Topbar gris-bleu moyen                                       │
│  ☐ Cartes KPI gris-bleu moyen                                   │
│  ☐ Texte blanc pur                                              │
│  ☐ Graphiques visibles                                          │
│                                                                 │
│  CATÉGORIES                                                     │
│  ☐ Fond gris-bleu foncé                                         │
│  ☐ Topbar gris-bleu moyen                                       │
│  ☐ Cartes catégories gris-bleu moyen                            │
│  ☐ Texte blanc pur                                              │
│  ☐ Icônes visibles                                              │
│                                                                 │
│  AUTRES PAGES                                                   │
│  ☐ Produits : Dark mode appliqué                                │
│  ☐ Clients : Dark mode appliqué                                 │
│  ☐ Factures : Dark mode appliqué                                │
│  ☐ Toutes les autres pages : Dark mode appliqué                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ OUTILS DEVTOOLS

```
┌─────────────────────────────────────────────────────────────────┐
│  VÉRIFICATION DANS DEVTOOLS (F12)                               │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  1. VÉRIFIER L'ATTRIBUT data-theme                              │
│     ┌─────────────────────────────────────────────────────┐    │
│     │  Elements → <html>                                  │    │
│     │  Chercher : data-theme="dark"                       │    │
│     │  ✅ Doit être présent                               │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│  2. VÉRIFIER LES VARIABLES CSS                                  │
│     ┌─────────────────────────────────────────────────────┐    │
│     │  Styles → :root[data-theme="dark"]                  │    │
│     │  Chercher : --bg-void: #2E2E38                      │    │
│     │  Chercher : --bg-card: #3A3A45                      │    │
│     │  Chercher : --tp: #FFFFFF                           │    │
│     │  ✅ Toutes doivent être définies                    │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│  3. VÉRIFIER LE BACKGROUND DU BODY                              │
│     ┌─────────────────────────────────────────────────────┐    │
│     │  Computed → <body>                                  │    │
│     │  Chercher : background-color                        │    │
│     │  Résultat : rgb(46, 46, 56) = #2E2E38              │    │
│     │  ✅ Doit correspondre                               │    │
│     └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## ❓ PROBLÈMES COURANTS

```
┌─────────────────────────────────────────────────────────────────┐
│  PROBLÈME 1 : Le dark mode ne s'applique toujours pas          │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ❓ Avez-vous vidé le cache du navigateur ?                     │
│  → F12 → Clic droit sur Actualiser → Vider le cache            │
│                                                                 │
│  ❓ Le serveur a-t-il bien redémarré ?                          │
│  → Vérifier qu'il n'y a pas d'erreur dans le terminal          │
│                                                                 │
│  ❓ data-theme="dark" est-il présent ?                          │
│  → F12 → Elements → <html> → Vérifier l'attribut               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PROBLÈME 2 : Erreur lors de l'exécution du script             │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ❓ PowerShell : "Impossible d'exécuter le script"              │
│  → Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass  │
│                                                                 │
│  ❓ Bash : "Permission denied"                                  │
│  → chmod +x restart-with-cache-clear.sh                         │
│                                                                 │
│  ❓ "ng : Le terme 'ng' n'est pas reconnu"                      │
│  → npm install -g @angular/cli                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PROBLÈME 3 : Besoin d'aide supplémentaire                     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  📚 Consulter la documentation complète :                       │
│  → INDEX-DARK-MODE.md (point d'entrée)                          │
│  → REDEMARRAGE-DARK-MODE.md (guide complet)                     │
│  → DIAGNOSTIC-DARK-MODE.md (analyse technique)                  │
│                                                                 │
│  📞 Me contacter avec :                                         │
│  → Captures d'écran de la page                                  │
│  → Captures d'écran de DevTools                                 │
│  → Erreurs du terminal                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎉 SUCCÈS !

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    ✨ FÉLICITATIONS ! ✨                        │
│                                                                 │
│  Si vous voyez :                                                │
│  • Fond gris-bleu foncé                                         │
│  • Cartes gris-bleu moyen                                       │
│  • Texte blanc pur                                              │
│  • Badge "TEIF 2026" jaune vif                                  │
│  • Texte surligné blanc sur jaune                               │
│                                                                 │
│  🎉 LE DARK MODE EY EST APPLIQUÉ !                              │
│                                                                 │
│  Profitez de votre application avec le design EY officiel !    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**Date** : Avril 2026  
**Version** : 3.2.1  
**Temps estimé** : 2-3 minutes  
**Difficulté** : ⭐ Facile
