import 'package:flutter/material.dart';

class AppColors {
  // Brand Identity (Sanctuary Flow - Stitch Redesign)
  static const Color primary = Color(0xFF005F3F); // Deep Forest Green
  static const Color primaryContainer = Color(0xFF0D7A53); // Emerald Container
  static const Color primaryDark = Color(0xFF00452D);
  static const Color primaryLight = Color(0xFF7EFABC);
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color onPrimaryFixed = Color(0xFF002113);

  // Secondary & Mint Accents
  static const Color secondary = Color(0xFF006C47);
  static const Color secondaryContainer = Color(0xFF7EFABC); // Soft Mint
  static const Color secondaryFixed = Color(0xFF7EFABC);
  static const Color secondaryFixedDim = Color(0xFF60DDA2);
  static const Color onSecondaryContainer = Color(0xFF005235);

  // Tertiary (Sleep / Circadian Indigo)
  static const Color tertiary = Color(0xFF3C3DCA);
  static const Color tertiaryContainer = Color(0xFF5659E4);
  static const Color tertiaryFixed = Color(0xFFE1E0FF);
  static const Color onTertiaryFixedVariant = Color(0xFF2926B8);

  // Background & Surfaces (Bento Layered Canvas)
  static const Color background = Color(0xFFF9F9FF);
  static const Color surface = Color(0xFFFFFFFF); // Pure White Bento Cards
  static const Color surfaceContainerLowest = Color(0xFFFFFFFF);
  static const Color surfaceContainerLow = Color(0xFFF1F3FF); // Inner Input/Pill Surface
  static const Color surfaceContainer = Color(0xFFE9EDFF);
  static const Color surfaceContainerHigh = Color(0xFFE1E8FD);
  static const Color surfaceContainerHighest = Color(0xFFDCE2F7);

  // Inverse HUD Surfaces (AI Push-Up Counter)
  static const Color inverseSurface = Color(0xFF293040);
  static const Color inverseOnSurface = Color(0xFFEDF0FF);
  static const Color inversePrimary = Color(0xFF5DDBA7);

  // Typography & Content
  static const Color onSurface = Color(0xFF141B2B); // Deep Slate
  static const Color onSurfaceVariant = Color(0xFF3E4942); // Muted Sage Body
  static const Color outline = Color(0xFF6E7A72);
  static const Color outlineVariant = Color(0xFFBEC9C0);

  // Semantics
  static const Color error = Color(0xFFBA1A1A);
  static const Color errorContainer = Color(0xFFFFDAD6);
  static const Color onErrorContainer = Color(0xFF93000A);
  static const Color success = Color(0xFF006C47);
  static const Color successContainer = Color(0xFFD4F8E8);

  // Reusable Gradients & Shadows
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF005F3F), Color(0xFF0D7A53)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static List<BoxShadow> get bentoShadow => [
        BoxShadow(
          color: const Color(0xFF141B2B).withValues(alpha: 0.045),
          blurRadius: 24,
          offset: const Offset(0, 8),
        ),
      ];
}
