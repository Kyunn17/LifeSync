import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../../../app/theme/app_colors.dart';
import '../../../../shared/models/schedule_block_model.dart';

class CircadianRingChart extends StatelessWidget {
  final DailyScheduleSummaryModel schedule;

  const CircadianRingChart({super.key, required this.schedule});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final allocatedMinutes = schedule.allocatedMinutes;
    final remainingMinutes = schedule.remainingMinutes;

    final List<PieChartSectionData> sections = [];

    // Add category slices
    for (final cat in schedule.categoryDistribution) {
      if (cat.allocatedMinutes > 0) {
        final color = Color(int.parse('FF${cat.colorHex.replaceFirst('#', '')}', radix: 16));
        sections.add(
          PieChartSectionData(
            color: color,
            value: cat.allocatedMinutes.toDouble(),
            title: '${cat.allocatedMinutes}m',
            radius: 36,
            showTitle: false,
          ),
        );
      }
    }

    // Add unallocated slice if any free time remains
    if (remainingMinutes > 0) {
      sections.add(
        PieChartSectionData(
          color: AppColors.surfaceContainerLow,
          value: remainingMinutes.toDouble(),
          title: 'Free',
          radius: 36,
          showTitle: false,
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.surfaceContainerHigh),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Circadian 24-Hour Ring',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${schedule.allocatedPercentage}% Terisi',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              SizedBox(
                width: 130,
                height: 130,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    PieChart(
                      PieChartData(
                        sectionsSpace: 2,
                        centerSpaceRadius: 42,
                        sections: sections.isNotEmpty
                            ? sections
                            : [
                                PieChartSectionData(
                                  color: AppColors.surfaceContainerLow,
                                  value: 1440,
                                  radius: 36,
                                  showTitle: false,
                                ),
                              ],
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '${(allocatedMinutes / 60).toStringAsFixed(1)}h',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        const Text(
                          '/ 24 Jam',
                          style: TextStyle(fontSize: 10, color: AppColors.outline),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Pilar Alokasi Waktu:',
                      style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    if (schedule.categoryDistribution.isEmpty)
                      const Text(
                        'Belum ada aktivitas. Ketuk tab Jadwal 24J untuk menambah.',
                        style: TextStyle(fontSize: 11, color: AppColors.outline),
                      )
                    else
                      ...schedule.categoryDistribution.take(4).map((cat) {
                        final color = Color(int.parse('FF${cat.colorHex.replaceFirst('#', '')}', radix: 16));
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  cat.name,
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Text(
                                '${cat.allocatedMinutes}m',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.outline),
                              ),
                            ],
                          ),
                        );
                      }),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

