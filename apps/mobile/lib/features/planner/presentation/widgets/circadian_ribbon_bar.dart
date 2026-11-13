import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../app/theme/app_colors.dart';
import '../../../../shared/models/schedule_block_model.dart';
import '../add_schedule_sheet.dart';

class RibbonInterval {
  final String id;
  final bool isFree;
  final int startMin;
  final int endMin;
  final ScheduleBlockModel? block;

  const RibbonInterval({
    required this.id,
    required this.isFree,
    required this.startMin,
    required this.endMin,
    this.block,
  });

  int get durationMin => (endMin - startMin).clamp(0, 1440);
}

class CircadianRibbonBar extends StatelessWidget {
  final List<ScheduleBlockModel> blocks;
  final String selectedDate;
  final VoidCallback? onScheduleChanged;

  const CircadianRibbonBar({
    super.key,
    required this.blocks,
    required this.selectedDate,
    this.onScheduleChanged,
  });

  String _formatMinutes(int minutes) {
    final norm = ((minutes % 1440) + 1440) % 1440;
    final h = (norm ~/ 60).toString().padLeft(2, '0');
    final m = (norm % 60).toString().padLeft(2, '0');
    return '$h:$m';
  }

  List<RibbonInterval> _buildIntervals() {
    final List<Map<String, dynamic>> rawList = [];

    for (final block in blocks) {
      if (block.crossesMidnight) {
        final rawEnd = block.endMinutes - 1440;
        if (block.startMinutes < 1440) {
          rawList.add({
            'start': block.startMinutes,
            'end': 1440,
            'block': block,
          });
        }
        if (rawEnd > 0) {
          rawList.add({
            'start': 0,
            'end': rawEnd,
            'block': block,
          });
        }
      } else {
        rawList.add({
          'start': block.startMinutes,
          'end': block.endMinutes,
          'block': block,
        });
      }
    }

    rawList.sort((a, b) => (a['start'] as int).compareTo(b['start'] as int));

    final List<RibbonInterval> result = [];
    int cursor = 0;

    for (final item in rawList) {
      final s = item['start'] as int;
      final e = item['end'] as int;
      final b = item['block'] as ScheduleBlockModel;

      if (s > cursor) {
        result.add(RibbonInterval(
          id: 'free_${cursor}_$s',
          isFree: true,
          startMin: cursor,
          endMin: s,
        ));
      }

      final span = e - s;
      if (span > 0) {
        result.add(RibbonInterval(
          id: 'blk_${b.id}_$s',
          isFree: false,
          startMin: s,
          endMin: e,
          block: b,
        ));
      }
      cursor = cursor > e ? cursor : e;
    }

    if (cursor < 1440) {
      result.add(RibbonInterval(
        id: 'free_${cursor}_1440',
        isFree: true,
        startMin: cursor,
        endMin: 1440,
      ));
    }

    return result;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final intervals = _buildIntervals();

    final now = DateTime.now();
    final todayStr = DateFormat('yyyy-MM-dd').format(now);
    final isToday = selectedDate == todayStr;
    final nowMinutes = now.hour * 60 + now.minute;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(28),
        boxShadow: AppColors.bentoShadow,
        border: Border.all(
          color: AppColors.outlineVariant.withValues(alpha: 0.25),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: AppColors.secondaryFixed.withValues(alpha: 0.45),
                      borderRadius: BorderRadius.circular(11),
                    ),
                    child: const Icon(
                      Icons.timelapse_rounded,
                      size: 18,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Pita Sirkadian 24 Jam',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: AppColors.onSurface,
                        ),
                      ),
                      const Text(
                        'Ketuk celah kosong untuk isi jadwal',
                        style: TextStyle(
                          fontSize: 10.5,
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              if (isToday)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.secondaryFixed,
                        ),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        '${_formatMinutes(nowMinutes)} Sekarang',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),

          // Ribbon Bar inside a padded rounded track
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerLow,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: SizedBox(
                    height: 34,
                    child: Row(
                      children: intervals.map((interval) {
                        final flex = interval.durationMin.clamp(1, 1440);

                        if (interval.isFree) {
                          return Expanded(
                            flex: flex,
                            child: InkWell(
                              onTap: () {
                                final startStr =
                                    _formatMinutes(interval.startMin);
                                final endStr = interval.endMin == 1440
                                    ? '00:00'
                                    : _formatMinutes(interval.endMin);
                                showModalBottomSheet(
                                  context: context,
                                  isScrollControlled: true,
                                  backgroundColor: Colors.transparent,
                                  builder: (_) => AddScheduleSheet(
                                    date: selectedDate,
                                    prefillStartTime: startStr,
                                    prefillEndTime: endStr,
                                  ),
                                ).then((_) => onScheduleChanged?.call());
                              },
                              child: Container(
                                color: AppColors.surfaceContainerLow,
                                child: Center(
                                  child: interval.durationMin >= 120
                                      ? Text(
                                          'Luang ${(interval.durationMin / 60).toStringAsFixed(0)}j',
                                          style: TextStyle(
                                            fontSize: 9.5,
                                            fontWeight: FontWeight.w700,
                                            color: AppColors.outline
                                                .withValues(alpha: 0.7),
                                          ),
                                        )
                                      : null,
                                ),
                              ),
                            ),
                          );
                        }

                        final catColor =
                            interval.block?.category?.color ?? AppColors.primary;
                        return Expanded(
                          flex: flex,
                          child: InkWell(
                            onTap: () {
                              if (interval.block != null) {
                                showModalBottomSheet(
                                  context: context,
                                  isScrollControlled: true,
                                  backgroundColor: Colors.transparent,
                                  builder: (_) => AddScheduleSheet(
                                    date: selectedDate,
                                    initialBlock: interval.block,
                                  ),
                                ).then((_) => onScheduleChanged?.call());
                              }
                            },
                            child: Container(
                              decoration: BoxDecoration(
                                color: catColor,
                                border: Border(
                                  right: BorderSide(
                                    color: Colors.white.withValues(alpha: 0.35),
                                    width: 1.2,
                                  ),
                                ),
                              ),
                              child: Center(
                                child: interval.durationMin >= 75
                                    ? Padding(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 3,
                                        ),
                                        child: Text(
                                          interval.block?.title ?? '',
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            fontSize: 9.5,
                                            fontWeight: FontWeight.w800,
                                            color: Colors.white,
                                          ),
                                        ),
                                      )
                                    : null,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ),

                // Live Time Marker Pin
                if (isToday)
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final markerLeft =
                          (nowMinutes / 1440.0) * constraints.maxWidth;
                      return Positioned(
                        left: markerLeft.clamp(0.0, constraints.maxWidth - 3),
                        top: -5,
                        bottom: -5,
                        child: Container(
                          width: 3.5,
                          decoration: BoxDecoration(
                            color: AppColors.onSurface,
                            borderRadius: BorderRadius.circular(99),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.25),
                                blurRadius: 4,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Hour Ticks
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '00:00',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.outline,
                  ),
                ),
                Text(
                  '06:00',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.outline,
                  ),
                ),
                Text(
                  '12:00',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.outline,
                  ),
                ),
                Text(
                  '18:00',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.outline,
                  ),
                ),
                Text(
                  '24:00',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.outline,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
