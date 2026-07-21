# Plan de travail IA sur 1 mois

## Projet

Ce document presente une proposition realiste de travail sur **deux modules IA** a integrer dans TuniFlow sur une duree maximale de **1 mois**.

Les deux modules retenus sont :

1. **Module 1 - Chatbot RAG d'assistance**
2. **Module 2 - Module ML de prediction finance**

Le choix de ces deux modules permet d'apporter une vraie valeur metier sans alourdir excessivement le projet principal.

---

# 1. Vision generale

## But du travail

L'objectif n'est pas de faire de l'IA uniquement pour montrer une fonctionnalite moderne, mais de proposer deux briques utiles :

- une brique d'**assistance utilisateur** pour aider a comprendre la plateforme et les regles TEIF
- une brique de **prediction metier** pour aider les responsables entreprise et financiers a mieux piloter les paiements et la tresorerie

## Contrainte principale

La duree disponible est courte : **1 mois maximum**.

Donc la strategie recommandee est :

- faire un **MVP propre**
- limiter le perimetre
- viser une **demo claire et credible**
- ne pas essayer de construire une intelligence artificielle trop vaste

---

# 2. Module 1 - Chatbot RAG d'assistance

## 2.1 Objectif du module

Ce module a pour but de fournir un assistant conversationnel capable de repondre a des questions sur :

- le fonctionnement de TuniFlow
- les etapes de demande d'acces
- les notions TEIF, TTN/e-Fatoora, UBL 2.1
- les regles de base de facturation, TVA, FODEC, HT/TTC
- les actions a faire en cas de blocage utilisateur

## 2.2 Valeur metier

Ce module apporte :

- moins de confusion pour les nouveaux utilisateurs
- moins de questions repetitives au support
- une meilleure comprehension des regles TEIF
- une meilleure adoption de la plateforme

## 2.3 Utilisateurs cibles

- visiteur landing page
- entreprise en onboarding
- responsable entreprise
- responsable financier

## 2.4 Emplacements proposes dans la plateforme

### A. Landing page
Un bouton discret :
- "Assistant TEIF"
- "Besoin d'aide ?"

Usage :
- questions sur conformite, onboarding, tarifs, documents

### B. Demande d'acces / onboarding
Un panneau d'aide contextuelle :
- documents requis
- signification des champs
- explication du processus

### C. Dashboard entreprise / financier
Un assistant d'orientation :
- comment corriger une facture rejetee
- comment suivre un paiement
- comment comprendre un statut ou une alerte

## 2.5 Fonctionnalites du MVP

Le MVP ne doit pas etre un chatbot general.

Il doit etre limite a :

- FAQ onboarding
- guide utilisateur TuniFlow
- definitions TEIF / TTN / UBL 2.1 / TVA / FODEC
- aide sur facturation et suivi

Le bot doit :

- repondre a partir des documents disponibles
- afficher une reponse claire
- citer la source ou la section utilisee
- dire quand il ne trouve pas l'information

## 2.6 Principe technique

Le module utilise une logique **RAG** :

1. l'utilisateur pose une question
2. le backend cherche les passages les plus utiles dans la base documentaire
3. ces passages sont envoyes au modele
4. le modele redige la reponse en s'appuyant sur ces passages

## 2.7 Architecture technique proposee

### Frontend Angular

Creer une interface de chat :

- `chatbot.component.html`
- `chatbot.component.ts`
- `chatbot.component.scss`

Fonctions :

- saisir une question
- afficher les messages
- afficher un loading
- afficher les sources
- afficher un message "information non trouvee"

### Backend .NET

Creer un endpoint de type :

- `POST /api/chat/ask`

Fonctions backend :

- recevoir la question
- rechercher le contexte documentaire
- construire le prompt
- appeler le modele
- renvoyer la reponse avec les sources

### Base documentaire

Commencer simple avec :

- un fichier FAQ
- des contenus TEIF selectionnes
- quelques guides internes TuniFlow

Format possible :

- JSON
- Markdown
- contenu texte en base

### Recherche

Pour le MVP, on peut faire :

- version simple : recherche semi-structuree dans FAQ
- version plus evoluee : embeddings + base vectorielle

## 2.8 Livrables attendus

- interface chatbot fonctionnelle
- endpoint backend operationnel
- base documentaire minimale
- reponses avec sources
- demonstration de cas reels

## 2.9 Estimation temps

| Tache | Estimation |
|---|---:|
| Cadrage des questions cibles | 1 jour |
| Preparation de la base documentaire | 2 jours |
| UI chatbot Angular | 2 jours |
| Endpoint backend | 2 jours |
| Recherche + injection contexte | 2 a 3 jours |
| Tests et ajustements | 2 jours |
| **Total Module 1** | **11 a 12 jours** |

---

# 3. Module 2 - Prediction finance / risque de retard

## 3.1 Objectif du module

Ce module vise a aider le responsable entreprise et le responsable financier a anticiper les risques lies aux paiements.

Le choix recommande pour un delai court est :

**prediction du risque de retard de paiement**

Eventuellement, on peut enrichir le module avec une petite lecture de tresorerie a court terme.

## 3.2 Pourquoi ce choix

Ce sujet est plus utile et plus realiste que :

- une prediction a 5 ans
- un modele trop academique
- une IA trop generale

Ce module a une valeur directe :

- prioriser les relances
- identifier les factures a risque
- aider a suivre les encaissements
- mieux piloter la tresorerie

## 3.3 Utilisateurs cibles

- responsable entreprise
- responsable financier
- admin (vue globale)

## 3.4 Emplacements proposes dans la plateforme

### A. Page paiements

Ajouter :

- score de risque par facture
- badge faible / moyen / eleve
- tri des factures a relancer

### B. Dashboard financier

Ajouter :

- top factures a risque
- pourcentage de risque global
- mini synthese predictive

### C. Dashboard admin

Ajouter une vue agregée :

- nombre de factures a risque
- entreprises avec hausse de retard
- tendance recente

## 3.5 Fonctionnalites du MVP

Le module doit rester simple et lisible.

Le MVP peut faire :

- calculer un score de risque
- classer les factures :
  - faible risque
  - risque moyen
  - risque eleve
- afficher les raisons principales

Exemples de variables utiles :

- montant de la facture
- anciennete de la facture
- client deja en retard ou non
- nombre de retards passes
- statut actuel
- delai moyen de paiement

## 3.6 Approche technique

Deux niveaux sont possibles :

### Niveau 1 - heuristique intelligente

Pas de gros modele au debut.

On construit un score base sur des regles ponderees :

- si montant eleve => risque +1
- si client a deja paye en retard plusieurs fois => risque +2
- si facture depassee => risque +3

Avantages :

- rapide
- explicable
- facile a demo

### Niveau 2 - petit modele ML

Si les donnees sont suffisantes, on peut utiliser un modele simple :

- regression logistique
- random forest simple

But :

- predire la probabilite de retard

## 3.7 Architecture technique proposee

### Backend

Creer un service de prediction :

- calcul du score
- endpoint de lecture des predictions

Exemples d'endpoints :

- `GET /api/predictions/retards`
- `GET /api/predictions/retards/dashboard`

### Frontend Angular

Ajouter dans :

- `paiements.component`
- `dashboard.component`
- eventuellement `admin-dashboard.component`

Elements UI :

- badge de risque
- tableau des factures prioritaires
- resume predictif

### Donnees

Sources probables :

- historique factures
- statuts paiement
- dates d'echeance
- dates d'encaissement
- clients

## 3.8 Livrables attendus

- score de risque visible
- liste de factures a relancer en priorite
- vue dashboard
- logique documentee

## 3.9 Estimation temps

| Tache | Estimation |
|---|---:|
| Cadrage metier du risque | 1 jour |
| Analyse des donnees disponibles | 1 a 2 jours |
| Conception logique de score | 1 jour |
| Service backend prediction | 2 jours |
| Integration Angular dashboard / paiements | 2 a 3 jours |
| Tests et ajustements | 2 jours |
| **Total Module 2** | **9 a 11 jours** |

---

# 4. Planning global sur 1 mois

## Semaine 1

- cadrage des deux modules
- choix des questions du chatbot
- choix des donnees prediction
- structuration de la base documentaire

## Semaine 2

- developpement UI chatbot
- creation endpoint backend chatbot
- premier flux de reponse

## Semaine 3

- developpement module prediction finance
- integration backend + frontend
- affichage dashboard et paiements

## Semaine 4

- tests
- amelioration UX
- ajustements
- preparation demo
- documentation finale

## Estimation totale

| Module | Estimation |
|---|---:|
| Module 1 - Chatbot RAG | 11 a 12 jours |
| Module 2 - Prediction finance | 9 a 11 jours |
| Integration / tests / demo | 4 a 5 jours |
| **Total global** | **24 a 28 jours** |

Cette estimation reste compatible avec une fenetre de **1 mois** si le perimetre est bien respecte.

---

# 5. Ce qu'il ne faut pas faire dans cette phase

Pour rester dans un delai realiste, il faut eviter :

- un chatbot generaliste qui repond a tout
- une prediction long terme sur 5 ans sans historique fiable
- un systeme RAG trop complexe avec trop de sources
- un moteur ML trop academique difficile a expliquer
- des integrations multiples non necessaires

---

# 6. Resultat attendu a la fin

Si ce plan est respecte, a la fin du mois le projet pourra presenter :

## Module 1

Un assistant intelligent capable d'aider l'utilisateur a comprendre :

- la plateforme
- les documents
- les etapes d'onboarding
- les notions TEIF principales

## Module 2

Un outil de pilotage simple capable d'aider le financier a :

- repérer les factures a risque
- mieux prioriser les relances
- disposer d'une lecture predictive courte

---

# 7. Recommandation finale

La meilleure approche pour ce projet est de presenter ces modules comme :

**des modules IA d'assistance et d'aide a la decision, construits de facon progressive et realiste, au service du metier.**

Ce positionnement est plus professionnel que de promettre une IA trop large ou trop theorique.

---

# 8. Resume executif

## Module 1 - Chatbot RAG

- but : assistance utilisateur et documentaire
- public : onboarding, entreprise, financier
- duree : **11 a 12 jours**

## Module 2 - Prediction finance

- but : score de risque de retard de paiement
- public : entreprise, financier, admin
- duree : **9 a 11 jours**

## Estimation finale

- total : **24 a 28 jours**
- format recommande : **MVP IA realiste sur 1 mois**
