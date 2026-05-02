class UserProfile {
  const UserProfile({
    required this.id,
    required this.prenom,
    required this.nom,
    required this.email,
    required this.role,
    required this.statut,
    required this.deuxFaActif,
    required this.alerteConnexion,
    this.entrepriseId,
    this.derniereConnexion,
    this.telephone,
    this.poste,
    this.departement,
  });

  final String id;
  final String prenom;
  final String nom;
  final String email;
  final String role;
  final String statut;
  final bool deuxFaActif;
  final bool alerteConnexion;
  final String? entrepriseId;
  final DateTime? derniereConnexion;
  final String? telephone;
  final String? poste;
  final String? departement;

  String get fullName => '$prenom $nom'.trim();

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    String? readString(List<String> keys) {
      for (final key in keys) {
        final value = json[key];
        if (value is String && value.isNotEmpty) {
          return value;
        }
      }
      return null;
    }

    bool readBool(List<String> keys) {
      for (final key in keys) {
        final value = json[key];
        if (value is bool) {
          return value;
        }
      }
      return false;
    }

    final connectionRaw =
        readString(const ['derniereConnexion', 'DerniereConnexion']);

    return UserProfile(
      id: readString(const ['id', 'Id']) ?? '',
      prenom: readString(const ['prenom', 'Prenom']) ?? '',
      nom: readString(const ['nom', 'Nom']) ?? '',
      email: readString(const ['email', 'Email']) ?? '',
      role: readString(const ['role', 'Role']) ?? '',
      statut: readString(const ['statut', 'Statut']) ?? '',
      deuxFaActif: readBool(const ['deuxFAActif', 'DeuxFAActif']),
      entrepriseId: readString(const ['entrepriseId', 'EntrepriseId']),
      derniereConnexion:
          connectionRaw == null ? null : DateTime.tryParse(connectionRaw),
      telephone: readString(const ['telephone', 'Telephone']),
      poste: readString(const ['poste', 'Poste']),
      departement: readString(const ['departement', 'Departement']),
      alerteConnexion:
          readBool(const ['alerteConnexion', 'AlerteConnexion']),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'prenom': prenom,
      'nom': nom,
      'email': email,
      'role': role,
      'statut': statut,
      'deuxFAActif': deuxFaActif,
      'entrepriseId': entrepriseId,
      'derniereConnexion': derniereConnexion?.toIso8601String(),
      'telephone': telephone,
      'poste': poste,
      'departement': departement,
      'alerteConnexion': alerteConnexion,
    };
  }
}
