import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../app/theme/app_colors.dart';
import '../../../shared/models/schedule_block_model.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../insights/providers/insights_provider.dart';
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
      ref.read(selectedDateProvider.notifier).state =
          DateFormat('yyyy-MM-dd').format(picked);
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
      ref.invalidate(dailyAnalyticsProvider);
      ref.invalidate(weeklyAnalyticsProvider);
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
      ref.invalidate(dailyAnalyticsProvider);
      ref.invalidate(weeklyAnalyticsProvider);
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

  List<DateTime> _buildWeekDays(DateTime selectedDt) {
    // Center around selectedDt (3 days before to 3 days after)
    return List.generate(
      7,
      (index) => selectedDt.subtract(Duration(days: 3 - index)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final selectedDate = ref.watch(selectedDateProvider);
    final summaryAsync = ref.watch(scheduleSummaryProvider);
    final selectedDt = DateTime.tryParse(selectedDate) ?? DateTime.now();

    final displayDate = DateFormat('EEEE, d MMMM yyyy', 'id_ID').format(
      selectedDt,
    );
    final weekDays = _buildWeekDays(selectedDt);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        toolbarHeight: 68,
        titleSpacing: 20,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'RITME SIRKADIAN TUBUH',
              style: TextStyle(
                fontSize: 9.5,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.0,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              'Rencana 24 Jam',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
                color: AppColors.onSurface,
              ),
            ),
          ],
        ),
        actions: [
          InkWell(
            onTap: _pickCalendarDate,
            borderRadius: BorderRadius.circular(999),
            child: Container(
              margin: const EdgeInsets.only(right: 16),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: AppColors.outlineVariant.withValues(alpha: 0.35),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.calendar_month_rounded,
                    size: 16,
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    DateFormat('d MMM yyyy', 'id_ID').format(selectedDt),
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      body: summaryAsync.when(
        loading: () => const LoadingIndicator(
          message: 'Menyelaraskan alokasi waktu 24 jam...',
        ),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.error_outline_rounded,
                  size: 48,
                  color: Colors.redAccent,
                ),
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

          final filteredBlocks = _selectedCategoryFilter == 'ALL'
              ? blocks
              : blocks
                  .where(
                    (b) =>
                        b.category?.name == _selectedCategoryFilter ||
                        b.activityId == _selectedCategoryFilter,
                  )
                  .toList();

          final Map<String, String> categoryOptions = {
            'ALL': 'Semua (${blocks.length})',
          };
          for (final b in blocks) {
            final catName = b.category?.name ?? 'Lainnya';
            categoryOptions[catName] = catName;
          }

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(scheduleSummaryProvider.future),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              children: [
                // 0. 7-Day Horizontal Mini Calendar Strip (Stitch Design)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: weekDays.map((day) {
                    final dayStr = DateFormat('yyyy-MM-dd').format(day);
                    final isSelected = dayStr == selectedDate;
                    final dayLabel =
                        DateFormat('EEE', 'id_ID').format(day).substring(0, 3);

                    return Expanded(
                      child: GestureDetector(
                        onTap: () {
                          ref.read(selectedDateProvider.notifier).state =
                              dayStr;
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            gradient:
                                isSelected ? AppColors.primaryGradient : null,
                            color: isSelected ? null : AppColors.surface,
                            borderRadius: BorderRadius.circular(18),
                            boxShadow: isSelected
                                ? [
                                    BoxShadow(
                                      color: AppColors.primary
                                          .withValues(alpha: 0.25),
                                      blurRadius: 12,
                                      offset: const Offset(0, 4),
                                    ),
                                  ]
                                : null,
                            border: Border.all(
                              color: isSelected
                                  ? Colors.transparent
                                  : AppColors.outlineVariant
                                      .withValues(alpha: 0.3),
                            ),
                          ),
                          child: Column(
                            children: [
                              Text(
                                dayLabel,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: isSelected
                                      ? AppColors.secondaryFixed
                                      : AppColors.outline,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${day.day}',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w900,
                                  color: isSelected
                                      ? Colors.white
                                      : AppColors.onSurface,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Container(
                                width: 5,
                                height: 5,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isSelected
                                      ? AppColors.secondaryFixed
                                      : AppColors.outlineVariant,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 8),
                Center(
                  child: Text(
                    displayDate,
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // 1. Continuous Circadian Ribbon (24-Hour Visual Timeline)
                CircadianRibbonBar(
                  blocks: blocks,
                  selectedDate: selectedDate,
                  onScheduleChanged: () =>
                      ref.invalidate(scheduleSummaryProvider),
                ),
                const SizedBox(height: 16),

                // 2. Routine Starter Templates (One-Click Day Filler)
                RoutineTemplatesBar(
                  date: selectedDate,
                  onApplied: () => ref.invalidate(scheduleSummaryProvider),
                ),
                const SizedBox(height: 16),

                // 3. AI Smart Gap Detector & 24-Hour Allocation Bento Card
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppColors.surface,
                        AppColors.surfaceContainerLow.withValues(alpha: 0.8),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: AppColors.bentoShadow,
                    border: Border.all(
                      color: AppColors.primaryContainer.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              gradient: AppColors.primaryGradient,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: const Icon(
                              Icons.auto_awesome_rounded,
                              size: 20,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      'Alokasi 24 Jam',
                                      style:
                                          theme.textTheme.titleSmall?.copyWith(
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.onSurface,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColors.secondaryFixed
                                            .withValues(alpha: 0.5),
                                        borderRadius:
                                            BorderRadius.circular(999),
                                      ),
                                      child: Text(
                                        '${(summary.allocatedMinutes / 60).toStringAsFixed(1)} / 24 Jam',
                                        style: const TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w800,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  remainingHours > 0
                                      ? 'Sisa ${remainingHours.toStringAsFixed(1)} Jam Waktu Luang belum teralokasi'
                                      : 'Seluruh 24 jam telah teralokasi penuh!',
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(99),
                        child: LinearProgressIndicator(
                          value: (summary.allocatedPercentage / 100.0)
                              .clamp(0.0, 1.0),
                          minHeight: 7,
                          backgroundColor: Colors.white,
                          valueColor: const AlwaysStoppedAnimation<Color>(
                            AppColors.primaryContainer,
                          ),
                        ),
                      ),
                      if (remainingMinutes >= 30) ...[
                        const SizedBox(height: 12),
                        InkWell(
                          onTap: () => _fillNextBuffer(blocks, selectedDate),
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              vertical: 10,
                              horizontal: 14,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: AppColors.primaryContainer
                                    .withValues(alpha: 0.25),
                              ),
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.add_circle_outline_rounded,
                                  size: 16,
                                  color: AppColors.primary,
                                ),
                                SizedBox(width: 6),
                                Text(
                                  'Isi Slot Waktu Luang Otomatis',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
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
                const SizedBox(height: 18),

                // 4. Section Header + Category Filter Chips
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Jadwal Blok Harian',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface,
                      ),
                    ),
                    Text(
                      '${filteredBlocks.length} Aktivitas',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.outline,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

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
                            selectedColor:
                                AppColors.secondaryFixed.withValues(alpha: 0.5),
                            side: BorderSide(
                              color: isSel
                                  ? AppColors.primary
                                  : AppColors.outlineVariant
                                      .withValues(alpha: 0.35),
                            ),
                            labelStyle: TextStyle(
                              color: isSel
                                  ? AppColors.primary
                                  : AppColors.onSurface,
                              fontWeight:
                                  isSel ? FontWeight.w800 : FontWeight.w600,
                              fontSize: 12,
                            ),
                            onSelected: (val) {
                              if (val) {
                                setState(
                                  () => _selectedCategoryFilter = entry.key,
                                );
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
                    padding: const EdgeInsets.symmetric(
                      vertical: 36,
                      horizontal: 20,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: AppColors.bentoShadow,
                      border: Border.all(
                        color: AppColors.outlineVariant.withValues(alpha: 0.25),
                      ),
                    ),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.surfaceContainerLow,
                          ),
                          child: const Icon(
                            Icons.calendar_today_rounded,
                            size: 32,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          'Jadwal 24 Jam Masih Kosong',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Gunakan tombol "Preset Rutinitas Cepat" di atas atau ketuk tombol "+ Tambah Blok Aktivitas" di bawah.',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  ...filteredBlocks.map((block) {
                    final catColor = block.category?.color ?? AppColors.primary;
                    final catName = block.category?.name ?? 'Aktivitas';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: AppColors.bentoShadow,
                        border: Border.all(
                          color: catColor.withValues(alpha: 0.28),
                          width: 1.2,
                        ),
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(24),
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
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 42,
                                    height: 42,
                                    decoration: BoxDecoration(
                                      color: catColor.withValues(alpha: 0.14),
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    child: Icon(
                                      Icons.schedule_rounded,
                                      size: 20,
                                      color: catColor,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Wrap(
                                          spacing: 6,
                                          runSpacing: 4,
                                          crossAxisAlignment:
                                              WrapCrossAlignment.center,
                                          children: [
                                            Text(
                                              '${block.startTime} — ${block.endTime}',
                                              style: TextStyle(
                                                fontSize: 11.5,
                                                fontWeight: FontWeight.w800,
                                                color: catColor,
                                              ),
                                            ),
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                horizontal: 7,
                                                vertical: 2,
                                              ),
                                              decoration: BoxDecoration(
                                                color: AppColors
                                                    .surfaceContainerLow,
                                                borderRadius:
                                                    BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                '${block.durationMinutes} mnt • $catName',
                                                style: const TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w700,
                                                  color: AppColors
                                                      .onSurfaceVariant,
                                                ),
                                              ),
                                            ),
                                            if (block.crossesMidnight)
                                              Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                  horizontal: 7,
                                                  vertical: 2,
                                                ),
                                                decoration: BoxDecoration(
                                                  color: AppColors.tertiaryFixed,
                                                  borderRadius:
                                                      BorderRadius.circular(6),
                                                ),
                                                child: const Text(
                                                  '🌙 Lintas Hari',
                                                  style: TextStyle(
                                                    fontSize: 9.5,
                                                    fontWeight: FontWeight.w800,
                                                    color: AppColors.tertiary,
                                                  ),
                                                ),
                                              ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          block.title,
                                          style: theme.textTheme.titleMedium
                                              ?.copyWith(
                                            fontWeight: FontWeight.w800,
                                            color: AppColors.onSurface,
                                          ),
                                        ),
                                        if (block.description != null &&
                                            block.description!.isNotEmpty) ...[
                                          const SizedBox(height: 3),
                                          Text(
                                            block.description!,
                                            style: theme.textTheme.bodySmall
                                                ?.copyWith(
                                              color:
                                                  AppColors.onSurfaceVariant,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.only(top: 10),
                                decoration: BoxDecoration(
                                  border: Border(
                                    top: BorderSide(
                                      color: AppColors.outlineVariant
                                          .withValues(alpha: 0.25),
                                    ),
                                  ),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    _buildActionChip(
                                      icon: Icons.edit_outlined,
                                      label: 'Ubah',
                                      color: AppColors.onSurfaceVariant,
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
                                    ),
                                    if (block.durationMinutes >= 30) ...[
                                      const SizedBox(width: 8),
                                      _buildActionChip(
                                        icon: Icons.call_split_rounded,
                                        label: 'Bagi 2',
                                        color: AppColors.primary,
                                        onTap: () => _handleSplit(block),
                                      ),
                                    ],
                                    const SizedBox(width: 8),
                                    _buildActionChip(
                                      icon: Icons.delete_outline_rounded,
                                      label: 'Hapus',
                                      color: AppColors.error,
                                      onTap: () => _handleDelete(block),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),

                const SizedBox(height: 8),

                // Bottom Full-Width CTA Pill Button (Stitch Design)
                SizedBox(
                  height: 54,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      showModalBottomSheet(
                        context: context,
                        isScrollControlled: true,
                        backgroundColor: Colors.transparent,
                        builder: (_) => AddScheduleSheet(date: selectedDate),
                      );
                    },
                    icon: const Icon(Icons.add_circle_outline_rounded),
                    label: const Text('Tambah Blok Aktivitas'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildActionChip({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerLow,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
