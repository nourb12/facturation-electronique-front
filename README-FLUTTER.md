# 📱 EY Invoice Mobile - Documentation Complète

> Application mobile Flutter pour la gestion des factures EY avec backend Spring Boot et PostgreSQL

---

## 🚀 Démarrage Rapide (2 minutes)

```powershell
# 1. Exécuter le script automatique
cd C:\frontendpfe\ey-invoice-portal
.\create-flutter-project.ps1

# 2. Ouvrir le projet
cd C:\frontendpfe\ey_invoice_mobile
code .

# 3. Lancer l'application
flutter run
```

---

## 📚 Documentation

### 🎯 Commencez Ici

| Fichier | Description | Pour Qui ? |
|---------|-------------|------------|
| **[INDEX-FLUTTER.md](INDEX-FLUTTER.md)** | 📖 Index de navigation | Tous |
| **[RESUME-FLUTTER.md](RESUME-FLUTTER.md)** | 📝 Résumé simple | Débutants |
| **[FLUTTER-QUICK-START.md](FLUTTER-QUICK-START.md)** | ⚡ Guide rapide 5 min | Pressés |

### 📖 Guides Détaillés

| Fichier | Description | Temps |
|---------|-------------|-------|
| **[GUIDE-FLUTTER-SETUP.md](GUIDE-FLUTTER-SETUP.md)** | Guide complet avec exemples | 30 min |
| **[BACKEND-FLUTTER-CONFIG.md](BACKEND-FLUTTER-CONFIG.md)** | Configuration backend | 20 min |
| **[FLUTTER-CHECKLIST.md](FLUTTER-CHECKLIST.md)** | Checklist complète | 20 min |

### 🛠️ Scripts Automatiques

| Fichier | Description | Plateforme |
|---------|-------------|------------|
| **[create-flutter-project.ps1](create-flutter-project.ps1)** | Script PowerShell | Windows |
| **[create-flutter-project.sh](create-flutter-project.sh)** | Script Bash | Linux/Mac |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Flutter Application                   │
│                  (Mobile, Web, Desktop)                  │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Screens  │  │ Widgets  │  │ Services │             │
│  └────┬─────┘  └──────────┘  └────┬─────┘             │
│       │                            │                    │
│       └────────────┬───────────────┘                    │
│                    │                                    │
└────────────────────┼────────────────────────────────────┘
                     │ HTTP/REST (JSON)
                     ↓
┌─────────────────────────────────────────────────────────┐
│                  Spring Boot Backend                     │
│                     (Java + Maven)                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │Controller│  │ Service  │  │Repository│             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │             │              │                    │
│       └─────────────┴──────────────┘                    │
│                     │                                    │
└─────────────────────┼────────────────────────────────────┘
                      │ JDBC
                      ↓
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                   │
│                   (Tables: invoices, users, etc.)        │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technologies

### Frontend
- **Flutter** 3.35.3
- **Dart** 3.9.2
- **Dio** - Client HTTP
- **Provider** - Gestion d'état
- **Flutter Secure Storage** - Stockage sécurisé

### Backend
- **Spring Boot** - Framework Java
- **PostgreSQL** - Base de données
- **Maven** - Gestion des dépendances
- **JWT** - Authentification (optionnel)

---

## 📦 Installation

### Prérequis

- [ ] Flutter SDK (3.0+)
- [ ] VS Code + Extensions Flutter/Dart
- [ ] Java JDK (11+)
- [ ] PostgreSQL (12+)
- [ ] Git

### Vérification

```bash
flutter --version
java -version
psql --version
git --version
```

---

## 🎯 Fonctionnalités

### ✅ Implémentées
- Configuration du projet
- Structure des dossiers
- Configuration API
- Services de base
- Modèles de données

### 🚧 À Développer
- [ ] Authentification JWT
- [ ] Gestion des factures (CRUD)
- [ ] Gestion des utilisateurs
- [ ] Génération de PDF
- [ ] Notifications push
- [ ] Mode hors ligne
- [ ] Synchronisation

---

## 📱 Plateformes Supportées

| Plateforme | Statut | Commande |
|------------|--------|----------|
| Android | ✅ | `flutter run -d android` |
| iOS | ✅ | `flutter run -d ios` |
| Web | ✅ | `flutter run -d chrome` |
| Windows | ✅ | `flutter run -d windows` |
| macOS | ✅ | `flutter run -d macos` |
| Linux | ✅ | `flutter run -d linux` |

---

## 🚀 Utilisation

### 1. Créer le Projet

**Option A : Automatique (Recommandé)**
```powershell
.\create-flutter-project.ps1
```

**Option B : Manuel**
```bash
flutter create ey_invoice_mobile
cd ey_invoice_mobile
flutter pub get
```

### 2. Configurer le Backend

```bash
cd C:\backendpfe\einvoicing
mvn spring-boot:run
```

### 3. Lancer l'Application

```bash
cd C:\frontendpfe\ey_invoice_mobile
flutter run
```

---

## 📂 Structure du Projet

```
ey_invoice_mobile/
├── lib/
│   ├── main.dart                    # Point d'entrée
│   ├── config/
│   │   └── api_config.dart          # Configuration API
│   ├── models/
│   │   ├── invoice.dart             # Modèle Facture
│   │   ├── user.dart                # Modèle Utilisateur
│   │   └── demo_request.dart        # Modèle Demande Demo
│   ├── services/
│   │   ├── api_service.dart         # Service API principal
│   │   ├── auth_service.dart        # Service Authentification
│   │   └── invoice_service.dart     # Service Factures
│   ├── screens/
│   │   ├── login_screen.dart        # Écran Login
│   │   ├── home_screen.dart         # Écran Accueil
│   │   ├── invoices_screen.dart     # Liste Factures
│   │   └── invoice_detail_screen.dart
│   ├── widgets/
│   │   ├── invoice_card.dart        # Widget Carte Facture
│   │   └── custom_button.dart       # Boutons personnalisés
│   └── utils/
│       ├── constants.dart           # Constantes
│       └── helpers.dart             # Fonctions utilitaires
├── assets/
│   ├── images/
│   └── icons/
├── pubspec.yaml                     # Dépendances
└── README.md
```

---

## 🔧 Configuration

### API Configuration

```dart
// lib/config/api_config.dart
class ApiConfig {
  static const String baseUrl = 'http://localhost:8080/api';
  static const String invoicesEndpoint = '/invoices';
}
```

### Backend Configuration

```properties
# application.properties
spring.datasource.url=jdbc:postgresql://localhost:5432/ey_invoice_db
spring.datasource.username=postgres
spring.datasource.password=votre_password
```

---

## 🧪 Tests

### Tester l'API Backend

```bash
# Avec cURL
curl http://localhost:8080/api/invoices

# Avec PowerShell
Invoke-RestMethod -Uri "http://localhost:8080/api/invoices" -Method Get
```

### Tester l'Application Flutter

```bash
flutter test
flutter run --release
```

---

## 🐛 Résolution de Problèmes

### Problème : Connection Refused

**Solution :**
1. Vérifier que le backend est lancé
2. Vérifier l'URL dans `api_config.dart`
3. Tester l'API avec Postman

### Problème : CORS Error

**Solution :**
Ajouter la configuration CORS dans le backend (voir `BACKEND-FLUTTER-CONFIG.md`)

### Problème : Package Not Found

**Solution :**
```bash
flutter clean
flutter pub get
```

---

## 📊 Commandes Utiles

### Flutter

```bash
# Vérifier l'installation
flutter doctor

# Créer un projet
flutter create nom_projet

# Installer les dépendances
flutter pub get

# Nettoyer le projet
flutter clean

# Lancer l'application
flutter run

# Lancer sur un appareil spécifique
flutter run -d chrome
flutter run -d windows
flutter run -d android

# Builder pour production
flutter build apk              # Android
flutter build web              # Web
flutter build windows          # Windows

# Voir les logs
flutter logs

# Analyser le code
flutter analyze

# Tester
flutter test
```

### Backend

```bash
# Lancer Spring Boot
mvn spring-boot:run

# Builder le projet
mvn clean package

# Lancer le JAR
java -jar target/einvoicing-0.0.1-SNAPSHOT.jar
```

### PostgreSQL

```bash
# Se connecter
psql -U postgres

# Lister les bases
\l

# Se connecter à une base
\c ey_invoice_db

# Lister les tables
\dt

# Quitter
\q
```

---

## 📈 Roadmap

### Phase 1 : Setup (Complété ✅)
- [x] Configuration du projet
- [x] Structure des dossiers
- [x] Configuration API
- [x] Documentation

### Phase 2 : Développement (En cours 🚧)
- [ ] Authentification
- [ ] CRUD Factures
- [ ] Interface utilisateur
- [ ] Gestion des erreurs

### Phase 3 : Fonctionnalités Avancées
- [ ] Génération PDF
- [ ] Notifications
- [ ] Mode hors ligne
- [ ] Synchronisation

### Phase 4 : Déploiement
- [ ] Tests complets
- [ ] Optimisation
- [ ] Build production
- [ ] Publication

---

## 🤝 Contribution

### Comment Contribuer

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

## 📞 Support

### Documentation
- **Index** : [INDEX-FLUTTER.md](INDEX-FLUTTER.md)
- **Guide Complet** : [GUIDE-FLUTTER-SETUP.md](GUIDE-FLUTTER-SETUP.md)
- **Guide Rapide** : [FLUTTER-QUICK-START.md](FLUTTER-QUICK-START.md)

### Ressources Externes
- **Flutter** : https://flutter.dev/docs
- **Dart** : https://dart.dev/guides
- **Spring Boot** : https://spring.io/guides
- **PostgreSQL** : https://www.postgresql.org/docs/

---

## 📄 Licence

Ce projet est sous licence MIT.

---

## 👥 Auteurs

- **Assistant Kiro** - Documentation et scripts
- **Équipe EY** - Développement

---

## 🎉 Remerciements

- Flutter Team pour le framework
- Spring Team pour Spring Boot
- PostgreSQL Team pour la base de données

---

## 📅 Historique des Versions

### Version 1.0.0 (1 Mai 2026)
- ✅ Configuration initiale du projet
- ✅ Documentation complète
- ✅ Scripts d'installation automatiques
- ✅ Structure de base

---

## 🔗 Liens Utiles

- [Documentation Flutter](https://flutter.dev/docs)
- [Packages Dart](https://pub.dev)
- [Spring Boot Guides](https://spring.io/guides)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Créé le** : 1 Mai 2026  
**Dernière mise à jour** : 1 Mai 2026  
**Version** : 1.0.0  
**Auteur** : Assistant Kiro

---

<div align="center">

**Fait avec ❤️ pour EY Invoice Portal**

[Documentation](INDEX-FLUTTER.md) • [Guide Rapide](FLUTTER-QUICK-START.md) • [Support](FLUTTER-CHECKLIST.md)

</div>
