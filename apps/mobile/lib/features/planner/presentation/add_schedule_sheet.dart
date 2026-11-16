import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/theme/app_colors.dart';
import '../../../shared/models/schedule_block_model.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/status_banner.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../insights/providers/insights_provider.dart';
import '../providers/planner_provider.dart';

class AddScheduleSheet extends ConsumerStatefulWidget {
  final String date;
  final ScheduleBlockModel? initialBlock;
  final String? prefillStartTime;
  final String? prefillEndTime;

  const AddScheduleSheet({
    super.key,
    required this.date,
    this.initialBlock,
    this.prefillStartTime,
    this.prefillEndTime,
  });

  @override
  ConsumerState<AddScheduleSheet> createState() => _AddScheduleSheetState();
}

class _AddScheduleSheetState extends ConsumerState<AddScheduleSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _descController;

  late TimeOfDay _startTime;
  late TimeOfDay _endTime;
  String? _selectedCategoryId;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.initialBlock?.title ?? '');
    _descController = TextEditingController(text: widget.initialBlock?.description ?? '');
    _selectedCategoryId = widget.initialBlock?.activityId;

    _startTime = _parseTime(widget.initialBlock?.startTime ?? widget.prefillStartTime ?? '09:00');
    _endTime = _parseTime(widget.initialBlock?.endTime ?? widget.prefillEndTime ?? '10:30');
  }

  TimeOfDay _parseTime(String timeStr) {
    try {
      final parts = timeStr.split(':');
      final h = int.parse(parts[0]);
      final m = int.parse(parts[1]);
      return TimeOfDay(hour: h, minute: m);
    } catch (_) {
      return const TimeOfDay(hour: 9, minute: 0);
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  String _formatTimeOfDay(TimeOfDay t) {
    final h = t.hour.toString().padLeft(2, '0');
    final m = t.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  int _toMinutes(TimeOfDay t) => t.hour * 60 + t.minute;

  TimeOfDay _fromMinutes(int total) {
    final norm = ((total % 1440) + 1440) % 1440;
    return TimeOfDay(hour: norm ~/ 60, minute: norm % 60);
  }

  bool get _crossesMidnight {
    final s = _toMinutes(_startTime);
    final e = _toMinutes(_endTime);
    return e > 0 && e < s;
  }

  void _nudgeStartTime(int deltaMinutes) {
    setState(() {
      _startTime = _fromMinutes(_toMinutes(_startTime) + deltaMinutes);
    });
  }

  void _applyDuration(int durationMinutes) {
    setState(() {
      _endTime = _fromMinutes(_toMinutes(_startTime) + durationMinutes);
    });
  }

  Future<void> _pickTime({required bool isStart}) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? _startTime : _endTime,
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        if (isStart) {
          _startTime = picked;
        } else {
          _endTime = picked;
        }
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCategoryId == null) {
      setState(() {
        _errorMessage = 'Silakan pilih kategori aktivitas';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      if (widget.initialBlock != null) {
        await ref.read(plannerRepositoryProvider).updateSchedule(
              id: widget.initialBlock!.id,
              title: _titleController.text.trim(),
              activityId: _selectedCategoryId!,
              date: widget.date,
              startTime: _formatTimeOfDay(_startTime),
              endTime: _formatTimeOfDay(_endTime),
              description: _descController.text.trim(),
            );
      } else {
        await ref.read(plannerRepositoryProvider).createSchedule(
              title: _titleController.text.trim(),
              activityId: _selectedCategoryId!,
              date: widget.date,
              startTime: _formatTimeOfDay(_startTime),
              endTime: _formatTimeOfDay(_endTime),
              description: _descController.text.trim(),
            );
      }

      ref.invalidate(scheduleSummaryProvider);
      ref.invalidate(dailyAnalyticsProvider);
      ref.invalidate(weeklyAnalyticsProvider);

      if (mounted) {
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final categoriesAsync = ref.watch(categoriesProvider);
    final isEditing = widget.initialBlock != null;

    return Container(
      padding: EdgeInsets.only(
        top: 24,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.outlineVariant,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                isEditing ? 'Ubah Blok Jadwal' : 'Tambah Blok Jadwal',
                style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),

              if (_errorMessage != null) ...[
                StatusBanner(message: _errorMessage!, type: BannerType.error),
                const SizedBox(height: 16),
              ],

              CustomTextField(
                label: 'Nama Aktivitas',
                hint: 'Misal: Deep Work Sesi Pagi',
                controller: _titleController,
                validator: (val) => val == null || val.trim().isEmpty ? 'Nama aktivitas wajib diisi' : null,
              ),
              const SizedBox(height: 16),

              // Category Selector
              Text('Kategori', style: theme.textTheme.labelLarge),
              const SizedBox(height: 8),
              categoriesAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text('Gagal memuat kategori: $e'),
                data: (cats) {
                  if (_selectedCategoryId == null && cats.isNotEmpty) {
                    _selectedCategoryId = cats.first.id;
                  }

                  return SizedBox(
                    height: 42,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: cats.length,
                      separatorBuilder: (context, index) => const SizedBox(width: 8),
                      itemBuilder: (context, idx) {
                        final cat = cats[idx];
                        final isSelected = _selectedCategoryId == cat.id;

                        return ChoiceChip(
                          label: Text(cat.name),
                          selected: isSelected,
                          selectedColor: cat.color.withValues(alpha: 0.2),
                          side: BorderSide(
                            color: isSelected ? cat.color : AppColors.surfaceContainerHigh,
                            width: isSelected ? 1.5 : 1,
                          ),
                          labelStyle: TextStyle(
                            color: isSelected ? cat.color : AppColors.onSurface,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          ),
                          onSelected: (selected) {
                            if (selected) {
                              setState(() {
                                _selectedCategoryId = cat.id;
                              });
                            }
                          },
                        );
                      },
                    ),
                  );
                },
              ),
              const SizedBox(height: 18),

              // Time Range Pickers
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Mulai', style: theme.textTheme.labelLarge),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: () => _pickTime(isStart: true),
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceContainerLow,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.surfaceContainerHigh),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  _formatTimeOfDay(_startTime),
                                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                                ),
                                const Icon(Icons.access_time_rounded, size: 18, color: AppColors.primary),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Selesai', style: theme.textTheme.labelLarge),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: () => _pickTime(isStart: false),
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceContainerLow,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.surfaceContainerHigh),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  _formatTimeOfDay(_endTime),
                                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                                ),
                                const Icon(Icons.access_time_rounded, size: 18, color: AppColors.primary),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Quick Start-Time Shift Chips (ensures Start Time is never stuck to previous activity end)
              Text(
                'Geser Waktu Mulai (${_formatTimeOfDay(_startTime)})',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  (-30, '-30m'),
                  (-15, '-15m'),
                  (15, '+15m'),
                  (30, '+30m'),
                  (60, '+1j'),
                ].map((item) {
                  return ActionChip(
                    visualDensity: VisualDensity.compact,
                    backgroundColor: AppColors.surfaceContainerLow,
                    label: Text(
                      item.$2,
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    onPressed: () => _nudgeStartTime(item.$1),
                  );
                }).toList(),
              ),
              const SizedBox(height: 10),

              const Text(
                'Durasi Cepat',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  (30, '30 mnt'),
                  (60, '1 Jam'),
                  (120, '2 Jam'),
                  (240, '4 Jam'),
                  (480, '8 Jam Tidur'),
                ].map((item) {
                  return ActionChip(
                    visualDensity: VisualDensity.compact,
                    backgroundColor: AppColors.surfaceContainerLow,
                    label: Text(
                      item.$2,
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    onPressed: () => _applyDuration(item.$1),
                  );
                }).toList(),
              ),

              if (_crossesMidnight) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.tertiaryFixed,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.nights_stay_rounded,
                        size: 18,
                        color: AppColors.tertiary,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Lintas Tengah Malam: ${_formatTimeOfDay(_startTime)}–00:00 dicatat hari ini, dan 00:00–${_formatTimeOfDay(_endTime)} otomatis diteruskan ke hari berikutnya.',
                          style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.tertiary,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),

              CustomTextField(
                label: 'Catatan (Opsional)',
                hint: 'Deskripsi singkat...',
                controller: _descController,
                maxLines: 2,
              ),
              const SizedBox(height: 24),

              CustomButton(
                text: isEditing ? 'Simpan Perubahan' : 'Simpan ke Jadwal',
                isLoading: _isLoading,
                onPressed: _handleSubmit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
