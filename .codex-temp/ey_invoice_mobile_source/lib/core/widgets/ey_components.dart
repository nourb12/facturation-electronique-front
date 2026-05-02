import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/theme_extensions.dart';

class EyBrandMark extends StatelessWidget {
  const EyBrandMark({
    super.key,
    this.size = 34,
  });

  final double size;

  @override
  Widget build(BuildContext context) {
    final colors = context.ey;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: colors.ey,
        borderRadius: BorderRadius.circular(size * 0.24),
      ),
      alignment: Alignment.center,
      child: Text(
        'EY',
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: colors.eyText,
              fontWeight: FontWeight.w900,
              letterSpacing: -.6,
            ),
      ),
    );
  }
}

class EyEyebrow extends StatelessWidget {
  const EyEyebrow({
    super.key,
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = context.ey;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: colors.eyCapsuleBg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colors.eyCapsuleBorder),
      ),
      child: Text(
        label.toUpperCase(),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: colors.eyCapsuleColor,
              letterSpacing: 1.1,
            ),
      ),
    );
  }
}

class EySurfaceCard extends StatelessWidget {
  const EySurfaceCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.margin,
    this.backgroundColor,
    this.borderColor,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final Color? backgroundColor;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    final colors = context.ey;

    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: backgroundColor ?? colors.bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor ?? colors.border1),
        boxShadow: [
          BoxShadow(
            color: colors.shadowColor.withValues(
              alpha: context.isDarkMode ? .45 : .08,
            ),
            blurRadius: 28,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: child,
    );
  }
}

class EyPrimaryButton extends StatelessWidget {
  const EyPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final colors = context.ey;

    return SizedBox(
      width: double.infinity,
      child: FilledButton(
        onPressed: isLoading ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: colors.ey,
          foregroundColor: colors.eyText,
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 0,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isLoading)
              SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2.2,
                  valueColor: AlwaysStoppedAnimation<Color>(colors.eyText),
                ),
              )
            else if (icon != null)
              Icon(icon, size: 18),
            if (isLoading || icon != null) const SizedBox(width: 10),
            Text(label),
          ],
        ),
      ),
    );
  }
}

class EySecondaryButton extends StatelessWidget {
  const EySecondaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final colors = context.ey;

    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          backgroundColor: colors.bgCard,
          foregroundColor: colors.textPrimary,
          side: BorderSide(color: colors.border1),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 18),
              const SizedBox(width: 10),
            ],
            Text(label),
          ],
        ),
      ),
    );
  }
}

class EyIconAction extends StatelessWidget {
  const EyIconAction({
    super.key,
    required this.icon,
    required this.onTap,
    this.tooltip,
  });

  final IconData icon;
  final VoidCallback onTap;
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    final colors = context.ey;

    return Tooltip(
      message: tooltip ?? '',
      child: Material(
        color: colors.bgCard,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: colors.border1),
            ),
            child: Icon(
              icon,
              color: colors.textPrimary,
              size: 20,
            ),
          ),
        ),
      ),
    );
  }
}

enum EyStatusTone {
  ey,
  neutral,
  ok,
  warn,
  error,
  info,
}

class EyStatusChip extends StatelessWidget {
  const EyStatusChip({
    super.key,
    required this.label,
    this.tone = EyStatusTone.neutral,
  });

  final String label;
  final EyStatusTone tone;

  @override
  Widget build(BuildContext context) {
    final colors = context.ey;

    late final Color backgroundColor;
    late final Color foregroundColor;

    switch (tone) {
      case EyStatusTone.ey:
        backgroundColor = colors.ey;
        foregroundColor = colors.eyText;
        break;
      case EyStatusTone.ok:
        backgroundColor = colors.ok.withValues(alpha: .12);
        foregroundColor = colors.ok;
        break;
      case EyStatusTone.warn:
        backgroundColor = colors.warn.withValues(alpha: .12);
        foregroundColor = colors.warn;
        break;
      case EyStatusTone.error:
        backgroundColor = colors.error.withValues(alpha: .12);
        foregroundColor = colors.error;
        break;
      case EyStatusTone.info:
        backgroundColor = colors.info.withValues(alpha: .12);
        foregroundColor = colors.info;
        break;
      case EyStatusTone.neutral:
        backgroundColor = colors.border1;
        foregroundColor = colors.textSecondary;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: foregroundColor,
              letterSpacing: .4,
            ),
      ),
    );
  }
}

class EyTextField extends StatelessWidget {
  const EyTextField({
    super.key,
    required this.label,
    this.controller,
    this.hint,
    this.obscureText = false,
    this.keyboardType,
    this.maxLines = 1,
    this.readOnly = false,
    this.enabled = true,
    this.suffixIcon,
    this.prefixIcon,
    this.mono = false,
    this.onChanged,
    this.textInputAction,
    this.onSubmitted,
    this.inputFormatters,
  });

  final String label;
  final TextEditingController? controller;
  final String? hint;
  final bool obscureText;
  final TextInputType? keyboardType;
  final int maxLines;
  final bool readOnly;
  final bool enabled;
  final Widget? suffixIcon;
  final Widget? prefixIcon;
  final bool mono;
  final ValueChanged<String>? onChanged;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;
  final List<TextInputFormatter>? inputFormatters;

  @override
  Widget build(BuildContext context) {
    final colors = context.ey;
    final textTheme = Theme.of(context).textTheme;

    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      maxLines: obscureText ? 1 : maxLines,
      readOnly: readOnly,
      enabled: enabled,
      onChanged: onChanged,
      onFieldSubmitted: onSubmitted,
      textInputAction: textInputAction,
      inputFormatters: inputFormatters,
      style: (mono ? textTheme.labelLarge : textTheme.bodyLarge)?.copyWith(
        color: colors.textPrimary,
      ),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: prefixIcon,
        suffixIcon: suffixIcon,
      ),
    );
  }
}
