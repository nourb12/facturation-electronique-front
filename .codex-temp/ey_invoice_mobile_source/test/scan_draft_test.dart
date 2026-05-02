import 'package:ey_invoice_mobile/features/scan/models/scan_draft.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('scan draft serializes and restores its status', () {
    final draft = ScanDraft(
      id: '1',
      imagePath: 'image.jpg',
      rawText: 'FACTURE 001',
      createdAt: DateTime.parse('2026-05-01T10:00:00.000Z'),
      updatedAt: DateTime.parse('2026-05-01T10:00:00.000Z'),
      supplierName: 'ACME',
      invoiceNumber: 'F-001',
      invoiceDate: '01/05/2026',
      dueDate: '15/05/2026',
      totalAmount: '100.00',
      subtotalAmount: '84.03',
      taxAmount: '15.97',
      currency: 'TND',
      confidence: .8,
      status: ScanDraftStatus.reviewed,
    );

    final restored = ScanDraft.fromJson(draft.toJson());

    expect(restored.status, ScanDraftStatus.reviewed);
    expect(restored.supplierName, 'ACME');
    expect(restored.totalAmount, '100.00');
  });
}
