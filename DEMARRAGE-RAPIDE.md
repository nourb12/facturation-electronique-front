# 🚀 Démarrage Rapide - Projet Flutter

## ⚡ En 3 Étapes Simples

### Étape 1 : Créer le Projet (2 minutes)

Ouvrez PowerShell et exécutez :

```powershell
cd C:\frontendpfe\ey-invoice-portal
.\create-flutter-project.ps1
```

Le script va :
- ✅ Créer le projet Flutter
- ✅ Installer toutes les dépendances
- ✅ Créer la structure des dossiers
- ✅ Configurer les fichiers de base

---

### Étape 2 : Lancer le Backend (1 minute)

Ouvrez un nouveau terminal et exécutez :

```bash
cd C:\backendpfe\einvoicing
mvn spring-boot:run
```

Attendez de voir : `Started Application in X seconds`

---

### Étape 3 : Lancer l'Application Flutter (1 minute)

Ouvrez un nouveau terminal et exécutez :

```bash
cd C:\frontendpfe\ey_invoice_mobile
flutter run
```

Choisissez votre plateforme :
- **1** pour Chrome (Web)
- **2** pour Windows
- **3** pour Android (si émulateur actif)

---

## ✅ C'est Tout !

Votre application Flutter est maintenant connectée à votre backend et base de données PostgreSQL !

---

## 📚 Pour Aller Plus Loin

### Vous voulez comprendre ce qui a été créé ?
👉 Lisez **[RESUME-FLUTTER.md](RESUME-FLUTTER.md)**

### Vous voulez développer des fonctionnalités ?
👉 Suivez **[GUIDE-FLUTTER-SETUP.md](GUIDE-FLUTTER-SETUP.md)**

### Vous avez un problème ?
👉 Consultez **[FLUTTER-CHECKLIST.md](FLUTTER-CHECKLIST.md)** section "Résolution de Problèmes"

### Vous voulez naviguer dans la documentation ?
👉 Ouvrez **[INDEX-FLUTTER.md](INDEX-FLUTTER.md)**

---

## 🐛 Problèmes Courants

### Le script ne s'exécute pas ?

```powershell
# Autoriser l'exécution de scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Le backend ne démarre pas ?

Vérifiez que PostgreSQL est actif :
```bash
# Vérifier le service PostgreSQL
Get-Service postgresql*
```

### Flutter ne trouve pas les dépendances ?

```bash
flutter clean
flutter pub get
```

---

## 📞 Besoin d'Aide ?

Consultez la documentation complète :
- **[README-FLUTTER.md](README-FLUTTER.md)** - Vue d'ensemble
- **[INDEX-FLUTTER.md](INDEX-FLUTTER.md)** - Navigation
- **[FLUTTER-QUICK-START.md](FLUTTER-QUICK-START.md)** - Guide rapide

---

**Temps total : 4 minutes** ⏱️

**Bon développement ! 🎉**
