import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

import '../models/scan_draft.dart';
import '../services/invoice_regex_service.dart';
import '../services/ocr_service.dart';
import '../services/scan_draft_store.dart';

class ScanController extends ChangeNotifier {
  ScanController({
    required ScanDraftStore draftStore,
    required OcrService ocrService,
    required InvoiceRegexService regexService,
  })  : _draftStore = draftStore,
        _ocrService = ocrService,
        _regexService = regexService;

  final ScanDraftStore _draftStore;
  final OcrService _ocrService;
  final InvoiceRegexService _regexService;
  final ImagePicker _picker = ImagePicker();

  final List<ScanDraft> _drafts = <ScanDraft>[];

  bool _isBusy = false;
  bool _isReady = false;
  String? _errorMessage;

  List<ScanDraft> get drafts {
    final copy = List<ScanDraft>.from(_drafts);
    copy.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return copy;
  }

  bool get isBusy => _isBusy;
  bool get isReady => _isReady;
  bool get supportsOcr => _ocrService.isSupported;
  String? get errorMessage => _errorMessage;

  ScanDraft? get latestDraft {
    final items = drafts;
    if (items.isEmpty) {
      return null;
    }
    return items.first;
  }

  int get reviewedCount =>
      _drafts.where((draft) => draft.status == ScanDraftStatus.reviewed).length;

  int get validatedCount =>
      _drafts.where((draft) => draft.status == ScanDraftStatus.validated).length;

  int get extractedCount =>
      _drafts.where((draft) => draft.status == ScanDraftStatus.extracted).length;

  Future<void> loadDrafts() async {
    _setBusy(true);
    try {
      final loaded = await _draftStore.loadDrafts();
      _drafts
        ..clear()
        ..addAll(loaded);
      _isReady = true;
    } catch (_) {
      _errorMessage = 'Impossible de charger les brouillons.';
    } finally {
      _setBusy(false);
    }
  }

  Future<ScanDraft?> createDraftFromSource(ImageSource source) async {
    _setBusy(true);
    _errorMessage = null;

    try {
      if (!_ocrService.isSupported) {
        throw const OcrUnsupportedException(
          'Le scan OCR local est disponible uniquement sur Android et iOS.',
        );
      }

      if (source == ImageSource.camera) {
        final cameraStatus = await Permission.camera.request();
        if (!cameraStatus.isGranted) {
          throw const ScanFlowException(
            'Autorise la caméra pour lancer le scan.',
          );
        }
      }

      final pickedFile = await _picker.pickImage(
        source: source,
        maxWidth: 2200,
        imageQuality: 92,
      );

      if (pickedFile == null) {
        return null;
      }

      final storedPath = await _draftStore.persistImportedImage(pickedFile);
      final rawText = await _ocrService.extractText(storedPath);
      return _regexService.parse(rawText: rawText, imagePath: storedPath);
    } on OcrUnsupportedException catch (error) {
      _errorMessage = error.message;
      return null;
    } on ScanFlowException catch (error) {
      _errorMessage = error.message;
      return null;
    } catch (_) {
      _errorMessage = 'Le scan a échoué. Réessaie avec une image plus nette.';
      return null;
    } finally {
      _setBusy(false);
    }
  }

  Future<void> upsertDraft(ScanDraft draft) async {
    final index = _drafts.indexWhere((item) => item.id == draft.id);
    if (index == -1) {
      _drafts.add(draft);
    } else {
      _drafts[index] = draft;
    }

    await _draftStore.saveDrafts(_drafts);
    notifyListeners();
  }

  Future<void> deleteDraft(String id) async {
    final index = _drafts.indexWhere((item) => item.id == id);
    if (index == -1) {
      return;
    }

    final draft = _drafts.removeAt(index);
    await _draftStore.deleteImage(draft.imagePath);
    await _draftStore.saveDrafts(_drafts);
    notifyListeners();
  }

  void clearError() {
    if (_errorMessage == null) {
      return;
    }
    _errorMessage = null;
    notifyListeners();
  }

  @override
  void dispose() {
    unawaited(_ocrService.dispose());
    super.dispose();
  }

  void _setBusy(bool value) {
    _isBusy = value;
    notifyListeners();
  }
}

class ScanFlowException implements Exception {
  const ScanFlowException(this.message);

  final String message;

  @override
  String toString() => message;
}
