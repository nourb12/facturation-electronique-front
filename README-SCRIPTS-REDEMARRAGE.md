# 📜 SCRIPTS DE REDÉMARRAGE AVEC VIDAGE DU CACHE

## 🎯 OBJECTIF

Ces scripts automatisent le processus de vidage du cache Angular et redémarrage du serveur pour appliquer le **dark mode EY** sur toutes les pages de l'application.

---

## 📁 FICHIERS DISPONIBLES

### 1. `restart-with-cache-clear.ps1` (PowerShell)
- **Pour** : Windows PowerShell
- **Utilisation** : Utilisateurs Windows qui utilisent PowerShell

### 2. `restart-with-cache-clear.sh` (Bash)
- **Pour** : Git Bash, Linux, macOS
- **Utilisation** : Utilisateurs qui utilisent Git Bash sur Windows, ou Linux/macOS

### 3. `REDEMARRAGE-DARK-MODE.md`
- **Documentation complète** avec instructions manuelles
- **Checklist** de vérification
- **Dépannage** en cas de problème

---

## 🚀 UTILISATION

### Option 1 : PowerShell (Windows)

1. **Ouvrir PowerShell** dans le dossier du projet
2. **Exécuter le script** :
   ```powershell
   .\restart-with-cache-clear.ps1
   ```
3. **Suivre les instructions** à l'écran
4. **Vider le cache du navigateur** après le démarrage du serveur

### Option 2 : Git Bash (Windows/Linux/macOS)

1. **Ouvrir Git Bash** dans le dossier du projet
2. **Rendre le script exécutable** (première fois seulement) :
   ```bash
   chmod +x restart-with-cache-clear.sh
   ```
3. **Exécuter le script** :
   ```bash
   ./restart-with-cache-clear.sh
   ```
4. **Suivre les instructions** à l'écran
5. **Vider le cache du navigateur** après le démarrage du serveur

### Option 3 : Commandes manuelles (si les scripts ne marchent pas)

#### PowerShell :
```powershell
# 1. Arrêter le serveur (Ctrl+C dans le terminal où il tourne)

# 2. Supprimer le cache
Remove-Item -Recurse -Force .angular/cache

# 3. Redémarrer le serveur
ng serve
```

#### Git Bash :
```bash
# 1. Arrêter le serveur (Ctrl+C dans le terminal où il tourne)

# 2. Supprimer le cache
rm -rf .angular/cache

# 3. Redémarrer le serveur
ng serve
```

---

## ⚠️ IMPORTANT : VIDER LE CACHE DU NAVIGATEUR

Après avoir redémarré le serveur, **vous DEVEZ vider le cache du navigateur** :

1. Ouvrir l'application dans le navigateur
2. Ouvrir DevTools (F12)
3. Clic droit sur le bouton "Actualiser" (à côté de la barre d'adresse)
4. Choisir **"Vider le cache et actualiser"** (ou "Empty Cache and Hard Reload")

**Sans cette étape, le dark mode ne s'appliquera pas !**

---

## ✅ VÉRIFICATION

Après le redémarrage et le vidage du cache du navigateur, vérifiez que :

### Couleurs attendues :
- ✅ **Fond principal** : Gris-bleu foncé (#2E2E38)
- ✅ **Cartes/Surfaces** : Gris-bleu moyen (#3A3A45)
- ✅ **Navbar/Topbar** : Gris-bleu moyen (#3A3A45)
- ✅ **Texte principal** : Blanc pur (#FFFFFF)
- ✅ **Texte secondaire** : Gris clair (#D1D5DB)
- ✅ **Jaune EY** : Jaune vif (#FFE600)

### Pages concernées :
- ✅ Landing Page
- ✅ Dashboard
- ✅ Catégories
- ✅ Produits
- ✅ Clients
- ✅ Factures
- ✅ Toutes les autres pages

---

## 🔍 DÉPANNAGE

### Problème 1 : "ng : Le terme 'ng' n'est pas reconnu"

**Cause** : Angular CLI n'est pas installé ou pas dans le PATH

**Solution** :
```powershell
npm install -g @angular/cli
```

### Problème 2 : "Impossible d'exécuter le script .ps1"

**Cause** : Politique d'exécution PowerShell restrictive

**Solution** :
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\restart-with-cache-clear.ps1
```

### Problème 3 : Le dark mode ne s'applique toujours pas

**Cause** : Cache du navigateur pas vidé

**Solution** :
1. Fermer **TOUS** les onglets de l'application
2. Fermer le navigateur complètement
3. Rouvrir le navigateur
4. Ouvrir l'application
5. F12 → Clic droit sur Actualiser → Vider le cache et actualiser

### Problème 4 : Erreur "Cannot find module '@angular/cli'"

**Cause** : Dépendances pas installées

**Solution** :
```bash
npm install
```

---

## 📊 QUE FONT CES SCRIPTS ?

### Étape 1 : Vérification du serveur
- Détecte si un serveur Angular est en cours d'exécution
- L'arrête proprement si nécessaire

### Étape 2 : Suppression du cache
- Supprime le dossier `.angular/cache`
- Ce dossier contient les fichiers compilés en cache

### Étape 3 : Redémarrage du serveur
- Démarre `ng serve`
- Angular recompile tous les fichiers SCSS
- Les nouvelles variables CSS du dark mode sont appliquées

### Étape 4 : Instructions
- Affiche les instructions pour vider le cache du navigateur
- Explique comment vérifier que le dark mode est appliqué

---

## 📞 BESOIN D'AIDE ?

Si après avoir suivi ces étapes le dark mode ne s'applique toujours pas :

1. Lire le fichier `REDEMARRAGE-DARK-MODE.md` pour plus de détails
2. Vérifier dans DevTools (F12) que `data-theme="dark"` est présent sur `<html>`
3. Vérifier que les variables CSS sont définies (voir `REDEMARRAGE-DARK-MODE.md`)
4. Prendre des captures d'écran et me contacter

---

## 📝 NOTES TECHNIQUES

### Pourquoi le cache doit être vidé ?

Angular utilise un système de cache pour accélérer la compilation. Quand vous modifiez des fichiers SCSS, Angular ne recompile pas toujours tous les fichiers, seulement ceux qui ont changé. En vidant le cache, on force Angular à tout recompiler.

### Pourquoi le cache du navigateur doit être vidé ?

Le navigateur met en cache les fichiers CSS pour accélérer le chargement. Même si Angular recompile les fichiers SCSS, le navigateur peut continuer à utiliser l'ancienne version en cache. En vidant le cache du navigateur, on force le téléchargement des nouveaux fichiers CSS.

### Pourquoi deux scripts ?

- **PowerShell** : Natif sur Windows, mais syntaxe différente de Bash
- **Bash** : Utilisé par Git Bash sur Windows, et natif sur Linux/macOS

Les deux scripts font exactement la même chose, mais avec des commandes différentes.

---

**Date** : Avril 2026  
**Version** : 3.2.1  
**Auteur** : Kiro AI  
**Statut** : ✅ PRÊT À L'EMPLOI
