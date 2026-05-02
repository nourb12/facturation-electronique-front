# ✅ Checklist Complète - Projet Flutter EY Invoice

## 📋 Avant de Commencer

### Prérequis Système

- [ ] **Flutter installé** (version 3.0+)
  ```bash
  flutter --version
  ```

- [ ] **VS Code installé** avec extensions :
  - [ ] Flutter
  - [ ] Dart
  - [ ] Flutter Widget Snippets (optionnel)

- [ ] **Git installé**
  ```bash
  git --version
  ```

- [ ] **PostgreSQL installé et actif**
  ```bash
  psql --version
  ```

- [ ] **Java JDK installé** (pour Spring Boot)
  ```bash
  java -version
  ```

---

## 🚀 Étape 1 : Créer le Projet Flutter

### Option A : Automatique (Recommandé)

```powershell
# Exécuter le script PowerShell
cd C:\frontendpfe\ey-invoice-portal
.\create-flutter-project.ps1
```

### Option B : Manuel

```bash
# 1. Créer le projet
cd C:\frontendpfe
flutter create ey_invoice_mobile
cd ey_invoice_mobile

# 2. Ouvrir dans VS Code
code .

# 3. Installer les dépendances
flutter pub get
```

**Checklist :**
- [ ] Projet créé dans `C:\frontendpfe\ey_invoice_mobile`
- [ ] Projet ouvert dans VS Code
- [ ] Dépendances installées sans erreur

---

## 🗂️ Étape 2 : Structure du Projet

Créer les dossiers suivants dans `lib/` :

- [ ] `lib/config/` - Configuration API
- [ ] `lib/models/` - Modèles de données
- [ ] `lib/services/` - Services API
- [ ] `lib/screens/` - Écrans de l'app
- [ ] `lib/widgets/` - Composants réutilisables
- [ ] `lib/utils/` - Utilitaires

Créer les dossiers assets :

- [ ] `assets/images/`
- [ ] `assets/icons/`

---

## 📦 Étape 3 : Dépendances

Vérifier que `pubspec.yaml` contient :

### Essentielles
- [ ] `dio: ^5.4.0` - Client HTTP
- [ ] `flutter_secure_storage: ^9.0.0` - Stockage sécurisé
- [ ] `provider: ^6.1.1` - Gestion d'état

### Optionnelles
- [ ] `shared_preferences: ^2.2.2` - Préférences
- [ ] `intl: ^0.19.0` - Formatage dates
- [ ] `cached_network_image: ^3.3.1` - Images
- [ ] `flutter_spinkit: ^5.2.0` - Loaders

**Commande :**
```bash
flutter pub get
```

---

## 🔧 Étape 4 : Configuration Backend

### 4.1 PostgreSQL

- [ ] PostgreSQL installé et actif
- [ ] Base de données créée :
  ```sql
  CREATE DATABASE ey_invoice_db;
  ```
- [ ] Tables créées (ou laisser Hibernate le faire)
- [ ] Données de test insérées

### 4.2 Spring Boot

- [ ] Projet backend existe dans `C:\backendpfe\einvoicing`
- [ ] Configuration PostgreSQL dans `application.properties` :
  ```properties
  spring.datasource.url=jdbc:postgresql://localhost:5432/ey_invoice_db
  spring.datasource.username=postgres
  spring.datasource.password=votre_password
  ```
- [ ] Configuration CORS ajoutée (voir `BACKEND-FLUTTER-CONFIG.md`)
- [ ] Dépendances Maven installées
- [ ] Backend compilé sans erreur

### 4.3 Lancer le Backend

```bash
cd C:\backendpfe\einvoicing
mvn spring-boot:run
```

**Vérifications :**
- [ ] Backend lancé sur `http://localhost:8080`
- [ ] API accessible : `http://localhost:8080/api/invoices`
- [ ] Pas d'erreurs dans les logs

---

## 📱 Étape 5 : Configuration Flutter

### 5.1 Fichier api_config.dart

Créer `lib/config/api_config.dart` :

```dart
class ApiConfig {
  static const String baseUrl = 'http://localhost:8080/api';
  static const String invoicesEndpoint = '/invoices';
}
```

- [ ] Fichier créé
- [ ] URL backend correcte

### 5.2 Fichier api_service.dart

Créer `lib/services/api_service.dart` avec Dio

- [ ] Fichier créé
- [ ] Méthodes GET, POST, PUT, DELETE implémentées

### 5.3 Modèles

Créer `lib/models/invoice.dart` :

- [ ] Classe Invoice créée
- [ ] Méthodes `fromJson()` et `toJson()` implémentées

---

## 🧪 Étape 6 : Tests

### 6.1 Tester le Backend

```bash
# Avec cURL
curl http://localhost:8080/api/invoices

# Avec PowerShell
Invoke-RestMethod -Uri "http://localhost:8080/api/invoices" -Method Get
```

- [ ] API répond avec succès (200)
- [ ] Données JSON retournées

### 6.2 Tester Flutter

```bash
cd C:\frontendpfe\ey_invoice_mobile
flutter run
```

**Choisir la plateforme :**
- [ ] Chrome (Web) : `flutter run -d chrome`
- [ ] Windows : `flutter run -d windows`
- [ ] Android : `flutter run -d android`

**Vérifications :**
- [ ] Application se lance sans erreur
- [ ] Connexion API réussie
- [ ] Données affichées

---

## 🎨 Étape 7 : Développement

### Écrans à créer

- [ ] `login_screen.dart` - Connexion
- [ ] `home_screen.dart` - Accueil
- [ ] `invoices_screen.dart` - Liste factures
- [ ] `invoice_detail_screen.dart` - Détail facture
- [ ] `create_invoice_screen.dart` - Créer facture

### Services à créer

- [ ] `auth_service.dart` - Authentification
- [ ] `invoice_service.dart` - Gestion factures
- [ ] `user_service.dart` - Gestion utilisateurs

### Widgets à créer

- [ ] `invoice_card.dart` - Carte facture
- [ ] `custom_button.dart` - Bouton personnalisé
- [ ] `loading_indicator.dart` - Indicateur de chargement

---

## 🐛 Étape 8 : Résolution de Problèmes

### Problème : Erreur de connexion API

**Solutions :**
- [ ] Vérifier que le backend est lancé
- [ ] Vérifier l'URL dans `api_config.dart`
- [ ] Vérifier CORS dans le backend
- [ ] Tester l'API avec Postman/cURL

### Problème : Erreur de dépendances

```bash
flutter clean
flutter pub get
```

- [ ] Cache nettoyé
- [ ] Dépendances réinstallées

### Problème : Erreur de build

```bash
flutter doctor
```

- [ ] Tous les checks sont verts
- [ ] SDK Flutter à jour

### Problème : PostgreSQL ne se connecte pas

- [ ] Service PostgreSQL actif
- [ ] Port 5432 disponible
- [ ] Credentials corrects dans `application.properties`

---

## 📚 Étape 9 : Documentation

### Fichiers de référence créés

- [ ] `GUIDE-FLUTTER-SETUP.md` - Guide complet
- [ ] `FLUTTER-QUICK-START.md` - Guide rapide
- [ ] `BACKEND-FLUTTER-CONFIG.md` - Configuration backend
- [ ] `FLUTTER-CHECKLIST.md` - Cette checklist

### Lire la documentation

- [ ] Guide complet lu
- [ ] Configuration backend comprise
- [ ] Exemples de code testés

---

## 🚢 Étape 10 : Déploiement (Optionnel)

### Build pour production

```bash
# Android
flutter build apk
flutter build appbundle

# iOS (Mac uniquement)
flutter build ios

# Web
flutter build web

# Windows
flutter build windows
```

- [ ] Build réussi
- [ ] Application testée en mode release

---

## 📊 Résumé Final

### Temps estimé total : 2-3 heures

| Étape | Temps | Statut |
|-------|-------|--------|
| Installation prérequis | 30 min | ⬜ |
| Création projet Flutter | 15 min | ⬜ |
| Configuration backend | 30 min | ⬜ |
| Configuration Flutter | 30 min | ⬜ |
| Tests | 20 min | ⬜ |
| Développement écrans | 1-2h | ⬜ |

---

## 🎯 Objectifs Atteints

- [ ] ✅ Projet Flutter créé et configuré
- [ ] ✅ Backend Spring Boot connecté
- [ ] ✅ PostgreSQL configuré
- [ ] ✅ API testée et fonctionnelle
- [ ] ✅ Application Flutter lancée
- [ ] ✅ Données affichées dans l'app
- [ ] ✅ CRUD factures fonctionnel

---

## 📞 Ressources

### Documentation
- **Flutter** : https://flutter.dev/docs
- **Dart** : https://dart.dev/guides
- **Dio** : https://pub.dev/packages/dio
- **Spring Boot** : https://spring.io/guides

### Commandes Utiles

```bash
# Flutter
flutter doctor          # Vérifier l'installation
flutter pub get         # Installer dépendances
flutter clean           # Nettoyer le projet
flutter run             # Lancer l'app
flutter build           # Builder pour production

# Backend
mvn spring-boot:run     # Lancer Spring Boot
mvn clean package       # Builder le JAR

# PostgreSQL
psql -U postgres        # Se connecter
\l                      # Lister les bases
\c ey_invoice_db        # Se connecter à la base
\dt                     # Lister les tables
```

---

## ✨ Prochaines Étapes

Après avoir complété cette checklist :

1. **Ajouter l'authentification JWT**
2. **Implémenter la gestion des utilisateurs**
3. **Ajouter la génération de PDF**
4. **Implémenter les notifications push**
5. **Ajouter le mode hors ligne**
6. **Optimiser les performances**
7. **Ajouter des tests unitaires**
8. **Préparer le déploiement**

---

**Créé le** : 1 Mai 2026  
**Version** : 1.0.0  
**Auteur** : Assistant Kiro

**Bon développement ! 🚀**
