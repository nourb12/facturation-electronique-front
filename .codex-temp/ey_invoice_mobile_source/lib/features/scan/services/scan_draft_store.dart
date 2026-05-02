import 'dart:convert';
import 'dart:io';

import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/scan_draft.dart';

class ScanDraftStore {
  static const String _draftsKey = 'ey_mobile_scan_drafts';

  Future<List<ScanDraft>> loadDrafts() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_draftsKey);
    if (raw == null || raw.isEmpty) {
      return const <ScanDraft>[];
    }

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) {
        return const <ScanDraft>[];
      }

      return decoded
          .whereType<Map<String, dynamic>>()
          .map(ScanDraft.fromJson)
          .toList();
    } catch (_) {
      return const <ScanDraft>[];
    }
  }

  Future<void> saveDrafts(List<ScanDraft> drafts) async {
    final prefs = await SharedPreferences.getInstance();
    final payload = drafts.map((draft) => draft.toJson()).toList();
    await prefs.setString(_draftsKey, jsonEncode(payload));
  }

  Future<String> persistImportedImage(XFile source) async {
    final documentsDir = await getApplicationDocumentsDirectory();
    final scanDir = Directory(p.join(documentsDir.path, 'scan_images'));
    if (!await scanDir.exists()) {
      await scanDir.create(recursive: true);
    }

    final extension = p.extension(source.path).isEmpty
        ? '.jpg'
        : p.extension(source.path);
    final fileName =
        'scan_${DateTime.now().millisecondsSinceEpoch}${extension.toLowerCase()}';
    final target = File(p.join(scanDir.path, fileName));
    final bytes = await source.readAsBytes();
    await target.writeAsBytes(bytes, flush: true);
    return target.path;
  }

  Future<void> deleteImage(String path) async {
    final file = File(path);
    if (await file.exists()) {
      await file.delete();
    }
  }
}
