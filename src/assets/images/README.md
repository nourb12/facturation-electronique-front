# Images pour la Landing Page

## Images requises

Placez les captures d'écran de l'application mobile dans ce dossier :

### 1. `app-dark.jpg` ou `app-dark.png`
- Capture d'écran de l'application mobile en **mode sombre**
- Format recommandé : PNG ou JPG
- Dimensions recommandées : 1080x2340px (ratio 9:18)
- Poids : < 500KB

### 2. `app-light.jpg` ou `app-light.png`
- Capture d'écran de l'application mobile en **mode clair**
- Format recommandé : PNG ou JPG
- Dimensions recommandées : 1080x2340px (ratio 9:18)
- Poids : < 500KB

## Fonctionnement

Le système affiche automatiquement :
- `app-dark.jpg` quand le thème est **sombre**
- `app-light.jpg` quand le thème est **clair**

Le changement se fait automatiquement via CSS `:host-context([data-theme="light"])`.

## Vérification

Après avoir ajouté les images :
1. Vérifiez qu'elles sont bien dans `src/assets/images/`
2. Vérifiez les noms de fichiers (sensible à la casse)
3. Lancez `ng serve` et allez sur la landing page
4. Testez le changement de thème (dark/light)
5. Vérifiez qu'il n'y a pas d'erreur 404 dans la console

## Formats supportés

- `.jpg` / `.jpeg`
- `.png`
- `.webp` (recommandé pour la performance)

Si vous utilisez `.webp`, modifiez les chemins dans `landing.component.html` :
```html
src="assets/images/app-dark.webp"
src="assets/images/app-light.webp"
```
