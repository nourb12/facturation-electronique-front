import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/theme_controller.dart';
import '../../../core/theme/theme_extensions.dart';
import '../../../core/widgets/ey_background.dart';
import '../../../core/widgets/ey_components.dart';
import '../../auth/controllers/session_controller.dart';
import '../../scan/screens/dashboard_screen.dart';
import '../../scan/screens/scan_history_screen.dart';
import '../../scan/screens/scan_screen.dart';

class MobileHomeShell extends StatefulWidget {
  const MobileHomeShell({super.key});

  @override
  State<MobileHomeShell> createState() => _MobileHomeShellState();
}

class _MobileHomeShellState extends State<MobileHomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final themeController = context.read<ThemeController>();
    final sessionController = context.read<SessionController>();

    final pages = <Widget>[
      DashboardScreen(
        onOpenScan: () => setState(() => _index = 1),
        onOpenHistory: () => setState(() => _index = 2),
        onToggleTheme: () {
          themeController.toggle();
        },
        onLogout: sessionController.logout,
      ),
      const ScanScreen(),
      const ScanHistoryScreen(),
    ];

    return Scaffold(
      backgroundColor: context.ey.pageBg,
      body: EyBackground(
        safeArea: false,
        child: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: IndexedStack(
                  index: _index,
                  children: pages,
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: EySurfaceCard(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 8,
                  ),
                  child: Row(
                    children: [
                      _NavItem(
                        icon: Icons.dashboard_customize_outlined,
                        label: 'Accueil',
                        selected: _index == 0,
                        onTap: () => setState(() => _index = 0),
                      ),
                      _NavItem(
                        icon: Icons.document_scanner_outlined,
                        label: 'Scanner',
                        selected: _index == 1,
                        onTap: () => setState(() => _index = 1),
                      ),
                      _NavItem(
                        icon: Icons.history_rounded,
                        label: 'Historique',
                        selected: _index == 2,
                        onTap: () => setState(() => _index = 2),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.ey;

    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            color: selected ? colors.eySoft : Colors.transparent,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                color: selected ? colors.textPrimary : colors.textSecondary,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: selected ? colors.textPrimary : colors.textSecondary,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
