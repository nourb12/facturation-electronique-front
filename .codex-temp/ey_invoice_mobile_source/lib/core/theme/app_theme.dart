import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'ey_theme_tokens.dart';

abstract final class AppTheme {
  static ThemeData light() => _buildTheme(
        brightness: Brightness.light,
        tokens: EyThemeTokens.light,
      );

  static ThemeData dark() => _buildTheme(
        brightness: Brightness.dark,
        tokens: EyThemeTokens.dark,
      );

  static ThemeData _buildTheme({
    required Brightness brightness,
    required EyThemeTokens tokens,
  }) {
    final base = ThemeData(
      brightness: brightness,
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: tokens.ey,
        brightness: brightness,
      ).copyWith(
        primary: tokens.ey,
        onPrimary: tokens.eyText,
        secondary: tokens.ey,
        onSecondary: tokens.eyText,
        surface: tokens.bgSurf,
        onSurface: tokens.textPrimary,
        error: tokens.error,
      ),
      scaffoldBackgroundColor: tokens.pageBg,
      canvasColor: tokens.pageBg,
      dividerColor: tokens.border1,
      splashColor: tokens.eySoft,
      highlightColor: Colors.transparent,
      hoverColor: tokens.ghostHover,
      shadowColor: tokens.shadowColor,
    );

    final textTheme = GoogleFonts.dmSansTextTheme(base.textTheme).copyWith(
      displaySmall: GoogleFonts.playfairDisplay(
        fontSize: 36,
        height: 1.05,
        fontWeight: FontWeight.w900,
        color: tokens.textPrimary,
      ),
      headlineMedium: GoogleFonts.playfairDisplay(
        fontSize: 28,
        height: 1.1,
        fontWeight: FontWeight.w900,
        color: tokens.textPrimary,
      ),
      headlineSmall: GoogleFonts.playfairDisplay(
        fontSize: 22,
        height: 1.15,
        fontWeight: FontWeight.w800,
        color: tokens.textPrimary,
      ),
      titleLarge: GoogleFonts.playfairDisplay(
        fontSize: 18,
        fontWeight: FontWeight.w800,
        color: tokens.textPrimary,
      ),
      titleMedium: GoogleFonts.dmSans(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: tokens.textPrimary,
      ),
      bodyLarge: GoogleFonts.dmSans(
        fontSize: 15,
        fontWeight: FontWeight.w500,
        color: tokens.textPrimary,
      ),
      bodyMedium: GoogleFonts.dmSans(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: tokens.textPrimary,
      ),
      bodySmall: GoogleFonts.dmSans(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: tokens.textSecondary,
      ),
      labelLarge: GoogleFonts.dmSans(
        fontSize: 14,
        fontWeight: FontWeight.w700,
        color: tokens.textPrimary,
      ),
      labelMedium: GoogleFonts.dmSans(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: tokens.textSecondary,
      ),
      labelSmall: GoogleFonts.jetBrainsMono(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        color: tokens.textTertiary,
      ),
    );

    return base.copyWith(
      textTheme: textTheme,
      primaryTextTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: tokens.headerBg,
        foregroundColor: tokens.textPrimary,
        elevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: textTheme.titleLarge,
      ),
      dividerTheme: DividerThemeData(
        color: tokens.border1,
        thickness: 1,
        space: 1,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: tokens.bgCard,
        contentTextStyle: textTheme.bodyMedium?.copyWith(
          color: tokens.textPrimary,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: tokens.inputBg,
        hintStyle: textTheme.bodyMedium?.copyWith(
          color: tokens.textTertiary,
        ),
        labelStyle: textTheme.bodyMedium?.copyWith(
          color: tokens.textSecondary,
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: tokens.inputBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: tokens.inputFocus, width: 1.4),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: tokens.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: tokens.error, width: 1.4),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: tokens.bgCard,
        indicatorColor: tokens.eySoft,
        surfaceTintColor: Colors.transparent,
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: states.contains(WidgetState.selected)
                ? tokens.textPrimary
                : tokens.textSecondary,
          ),
        ),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => textTheme.labelMedium?.copyWith(
            color: states.contains(WidgetState.selected)
                ? tokens.textPrimary
                : tokens.textSecondary,
          ),
        ),
      ),
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: tokens.ey,
        selectionColor: tokens.eySoft,
        selectionHandleColor: tokens.ey,
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: tokens.bgCard,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),
      extensions: <ThemeExtension<dynamic>>[
        tokens,
      ],
    );
  }
}
