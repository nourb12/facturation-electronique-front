import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/theme_extensions.dart';
import '../../../core/widgets/ey_components.dart';
import '../controllers/scan_controller.dart';
import '../models/scan_draft.dart';
import 'scan_preview_screen.dart';

class ScanScreen extends StatelessWidget {
  const ScanScreen({super.key});

  Future<void> _startScan(BuildContext context, ImageSource source) async {
    final controller = context.read<ScanController>();
    final draft = await controller.createDraftFromSource(source);

    if (!context.mounted) {
      return;
    }

    if (controller.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(controller.errorMessage!)),
      );
      controller.clearError();
    }

    if (draft != null) {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ScanPreviewScreen(
            initialDraft: draft,
            isNewDraft: true,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.ey;
    final textTheme = Theme.of(context).textTheme;
    final controller = context.watch<ScanController>();
    final latestDraft = controller.latestDraft;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Scanner une facture',
            style: textTheme.headlineMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Même palette, mêmes polices, même ambiance que le web — avec un flux mobile orienté capture et correction.',
            style: textTheme.bodyMedium?.copyWith(
              color: colors.textSecondary,
              height: 1.6,
            ),
          ),
          const SizedBox(height: 18),
          EySurfaceCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    EyStatusChip(
                      label: 'OCR local',
                      tone: EyStatusTone.ok,
                    ),
                    SizedBox(width: 8),
                    EyStatusChip(
                      label: 'Regex',
                      tone: EyStatusTone.info,
                    ),
                    SizedBox(width: 8),
                    EyStatusChip(
                      label: 'Validation manuelle',
                      tone: EyStatusTone.warn,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  'Choisis une source',
                  style: textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  controller.supportsOcr
                      ? 'La photo est analysée localement puis préremplie avant validation.'
                      : 'Le moteur OCR local n’est pas disponible sur cette plateforme de prévisualisation.',
                  style: textTheme.bodySmall?.copyWith(
                    color: colors.textSecondary,
                    height: 1.6,
                  ),
                ),
                const SizedBox(height: 18),
                EyPrimaryButton(
                  label: 'Prendre une photo',
                  icon: Icons.photo_camera_outlined,
                  isLoading: controller.isBusy,
                  onPressed: controller.supportsOcr
                      ? () => _startScan(context, ImageSource.camera)
                      : null,
                ),
                const SizedBox(height: 12),
                EySecondaryButton(
                  label: 'Importer depuis la galerie',
                  icon: Icons.photo_library_outlined,
                  onPressed: controller.supportsOcr
                      ? () => _startScan(context, ImageSource.gallery)
                      : null,
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
                  'Étapes du flux',
                  style: textTheme.titleMedium,
                ),
                const SizedBox(height: 12),
                const _FlowItem(
                  step: '1',
                  title: 'Capture',
                  description: 'Caméra ou galerie selon le contexte.',
                ),
                const SizedBox(height: 12),
                const _FlowItem(
                  step: '2',
                  title: 'Lecture OCR',
                  description: 'Extraction locale du texte brut depuis l’image.',
                ),
                const SizedBox(height: 12),
                const _FlowItem(
                  step: '3',
                  title: 'Préremplissage Regex',
                  description: 'Numéro, date, montants, TVA, fournisseur et devise.',
                ),
                const SizedBox(height: 12),
                const _FlowItem(
                  step: '4',
                  title: 'Validation',
                  description: 'Tu corriges manuellement avant de sauvegarder.',
                ),
              ],
            ),
          ),
          if (latestDraft != null) ...[
            const SizedBox(height: 16),
            EySurfaceCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'Dernier brouillon',
                        style: textTheme.titleMedium,
                      ),
                      const Spacer(),
                      EyStatusChip(
                        label: latestDraft.status.label,
                        tone: latestDraft.status == ScanDraftStatus.validated
                            ? EyStatusTone.ok
                            : latestDraft.status == ScanDraftStatus.reviewed
                                ? EyStatusTone.info
                                : EyStatusTone.warn,
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    latestDraft.title,
                    style: textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    latestDraft.amountLabel,
                    style: textTheme.bodySmall?.copyWith(
                      color: colors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  EySecondaryButton(
                    label: 'Ouvrir la correction',
                    icon: Icons.edit_note_rounded,
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => ScanPreviewScreen(
                            initialDraft: latestDraft,
                            isNewDraft: false,
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _FlowItem extends StatelessWidget {
  const _FlowItem({
    required this.step,
    required this.title,
    required this.description,
  });

  final String step;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    final colors = context.ey;
    final textTheme = Theme.of(context).textTheme;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 28,
          height: 28,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: colors.ey,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            step,
            style: textTheme.labelMedium?.copyWith(
              color: colors.eyText,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: textTheme.bodyLarge),
              const SizedBox(height: 2),
              Text(
                description,
                style: textTheme.bodySmall?.copyWith(
                  color: colors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
