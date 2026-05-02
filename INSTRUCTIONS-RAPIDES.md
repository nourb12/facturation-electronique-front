# ⚡ INSTRUCTIONS RAPIDES - APPLIQUER LE DARK MODE

## 🎯 PROBLÈME

Le dark mode EY est correctement codé mais ne s'affiche pas car le cache Angular contient l'ancienne version des styles.

## ✅ SOLUTION EN 4 ÉTAPES

### 1️⃣ ARRÊTER LE SERVEUR
Dans le terminal où tourne `ng serve`, appuyer sur :
```
Ctrl + C
```

### 2️⃣ SUPPRIMER LE CACHE

**PowerShell** :
```powershell
Remove-Item -Recurse -Force .angular/cache
```

**Git Bash** :
```bash
rm -rf .angular/cache
```

### 3️⃣ REDÉMARRER LE SERVEUR
```bash
ng serve
```

### 4️⃣ VIDER LE CACHE DU NAVIGATEUR
1. Ouvrir l'application dans le navigateur
2. Appuyer sur **F12** (DevTools)
3. **Clic droit** sur le bouton "Actualiser"
4. Choisir **"Vider le cache et actualiser"**

---

## 🚀 MÉTHODE AUTOMATIQUE

### PowerShell :
```powershell
.\restart-with-cache-clear.ps1
```

### Git Bash :
```bash
./restart-with-cache-clear.sh
```

---

## ✅ VÉRIFICATION

Après ces étapes, vous devriez voir :

- ✅ **Fond** : Gris-bleu foncé (#2E2E38)
- ✅ **Cartes** : Gris-bleu moyen (#3A3A45)
- ✅ **Texte** : Blanc pur (#FFFFFF)
- ✅ **Badge "TEIF 2026"** : Jaune vif
- ✅ **Texte surligné** : Blanc sur fond jaune

---

## 📚 DOCUMENTATION COMPLÈTE

- **`REDEMARRAGE-DARK-MODE.md`** : Guide complet avec checklist
- **`DIAGNOSTIC-DARK-MODE.md`** : Analyse technique détaillée
- **`README-SCRIPTS-REDEMARRAGE.md`** : Documentation des scripts

---

## ❓ BESOIN D'AIDE ?

Si le dark mode ne s'applique toujours pas après ces étapes, consulter `REDEMARRAGE-DARK-MODE.md` section "SI LE PROBLÈME PERSISTE".

---

**Date** : Avril 2026  
**Version** : 3.2.1  
**Temps estimé** : 2-3 minutes
