enum ScanDraftStatus {
  extracted,
  reviewed,
  validated,
}

extension ScanDraftStatusX on ScanDraftStatus {
  String get label {
    switch (this) {
      case ScanDraftStatus.extracted:
        return 'Extrait';
      case ScanDraftStatus.reviewed:
        return 'Brouillon';
      case ScanDraftStatus.validated:
        return 'Validé';
    }
  }
}

class ScanDraft {
  const ScanDraft({
    required this.id,
    required this.imagePath,
    required this.rawText,
    required this.createdAt,
    required this.updatedAt,
    required this.supplierName,
    required this.invoiceNumber,
    required this.invoiceDate,
    required this.dueDate,
    required this.totalAmount,
    required this.subtotalAmount,
    required this.taxAmount,
    required this.currency,
    required this.confidence,
    required this.status,
  });

  final String id;
  final String imagePath;
  final String rawText;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String supplierName;
  final String invoiceNumber;
  final String invoiceDate;
  final String dueDate;
  final String totalAmount;
  final String subtotalAmount;
  final String taxAmount;
  final String currency;
  final double confidence;
  final ScanDraftStatus status;

  String get title {
    if (supplierName.isNotEmpty) {
      return supplierName;
    }
    if (invoiceNumber.isNotEmpty) {
      return 'Facture $invoiceNumber';
    }
    return 'Brouillon OCR';
  }

  String get amountLabel {
    if (totalAmount.isEmpty) {
      return 'Montant à vérifier';
    }
    final suffix = currency.isEmpty ? '' : ' $currency';
    return '$totalAmount$suffix';
  }

  ScanDraft copyWith({
    String? id,
    String? imagePath,
    String? rawText,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? supplierName,
    String? invoiceNumber,
    String? invoiceDate,
    String? dueDate,
    String? totalAmount,
    String? subtotalAmount,
    String? taxAmount,
    String? currency,
    double? confidence,
    ScanDraftStatus? status,
  }) {
    return ScanDraft(
      id: id ?? this.id,
      imagePath: imagePath ?? this.imagePath,
      rawText: rawText ?? this.rawText,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      supplierName: supplierName ?? this.supplierName,
      invoiceNumber: invoiceNumber ?? this.invoiceNumber,
      invoiceDate: invoiceDate ?? this.invoiceDate,
      dueDate: dueDate ?? this.dueDate,
      totalAmount: totalAmount ?? this.totalAmount,
      subtotalAmount: subtotalAmount ?? this.subtotalAmount,
      taxAmount: taxAmount ?? this.taxAmount,
      currency: currency ?? this.currency,
      confidence: confidence ?? this.confidence,
      status: status ?? this.status,
    );
  }

  factory ScanDraft.fromJson(Map<String, dynamic> json) {
    return ScanDraft(
      id: json['id']?.toString() ?? '',
      imagePath: json['imagePath']?.toString() ?? '',
      rawText: json['rawText']?.toString() ?? '',
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ??
          DateTime.now(),
      supplierName: json['supplierName']?.toString() ?? '',
      invoiceNumber: json['invoiceNumber']?.toString() ?? '',
      invoiceDate: json['invoiceDate']?.toString() ?? '',
      dueDate: json['dueDate']?.toString() ?? '',
      totalAmount: json['totalAmount']?.toString() ?? '',
      subtotalAmount: json['subtotalAmount']?.toString() ?? '',
      taxAmount: json['taxAmount']?.toString() ?? '',
      currency: json['currency']?.toString() ?? '',
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0,
      status: ScanDraftStatus.values.firstWhere(
        (value) => value.name == json['status'],
        orElse: () => ScanDraftStatus.extracted,
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'imagePath': imagePath,
      'rawText': rawText,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'supplierName': supplierName,
      'invoiceNumber': invoiceNumber,
      'invoiceDate': invoiceDate,
      'dueDate': dueDate,
      'totalAmount': totalAmount,
      'subtotalAmount': subtotalAmount,
      'taxAmount': taxAmount,
      'currency': currency,
      'confidence': confidence,
      'status': status.name,
    };
  }
}
