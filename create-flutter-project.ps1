# Script PowerShell pour créer le projet Flutter EY Invoice Mobile
# Auteur: Assistant Kiro
# Date: 1 Mai 2026

Write-Host "🚀 Création du projet Flutter EY Invoice Mobile..." -ForegroundColor Green
Write-Host ""

# Étape 1: Vérifier Flutter
Write-Host "🔍 Vérification de Flutter..." -ForegroundColor Yellow
flutter --version

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Flutter n'est pas installé!" -ForegroundColor Red
    Write-Host "Installez Flutter depuis: https://flutter.dev/docs/get-started/install" -ForegroundColor Yellow
    exit 1
}

# Étape 2: Créer le projet
Write-Host ""
Write-Host "📱 Création du projet Flutter..." -ForegroundColor Yellow
Set-Location C:\frontendpfe
flutter create ey_invoice_mobile
Set-Location ey_invoice_mobile

# Étape 3: Créer la structure des dossiers
Write-Host ""
Write-Host "📁 Création de la structure des dossiers..." -ForegroundColor Yellow

$folders = @(
    "lib\config",
    "lib\models",
    "lib\services",
    "lib\screens",
    "lib\widgets",
    "lib\utils",
    "assets\images",
    "assets\icons"
)

foreach ($folder in $folders) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
    Write-Host "  ✓ Créé: $folder" -ForegroundColor Gray
}

# Étape 4: Créer pubspec.yaml
Write-Host ""
Write-Host "📦 Configuration des dépendances..." -ForegroundColor Yellow

$pubspecContent = @"
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
"@

Set-Content -Path "pubspec.yaml" -Value $pubspecContent

# Étape 5: Créer api_config.dart
Write-Host ""
Write-Host "📝 Création des fichiers de configuration..." -ForegroundColor Yellow

$apiConfigContent = @"
class ApiConfig {
  // URL de votre backend
  static const String baseUrl = 'http://localhost:8080/api';
  
  // Endpoints
  static const String loginEndpoint = '/auth/login';
  static const String registerEndpoint = '/auth/register';
  static const String invoicesEndpoint = '/invoices';
  static const String usersEndpoint = '/users';
  static const String demoRequestsEndpoint = '/demo-requests';
  
  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  // Headers
  static Map<String, String> getHeaders({String? token}) {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer `$token',
    };
  }
}
"@

Set-Content -Path "lib\config\api_config.dart" -Value $apiConfigContent

# Étape 6: Créer api_service.dart
$apiServiceContent = @"
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';

class ApiService {
  late Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  
  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
    ));
    
    // Intercepteur pour ajouter le token automatiquement
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'auth_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer `$token';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          await _storage.delete(key: 'auth_token');
        }
        return handler.next(error);
      },
    ));
  }
  
  Future<Response> get(String endpoint, {Map<String, dynamic>? params}) async {
    return await _dio.get(endpoint, queryParameters: params);
  }
  
  Future<Response> post(String endpoint, {dynamic data}) async {
    return await _dio.post(endpoint, data: data);
  }
  
  Future<Response> put(String endpoint, {dynamic data}) async {
    return await _dio.put(endpoint, data: data);
  }
  
  Future<Response> delete(String endpoint) async {
    return await _dio.delete(endpoint);
  }
}
"@

Set-Content -Path "lib\services\api_service.dart" -Value $apiServiceContent

# Étape 7: Créer README.md
$readmeContent = @"
# EY Invoice Mobile

Application mobile Flutter pour la gestion des factures EY.

## 🚀 Démarrage

``````bash
flutter pub get
flutter run
``````

## 📚 Documentation

Consultez les guides suivants :
- **Guide Complet** : Voir le fichier GUIDE-FLUTTER-SETUP.md dans le projet Angular
- **Guide Rapide** : Voir le fichier FLUTTER-QUICK-START.md

## 🔧 Configuration

1. Assurez-vous que le backend est lancé sur http://localhost:8080
2. Configurez PostgreSQL
3. Activez CORS dans le backend

## 📱 Plateformes Supportées

- Android
- iOS
- Web
- Windows
- macOS
- Linux

## 🛠️ Technologies

- Flutter 3.35.3
- Dart 3.9.2
- Dio (HTTP Client)
- Provider (State Management)
- Flutter Secure Storage

## 📞 Support

Pour toute question, consultez la documentation Flutter : https://flutter.dev/docs
"@

Set-Content -Path "README.md" -Value $readmeContent

# Étape 8: Installer les dépendances
Write-Host ""
Write-Host "⬇️  Installation des dépendances..." -ForegroundColor Yellow
flutter pub get

# Résumé
Write-Host ""
Write-Host "✅ Projet Flutter créé avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Emplacement: C:\frontendpfe\ey_invoice_mobile" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "   1. cd C:\frontendpfe\ey_invoice_mobile" -ForegroundColor White
Write-Host "   2. code ." -ForegroundColor White
Write-Host "   3. flutter run" -ForegroundColor White
Write-Host ""
Write-Host "📚 Fichiers créés:" -ForegroundColor Yellow
Write-Host "   ✓ Structure de dossiers complète" -ForegroundColor Gray
Write-Host "   ✓ pubspec.yaml avec toutes les dépendances" -ForegroundColor Gray
Write-Host "   ✓ lib/config/api_config.dart" -ForegroundColor Gray
Write-Host "   ✓ lib/services/api_service.dart" -ForegroundColor Gray
Write-Host "   ✓ README.md" -ForegroundColor Gray
Write-Host ""
Write-Host "🔗 Backend:" -ForegroundColor Yellow
Write-Host "   Assurez-vous que votre backend Spring Boot est lancé sur:" -ForegroundColor White
Write-Host "   http://localhost:8080" -ForegroundColor Cyan
Write-Host ""
Write-Host "💾 Base de données:" -ForegroundColor Yellow
Write-Host "   PostgreSQL doit être actif et configuré" -ForegroundColor White
Write-Host ""
Write-Host "📖 Documentation complète disponible dans:" -ForegroundColor Yellow
Write-Host "   C:\frontendpfe\ey-invoice-portal\GUIDE-FLUTTER-SETUP.md" -ForegroundColor Cyan
Write-Host ""
