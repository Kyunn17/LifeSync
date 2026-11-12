import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../app/theme/app_colors.dart';
import '../../../shared/models/schedule_block_model.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../providers/planner_provider.dart';
import 'add_schedule_sheet.dart';
import 'widgets/circadian_ribbon_bar.dart';
import 'widgets/routine_templates_bar.dart';

class PlannerScreen extends ConsumerStatefulWidget {
  const PlannerScreen({super.key});

  @override
  ConsumerState<PlannerScreen> createState() => _PlannerScreenState();
}

class _PlannerScreenState extends ConsumerState<PlannerScreen> {
  String _selectedCategoryFilter = 'ALL';

  void _changeDate(int deltaDays) {
    final currentStr = ref.read(selectedDateProvider);
    final dt = DateTime.tryParse(currentStr) ?? DateTime.now();
    final newDt = dt.add(Duration(days: deltaDays));
    ref.read(selectedDateProvider.notifier).state = DateFormat('yyyy-MM-dd').format(newDt);
  }

  Future<void> _pickCalendarDate() async {
    final currentStr = ref.read(selectedDateProvider);
    final currentDt = DateTime.tryParse(currentStr) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: currentDt,
      firstDate: DateTime(2024),
      lastDate: DateTime(2030),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: AppColors.onSurface,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      ref.read(selectedDateProvider.notifier).state = DateFormat('yyyy-MM-dd').format(picked);
    }
  }

  Future<void> _handleDelete(ScheduleBlockModel block) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus Blok Jadwal?'),
        content: Text('Yakin ingin menghapus "${block.title}" dari jadwal?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(plannerRepositoryProvider).deleteSchedule(block.id);
      ref.invalidate(scheduleSummaryProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('"${block.title}" berhasil dihapus'),
            backgroundColor: AppColors.primary,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _handleSplit(ScheduleBlockModel block) async {
    if (block.durationMinutes < 30) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Blok minimal berdurasi 30 menit untuk dibagi.'),
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    try {
      await ref.read(plannerRepositoryProvider).splitSchedule(block);
      ref.invalidate(scheduleSummaryProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Berhasil membagi "${block.title}" menjadi 2 blok!'),
            backgroundColor: AppColors.primary,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal membagi blok: $e'),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _fillNextBuffer(List<ScheduleBlockModel> blocks, String selectedDate) {
    // Find gaps
    final List<Map<String, int>> intervals = [];
    for (final b in blocks) {
      intervals.add({'start': b.startMinutes, 'end': b.endMinutes});
    }
    intervals.sort((a, b) => a['start']!.compareTo(b['start']!));

    int cursor = 0;
    int? freeStart;
    int? freeEnd;

    for (final item in intervals) {
      if (item['start']! > cursor && (item['start']! - cursor) >= 30) {
        freeStart = cursor;
        freeEnd = item['start']!;
        break;
      }
      cursor = cursor > item['end']! ? cursor : item['end']!;
    }

    if (freeStart == null && cursor < 1440 && (1440 - cursor) >= 30) {
      freeStart = cursor;
      freeEnd = (cursor + 90).clamp(0, 1440);
    }

    String? preStart;
    String? preEnd;

    if (freeStart != null && freeEnd != null) {
      final sh = (freeStart ~/ 60).toString().padLeft(2, '0');
      final sm = (freeStart % 60).toString().padLeft(2, '0');
      preStart = '$sh:$sm';

      final eh = (freeEnd ~/ 60).toString().padLeft(2, '0');
      final em = (freeEnd % 60).toString().padLeft(2, '0');
      preEnd = freeEnd == 1440 ? '00:00' : '$eh:$em';
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddScheduleSheet(
        date: selectedDate,
        prefillStartTime: preStart,
        prefillEndTime: preEnd,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
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
                  onPressed: () => _changeDate(-1),
                ),
                InkWell(
                  onTap: _pickCalendarDate,
                  borderRadius: BorderRadius.circular(10),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.calendar_month_outlined, size: 16, color: AppColors.primary),
                        const SizedBox(width: 6),
                        Text(
                          displayDate,
                          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right_rounded),
                  onPressed: () => _changeDate(1),
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
        loading: () => const LoadingIndicator(message: 'Menyelaraskan alokasi waktu 24 jam...'),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline_rounded, size: 48, color: Colors.redAccent),
                const SizedBox(height: 12),
                Text('Gagal memuat jadwal: $err', textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => ref.refresh(scheduleSummaryProvider),
                  child: const Text('Coba Lagi'),
                ),
              ],
            ),
          ),
        ),
        data: (summary) {
          final blocks = summary.blocks;
          final remainingMinutes = summary.remainingMinutes;
          final remainingHours = (remainingMinutes / 60.0).clamp(0.0, 24.0);

          // Filtering
          final filteredBlocks = _selectedCategoryFilter == 'ALL'
              ? blocks
              : blocks.where((b) => b.category?.name == _selectedCategoryFilter || b.activityId == _selectedCategoryFilter).toList();

          // Extract unique categories for filter chips
          final Map<String, String> categoryOptions = {'ALL': 'Semua (${blocks.length})'};
          for (final b in blocks) {
            final catName = b.category?.name ?? 'Lainnya';
            categoryOptions[catName] = catName;
          }

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(scheduleSummaryProvider.future),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 96),
              children: [
                // 1. Continuous Circadian Ribbon (24-Hour Visual Timeline)
                CircadianRibbonBar(
                  blocks: blocks,
                  selectedDate: selectedDate,
                  onScheduleChanged: () => ref.invalidate(scheduleSummaryProvider),
                ),
                const SizedBox(height: 14),

                // 2. Routine Starter Templates (One-Click Day Filler)
                RoutineTemplatesBar(
                  date: selectedDate,
                  onApplied: () => ref.invalidate(scheduleSummaryProvider),
                ),
                const SizedBox(height: 14),

                // 3. Time Allocation & Free Buffer Card
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.surfaceContainerHigh),
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
                                'Alokasi 24 Jam',
                                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Sisa ${remainingHours.toStringAsFixed(1)} Jam Waktu Luang',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: remainingHours > 0 ? AppColors.primary : Colors.orange,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceContainerLow,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '${(summary.allocatedMinutes / 60).toStringAsFixed(1)} / 24 Jam',
                              style: theme.textTheme.labelMedium?.copyWith(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: (summary.allocatedPercentage / 100.0).clamp(0.0, 1.0),
                          minHeight: 8,
                          backgroundColor: AppColors.surfaceContainerLow,
                          valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                        ),
                      ),
                      if (remainingMinutes >= 30) ...[
                        const SizedBox(height: 12),
                        InkWell(
                          onTap: () => _fillNextBuffer(blocks, selectedDate),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceContainerLow,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: const [
                                Icon(Icons.add_circle_outline_rounded, size: 16, color: AppColors.primary),
                                SizedBox(width: 6),
                                Text(
                                  'Isi Slot Waktu Luang Otomatis',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 4. Category Filter Chips (if blocks exist)
                if (blocks.isNotEmpty && categoryOptions.length > 2) ...[
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: categoryOptions.entries.map((entry) {
                        final isSel = _selectedCategoryFilter == entry.key;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(entry.value),
                            selected: isSel,
                            selectedColor: AppColors.primary.withValues(alpha: 0.2),
                            side: BorderSide(
                              color: isSel ? AppColors.primary : AppColors.surfaceContainerHigh,
                            ),
                            labelStyle: TextStyle(
                              color: isSel ? AppColors.primary : AppColors.onSurface,
                              fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                              fontSize: 12,
                            ),
                            onSelected: (val) {
                              if (val) {
                                setState(() => _selectedCategoryFilter = entry.key);
                              }
                            },
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // 5. Schedule Blocks List or Empty Guidance
                if (blocks.isEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.surfaceContainerHigh),
                    ),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.surfaceContainerLow,
                          ),
                          child: const Icon(Icons.calendar_today_rounded, size: 36, color: AppColors.primary),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Jadwal 24 Jam Masih Kosong',
                          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Gunakan tombol "Template Cepat" di atas untuk mengisi hari kerja atau akhir pekan secara otomatis, atau ketuk tombol "+" di bawah.',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodySmall?.copyWith(color: AppColors.outline),
                        ),
                      ],
                    ),
                  )
                else
                  ...filteredBlocks.map((block) {
                    final catColor = block.category?.color ?? AppColors.primary;

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                        side: BorderSide(color: catColor.withValues(alpha: 0.3)),
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(18),
                        onTap: () {
                          showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (_) => AddScheduleSheet(
                              date: selectedDate,
                              initialBlock: block,
                            ),
                          );
                        },
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Left Color Indicator Pill
                              Container(
                                width: 4,
                                height: 52,
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
                                        PopupMenuButton<String>(
                                          icon: const Icon(Icons.more_vert_rounded, size: 20, color: AppColors.outline),
                                          onSelected: (val) {
                                            if (val == 'edit') {
                                              showModalBottomSheet(
                                                context: context,
                                                isScrollControlled: true,
                                                backgroundColor: Colors.transparent,
                                                builder: (_) => AddScheduleSheet(
                                                  date: selectedDate,
                                                  initialBlock: block,
                                                ),
                                              );
                                            } else if (val == 'split') {
                                              _handleSplit(block);
                                            } else if (val == 'delete') {
                                              _handleDelete(block);
                                            }
                                          },
                                          itemBuilder: (ctx) => [
                                            const PopupMenuItem(
                                              value: 'edit',
                                              child: Row(
                                                children: [
                                                  Icon(Icons.edit_outlined, size: 18),
                                                  SizedBox(width: 8),
                                                  Text('Ubah Blok'),
                                                ],
                                              ),
                                            ),
                                            if (block.durationMinutes >= 30)
                                              const PopupMenuItem(
                                                value: 'split',
                                                child: Row(
                                                  children: [
                                                    Icon(Icons.call_split_rounded, size: 18),
                                                    SizedBox(width: 8),
                                                    Text('Bagi Jadi 2 Blok'),
                                                  ],
                                                ),
                                              ),
                                            const PopupMenuItem(
                                              value: 'delete',
                                              child: Row(
                                                children: [
                                                  Icon(Icons.delete_outline, size: 18, color: Colors.redAccent),
                                                  SizedBox(width: 8),
                                                  Text('Hapus', style: TextStyle(color: Colors.redAccent)),
                                                ],
                                              ),
                                            ),
                                          ],
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
