import 'package:flutter/material.dart';

import 'ey_theme_tokens.dart';

extension EyBuildContext on BuildContext {
  EyThemeTokens get ey => Theme.of(this).extension<EyThemeTokens>()!;

  bool get isDarkMode => Theme.of(this).brightness == Brightness.dark;
}
