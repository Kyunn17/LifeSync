import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../app/theme/app_colors.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../providers/planner_provider.dart';
import 'add_schedule_sheet.dart';

class PlannerScreen extends ConsumerWidget {
  const PlannerScreen({super.key});

  void _changeDate(WidgetRef ref, int deltaDays) {
    final currentStr = ref.read(selectedDateProvider);
    final dt = DateTime.tryParse(currentStr) ?? DateTime.now();
    final newDt = dt.add(Duration(days: deltaDays));
    ref.read(selectedDateProvider.notifier).state = DateFormat('yyyy-MM-dd').format(newDt);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final selectedDate = ref.watch(selectedDateProvider);
    final summaryAsync = ref.watch(scheduleSummaryProvider);

    final displayDate = DateFormat('EEE, d MMM yyyy', 'id_ID').format(
      DateTime.tryParse(selectedDate) ?? DateTime.now(),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rencana 24 Jam'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left_rounded),
                  onPressed: () => _changeDate(ref, -1),
                ),
                Text(
                  displayDate,
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right_rounded),
                  onPressed: () => _changeDate(ref, 1),
                ),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (_) => AddScheduleSheet(date: selectedDate),
          );
        },
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Tambah Blok'),
      ),
      body: summaryAsync.when(
        loading: () => const LoadingIndicator(message: 'Memuat jadwal alokasi waktu...'),
        error: (err, _) => Center(
          child: Text('Gagal memuat jadwal: $err'),
        ),
        data: (summary) {
          final blocks = summary.blocks;

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(scheduleSummaryProvider.future),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 80),
              children: [
                // Allocation Progress Header
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.surfaceContainerHigh),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Alokasi Waktu',
                            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          Text(
                            '${(summary.allocatedMinutes / 60).toStringAsFixed(1)} / 24 Jam',
                            style: theme.textTheme.labelMedium?.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: (summary.allocatedPercentage / 100.0).clamp(0.0, 1.0),
                          minHeight: 8,
                          backgroundColor: AppColors.surfaceContainerLow,
                          valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                if (blocks.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 48),
                      child: Column(
                        children: [
                          Icon(Icons.calendar_today_rounded, size: 48, color: AppColors.outlineVariant),
                          const SizedBox(height: 16),
                          Text(
                            'Belum Ada Jadwal',
                            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Alokasikan 24 jam Anda untuk istirahat, fokus kerja, dan relaksasi.',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ...blocks.map((block) {
                    final catColor = block.category?.color ?? AppColors.primary;

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                        side: BorderSide(color: catColor.withValues(alpha: 0.3)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Left Color Indicator Pill
                            Container(
                              width: 4,
                              height: 48,
                              decoration: BoxDecoration(
                                color: catColor,
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          block.title,
                                          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.outline),
                                        onPressed: () async {
                                          await ref.read(plannerRepositoryProvider).deleteSchedule(block.id);
                                          ref.invalidate(scheduleSummaryProvider);
                                        },
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Icon(Icons.access_time_rounded, size: 14, color: catColor),
                                      const SizedBox(width: 6),
                                      Text(
                                        '${block.startTime} - ${block.endTime} (${block.durationMinutes} menit)',
                                        style: theme.textTheme.bodySmall?.copyWith(
                                          color: AppColors.onSurfaceVariant,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      if (block.crossesMidnight) ...[
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: AppColors.surfaceContainerHigh,
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: const Text(
                                            '+1 hari',
                                            style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  if (block.description != null && block.description!.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Text(
                                      block.description!,
                                      style: theme.textTheme.bodySmall?.copyWith(color: AppColors.outline),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
              ],
            ),
          );
        },
      ),
    );
  }
}

