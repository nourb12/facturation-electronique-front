import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/theme_extensions.dart';

class EyBackground extends StatelessWidget {
  const EyBackground({
    super.key,
    required this.child,
    this.padding = EdgeInsets.zero,
    this.safeArea = true,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final bool safeArea;

  @override
  Widget build(BuildContext context) {
    final colors = context.ey;
    final gridColor = colors.ey.withValues(
      alpha: context.isDarkMode ? 0.03 : 0.02,
    );

    final content = Padding(
      padding: padding,
      child: child,
    );

    return DecoratedBox(
      decoration: BoxDecoration(color: colors.pageBg),
      child: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _GridPainter(color: gridColor),
            ),
          ),
          Positioned(
            top: -120,
            right: -80,
            child: _Orb(
              size: 320,
              color: colors.ey.withValues(
                alpha: context.isDarkMode ? 0.09 : 0.12,
              ),
            ),
          ),
          Positioned(
            bottom: -120,
            left: -80,
            child: _Orb(
              size: 260,
              color: colors.ey.withValues(
                alpha: context.isDarkMode ? 0.05 : 0.08,
              ),
            ),
          ),
          Positioned.fill(
            child: safeArea ? SafeArea(child: content) : content,
          ),
        ],
      ),
    );
  }
}

class _Orb extends StatelessWidget {
  const _Orb({
    required this.size,
    required this.color,
  });

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: ImageFiltered(
        imageFilter: ImageFilter.blur(sigmaX: 60, sigmaY: 60),
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(
              colors: [
                color,
                color.withValues(alpha: 0),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _GridPainter extends CustomPainter {
  const _GridPainter({
    required this.color,
  });

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    const spacing = 44.0;
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1;

    for (double x = 0; x <= size.width; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }

    for (double y = 0; y <= size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant _GridPainter oldDelegate) {
    return oldDelegate.color != color;
  }
}
