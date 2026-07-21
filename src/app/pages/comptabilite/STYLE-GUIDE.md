# 📋 Guide de Style - Comptabilité

## Vue d'ensemble

Ce guide définit les standards de style pour tous les composants de la section comptabilité. L'objectif est de garantir une cohérence visuelle et une expérience utilisateur harmonieuse.

---

## 📦 Structure des fichiers

```
comptabilite/
├── _comptabilite-tokens.scss       # Tokens partagés (couleurs, espacements, etc.)
├── _comptabilite-components.scss   # Composants standardisés
├── STYLE-GUIDE.md                  # Ce fichier
├── comptabilite/
│   └── comptabilite.component.scss
├── taxes/
│   └── taxes.component.scss
├── tresorerie/
│   └── tresorerie.component.scss
├── declarations/
│   └── declarations.component.scss
├── parametres-fiscaux/
│   └── parametres-fiscaux.component.scss
└── retenue-source/
    └── retenue-source.component.scss
```

---

## 🎨 Tokens de Design

### Typographie

```scss
$fd: 'DM Sans', sans-serif;  // Titres
$fb: 'DM Sans', sans-serif;               // Corps de texte
$fm: 'JetBrains Mono', monospace;         // Nombres et codes
```

### Tailles de police

| Variable | Valeur | Utilisation |
|----------|--------|-------------|
| `$font-xs` | 10px | Labels, badges |
| `$font-sm` | 11px | Texte petit |
| `$font-base` | 12px | Texte standard |
| `$font-md` | 12.5px | Texte standard |
| `$font-lg` | 13px | Boutons, labels |
| `$font-xl` | 14px | Sous-titres |
| `$font-2xl` | 15px | Titres de section |
| `$font-3xl` | 16px | Titres de panneau |
| `$font-4xl` | 18px | Nombres importants |

### Poids de police

| Variable | Valeur | Utilisation |
|----------|--------|-------------|
| `$weight-normal` | 400 | Texte régulier |
| `$weight-medium` | 500 | Texte moyen |
| `$weight-semibold` | 600 | Texte semi-gras |
| `$weight-bold` | 700 | Texte gras |
| `$weight-extrabold` | 800 | Titres |
| `$weight-black` | 900 | Titres forts |

### Couleurs

#### Primaires
- `$tuniflow`: #FFE600 (jaune EY)
- `$tuniflow-dim`: rgba(255, 230, 0, .08)
- `$tuniflow-soft`: rgba(255, 230, 0, .14)
- `$tuniflow-glow`: rgba(255, 230, 0, .22)
- `$tuniflow-text`: #0A0A0A (texte sur jaune)

#### Statuts
- `$ok`: #22C55E (vert)
- `$warn`: #F59E0B (orange)
- `$err`: #EF4444 (rouge)
- `$info`: #3B82F6 (bleu)

#### Fonds
- `$void`: Arrière-plan principal
- `$surf`: Surface secondaire
- `$card`: Cartes et panneaux
- `$edge`: Bordures légères
- `$depth`: Profondeur

#### Texte
- `$tp`: Texte primaire
- `$ts`: Texte secondaire
- `$tt`: Texte tertiaire

### Espacements

| Variable | Valeur | Utilisation |
|----------|--------|-------------|
| `$space-xs` | 4px | Très petit |
| `$space-sm` | 8px | Petit |
| `$space-md` | 12px | Standard |
| `$space-lg` | 16px | Large |
| `$space-xl` | 20px | Très large |
| `$space-2xl` | 24px | Extra large |
| `$space-3xl` | 28px | Énorme |
| `$space-4xl` | 32px | Maximal |

### Border-radius

| Variable | Valeur | Utilisation |
|----------|--------|-------------|
| `$radius-sm` | 8px | Petits éléments |
| `$radius-md` | 10px | Boutons, inputs |
| `$radius-lg` | 12px | Cartes petites |
| `$radius-xl` | 14px | Cartes moyennes |
| `$radius-2xl` | 16px | Cartes grandes |
| `$radius-full` | 999px | Badges, pills |

### Transitions

| Variable | Valeur | Utilisation |
|----------|--------|-------------|
| `$transition-fast` | 150ms | Interactions rapides |
| `$transition-base` | 260ms | Transitions standard |
| `$transition-slow` | 420ms | Animations lentes |

---

## 🔘 Composants

### Boutons

#### Bouton primaire
```html
<button class="btn-primary">Action principale</button>
```

**Variantes:**
- `.btn-primary--sm`: Petit bouton
- `.btn-primary--lg`: Grand bouton

#### Bouton secondaire
```html
<button class="btn-secondary">Action secondaire</button>
```

#### Bouton fantôme
```html
<button class="btn-ghost">Action légère</button>
```

#### Bouton icône
```html
<button class="btn-icon">
  <svg>...</svg>
</button>
```

### Cartes

```html
<div class="card">
  <div class="card-header">
    <h2>Titre</h2>
    <p>Description</p>
  </div>
  <div class="card-body">
    Contenu
  </div>
  <div class="card-footer">
    Actions
  </div>
</div>
```

### Badges

```html
<span class="badge">Défaut</span>
<span class="badge badge--ok">Succès</span>
<span class="badge badge--warn">Attention</span>
<span class="badge badge--err">Erreur</span>
<span class="badge badge--info">Info</span>
```

### Inputs

```html
<input class="input-field" type="text" placeholder="Texte">
<input class="input-field input-field--sm" type="text">
<input class="input-field input-field--lg" type="text">
<input class="input-field input-field--error" type="text">
```

### Tables

```html
<div class="table-wrapper">
  <table class="table">
    <thead>
      <tr>
        <th>Colonne 1</th>
        <th>Colonne 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Données</td>
        <td>Données</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Modales

```html
<div class="modal-overlay">
  <div class="modal">
    <div class="modal-header">
      <h2>Titre</h2>
      <p>Description</p>
    </div>
    <div class="modal-body">
      Contenu
    </div>
    <div class="modal-footer">
      <button class="btn-ghost">Annuler</button>
      <button class="btn-primary">Confirmer</button>
    </div>
  </div>
</div>
```

### Formulaires

```html
<form>
  <div class="form-group">
    <label class="label">
      Champ
      <span class="required">*</span>
    </label>
    <input class="input-field" type="text">
  </div>

  <div class="form-row">
    <div class="form-group">
      <label class="label">Champ 1</label>
      <input class="input-field" type="text">
    </div>
    <div class="form-group">
      <label class="label">Champ 2</label>
      <input class="input-field" type="text">
    </div>
  </div>

  <div class="form-error">
    Message d'erreur
  </div>
</form>
```

---

## 📐 Grilles

### Grille 4 colonnes
```html
<div class="grid-4">
  <div>Élément 1</div>
  <div>Élément 2</div>
  <div>Élément 3</div>
  <div>Élément 4</div>
</div>
```

### Grille 3 colonnes
```html
<div class="grid-3">
  <div>Élément 1</div>
  <div>Élément 2</div>
  <div>Élément 3</div>
</div>
```

### Grille 2 colonnes
```html
<div class="grid-2">
  <div>Élément 1</div>
  <div>Élément 2</div>
</div>
```

---

## 🎯 Utilisation dans les composants

### Importer les tokens et composants

```scss
@use '../_comptabilite-tokens' as *;
@use '../_comptabilite-components' as *;
```

### Utiliser les variables

```scss
.mon-composant {
  padding: $space-lg;
  background: $card;
  border: 1px solid $b1;
  border-radius: $radius-md;
  color: $tp;
  font-family: $fb;
  font-size: $font-lg;
  font-weight: $weight-semibold;
  transition: all $transition-base;

  &:hover {
    border-color: $tuniflow-glow;
    transform: translateY(-2px);
    box-shadow: $shadow-md;
  }
}
```

### Utiliser les mixins

```scss
.mon-bouton {
  @include flex-center;
  @include hover-lift;
  gap: $space-sm;
  padding: $space-md $space-lg;
}

.ma-grille {
  @include responsive-grid(3, 2, 1);
}

.mon-texte {
  @include truncate;
}
```

---

## 📱 Responsive Design

### Breakpoints

| Variable | Valeur | Utilisation |
|----------|--------|-------------|
| `$bp-sm` | 640px | Petits écrans |
| `$bp-md` | 768px | Tablettes |
| `$bp-lg` | 1024px | Ordinateurs |
| `$bp-xl` | 1280px | Grands écrans |
| `$bp-2xl` | 1536px | Très grands écrans |

### Exemple

```scss
.mon-composant {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $space-lg;

  @media (max-width: $bp-lg) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: $bp-md) {
    grid-template-columns: 1fr;
  }
}
```

---

## ✅ Checklist de conformité

Avant de soumettre un composant, vérifiez:

- [ ] Utilise les tokens de `_comptabilite-tokens.scss`
- [ ] Utilise les composants de `_comptabilite-components.scss`
- [ ] Pas de couleurs hardcodées (sauf cas exceptionnels)
- [ ] Pas de tailles de police hardcodées
- [ ] Pas d'espacements hardcodés
- [ ] Utilise les transitions standardisées
- [ ] Responsive sur tous les breakpoints
- [ ] Cohérent avec les autres composants
- [ ] Accessible (contraste, labels, etc.)
- [ ] Pas de duplication de code

---

## 🔄 Mise à jour des tokens

Si vous devez ajouter un nouveau token:

1. Ajoutez-le dans `_comptabilite-tokens.scss`
2. Documentez-le dans ce guide
3. Mettez à jour tous les composants concernés
4. Testez sur tous les breakpoints

---

## 📞 Support

Pour toute question sur le style ou les tokens, consultez:
- `_comptabilite-tokens.scss` - Définitions des tokens
- `_comptabilite-components.scss` - Composants standardisés
- Ce guide - Documentation complète

