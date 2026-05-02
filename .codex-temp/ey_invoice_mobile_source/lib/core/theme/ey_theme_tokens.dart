import 'package:flutter/material.dart';

@immutable
class EyThemeTokens extends ThemeExtension<EyThemeTokens> {
  const EyThemeTokens({
    required this.ey,
    required this.eyHover,
    required this.eyText,
    required this.eySoft,
    required this.eyGlow,
    required this.eyLine,
    required this.eyCapsuleColor,
    required this.eyCapsuleBg,
    required this.eyCapsuleBorder,
    required this.ok,
    required this.warn,
    required this.error,
    required this.info,
    required this.bgVoid,
    required this.bgAbyss,
    required this.bgSurf,
    required this.bgCard,
    required this.bgEdge,
    required this.bgGhost,
    required this.border0,
    required this.border1,
    required this.border2,
    required this.border3,
    required this.textPrimary,
    required this.textSecondary,
    required this.textTertiary,
    required this.textMuted,
    required this.sidebarBg,
    required this.sidebarBorder,
    required this.inputBg,
    required this.inputBorder,
    required this.inputFocus,
    required this.headerBg,
    required this.headerBorder,
    required this.ghostText,
    required this.ghostBorder,
    required this.ghostHover,
    required this.pageBg,
    required this.pageContentBg,
    required this.shadowColor,
    required this.shadowGlow,
  });

  final Color ey;
  final Color eyHover;
  final Color eyText;
  final Color eySoft;
  final Color eyGlow;
  final Color eyLine;
  final Color eyCapsuleColor;
  final Color eyCapsuleBg;
  final Color eyCapsuleBorder;
  final Color ok;
  final Color warn;
  final Color error;
  final Color info;
  final Color bgVoid;
  final Color bgAbyss;
  final Color bgSurf;
  final Color bgCard;
  final Color bgEdge;
  final Color bgGhost;
  final Color border0;
  final Color border1;
  final Color border2;
  final Color border3;
  final Color textPrimary;
  final Color textSecondary;
  final Color textTertiary;
  final Color textMuted;
  final Color sidebarBg;
  final Color sidebarBorder;
  final Color inputBg;
  final Color inputBorder;
  final Color inputFocus;
  final Color headerBg;
  final Color headerBorder;
  final Color ghostText;
  final Color ghostBorder;
  final Color ghostHover;
  final Color pageBg;
  final Color pageContentBg;
  final Color shadowColor;
  final Color shadowGlow;

  static const EyThemeTokens light = EyThemeTokens(
    ey: Color(0xFFFFE600),
    eyHover: Color(0xFFFFEE58),
    eyText: Color(0xFF0A0A0A),
    eySoft: Color.fromRGBO(255, 230, 0, .18),
    eyGlow: Color.fromRGBO(255, 230, 0, .30),
    eyLine: Color.fromRGBO(255, 230, 0, .45),
    eyCapsuleColor: Color(0xFF6B7280),
    eyCapsuleBg: Color.fromRGBO(255, 230, 0, .07),
    eyCapsuleBorder: Color.fromRGBO(255, 230, 0, .18),
    ok: Color(0xFF22C55E),
    warn: Color(0xFFF59E0B),
    error: Color(0xFFEF4444),
    info: Color(0xFF3B82F6),
    bgVoid: Color(0xFFFFFFFF),
    bgAbyss: Color(0xFFFFFFFF),
    bgSurf: Color(0xFFFFFFFF),
    bgCard: Color(0xFFFFFFFF),
    bgEdge: Color(0xFFD8DBE6),
    bgGhost: Color(0xFFF0F2F8),
    border0: Color.fromRGBO(0, 0, 0, .04),
    border1: Color.fromRGBO(0, 0, 0, .07),
    border2: Color.fromRGBO(0, 0, 0, .11),
    border3: Color.fromRGBO(0, 0, 0, .18),
    textPrimary: Color(0xFF111827),
    textSecondary: Color(0xFF6B7280),
    textTertiary: Color(0xFF9CA3AF),
    textMuted: Color(0xFFD1D5DB),
    sidebarBg: Color(0xFFF5F7FB),
    sidebarBorder: Color(0xFFEDEFF5),
    inputBg: Color(0xFFFFFFFF),
    inputBorder: Color.fromRGBO(0, 0, 0, .14),
    inputFocus: Color.fromRGBO(255, 230, 0, .50),
    headerBg: Color.fromRGBO(255, 255, 255, .97),
    headerBorder: Color.fromRGBO(0, 0, 0, .08),
    ghostText: Color(0xFF4B5563),
    ghostBorder: Color.fromRGBO(0, 0, 0, .12),
    ghostHover: Color.fromRGBO(0, 0, 0, .04),
    pageBg: Color(0xFFEDEEF2),
    pageContentBg: Color(0xFFF0F2F7),
    shadowColor: Color.fromRGBO(0, 0, 0, .10),
    shadowGlow: Color.fromRGBO(255, 230, 0, .18),
  );

  static const EyThemeTokens dark = EyThemeTokens(
    ey: Color(0xFFFFE600),
    eyHover: Color(0xFFFFF176),
    eyText: Color(0xFF0A0A0A),
    eySoft: Color.fromRGBO(255, 230, 0, .14),
    eyGlow: Color.fromRGBO(255, 230, 0, .22),
    eyLine: Color.fromRGBO(255, 230, 0, .30),
    eyCapsuleColor: Color(0xFFFFE600),
    eyCapsuleBg: Color.fromRGBO(255, 230, 0, .08),
    eyCapsuleBorder: Color.fromRGBO(255, 230, 0, .22),
    ok: Color(0xFF22C55E),
    warn: Color(0xFFF59E0B),
    error: Color(0xFFEF4444),
    info: Color(0xFF3B82F6),
    bgVoid: Color(0xFF2E2E38),
    bgAbyss: Color(0xFF25252E),
    bgSurf: Color(0xFF3A3A45),
    bgCard: Color(0xFF3A3A45),
    bgEdge: Color(0xFF45454F),
    bgGhost: Color(0xFF4A4A55),
    border0: Color.fromRGBO(255, 255, 255, .05),
    border1: Color.fromRGBO(255, 255, 255, .10),
    border2: Color.fromRGBO(255, 255, 255, .15),
    border3: Color.fromRGBO(255, 255, 255, .25),
    textPrimary: Color(0xFFFFFFFF),
    textSecondary: Color(0xFFD1D5DB),
    textTertiary: Color(0xFF9CA3AF),
    textMuted: Color(0xFF6B7280),
    sidebarBg: Color(0xFF2E2E38),
    sidebarBorder: Color.fromRGBO(255, 255, 255, .10),
    inputBg: Color(0xFF3A3A45),
    inputBorder: Color.fromRGBO(255, 255, 255, .15),
    inputFocus: Color.fromRGBO(255, 230, 0, .40),
    headerBg: Color.fromRGBO(58, 58, 69, .97),
    headerBorder: Color.fromRGBO(255, 255, 255, .10),
    ghostText: Color(0xFFD1D5DB),
    ghostBorder: Color.fromRGBO(255, 255, 255, .15),
    ghostHover: Color.fromRGBO(255, 255, 255, .08),
    pageBg: Color(0xFF2E2E38),
    pageContentBg: Color(0xFF2E2E38),
    shadowColor: Color.fromRGBO(0, 0, 0, .45),
    shadowGlow: Color.fromRGBO(255, 230, 0, .10),
  );

  @override
  EyThemeTokens copyWith({
    Color? ey,
    Color? eyHover,
    Color? eyText,
    Color? eySoft,
    Color? eyGlow,
    Color? eyLine,
    Color? eyCapsuleColor,
    Color? eyCapsuleBg,
    Color? eyCapsuleBorder,
    Color? ok,
    Color? warn,
    Color? error,
    Color? info,
    Color? bgVoid,
    Color? bgAbyss,
    Color? bgSurf,
    Color? bgCard,
    Color? bgEdge,
    Color? bgGhost,
    Color? border0,
    Color? border1,
    Color? border2,
    Color? border3,
    Color? textPrimary,
    Color? textSecondary,
    Color? textTertiary,
    Color? textMuted,
    Color? sidebarBg,
    Color? sidebarBorder,
    Color? inputBg,
    Color? inputBorder,
    Color? inputFocus,
    Color? headerBg,
    Color? headerBorder,
    Color? ghostText,
    Color? ghostBorder,
    Color? ghostHover,
    Color? pageBg,
    Color? pageContentBg,
    Color? shadowColor,
    Color? shadowGlow,
  }) {
    return EyThemeTokens(
      ey: ey ?? this.ey,
      eyHover: eyHover ?? this.eyHover,
      eyText: eyText ?? this.eyText,
      eySoft: eySoft ?? this.eySoft,
      eyGlow: eyGlow ?? this.eyGlow,
      eyLine: eyLine ?? this.eyLine,
      eyCapsuleColor: eyCapsuleColor ?? this.eyCapsuleColor,
      eyCapsuleBg: eyCapsuleBg ?? this.eyCapsuleBg,
      eyCapsuleBorder: eyCapsuleBorder ?? this.eyCapsuleBorder,
      ok: ok ?? this.ok,
      warn: warn ?? this.warn,
      error: error ?? this.error,
      info: info ?? this.info,
      bgVoid: bgVoid ?? this.bgVoid,
      bgAbyss: bgAbyss ?? this.bgAbyss,
      bgSurf: bgSurf ?? this.bgSurf,
      bgCard: bgCard ?? this.bgCard,
      bgEdge: bgEdge ?? this.bgEdge,
      bgGhost: bgGhost ?? this.bgGhost,
      border0: border0 ?? this.border0,
      border1: border1 ?? this.border1,
      border2: border2 ?? this.border2,
      border3: border3 ?? this.border3,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textTertiary: textTertiary ?? this.textTertiary,
      textMuted: textMuted ?? this.textMuted,
      sidebarBg: sidebarBg ?? this.sidebarBg,
      sidebarBorder: sidebarBorder ?? this.sidebarBorder,
      inputBg: inputBg ?? this.inputBg,
      inputBorder: inputBorder ?? this.inputBorder,
      inputFocus: inputFocus ?? this.inputFocus,
      headerBg: headerBg ?? this.headerBg,
      headerBorder: headerBorder ?? this.headerBorder,
      ghostText: ghostText ?? this.ghostText,
      ghostBorder: ghostBorder ?? this.ghostBorder,
      ghostHover: ghostHover ?? this.ghostHover,
      pageBg: pageBg ?? this.pageBg,
      pageContentBg: pageContentBg ?? this.pageContentBg,
      shadowColor: shadowColor ?? this.shadowColor,
      shadowGlow: shadowGlow ?? this.shadowGlow,
    );
  }

  @override
  EyThemeTokens lerp(ThemeExtension<EyThemeTokens>? other, double t) {
    if (other is! EyThemeTokens) {
      return this;
    }

    return EyThemeTokens(
      ey: Color.lerp(ey, other.ey, t)!,
      eyHover: Color.lerp(eyHover, other.eyHover, t)!,
      eyText: Color.lerp(eyText, other.eyText, t)!,
      eySoft: Color.lerp(eySoft, other.eySoft, t)!,
      eyGlow: Color.lerp(eyGlow, other.eyGlow, t)!,
      eyLine: Color.lerp(eyLine, other.eyLine, t)!,
      eyCapsuleColor: Color.lerp(eyCapsuleColor, other.eyCapsuleColor, t)!,
      eyCapsuleBg: Color.lerp(eyCapsuleBg, other.eyCapsuleBg, t)!,
      eyCapsuleBorder:
          Color.lerp(eyCapsuleBorder, other.eyCapsuleBorder, t)!,
      ok: Color.lerp(ok, other.ok, t)!,
      warn: Color.lerp(warn, other.warn, t)!,
      error: Color.lerp(error, other.error, t)!,
      info: Color.lerp(info, other.info, t)!,
      bgVoid: Color.lerp(bgVoid, other.bgVoid, t)!,
      bgAbyss: Color.lerp(bgAbyss, other.bgAbyss, t)!,
      bgSurf: Color.lerp(bgSurf, other.bgSurf, t)!,
      bgCard: Color.lerp(bgCard, other.bgCard, t)!,
      bgEdge: Color.lerp(bgEdge, other.bgEdge, t)!,
      bgGhost: Color.lerp(bgGhost, other.bgGhost, t)!,
      border0: Color.lerp(border0, other.border0, t)!,
      border1: Color.lerp(border1, other.border1, t)!,
      border2: Color.lerp(border2, other.border2, t)!,
      border3: Color.lerp(border3, other.border3, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      textTertiary: Color.lerp(textTertiary, other.textTertiary, t)!,
      textMuted: Color.lerp(textMuted, other.textMuted, t)!,
      sidebarBg: Color.lerp(sidebarBg, other.sidebarBg, t)!,
      sidebarBorder: Color.lerp(sidebarBorder, other.sidebarBorder, t)!,
      inputBg: Color.lerp(inputBg, other.inputBg, t)!,
      inputBorder: Color.lerp(inputBorder, other.inputBorder, t)!,
      inputFocus: Color.lerp(inputFocus, other.inputFocus, t)!,
      headerBg: Color.lerp(headerBg, other.headerBg, t)!,
      headerBorder: Color.lerp(headerBorder, other.headerBorder, t)!,
      ghostText: Color.lerp(ghostText, other.ghostText, t)!,
      ghostBorder: Color.lerp(ghostBorder, other.ghostBorder, t)!,
      ghostHover: Color.lerp(ghostHover, other.ghostHover, t)!,
      pageBg: Color.lerp(pageBg, other.pageBg, t)!,
      pageContentBg: Color.lerp(pageContentBg, other.pageContentBg, t)!,
      shadowColor: Color.lerp(shadowColor, other.shadowColor, t)!,
      shadowGlow: Color.lerp(shadowGlow, other.shadowGlow, t)!,
    );
  }
}
