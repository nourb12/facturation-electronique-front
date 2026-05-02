import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme/app_theme.dart';
import '../core/theme/theme_controller.dart';
import '../features/auth/controllers/session_controller.dart';
import '../features/auth/services/auth_api_service.dart';
import '../features/scan/controllers/scan_controller.dart';
import '../features/scan/services/invoice_regex_service.dart';
import '../features/scan/services/ocr_service.dart';
import '../features/scan/services/scan_draft_store.dart';
import 'splash_gate.dart';

class EyInvoiceMobileApp extends StatelessWidget {
  const EyInvoiceMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<ThemeController>(
          create: (_) => ThemeController()..load(),
          lazy: false,
        ),
        ChangeNotifierProvider<SessionController>(
          create: (_) => SessionController(
            apiService: AuthApiService(),
          )..bootstrap(),
          lazy: false,
        ),
        ChangeNotifierProvider<ScanController>(
          create: (_) => ScanController(
            draftStore: ScanDraftStore(),
            ocrService: OcrService(),
            regexService: InvoiceRegexService(),
          )..loadDrafts(),
          lazy: false,
        ),
      ],
      child: Consumer<ThemeController>(
        builder: (context, themeController, _) {
          return MaterialApp(
            debugShowCheckedModeBanner: false,
            title: 'EY Invoice Mobile',
            themeMode: themeController.themeMode,
            theme: AppTheme.light(),
            darkTheme: AppTheme.dark(),
            home: const SplashGate(),
          );
        },
      ),
    );
  }
}
