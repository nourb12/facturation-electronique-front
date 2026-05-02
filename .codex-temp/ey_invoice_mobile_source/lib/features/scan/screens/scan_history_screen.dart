import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/theme_extensions.dart';
import '../../../core/widgets/ey_components.dart';
import '../controllers/scan_controller.dart';
import '../models/scan_draft.dart';
import 'scan_preview_screen.dart';

class ScanHistoryScreen extends StatelessWidget {
  const ScanHistoryScreen({super.key});

  Future<void> _deleteDraft(BuildContext context, ScanDraft draft) async {
    final confirmed = await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('Supprimer le brouillon ?'),
            content: Text(
              'Le scan "${draft.title}" sera retiré du stockage local du mobile.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: const Text('Annuler'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(dialogContext).pop(true),
                child: const Text('Supprimer'),
              ),
            ],
          ),
        ) ??
        false;

    if (!confirmed || !context.mounted) {
      return;
    }

    await context.read<ScanController>().deleteDraft(draft.id);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.ey;
    final textTheme = Theme.of(context).textTheme;
    final controller = context.watch<ScanController>();
    final drafts = controller.drafts;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Historique des scans',
            style: textTheme.headlineMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Tous les brouillons OCR validés localement sur le mobile.',
            style: textTheme.bodyMedium?.copyWith(
              color: colors.textSecondary,
              height: 1.6,
            ),
          ),
          const SizedBox(height: 16),
          if (drafts.isEmpty)
            EySurfaceCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const EyEyebrow(label: 'Aucun brouillon'),
                  const SizedBox(height: 12),
                  Text(
                    'Dès que tu scans une facture, elle apparaît ici avec son statut et son texte OCR.',
                    style: textTheme.bodyMedium?.copyWith(
                      color: colors.textSecondary,
                      height: 1.6,
                    ),
                  ),
                ],
              ),
            )
          else
            ...drafts.map(
              (draft) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: EySurfaceCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              draft.title,
                              style: textTheme.titleMedium,
                            ),
                          ),
                          EyStatusChip(
                            label: draft.status.label,
                            tone: draft.status == ScanDraftStatus.validated
                                ? EyStatusTone.ok
                                : draft.status == ScanDraftStatus.reviewed
                                    ? EyStatusTone.info
                                    : EyStatusTone.warn,
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        [
                          draft.invoiceNumber,
                          draft.invoiceDate,
                          draft.amountLabel,
                        ].where((item) => item.isNotEmpty).join(' • '),
                        style: textTheme.bodySmall?.copyWith(
                          color: colors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          EyStatusChip(
                            label:
                                '${(draft.confidence * 100).round()}% OCR',
                            tone: EyStatusTone.neutral,
                          ),
                          const Spacer(),
                          Text(
                            DateFormat('dd/MM/yyyy HH:mm').format(draft.updatedAt),
                            style: textTheme.labelSmall,
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: EySecondaryButton(
                              label: 'Modifier',
                              icon: Icons.edit_note_rounded,
                              onPressed: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute<void>(
                                    builder: (_) => ScanPreviewScreen(
                                      initialDraft: draft,
                                      isNewDraft: false,
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: EySecondaryButton(
                              label: 'Supprimer',
                              icon: Icons.delete_outline_rounded,
                              onPressed: () => _deleteDraft(context, draft),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
