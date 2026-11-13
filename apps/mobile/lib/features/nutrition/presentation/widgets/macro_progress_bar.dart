import 'package:flutter/material.dart';
import '../../../../app/theme/app_colors.dart';

class MacroProgressBar extends StatelessWidget {
  final double proteins; // grams
  final double carbs; // grams
  final double fat; // grams

  const MacroProgressBar({
    super.key,
    required this.proteins,
    required this.carbs,
    required this.fat,
  });

  @override
  Widget build(BuildContext context) {
    final totalGrams = proteins + carbs + fat;
    final pPct = totalGrams > 0 ? (proteins / totalGrams) : 0.33;
    final cPct = totalGrams > 0 ? (carbs / totalGrams) : 0.33;
    final fPct = totalGrams > 0 ? (fat / totalGrams) : 0.34;

    return Column(
      children: [
        // Multi-colored stacked progress bar
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: SizedBox(
            height: 8,
            child: Row(
              children: [
                Expanded(
                  flex: (pPct * 1000).toInt().clamp(1, 1000),
                  child: Container(color: AppColors.primary),
                ),
                Expanded(
                  flex: (cPct * 1000).toInt().clamp(1, 1000),
                  child: Container(color: const Color(0xFFEAB308)), // Amber for Carbs
                ),
                Expanded(
                  flex: (fPct * 1000).toInt().clamp(1, 1000),
                  child: Container(color: const Color(0xFF0284C7)), // Sky blue for Fat
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Legend row
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildMacroBadge(
              label: 'Protein',
              grams: proteins,
              color: AppColors.primary,
            ),
            _buildMacroBadge(
              label: 'Karbohidrat',
              grams: carbs,
              color: const Color(0xFFEAB308),
            ),
            _buildMacroBadge(
              label: 'Lemak',
              grams: fat,
              color: const Color(0xFF0284C7),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMacroBadge({
    required String label,
    required double grams,
    required Color color,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(shape: BoxShape.circle, color: color),
        ),
        const SizedBox(width: 6),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(fontSize: 10, color: AppColors.outline),
            ),
            Text(
              '${grams.toStringAsFixed(1)}g',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ],
    );
  }
}

