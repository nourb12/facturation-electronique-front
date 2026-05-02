# 🔐 Guide Complet du Hashage Numérique pour Signature Électronique

## 📚 Qu'est-ce que le Hashage ?

Le **hashage** (ou hachage) est une fonction mathématique qui transforme n'importe quelle donnée en une chaîne de caractères de taille fixe, appelée **hash** ou **empreinte numérique**.

### Propriétés Essentielles

1. **Déterministe** : Le même document produit toujours le même hash
2. **Unique** : Deux documents différents produisent des hash différents
3. **Irréversible** : Impossible de retrouver le document original à partir du hash
4. **Sensible** : Un seul caractère modifié change complètement le hash
5. **Rapide** : Le calcul est très rapide même pour de gros fichiers

### Exemple Visuel

```
Document Original:
"Facture N°2025-001 - Montant: 1500.000 TND"

Hash SHA-256:
a3f5b8c9d2e1f4a7b6c5d8e9f2a1b4c7d6e5f8a9b2c1d4e7f6a5b8c9d2e1f4a7

Document Modifié (un seul caractère):
"Facture N°2025-001 - Montant: 1500.001 TND"
                                      ↑ (changé)

Hash SHA-256 (complètement différent):
7b2c5d8e9f1a4b7c6d5e8f9a2b1c4d7e6f5a8b9c2d1e4f7a6b5c8d9e2f1a4b7
```

---

## 🎯 Implémentation Complète

### 1. Backend (Node.js/TypeScript)

#### Service de Hashage

```typescript
// src/services/hash.service.ts

import * as crypto from 'crypto';
import * as fs from 'fs';
import { Injectable } from '@nestjs/common';

export interface HashResult {
  algorithm: string;
  hash: string;
  timestamp: Date;
  fileSize?: number;
}

@Injectable()
export class HashService {
  
  /**
   * Calcule le hash SHA-256 d'une chaîne de caractères
   */
  hashString(data: string, algorithm: 'sha256' | 'sha512' = 'sha256'): string {
    return crypto
      .createHash(algorithm)
      .update(data, 'utf8')
      .digest('hex');
  }

  /**
   * Calcule le hash d'un buffer (fichier en mémoire)
   */
  hashBuffer(buffer: Buffer, algorithm: 'sha256' | 'sha512' = 'sha256'): string {
    return crypto
      .createHash(algorithm)
      .update(buffer)
      .digest('hex');
  }

  /**
   * Calcule le hash d'un fichier (streaming pour gros fichiers)
   */
  async hashFile(filePath: string, algorithm: 'sha256' | 'sha512' = 'sha256'): Promise<HashResult> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);
      let fileSize = 0;

      stream.on('data', (chunk) => {
        fileSize += chunk.length;
        hash.update(chunk);
      });

      stream.on('end', () => {
        resolve({
          algorithm,
          hash: hash.digest('hex'),
          timestamp: new Date(),
          fileSize
        });
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Hash d'un objet JSON (pour factures)
   */
  hashObject(obj: any, algorithm: 'sha256' | 'sha512' = 'sha256'): string {
    // Sérialisation déterministe (ordre des clés important)
    const sortedJson = JSON.stringify(obj, Object.keys(obj).sort());
    return this.hashString(sortedJson, algorithm);
  }

  /**
   * Hash d'une facture complète (données normalisées)
   */
  hashFacture(facture: any): HashResult {
    // Normaliser les données pour un hash cohérent
    const dataToHash = {
      numero: facture.numero,
      clientId: facture.clientId,
      dateEmission: facture.dateEmission,
      dateEcheance: facture.dateEcheance,
      totalHt: Number(facture.totalHt).toFixed(3),
      totalTva: Number(facture.totalTva).toFixed(3),
      totalTtc: Number(facture.totalTtc).toFixed(3),
      devise: facture.devise,
      lignes: facture.lignes.map((l: any) => ({
        designation: l.designation,
        quantite: Number(l.quantite).toFixed(3),
        prixUnitaire: Number(l.prixUnitaire).toFixed(3),
        tauxTva: Number(l.tauxTva).toFixed(2),
        montantTtc: Number(l.montantTtc).toFixed(3)
      }))
    };

    const hash = this.hashObject(dataToHash, 'sha256');

    return {
      algorithm: 'sha256',
      hash,
      timestamp: new Date()
    };
  }

  /**
   * Vérifie si un hash correspond à des données
   */
  verifyHash(data: string | Buffer, expectedHash: string, algorithm: 'sha256' | 'sha512' = 'sha256'): boolean {
    const actualHash = typeof data === 'string' 
      ? this.hashString(data, algorithm)
      : this.hashBuffer(data, algorithm);
    
    return actualHash === expectedHash;
  }

  /**
   * Hash avec salt (pour mots de passe, PINs)
   */
  hashWithSalt(data: string, salt?: string): { hash: string; salt: string } {
    const usedSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(data, usedSalt, 10000, 64, 'sha512')
      .toString('hex');
    
    return { hash, salt: usedSalt };
  }

  /**
   * Vérifie un hash avec salt
   */
  verifyHashWithSalt(data: string, hash: string, salt: string): boolean {
    const verifyHash = crypto
      .pbkdf2Sync(data, salt, 10000, 64, 'sha512')
      .toString('hex');
    
    return verifyHash === hash;
  }

  /**
   * Génère un hash de signature (hash du hash + timestamp)
   */
  generateSignatureHash(documentHash: string, timestamp: Date, signerId: string): string {
    const signatureData = `${documentHash}|${timestamp.toISOString()}|${signerId}`;
    return this.hashString(signatureData, 'sha512');
  }
}
```

---

### 2. Controller pour les Signatures

```typescript
// src/controllers/signature.controller.ts

import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { HashService } from '../services/hash.service';
import { FactureService } from '../services/facture.service';
import { SignatureService } from '../services/signature.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@Controller('api/signatures')
@UseGuards(JwtAuthGuard)
export class SignatureController {
  
  constructor(
    private hashService: HashService,
    private factureService: FactureService,
    private signatureService: SignatureService
  ) {}

  /**
   * Calcule le hash d'une facture avant signature
   */
  @Post('calculer-hash')
  async calculerHash(@Body() body: { factureId: string }) {
    const facture = await this.factureService.findById(body.factureId);
    
    if (!facture) {
      throw new Error('Facture introuvable');
    }

    // Hash des données de la facture
    const hashResult = this.hashService.hashFacture(facture);

    // Générer aussi le PDF et hasher le PDF
    const pdfBuffer = await this.factureService.generatePdf(facture.id);
    const pdfHash = this.hashService.hashBuffer(pdfBuffer, 'sha256');

    return {
      factureId: facture.id,
      numero: facture.numero,
      dataHash: hashResult.hash,
      pdfHash,
      algorithm: 'sha256',
      timestamp: hashResult.timestamp,
      // Données pour vérification ultérieure
      metadata: {
        totalTtc: facture.totalTtc,
        devise: facture.devise,
        dateEmission: facture.dateEmission
      }
    };
  }

  /**
   * Signe une facture avec hash
   */
  @Post('signer')
  async signer(
    @Body() body: {
      factureId: string;
      typeSignature: 'simple' | 'avancee' | 'qualifiee';
      methode: 'pin' | 'otp' | 'certificat';
      credentials: any;
    },
    @CurrentUser() user: any
  ) {
    // 1. Récupérer la facture
    const facture = await this.factureService.findById(body.factureId);
    
    // 2. Calculer le hash du document
    const hashResult = this.hashService.hashFacture(facture);
    const documentHash = hashResult.hash;

    // 3. Vérifier les credentials selon la méthode
    let authenticated = false;
    
    if (body.methode === 'pin') {
      // Vérifier PIN + OTP
      authenticated = await this.signatureService.verifyPinAndOtp(
        user.id,
        body.credentials.pin,
        body.credentials.otp
      );
    } else if (body.methode === 'certificat') {
      // Vérifier certificat
      authenticated = await this.signatureService.verifyCertificate(
        body.credentials.certificat,
        body.credentials.password
      );
    }

    if (!authenticated) {
      throw new Error('Authentification échouée');
    }

    // 4. Générer le hash de signature
    const timestamp = new Date();
    const signatureHash = this.hashService.generateSignatureHash(
      documentHash,
      timestamp,
      user.id
    );

    // 5. Enregistrer la signature en base
    const signature = await this.signatureService.create({
      factureId: facture.id,
      userId: user.id,
      typeSignature: body.typeSignature,
      methodeSignature: body.methode,
      hashDocument: documentHash,
      signatureData: signatureHash,
      horodatage: timestamp,
      statut: 'valide',
      metadata: {
        algorithm: 'sha256',
        userAgent: body.credentials.userAgent,
        ipAddress: body.credentials.ipAddress
      }
    });

    // 6. Mettre à jour le statut de la facture
    await this.factureService.update(facture.id, {
      signee: true,
      dateSignature: timestamp,
      signatureId: signature.id
    });

    return {
      success: true,
      signatureId: signature.id,
      documentHash,
      signatureHash,
      timestamp,
      facture: {
        id: facture.id,
        numero: facture.numero,
        statut: 'Signee'
      }
    };
  }

  /**
   * Vérifie l'intégrité d'une facture signée
   */
  @Get('verifier/:factureId')
  async verifier(@Param('factureId') factureId: string) {
    // 1. Récupérer la facture et sa signature
    const facture = await this.factureService.findById(factureId);
    const signature = await this.signatureService.findByFactureId(factureId);

    if (!signature) {
      return {
        valide: false,
        raison: 'Aucune signature trouvée'
      };
    }

    // 2. Recalculer le hash actuel de la facture
    const hashActuel = this.hashService.hashFacture(facture);

    // 3. Comparer avec le hash enregistré
    const integrite = hashActuel.hash === signature.hashDocument;

    // 4. Vérifier le hash de signature
    const signatureHashRecalcule = this.hashService.generateSignatureHash(
      signature.hashDocument,
      signature.horodatage,
      signature.userId
    );

    const signatureValide = signatureHashRecalcule === signature.signatureData;

    // 5. Vérifier le statut (non révoquée, non expirée)
    const statutValide = signature.statut === 'valide';

    return {
      valide: integrite && signatureValide && statutValide,
      details: {
        integrite: {
          valide: integrite,
          hashOriginal: signature.hashDocument,
          hashActuel: hashActuel.hash,
          message: integrite 
            ? 'Document non modifié' 
            : '⚠️ Document modifié après signature'
        },
        signature: {
          valide: signatureValide,
          signataire: signature.user?.nom,
          date: signature.horodatage,
          type: signature.typeSignature,
          methode: signature.methodeSignature
        },
        statut: {
          valide: statutValide,
          statut: signature.statut
        }
      },
      certificat: signature.certificatData ? {
        emetteur: 'ANCE',
        validiteDebut: signature.certificatValiditeDebut,
        validiteFin: signature.certificatValiditeFin
      } : null
    };
  }

  /**
   * Historique des signatures d'une facture
   */
  @Get('historique/:factureId')
  async historique(@Param('factureId') factureId: string) {
    const signatures = await this.signatureService.findAllByFactureId(factureId);

    return signatures.map(sig => ({
      id: sig.id,
      signataire: sig.user?.nom,
      date: sig.horodatage,
      type: sig.typeSignature,
      methode: sig.methodeSignature,
      statut: sig.statut,
      hashDocument: sig.hashDocument,
      valide: sig.statut === 'valide'
    }));
  }
}
```

---

### 3. Frontend (Angular)

#### Service de Hashage Côté Client

```typescript
// src/app/core/services/hash.service.ts

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HashService {

  /**
   * Calcule le hash SHA-256 d'une chaîne (utilise Web Crypto API)
   */
  async hashString(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return this.bufferToHex(hashBuffer);
  }

  /**
   * Calcule le hash d'un fichier
   */
  async hashFile(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    return this.bufferToHex(hashBuffer);
  }

  /**
   * Calcule le hash d'un objet JSON
   */
  async hashObject(obj: any): Promise<string> {
    const sortedJson = JSON.stringify(obj, Object.keys(obj).sort());
    return this.hashString(sortedJson);
  }

  /**
   * Convertit un ArrayBuffer en chaîne hexadécimale
   */
  private bufferToHex(buffer: ArrayBuffer): string {
    const byteArray = new Uint8Array(buffer);
    const hexCodes = Array.from(byteArray).map(byte => {
      const hex = byte.toString(16);
      return hex.padStart(2, '0');
    });
    return hexCodes.join('');
  }

  /**
   * Vérifie si deux hash correspondent
   */
  verifyHash(hash1: string, hash2: string): boolean {
    return hash1.toLowerCase() === hash2.toLowerCase();
  }

  /**
   * Affiche un hash de manière lisible (tronqué)
   */
  formatHash(hash: string, length: number = 16): string {
    if (hash.length <= length) return hash;
    const start = hash.substring(0, length / 2);
    const end = hash.substring(hash.length - length / 2);
    return `${start}...${end}`;
  }
}
```

#### Composant de Vérification de Signature

```typescript
// src/app/components/signature-verification/signature-verification.component.ts

import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignatureApiService } from '../../core/services/api.service';
import { HashService } from '../../core/services/hash.service';

@Component({
  selector: 'app-signature-verification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="signature-verification">
      <div class="sv-header">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L4 6v6c0 7 4 13 8 15 4-2 8-8 8-15V6l-8-4z" 
                [attr.stroke]="verification()?.valide ? '#22C55E' : '#EF4444'" 
                stroke-width="2"/>
          <path *ngIf="verification()?.valide" d="M9 12l2 2 4-4" 
                stroke="#22C55E" stroke-width="2" stroke-linecap="round"/>
          <path *ngIf="!verification()?.valide" d="M10 10l4 4M14 10l-4 4" 
                stroke="#EF4444" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <div>
          <h4 class="sv-title">
            {{ verification()?.valide ? 'Signature Valide ✓' : 'Signature Invalide ✗' }}
          </h4>
          <p class="sv-subtitle">{{ verification()?.details?.integrite?.message }}</p>
        </div>
      </div>

      <div class="sv-details">
        <!-- Intégrité du document -->
        <div class="sv-section">
          <div class="sv-section-title">Intégrité du Document</div>
          <div class="sv-row">
            <span class="sv-label">Hash Original</span>
            <code class="sv-hash">{{ formatHash(verification()?.details?.integrite?.hashOriginal) }}</code>
          </div>
          <div class="sv-row">
            <span class="sv-label">Hash Actuel</span>
            <code class="sv-hash">{{ formatHash(verification()?.details?.integrite?.hashActuel) }}</code>
          </div>
          <div class="sv-status" [class.sv-status--ok]="verification()?.details?.integrite?.valide">
            {{ verification()?.details?.integrite?.valide ? '✓ Document non modifié' : '✗ Document modifié' }}
          </div>
        </div>

        <!-- Informations de signature -->
        <div class="sv-section">
          <div class="sv-section-title">Informations de Signature</div>
          <div class="sv-row">
            <span class="sv-label">Signataire</span>
            <span class="sv-value">{{ verification()?.details?.signature?.signataire }}</span>
          </div>
          <div class="sv-row">
            <span class="sv-label">Date</span>
            <span class="sv-value">{{ verification()?.details?.signature?.date | date:'dd/MM/yyyy HH:mm:ss' }}</span>
          </div>
          <div class="sv-row">
            <span class="sv-label">Type</span>
            <span class="sv-badge">{{ verification()?.details?.signature?.type }}</span>
          </div>
          <div class="sv-row">
            <span class="sv-label">Méthode</span>
            <span class="sv-value">{{ verification()?.details?.signature?.methode }}</span>
          </div>
        </div>

        <!-- Certificat (si applicable) -->
        <div *ngIf="verification()?.certificat" class="sv-section">
          <div class="sv-section-title">Certificat Électronique</div>
          <div class="sv-row">
            <span class="sv-label">Émetteur</span>
            <span class="sv-value">{{ verification()?.certificat?.emetteur }}</span>
          </div>
          <div class="sv-row">
            <span class="sv-label">Validité</span>
            <span class="sv-value">
              {{ verification()?.certificat?.validiteDebut | date:'dd/MM/yyyy' }} - 
              {{ verification()?.certificat?.validiteFin | date:'dd/MM/yyyy' }}
            </span>
          </div>
        </div>
      </div>

      <button class="btn-verify" (click)="reverifier()">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M12 7A5 5 0 1 1 7 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M12 2v5h-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        Revérifier
      </button>
    </div>
  `,
  styles: [`
    .signature-verification {
      background: var(--bg-card);
      border: 1px solid var(--b1);
      border-radius: 12px;
      padding: 20px;
    }
    .sv-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--b1);
    }
    .sv-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--tp);
      margin: 0;
    }
    .sv-subtitle {
      font-size: 12px;
      color: var(--ts);
      margin: 4px 0 0;
    }
    .sv-details {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .sv-section {
      padding: 12px;
      background: var(--bg-surf);
      border-radius: 8px;
    }
    .sv-section-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--ts);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 10px;
    }
    .sv-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 12px;
    }
    .sv-label {
      color: var(--ts);
      font-weight: 600;
    }
    .sv-value {
      color: var(--tp);
    }
    .sv-hash {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--c-tuniflow);
      background: rgba(var(--c-tuniflow-rgb), 0.08);
      padding: 4px 8px;
      border-radius: 4px;
    }
    .sv-badge {
      padding: 2px 8px;
      background: rgba(var(--c-tuniflow-rgb), 0.1);
      color: var(--c-tuniflow);
      border-radius: 99px;
      font-size: 10px;
      font-weight: 700;
    }
    .sv-status {
      margin-top: 8px;
      padding: 8px 12px;
      background: rgba(239, 68, 68, 0.1);
      color: #EF4444;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      &--ok {
        background: rgba(34, 197, 94, 0.1);
        color: #22C55E;
      }
    }
    .btn-verify {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      margin-top: 16px;
      padding: 10px;
      background: var(--bg-surf);
      border: 1px solid var(--b1);
      border-radius: 8px;
      color: var(--tp);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      &:hover {
        background: var(--b0);
        border-color: var(--c-tuniflow);
      }
    }
  `]
})
export class SignatureVerificationComponent {
  @Input() factureId: string = '';

  verification = signal<any>(null);
  loading = signal(false);

  constructor(
    private signatureSvc: SignatureApiService,
    private hashSvc: HashService
  ) {}

  ngOnInit() {
    this.verifier();
  }

  verifier() {
    this.loading.set(true);
    this.signatureSvc.verifier(this.factureId).subscribe({
      next: (result) => {
        this.verification.set(result);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  reverifier() {
    this.verifier();
  }

  formatHash(hash: string): string {
    return this.hashSvc.formatHash(hash, 16);
  }
}
```

---

## 🔍 Exemple Complet de Flux

### 1. Création de la Facture
```
Facture créée → Hash calculé → Stocké en base
```

### 2. Signature
```
1. Utilisateur clique "Signer"
2. Backend calcule hash actuel
3. Utilisateur s'authentifie (PIN/OTP/Certificat)
4. Backend génère hash de signature
5. Signature enregistrée avec hash
```

### 3. Vérification
```
1. Utilisateur clique "Vérifier"
2. Backend recalcule hash actuel
3. Compare avec hash original
4. Retourne résultat (valide/invalide)
```

---

## 📊 Schéma de Base de Données

```sql
-- Table des signatures avec hash
CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id UUID NOT NULL REFERENCES factures(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Hash du document
  hash_document VARCHAR(64) NOT NULL, -- SHA-256 = 64 caractères hex
  hash_algorithm VARCHAR(10) DEFAULT 'sha256',
  
  -- Hash de la signature
  signature_data TEXT NOT NULL,
  signature_algorithm VARCHAR(10) DEFAULT 'sha512',
  
  -- Métadonnées
  type_signature VARCHAR(20) NOT NULL,
  methode_signature VARCHAR(20) NOT NULL,
  horodatage TIMESTAMP NOT NULL,
  
  -- Certificat (optionnel)
  certificat_data TEXT,
  certificat_validite_debut TIMESTAMP,
  certificat_validite_fin TIMESTAMP,
  
  -- Statut
  statut VARCHAR(20) DEFAULT 'valide',
  date_revocation TIMESTAMP,
  raison_revocation TEXT,
  
  -- Audit
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_signatures_facture ON signatures(facture_id);
CREATE INDEX idx_signatures_hash ON signatures(hash_document);
CREATE INDEX idx_signatures_statut ON signatures(statut);
```

---

## ✅ Checklist d'Implémentation

- [ ] Installer les dépendances crypto (Node.js natif)
- [ ] Créer le service de hashage backend
- [ ] Créer le service de hashage frontend
- [ ] Implémenter le calcul de hash à la création de facture
- [ ] Implémenter le calcul de hash à la signature
- [ ] Implémenter la vérification d'intégrité
- [ ] Ajouter les tests unitaires
- [ ] Ajouter les tests d'intégration
- [ ] Documenter l'API
- [ ] Former les utilisateurs

---

## 🎓 Ressources Complémentaires

- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
- [SHA-256 Explained](https://en.wikipedia.org/wiki/SHA-2)
- [Digital Signatures](https://en.wikipedia.org/wiki/Digital_signature)

---

**Auteur** : Kiro AI Assistant  
**Date** : 2026-05-02  
**Version** : 1.0
