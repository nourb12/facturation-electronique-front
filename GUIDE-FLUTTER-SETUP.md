# Guide Complet : Projet Flutter avec Backend PostgreSQL

## 📋 Table des Matières
1. [Création du Projet Flutter](#1-création-du-projet-flutter)
2. [Structure du Projet](#2-structure-du-projet)
3. [Configuration Backend](#3-configuration-backend)
4. [Connexion à PostgreSQL](#4-connexion-à-postgresql)
5. [Intégration API](#5-intégration-api)
6. [Exemples de Code](#6-exemples-de-code)

---

## 1. Création du Projet Flutter

### A. Créer un nouveau projet Flutter

```bash
# Dans le terminal VS Code
cd c:\frontendpfe
flutter create ey_invoice_mobile
cd ey_invoice_mobile
```

### B. Ouvrir le projet dans VS Code

```bash
code .
```

### C. Mettre à jour Flutter (recommandé)

```bash
flutter upgrade
flutter doctor
```

---

## 2. Structure du Projet

Créez cette structure de dossiers :

```
ey_invoice_mobile/
├── lib/
│   ├── main.dart
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
├── pubspec.yaml                     # Dépendances
└── README.md
```

---

## 3. Configuration Backend

### A. Dépendances à ajouter dans `pubspec.yaml`

```yaml
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
  dio: ^5.4.0                    # Client HTTP avancé
  
  # State Management
  provider: ^6.1.1               # Gestion d'état
  get: ^4.6.6                    # Alternative: GetX
  
  # Storage Local
  shared_preferences: ^2.2.2     # Stockage clé-valeur
  flutter_secure_storage: ^9.0.0 # Stockage sécurisé (tokens)
  
  # JSON & Serialization
  json_annotation: ^4.8.1
  
  # UI Components
  cupertino_icons: ^1.0.6
  flutter_spinkit: ^5.2.0        # Loaders
  cached_network_image: ^3.3.1   # Images en cache
  
  # Date & Time
  intl: ^0.19.0                  # Formatage dates
  
  # PDF (pour factures)
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
  
  # Assets
  assets:
    - assets/images/
    - assets/icons/
```

### B. Installer les dépendances

```bash
flutter pub get
```

---

## 4. Connexion à PostgreSQL

### A. Configuration API (`lib/config/api_config.dart`)

```dart
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
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }
}
```

### B. Service API Principal (`lib/services/api_service.dart`)

```dart
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
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          // Token expiré - rediriger vers login
          await _storage.delete(key: 'auth_token');
        }
        return handler.next(error);
      },
    ));
  }
  
  // GET Request
  Future<Response> get(String endpoint, {Map<String, dynamic>? params}) async {
    try {
      return await _dio.get(endpoint, queryParameters: params);
    } catch (e) {
      rethrow;
    }
  }
  
  // POST Request
  Future<Response> post(String endpoint, {dynamic data}) async {
    try {
      return await _dio.post(endpoint, data: data);
    } catch (e) {
      rethrow;
    }
  }
  
  // PUT Request
  Future<Response> put(String endpoint, {dynamic data}) async {
    try {
      return await _dio.put(endpoint, data: data);
    } catch (e) {
      rethrow;
    }
  }
  
  // DELETE Request
  Future<Response> delete(String endpoint) async {
    try {
      return await _dio.delete(endpoint);
    } catch (e) {
      rethrow;
    }
  }
}
```

---

## 5. Intégration API

### A. Modèle Facture (`lib/models/invoice.dart`)

```dart
class Invoice {
  final int id;
  final String invoiceNumber;
  final String clientName;
  final double amount;
  final String status;
  final DateTime issueDate;
  final DateTime? dueDate;
  
  Invoice({
    required this.id,
    required this.invoiceNumber,
    required this.clientName,
    required this.amount,
    required this.status,
    required this.issueDate,
    this.dueDate,
  });
  
  // Conversion depuis JSON
  factory Invoice.fromJson(Map<String, dynamic> json) {
    return Invoice(
      id: json['id'],
      invoiceNumber: json['invoiceNumber'],
      clientName: json['clientName'],
      amount: json['amount'].toDouble(),
      status: json['status'],
      issueDate: DateTime.parse(json['issueDate']),
      dueDate: json['dueDate'] != null ? DateTime.parse(json['dueDate']) : null,
    );
  }
  
  // Conversion vers JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'invoiceNumber': invoiceNumber,
      'clientName': clientName,
      'amount': amount,
      'status': status,
      'issueDate': issueDate.toIso8601String(),
      'dueDate': dueDate?.toIso8601String(),
    };
  }
}
```

### B. Service Factures (`lib/services/invoice_service.dart`)

```dart
import '../models/invoice.dart';
import '../config/api_config.dart';
import 'api_service.dart';

class InvoiceService {
  final ApiService _apiService = ApiService();
  
  // Récupérer toutes les factures
  Future<List<Invoice>> getAllInvoices() async {
    try {
      final response = await _apiService.get(ApiConfig.invoicesEndpoint);
      
      if (response.statusCode == 200) {
        List<dynamic> data = response.data;
        return data.map((json) => Invoice.fromJson(json)).toList();
      } else {
        throw Exception('Erreur lors du chargement des factures');
      }
    } catch (e) {
      throw Exception('Erreur: $e');
    }
  }
  
  // Récupérer une facture par ID
  Future<Invoice> getInvoiceById(int id) async {
    try {
      final response = await _apiService.get('${ApiConfig.invoicesEndpoint}/$id');
      
      if (response.statusCode == 200) {
        return Invoice.fromJson(response.data);
      } else {
        throw Exception('Facture non trouvée');
      }
    } catch (e) {
      throw Exception('Erreur: $e');
    }
  }
  
  // Créer une nouvelle facture
  Future<Invoice> createInvoice(Invoice invoice) async {
    try {
      final response = await _apiService.post(
        ApiConfig.invoicesEndpoint,
        data: invoice.toJson(),
      );
      
      if (response.statusCode == 201) {
        return Invoice.fromJson(response.data);
      } else {
        throw Exception('Erreur lors de la création');
      }
    } catch (e) {
      throw Exception('Erreur: $e');
    }
  }
  
  // Mettre à jour une facture
  Future<Invoice> updateInvoice(int id, Invoice invoice) async {
    try {
      final response = await _apiService.put(
        '${ApiConfig.invoicesEndpoint}/$id',
        data: invoice.toJson(),
      );
      
      if (response.statusCode == 200) {
        return Invoice.fromJson(response.data);
      } else {
        throw Exception('Erreur lors de la mise à jour');
      }
    } catch (e) {
      throw Exception('Erreur: $e');
    }
  }
  
  // Supprimer une facture
  Future<void> deleteInvoice(int id) async {
    try {
      final response = await _apiService.delete('${ApiConfig.invoicesEndpoint}/$id');
      
      if (response.statusCode != 204) {
        throw Exception('Erreur lors de la suppression');
      }
    } catch (e) {
      throw Exception('Erreur: $e');
    }
  }
}
```

### C. Service Authentification (`lib/services/auth_service.dart`)

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _apiService = ApiService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  
  // Login
  Future<bool> login(String email, String password) async {
    try {
      final response = await _apiService.post(
        ApiConfig.loginEndpoint,
        data: {
          'email': email,
          'password': password,
        },
      );
      
      if (response.statusCode == 200) {
        final token = response.data['token'];
        await _storage.write(key: 'auth_token', value: token);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  
  // Logout
  Future<void> logout() async {
    await _storage.delete(key: 'auth_token');
  }
  
  // Vérifier si l'utilisateur est connecté
  Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: 'auth_token');
    return token != null;
  }
}
```

---

## 6. Exemples de Code

### A. Écran Liste Factures (`lib/screens/invoices_screen.dart`)

```dart
import 'package:flutter/material.dart';
import '../models/invoice.dart';
import '../services/invoice_service.dart';

class InvoicesScreen extends StatefulWidget {
  const InvoicesScreen({Key? key}) : super(key: key);

  @override
  State<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends State<InvoicesScreen> {
  final InvoiceService _invoiceService = InvoiceService();
  List<Invoice> _invoices = [];
  bool _isLoading = true;
  
  @override
  void initState() {
    super.initState();
    _loadInvoices();
  }
  
  Future<void> _loadInvoices() async {
    try {
      final invoices = await _invoiceService.getAllInvoices();
      setState(() {
        _invoices = invoices;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e')),
      );
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Factures'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: _invoices.length,
              itemBuilder: (context, index) {
                final invoice = _invoices[index];
                return Card(
                  margin: const EdgeInsets.all(8),
                  child: ListTile(
                    title: Text(invoice.invoiceNumber),
                    subtitle: Text(invoice.clientName),
                    trailing: Text(
                      '${invoice.amount.toStringAsFixed(2)} €',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    onTap: () {
                      // Navigation vers détails
                    },
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Ajouter nouvelle facture
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
```

### B. Main.dart

```dart
import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'services/auth_service.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EY Invoice Mobile',
      theme: ThemeData(
        primarySwatch: Colors.yellow,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: const SplashScreen(),
    );
  }
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({Key? key}) : super(key: key);

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  final AuthService _authService = AuthService();
  
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }
  
  Future<void> _checkAuth() async {
    final isLoggedIn = await _authService.isLoggedIn();
    
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => isLoggedIn ? const HomeScreen() : const LoginScreen(),
        ),
      );
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
```

---

## 7. Configuration Backend (Spring Boot)

### A. Activer CORS dans votre backend

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false);
    }
}
```

---

## 8. Commandes Utiles

```bash
# Lancer l'application
flutter run

# Lancer sur un émulateur spécifique
flutter run -d chrome          # Chrome
flutter run -d windows         # Windows
flutter run -d android         # Android

# Build pour production
flutter build apk              # Android APK
flutter build appbundle        # Android App Bundle
flutter build ios              # iOS
flutter build web              # Web

# Nettoyer le projet
flutter clean
flutter pub get

# Analyser le code
flutter analyze

# Tester
flutter test
```

---

## 9. Configuration PostgreSQL

Votre backend Spring Boot doit avoir cette configuration dans `application.properties` :

```properties
# PostgreSQL Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/ey_invoice_db
spring.datasource.username=postgres
spring.datasource.password=votre_mot_de_passe
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA/Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
```

---

## 10. Checklist de Démarrage

- [ ] Flutter installé et configuré
- [ ] VS Code avec extensions Flutter/Dart
- [ ] Projet Flutter créé
- [ ] Dépendances installées (`flutter pub get`)
- [ ] Backend Spring Boot lancé
- [ ] PostgreSQL en cours d'exécution
- [ ] Configuration API correcte (URL backend)
- [ ] CORS activé sur le backend
- [ ] Test de connexion API réussi

---

## 📞 Support

Pour toute question, consultez :
- [Documentation Flutter](https://flutter.dev/docs)
- [Pub.dev](https://pub.dev) pour les packages
- [Stack Overflow](https://stackoverflow.com/questions/tagged/flutter)

---

**Créé le :** 1 Mai 2026  
**Version :** 1.0.0
