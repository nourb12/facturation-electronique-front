import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/theme_extensions.dart';
import '../../../core/widgets/ey_background.dart';
import '../../../core/widgets/ey_components.dart';
import '../controllers/scan_controller.dart';
import '../models/scan_draft.dart';

class ScanPreviewScreen extends StatefulWidget {
  const ScanPreviewScreen({
    super.key,
    required this.initialDraft,
    required this.isNewDraft,
  });

  final ScanDraft initialDraft;
  final bool isNewDraft;

  @override
  State<ScanPreviewScreen> createState() => _ScanPreviewScreenState();
}

class _ScanPreviewScreenState extends State<ScanPreviewScreen> {
  late final TextEditingController _supplierController;
  late final TextEditingController _invoiceNumberController;
  late final TextEditingController _invoiceDateController;
  late final TextEditingController _dueDateController;
  late final TextEditingController _totalAmountController;
  late final TextEditingController _subtotalAmountController;
  late final TextEditingController _taxAmountController;
  late final TextEditingController _currencyController;

  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _supplierController =
        TextEditingController(text: widget.initialDraft.supplierName);
    _invoiceNumberController =
        TextEditingController(text: widget.initialDraft.invoiceNumber);
    _invoiceDateController =
        TextEditingController(text: widget.initialDraft.invoiceDate);
    _dueDateController = TextEditingController(text: widget.initialDraft.dueDate);
    _totalAmountController =
        TextEditingController(text: widget.initialDraft.totalAmount);
    _subtotalAmountController =
        TextEditingController(text: widget.initialDraft.subtotalAmount);
    _taxAmountController =
        TextEditingController(text: widget.initialDraft.taxAmount);
    _currencyController =
        TextEditingController(text: widget.initialDraft.currency);
  }

  @override
  void dispose() {
    _supplierController.dispose();
    _invoiceNumberController.dispose();
    _invoiceDateController.dispose();
    _dueDateController.dispose();
    _totalAmountController.dispose();
    _subtotalAmountController.dispose();
    _taxAmountController.dispose();
    _currencyController.dispose();
    super.dispose();
  }

  Future<void> _saveDraft(ScanDraftStatus status) async {
    setState(() {
      _isSaving = true;
    });

    final draft = widget.initialDraft.copyWith(
      supplierName: _supplierController.text.trim(),
      invoiceNumber: _invoiceNumberController.text.trim(),
      invoiceDate: _invoiceDateController.text.trim(),
      dueDate: _dueDateController.text.trim(),
      totalAmount: _totalAmountController.text.trim(),
      subtotalAmount: _subtotalAmountController.text.trim(),
      taxAmount: _taxAmountController.text.trim(),
      currency: _currencyController.text.trim().toUpperCase(),
      updatedAt: DateTime.now(),
      status: status,
    );

    await context.read<ScanController>().upsertDraft(draft);

    if (!mounted) {
      return;
    }

    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.ey;
    final textTheme = Theme.of(context).textTheme;
    final imageFile = File(widget.initialDraft.imagePath);
    final imageExists = imageFile.existsSync();

    return Scaffold(
      backgroundColor: colors.pageBg,
      body: EyBackground(
        safeArea: false,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: SafeArea(
          child: Column(
            children: [
              Row(
                children: [
                  EyIconAction(
                    icon: Icons.arrow_back_rounded,
                    onTap: () => Navigator.of(context).maybePop(),
                    tooltip: 'Retour',
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.isNewDraft
                              ? 'Vérifier l’extraction'
                              : 'Modifier le brouillon',
                          style: textTheme.titleMedium,
                        ),
                        Text(
                          'Ajuste les champs avant validation',
                          style: textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  EyStatusChip(
                    label:
                        '${(widget.initialDraft.confidence * 100).round()}% confiance',
                    tone: EyStatusTone.info,
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Expanded(
                child: ListView(
                  children: [
                    if (imageExists)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(22),
                        child: Image.file(
                          imageFile,
                          height: 220,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        ),
                      ),
                    if (imageExists) const SizedBox(height: 16),
                    EySurfaceCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const EyEyebrow(label: 'Champs détectés'),
                          const SizedBox(height: 16),
                          EyTextField(
                            label: 'Fournisseur',
                            controller: _supplierController,
                          ),
                          const SizedBox(height: 12),
                          EyTextField(
                            label: 'Numéro de facture',
                            controller: _invoiceNumberController,
                            mono: true,
                          ),
                          const SizedBox(height: 12),
                          EyTextField(
                            label: 'Date de facture',
                            controller: _invoiceDateController,
                          ),
                          const SizedBox(height: 12),
                          EyTextField(
                            label: 'Date d’échéance',
                            controller: _dueDateController,
                          ),
                          const SizedBox(height: 12),
                          EyTextField(
                            label: 'Montant total',
                            controller: _totalAmountController,
                            keyboardType: TextInputType.number,
                          ),
                          const SizedBox(height: 12),
                          EyTextField(
                            label: 'Montant HT',
                            controller: _subtotalAmountController,
                            keyboardType: TextInputType.number,
                          ),
                          const SizedBox(height: 12),
                          EyTextField(
                            label: 'TVA',
                            controller: _taxAmountController,
                            keyboardType: TextInputType.number,
                          ),
                          const SizedBox(height: 12),
                          EyTextField(
                            label: 'Devise',
                            controller: _currencyController,
                            mono: true,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    EySurfaceCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Texte OCR brut',
                            style: textTheme.titleMedium,
                          ),
                          const SizedBox(height: 12),
                          SelectableText(
                            widget.initialDraft.rawText.isEmpty
                                ? 'Aucun texte détecté.'
                                : widget.initialDraft.rawText,
                            style: textTheme.bodySmall?.copyWith(
                              color: colors.textSecondary,
                              height: 1.7,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              EyPrimaryButton(
                label: 'Enregistrer le brouillon',
                icon: Icons.save_outlined,
                isLoading: _isSaving,
                onPressed: () => _saveDraft(ScanDraftStatus.reviewed),
              ),
              const SizedBox(height: 10),
              EySecondaryButton(
                label: 'Marquer comme validé',
                icon: Icons.task_alt_rounded,
                onPressed: _isSaving
                    ? null
                    : () => _saveDraft(ScanDraftStatus.validated),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
