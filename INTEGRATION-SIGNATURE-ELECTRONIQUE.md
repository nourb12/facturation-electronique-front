# 🔐 Guide d'Intégration de la Signature Électronique

## Vue d'ensemble

Ce document décrit l'intégration de la signature électronique dans le système EY Invoice Portal, conforme aux standards tunisiens et internationaux.

---

## 📋 Prérequis

### Juridique
- ✅ Conformité avec la **Loi n° 2000-83** (Tunisie) sur les échanges et le commerce électroniques
- ✅ Intégration avec l'**ANCE** (Agence Nationale de Certification Électronique)
- ✅ Respect du **Code des Obligations et des Contrats** tunisien

### Technique
- Backend : API REST pour la signature
- Frontend : Angular 17+ avec support des certificats
- Stockage sécurisé : HSM ou coffre-fort numérique
- Format : PDF/A-3 avec signature PAdES

---

## 🎯 Architecture Proposée

### Niveaux de Signature

#### **Niveau 1 : Signature Simple** (Implémenté en premier)
```
Utilisateur → PIN/OTP → Signature → Horodatage → Stockage
```

**Cas d'usage :**
- Validation interne de factures
- Approbation de brouillons
- Workflow d'approbation

#### **Niveau 2 : Signature Avancée** (Phase 2)
```
Utilisateur → Certificat Électronique → Signature Cryptographique → Horodatage Qualifié → Archivage
```

**Cas d'usage :**
- Factures clients finales
- Documents contractuels
- Conformité TEIF

#### **Niveau 3 : Signature Qualifiée** (Phase 3 - Optionnel)
```
Utilisateur → Certificat Qualifié ANCE → Signature PAdES → Horodatage TSA → Archivage Légal
```

**Cas d'usage :**
- Transactions de grande valeur
- Documents légaux
- Conformité totale

---

## 🔧 Implémentation Technique

### 1. Backend (API)

#### Endpoints à créer

```typescript
// POST /api/signatures/initier
// Initie une demande de signature
{
  "factureId": "uuid",
  "typeSignature": "simple" | "avancee" | "qualifiee",
  "signataire": {
    "userId": "uuid",
    "nom": "string",
    "email": "string"
  }
}

// POST /api/signatures/signer
// Signe le document
{
  "signatureId": "uuid",
  "methode": "pin" | "otp" | "certificat",
  "credentials": {
    "pin": "string",
    "otp": "string",
    "certificat": "base64"
  }
}

// GET /api/signatures/verifier/{factureId}
// Vérifie la validité d'une signature
Response: {
  "valide": boolean,
  "signataire": "string",
  "dateSignature": "ISO8601",
  "certificat": {...}
}

// GET /api/signatures/historique/{factureId}
// Historique des signatures
Response: [
  {
    "id": "uuid",
    "signataire": "string",
    "date": "ISO8601",
    "statut": "valide" | "revoquee",
    "typeSignature": "string"
  }
]
```

#### Modèle de données

```sql
CREATE TABLE signatures (
  id UUID PRIMARY KEY,
  facture_id UUID NOT NULL REFERENCES factures(id),
  user_id UUID NOT NULL REFERENCES users(id),
  type_signature VARCHAR(20) NOT NULL, -- simple, avancee, qualifiee
  methode_signature VARCHAR(20) NOT NULL, -- pin, otp, certificat
  hash_document VARCHAR(255) NOT NULL, -- SHA-256 du document
  signature_data TEXT NOT NULL, -- Signature cryptographique
  certificat_data TEXT, -- Certificat X.509 (si applicable)
  horodatage TIMESTAMP NOT NULL,
  tsa_token TEXT, -- Token d'horodatage qualifié
  statut VARCHAR(20) DEFAULT 'valide', -- valide, revoquee, expiree
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_signatures_facture ON signatures(facture_id);
CREATE INDEX idx_signatures_user ON signatures(user_id);
CREATE INDEX idx_signatures_statut ON signatures(statut);
```

---

### 2. Frontend (Angular)

#### Composant de Signature

Créer un nouveau composant : `signature-modal.component.ts`

```typescript
import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SignatureApiService } from '../../core/services/api.service';

export interface SignatureRequest {
  factureId: string;
  typeSignature: 'simple' | 'avancee' | 'qualifiee';
}

@Component({
  selector: 'app-signature-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="visible()" (click)="fermer()">
      <div class="modal modal--sm" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Signer la facture <em>{{ factureNumero }}</em></h3>
            <p class="modal-sub">Authentifiez-vous pour signer électroniquement</p>
          </div>
          <button class="modal-close" (click)="fermer()">×</button>
        </div>

        <div class="modal-body">
          <!-- Sélection du type de signature -->
          <div class="form-group">
            <label class="form-label">Type de signature</label>
            <select class="form-select" [(ngModel)]="typeSignature">
              <option value="simple">Signature Simple (PIN)</option>
              <option value="avancee">Signature Avancée (Certificat)</option>
              <option value="qualifiee">Signature Qualifiée (ANCE)</option>
            </select>
          </div>

          <!-- Méthode Simple : PIN -->
          <div *ngIf="typeSignature === 'simple'" class="signature-method">
            <div class="form-group">
              <label class="form-label">Code PIN <span class="req">*</span></label>
              <input 
                type="password" 
                class="form-input" 
                [(ngModel)]="pin" 
                placeholder="Entrez votre code PIN"
                maxlength="6"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Code OTP (envoyé par email)</label>
              <input 
                type="text" 
                class="form-input" 
                [(ngModel)]="otp" 
                placeholder="Code à 6 chiffres"
                maxlength="6"
              />
              <button class="btn-link" (click)="envoyerOTP()">
                {{ otpEnvoye() ? 'Renvoyer le code' : 'Envoyer le code' }}
              </button>
            </div>
          </div>

          <!-- Méthode Avancée : Certificat -->
          <div *ngIf="typeSignature === 'avancee'" class="signature-method">
            <div class="form-group">
              <label class="form-label">Certificat électronique</label>
              <input 
                type="file" 
                class="form-input" 
                (change)="onCertificatChange($event)"
                accept=".p12,.pfx"
              />
              <p class="form-hint">Format accepté : .p12 ou .pfx</p>
            </div>
            <div class="form-group">
              <label class="form-label">Mot de passe du certificat</label>
              <input 
                type="password" 
                class="form-input" 
                [(ngModel)]="certificatPassword"
                placeholder="Mot de passe"
              />
            </div>
          </div>

          <!-- Méthode Qualifiée : ANCE -->
          <div *ngIf="typeSignature === 'qualifiee'" class="signature-method">
            <div class="ance-info">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M24 4L8 12v12c0 10 7 19 16 22 9-3 16-12 16-22V12L24 4z" 
                      stroke="currentColor" stroke-width="2" fill="rgba(var(--c-tuniflow-rgb),.1)"/>
                <path d="M18 24l6 6 12-12" stroke="currentColor" stroke-width="2" 
                      stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <h4>Signature Qualifiée ANCE</h4>
              <p>Vous serez redirigé vers le portail de l'Agence Nationale de Certification Électronique pour signer avec votre certificat qualifié.</p>
            </div>
          </div>

          <!-- Aperçu du document -->
          <div class="signature-preview">
            <div class="preview-label">Document à signer</div>
            <div class="preview-doc">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M8 4h10l6 6v18H8V4z" stroke="currentColor" stroke-width="2"/>
                <path d="M18 4v6h6" stroke="currentColor" stroke-width="2"/>
              </svg>
              <div>
                <div class="preview-doc-title">Facture {{ factureNumero }}</div>
                <div class="preview-doc-meta">{{ montantTTC | number:'1.3-3' }} TND · {{ dateEmission | date:'dd/MM/yyyy' }}</div>
              </div>
            </div>
          </div>

          <!-- Informations légales -->
          <div class="legal-notice">
            <input type="checkbox" id="accepte" [(ngModel)]="accepteConditions" />
            <label for="accepte">
              J'accepte que ma signature électronique ait la même valeur juridique qu'une signature manuscrite conformément à la loi tunisienne n° 2000-83.
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-ghost" (click)="fermer()">Annuler</button>
          <button 
            class="btn-primary" 
            (click)="signer()" 
            [disabled]="!peutSigner() || loading()"
          >
            {{ loading() ? 'Signature en cours...' : 'Signer la facture' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .signature-method { margin: 16px 0; }
    .ance-info {
      text-align: center;
      padding: 24px;
      background: var(--bg-surf);
      border: 1px solid var(--b1);
      border-radius: 12px;
      svg { color: var(--c-tuniflow); margin-bottom: 12px; }
      h4 { font-size: 14px; font-weight: 700; color: var(--tp); margin-bottom: 8px; }
      p { font-size: 12px; color: var(--ts); line-height: 1.5; }
    }
    .signature-preview {
      margin: 16px 0;
      padding: 12px;
      background: var(--bg-surf);
      border: 1px solid var(--b1);
      border-radius: 10px;
    }
    .preview-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--ts);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 8px;
    }
    .preview-doc {
      display: flex;
      align-items: center;
      gap: 12px;
      svg { color: var(--c-tuniflow); }
    }
    .preview-doc-title { font-size: 13px; font-weight: 600; color: var(--tp); }
    .preview-doc-meta { font-size: 11px; color: var(--ts); margin-top: 2px; }
    .legal-notice {
      display: flex;
      gap: 8px;
      padding: 12px;
      background: rgba(var(--c-tuniflow-rgb), 0.05);
      border: 1px solid rgba(var(--c-tuniflow-rgb), 0.2);
      border-radius: 8px;
      margin-top: 16px;
      input[type="checkbox"] { margin-top: 2px; flex-shrink: 0; }
      label { font-size: 11px; color: var(--ts); line-height: 1.4; cursor: pointer; }
    }
    .btn-link {
      background: none;
      border: none;
      color: var(--c-tuniflow);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 4px;
      &:hover { text-decoration: underline; }
    }
    .form-hint {
      font-size: 10px;
      color: var(--ts);
      margin-top: 4px;
    }
  `]
})
export class SignatureModalComponent {
  @Input() factureId: string = '';
  @Input() factureNumero: string = '';
  @Input() montantTTC: number = 0;
  @Input() dateEmission: string = '';
  @Output() signatureComplete = new EventEmitter<any>();
  @Output() fermeture = new EventEmitter<void>();

  visible = signal(false);
  loading = signal(false);
  otpEnvoye = signal(false);

  typeSignature: 'simple' | 'avancee' | 'qualifiee' = 'simple';
  pin: string = '';
  otp: string = '';
  certificatFile: File | null = null;
  certificatPassword: string = '';
  accepteConditions: boolean = false;

  constructor(private signatureSvc: SignatureApiService) {}

  ouvrir() {
    this.visible.set(true);
    this.resetForm();
  }

  fermer() {
    this.visible.set(false);
    this.fermeture.emit();
  }

  envoyerOTP() {
    this.loading.set(true);
    this.signatureSvc.envoyerOTP(this.factureId).subscribe({
      next: () => {
        this.otpEnvoye.set(true);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onCertificatChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.certificatFile = input.files[0];
    }
  }

  peutSigner(): boolean {
    if (!this.accepteConditions) return false;

    switch (this.typeSignature) {
      case 'simple':
        return this.pin.length >= 4 && this.otp.length === 6;
      case 'avancee':
        return !!this.certificatFile && this.certificatPassword.length > 0;
      case 'qualifiee':
        return true; // Validation côté ANCE
      default:
        return false;
    }
  }

  signer() {
    if (!this.peutSigner() || this.loading()) return;

    this.loading.set(true);

    const request: any = {
      factureId: this.factureId,
      typeSignature: this.typeSignature,
      methode: this.typeSignature === 'simple' ? 'pin' : 'certificat',
      credentials: {}
    };

    if (this.typeSignature === 'simple') {
      request.credentials = { pin: this.pin, otp: this.otp };
    } else if (this.typeSignature === 'avancee' && this.certificatFile) {
      // Convertir le certificat en base64
      const reader = new FileReader();
      reader.onload = () => {
        request.credentials = {
          certificat: reader.result,
          password: this.certificatPassword
        };
        this.executerSignature(request);
      };
      reader.readAsDataURL(this.certificatFile);
      return;
    } else if (this.typeSignature === 'qualifiee') {
      // Redirection vers ANCE
      window.open(`https://ance.tn/signature?factureId=${this.factureId}`, '_blank');
      this.loading.set(false);
      return;
    }

    this.executerSignature(request);
  }

  private executerSignature(request: any) {
    this.signatureSvc.signer(request).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.signatureComplete.emit(result);
        this.fermer();
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Erreur signature:', err);
      }
    });
  }

  private resetForm() {
    this.typeSignature = 'simple';
    this.pin = '';
    this.otp = '';
    this.certificatFile = null;
    this.certificatPassword = '';
    this.accepteConditions = false;
    this.otpEnvoye.set(false);
  }
}
```

---

### 3. Intégration dans factures.component.ts

Ajouter les méthodes suivantes :

```typescript
// Dans la classe FacturesComponent

showSignatureModal = signal(false);
factureASigner = signal<any | null>(null);

ouvrirSignature(f: any) {
  this.factureASigner.set(f);
  this.showSignatureModal.set(true);
}

onSignatureComplete(result: any) {
  this.toast.success(`Facture ${result.numero} signée avec succès.`);
  this.showSignatureModal.set(false);
  this.loadAll(); // Recharger la liste
}

verifierSignature(f: any) {
  this.signatureSvc.verifier(f.id).subscribe({
    next: (verification) => {
      if (verification.valide) {
        this.toast.success('Signature valide ✓');
      } else {
        this.toast.error('Signature invalide ou expirée');
      }
    },
    error: () => this.toast.error('Erreur vérification signature')
  });
}
```

---

### 4. Mise à jour du template HTML

Dans `factures.component.html`, ajouter le bouton de signature :

```html
<!-- Dans les actions de la table -->
@if (f.statut === 'Validee' && !f.signee) {
  <button class="act-btn act-btn--ey" title="Signer" (click)="ouvrirSignature(f)">
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 9l3-3 2 2 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M8 11h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>
  </button>
}

@if (f.signee) {
  <button class="act-btn act-btn--ok" title="Vérifier signature" (click)="verifierSignature(f)">
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 6.5l3 3 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  </button>
}

<!-- Modal de signature -->
<app-signature-modal
  *ngIf="showSignatureModal()"
  [factureId]="factureASigner()?.id"
  [factureNumero]="factureASigner()?.numero"
  [montantTTC]="factureASigner()?.totalTtc"
  [dateEmission]="factureASigner()?.dateEmission"
  (signatureComplete)="onSignatureComplete($event)"
  (fermeture)="showSignatureModal.set(false)"
></app-signature-modal>
```

---

## 🔒 Sécurité

### Mesures de sécurité essentielles

1. **Chiffrement**
   - TLS 1.3 pour toutes les communications
   - Chiffrement AES-256 pour le stockage des certificats
   - HSM pour les clés privées critiques

2. **Authentification**
   - 2FA obligatoire pour les signatures avancées
   - Limitation des tentatives (rate limiting)
   - Logs d'audit complets

3. **Validation**
   - Vérification de l'intégrité du document (hash SHA-256)
   - Validation de la chaîne de certificats
   - Vérification de la révocation (OCSP/CRL)

4. **Conformité**
   - Horodatage qualifié (TSA)
   - Archivage légal (10 ans minimum)
   - Traçabilité complète

---

## 📊 Workflow Complet

```
1. Création facture → Brouillon
2. Validation facture → Validée
3. Génération XML TEIF → Conforme
4. **SIGNATURE ÉLECTRONIQUE** → Signée
5. Transmission → Transmise
6. Acceptation client → Acceptée
7. Paiement → Payée
```

---

## 🚀 Plan de Déploiement

### Phase 1 : Signature Simple (2-3 semaines)
- ✅ Implémentation PIN/OTP
- ✅ Interface utilisateur
- ✅ Tests unitaires et d'intégration

### Phase 2 : Signature Avancée (3-4 semaines)
- ✅ Support des certificats X.509
- ✅ Intégration avec fournisseurs tiers
- ✅ Validation de la chaîne de certificats

### Phase 3 : Signature Qualifiée (4-6 semaines)
- ✅ Intégration ANCE
- ✅ Horodatage qualifié
- ✅ Archivage légal

---

## 📚 Ressources

### Juridique
- [Loi n° 2000-83 (Tunisie)](http://www.legislation.tn/)
- [ANCE - Agence Nationale de Certification Électronique](https://www.ance.tn/)

### Technique
- [PAdES - PDF Advanced Electronic Signatures](https://www.etsi.org/deliver/etsi_ts/102700_102799/10277804/01.01.02_60/ts_10277804v010102p.pdf)
- [eIDAS Regulation (EU)](https://ec.europa.eu/digital-building-blocks/wikis/display/DIGITAL/eIDAS)

### Bibliothèques
- **Backend** : `iText` (Java), `PyPDF2` (Python), `pdf-lib` (Node.js)
- **Frontend** : `pdf.js`, `forge` (cryptographie)

---

## ✅ Checklist de Mise en Production

- [ ] Tests de sécurité (penetration testing)
- [ ] Audit de conformité juridique
- [ ] Formation des utilisateurs
- [ ] Documentation technique complète
- [ ] Plan de reprise d'activité (DRP)
- [ ] Monitoring et alertes
- [ ] Support client 24/7

---

## 💡 Recommandations

1. **Commencez par la signature simple** pour valider le workflow
2. **Intégrez progressivement** les niveaux avancés
3. **Formez vos utilisateurs** sur les aspects juridiques
4. **Auditez régulièrement** la sécurité du système
5. **Maintenez une documentation** à jour

---

**Auteur** : Kiro AI Assistant  
**Date** : {{ date }}  
**Version** : 1.0
