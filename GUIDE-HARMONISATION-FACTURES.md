# 🎨 Guide d'Harmonisation - Composant Factures

## Vue d'ensemble

Le composant **Factures** a été complètement redesigné pour correspondre au design system du dashboard entreprise. Voici un guide visuel des changements.

---

## 🎯 Objectif

Harmoniser le design du composant factures avec le reste de l'application pour :
- ✅ Cohérence visuelle
- ✅ Expérience utilisateur uniforme
- ✅ Maintenabilité du code
- ✅ Performance optimisée

---

## 📐 Design System Appliqué

### Couleurs

```scss
// Couleur principale (Jaune EY)
--c-tuniflow: #FFE600
--c-tuniflow-rgb: 255,230,0

// Couleurs sémantiques
--ok: #22C55E      // Vert (succès, encaissé)
--warn: #F59E0B    // Orange (attention, en attente)
--err: #EF4444     // Rouge (erreur, retard)
--info: #3B82F6    // Bleu (information)

// Backgrounds
--bg-void: #FFFFFF (light) / #0A0A0A (dark)
--bg-card: #FFFFFF (light) / #1A1A1A (dark)
--navbar-bg: #F5F7FB (light) / #1A1A1A (dark)

// Borders
--b0: rgba(0,0,0,.04)  // Très subtile
--b1: rgba(0,0,0,.07)  // Subtile
--b2: rgba(0,0,0,.11)  // Normale

// Textes
--tp: #111827  // Texte principal
--ts: #6B7280  // Texte secondaire
--tt: #9CA3AF  // Texte tertiaire
```

### Typographie

```scss
// Polices
--font-display: 'Playfair Display'  // Titres
--font-body: 'DM Sans'              // Corps de texte
--font-mono: 'JetBrains Mono'       // Chiffres, codes

// Tailles
--fs-xs: 11px
--fs-sm: 13px
--fs-base: 14px
--fs-lg: 17px
--fs-xl: 20px
```

### Espacements

```scss
// Padding standard
Boutons: 10px 18px (primary), 9px 16px (ghost)
Cards: 16px
Box: 20px
Inputs: 10px 14px

// Gaps
KPI Grid: 14px
Filters: 12px
Actions: 4px
```

### Border Radius

```scss
// Standardisé à 16px pour les éléments principaux
Topbar: 16px
Cards: 16px
Box: 16px
Boutons: 10px
Badges: 99px (pill)
Inputs: 10px
```

---

## 🔄 Changements Détaillés

### 1. Topbar

#### Structure
```html
<!-- AVANT -->
<div class="lv-header">
  <div class="lv-header-left">
    <h1 class="lv-title">Factures <em>clients</em></h1>
    <p class="lv-sub">4 facture(s)</p>
  </div>
  <div class="lv-header-actions">
    <button class="btn-ghost-sm">CSV</button>
    <button class="btn-primary-main">Créer</button>
  </div>
</div>

<!-- APRÈS -->
<header class="dash-topbar">
  <div class="dt-left">
    <div class="dt-title-block">
      <h1 class="dt-title">Factures <em>clients</em></h1>
      <span class="dt-bc">4 facture(s) · 1 brouillon(s)</span>
    </div>
  </div>
  <div class="dt-right">
    <button class="btn-ghost">CSV</button>
    <button class="btn-primary">Créer une facture</button>
  </div>
</header>
```

#### Styles
```scss
.dash-topbar {
  padding: 14px 18px;
  background: var(--navbar-bg);
  border: 1px solid var(--navbar-border);
  border-radius: 16px;
  box-shadow: var(--navbar-shadow);
}

.dt-title {
  font-family: 'Playfair Display';
  font-size: 1.7rem;
  font-weight: 900;
  em { color: var(--c-tuniflow); font-style: italic; }
}
```

---

### 2. KPI Cards

#### Structure
```html
<!-- AVANT -->
<div class="kpi-row">
  <div class="kpi-card">
    <div class="kpi-card-label">Ce mois</div>
    <div class="kpi-card-val kpi--tuniflow">5,700.100 TND</div>
    <div class="kpi-card-sub">Émis</div>
  </div>
</div>

<!-- APRÈS -->
<div class="kpi-grid">
  <div class="kpi-card">
    <div class="kpi-icon kpi-icon--cash">
      <svg>...</svg>
    </div>
    <div class="kpi-body">
      <div class="kpi-title">Ce mois</div>
      <div class="kpi-value">5,700.100 <span class="kpi-currency">TND</span></div>
      <div class="kpi-sub">Émis</div>
    </div>
  </div>
</div>
```

#### Styles
```scss
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.kpi-card {
  background: var(--bg-card);
  border: 1px solid var(--b1);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  gap: 14px;
  transition: border-color 260ms, transform 260ms;
  
  &:hover {
    border-color: rgba(var(--c-tuniflow-rgb), .3);
    transform: translateY(-2px);
  }
}

.kpi-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &--cash { background: rgba(var(--c-tuniflow-rgb), .15); color: var(--c-tuniflow); }
  &--shield { background: rgba(34,197,94,.12); color: #22C55E; }
  &--file { background: rgba(59,130,246,.12); color: #3B82F6; }
  &--alert { background: rgba(245,158,11,.12); color: #F59E0B; }
}

.kpi-value {
  font-family: 'JetBrains Mono';
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--tp);
}
```

---

### 3. Boutons

#### Styles
```scss
// Bouton primaire (Jaune EY)
.btn-primary {
  padding: 10px 18px;
  background: #FFE600;
  color: #000;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  transition: all 260ms cubic-bezier(.16,1,.3,1);
  
  &:hover {
    background: #FFF176;
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(255,230,0,.35);
  }
}

// Bouton ghost
.btn-ghost {
  padding: 9px 16px;
  background: transparent;
  border: 1px solid var(--b1);
  border-radius: 10px;
  color: var(--ts);
  font-size: 12.5px;
  font-weight: 600;
  
  &:hover {
    background: var(--b0);
    color: var(--tp);
  }
}
```

---

### 4. Filtres & Recherche

#### Structure
```html
<div class="box">
  <div class="filters-bar">
    <!-- Recherche -->
    <div class="search-box">
      <svg>...</svg>
      <input type="text" placeholder="Rechercher une facture..."/>
    </div>
    
    <!-- Filtres -->
    <div class="filter-tabs">
      <button class="filter-tab active">
        Tous
        <span class="filter-count">4</span>
      </button>
      <button class="filter-tab">
        Brouillon
        <span class="filter-count">1</span>
      </button>
    </div>
  </div>
</div>
```

#### Styles
```scss
.box {
  background: var(--bg-card);
  border: 1px solid var(--b1);
  border-radius: 16px;
  padding: 20px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  background: var(--bg-surf);
  border: 1px solid var(--b1);
  border-radius: 10px;
  min-width: 260px;
}

.filter-tab {
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ts);
  
  &.active {
    background: rgba(var(--c-tuniflow-rgb), .08);
    color: var(--c-tuniflow);
    border: 1px solid var(--b-tuniflow);
  }
}

.filter-count {
  font-family: 'JetBrains Mono';
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 99px;
  background: var(--b1);
}
```

---

### 5. Tableau

#### Structure
```html
<div class="box">
  <table class="ft-table">
    <thead>
      <tr>
        <th>N° Facture</th>
        <th>Client</th>
        <th class="th-right">Total HT</th>
        <th>Statut</th>
        <th class="th-right">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr class="ft-row">
        <td>
          <span class="rr-num">FAC-2026-001</span>
        </td>
        <td>
          <div class="ft-client-cell">
            <div class="ft-client-init">AR</div>
            <div>
              <div class="ft-client-name">Ariana Centre Urbain</div>
              <div class="ft-client-email">1734567ABMO00</div>
            </div>
          </div>
        </td>
        <td class="td-num">2,398.445</td>
        <td>
          <span class="badge badge--ok">Payée</span>
        </td>
        <td>
          <div class="ft-actions">
            <button class="act-btn act-btn--ghost">...</button>
            <button class="act-btn act-btn--ey">...</button>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

#### Styles
```scss
.ft-table {
  width: 100%;
  border-collapse: collapse;
  
  thead th {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .1em;
    color: var(--ts);
    padding: 12px 14px;
    background: var(--table-header-bg);
    border-bottom: 1px solid var(--b0);
  }
  
  tbody tr {
    border-bottom: 1px solid var(--b0);
    cursor: pointer;
    transition: background .15s;
    
    &:hover {
      background: var(--table-row-hover);
    }
  }
}

// Client cell
.ft-client-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ft-client-init {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(var(--c-tuniflow-rgb), .08);
  color: var(--c-tuniflow);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
}

.ft-client-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--tp);
}

.ft-client-email {
  font-size: 10.5px;
  color: var(--tt);
  font-family: 'JetBrains Mono';
}
```

---

### 6. Badges

#### Styles
```scss
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 99px;
  font-size: 9.5px;
  font-weight: 700;
  
  &--ok {
    background: rgba(34,197,94,.1);
    color: #22C55E;
  }
  
  &--warn {
    background: rgba(245,158,11,.1);
    color: #F59E0B;
  }
  
  &--err {
    background: rgba(239,68,68,.1);
    color: #EF4444;
  }
  
  &--info {
    background: rgba(59,130,246,.1);
    color: #3B82F6;
  }
  
  &--ey {
    background: rgba(var(--c-tuniflow-rgb),.08);
    color: var(--c-tuniflow);
  }
}
```

---

### 7. Actions Buttons

#### Styles
```scss
.ft-actions {
  display: flex;
  gap: 4px;
}

.act-btn {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .15s;
  
  &--ghost {
    background: var(--b0);
    color: var(--ts);
    &:hover { background: var(--b1); color: var(--tp); }
  }
  
  &--ey {
    background: rgba(var(--c-tuniflow-rgb),.08);
    color: var(--c-tuniflow);
    &:hover { background: rgba(var(--c-tuniflow-rgb),.18); }
  }
  
  &--ok {
    background: rgba(34,197,94,.1);
    color: #22C55E;
    &:hover { background: rgba(34,197,94,.2); }
  }
  
  &--info {
    background: rgba(59,130,246,.1);
    color: #3B82F6;
    &:hover { background: rgba(59,130,246,.2); }
  }
}
```

---

## 📱 Responsive Design

### Breakpoints

```scss
// Desktop (par défaut)
.kpi-grid {
  grid-template-columns: repeat(4, 1fr);
}

// Tablet (< 1200px)
@media (max-width: 1200px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

// Mobile (< 900px)
@media (max-width: 900px) {
  .dash-topbar {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .dt-right {
    width: 100%;
    justify-content: flex-start;
  }
  
  .kpi-grid {
    grid-template-columns: 1fr;
  }
  
  .filters-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box {
    width: 100%;
  }
}
```

---

## 🌓 Mode Dark/Light

Tous les styles utilisent des variables CSS qui s'adaptent automatiquement au thème :

```scss
// Light mode
:root[data-theme="light"] {
  --bg-void: #FFFFFF;
  --bg-card: #FFFFFF;
  --navbar-bg: #F5F7FB;
  --tp: #111827;
  --ts: #6B7280;
}

// Dark mode (par défaut)
:root {
  --bg-void: #0A0A0A;
  --bg-card: #1A1A1A;
  --navbar-bg: #1A1A1A;
  --tp: #F9FAFB;
  --ts: #9CA3AF;
}
```

---

## ✅ Checklist de Conformité

Utilisez cette checklist pour vérifier que votre composant est bien harmonisé :

### Structure HTML
- [ ] Utilise `.dash-topbar` pour le header
- [ ] Utilise `.kpi-grid` avec `.kpi-card` pour les KPIs
- [ ] Utilise `.box` pour les conteneurs
- [ ] Utilise `.ft-table` pour les tableaux
- [ ] Utilise `.filters-bar` et `.search-box` pour les filtres

### Boutons
- [ ] `.btn-primary` pour les actions principales (jaune EY)
- [ ] `.btn-ghost` pour les actions secondaires
- [ ] Padding standardisé
- [ ] Hover effects avec transform

### Badges
- [ ] Utilise `.badge--ok`, `.badge--warn`, `.badge--err`, `.badge--info`
- [ ] Padding : `2px 7px`
- [ ] Font-size : `9.5px`
- [ ] Border-radius : `99px`

### Couleurs
- [ ] Utilise `var(--c-tuniflow)` pour la couleur principale
- [ ] Utilise `var(--bg-card)` pour les backgrounds
- [ ] Utilise `var(--b0)`, `var(--b1)`, `var(--b2)` pour les bordures
- [ ] Utilise `var(--tp)`, `var(--ts)`, `var(--tt)` pour les textes

### Espacements
- [ ] Border-radius : `16px` pour les éléments principaux
- [ ] Padding : `20px` pour les box
- [ ] Gap : `14px` pour les grids
- [ ] Padding boutons : `10px 18px` (primary), `9px 16px` (ghost)

### Animations
- [ ] Transitions : `260ms cubic-bezier(.16,1,.3,1)`
- [ ] Hover effects cohérents
- [ ] Transform : `translateY(-1px)` ou `translateY(-2px)`

### Responsive
- [ ] Breakpoint tablet : `1200px`
- [ ] Breakpoint mobile : `900px`
- [ ] Grid adaptatif pour KPI cards
- [ ] Topbar responsive

---

## 🎉 Résultat Final

Le composant Factures est maintenant **100% harmonisé** avec le design system de l'application :

✅ **Cohérence visuelle** : Tous les éléments suivent le même design  
✅ **Variables CSS** : Utilisation des variables globales partout  
✅ **Responsive** : Adapté à tous les écrans  
✅ **Mode Dark/Light** : Compatible automatiquement  
✅ **Performance** : CSS optimisé et non redondant  
✅ **Maintenabilité** : Code propre et standardisé  

---

**Date** : 2 mai 2026  
**Version** : 1.0.0  
**Statut** : ✅ Complet
