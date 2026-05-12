# 🔧 Guide de Correction des Traductions

## Comment Corriger les Chaînes Non Traduites

### Étape 1 : Ajouter les Clés de Traduction

#### Exemple 1 : Fichier `src/assets/i18n/fr/company.json`

```json
{
  "COMPANY": {
    "PROFILE_TITLE": "Profil fiscal de l'entreprise",
    "PROFILE_DESC": "Complétez les informations pour générer une identité fiscale conforme TEIF",
    "STEPS": {
      "IDENTITY": {
        "LABEL": "Identité",
        "TITLE": "Identité de l'entreprise",
        "SUBTITLE": "Renseignez les informations de base"
      },
      "COORDINATES": {
        "LABEL": "Coordonnées",
        "TITLE": "Coordonnées professionnelles",
        "SUBTITLE": "Contacts et localisation"
      },
      "FISCAL": {
        "LABEL": "Fiscal",
        "TITLE": "Informations fiscales",
        "SUBTITLE": "Éléments obligatoires TEIF"
      },
      "TEIF": {
        "LABEL": "Conformité TEIF",
        "TITLE": "Conformité TEIF",
        "SUBTITLE": "Activez les critères requis"
      }
    },
    "FIELDS": {
      "LEGAL_NAME": "Raison sociale",
      "COMMERCIAL_NAME": "Nom commercial",
      "LEGAL_FORM": "Forme juridique",
      "CAPITAL": "Capital social",
      "ACTIVITY_CODE": "Code d'activité",
      "ADDRESS": "Adresse",
      "GOVERNORATE": "Gouvernorat",
      "PHONE": "Téléphone",
      "EMAIL": "Email",
      "TAX_ID": "Matricule fiscal",
      "VAT_REGIME": "Régime TVA",
      "MAIN_VAT_RATE": "Taux TVA principal"
    }
  }
}
```

#### Exemple 2 : Fichier `src/assets/i18n/en/company.json`

```json
{
  "COMPANY": {
    "PROFILE_TITLE": "Company Tax Profile",
    "PROFILE_DESC": "Complete the information to generate a TEIF-compliant tax identity",
    "STEPS": {
      "IDENTITY": {
        "LABEL": "Identity",
        "TITLE": "Company Identity",
        "SUBTITLE": "Enter basic information"
      },
      "COORDINATES": {
        "LABEL": "Coordinates",
        "TITLE": "Professional Coordinates",
        "SUBTITLE": "Contact and location"
      },
      "FISCAL": {
        "LABEL": "Fiscal",
        "TITLE": "Tax Information",
        "SUBTITLE": "Required TEIF elements"
      },
      "TEIF": {
        "LABEL": "TEIF Compliance",
        "TITLE": "TEIF Compliance",
        "SUBTITLE": "Activate required criteria"
      }
    },
    "FIELDS": {
      "LEGAL_NAME": "Legal Name",
      "COMMERCIAL_NAME": "Commercial Name",
      "LEGAL_FORM": "Legal Form",
      "CAPITAL": "Capital",
      "ACTIVITY_CODE": "Activity Code",
      "ADDRESS": "Address",
      "GOVERNORATE": "Governorate",
      "PHONE": "Phone",
      "EMAIL": "Email",
      "TAX_ID": "Tax ID",
      "VAT_REGIME": "VAT Regime",
      "MAIN_VAT_RATE": "Main VAT Rate"
    }
  }
}
```

#### Exemple 3 : Fichier `src/assets/i18n/ar/company.json`

```json
{
  "COMPANY": {
    "PROFILE_TITLE": "الملف الضريبي للشركة",
    "PROFILE_DESC": "أكمل المعلومات لإنشاء هوية ضريبية متوافقة مع TEIF",
    "STEPS": {
      "IDENTITY": {
        "LABEL": "الهوية",
        "TITLE": "هوية الشركة",
        "SUBTITLE": "أدخل المعلومات الأساسية"
      },
      "COORDINATES": {
        "LABEL": "الإحداثيات",
        "TITLE": "الإحداثيات المهنية",
        "SUBTITLE": "جهات الاتصال والموقع"
      },
      "FISCAL": {
        "LABEL": "الضريبي",
        "TITLE": "المعلومات الضريبية",
        "SUBTITLE": "عناصر TEIF المطلوبة"
      },
      "TEIF": {
        "LABEL": "توافق TEIF",
        "TITLE": "توافق TEIF",
        "SUBTITLE": "تفعيل المعايير المطلوبة"
      }
    },
    "FIELDS": {
      "LEGAL_NAME": "الاسم القانوني",
      "COMMERCIAL_NAME": "الاسم التجاري",
      "LEGAL_FORM": "الشكل القانوني",
      "CAPITAL": "رأس المال",
      "ACTIVITY_CODE": "رمز النشاط",
      "ADDRESS": "العنوان",
      "GOVERNORATE": "الولاية",
      "PHONE": "الهاتف",
      "EMAIL": "البريد الإلكتروني",
      "TAX_ID": "الرقم الضريبي",
      "VAT_REGIME": "نظام ضريبة القيمة المضافة",
      "MAIN_VAT_RATE": "معدل ضريبة القيمة المضافة الرئيسي"
    }
  }
}
```

---

### Étape 2 : Corriger le Composant TypeScript

#### AVANT (❌ Hardcoded)
```typescript
// src/app/pages/entreprise/entreprise.component.ts
export class EntrepriseComponent {
  steps = [
    { key: 'identite', label: 'Identite', title: "Identite de l'entreprise", subtitle: 'Renseignez les informations de base', required: ['raisonSociale', 'forme', 'activiteCode'] },
    { key: 'coordonnees', label: 'Coordonnees', title: 'Coordonnees professionnelles', subtitle: 'Contacts et localisation', required: ['adresse', 'gouvernorat', 'telephone', 'email'] },
    { key: 'fiscal', label: 'Fiscal', title: 'Informations fiscales', subtitle: 'Elements obligatoires TEIF', required: ['matriculeFiscal', 'regimeTVA', 'tauxTVAPrincipal'] },
    { key: 'teif', label: 'Conformite TEIF', title: 'Conformite TEIF', subtitle: 'Activez les criteres requis', required: [] }
  ];
}
```

#### APRÈS (✅ Traduit)
```typescript
// src/app/pages/entreprise/entreprise.component.ts
import { TranslateService } from '@ngx-translate/core';

export class EntrepriseComponent implements OnInit {
  steps: any[] = [];

  constructor(private translate: TranslateService) {}

  ngOnInit() {
    this.loadSteps();
    // Recharger les steps quand la langue change
    this.translate.onLangChange.subscribe(() => this.loadSteps());
  }

  private loadSteps() {
    this.steps = [
      {
        key: 'identite',
        label: this.translate.instant('COMPANY.STEPS.IDENTITY.LABEL'),
        title: this.translate.instant('COMPANY.STEPS.IDENTITY.TITLE'),
        subtitle: this.translate.instant('COMPANY.STEPS.IDENTITY.SUBTITLE'),
        required: ['raisonSociale', 'forme', 'activiteCode']
      },
      {
        key: 'coordonnees',
        label: this.translate.instant('COMPANY.STEPS.COORDINATES.LABEL'),
        title: this.translate.instant('COMPANY.STEPS.COORDINATES.TITLE'),
        subtitle: this.translate.instant('COMPANY.STEPS.COORDINATES.SUBTITLE'),
        required: ['adresse', 'gouvernorat', 'telephone', 'email']
      },
      {
        key: 'fiscal',
        label: this.translate.instant('COMPANY.STEPS.FISCAL.LABEL'),
        title: this.translate.instant('COMPANY.STEPS.FISCAL.TITLE'),
        subtitle: this.translate.instant('COMPANY.STEPS.FISCAL.SUBTITLE'),
        required: ['matriculeFiscal', 'regimeTVA', 'tauxTVAPrincipal']
      },
      {
        key: 'teif',
        label: this.translate.instant('COMPANY.STEPS.TEIF.LABEL'),
        title: this.translate.instant('COMPANY.STEPS.TEIF.TITLE'),
        subtitle: this.translate.instant('COMPANY.STEPS.TEIF.SUBTITLE'),
        required: []
      }
    ];
  }
}
```

---

### Étape 3 : Corriger le Template HTML

#### AVANT (❌ Hardcoded)
```html
<!-- src/app/pages/entreprise/entreprise.component.html -->
<header class="topbar">
  <div class="topbar-left">
    <div>
      <h1 class="topbar-title">Profil fiscal de l'entreprise</h1>
      <span class="topbar-bc">Completez les informations pour generer une identite fiscale conforme TEIF</span>
    </div>
  </div>
</header>

<div class="form-head">
  <div class="form-head-left">
    <div class="step-kicker">Etape {{ activeStepIndex + 1 }} / 4</div>
    <div class="step-title">{{ steps[activeStepIndex].title }}</div>
    <div class="step-sub">{{ steps[activeStepIndex].subtitle }}</div>
  </div>
</div>

<div class="section-card">
  <div class="section-head">
    <div class="section-title">Identite</div>
    <div class="section-hint">Informations principales de l'entreprise</div>
  </div>
  <div class="field-grid">
    <div class="field field--critical">
      <label class="field-label">Raison sociale <span class="req">*</span></label>
      <input class="field-input" type="text" placeholder="Ex: EY Mizenia"
        [(ngModel)]="entreprise.raisonSociale"
        (ngModelChange)="onFieldChange('raisonSociale')" />
    </div>
  </div>
</div>
```

#### APRÈS (✅ Traduit)
```html
<!-- src/app/pages/entreprise/entreprise.component.html -->
<header class="topbar">
  <div class="topbar-left">
    <div>
      <h1 class="topbar-title">{{ 'COMPANY.PROFILE_TITLE' | translate }}</h1>
      <span class="topbar-bc">{{ 'COMPANY.PROFILE_DESC' | translate }}</span>
    </div>
  </div>
</header>

<div class="form-head">
  <div class="form-head-left">
    <div class="step-kicker">{{ 'COMMON.STEP' | translate: { current: activeStepIndex + 1, total: 4 } }}</div>
    <div class="step-title">{{ steps[activeStepIndex].title }}</div>
    <div class="step-sub">{{ steps[activeStepIndex].subtitle }}</div>
  </div>
</div>

<div class="section-card">
  <div class="section-head">
    <div class="section-title">{{ 'COMPANY.STEPS.IDENTITY.LABEL' | translate }}</div>
    <div class="section-hint">{{ 'COMPANY.STEPS.IDENTITY.SUBTITLE' | translate }}</div>
  </div>
  <div class="field-grid">
    <div class="field field--critical">
      <label class="field-label">{{ 'COMPANY.FIELDS.LEGAL_NAME' | translate }} <span class="req">*</span></label>
      <input class="field-input" type="text" [placeholder]="'COMPANY.PLACEHOLDER_LEGAL_NAME' | translate"
        [(ngModel)]="entreprise.raisonSociale"
        (ngModelChange)="onFieldChange('raisonSociale')" />
    </div>
  </div>
</div>
```

---

### Étape 4 : Corriger les Templates de Documents

#### AVANT (❌ Hardcoded)
```html
<!-- templates/paiement-ticket.html -->
<div class="invoice-title">REÇU</div>
<div class="status-badge">✓ PAYÉ</div>
<div class="party-title">DE:</div>
<div class="party-title">À:</div>
<div class="payment-row"><span>Facture:</span></div>
<div class="payment-row"><span>Mode:</span></div>
<div class="payment-row"><span>Réf:</span></div>
<div class="payment-row"><span>Date:</span></div>
<div class="payment-row amount"><span>MONTANT</span></div>
<div class="footer">Reçu de paiement<br>Document non contractuel<br>Merci</div>
```

#### APRÈS (✅ Dynamique avec i18n)
```typescript
// Créer un service pour les templates
// src/app/core/services/document-template.service.ts

import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class DocumentTemplateService {
  constructor(private translate: TranslateService) {}

  getPaymentTicketLabels() {
    return {
      title: this.translate.instant('DOCUMENTS.PAYMENT_RECEIPT.TITLE'),
      status: this.translate.instant('DOCUMENTS.PAYMENT_RECEIPT.STATUS_PAID'),
      from: this.translate.instant('DOCUMENTS.PAYMENT_RECEIPT.FROM'),
      to: this.translate.instant('DOCUMENTS.PAYMENT_RECEIPT.TO'),
      invoice: this.translate.instant('DOCUMENTS.PAYMENT_RECEIPT.INVOICE'),
      method: this.translate.instant('DOCUMENTS.PAYMENT_RECEIPT.METHOD'),
      reference: this.translate.instant('DOCUMENTS.PAYMENT_RECEIPT.REFERENCE'),
      date: this.translate.instant('DOCUMENTS.PAYMENT_RECEIPT.DATE'),
      amount: this.translate.instant('DOCUMENTS.PAYMENT_RECEIPT.AMOUNT'),
      footer: this.translate.instant('DOCUMENTS.PAYMENT_RECEIPT.FOOTER'),
      disclaimer: this.translate.instant('DOCUMENTS.PAYMENT_RECEIPT.DISCLAIMER'),
      thanks: this.translate.instant('DOCUMENTS.PAYMENT_RECEIPT.THANKS')
    };
  }
}
```

```html
<!-- templates/paiement-ticket.html (dynamique) -->
<div class="invoice-title">{{ labels.title }}</div>
<div class="status-badge">✓ {{ labels.status }}</div>
<div class="party-title">{{ labels.from }}:</div>
<div class="party-title">{{ labels.to }}:</div>
<div class="payment-row"><span>{{ labels.invoice }}:</span></div>
<div class="payment-row"><span>{{ labels.method }}:</span></div>
<div class="payment-row"><span>{{ labels.reference }}:</span></div>
<div class="payment-row"><span>{{ labels.date }}:</span></div>
<div class="payment-row amount"><span>{{ labels.amount }}</span></div>
<div class="footer">
  {{ labels.footer }}<br>
  {{ labels.disclaimer }}<br>
  {{ labels.thanks }}
</div>
```

---

## 📋 Checklist de Correction

### Pour chaque composant/template :

- [ ] Identifier toutes les chaînes hardcodées
- [ ] Créer les clés i18n dans `src/assets/i18n/fr/`
- [ ] Ajouter les traductions en anglais dans `src/assets/i18n/en/`
- [ ] Ajouter les traductions en arabe dans `src/assets/i18n/ar/`
- [ ] Injecter `TranslateService` si nécessaire
- [ ] Remplacer les chaînes par `translate.instant()` ou `| translate`
- [ ] Tester avec les 3 langues
- [ ] Vérifier le RTL pour l'arabe

---

## 🧪 Tests

### Test 1 : Vérifier que toutes les langues fonctionnent
```typescript
// Dans le composant
ngOnInit() {
  this.translate.setDefaultLanguage('fr');
  this.translate.use('fr'); // Français
  // Vérifier que le texte s'affiche en français
  
  this.translate.use('en'); // Anglais
  // Vérifier que le texte s'affiche en anglais
  
  this.translate.use('ar'); // Arabe
  // Vérifier que le texte s'affiche en arabe et RTL
}
```

### Test 2 : Vérifier le changement de langue dynamique
```typescript
// Cliquer sur le sélecteur de langue
// Vérifier que tout le contenu se met à jour
```

### Test 3 : Vérifier les templates de documents
```typescript
// Générer un PDF en français
// Générer un PDF en anglais
// Générer un PDF en arabe
// Vérifier que les labels sont corrects
```

---

## 🚀 Commandes Utiles

### Chercher les chaînes hardcodées
```bash
# Chercher les chaînes en français dans les fichiers TypeScript
grep -r "label.*:" src/app --include="*.ts" | grep -v "translate"

# Chercher les chaînes en français dans les templates
grep -r ">" src/app --include="*.html" | grep -v "translate" | grep -v "i18n"
```

### Valider les traductions
```bash
# Vérifier que toutes les clés existent dans les 3 langues
npm run validate:i18n
```

---

## 📚 Ressources

- **ngx-translate:** https://github.com/ngx-translate/core
- **Guide i18n Angular:** https://angular.io/guide/i18n
- **Traduction RTL:** https://material.angular.io/guide/using-component-harnesses

---

**Dernière mise à jour:** 12 Mai 2026
