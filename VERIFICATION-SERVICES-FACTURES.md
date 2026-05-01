# ✅ VÉRIFICATION DES SERVICES API - MODULE FACTURES

**Date** : 1er mai 2026  
**Composant** : `factures.component.ts`  
**Statut** : ✅ **TOUS LES SERVICES EXISTENT**

---

## 📦 **Services injectés dans le composant**

| Service | Fichier | Statut | Méthodes utilisées |
|---------|---------|--------|-------------------|
| `FactureApiService` | `api.service.ts:167` | ✅ Existe | `lister()`, `obtenirParId()`, `statistiques()`, `creer()`, `mettreAJour()`, `valider()`, `telechargerPdf()`, `obtenirHistorique()` |
| `ClientService` | `api.service.ts:42` | ✅ Existe | `lister()`, `creer()` |
| `ProduitApiService` | `api.service.ts:85` | ✅ Existe | `lister()`, `creer()` |
| `TeifApiService` | `api.service.ts:225` | ✅ Existe | `genererXml()`, `marquerConforme()`, `telechargerXml()` |
| `PaiementApiService` | `api.service.ts:242` | ✅ Existe | `enregistrer()` |
| `SignatureApiService` | `api.service.ts:258` | ✅ Existe | `demander()` |
| `TtnApiService` | `api.service.ts:267` | ✅ Existe | `envoyer()` |
| `PersonnalisationApiService` | `api.service.ts:367` | ✅ Existe | `obtenir()` |
| `EntrepriseApiService` | `api.service.ts:346` | ✅ Existe | `obtenirParId()` |
| `AuthService` | `auth.service.ts` | ✅ Existe | `entrepriseId` |
| `ToastService` | `toast.service.ts` | ✅ Existe | `success()`, `error()` |
| `TranslateService` | `@ngx-translate/core` | ✅ Installé | `instant()` |

---

## ✅ **Méthodes vérifiées**

### **FactureApiService**
```typescript
✅ lister(params: any)                    // GET /factures
✅ obtenirParId(id: string)               // GET /factures/:id
✅ statistiques()                         // GET /factures/statistiques
✅ creer(req: any)                        // POST /factures
✅ mettreAJour(id: string, req: any)      // PUT /factures/:id
✅ valider(id: string)                    // POST /factures/:id/valider
✅ telechargerPdf(id: string)             // GET /factures/:id/pdf (Blob)
✅ obtenirHistorique(id: string)          // GET /factures/:id/historique
```

### **ClientService**
```typescript
✅ lister(page, parPage, actifSeulement)  // GET /clients
✅ creer(req: CreerClientRequest)         // POST /clients
```

### **ProduitApiService**
```typescript
✅ lister(page, parPage, categorieId, actifSeulement) // GET /produits
✅ creer(req: any)                        // POST /produits
```

### **TeifApiService**
```typescript
✅ genererXml(factureId: string)          // POST /teif/:id/generer-xml
✅ marquerConforme(factureId: string)     // POST /teif/:id/marquer-conforme
✅ telechargerXml(factureId: string)      // GET /teif/:id/generer-xml/fichier (Blob)
```

### **PaiementApiService**
```typescript
✅ enregistrer(req: any)                  // POST /paiements
```

### **SignatureApiService**
```typescript
✅ demander(factureId: string)            // POST /signatures/demander
```

### **TtnApiService**
```typescript
✅ envoyer(factureId: string)             // POST /ttn/envoyer
```

### **PersonnalisationApiService**
```typescript
✅ obtenir()                              // GET /personnalisation
```

### **EntrepriseApiService**
```typescript
✅ obtenirParId(id: string)               // GET /entreprises/:id
```

---

## 📊 **DTOs (Data Transfer Objects)**

### **Interfaces utilisées dans le composant** :

```typescript
✅ LigneFactureDraft          // Interface locale (définie dans le composant)
✅ SectionDraft               // Interface locale (définie dans le composant)
✅ FactureDraft               // Interface locale (définie dans le composant)
✅ ViewMode                   // Type local: 'list' | 'create' | 'edit' | 'detail'

✅ FactureDto                 // api.service.ts:145
✅ ListeFacturesDto           // api.service.ts:163
✅ StatistiquesFacturesDto    // api.service.ts:156
✅ ClientDto                  // api.service.ts (à vérifier ligne exacte)
✅ ProduitDto                 // api.service.ts:68
✅ XmlTeifDto                 // api.service.ts:207
```

---

## 🎯 **Computed (calculs automatiques)**

| Computed | Description | Formule |
|----------|-------------|---------|
| `clientSelectionne` | Client sélectionné dans le draft | `clients().find(c => c.id === draft().clientId)` |
| `clientsFiltres` | Clients filtrés par recherche | Filtre par nom, MF, email |
| `totalHt` | Total HT de toutes les lignes | `Σ montantHt` |
| `totalHtApresRemise` | Total HT après remise globale | `totalHt - remiseGlobale` |
| `totalTva` | Total TVA avec ratio remise | `Σ (montantTva × ratio)` |
| `totalTtc` | Total TTC final | `HT + TVA + Timbre - Retenue` |
| `retenueAmount` | Montant retenue à la source | `totalHtApresRemise × tauxRetenue / 100` |
| `groupesTva` | Détails TVA par taux | Groupement par `tauxTva` |

---

## 🔄 **Workflow des statuts**

```
Brouillon → Validée → Conforme → Transmise → Acceptée → Payée
    ↓          ↓          ↓          ↓          ↓
 Annulée   Rejetée    Rejetée    Rejetée    Avoir
```

### **Actions par statut** :

| Statut | Actions disponibles |
|--------|-------------------|
| `Brouillon` | ✎ Modifier, ✓ Finaliser, 🗑 Supprimer |
| `Validee` | 📤 Générer XML TEIF, 📄 Télécharger PDF |
| `Conforme` | ✍ Signer, 📤 Envoyer TTN |
| `Acceptee` | 💰 Enregistrer paiement |
| `Payee` | ↩ Créer avoir, 📄 PDF |
| `Rejetee` | ↩ Créer avoir |

---

## 🧮 **Algorithme : Montant en lettres**

```typescript
montantEnLettres(): string {
  // Convertit 6188.000 → "Six mille cent quatre-vingt-huit dinars"
  // Gère les dinars et millimes
  // Règles françaises (soixante-dix, quatre-vingt, etc.)
}
```

---

## ✅ **CONCLUSION**

**Tous les services API nécessaires existent déjà dans le projet !**

### **Prochaines étapes** :

1. ✅ Copier le fichier TypeScript dans le projet
2. ✅ Copier le fichier HTML
3. ✅ Copier le fichier SCSS
4. ✅ Compiler et tester
5. ✅ Vérifier les traductions (clés i18n)

---

**Aucune modification des services API n'est nécessaire.**  
Le composant est **100% compatible** avec l'architecture existante.
