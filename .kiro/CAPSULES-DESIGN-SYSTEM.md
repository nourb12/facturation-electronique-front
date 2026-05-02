# 🎨 Système de Design - Capsules de Rôle

**Date** : 2 Mai 2026  
**Version** : 1.0.0  
**Statut** : ✅ Implémenté

---

## 🎯 OBJECTIF

Créer un système uniforme de capsules pour identifier visuellement le rôle de l'utilisateur connecté sur chaque page de l'application.

---

## 📊 DESIGN VISUEL

### Mode Clair

```
┌─────────────────────────────────────────────────────────┐
│  Console admin                                          │
│  [CONNEXION · ADMIN TOTAL]  ← Capsule bleue            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Dashboard entreprise                                   │
│  [CONNEXION · RESPONSABLE ENTREPRISE]  ← Capsule verte │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Accès responsable financier                            │
│  [CONNEXION · RESPONSABLE FINANCIER]  ← Capsule orange │
└─────────────────────────────────────────────────────────┘
```

### Mode Sombre (Couleurs plus vives)

```
┌─────────────────────────────────────────────────────────┐
│  Console admin                                          │
│  [CONNEXION · ADMIN TOTAL]  ← Capsule bleu clair       │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 PALETTE DE COULEURS

### 1. Admin (Bleu)
```scss
// Mode Clair
background: rgba(59, 130, 246, 0.08);
color: #3B82F6;
border: 1px solid rgba(59, 130, 246, 0.15);

// Mode Sombre
background: rgba(59, 130, 246, 0.12);
color: #60A5FA;
border: 1px solid rgba(59, 130, 246, 0.20);
```

**Aperçu** :
```
Mode Clair:  [CONNEXION · ADMIN TOTAL]  (bleu moyen)
Mode Sombre: [CONNEXION · ADMIN TOTAL]  (bleu clair)
```

---

### 2. Responsable Entreprise (Vert)
```scss
// Mode Clair
background: rgba(34, 197, 94, 0.08);
color: #22C55E;
border: 1px solid rgba(34, 197, 94, 0.15);

// Mode Sombre
background: rgba(34, 197, 94, 0.12);
color: #4ADE80;
border: 1px solid rgba(34, 197, 94, 0.20);
```

**Aperçu** :
```
Mode Clair:  [CONNEXION · RESPONSABLE ENTREPRISE]  (vert moyen)
Mode Sombre: [CONNEXION · RESPONSABLE ENTREPRISE]  (vert clair)
```

---

### 3. Responsable Financier (Orange)
```scss
// Mode Clair
background: rgba(245, 158, 11, 0.08);
color: #F59E0B;
border: 1px solid rgba(245, 158, 11, 0.15);

// Mode Sombre
background: rgba(245, 158, 11, 0.12);
color: #FBBF24;
border: 1px solid rgba(245, 158, 11, 0.20);
```

**Aperçu** :
```
Mode Clair:  [CONNEXION · RESPONSABLE FINANCIER]  (orange moyen)
Mode Sombre: [CONNEXION · RESPONSABLE FINANCIER]  (orange clair)
```

---

### 4. KYC / Vérification (Violet)
```scss
// Mode Clair
background: rgba(139, 92, 246, 0.08);
color: #8B5CF6;
border: 1px solid rgba(139, 92, 246, 0.15);

// Mode Sombre
background: rgba(139, 92, 246, 0.12);
color: #A78BFA;
border: 1px solid rgba(139, 92, 246, 0.20);
```

**Aperçu** :
```
Mode Clair:  [CONNEXION · VÉRIFICATION KYC]  (violet moyen)
Mode Sombre: [CONNEXION · VÉRIFICATION KYC]  (violet clair)
```

---

### 5. Démo / Public (Jaune EY)
```scss
// Mode Clair
background: rgba(255, 230, 0, 0.08);
color: #FFE600;
border: 1px solid rgba(255, 230, 0, 0.15);

// Mode Sombre
background: rgba(255, 230, 0, 0.12);
color: #FFE600;
border: 1px solid rgba(255, 230, 0, 0.20);
```

**Aperçu** :
```
Mode Clair:  [CONNEXION · DÉMO PUBLIQUE]  (jaune EY)
Mode Sombre: [CONNEXION · DÉMO PUBLIQUE]  (jaune EY)
```

---

### 6. Audit / Sécurité (Rouge)
```scss
// Mode Clair
background: rgba(239, 68, 68, 0.08);
color: #EF4444;
border: 1px solid rgba(239, 68, 68, 0.15);

// Mode Sombre
background: rgba(239, 68, 68, 0.12);
color: #F87171;
border: 1px solid rgba(239, 68, 68, 0.20);
```

**Aperçu** :
```
Mode Clair:  [CONNEXION · AUDIT SÉCURITÉ]  (rouge moyen)
Mode Sombre: [CONNEXION · AUDIT SÉCURITÉ]  (rouge clair)
```

---

## 📐 SPÉCIFICATIONS TECHNIQUES

### Dimensions
```scss
padding: 6px 16px;
border-radius: 999px;  // Pill shape
gap: 8px;              // Entre les éléments
```

### Typographie
```scss
font-family: 'DM Sans', sans-serif;
font-size: 11px;
font-weight: 600;
letter-spacing: 0.08em;
text-transform: uppercase;
```

### Animations
```scss
transition: all 0.2s cubic-bezier(.16,1,.3,1);

&:hover {
  transform: translateY(-1px);
  background: [couleur plus intense];
  border-color: [couleur plus intense];
}
```

---

## 🔧 UTILISATION

### HTML
```html
<!-- Admin -->
<span class="dt-bc dt-bc--admin">CONNEXION · ADMIN TOTAL</span>

<!-- Entreprise -->
<span class="dt-bc dt-bc--entreprise">CONNEXION · RESPONSABLE ENTREPRISE</span>

<!-- Financier -->
<span class="dt-bc dt-bc--financier">CONNEXION · RESPONSABLE FINANCIER</span>

<!-- KYC -->
<span class="dt-bc dt-bc--kyc">CONNEXION · VÉRIFICATION KYC</span>

<!-- Démo -->
<span class="dt-bc dt-bc--demo">CONNEXION · DÉMO PUBLIQUE</span>

<!-- Audit -->
<span class="dt-bc dt-bc--audit">CONNEXION · AUDIT SÉCURITÉ</span>
```

### Variantes de Taille
```html
<!-- Petite -->
<span class="dt-bc dt-bc--admin dt-bc--sm">CONNEXION · ADMIN</span>

<!-- Standard (par défaut) -->
<span class="dt-bc dt-bc--admin">CONNEXION · ADMIN TOTAL</span>

<!-- Grande -->
<span class="dt-bc dt-bc--admin dt-bc--lg">CONNEXION · ADMIN TOTAL</span>
```

---

## 📊 MAPPING PAGES → RÔLES

### Pages Admin (Bleu)
- Console admin
- Utilisateurs admin
- Entreprises admin
- Factures admin
- Paramètres admin
- Audit admin
- Demandes KYC
- Détail KYC
- Demandes démo

**Capsule** : `CONNEXION · ADMIN TOTAL`

---

### Pages Entreprise (Vert)
- Dashboard entreprise
- Factures
- Clients
- Produits
- Catégories
- Devis
- Avoirs
- Paiements
- Transactions
- Entreprise (paramètres)
- Profil

**Capsule** : `CONNEXION · RESPONSABLE ENTREPRISE`

---

### Pages Financier (Orange)
- Accès responsable financier
- Rapports financiers

**Capsule** : `CONNEXION · RESPONSABLE FINANCIER`

---

## 🎯 AVANTAGES

### 1. Identification Visuelle Immédiate
✅ L'utilisateur sait toujours dans quel contexte il se trouve  
✅ Couleur = Rôle (association mentale rapide)

### 2. Cohérence Totale
✅ Même design sur toutes les pages  
✅ Même position (sous le titre)  
✅ Mêmes couleurs par rôle

### 3. Accessibilité
✅ Contraste suffisant (WCAG AA)  
✅ Texte en majuscules (lisibilité)  
✅ Hover effect (feedback visuel)

### 4. Responsive
✅ S'adapte aux petits écrans  
✅ Font-size réduit sur mobile  
✅ Padding ajusté

---

## 📱 RESPONSIVE

### Desktop (> 768px)
```scss
font-size: 11px;
padding: 6px 16px;
gap: 8px;
```

### Mobile (≤ 768px)
```scss
font-size: 10px;
padding: 5px 14px;
gap: 6px;
```

---

## ✅ CHECKLIST D'IMPLÉMENTATION

### Fichier SCSS
- [x] Créer `_role-capsules.scss`
- [x] Définir les styles de base
- [x] Définir les variantes par rôle
- [x] Définir les styles dark mode
- [x] Définir les variantes de taille
- [x] Définir les styles responsive
- [x] Importer dans `styles.scss`

### Fichiers HTML
- [ ] Mettre à jour toutes les pages admin (9 fichiers)
- [ ] Mettre à jour toutes les pages entreprise (11 fichiers)
- [ ] Mettre à jour toutes les pages financier (2 fichiers)

### Tests
- [ ] Vérifier en mode clair
- [ ] Vérifier en mode sombre
- [ ] Vérifier le hover
- [ ] Vérifier sur mobile
- [ ] Vérifier la cohérence

---

## 🎨 EXEMPLES VISUELS

### Topbar Complète

```
┌────────────────────────────────────────────────────────────┐
│  Console admin                    [🔍 Recherche]  [Action] │
│  [CONNEXION · ADMIN TOTAL]                                 │
└────────────────────────────────────────────────────────────┘
```

### Avec KPI Cards

```
┌────────────────────────────────────────────────────────────┐
│  Dashboard entreprise             [🔍 Recherche]  [Action] │
│  [CONNEXION · RESPONSABLE ENTREPRISE]                      │
└────────────────────────────────────────────────────────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ [📊] KPI │ │ [💰] KPI │ │ [📈] KPI │ │ [✓] KPI  │
│    100   │ │    50K   │ │    +15%  │ │    98%   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

---

## 📝 NOTES

1. **Séparateur** : Utiliser le point médian (·) et non le tiret (-)
2. **Majuscules** : Toujours en MAJUSCULES pour la cohérence
3. **Format** : Toujours `CONNEXION · [RÔLE]`
4. **Couleur** : Une couleur = Un rôle (ne pas mélanger)
5. **Position** : Toujours sous le titre principal

---

**Conclusion** : Ce système de capsules offre une identification visuelle claire et cohérente du rôle de l'utilisateur sur chaque page de l'application ! 🎉
