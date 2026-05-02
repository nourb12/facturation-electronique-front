# 📱 Résumé : Créer un Projet Flutter avec Backend et PostgreSQL

## 🎯 Ce que vous allez faire

Créer une application mobile Flutter qui se connecte à votre backend Spring Boot et base de données PostgreSQL pour gérer des factures.

---

## 📝 Les Étapes en Bref

### 1️⃣ **Créer le Projet Flutter** (5 minutes)

```bash
cd C:\frontendpfe
flutter create ey_invoice_mobile
cd ey_invoice_mobile
code .
```

**OU** utiliser le script automatique :

```powershell
cd C:\frontendpfe\ey-invoice-portal
.\create-flutter-project.ps1
```

---

### 2️⃣ **Installer les Packages** (2 minutes)

Ajouter dans `pubspec.yaml` :

```yaml
dependencies:
  dio: ^5.4.0                      # Pour appeler l'API
  flutter_secure_storage: ^9.0.0  # Pour stocker le token
  provider: ^6.1.1                 # Pour gérer l'état
```

Puis :

```bash
flutter pub get
```

---

### 3️⃣ **Configurer l'API** (3 minutes)

Créer `lib/config/api_config.dart` :

```dart
class ApiConfig {
  static const String baseUrl = 'http://localhost:8080/api';
}
```

---

### 4️⃣ **Créer le Service API** (5 minutes)

Créer `lib/services/api_service.dart` :

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

---

### 5️⃣ **Configurer le Backend** (10 minutes)

#### A. PostgreSQL

```sql
CREATE DATABASE ey_invoice_db;
```

#### B. Spring Boot - `application.properties`

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/ey_invoice_db
spring.datasource.username=postgres
spring.datasource.password=votre_password
```

#### C. Activer CORS - `WebConfig.java`

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

#### D. Lancer le Backend

```bash
cd C:\backendpfe\einvoicing
mvn spring-boot:run
```

---

### 6️⃣ **Créer un Écran Simple** (10 minutes)

Créer `lib/screens/invoices_screen.dart` :

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
  bool loading = true;
  
  @override
  void initState() {
    super.initState();
    _loadInvoices();
  }
  
  Future<void> _loadInvoices() async {
    try {
      final data = await _api.getInvoices();
      setState(() {
        invoices = data;
        loading = false;
      });
    } catch (e) {
      print('Erreur: $e');
      setState(() => loading = false);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Factures')),
      body: loading
          ? Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: invoices.length,
              itemBuilder: (context, index) {
                final invoice = invoices[index];
                return Card(
                  margin: EdgeInsets.all(8),
                  child: ListTile(
                    title: Text(invoice['invoiceNumber']),
                    subtitle: Text(invoice['clientName']),
                    trailing: Text('${invoice['amount']} €'),
                  ),
                );
              },
            ),
    );
  }
}
```

---

### 7️⃣ **Modifier main.dart** (2 minutes)

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

---

### 8️⃣ **Lancer l'Application** (1 minute)

```bash
flutter run
```

Choisir la plateforme :
- **Chrome** : `flutter run -d chrome`
- **Windows** : `flutter run -d windows`
- **Android** : `flutter run -d android`

---

## 🎉 Résultat

Vous aurez une application mobile qui :
- ✅ Se connecte à votre backend Spring Boot
- ✅ Récupère les données de PostgreSQL
- ✅ Affiche la liste des factures
- ✅ Fonctionne sur mobile, web et desktop

---

## 📊 Architecture Complète

```
┌─────────────────┐
│  Flutter App    │  ← Application mobile
│  (Dart)         │
└────────┬────────┘
         │ HTTP/REST
         ↓
┌─────────────────┐
│  Spring Boot    │  ← Backend API
│  (Java)         │
└────────┬────────┘
         │ JDBC
         ↓
┌─────────────────┐
│  PostgreSQL     │  ← Base de données
│  (SQL)          │
└─────────────────┘
```

---

## 🔧 Technologies Utilisées

| Couche | Technologie | Rôle |
|--------|-------------|------|
| **Frontend** | Flutter + Dart | Application mobile |
| **Backend** | Spring Boot + Java | API REST |
| **Base de données** | PostgreSQL | Stockage des données |
| **Communication** | HTTP/REST + JSON | Échange de données |

---

## 📁 Structure du Projet Flutter

```
ey_invoice_mobile/
├── lib/
│   ├── main.dart                    # Point d'entrée
│   ├── config/
│   │   └── api_config.dart          # Configuration API
│   ├── models/
│   │   └── invoice.dart             # Modèle Facture
│   ├── services/
│   │   └── api_service.dart         # Service API
│   └── screens/
│       └── invoices_screen.dart     # Écran Factures
├── pubspec.yaml                     # Dépendances
└── README.md
```

---

## 🚨 Points Importants

### ✅ À Faire

1. **Toujours lancer le backend AVANT l'app Flutter**
2. **Vérifier que PostgreSQL est actif**
3. **Activer CORS dans le backend**
4. **Utiliser `flutter pub get` après chaque modification de pubspec.yaml**

### ❌ À Éviter

1. Ne pas oublier d'installer les dépendances
2. Ne pas utiliser `http://localhost` sur un appareil physique
3. Ne pas oublier de gérer les erreurs réseau

---

## 🐛 Problèmes Courants

### Problème 1 : "Connection refused"

**Cause** : Backend pas lancé ou mauvaise URL

**Solution** :
```bash
# Vérifier que le backend tourne
curl http://localhost:8080/api/invoices
```

### Problème 2 : "CORS error"

**Cause** : CORS pas configuré dans le backend

**Solution** : Ajouter `WebConfig.java` (voir étape 5)

### Problème 3 : "Package not found"

**Cause** : Dépendances pas installées

**Solution** :
```bash
flutter clean
flutter pub get
```

---

## 📚 Fichiers de Référence

| Fichier | Description |
|---------|-------------|
| `GUIDE-FLUTTER-SETUP.md` | Guide complet détaillé |
| `FLUTTER-QUICK-START.md` | Guide rapide 5 minutes |
| `BACKEND-FLUTTER-CONFIG.md` | Configuration backend |
| `FLUTTER-CHECKLIST.md` | Checklist complète |
| `RESUME-FLUTTER.md` | Ce fichier (résumé) |

---

## ⏱️ Temps Estimé

| Étape | Temps |
|-------|-------|
| Installation Flutter | 10 min |
| Création projet | 5 min |
| Configuration | 10 min |
| Backend setup | 15 min |
| Premier écran | 15 min |
| Tests | 10 min |
| **TOTAL** | **~1 heure** |

---

## 🎯 Prochaines Étapes

Après avoir terminé ce guide :

1. ✅ Ajouter l'authentification (login/logout)
2. ✅ Créer un écran de détail facture
3. ✅ Ajouter la création de factures
4. ✅ Implémenter la modification
5. ✅ Ajouter la suppression
6. ✅ Améliorer le design
7. ✅ Ajouter des animations
8. ✅ Gérer le mode hors ligne

---

## 💡 Conseils

### Pour Débuter

- Commencez par le guide rapide (`FLUTTER-QUICK-START.md`)
- Testez d'abord avec Chrome (plus rapide)
- Utilisez Postman pour tester l'API backend

### Pour Aller Plus Loin

- Lisez le guide complet (`GUIDE-FLUTTER-SETUP.md`)
- Ajoutez Provider pour la gestion d'état
- Implémentez JWT pour l'authentification
- Ajoutez des tests unitaires

---

## 📞 Aide

### Commandes Utiles

```bash
# Vérifier Flutter
flutter doctor

# Nettoyer le projet
flutter clean

# Voir les appareils disponibles
flutter devices

# Lancer sur un appareil spécifique
flutter run -d chrome
flutter run -d windows
flutter run -d android

# Voir les logs
flutter logs
```

### Ressources

- **Documentation Flutter** : https://flutter.dev/docs
- **Packages Dart** : https://pub.dev
- **Tutoriels** : https://flutter.dev/tutorials

---

## ✨ Félicitations !

Si vous avez suivi toutes les étapes, vous avez maintenant :

- ✅ Une application Flutter fonctionnelle
- ✅ Un backend Spring Boot connecté
- ✅ Une base PostgreSQL configurée
- ✅ Une architecture complète et professionnelle

**Vous êtes prêt à développer votre application ! 🚀**

---

**Créé le** : 1 Mai 2026  
**Auteur** : Assistant Kiro  
**Version** : 1.0.0

**Bon développement ! 💪**
