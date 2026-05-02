# 🚀 Guide Rapide Flutter - EY Invoice Mobile

## ⚡ Démarrage en 5 Minutes

### 1️⃣ Créer le Projet

```bash
cd c:\frontendpfe
flutter create ey_invoice_mobile
cd ey_invoice_mobile
code .
```

### 2️⃣ Installer les Dépendances Essentielles

Ouvrez `pubspec.yaml` et ajoutez :

```yaml
dependencies:
  flutter:
    sdk: flutter
  dio: ^5.4.0                      # Pour les appels API
  flutter_secure_storage: ^9.0.0  # Pour stocker le token
  provider: ^6.1.1                 # Gestion d'état
```

Puis exécutez :

```bash
flutter pub get
```

### 3️⃣ Configuration API (lib/config/api_config.dart)

```dart
class ApiConfig {
  static const String baseUrl = 'http://localhost:8080/api';
  static const String invoicesEndpoint = '/invoices';
}
```

### 4️⃣ Service API Simple (lib/services/api_service.dart)

```dart
import 'package:dio/dio.dart';

class ApiService {
  final Dio _dio = Dio(BaseOptions(
    baseUrl: 'http://localhost:8080/api',
  ));
  
  Future<List<dynamic>> getInvoices() async {
    final response = await _dio.get('/invoices');
    return response.data;
  }
}
```

### 5️⃣ Écran Simple (lib/screens/invoices_screen.dart)

```dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class InvoicesScreen extends StatefulWidget {
  @override
  _InvoicesScreenState createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends State<InvoicesScreen> {
  final ApiService _api = ApiService();
  List<dynamic> invoices = [];
  
  @override
  void initState() {
    super.initState();
    _loadInvoices();
  }
  
  Future<void> _loadInvoices() async {
    final data = await _api.getInvoices();
    setState(() => invoices = data);
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Factures')),
      body: ListView.builder(
        itemCount: invoices.length,
        itemBuilder: (context, index) {
          final invoice = invoices[index];
          return ListTile(
            title: Text(invoice['invoiceNumber']),
            subtitle: Text(invoice['clientName']),
            trailing: Text('${invoice['amount']} €'),
          );
        },
      ),
    );
  }
}
```

### 6️⃣ Main.dart

```dart
import 'package:flutter/material.dart';
import 'screens/invoices_screen.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EY Invoice',
      theme: ThemeData(primarySwatch: Colors.yellow),
      home: InvoicesScreen(),
    );
  }
}
```

### 7️⃣ Lancer l'Application

```bash
flutter run
```

---

## 🔧 Configuration Backend

### Activer CORS (Spring Boot)

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE");
    }
}
```

### PostgreSQL Connection (application.properties)

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/ey_invoice_db
spring.datasource.username=postgres
spring.datasource.password=votre_password
spring.jpa.hibernate.ddl-auto=update
```

---

## 📱 Tester sur Différentes Plateformes

```bash
# Android
flutter run -d android

# iOS (Mac uniquement)
flutter run -d ios

# Web
flutter run -d chrome

# Windows
flutter run -d windows
```

---

## 🐛 Résolution de Problèmes

### Erreur de connexion API

1. Vérifiez que le backend est lancé : `http://localhost:8080`
2. Testez l'API avec Postman
3. Vérifiez CORS dans le backend

### Erreur de dépendances

```bash
flutter clean
flutter pub get
```

### Erreur de build

```bash
flutter doctor
flutter upgrade
```

---

## 📚 Ressources

- **Documentation Flutter** : https://flutter.dev/docs
- **Packages** : https://pub.dev
- **Guide Complet** : Voir `GUIDE-FLUTTER-SETUP.md`

---

## ✅ Checklist

- [ ] Flutter installé (`flutter --version`)
- [ ] Projet créé
- [ ] Dépendances installées
- [ ] Backend lancé (port 8080)
- [ ] PostgreSQL actif
- [ ] CORS configuré
- [ ] Premier test réussi

---

**Temps estimé** : 15-20 minutes  
**Niveau** : Débutant
