# 🔐 Hashage Numérique - Résumé Visuel

## 📊 Schéma du Processus Complet

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CRÉATION DE LA FACTURE                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   Facture N°2025-001    │
                    │   Client: ACME Corp     │
                    │   Montant: 1500.000 TND │
                    └─────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CALCUL DU HASH (SHA-256)                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        a3f5b8c9d2e1f4a7b6c5d8e9f2a1b4c7d6e5f8a9b2c1d4e7f6a5b8c9d2e1f4a7
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SIGNATURE ÉLECTRONIQUE                           │
│  Hash + Timestamp + User ID → Signature Hash                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STOCKAGE EN BASE DE DONNÉES                      │
│  ✓ Hash du document                                                 │
│  ✓ Hash de la signature                                             │
│  ✓ Timestamp                                                         │
│  ✓ Signataire                                                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    VÉRIFICATION (plus tard)                         │
│  1. Recalculer le hash actuel                                       │
│  2. Comparer avec le hash stocké                                    │
│  3. Si identique → ✅ Document non modifié                          │
│  4. Si différent → ❌ Document modifié (FRAUDE)                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Exemple Concret

### Étape 1 : Document Original

```json
{
  "numero": "FAC-2025-001",
  "client": "ACME Corporation",
  "montantTTC": 1500.000,
  "devise": "TND"
}
```

**Hash SHA-256 :**
```
a3f5b8c9d2e1f4a7b6c5d8e9f2a1b4c7d6e5f8a9b2c1d4e7f6a5b8c9d2e1f4a7
```

---

### Étape 2 : Tentative de Modification

```json
{
  "numero": "FAC-2025-001",
  "client": "ACME Corporation",
  "montantTTC": 150.000,  ← ❌ MODIFIÉ !
  "devise": "TND"
}
```

**Hash SHA-256 (complètement différent) :**
```
7b2c5d8e9f1a4b7c6d5e8f9a2b1c4d7e6f5a8b9c2d1e4f7a6b5c8d9e2f1a4b7
```

---

## 🔍 Comparaison Visuelle

| Aspect | Document Original | Document Modifié |
|--------|------------------|------------------|
| **Montant** | 1500.000 TND | 150.000 TND |
| **Hash** | `a3f5b8c9...` | `7b2c5d8e...` |
| **Identique ?** | ✅ | ❌ |
| **Résultat** | Signature valide | **FRAUDE DÉTECTÉE** |

---

## 💡 Propriétés du Hash

### 1. Déterministe
```
Input:  "Facture 001"  →  Hash: abc123...
Input:  "Facture 001"  →  Hash: abc123...  ✅ Toujours le même
```

### 2. Unique
```
Input:  "Facture 001"  →  Hash: abc123...
Input:  "Facture 002"  →  Hash: def456...  ✅ Différent
```

### 3. Irréversible
```
Hash: abc123...  →  Input: ???  ❌ Impossible à retrouver
```

### 4. Sensible
```
Input:  "Facture 001"   →  Hash: abc123...
Input:  "Facture 001."  →  Hash: xyz789...  ✅ Un seul caractère change tout
                    ↑ (point ajouté)
```

### 5. Taille Fixe
```
Input:  "A"                    →  Hash: 64 caractères
Input:  "Document de 10 pages" →  Hash: 64 caractères  ✅ Toujours 64
```

---

## 🛡️ Cas d'Usage dans votre Application

### 1. Signature de Facture

```typescript
// Avant signature
const facture = { numero: 'FAC-2025-001', montant: 1500 };
const hash = calculateHash(facture);
// hash = "a3f5b8c9..."

// Enregistrer en base
await db.signatures.create({
  factureId: facture.id,
  hashDocument: hash,
  timestamp: new Date()
});
```

### 2. Vérification d'Intégrité

```typescript
// Plus tard...
const factureActuelle = await db.factures.findById(id);
const hashActuel = calculateHash(factureActuelle);

const signature = await db.signatures.findByFactureId(id);

if (hashActuel === signature.hashDocument) {
  console.log('✅ Document non modifié');
} else {
  console.log('❌ FRAUDE DÉTECTÉE !');
  alertAdmin();
}
```

### 3. Détection de Fraude

```typescript
// Scénario : Employé malveillant modifie une facture
const factureOriginale = { montant: 1500 };
const hashOriginal = "a3f5b8c9..."; // Stocké en base

// 3 mois plus tard...
const factureFrauduleuse = { montant: 150 }; // ❌ Modifié
const hashFrauduleux = calculateHash(factureFrauduleuse);
// hashFrauduleux = "7b2c5d8e..." (différent !)

if (hashOriginal !== hashFrauduleux) {
  // 🚨 ALERTE FRAUDE
  sendAlert({
    type: 'FRAUDE_DETECTEE',
    factureId: id,
    hashOriginal,
    hashActuel: hashFrauduleux
  });
}
```

---

## 📈 Performance

| Opération | Temps | Taille |
|-----------|-------|--------|
| Hash d'une facture (1 KB) | < 1 ms | 64 caractères |
| Hash d'un PDF (100 KB) | < 10 ms | 64 caractères |
| Hash d'un fichier (10 MB) | < 100 ms | 64 caractères |
| Vérification | < 1 ms | - |

---

## 🔒 Sécurité

### Algorithmes Recommandés

| Algorithme | Longueur | Sécurité | Usage |
|------------|----------|----------|-------|
| **SHA-256** | 64 caractères | ⭐⭐⭐⭐⭐ | **Recommandé** |
| SHA-512 | 128 caractères | ⭐⭐⭐⭐⭐ | Haute sécurité |
| MD5 | 32 caractères | ⭐ | ❌ Obsolète |
| SHA-1 | 40 caractères | ⭐⭐ | ❌ Déprécié |

### Attaques Connues

| Attaque | SHA-256 | Protection |
|---------|---------|------------|
| Collision | ❌ Impossible | ✅ Sécurisé |
| Préimage | ❌ Impossible | ✅ Sécurisé |
| Brute Force | ❌ 2^256 essais | ✅ Sécurisé |

---

## 🎓 Analogie Simple

Imaginez le hash comme une **empreinte digitale** :

```
👤 Personne A  →  🔍 Empreinte: ▓▓▓▓▓▓▓▓
👤 Personne B  →  🔍 Empreinte: ▒▒▒▒▒▒▒▒

✅ Chaque personne a une empreinte unique
✅ Impossible de recréer la personne à partir de l'empreinte
✅ Même des jumeaux ont des empreintes différentes
```

De la même manière :

```
📄 Document A  →  🔐 Hash: abc123...
📄 Document B  →  🔐 Hash: def456...

✅ Chaque document a un hash unique
✅ Impossible de recréer le document à partir du hash
✅ Même des documents similaires ont des hash différents
```

---

## 🚀 Implémentation Rapide

### Frontend (Angular)

```typescript
async function hashFacture(facture: any): Promise<string> {
  const json = JSON.stringify(facture);
  const encoder = new TextEncoder();
  const data = encoder.encode(json);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Utilisation
const facture = { numero: 'FAC-2025-001', montant: 1500 };
const hash = await hashFacture(facture);
console.log(hash); // a3f5b8c9d2e1f4a7...
```

### Backend (Node.js)

```typescript
import * as crypto from 'crypto';

function hashFacture(facture: any): string {
  const json = JSON.stringify(facture);
  return crypto
    .createHash('sha256')
    .update(json, 'utf8')
    .digest('hex');
}

// Utilisation
const facture = { numero: 'FAC-2025-001', montant: 1500 };
const hash = hashFacture(facture);
console.log(hash); // a3f5b8c9d2e1f4a7...
```

---

## ✅ Checklist d'Implémentation

- [ ] Installer les dépendances crypto
- [ ] Créer le service de hashage
- [ ] Calculer le hash à la création de facture
- [ ] Stocker le hash en base de données
- [ ] Implémenter la vérification d'intégrité
- [ ] Ajouter l'interface utilisateur
- [ ] Tester avec des données réelles
- [ ] Former les utilisateurs
- [ ] Documenter le processus
- [ ] Mettre en production

---

## 📚 Ressources

- [SHA-256 sur Wikipedia](https://en.wikipedia.org/wiki/SHA-2)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Node.js Crypto](https://nodejs.org/api/crypto.html)
- [Cryptographic Hash Functions](https://en.wikipedia.org/wiki/Cryptographic_hash_function)

---

## 🎯 Prochaines Étapes

1. **Tester le Playground** : Utilisez `hash-playground.component.ts`
2. **Implémenter dans votre API** : Suivez `GUIDE-HASHAGE-NUMERIQUE.md`
3. **Intégrer la signature** : Suivez `INTEGRATION-SIGNATURE-ELECTRONIQUE.md`
4. **Former les utilisateurs** : Expliquez l'importance du hashage
5. **Auditer la sécurité** : Vérifiez l'implémentation

---

**Auteur** : Kiro AI Assistant  
**Date** : 2026-05-02  
**Version** : 1.0
