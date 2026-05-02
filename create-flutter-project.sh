#!/bin/bash

# Script de création automatique du projet Flutter EY Invoice Mobile
# Auteur: Assistant Kiro
# Date: 1 Mai 2026

echo "🚀 Création du projet Flutter EY Invoice Mobile..."
echo ""

# Étape 1: Créer le projet Flutter
echo "📱 Étape 1/5: Création du projet Flutter..."
cd c:/frontendpfe
flutter create ey_invoice_mobile
cd ey_invoice_mobile

# Étape 2: Créer la structure des dossiers
echo "📁 Étape 2/5: Création de la structure des dossiers..."
mkdir -p lib/config
mkdir -p lib/models
mkdir -p lib/services
mkdir -p lib/screens
mkdir -p lib/widgets
mkdir -p lib/utils
mkdir -p assets/images
mkdir -p assets/icons

# Étape 3: Créer le fichier pubspec.yaml
echo "📦 Étape 3/5: Configuration des dépendances..."
cat > pubspec.yaml << 'EOF'
name: ey_invoice_mobile
description: Application mobile EY Invoice Portal
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  
  # HTTP & API
  http: ^1.1.0
  dio: ^5.4.0
  
  # State Management
  provider: ^6.1.1
  get: ^4.6.6
  
  # Storage Local
  shared_preferences: ^2.2.2
  flutter_secure_storage: ^9.0.0
  
  # JSON & Serialization
  json_annotation: ^4.8.1
  
  # UI Components
  cupertino_icons: ^1.0.6
  flutter_spinkit: ^5.2.0
  cached_network_image: ^3.3.1
  
  # Date & Time
  intl: ^0.19.0
  
  # PDF
  pdf: ^3.10.7
  printing: ^5.12.0
  
  # Notifications
  flutter_local_notifications: ^16.3.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  build_runner: ^2.4.8
  json_serializable: ^6.7.1

flutter:
  uses-material-design: true
  
  assets:
    - assets/images/
    - assets/icons/
EOF

# Étape 4: Installer les dépendances
echo "⬇️  Étape 4/5: Installation des dépendances..."
flutter pub get

# Étape 5: Créer les fichiers de base
echo "📝 Étape 5/5: Création des fichiers de base..."

# api_config.dart
cat > lib/config/api_config.dart << 'EOF'
class ApiConfig {
  static const String baseUrl = 'http://localhost:8080/api';
  
  static const String loginEndpoint = '/auth/login';
  static const String registerEndpoint = '/auth/register';
  static const String invoicesEndpoint = '/invoices';
  static const String usersEndpoint = '/users';
  static const String demoRequestsEndpoint = '/demo-requests';
  
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  static Map<String, String> getHeaders({String? token}) {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }
}
EOF

echo ""
echo "✅ Projet Flutter créé avec succès!"
echo ""
echo "📍 Emplacement: c:/frontendpfe/ey_invoice_mobile"
echo ""
echo "🎯 Prochaines étapes:"
echo "   1. cd c:/frontendpfe/ey_invoice_mobile"
echo "   2. code ."
echo "   3. flutter run"
echo ""
echo "📚 Consultez GUIDE-FLUTTER-SETUP.md pour plus de détails"
