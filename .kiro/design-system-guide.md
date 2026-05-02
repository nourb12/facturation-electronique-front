# 🎨 TunisFlow Design System - Guide du Développeur

## 📚 Table des matières
1. [Introduction](#introduction)
2. [Boutons](#boutons)
3. [Cartes](#cartes)
4. [Badges](#badges)
5. [Inputs](#inputs)
6. [Modals](#modals)
7. [Tables](#tables)
8. [Couleurs](#couleurs)
9. [Espacements](#espacements)
10. [Animations](#animations)

---

## Introduction

Ce guide présente le système de design harmonisé de TunisFlow. Tous les composants sont définis dans `src/styles/_harmonized-components.scss` et sont automatiquement disponibles dans toute l'application.

### Principe de base
**NE JAMAIS redéfinir les composants de base dans les fichiers de composants.**  
Utilisez toujours les classes globales et leurs variantes.

---

## Boutons

### Bouton Primaire (Jaune EY)

```html
<!-- Standard -->
<button class="btn-primary">
  Enregistrer
</button>

<!-- Petit -->
<button class="btn-primary btn-primary--sm">
  OK
</button>

<!-- Grand -->
<button class="btn-primary btn-primary--lg">
  Commencer maintenant
</button>

<!-- Désactivé -->
<button class="btn-primary" disabled>
  Chargement...
</button>

<!-- Avec icône -->
<button class="btn-primary">
  <svg>...</svg>
  Ajouter
</button>
```

**Styles appliqués :**
- Padding standard : `10px 20px`
- Font-size : `13.5px`
- Background : `#FFE600`
- Hover : `#FFF176` + translateY(-1px)
- Transition : `260ms cubic-bezier(.16,1,.3,1)`

### Bouton Secondaire

```html
<button class="btn-secondary">
  Annuler
</button>
```

**Styles appliqués :**
- Padding : `10px 18px`
- Background : `var(--bg-card)`
- Border : `1px solid var(--b2)`

### Bouton Ghost (Fantôme)

```html
<!-- Standard -->
<button class="btn-ghost">
  Retour
</button>

<!-- Petit -->
<button class="btn-ghost btn-ghost--sm">
  Fermer
</button>
```

**Styles appliqués :**
- Padding : `9px 16px`
- Background : `transparent`
- Border : `1px solid var(--btn-ghost-border)`

### ❌ À NE PAS FAIRE

```scss
// ❌ MAUVAIS - Ne pas redéfinir dans votre composant
.btn-primary {
  padding: 12px 24px; // Différent du standard
  background: #FFD700; // Couleur différente
}
```

```html
<!-- ❌ MAUVAIS - Ne pas utiliser de styles inline -->
<button class="btn-primary" style="padding: 15px;">
  Bouton
</button>
```

### ✅ À FAIRE

```html
<!-- ✅ BON - Utiliser les classes globales -->
<button class="btn-primary">
  Bouton standard
</button>

<!-- ✅ BON - Utiliser les variantes -->
<button class="btn-primary btn-primary--lg">
  Grand bouton
</button>
```

---

## Cartes

### Carte Standard

```html
<!-- Carte de base -->
<div class="card">
  <h3>Titre</h3>
  <p>Contenu de la carte</p>
</div>

<!-- Petite carte -->
<div class="card card--sm">
  <p>Contenu compact</p>
</div>

<!-- Grande carte -->
<div class="card card--lg">
  <h2>Titre important</h2>
  <p>Beaucoup de contenu...</p>
</div>
```

**Styles appliqués :**
- Border-radius standard : `16px`
- Border-radius --sm : `12px`
- Border-radius --lg : `20px`
- Padding standard : `20px`
- Background : `var(--bg-card)`
- Border : `1px solid var(--b1)`

### Variantes de noms

Les classes suivantes sont équivalentes et utilisent le même style :
- `.card`
- `.box`
- `.content-card`
- `.panel-card`

```html
<!-- Toutes ces cartes ont le même style -->
<div class="card">...</div>
<div class="box">...</div>
<div class="content-card">...</div>
```

---

## Badges

### Types de badges

```html
<!-- Succès (vert) -->
<span class="badge badge--ok">Actif</span>

<!-- Avertissement (orange) -->
<span class="badge badge--warn">En attente</span>

<!-- Erreur (rouge) -->
<span class="badge badge--err">Échoué</span>

<!-- Information (bleu) -->
<span class="badge badge--info">Nouveau</span>

<!-- Neutre (gris) -->
<span class="badge badge--neutral">Brouillon</span>

<!-- EY (jaune) -->
<span class="badge badge--ey">Premium</span>
```

### Variantes

```html
<!-- Badge avec point indicateur -->
<span class="badge badge--ok badge--with-dot">
  En ligne
</span>

<!-- Badge large -->
<span class="badge badge--ok badge--lg">
  Statut important
</span>

<!-- Badge large avec dot -->
<span class="badge badge--ey badge--lg badge--with-dot">
  VIP Actif
</span>
```

### Adaptation Dark/Light Mode

Les badges s'adaptent automatiquement au thème :

**Mode Dark :**
- Couleurs vives pour le contraste
- `badge--ok` : #4ade80
- `badge--warn` : #fbbf24
- `badge--err` : #f87171
- `badge--info` : #60a5fa

**Mode Light :**
- Couleurs plus sombres pour le contraste
- `badge--ok` : #15803d
- `badge--warn` : #b45309
- `badge--err` : #b91c1c
- `badge--info` : #1d4ed8

---

## Inputs

### Input Standard

```html
<!-- Input de base -->
<input type="text" class="form-input" placeholder="Entrez votre nom">

<!-- Input avec état valide -->
<input type="email" class="form-input form-input--valid" value="email@example.com">

<!-- Input avec erreur -->
<input type="text" class="form-input form-input--error" value="Invalide">

<!-- Input désactivé -->
<input type="text" class="form-input" disabled value="Non modifiable">
```

**Styles appliqués :**
- Padding : `10px 14px`
- Font-size : `14px`
- Border-radius : `10px`
- Background : `var(--input-bg)`
- Border : `1px solid var(--input-border)`
- Focus : Border jaune EY + shadow

### Select

```html
<select class="form-select">
  <option>Option 1</option>
  <option>Option 2</option>
  <option>Option 3</option>
</select>
```

### Textarea

```html
<textarea class="form-input form-textarea" rows="4">
  Contenu du textarea
</textarea>
```

### Groupe de formulaire complet

```html
<div class="form-group">
  <label class="form-label">
    Nom complet
    <span class="form-req">*</span>
  </label>
  <input type="text" class="form-input" placeholder="Jean Dupont">
  <span class="field-error">Ce champ est requis</span>
</div>
```

---

## Modals

### Structure de base

```html
<div class="modal-overlay">
  <div class="modal-box">
    <div class="modal-header">
      <div>
        <h2 class="modal-title">Titre du modal</h2>
        <p class="modal-sub">Description optionnelle</p>
      </div>
      <button class="modal-close" (click)="closeModal()">
        ×
      </button>
    </div>
    
    <div class="modal-body">
      <!-- Contenu du modal -->
      <p>Contenu ici...</p>
    </div>
    
    <div class="modal-footer">
      <button class="btn-ghost" (click)="closeModal()">
        Annuler
      </button>
      <button class="btn-primary" (click)="confirm()">
        Confirmer
      </button>
    </div>
  </div>
</div>
```

**Styles appliqués :**
- Border-radius : `16px`
- Max-width : `540px`
- Animation : `scaleIn 280ms`
- Backdrop : `blur(6px)`

---

## Tables

### Table Standard

```html
<table class="tbl">
  <thead>
    <tr>
      <th>Nom</th>
      <th>Email</th>
      <th>Statut</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Jean Dupont</td>
      <td>jean@example.com</td>
      <td><span class="badge badge--ok">Actif</span></td>
      <td>
        <button class="btn-ghost btn-ghost--sm">Modifier</button>
      </td>
    </tr>
  </tbody>
</table>
```

**Styles appliqués :**
- Hover sur les lignes : `background: var(--table-row-hover)`
- Transition : `260ms`
- Border : `1px solid var(--table-border)`

---

## Couleurs

### Couleurs principales

```scss
// Accent EY
$ey: #FFE600
$ey-hover: #FFF176

// États
$ok: #22C55E    // Succès
$warn: #F59E0B  // Avertissement
$err: #EF4444   // Erreur
$info: #3B82F6  // Information
```

### Variables CSS

```scss
// Texte
var(--tp)  // Texte principal
var(--ts)  // Texte secondaire
var(--tt)  // Texte tertiaire
var(--tm)  // Texte muted

// Backgrounds
var(--bg-void)   // Fond principal
var(--bg-card)   // Fond des cartes
var(--bg-surf)   // Surface
var(--bg-depth)  // Profondeur

// Bordures
var(--b0)  // Bordure très légère
var(--b1)  // Bordure légère
var(--b2)  // Bordure standard
var(--b3)  // Bordure forte
```

---

## Espacements

### Padding des composants

```scss
// Boutons
Standard: 10px 20px
Small: 7px 16px
Large: 14px 28px

// Inputs
Standard: 10px 14px

// Cartes
Standard: 20px
Small: 16px
Large: 24px
```

### Border-radius

```scss
// Cartes
Standard: 16px
Small: 12px
Large: 20px

// Boutons et inputs
Standard: 10px

// Badges
Pill: 9999px
```

---

## Animations

### Transitions standard

```scss
// Transition de base
transition: all 260ms cubic-bezier(.16,1,.3,1);

// Transition rapide
transition: all 150ms cubic-bezier(.16,1,.3,1);

// Transition lente
transition: all 420ms cubic-bezier(.16,1,.3,1);
```

### Animations disponibles

```scss
@keyframes fadeIn { ... }
@keyframes scaleIn { ... }
@keyframes fadeUp { ... }
@keyframes slideLeft { ... }
@keyframes slideRight { ... }
```

### Utilisation

```html
<!-- Animation au chargement -->
<div class="card" style="animation: fadeIn 260ms ease both;">
  Contenu
</div>
```

---

## 🚫 Erreurs courantes à éviter

### 1. Redéfinir les composants de base

```scss
// ❌ MAUVAIS
.btn-primary {
  padding: 15px 30px; // Ne pas redéfinir
}
```

### 2. Utiliser des valeurs hardcodées

```scss
// ❌ MAUVAIS
.my-card {
  background: #1A2235; // Utiliser var(--bg-card)
  border: 1px solid #333; // Utiliser var(--b1)
}

// ✅ BON
.my-card {
  background: var(--bg-card);
  border: 1px solid var(--b1);
}
```

### 3. Mélanger les tailles

```html
<!-- ❌ MAUVAIS - Tailles incohérentes -->
<button class="btn-primary" style="padding: 12px 25px;">
  Bouton
</button>

<!-- ✅ BON - Utiliser les variantes -->
<button class="btn-primary btn-primary--lg">
  Bouton
</button>
```

### 4. Ignorer le mode dark/light

```scss
// ❌ MAUVAIS - Couleur fixe
.my-text {
  color: #FFFFFF; // Invisible en mode light
}

// ✅ BON - Variable adaptative
.my-text {
  color: var(--tp);
}
```

---

## ✅ Checklist avant de commit

- [ ] Aucune redéfinition de `.btn-primary`, `.btn-ghost`, `.btn-secondary`
- [ ] Aucune redéfinition de `.card`, `.box`, `.badge`
- [ ] Utilisation de `var(--*)` pour les couleurs
- [ ] Border-radius cohérents (16px pour cartes, 10px pour boutons)
- [ ] Transitions uniformes (260ms)
- [ ] Testé en mode dark ET light
- [ ] Testé sur mobile, tablet, desktop

---

## 📞 Support

Pour toute question sur le design system :
1. Consulter ce guide
2. Voir `src/styles/_harmonized-components.scss`
3. Lire `.kiro/harmonization-completed.md`

---

**Dernière mise à jour** : Avril 2026  
**Version** : 1.0.0
