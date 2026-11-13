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

    for (final cat in schedule.categoryDistribution) {
      if (cat.allocatedMinutes > 0) {
        final color = Color(
          int.parse('FF${cat.colorHex.replaceFirst('#', '')}', radix: 16),
        );
        sections.add(
          PieChartSectionData(
            color: color,
            value: cat.allocatedMinutes.toDouble(),
            title: '${cat.allocatedMinutes}m',
            radius: 24,
            showTitle: false,
          ),
        );
      }
    }

    if (remainingMinutes > 0) {
      sections.add(
        PieChartSectionData(
          color: AppColors.surfaceContainerLow,
          value: remainingMinutes.toDouble(),
          title: 'Free',
          radius: 24,
          showTitle: false,
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(28),
        boxShadow: AppColors.bentoShadow,
        border: Border.all(
          color: AppColors.outlineVariant.withValues(alpha: 0.22),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Ritme Sirkadian 24 Jam',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Distribusi waktu biologis & produktivitas',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                      fontSize: 11.5,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppColors.secondaryFixed.withValues(alpha: 0.45),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.schedule_rounded,
                      size: 13,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${schedule.allocatedPercentage}% Terisi',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              SizedBox(
                width: 124,
                height: 124,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    PieChart(
                      PieChartData(
                        sectionsSpace: 2.5,
                        centerSpaceRadius: 38,
                        sections: sections.isNotEmpty
                            ? sections
                            : [
                                PieChartSectionData(
                                  color: AppColors.surfaceContainerLow,
                                  value: 1440,
                                  radius: 24,
                                  showTitle: false,
                                ),
                              ],
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'TERALOKASI',
                          style: TextStyle(
                            fontSize: 8.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.6,
                            color: AppColors.outline,
                          ),
                        ),
                        Text(
                          '${(allocatedMinutes / 60).toStringAsFixed(1)}j',
                          style: const TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w900,
                            color: AppColors.onSurface,
                          ),
                        ),
                        const Text(
                          'dari 24 Jam',
                          style: TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: schedule.categoryDistribution.isEmpty
                    ? Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerLow,
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: const Text(
                          'Belum ada aktivitas terjadwal hari ini. Buka tab Jadwal 24J untuk menyusun blok waktumu.',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: AppColors.onSurfaceVariant,
                            height: 1.4,
                          ),
                        ),
                      )
                    : Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: schedule.categoryDistribution
                            .take(4)
                            .map((cat) {
                          final color = Color(
                            int.parse(
                              'FF${cat.colorHex.replaceFirst('#', '')}',
                              radix: 16,
                            ),
                          );
                          final hours = (cat.allocatedMinutes / 60)
                              .toStringAsFixed(1);
                          return Container(
                            width: 102,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceContainerLow,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: BoxDecoration(
                                        color: color,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text(
                                        cat.name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.onSurfaceVariant,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  '$hours Jam',
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.onSurface,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
