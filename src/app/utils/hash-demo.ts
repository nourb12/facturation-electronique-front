/**
 * 🔐 DÉMO INTERACTIVE DU HASHAGE NUMÉRIQUE
 * 
 * Copiez ce code dans la console du navigateur pour voir le hashage en action !
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. FONCTION DE HASHAGE SIMPLE
// ═══════════════════════════════════════════════════════════════════════════

async function hashString(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. EXEMPLE 1 : HASH D'UNE FACTURE
// ═══════════════════════════════════════════════════════════════════════════

async function demoFactureHash() {
  console.log('🧪 DÉMO 1 : Hash d\'une Facture\n');
  
  const facture = {
    numero: 'FAC-2025-001',
    client: 'ACME Corporation',
    montantTTC: 1500.000,
    devise: 'TND',
    dateEmission: '2025-05-02'
  };

  const factureJson = JSON.stringify(facture);
  const hash = await hashString(factureJson);

  console.log('📄 Facture:', facture);
  console.log('🔐 Hash SHA-256:', hash);
  console.log('📏 Longueur:', hash.length, 'caractères\n');

  // Modification d'un seul caractère
  const factureModifiee = { ...facture, montantTTC: 1500.001 };
  const factureModifieeJson = JSON.stringify(factureModifiee);
  const hashModifie = await hashString(factureModifieeJson);

  console.log('📄 Facture Modifiée (0.001 TND de différence):', factureModifiee);
  console.log('🔐 Hash SHA-256:', hashModifie);
  console.log('⚠️  Hash identique ?', hash === hashModifie ? 'OUI' : 'NON ❌');
  console.log('💡 Même un changement minuscule change complètement le hash!\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. EXEMPLE 2 : VÉRIFICATION D'INTÉGRITÉ
// ═══════════════════════════════════════════════════════════════════════════

async function demoVerificationIntegrite() {
  console.log('🧪 DÉMO 2 : Vérification d\'Intégrité\n');

  const documentOriginal = 'Facture N°2025-001 - Montant: 1500.000 TND';
  const hashOriginal = await hashString(documentOriginal);

  console.log('📄 Document Original:', documentOriginal);
  console.log('🔐 Hash Original:', hashOriginal);
  console.log('💾 [Hash stocké en base de données]\n');

  // Simulation : quelqu'un essaie de modifier le document
  const documentModifie = 'Facture N°2025-001 - Montant: 150.000 TND'; // Fraude !
  const hashActuel = await hashString(documentModifie);

  console.log('📄 Document Actuel:', documentModifie);
  console.log('🔐 Hash Actuel:', hashActuel);
  console.log('🔍 Vérification...');
  
  if (hashOriginal === hashActuel) {
    console.log('✅ Document VALIDE - Non modifié');
  } else {
    console.log('❌ Document INVALIDE - Modifié après signature !');
    console.log('⚠️  FRAUDE DÉTECTÉE !\n');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. EXEMPLE 3 : SIGNATURE COMPLÈTE
// ═══════════════════════════════════════════════════════════════════════════

async function demoSignatureComplete() {
  console.log('🧪 DÉMO 3 : Processus de Signature Complet\n');

  // Étape 1 : Créer la facture
  const facture = {
    id: 'uuid-123',
    numero: 'FAC-2025-001',
    clientId: 'client-456',
    totalTTC: 1500.000,
    devise: 'TND',
    dateEmission: '2025-05-02T10:30:00Z',
    lignes: [
      { designation: 'Prestation conseil', quantite: 10, prixUnitaire: 150 }
    ]
  };

  console.log('📄 Facture créée:', facture);

  // Étape 2 : Calculer le hash du document
  const factureJson = JSON.stringify(facture, Object.keys(facture).sort());
  const documentHash = await hashString(factureJson);
  console.log('🔐 Hash du document:', documentHash);

  // Étape 3 : Utilisateur signe avec PIN
  const userId = 'user-789';
  const timestamp = new Date().toISOString();
  const pin = '123456';

  console.log('\n👤 Utilisateur:', userId);
  console.log('🔑 PIN:', pin);
  console.log('⏰ Timestamp:', timestamp);

  // Étape 4 : Générer le hash de signature
  const signatureData = `${documentHash}|${timestamp}|${userId}`;
  const signatureHash = await hashString(signatureData);
  console.log('✍️  Hash de signature:', signatureHash);

  // Étape 5 : Enregistrer en base
  const signatureRecord = {
    id: 'sig-001',
    factureId: facture.id,
    userId: userId,
    hashDocument: documentHash,
    signatureData: signatureHash,
    horodatage: timestamp,
    statut: 'valide'
  };

  console.log('\n💾 Signature enregistrée:', signatureRecord);

  // Étape 6 : Vérification ultérieure
  console.log('\n🔍 VÉRIFICATION (quelques jours plus tard)...');
  
  const factureActuelle = facture; // Simuler récupération depuis DB
  const factureActuelleJson = JSON.stringify(factureActuelle, Object.keys(factureActuelle).sort());
  const hashActuel = await hashString(factureActuelleJson);

  console.log('🔐 Hash actuel:', hashActuel);
  console.log('🔐 Hash original:', signatureRecord.hashDocument);

  if (hashActuel === signatureRecord.hashDocument) {
    console.log('✅ SIGNATURE VALIDE - Document non modifié');
  } else {
    console.log('❌ SIGNATURE INVALIDE - Document modifié !');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. EXEMPLE 4 : COMPARAISON ALGORITHMES
// ═══════════════════════════════════════════════════════════════════════════

async function demoComparaisonAlgorithmes() {
  console.log('🧪 DÉMO 4 : Comparaison des Algorithmes de Hashage\n');

  const texte = 'Facture N°2025-001 - Montant: 1500.000 TND';

  // SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(texte);
  
  const hash256Buffer = await crypto.subtle.digest('SHA-256', data);
  const hash256 = Array.from(new Uint8Array(hash256Buffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  // SHA-512
  const hash512Buffer = await crypto.subtle.digest('SHA-512', data);
  const hash512 = Array.from(new Uint8Array(hash512Buffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  console.log('📄 Texte:', texte);
  console.log('\n🔐 SHA-256 (64 caractères):');
  console.log(hash256);
  console.log('\n🔐 SHA-512 (128 caractères):');
  console.log(hash512);
  console.log('\n💡 SHA-512 est plus long mais plus sécurisé');
  console.log('💡 SHA-256 est suffisant pour la plupart des cas\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. EXEMPLE 5 : DÉTECTION DE FRAUDE
// ═══════════════════════════════════════════════════════════════════════════

async function demoDetectionFraude() {
  console.log('🧪 DÉMO 5 : Détection de Fraude\n');

  // Scénario : Un employé malveillant essaie de modifier une facture signée

  const factureOriginale = {
    numero: 'FAC-2025-001',
    client: 'ACME Corp',
    montant: 1500.000,
    devise: 'TND'
  };

  const hashOriginal = await hashString(JSON.stringify(factureOriginale));
  
  console.log('📄 Facture Originale (signée):', factureOriginale);
  console.log('🔐 Hash stocké:', hashOriginal);
  console.log('✅ Facture signée et archivée\n');

  console.log('⏳ [3 mois plus tard...]\n');

  // Tentative de fraude
  const factureFrauduleuse = {
    numero: 'FAC-2025-001',
    client: 'ACME Corp',
    montant: 150.000, // ❌ Modifié de 1500 à 150 !
    devise: 'TND'
  };

  const hashFrauduleux = await hashString(JSON.stringify(factureFrauduleuse));

  console.log('🚨 Tentative de modification détectée !');
  console.log('📄 Facture Modifiée:', factureFrauduleuse);
  console.log('🔐 Hash actuel:', hashFrauduleux);
  console.log('🔐 Hash original:', hashOriginal);
  console.log('\n🔍 Vérification...');

  if (hashOriginal === hashFrauduleux) {
    console.log('✅ Document valide');
  } else {
    console.log('❌ FRAUDE DÉTECTÉE !');
    console.log('⚠️  Le document a été modifié après signature');
    console.log('⚠️  La signature n\'est plus valide');
    console.log('⚠️  Action : Alerter l\'administrateur\n');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. LANCER TOUTES LES DÉMOS
// ═══════════════════════════════════════════════════════════════════════════

export async function lancerToutesDemos() {
  console.clear();
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔐 DÉMO INTERACTIVE DU HASHAGE NUMÉRIQUE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  await demoFactureHash();
  console.log('─────────────────────────────────────────────────────────────\n');

  await demoVerificationIntegrite();
  console.log('─────────────────────────────────────────────────────────────\n');

  await demoSignatureComplete();
  console.log('─────────────────────────────────────────────────────────────\n');

  await demoComparaisonAlgorithmes();
  console.log('─────────────────────────────────────────────────────────────\n');

  await demoDetectionFraude();
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ Toutes les démos terminées !');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTRUCTIONS D'UTILISATION
// ═══════════════════════════════════════════════════════════════════════════

console.log(`
🎓 COMMENT UTILISER CETTE DÉMO :

1. Ouvrez la console du navigateur (F12)
2. Copiez-collez ce fichier complet
3. Exécutez : lancerToutesDemos()

Ou exécutez les démos individuellement :
- demoFactureHash()
- demoVerificationIntegrite()
- demoSignatureComplete()
- demoComparaisonAlgorithmes()
- demoDetectionFraude()
`);

// Export pour utilisation dans Angular
export {
  hashString,
  demoFactureHash,
  demoVerificationIntegrite,
  demoSignatureComplete,
  demoComparaisonAlgorithmes,
  demoDetectionFraude
};
