# 🎨 Design System - Comptabilité

## Vue d'ensemble

Le design system de comptabilité fournit une base cohérente pour tous les composants, garantissant une expérience utilisateur uniforme et professionnelle.

---

## 🎯 Principes de design

### 1. **Cohérence**
Tous les composants suivent les mêmes règles de style, couleur et espacement.

### 2. **Clarté**
Les interfaces sont claires, lisibles et faciles à comprendre.

### 3. **Accessibilité**
Tous les composants respectent les normes d'accessibilité (WCAG 2.1).

### 4. **Performance**
Les styles sont optimisés pour minimiser le CSS dupliqué.

### 5. **Maintenabilité**
Un seul endroit pour modifier les styles globaux.

---

## 🎨 Palette de couleurs

### Couleurs primaires

```
┌─────────────────────────────────────────────────────────────┐
│ Tuniflow (Jaune EY)                                         │
│ #FFE600                                                     │
│ Utilisé pour: Boutons primaires, accents, highlights       │
└─────────────────────────────────────────────────────────────┘
```

### Couleurs de statut

```
┌─────────────────────────────────────────────────────────────┐
│ Succès (Vert)          │ Attention (Orange)                │
│ #22C55E                │ #F59E0B                           │
│ Utilisé pour: OK       │ Utilisé pour: Avertissements      │
├─────────────────────────────────────────────────────────────┤
│ Erreur (Rouge)         │ Info (Bleu)                       │
│ #EF4444                │ #3B82F6                           │
│ Utilisé pour: Erreurs  │ Utilisé pour: Informations        │
└─────────────────────────────────────────────────────────────┘
```

### Couleurs de fond

```
┌─────────────────────────────────────────────────────────────┐
│ Void (Arrière-plan)    │ Surface (Secondaire)              │
│ Utilisé pour: Page     │ Utilisé pour: Éléments            │
├─────────────────────────────────────────────────────────────┤
│ Card (Cartes)          │ Edge (Bordures)                   │
│ Utilisé pour: Panneaux │ Utilisé pour: Séparations         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Typographie

### Familles de police

```
┌─────────────────────────────────────────────────────────────┐
│ DM Sans (Titres)                                   │
│ "The quick brown fox jumps over the lazy dog"              │
├─────────────────────────────────────────────────────────────┤
│ DM Sans (Corps de texte)                                    │
│ "The quick brown fox jumps over the lazy dog"              │
├─────────────────────────────────────────────────────────────┤
│ JetBrains Mono (Nombres et codes)                           │
│ "The quick brown fox jumps over the lazy dog"              │
└─────────────────────────────────────────────────────────────┘
```

### Hiérarchie typographique

```
H1 (32px, 900)  ← Titres principaux
H2 (28px, 800)  ← Titres de section
H3 (24px, 800)  ← Sous-titres
H4 (20px, 700)  ← Titres de panneau
H5 (18px, 700)  ← Titres de carte
H6 (16px, 700)  ← Titres de groupe

Body (13px, 400-600)  ← Texte standard
Small (12px, 400-600) ← Texte petit
Tiny (10px, 600-900)  ← Labels et badges
```

---

## 🔘 Composants

### Boutons

#### Bouton primaire
```
┌──────────────────────────────────────┐
│  Action principale                   │
│  Fond: #FFE600 | Texte: #0A0A0A     │
│  Hover: Lift + Shadow                │
└──────────────────────────────────────┘
```

#### Bouton secondaire
```
┌──────────────────────────────────────┐
│  Action secondaire                   │
│  Fond: Card | Bordure: B1            │
│  Hover: Fond Surface                 │
└──────────────────────────────────────┘
```

#### Bouton fantôme
```
┌──────────────────────────────────────┐
│  Action légère                       │
│  Fond: Transparent | Bordure: B1     │
│  Hover: Fond Surface                 │
└──────────────────────────────────────┘
```

### Cartes

```
┌──────────────────────────────────────┐
│ Titre                                │
│ Description                          │
├──────────────────────────────────────┤
│ Contenu principal                    │
│                                      │
├──────────────────────────────────────┤
│ Actions                              │
└──────────────────────────────────────┘
```

### Badges

```
┌─────────────────────────────────────────────────────────────┐
│ Défaut      │ Succès      │ Attention   │ Erreur            │
│ Jaune       │ Vert        │ Orange      │ Rouge             │
├─────────────────────────────────────────────────────────────┤
│ Info        │ Neutre      │ Désactivé   │ Personnalisé      │
│ Bleu        │ Gris        │ Gris clair  │ Couleur custom    │
└─────────────────────────────────────────────────────────────┘
```

### Inputs

```
┌──────────────────────────────────────┐
│ Label                                │
│ ┌────────────────────────────────┐   │
│ │ Placeholder                    │   │
│ └────────────────────────────────┘   │
│ Hint text                            │
└──────────────────────────────────────┘
```

### Tables

```
┌──────────────────────────────────────────────────────────────┐
│ COLONNE 1      │ COLONNE 2      │ COLONNE 3                 │
├──────────────────────────────────────────────────────────────┤
│ Données        │ Données        │ Données                   │
├──────────────────────────────────────────────────────────────┤
│ Données        │ Données        │ Données                   │
├──────────────────────────────────────────────────────────────┤
│ Données        │ Données        │ Données                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 📐 Espacements

### Échelle d'espacement

```
4px   (xs)   ← Très petit
8px   (sm)   ← Petit
12px  (md)   ← Standard
16px  (lg)   ← Large
20px  (xl)   ← Très large
24px  (2xl)  ← Extra large
28px  (3xl)  ← Énorme
32px  (4xl)  ← Maximal
```

### Utilisation

```
Padding interne:     $space-lg (16px)
Margin externe:      $space-lg (16px)
Gap entre éléments:  $space-md (12px)
Padding bouton:      $space-md (12px)
Padding carte:       $space-lg (16px)
```

---

## 🎯 Border-radius

### Échelle de border-radius

```
8px   (sm)   ← Petits éléments
10px  (md)   ← Boutons, inputs
12px  (lg)   ← Cartes petites
14px  (xl)   ← Cartes moyennes
16px  (2xl)  ← Cartes grandes
999px (full) ← Badges, pills
```

---

## ⚡ Transitions

### Durées standardisées

```
150ms (fast)  ← Interactions rapides
260ms (base)  ← Transitions standard
420ms (slow)  ← Animations lentes
```

### Easing

```
cubic-bezier(.16, 1, .3, 1)  ← Easing standard
```

---

## 📱 Responsive Design

### Breakpoints

```
640px  (sm)   ← Petits écrans (téléphones)
768px  (md)   ← Tablettes
1024px (lg)   ← Ordinateurs
1280px (xl)   ← Grands écrans
1536px (2xl)  ← Très grands écrans
```

### Grilles responsive

```
Desktop (4 colonnes)
┌─────┬─────┬─────┬─────┐
│  1  │  2  │  3  │  4  │
└─────┴─────┴─────┴─────┘

Tablette (2 colonnes)
┌──────────┬──────────┐
│    1     │    2     │
├──────────┼──────────┤
│    3     │    4     │
└──────────┴──────────┘

Mobile (1 colonne)
┌──────────────────┐
│       1          │
├──────────────────┤
│       2          │
├──────────────────┤
│       3          │
├──────────────────┤
│       4          │
└──────────────────┘
```

---

## 🎬 Animations

### Animations disponibles

```
fadeUp    ← Apparition avec remontée
fadeIn    ← Apparition simple
slideIn   ← Glissement depuis la gauche
scaleIn   ← Zoom depuis le centre
spin      ← Rotation continue
shimmer   ← Effet de chargement
panelIn   ← Apparition de panneau
```

---

## ♿ Accessibilité

### Contrastes

```
Texte primaire sur fond:     4.5:1 (WCAG AA)
Texte secondaire sur fond:   3:1 (WCAG AA)
Icônes sur fond:             3:1 (WCAG AA)
```

### Interactions

```
Taille minimale des boutons:  40px × 40px
Taille minimale des cibles:   44px × 44px
Focus ring visible:           Oui
Labels associés:              Oui
```

---

## 📊 Exemple de mise en page

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                      │
│ Titre | Sous-titre                    [Bouton primaire]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ KPI Card 1   │  │ KPI Card 2   │  │ KPI Card 3   │     │
│  │ 1,234        │  │ 5,678        │  │ 9,012        │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Tableau                                             │   │
│  │ ┌──────────┬──────────┬──────────┬──────────────┐   │   │
│  │ │ Col 1    │ Col 2    │ Col 3    │ Actions     │   │   │
│  │ ├──────────┼──────────┼──────────┼──────────────┤   │   │
│  │ │ Données  │ Données  │ Données  │ [Icônes]    │   │   │
│  │ └──────────┴──────────┴──────────┴──────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 Fichiers de référence

- `_comptabilite-tokens.scss` - Définitions des tokens
- `_comptabilite-components.scss` - Composants standardisés
- `STYLE-GUIDE.md` - Guide complet d'utilisation
- `HARMONISATION.md` - Détails de l'harmonisation

---

## ✅ Checklist de conformité

- [ ] Utilise les couleurs du design system
- [ ] Utilise les espacements standardisés
- [ ] Utilise la typographie correcte
- [ ] Utilise les composants standardisés
- [ ] Responsive sur tous les breakpoints
- [ ] Accessible (contraste, labels, etc.)
- [ ] Transitions fluides
- [ ] Pas de styles hardcodés

---

## 🚀 Prochaines étapes

1. Harmoniser les composants restants
2. Ajouter des variantes de composants
3. Créer une bibliothèque de composants
4. Documenter les patterns d'utilisation
5. Former l'équipe au design system

