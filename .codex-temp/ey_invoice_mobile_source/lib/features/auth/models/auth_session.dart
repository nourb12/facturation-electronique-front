import 'user_profile.dart';

class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.utilisateur,
    this.expireA,
  });

  final String accessToken;
  final String refreshToken;
  final DateTime? expireA;
  final UserProfile utilisateur;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    String? readString(List<String> keys) {
      for (final key in keys) {
        final value = json[key];
        if (value is String && value.isNotEmpty) {
          return value;
        }
      }
      return null;
    }

    Map<String, dynamic> userMap = <String, dynamic>{};
    for (final key in const ['utilisateur', 'Utilisateur']) {
      final value = json[key];
      if (value is Map<String, dynamic>) {
        userMap = value;
        break;
      }
    }

    final expiryString = readString(const ['expireA', 'ExpireA']);

    return AuthSession(
      accessToken: readString(const ['accessToken', 'AccessToken']) ?? '',
      refreshToken: readString(const ['refreshToken', 'RefreshToken']) ?? '',
      expireA: expiryString == null ? null : DateTime.tryParse(expiryString),
      utilisateur: UserProfile.fromJson(userMap),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      'expireA': expireA?.toIso8601String(),
      'utilisateur': utilisateur.toJson(),
    };
  }
}

class LoginResult {
  const LoginResult.authenticated(this.session)
      : pendingUserId = null,
        requiresTwoFactor = false;

  const LoginResult.twoFactorRequired(this.pendingUserId)
      : session = null,
        requiresTwoFactor = true;

  final AuthSession? session;
  final String? pendingUserId;
  final bool requiresTwoFactor;
}
