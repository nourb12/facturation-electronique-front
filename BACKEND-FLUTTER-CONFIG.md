# Configuration Backend pour Flutter

## 🔧 Configuration Spring Boot pour Flutter

### 1. Configuration CORS

Créez ou modifiez `WebConfig.java` dans votre backend :

```java
package com.ey.einvoicing.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("*")  // En production, spécifiez les domaines autorisés
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .exposedHeaders("Authorization")
                .allowCredentials(false)
                .maxAge(3600);
    }
}
```

### 2. Configuration PostgreSQL

Dans `application.properties` ou `application.yml` :

#### application.properties

```properties
# Server Configuration
server.port=8080

# PostgreSQL Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/ey_invoice_db
spring.datasource.username=postgres
spring.datasource.password=votre_mot_de_passe
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA/Hibernate Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.properties.hibernate.format_sql=true

# Logging
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE

# JSON Configuration
spring.jackson.serialization.write-dates-as-timestamps=false
spring.jackson.time-zone=UTC
```

#### application.yml (Alternative)

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/ey_invoice_db
    username: postgres
    password: votre_mot_de_passe
    driver-class-name: org.postgresql.Driver
  
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
  
  jackson:
    serialization:
      write-dates-as-timestamps: false
    time-zone: UTC

logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
```

### 3. Dépendances Maven (pom.xml)

```xml
<dependencies>
    <!-- Spring Boot Starter Web -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
    <!-- Spring Boot Starter Data JPA -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    
    <!-- PostgreSQL Driver -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>
    
    <!-- Spring Boot Starter Security (optionnel) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    
    <!-- JWT (pour authentification) -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.11.5</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.11.5</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.11.5</version>
        <scope>runtime</scope>
    </dependency>
    
    <!-- Lombok (optionnel) -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
    
    <!-- Validation -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
</dependencies>
```

### 4. Exemple d'Entité Invoice

```java
package com.ey.einvoicing.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "invoices")
@Data
public class Invoice {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "invoice_number", unique = true, nullable = false)
    private String invoiceNumber;
    
    @Column(name = "client_name", nullable = false)
    private String clientName;
    
    @Column(name = "amount", nullable = false)
    private Double amount;
    
    @Column(name = "status", nullable = false)
    private String status;
    
    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;
    
    @Column(name = "due_date")
    private LocalDate dueDate;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

### 5. Repository

```java
package com.ey.einvoicing.repository;

import com.ey.einvoicing.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
}
```

### 6. Service

```java
package com.ey.einvoicing.service;

import com.ey.einvoicing.entity.Invoice;
import com.ey.einvoicing.repository.InvoiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class InvoiceService {
    
    @Autowired
    private InvoiceRepository invoiceRepository;
    
    public List<Invoice> getAllInvoices() {
        return invoiceRepository.findAll();
    }
    
    public Optional<Invoice> getInvoiceById(Long id) {
        return invoiceRepository.findById(id);
    }
    
    public Invoice createInvoice(Invoice invoice) {
        return invoiceRepository.save(invoice);
    }
    
    public Invoice updateInvoice(Long id, Invoice invoiceDetails) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
        
        invoice.setInvoiceNumber(invoiceDetails.getInvoiceNumber());
        invoice.setClientName(invoiceDetails.getClientName());
        invoice.setAmount(invoiceDetails.getAmount());
        invoice.setStatus(invoiceDetails.getStatus());
        invoice.setIssueDate(invoiceDetails.getIssueDate());
        invoice.setDueDate(invoiceDetails.getDueDate());
        
        return invoiceRepository.save(invoice);
    }
    
    public void deleteInvoice(Long id) {
        invoiceRepository.deleteById(id);
    }
}
```

### 7. Controller

```java
package com.ey.einvoicing.controller;

import com.ey.einvoicing.entity.Invoice;
import com.ey.einvoicing.service.InvoiceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/invoices")
@CrossOrigin(origins = "*")
public class InvoiceController {
    
    @Autowired
    private InvoiceService invoiceService;
    
    @GetMapping
    public ResponseEntity<List<Invoice>> getAllInvoices() {
        return ResponseEntity.ok(invoiceService.getAllInvoices());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Invoice> getInvoiceById(@PathVariable Long id) {
        return invoiceService.getInvoiceById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<Invoice> createInvoice(@RequestBody Invoice invoice) {
        Invoice created = invoiceService.createInvoice(invoice);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Invoice> updateInvoice(
            @PathVariable Long id,
            @RequestBody Invoice invoice) {
        Invoice updated = invoiceService.updateInvoice(id, invoice);
        return ResponseEntity.ok(updated);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInvoice(@PathVariable Long id) {
        invoiceService.deleteInvoice(id);
        return ResponseEntity.noContent().build();
    }
}
```

### 8. Configuration PostgreSQL

#### Créer la base de données

```sql
-- Connexion à PostgreSQL
psql -U postgres

-- Créer la base de données
CREATE DATABASE ey_invoice_db;

-- Se connecter à la base
\c ey_invoice_db

-- Créer la table invoices (optionnel, Hibernate le fera automatiquement)
CREATE TABLE invoices (
    id BIGSERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insérer des données de test
INSERT INTO invoices (invoice_number, client_name, amount, status, issue_date, due_date)
VALUES 
    ('INV-2026-001', 'Client A', 1500.00, 'PAID', '2026-04-01', '2026-05-01'),
    ('INV-2026-002', 'Client B', 2500.00, 'PENDING', '2026-04-15', '2026-05-15'),
    ('INV-2026-003', 'Client C', 3200.00, 'OVERDUE', '2026-03-01', '2026-04-01');
```

### 9. Tester l'API

#### Avec cURL

```bash
# GET - Toutes les factures
curl http://localhost:8080/api/invoices

# GET - Une facture par ID
curl http://localhost:8080/api/invoices/1

# POST - Créer une facture
curl -X POST http://localhost:8080/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceNumber": "INV-2026-004",
    "clientName": "Client D",
    "amount": 4500.00,
    "status": "PENDING",
    "issueDate": "2026-05-01",
    "dueDate": "2026-06-01"
  }'

# PUT - Mettre à jour une facture
curl -X PUT http://localhost:8080/api/invoices/1 \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceNumber": "INV-2026-001",
    "clientName": "Client A Updated",
    "amount": 1600.00,
    "status": "PAID",
    "issueDate": "2026-04-01",
    "dueDate": "2026-05-01"
  }'

# DELETE - Supprimer une facture
curl -X DELETE http://localhost:8080/api/invoices/1
```

#### Avec PowerShell

```powershell
# GET - Toutes les factures
Invoke-RestMethod -Uri "http://localhost:8080/api/invoices" -Method Get

# POST - Créer une facture
$body = @{
    invoiceNumber = "INV-2026-004"
    clientName = "Client D"
    amount = 4500.00
    status = "PENDING"
    issueDate = "2026-05-01"
    dueDate = "2026-06-01"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/invoices" -Method Post -Body $body -ContentType "application/json"
```

### 10. Lancer le Backend

```bash
# Avec Maven
mvn spring-boot:run

# Ou avec le JAR
mvn clean package
java -jar target/einvoicing-0.0.1-SNAPSHOT.jar
```

### 11. Vérification

Une fois le backend lancé, vérifiez :

1. **Backend actif** : http://localhost:8080
2. **API accessible** : http://localhost:8080/api/invoices
3. **PostgreSQL connecté** : Vérifiez les logs Spring Boot

### 12. Checklist Backend

- [ ] PostgreSQL installé et actif
- [ ] Base de données `ey_invoice_db` créée
- [ ] Configuration CORS ajoutée
- [ ] Dépendances Maven installées
- [ ] Backend lancé sur port 8080
- [ ] API testée avec cURL ou Postman
- [ ] Données de test insérées

---

## 🔗 Connexion avec Flutter

Une fois le backend configuré, votre application Flutter pourra se connecter via :

```dart
// Dans lib/config/api_config.dart
static const String baseUrl = 'http://localhost:8080/api';
```

Pour tester depuis un appareil physique ou émulateur :
- **Android Emulator** : `http://10.0.2.2:8080/api`
- **iOS Simulator** : `http://localhost:8080/api`
- **Appareil physique** : `http://[VOTRE_IP_LOCAL]:8080/api`

---

**Créé le** : 1 Mai 2026  
**Version** : 1.0.0
