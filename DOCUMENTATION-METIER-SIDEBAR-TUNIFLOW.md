# Documentation métier des modules TuniFlow

Ce document explique les modules visibles dans la sidebar TuniFlow avec un langage métier. L'objectif est de pouvoir présenter le projet à un manager, un responsable financier ou un encadrant sans entrer directement dans le code.

## 1. Vue d'ensemble

TuniFlow est une plateforme de gestion d'entreprise orientée facturation électronique, suivi financier, comptabilité et conformité fiscale.  
L'idée métier est simple : au lieu d'avoir les devis, factures, paiements, achats, clients, produits et écritures comptables dans plusieurs fichiers ou outils séparés, TuniFlow centralise le cycle complet dans un seul espace.

Le parcours principal est le suivant :

1. L'entreprise configure ses informations fiscales, ses clients, ses produits et ses règles de documents.
2. Elle crée des devis, bons de commande, bons de livraison, factures et avoirs.
3. Elle suit les paiements reçus et les paiements fournisseurs.
4. Les données alimentent les tableaux de bord, l'analyse, le profit, la trésorerie et la comptabilité.
5. Les responsables peuvent contrôler les utilisateurs, les documents, les taxes, les échéances et l'audit.

## 2. Sidebar entreprise

Cette sidebar est utilisée par le responsable entreprise ou le responsable financier après connexion.

### 2.1 Tableau de bord

**Rôle métier**  
Le tableau de bord donne une vue rapide de l'activité de l'entreprise.

**Ce que l'utilisateur voit**  
Il voit les indicateurs importants : chiffre d'affaires, factures en attente, paiements, retards, alertes et tâches récentes.

**Ce que cela permet de faire**  
Le responsable peut comprendre en quelques secondes si l'activité est normale ou s'il y a un problème à traiter.

**Exemple d'explication au manager**  
« Le tableau de bord est le cockpit de l'entreprise. Il résume les ventes, les paiements, les retards et les alertes pour aider le responsable à décider rapidement. »

### 2.2 Analyse

**Rôle métier**  
Le module Analyse aide à anticiper les risques : retards de paiement, anomalies, trésorerie future et comportements clients.

**Ce que l'utilisateur fait**  
Il consulte des scores, des scénarios et des alertes générées à partir des factures, paiements, clients et historiques.

**Exemples de valeur métier**  
- Identifier les clients qui risquent de payer en retard.
- Prévoir la trésorerie disponible dans les prochains jours.
- Repérer des incohérences dans les documents ou les flux financiers.
- Prioriser les relances clients.

**Point important**  
Ce module ne doit pas accuser automatiquement un client de fraude. Il doit plutôt signaler un risque ou une anomalie à vérifier.

**Exemple d'explication au manager**  
« L'analyse transforme les données de facturation et paiement en alertes utiles : qui risque de payer en retard, quel scénario de trésorerie prévoir, et quelles opérations méritent un contrôle. »

### 2.3 Profit

**Rôle métier**  
Le module Profit permet de comprendre la rentabilité de l'entreprise.

**Ce que l'utilisateur voit**  
Il peut voir les revenus, les charges, les marges, les produits ou clients rentables, et les postes qui réduisent le bénéfice.

**Données utilisées**  
- Factures de vente.
- Factures d'achat.
- Charges.
- Paie.
- Paiements.
- Catégories de produits ou services.

**Ce que cela permet de faire**  
Le responsable sait si l'entreprise gagne réellement de l'argent, quelles activités sont rentables et quelles dépenses pèsent le plus.

**Exemple d'explication au manager**  
« Profit ne montre pas seulement le chiffre d'affaires. Il aide à comprendre ce qui reste après les charges et où l'entreprise gagne ou perd de la marge. »

### 2.4 Paie

**Rôle métier**  
Le module Paie sert à gérer les salaires et les coûts liés aux employés.

**Ce que l'utilisateur fait**  
Il suit les employés, les montants de salaire, les charges sociales, les paiements de salaire et les éléments qui alimentent la comptabilité.

**Ce que cela apporte**  
La paie devient une charge suivie dans la trésorerie et dans le profit. Le responsable peut anticiper les sorties d'argent du mois.

**Exemple d'explication au manager**  
« La paie permet de suivre les salaires comme une charge importante de l'entreprise. Elle impacte la trésorerie, le profit et la comptabilité. »

## 3. Cycle Ventes

Le groupe Ventes couvre tout ce que l'entreprise vend à ses clients.

### 3.1 Devis

**Rôle métier**  
Le devis est une proposition commerciale envoyée au client avant facturation.

**Ce que l'utilisateur fait**  
Il prépare une offre avec les produits, quantités, prix, taxes et conditions.

**Suite logique**  
Si le client accepte, le devis peut devenir une facture.

**Exemple d'explication**  
« Le devis prépare la vente. Il évite de refaire les informations lorsque le client accepte, car il peut être converti en facture. »

### 3.2 Bons de commande

**Rôle métier**  
Le bon de commande confirme qu'une vente ou une demande client est acceptée.

**Ce que l'utilisateur fait**  
Il formalise la commande avant livraison ou facturation.

**Valeur métier**  
Cela permet de garder une trace claire entre ce qui a été demandé, livré et facturé.

### 3.3 Bons de livraison

**Rôle métier**  
Le bon de livraison prouve que les biens ou services ont été livrés.

**Ce que l'utilisateur fait**  
Il indique ce qui a été livré, à quelle date et à quel client.

**Valeur métier**  
Il justifie la facture et limite les litiges avec le client.

### 3.4 Factures

**Rôle métier**  
La facture est le document officiel demandé au client pour paiement.

**Ce que l'utilisateur fait**  
Il crée une facture, vérifie les taxes, ajoute les lignes de produits ou services, puis l'envoie ou la transmet selon le processus prévu.

**Ce que cela déclenche**  
- Création d'une créance client.
- Mise à jour du chiffre d'affaires.
- Suivi du paiement.
- Alimentation de la comptabilité et des rapports.

**Exemple d'explication**  
« La facture est le coeur du cycle de vente. Dès qu'elle est validée, elle devient une donnée financière, comptable et fiscale. »

### 3.5 Factures scannées

**Rôle métier**  
Ce module sert à importer ou consulter des factures sous forme de documents scannés.

**Ce que l'utilisateur fait**  
Il charge une facture, la relie à un dossier, puis vérifie les informations extraites ou saisies.

**Valeur métier**  
Cela réduit la ressaisie manuelle et centralise les justificatifs.

### 3.6 Factures d'avoir

**Rôle métier**  
L'avoir corrige ou annule partiellement une facture déjà émise.

**Cas d'utilisation**  
- Retour client.
- Remise après facturation.
- Erreur de montant.
- Annulation partielle ou totale.

**Exemple d'explication**  
« L'avoir permet de corriger proprement une facture sans supprimer l'historique. »

### 3.7 Paiements reçus

**Rôle métier**  
Ce module suit les encaissements clients.

**Ce que l'utilisateur fait**  
Il marque une facture comme payée, partiellement payée ou en retard.

**Valeur métier**  
Le responsable sait ce qui est encaissé, ce qui reste à recevoir et quels clients relancer.

## 4. Cycle Achats

Le groupe Achats couvre les dépenses, fournisseurs et sorties d'argent.

### 4.1 Bons de réception

**Rôle métier**  
Le bon de réception confirme que l'entreprise a reçu un bien ou un service.

**Utilité**  
Il permet de comparer ce qui a été commandé, reçu et facturé par le fournisseur.

### 4.2 Bons de commande achat

**Rôle métier**  
Le bon de commande achat formalise une demande envoyée à un fournisseur.

**Valeur métier**  
Il structure les achats avant réception et paiement.

### 4.3 Factures fournisseur

**Rôle métier**  
La facture fournisseur représente une dette de l'entreprise envers un fournisseur.

**Ce que l'utilisateur fait**  
Il enregistre la facture fournisseur, vérifie les montants, taxes et échéances, puis suit le paiement.

**Impact**  
Elle alimente les charges, la trésorerie, la comptabilité et le calcul du profit.

### 4.4 Factures scannées achat

**Rôle métier**  
Ce module sert à importer des factures fournisseur à partir de fichiers ou scans.

**Valeur métier**  
Il facilite l'archivage et évite de perdre les justificatifs d'achat.

### 4.5 Prestations de service

**Rôle métier**  
Ce module permet de suivre les achats de services : conseil, maintenance, sous-traitance, abonnement, honoraires, etc.

**Valeur métier**  
Il aide à distinguer les dépenses de service des achats de produits.

### 4.6 Paiements fournisseur

**Rôle métier**  
Ce module suit les paiements sortants.

**Ce que l'utilisateur fait**  
Il enregistre les règlements effectués aux fournisseurs.

**Valeur métier**  
Il donne une vision claire des dettes payées, restantes et à échéance.

### 4.7 Retenue à la source

**Rôle métier**  
La retenue à la source est une retenue fiscale appliquée sur certains paiements selon la réglementation.

**Ce que l'utilisateur fait**  
Il suit les montants retenus, les bénéficiaires et les documents à produire.

**Valeur métier**  
Cela réduit le risque d'erreur fiscale sur les paiements soumis à retenue.

## 5. Référentiel

Le référentiel contient les données de base utilisées partout dans le système.

### 5.1 Clients

**Rôle métier**  
Le module Clients centralise les informations des clients.

**Données typiques**  
Nom, adresse, matricule fiscal, email, téléphone, conditions de paiement, statut et historique.

**Utilisation dans le projet**  
Les clients sont utilisés dans les devis, factures, paiements, relances et analyses.

**Exemple d'explication**  
« Le client est une fiche de référence. Une fois créé, il est réutilisé dans toutes les factures et tous les suivis. »

### 5.2 Produits

**Rôle métier**  
Le module Produits contient le catalogue des biens et services vendus.

**Données typiques**  
Libellé, prix, unité, catégorie, taxe, description.

**Valeur métier**  
Il accélère la création des factures et réduit les erreurs de prix ou de taxe.

### 5.3 Catégories

**Rôle métier**  
Les catégories servent à organiser les produits, services, ventes et achats.

**Exemples**  
Services, logiciels, matériel, formation, frais généraux, transport.

**Valeur métier**  
Elles permettent de mieux lire les rapports, le profit et les analyses.

## 6. Mon entreprise

### 6.1 Mon entreprise

**Rôle métier**  
Ce module contient la fiche officielle de l'entreprise.

**Données importantes**  
Raison sociale, matricule fiscal, adresse, régime TVA, informations bancaires, contacts, logo et paramètres fiscaux.

**Valeur métier**  
Ces informations sont utilisées automatiquement dans les documents, factures, exports et contrôles.

### 6.2 Personnalisation

**Rôle métier**  
La personnalisation permet d'adapter le système aux règles internes de l'entreprise.

**Sous-parties principales**

**Documents**  
Gestion de la numérotation, modèle PDF, apparence et types de documents.

**Catégories**  
Organisation des catégories de vente et d'achat.

**Fiscal et légal**  
Gestion des taxes, TVA et retenues à la source.

**Configuration**  
Paramétrage des articles, unités, modes de paiement, comptabilité, conditions d'affichage et webhooks.

**Exemple d'explication**  
« La personnalisation sert à adapter TuniFlow au fonctionnement réel de l'entreprise : numéros de factures, taxes, modèles PDF, conditions de paiement et règles comptables. »

### 6.3 Calendrier

**Rôle métier**  
Le calendrier centralise les dates importantes.

**Exemples**  
Échéances de paiement, dates fiscales, relances, rendez-vous, tâches internes.

**Valeur métier**  
Il aide l'équipe à ne pas oublier les échéances clients, fournisseurs ou fiscales.

### 6.4 Utilisateurs

**Rôle métier**  
Le module Utilisateurs sert à gérer les accès internes.

**Ce que l'administrateur fait**  
Il ajoute des utilisateurs, attribue des rôles et limite les droits selon les responsabilités.

**Exemples de rôles**  
Responsable entreprise, responsable financier, collaborateur ventes, comptable, lecteur.

**Valeur métier**  
Chaque personne voit uniquement ce qu'elle est autorisée à utiliser.

## 7. Comptabilité

### 7.1 Tableau de bord comptabilité

**Rôle métier**  
Ce module donne une vision comptable structurée : écritures, journaux, balance, grand livre, actifs, états financiers et exercices.

**Valeur métier**  
Il relie les documents commerciaux à la comptabilité de l'entreprise.

### 7.2 Transactions

**Rôle métier**  
Les transactions représentent les mouvements financiers ou comptables.

**Exemples**  
Paiement reçu, paiement fournisseur, charge, encaissement, décaissement, écriture générée.

**Valeur métier**  
Elles permettent de suivre l'argent qui entre et sort.

### 7.3 Paramètres fiscaux

**Rôle métier**  
Ce module configure les règles fiscales utilisées dans les documents.

**Exemples**  
Taux TVA, retenues, timbres, règles spécifiques, paramètres de déclaration.

**Valeur métier**  
Il évite les erreurs fiscales répétées dans les factures.

### 7.4 Taxes

**Rôle métier**  
Le module Taxes permet de suivre et paramétrer les taxes applicables.

**Exemples**  
TVA, FODEC, timbre fiscal, autres taxes selon le contexte.

**Valeur métier**  
Les taxes sont appliquées de manière cohérente dans les documents et rapports.

### 7.5 Déclaration TVA

**Rôle métier**  
Ce module prépare le suivi de la TVA collectée et déductible.

**Valeur métier**  
Il aide à préparer les montants nécessaires aux déclarations fiscales.

### 7.6 Trésorerie

**Rôle métier**  
La trésorerie suit l'argent disponible et les flux attendus.

**Ce que l'utilisateur voit**  
Encaissements attendus, paiements fournisseurs, charges fixes, prévisions.

**Valeur métier**  
Le responsable financier sait si l'entreprise aura assez d'argent pour payer ses charges.

## 8. Profil

**Rôle métier**  
Le profil contient les informations personnelles de l'utilisateur connecté.

**Ce que l'utilisateur peut gérer**  
Nom, email, mot de passe, préférences, sécurité du compte.

**Valeur métier**  
Chaque utilisateur garde son identité et ses préférences dans la plateforme.

## 9. Sidebar admin

Cette sidebar est utilisée par l'administrateur de la plateforme.

### 9.1 Dashboard admin

**Rôle métier**  
Il donne une vue globale de la plateforme.

**Exemples d'indicateurs**  
Nombre d'entreprises, utilisateurs, demandes d'accès, factures, alertes système.

### 9.2 Entreprises

**Rôle métier**  
Ce module permet de superviser les entreprises inscrites.

**Ce que l'admin fait**  
Il consulte les fiches entreprises, leur statut, leur activité et leurs accès.

### 9.3 Demandes KYC

**Rôle métier**  
KYC signifie vérification de l'identité et du dossier entreprise.

**Ce que l'admin fait**  
Il contrôle les justificatifs, valide ou refuse une demande, et demande des corrections si nécessaire.

**Valeur métier**  
Seules les entreprises vérifiées peuvent accéder à l'espace complet.

### 9.4 Demandes démo

**Rôle métier**  
Ce module suit les prospects qui demandent une démonstration.

**Valeur métier**  
Il aide l'équipe commerciale à contacter les entreprises intéressées.

### 9.5 Utilisateurs admin

**Rôle métier**  
Ce module permet de gérer les comptes utilisateurs au niveau plateforme.

**Exemples**  
Créer, désactiver, contrôler les rôles et suivre l'activité.

### 9.6 Factures globales

**Rôle métier**  
Ce module donne une vue globale des factures traitées par la plateforme.

**Valeur métier**  
Il permet de suivre le volume, les statuts et les éventuelles anomalies de facturation.

### 9.7 Audit

**Rôle métier**  
L'audit garde l'historique des actions importantes.

**Exemples**  
Connexion, validation KYC, modification d'une facture, changement de paramètres, suppression.

**Valeur métier**  
Il permet de savoir qui a fait quoi, quand et sur quel élément.

### 9.8 Paramètres admin

**Rôle métier**  
Ce module regroupe la configuration globale de la plateforme.

**Exemples**  
Règles système, paramètres de sécurité, notifications, options générales.

## 10. Parcours métier à présenter

### Parcours 1 : vente complète

1. Créer un client.
2. Créer un devis.
3. Convertir le devis en facture.
4. Suivre le paiement reçu.
5. Alimenter automatiquement le tableau de bord, le profit et la comptabilité.

**Phrase simple**  
« Une vente démarre avec un client et un devis, devient une facture, puis se termine avec un paiement suivi dans la trésorerie. »

### Parcours 2 : achat fournisseur

1. Créer ou recevoir un bon de commande achat.
2. Enregistrer une facture fournisseur.
3. Vérifier les taxes et la retenue si nécessaire.
4. Payer le fournisseur.
5. Mettre à jour les charges, le profit et la trésorerie.

**Phrase simple**  
« Le cycle achat contrôle ce que l'entreprise doit payer et son impact sur les charges. »

### Parcours 3 : suivi financier

1. Les factures de vente créent des encaissements attendus.
2. Les achats et la paie créent des décaissements.
3. La trésorerie compare ce qui entre et ce qui sort.
4. L'analyse prédit les retards et les scénarios possibles.

**Phrase simple**  
« Le responsable financier peut anticiper les problèmes avant qu'ils arrivent. »

### Parcours 4 : validation administrative

1. Une entreprise demande l'accès.
2. Elle fournit ses justificatifs.
3. L'admin vérifie la demande KYC.
4. L'entreprise validée peut utiliser la plateforme.
5. Toutes les actions importantes sont gardées dans l'audit.

**Phrase simple**  
« L'accès n'est pas automatique : il passe par une validation administrative pour sécuriser la plateforme. »

## 11. Données métier importantes

Pour expliquer la base de données au manager, il faut dire qu'elle stocke principalement :

- Les entreprises.
- Les utilisateurs et leurs rôles.
- Les clients.
- Les produits et catégories.
- Les devis, commandes, livraisons, factures et avoirs.
- Les factures scannées et justificatifs.
- Les paiements reçus et fournisseurs.
- Les achats et charges.
- Les salaires et données de paie.
- Les transactions.
- Les écritures et paramètres comptables.
- Les taxes et paramètres fiscaux.
- Les demandes KYC et demandes démo.
- Les journaux d'audit.
- Les scores ou résultats d'analyse.

## 12. Points à corriger ou surveiller avant démonstration

1. Certains libellés du code semblent avoir un problème d'encodage, par exemple `Factures scannÃ©es`, `CatÃ©gories`, `Retenue Ã  la source`. Il faut les corriger avant une présentation.
2. Les modules Analyse, Profit et Paie doivent être expliqués comme des aides à la décision, pas comme des systèmes magiques.
3. Les règles de détection d'anomalies doivent éviter de qualifier automatiquement une opération de fraude.
4. Le module Comptabilité doit rester cohérent avec les documents : facture, paiement, taxe, écriture.
5. Les accès utilisateurs doivent être bien définis pour montrer une vraie logique de sécurité.

## 13. Résumé rapide pour le manager

TuniFlow couvre trois grands besoins :

**Gestion opérationnelle**  
Créer les clients, produits, devis, factures, achats et paiements.

**Gestion financière**  
Suivre les paiements, les charges, la paie, la trésorerie, le profit et les retards.

**Gestion administrative et conformité**  
Configurer l'entreprise, les taxes, les documents, la comptabilité, les utilisateurs, l'audit et les validations KYC.

La valeur principale du projet est de centraliser le cycle de gestion d'une entreprise : vente, achat, paiement, comptabilité, suivi financier et contrôle.
