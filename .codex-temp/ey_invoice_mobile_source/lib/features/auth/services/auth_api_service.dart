import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/network/api_config.dart';
import '../models/auth_session.dart';

class AuthApiService {
  AuthApiService({
    http.Client? client,
  }) : _client = client ?? http.Client();

  final http.Client _client;

  Future<LoginResult> login({
    required String email,
    required String motDePasse,
  }) async {
    final response = await _client.post(
      _uri('/api/auth/login'),
      headers: _headers,
      body: jsonEncode(
        <String, dynamic>{
          'email': email,
          'motDePasse': motDePasse,
        },
      ),
    );

    final body = _decodeMap(response);

    if (body.containsKey('accessToken') || body.containsKey('AccessToken')) {
      return LoginResult.authenticated(AuthSession.fromJson(body));
    }

    final pendingUserId = _readString(
      body,
      const ['utilisateurId', 'UtilisateurId'],
    );
    if (pendingUserId == null || pendingUserId.isEmpty) {
      throw const ApiException('Réponse de connexion inattendue.');
    }

    return LoginResult.twoFactorRequired(pendingUserId);
  }

  Future<AuthSession> verifyTwoFactor({
    required String utilisateurId,
    required String code,
  }) async {
    final response = await _client.post(
      _uri('/api/auth/2fa/login'),
      headers: _headers,
      body: jsonEncode(
        <String, dynamic>{
          'utilisateurId': utilisateurId,
          'code': code,
        },
      ),
    );

    return AuthSession.fromJson(_decodeMap(response));
  }

  Future<void> logout({
    required String refreshToken,
  }) async {
    final response = await _client.post(
      _uri('/api/auth/logout'),
      headers: _headers,
      body: jsonEncode(<String, dynamic>{'refreshToken': refreshToken}),
    );

    _decodeMap(response);
  }

  Uri _uri(String path) => Uri.parse('${ApiConfig.baseUrl}$path');

  Map<String, String> get _headers => const <String, String>{
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  Map<String, dynamic> _decodeMap(http.Response response) {
    dynamic decoded;
    final text = response.bodyBytes.isEmpty
        ? '{}'
        : utf8.decode(response.bodyBytes, allowMalformed: true);

    if (text.trim().isEmpty) {
      decoded = <String, dynamic>{};
    } else {
      try {
        decoded = jsonDecode(text);
      } on FormatException {
        throw const ApiException('Réponse serveur illisible.');
      }
    }

    if (decoded is! Map<String, dynamic>) {
      throw const ApiException('Réponse serveur inattendue.');
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(_extractMessage(decoded));
    }

    return decoded;
  }

  String _extractMessage(Map<String, dynamic> body) {
    final direct = _readString(
      body,
      const ['message', 'Message', 'title', 'Title', 'detail', 'Detail'],
    );

    if (direct != null && direct.isNotEmpty) {
      return direct;
    }

    final errors = body['errors'];
    if (errors is Map<String, dynamic> && errors.isNotEmpty) {
      final firstEntry = errors.entries.first;
      final value = firstEntry.value;
      if (value is List && value.isNotEmpty) {
        return value.first.toString();
      }
      return value.toString();
    }

    return 'Une erreur serveur est survenue.';
  }

  String? _readString(Map<String, dynamic> json, List<String> keys) {
    for (final key in keys) {
      final value = json[key];
      if (value is String && value.isNotEmpty) {
        return value;
      }
    }
    return null;
  }
}

class ApiException implements Exception {
  const ApiException(this.message);

  final String message;

  @override
  String toString() => message;
}
