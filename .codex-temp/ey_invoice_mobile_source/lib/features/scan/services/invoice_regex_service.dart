import '../models/scan_draft.dart';

class InvoiceRegexService {
  ScanDraft parse({
    required String rawText,
    required String imagePath,
  }) {
    final normalized = rawText
        .replaceAll('\r\n', '\n')
        .replaceAll('\r', '\n')
        .replaceAll('\u00A0', ' ')
        .trim();

    final lines = normalized
        .split('\n')
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .toList();

    final supplier = _detectSupplier(lines);
    final invoiceNumber = _findFirst(
      normalized,
      <RegExp>[
        RegExp(
          r'(?:facture|invoice)\s*(?:n[°o]|num[eé]ro)?\s*[:#-]?\s*([A-Z0-9\/\-_]+)',
          caseSensitive: false,
        ),
        RegExp(
          r'\b(?:n[°o]|num[eé]ro)\s*[:#-]?\s*([A-Z0-9\/\-_]{3,})',
          caseSensitive: false,
        ),
      ],
    );
    final invoiceDate = _findFirst(
      normalized,
      <RegExp>[
        RegExp(
          r'(?:date(?:\s+facture)?)\s*[:#-]?\s*(\d{2}[\/.\-]\d{2}[\/.\-]\d{4})',
          caseSensitive: false,
        ),
        RegExp(r'\b(\d{2}[\/.\-]\d{2}[\/.\-]\d{4})\b'),
      ],
    );
    final dueDate = _findFirst(
      normalized,
      <RegExp>[
        RegExp(
          r'(?:[ée]ch[ée]ance|due(?:\s+date)?)\s*[:#-]?\s*(\d{2}[\/.\-]\d{2}[\/.\-]\d{4})',
          caseSensitive: false,
        ),
      ],
    );
    final totalAmount = _findAmount(
      normalized,
      const <String>[
        'net à payer',
        'net a payer',
        'total ttc',
        'montant ttc',
        'ttc',
        'total',
      ],
    );
    final subtotalAmount = _findAmount(
      normalized,
      const <String>[
        'total ht',
        'montant ht',
        'ht',
      ],
    );
    final taxAmount = _findAmount(
      normalized,
      const <String>[
        'montant tva',
        'total tva',
        'tva',
        'tax',
      ],
    );
    final currency = _detectCurrency(normalized);

    final confidence = _computeConfidence(
      supplier: supplier,
      invoiceNumber: invoiceNumber,
      invoiceDate: invoiceDate,
      totalAmount: totalAmount,
      taxAmount: taxAmount,
      currency: currency,
    );

    return ScanDraft(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      imagePath: imagePath,
      rawText: normalized,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      supplierName: supplier,
      invoiceNumber: invoiceNumber,
      invoiceDate: invoiceDate,
      dueDate: dueDate,
      totalAmount: totalAmount,
      subtotalAmount: subtotalAmount,
      taxAmount: taxAmount,
      currency: currency,
      confidence: confidence,
      status: ScanDraftStatus.extracted,
    );
  }

  String _detectSupplier(List<String> lines) {
    for (final line in lines.take(10)) {
      final lower = line.toLowerCase();
      final isNoise = lower.contains('facture') ||
          lower.contains('invoice') ||
          lower.contains('date') ||
          lower.contains('tva') ||
          lower.contains('total') ||
          lower.contains('adresse') ||
          lower.contains('telephone');

      if (!isNoise && line.length >= 4 && RegExp(r'[A-Za-z]').hasMatch(line)) {
        return line;
      }
    }
    return '';
  }

  String _findFirst(String text, List<RegExp> patterns) {
    for (final pattern in patterns) {
      final match = pattern.firstMatch(text);
      if (match != null && match.groupCount >= 1) {
        return match.group(1)?.trim() ?? '';
      }
    }
    return '';
  }

  String _findAmount(String text, List<String> labels) {
    for (final label in labels) {
      final pattern = RegExp(
        '${RegExp.escape(label)}\\s*[:=-]?\\s*([0-9][0-9\\s.,]{0,20})',
        caseSensitive: false,
      );
      final match = pattern.firstMatch(text);
      if (match != null) {
        return _sanitizeAmount(match.group(1) ?? '');
      }
    }

    return '';
  }

  String _sanitizeAmount(String value) {
    return value.replaceAll(RegExp(r'\s+'), ' ').trim();
  }

  String _detectCurrency(String text) {
    final lower = text.toLowerCase();
    if (lower.contains('tnd') || lower.contains(' dt')) {
      return 'TND';
    }
    if (lower.contains('eur') || lower.contains('€')) {
      return 'EUR';
    }
    if (lower.contains('usd') || lower.contains('\$')) {
      return 'USD';
    }
    return '';
  }

  double _computeConfidence({
    required String supplier,
    required String invoiceNumber,
    required String invoiceDate,
    required String totalAmount,
    required String taxAmount,
    required String currency,
  }) {
    final checks = <String>[
      supplier,
      invoiceNumber,
      invoiceDate,
      totalAmount,
      taxAmount,
      currency,
    ];

    final found = checks.where((value) => value.trim().isNotEmpty).length;
    return found / checks.length;
  }
}
