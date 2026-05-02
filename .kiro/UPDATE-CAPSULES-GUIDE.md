# 🎨 Guide de Mise à Jour des Capsules de Rôle

**Date** : 2 Mai 2026  
**Objectif** : Uniformiser toutes les capsules de breadcrumb avec le nouveau design

---

## 📋 LISTE DES FICHIERS À METTRE À JOUR

### 1. Pages Admin (Bleu - `dt-bc--admin`)

| Fichier | Ligne | Ancien | Nouveau |
|---------|-------|--------|---------|
| `admin-dashboard.component.html` | 8 | `Vue d'ensemble admin` | `CONNEXION · ADMIN TOTAL` |
| `admin-utilisateurs.component.html` | 8 | `Gestion globale` | `CONNEXION · ADMIN TOTAL` |
| `admin-entreprises.component.html` | 9 | `Portefeuille plateforme` | `CONNEXION · ADMIN TOTAL` |
| `admin-factures.component.html` | 8 | `Vue globale plateforme` | `CONNEXION · ADMIN TOTAL` |
| `admin-parametres.component.html` | 8 | `Configuration plateforme` | `CONNEXION · ADMIN TOTAL` |
| `admin-audit.component.html` | 8 | `Suivi des actions admin` | `CONNEXION · ADMIN TOTAL` |
| `admin-demandes-kyc.component.html` | 7 | `Vérification et validation entreprises` | `CONNEXION · ADMIN TOTAL` |
| `admin-detail-kyc.component.html` | 14 | `{{ demande()?.raisonSociale \|\| '...' }}` | `CONNEXION · ADMIN TOTAL` |
| `admin-demo-requests.component.html` | 8 | `Gestion des démonstrations` | `CONNEXION · ADMIN TOTAL` |

**Code à appliquer** :
```html
<span class="dt-bc dt-bc--admin">CONNEXION · ADMIN TOTAL</span>
```

---

### 2. Pages Entreprise (Vert - `dt-bc--entreprise`)

| Fichier | Ligne | Ancien | Nouveau |
|---------|-------|--------|---------|
| `dashboard.component.html` | 9 | `Vue d'ensemble · {{ today }}` | `CONNEXION · RESPONSABLE ENTREPRISE` |
| `factures.component.html` | - | (À ajouter) | `CONNEXION · RESPONSABLE ENTREPRISE` |
| `clients.component.html` | - | (À ajouter) | `CONNEXION · RESPONSABLE ENTREPRISE` |
| `produits.component.html` | - | (À ajouter) | `CONNEXION · RESPONSABLE ENTREPRISE` |
| `categories.component.html` | - | (À ajouter) | `CONNEXION · RESPONSABLE ENTREPRISE` |
| `devis.component.html` | - | (À ajouter) | `CONNEXION · RESPONSABLE ENTREPRISE` |
| `avoirs.component.html` | - | (À ajouter) | `CONNEXION · RESPONSABLE ENTREPRISE` |
| `paiements.component.html` | - | (À ajouter) | `CONNEXION · RESPONSABLE ENTREPRISE` |
| `transactions.component.html` | - | (À ajouter) | `CONNEXION · RESPONSABLE ENTREPRISE` |
| `entreprise.component.html` | - | (À ajouter) | `CONNEXION · RESPONSABLE ENTREPRISE` |
| `profil.component.html` | - | (À ajouter) | `CONNEXION · RESPONSABLE ENTREPRISE` |

**Code à appliquer** :
```html
<span class="dt-bc dt-bc--entreprise">CONNEXION · RESPONSABLE ENTREPRISE</span>
```

---

### 3. Pages Financier (Orange - `dt-bc--financier`)

| Fichier | Ligne | Ancien | Nouveau |
|---------|-------|--------|---------|
| `utilisateurs.component.html` | - | (À ajouter) | `CONNEXION · RESPONSABLE FINANCIER` |
| `rapports.component.html` | - | (À ajouter) | `CONNEXION · RESPONSABLE FINANCIER` |

**Code à appliquer** :
```html
<span class="dt-bc dt-bc--financier">CONNEXION · RESPONSABLE FINANCIER</span>
```

---

## 🎨 EXEMPLES DE CODE

### Structure HTML Standard
```html
<header class="dash-topbar">
  <div class="dt-left">
    <div class="dt-title-block">
      <h1 class="dt-title">Titre de la page <em>mot clé</em></h1>
      <span class="dt-bc dt-bc--[ROLE]">CONNEXION · [RÔLE COMPLET]</span>
    </div>
  </div>
  <!-- ... -->
</header>
```

### Exemple Admin
```html
<h1 class="dt-title">Console <em>admin</em></h1>
<span class="dt-bc dt-bc--admin">CONNEXION · ADMIN TOTAL</span>
```

### Exemple Entreprise
```html
<h1 class="dt-title">Dashboard <em>entreprise</em></h1>
<span class="dt-bc dt-bc--entreprise">CONNEXION · RESPONSABLE ENTREPRISE</span>
```

### Exemple Financier
```html
<h1 class="dt-title">Accès <em>responsable financier</em></h1>
<span class="dt-bc dt-bc--financier">CONNEXION · RESPONSABLE FINANCIER</span>
```

---

## 🎨 CLASSES DISPONIBLES

| Classe | Couleur | Utilisation |
|--------|---------|-------------|
| `dt-bc--admin` | Bleu (#3B82F6) | Pages admin |
| `dt-bc--entreprise` | Vert (#22C55E) | Pages responsable entreprise |
| `dt-bc--financier` | Orange (#F59E0B) | Pages responsable financier |
| `dt-bc--kyc` | Violet (#8B5CF6) | Pages KYC/vérification |
| `dt-bc--demo` | Jaune EY (#FFE600) | Pages démo/public |
| `dt-bc--audit` | Rouge (#EF4444) | Pages audit/sécurité |

---

## 📐 DESIGN SPECS

### Capsule Standard
```scss
padding: 6px 16px;
border-radius: 999px;
font-size: 11px;
font-weight: 600;
letter-spacing: 0.08em;
text-transform: uppercase;
```

### Couleurs Mode Clair
```scss
background: rgba(COLOR, 0.08);
color: COLOR;
border: 1px solid rgba(COLOR, 0.15);
```

### Couleurs Mode Sombre
```scss
background: rgba(COLOR, 0.12);
color: COLOR_LIGHTER;
border: 1px solid rgba(COLOR, 0.20);
```

---

## ✅ CHECKLIST DE VÉRIFICATION

### Pour chaque page
- [ ] La capsule a la classe `dt-bc`
- [ ] La capsule a la classe de rôle appropriée (`dt-bc--admin`, etc.)
- [ ] Le texte est en MAJUSCULES
- [ ] Le format est `CONNEXION · [RÔLE]`
- [ ] Le séparateur est un point médian (·)

### Tests
- [ ] Vérifier en mode clair
- [ ] Vérifier en mode sombre
- [ ] Vérifier le hover
- [ ] Vérifier sur mobile
- [ ] Vérifier la cohérence entre toutes les pages du même rôle

---

## 🚀 SCRIPT DE REMPLACEMENT RAPIDE

### Rechercher
```
<span class="dt-bc">.*</span>
```

### Remplacer par (Admin)
```html
<span class="dt-bc dt-bc--admin">CONNEXION · ADMIN TOTAL</span>
```

### Remplacer par (Entreprise)
```html
<span class="dt-bc dt-bc--entreprise">CONNEXION · RESPONSABLE ENTREPRISE</span>
```

### Remplacer par (Financier)
```html
<span class="dt-bc dt-bc--financier">CONNEXION · RESPONSABLE FINANCIER</span>
```

---

## 📊 RÉSULTAT ATTENDU

### Avant
```
Console admin
Vue d'ensemble admin
```

### Après
```
Console admin
[CONNEXION · ADMIN TOTAL]  ← Capsule bleue stylisée
```

---

## 🎯 PRIORITÉS

1. **🔴 URGENT** : Pages Admin (9 fichiers)
2. **🟡 IMPORTANT** : Pages Entreprise (11 fichiers)
3. **🟢 NORMAL** : Pages Financier (2 fichiers)

---

**Temps estimé** : 30-45 minutes pour tout mettre à jour
