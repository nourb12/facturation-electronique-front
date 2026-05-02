import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/auth_session.dart';
import '../models/user_profile.dart';
import '../services/auth_api_service.dart';

enum SessionStatus {
  booting,
  unauthenticated,
  awaitingTwoFactor,
  authenticated,
}

class SessionController extends ChangeNotifier {
  SessionController({
    required AuthApiService apiService,
    FlutterSecureStorage? secureStorage,
  })  : _apiService = apiService,
        _secureStorage = secureStorage ?? const FlutterSecureStorage();

  static const String _sessionStorageKey = 'ey_mobile_auth_session';

  final AuthApiService _apiService;
  final FlutterSecureStorage _secureStorage;

  SessionStatus _status = SessionStatus.booting;
  bool _isBusy = false;
  String? _errorMessage;
  String? _pendingUserId;
  AuthSession? _session;

  SessionStatus get status => _status;
  bool get isBusy => _isBusy;
  String? get errorMessage => _errorMessage;
  String? get pendingUserId => _pendingUserId;
  AuthSession? get session => _session;
  UserProfile? get user => _session?.utilisateur;

  Future<void> bootstrap() async {
    _status = SessionStatus.booting;
    notifyListeners();

    try {
      final rawSession = await _secureStorage.read(key: _sessionStorageKey);
      if (rawSession == null || rawSession.isEmpty) {
        _status = SessionStatus.unauthenticated;
        notifyListeners();
        return;
      }

      final decoded = jsonDecode(rawSession);
      if (decoded is! Map<String, dynamic>) {
        _status = SessionStatus.unauthenticated;
        notifyListeners();
        return;
      }

      _session = AuthSession.fromJson(decoded);
      _status = SessionStatus.authenticated;
    } catch (_) {
      _session = null;
      _status = SessionStatus.unauthenticated;
    }

    notifyListeners();
  }

  Future<bool> login({
    required String email,
    required String password,
  }) async {
    _setBusy(true);
    _errorMessage = null;
    notifyListeners();

    try {
      final result = await _apiService.login(
        email: email.trim(),
        motDePasse: password,
      );

      if (result.requiresTwoFactor) {
        _session = null;
        _pendingUserId = result.pendingUserId;
        _status = SessionStatus.awaitingTwoFactor;
        return true;
      }

      _session = result.session;
      _pendingUserId = null;
      _status = SessionStatus.authenticated;
      await _persistSession();
      return true;
    } on ApiException catch (error) {
      _errorMessage = error.message;
      _status = SessionStatus.unauthenticated;
      return false;
    } catch (_) {
      _errorMessage = 'Connexion impossible pour le moment.';
      _status = SessionStatus.unauthenticated;
      return false;
    } finally {
      _setBusy(false);
    }
  }

  Future<bool> verifyTwoFactorCode(String code) async {
    if (_pendingUserId == null || _pendingUserId!.isEmpty) {
      _errorMessage = 'Session 2FA introuvable.';
      notifyListeners();
      return false;
    }

    _setBusy(true);
    _errorMessage = null;
    notifyListeners();

    try {
      final session = await _apiService.verifyTwoFactor(
        utilisateurId: _pendingUserId!,
        code: code.trim(),
      );
      _session = session;
      _pendingUserId = null;
      _status = SessionStatus.authenticated;
      await _persistSession();
      return true;
    } on ApiException catch (error) {
      _errorMessage = error.message;
      return false;
    } catch (_) {
      _errorMessage = 'Validation 2FA impossible.';
      return false;
    } finally {
      _setBusy(false);
    }
  }

  Future<void> logout() async {
    final currentSession = _session;

    _setBusy(true);
    notifyListeners();

    try {
      if (currentSession != null) {
        await _apiService.logout(refreshToken: currentSession.refreshToken);
      }
    } catch (_) {
    } finally {
      await _secureStorage.delete(key: _sessionStorageKey);
      _session = null;
      _pendingUserId = null;
      _errorMessage = null;
      _status = SessionStatus.unauthenticated;
      _setBusy(false);
      notifyListeners();
    }
  }

  void cancelTwoFactor() {
    _pendingUserId = null;
    _errorMessage = null;
    _status = SessionStatus.unauthenticated;
    notifyListeners();
  }

  void clearError() {
    if (_errorMessage == null) {
      return;
    }
    _errorMessage = null;
    notifyListeners();
  }

  Future<void> _persistSession() async {
    if (_session == null) {
      await _secureStorage.delete(key: _sessionStorageKey);
      return;
    }

    await _secureStorage.write(
      key: _sessionStorageKey,
      value: jsonEncode(_session!.toJson()),
    );
  }

  void _setBusy(bool value) {
    _isBusy = value;
    notifyListeners();
  }
}
