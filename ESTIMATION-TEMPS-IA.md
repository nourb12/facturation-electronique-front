# Estimation Temps - Module IA TuniFlow

## Objectif

Ce document estime le temps necessaire pour integrer des fonctionnalites IA dans TuniFlow, en complement des modules deja existants de facturation, comptabilite, tresorerie et onboarding.

L'objectif n'est pas de remplacer les flux metier existants, mais d'ajouter des fonctions d'assistance et d'automatisation intelligentes.

## Hypotheses

- Le projet principal existe deja et fonctionne.
- Le frontend Angular et le backend .NET sont deja en place.
- L'integration IA se fait par etapes.
- Une seule personne travaille principalement sur la mise en oeuvre.
- Les API ou services IA externes ne sont pas encore finalises.
- Les correctifs critiques hors IA restent prioritaires.

## Perimetre IA propose

### 1. OCR intelligent des documents
- Lecture assistee des factures et justificatifs
- Extraction des champs principaux
- Verification de confiance OCR
- Proposition de correction manuelle

### 2. Detection d'anomalies
- Detection de montants inhabituels
- Detection de doublons
- Detection de champs incoherents
- Alerte sur factures suspectes

### 3. Assistance comptable
- Suggestion de categorie comptable
- Suggestion de compte comptable
- Proposition d'affectation TVA / taxe selon contexte

### 4. Analyse et aide a la decision
- Resume automatique d'activite
- Mise en avant des risques ou retards
- Suggestions d'actions prioritaires

## Estimation globale

| Bloc | Charge estimee |
|---|---:|
| Cadrage fonctionnel IA | 2 a 3 jours |
| Conception technique | 2 jours |
| OCR intelligent | 5 a 7 jours |
| Detection d'anomalies | 4 a 6 jours |
| Suggestions comptables | 4 a 5 jours |
| UI / UX du module IA | 3 a 4 jours |
| Tests / validation | 3 a 4 jours |
| Documentation / demo | 1 a 2 jours |
| **Total estime** | **24 a 33 jours** |

## Detail par phase

### Phase 1 - Cadrage et specification
**Duree estimee : 2 a 3 jours**

Taches:
- definir les cas d'usage IA utiles pour TuniFlow
- separer les fonctions obligatoires des fonctions optionnelles
- identifier les donnees necessaires
- definir les ecrans impactes

Livrables:
- liste des fonctionnalites IA retenues
- priorisation MVP / phase 2

### Phase 2 - Conception technique
**Duree estimee : 2 jours**

Taches:
- choisir l'architecture d'integration IA
- definir les appels backend
- definir le format des reponses IA
- definir les logs, erreurs et fallback

Livrables:
- schema d'integration
- endpoints et contrats de donnees

### Phase 3 - OCR intelligent
**Duree estimee : 5 a 7 jours**

Taches:
- connecter le service OCR / IA
- recuperer les champs extraits
- afficher les scores de confiance
- marquer les champs a verifier
- gerer les erreurs d'extraction

Livrables:
- workflow OCR assiste
- affichage des champs extraits et a corriger

### Phase 4 - Detection d'anomalies
**Duree estimee : 4 a 6 jours**

Taches:
- definir les regles de detection
- analyser les transactions / factures
- afficher les alertes
- ajouter un niveau de priorite

Livrables:
- alertes d'anomalie visibles dans l'interface
- regles IA / heuristiques documentees

### Phase 5 - Suggestions comptables
**Duree estimee : 4 a 5 jours**

Taches:
- proposer une categorie ou un compte
- suggerer une affectation automatique
- permettre validation / rejet utilisateur

Livrables:
- panneau de suggestions
- integration au workflow comptable

### Phase 6 - Interface utilisateur
**Duree estimee : 3 a 4 jours**

Taches:
- creer ou finaliser la page IA
- afficher resultats, suggestions et alertes
- gerer les etats vides, loading, erreur
- rendre le tout coherent avec le design TuniFlow

Livrables:
- interface IA exploitable en demo

### Phase 7 - Tests et validation
**Duree estimee : 3 a 4 jours**

Taches:
- verifier les cas reels
- verifier les cas limites
- tester les erreurs de reponse IA
- controler l'impact sur les performances

Livrables:
- checklist de validation
- version stable pour presentation

### Phase 8 - Documentation et presentation
**Duree estimee : 1 a 2 jours**

Taches:
- rediger le fonctionnement du module
- preparer une demo
- preparer les limites et evolutions futures

Livrables:
- support de demo
- note technique courte

## Version recommandee si le temps est limite

Si la duree reelle disponible est de **1 mois maximum**, la version recommandee est:

### MVP IA en 10 a 15 jours

Inclure seulement:
- OCR intelligent assiste
- score de confiance
- detection simple d'anomalies
- UI minimale de restitution

Ne pas inclure au debut:
- chatbot
- prediction avancee
- moteur complexe de recommandation
- automatisation complete sans validation humaine

## Risques

- donnees insuffisantes pour des suggestions fiables
- cout ou limites d'API externes
- temps de debug plus eleve que prevu
- qualite OCR variable selon les documents
- confusion entre logique metier classique et logique IA

## Recommandation manager

Si l'IA n'est pas une demande directe du manager, il vaut mieux presenter ce module comme:

**"une phase d'amelioration a forte valeur ajoutee, apres stabilisation du coeur metier."**

Donc:

- priorite 1: workflow metier, conformite, notifications, stabilite
- priorite 2: module IA MVP

## Conclusion

### Estimation courte a presenter

- **MVP IA simple**: 10 a 15 jours
- **Module IA intermediaire**: 15 a 22 jours
- **Module IA complet et bien stabilise**: 24 a 33 jours

### Recommendation

Pour TuniFlow, la meilleure option est de proposer:

**un MVP IA court, centre sur OCR + alertes + aide a la verification, sans complexifier le projet principal.**
