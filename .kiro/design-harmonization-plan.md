# Plan d'Harmonisation du Design - TunisFlow

## Problèmes identifiés et solutions

### 1. BOUTONS - Standardisation urgente

#### Problème
- 4 tailles différentes de `.btn-primary` à travers l'application
- Padding et font-size incohérents

#### Solution
Créer un système de boutons unifié dans `styles.scss` :

```scss
// Bouton primaire - taille standard
.btn-primary {
  padding: 10px 20px;
  font-size: 13.5px;
  font-weight: 700;
  border-radius: 10px;
}

// Variantes de taille
.btn-primary--sm {
  padding: 7px 16px;
  font-size: 12px;
}

.btn-primary--lg {
  padding: 14px 28px;
  font-size: 15px;
}
```

**Fichiers à modifier** :
- `src/app/pages/landing/landing.component.scss` (lignes 496-520)
- `src/app/pages/dashboard/dashboard.component.scss` (ligne 333)
- `src/app/pages/auth/demande-acces/demande-acces.component.scss` (ligne 1053)

---

### 2. CARTES - Border-radius unifié

#### Problème
- Mélange de 14px, 16px, 18px, 20px pour les cartes

#### Solution
Standardiser à **16px** pour toutes les cartes principales :

```scss
.card, .box, .modal-box, .live-card {
  border-radius: 16px;
}

// Petites cartes / éléments imbriqués
.card-sm, .kpi-card {
  border-radius: 12px;
}
```

**Fichiers à modifier** :
- `src/app/pages/landing/landing.component.scss` (ligne 1955+)
- `src/app/pages/auth/demande-acces/demande-acces.component.scss` (ligne 500+)

---

### 3. BADGES - Système unifié

#### Problème
- Styles de badges différents selon les pages
- Certains avec dots, d'autres sans
- Couleurs incohérentes en mode light

#### Solution
Utiliser UNIQUEMENT le système global de badges :

```scss
// Dans styles.scss - déjà défini
.badge {
  padding: 3px 9px;
  border-radius: 9999px;
  font-size: 10.5px;
  font-weight: 700;
}

// Supprimer tous les styles custom de badges dans les composants
```

**Action** : Supprimer les redéfinitions de `.badge` dans :
- `landing.component.scss`
- `demande-acces.component.scss`
- `dashboard.component.scss`

---

### 4. INPUTS - Padding standardisé

#### Problème
- Padding varie entre 9px, 10px, 11px, 12px

#### Solution
```scss
.form-input, .inp {
  padding: 10px 14px;
  font-size: 14px;
  border-radius: 10px;
}
```

**Fichiers à modifier** :
- `src/app/pages/auth/demande-acces/demande-acces.component.scss` (ligne 700+)
- Tous les composants avec des inputs custom

---

### 5. MODE LIGHT - Amélioration du contraste

#### Problème
- Certains éléments gardent des styles dark en mode light
- Badges pas assez visibles

#### Solution déjà implémentée dans `styles.scss` :
```scss
[data-theme="light"] {
  .badge {
    color: #1A1A1A;
    background: rgba(242, 201, 76, 0.12);
    border: 1px solid rgba(242, 201, 76, 0.25);
  }
}
```

**Vérifier** que tous les composants respectent les variables CSS :
- `var(--bg-card)` au lieu de couleurs hardcodées
- `var(--tp)` pour le texte principal
- `var(--b1)` pour les bordures

---

### 6. NAVBAR - Harmonisation

#### Problème
- Landing page a un style de navbar différent du dashboard

#### Solution
Utiliser les mêmes variables partout :

```scss
.navbar, .nav-inner, .dash-topbar {
  background: var(--navbar-bg);
  border: 1px solid var(--navbar-border);
  box-shadow: var(--navbar-shadow);
  border-radius: 16px;
}
```

---

## Priorités d'implémentation

### 🔴 URGENT (Impact visuel majeur)
1. Standardiser les boutons `.btn-primary`
2. Unifier les border-radius des cartes
3. Supprimer les redéfinitions de badges

### 🟡 IMPORTANT (Cohérence)
4. Standardiser le padding des inputs
5. Vérifier l'utilisation des variables CSS partout

### 🟢 AMÉLIORATION (Polish)
6. Harmoniser les animations
7. Unifier les transitions (durée et easing)

---

## Checklist de vérification

- [ ] Tous les `.btn-primary` ont le même style de base
- [ ] Toutes les cartes principales utilisent `border-radius: 16px`
- [ ] Les badges utilisent uniquement le système global
- [ ] Les inputs ont tous `padding: 10px 14px`
- [ ] Mode light : tous les éléments utilisent les variables CSS
- [ ] Navbar cohérente entre landing et dashboard
- [ ] Transitions uniformes (260ms cubic-bezier(.16,1,.3,1))

---

## Estimation du temps

- **Boutons** : 30 minutes
- **Cartes** : 20 minutes
- **Badges** : 15 minutes
- **Inputs** : 20 minutes
- **Vérification mode light** : 30 minutes
- **Tests** : 30 minutes

**Total** : ~2h30

---

## Notes

- Toujours tester en mode dark ET light après chaque modification
- Vérifier la responsivité (mobile, tablet, desktop)
- Tester avec différents navigateurs
