import 'dart:io';

import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

class OcrService {
  OcrService()
      : _textRecognizer = TextRecognizer(
          script: TextRecognitionScript.latin,
        );

  final TextRecognizer _textRecognizer;

  bool get isSupported => Platform.isAndroid || Platform.isIOS;

  Future<String> extractText(String imagePath) async {
    if (!isSupported) {
      throw const OcrUnsupportedException(
        'Le moteur OCR local est disponible sur Android et iOS.',
      );
    }

    final inputImage = InputImage.fromFilePath(imagePath);
    final recognizedText = await _textRecognizer.processImage(inputImage);
    return recognizedText.text.trim();
  }

  Future<void> dispose() => _textRecognizer.close();
}

class OcrUnsupportedException implements Exception {
  const OcrUnsupportedException(this.message);

  final String message;

  @override
  String toString() => message;
}
