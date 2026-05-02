import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/network/api_config.dart';
import '../../../core/theme/theme_extensions.dart';
import '../../../core/widgets/ey_components.dart';
import '../../auth/controllers/session_controller.dart';
import '../controllers/scan_controller.dart';
import '../models/scan_draft.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({
    super.key,
    required this.onOpenScan,
    required this.onOpenHistory,
    required this.onToggleTheme,
    required this.onLogout,
  });

  final VoidCallback onOpenScan;
  final VoidCallback onOpenHistory;
  final VoidCallback onToggleTheme;
  final Future<void> Function() onLogout;

  @override
  Widget build(BuildContext context) {
    final colors = context.ey;
    final textTheme = Theme.of(context).textTheme;
    final session = context.watch<SessionController>();
    final scanController = context.watch<ScanController>();
    final recentDrafts = scanController.drafts.take(3).toList();
    final userName = session.user?.fullName.isNotEmpty == true
        ? session.user!.fullName
        : 'Utilisateur';

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const EyBrandMark(),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Bonjour, $userName',
                      style: textTheme.titleMedium,
                    ),
                    Text(
                      'Module mobile aligné sur le thème web',
                      style: textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              EyIconAction(
                icon: context.isDarkMode
                    ? Icons.light_mode_rounded
                    : Icons.dark_mode_rounded,
                onTap: onToggleTheme,
                tooltip: 'Changer de thème',
              ),
              const SizedBox(width: 8),
              EyIconAction(
                icon: Icons.logout_rounded,
                onTap: () => onLogout(),
                tooltip: 'Déconnexion',
              ),
            ],
          ),
          const SizedBox(height: 20),
          EySurfaceCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const EyEyebrow(label: 'Scan OCR gratuit'),
                const SizedBox(height: 16),
                Text(
                  'Capture, lis, corrige et conserve tes brouillons de facture sur mobile.',
                  style: textTheme.headlineMedium,
                ),
                const SizedBox(height: 10),
                Text(
                  'Authentification branchée sur ton backend .NET, thème sombre et light calqués sur le web, et flux mobile prêt pour la validation manuelle.',
                  style: textTheme.bodyMedium?.copyWith(
                    color: colors.textSecondary,
                    height: 1.6,
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: EyPrimaryButton(
                        label: 'Scanner maintenant',
                        icon: Icons.document_scanner_outlined,
                        onPressed: onOpenScan,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: EySecondaryButton(
                        label: 'Voir l’historique',
                        icon: Icons.history_rounded,
                        onPressed: onOpenHistory,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  label: 'Brouillons',
                  value: scanController.reviewedCount.toString(),
                  tone: EyStatusTone.neutral,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  label: 'Validés',
                  value: scanController.validatedCount.toString(),
                  tone: EyStatusTone.ok,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  label: 'À relire',
                  value: scanController.extractedCount.toString(),
                  tone: EyStatusTone.warn,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          EySurfaceCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const EyStatusChip(
                      label: 'Backend auth',
                      tone: EyStatusTone.ok,
                    ),
                    const SizedBox(width: 8),
                    const EyStatusChip(
                      label: 'Brouillons locaux',
                      tone: EyStatusTone.info,
                    ),
                    const SizedBox(width: 8),
                    EyStatusChip(
                      label: context.isDarkMode ? 'Dark' : 'Light',
                      tone: EyStatusTone.ey,
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  'État du module',
                  style: textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  'Connexion API: ${ApiConfig.baseUrl}\nFlux OCR: gratuit et local\nStockage des scans: mobile pour ce MVP, en attendant un endpoint backend dédié aux brouillons scannés.',
                  style: textTheme.bodySmall?.copyWith(
                    color: colors.textSecondary,
                    height: 1.7,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          EySurfaceCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'Derniers brouillons',
                      style: textTheme.titleMedium,
                    ),
                    const Spacer(),
                    TextButton(
                      onPressed: onOpenHistory,
                      child: const Text('Tout voir'),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                if (recentDrafts.isEmpty)
                  Text(
                    'Aucun scan enregistré pour le moment.',
                    style: textTheme.bodyMedium?.copyWith(
                      color: colors.textSecondary,
                    ),
                  )
                else
                  ...recentDrafts.map(
                    (draft) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        children: [
                          const EyBrandMark(size: 28),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  draft.title,
                                  style: textTheme.bodyLarge?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${draft.amountLabel} • ${DateFormat('dd/MM/yyyy HH:mm').format(draft.updatedAt)}',
                                  style: textTheme.bodySmall?.copyWith(
                                    color: colors.textSecondary,
                                  ),
                                ),
                              ],
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
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.tone,
  });

  final String label;
  final String value;
  final EyStatusTone tone;

  @override
  Widget build(BuildContext context) {
    final colors = context.ey;
    final textTheme = Theme.of(context).textTheme;

    return EySurfaceCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          EyStatusChip(label: label, tone: tone),
          const SizedBox(height: 12),
          Text(
            value,
            style: textTheme.headlineSmall?.copyWith(
              color: colors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
