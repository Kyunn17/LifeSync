import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../app/theme/app_colors.dart';
import '../../../../shared/widgets/custom_button.dart';
import '../../../wellness/providers/wellness_provider.dart';
import '../../providers/dashboard_provider.dart';

class QuickSleepSheet extends ConsumerStatefulWidget {
  final String date;
  final int currentMinutes;
  final int currentQuality;

  const QuickSleepSheet({
    super.key,
    required this.date,
    required this.currentMinutes,
    required this.currentQuality,
  });

  @override
  ConsumerState<QuickSleepSheet> createState() => _QuickSleepSheetState();
}

class _QuickSleepSheetState extends ConsumerState<QuickSleepSheet> {
  late double _sleepHours;
  late double _sleepQuality;
  bool _isLoading = false;

  final List<double> _presets = [5.5, 6.0, 7.0, 7.5, 8.0, 8.5, 9.0];

  @override
  void initState() {
    super.initState();
    _sleepHours = (widget.currentMinutes / 60.0).clamp(0.0, 14.0);
    if (_sleepHours == 0.0) _sleepHours = 7.5; // Default recommendation
    _sleepQuality = widget.currentQuality.toDouble().clamp(10.0, 100.0);
  }

  Future<void> _handleSave() async {
    setState(() => _isLoading = true);
    try {
      final currentLog = await ref.read(wellnessRepositoryProvider).getHealthLog(widget.date);

      await ref.read(wellnessRepositoryProvider).upsertHealthLog(
            date: widget.date,
            sleepDurationMinutes: (_sleepHours * 60).round(),
            sleepQuality: _sleepQuality.toInt(),
            exerciseDurationMinutes: currentLog?.exerciseDurationMinutes ?? 0,
            dailySteps: currentLog?.dailySteps ?? 0,
            waterIntakeMl: currentLog?.waterIntakeMl ?? 0,
            mood: currentLog?.mood ?? 'Calm',
            energyLevel: currentLog?.energyLevel ?? 75,
            notes: currentLog?.notes,
          );

      ref.invalidate(dailyAnalyticsProvider);
      ref.invalidate(todayHealthLogProvider);

      if (mounted) Navigator.pop(context, true);
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

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
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.secondaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.bedtime_rounded, size: 20, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Text(
                'Atur Catatan Tidur',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Duration Slider & Display
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Durasi Tidur', style: TextStyle(fontWeight: FontWeight.w600)),
              Text(
                '${_sleepHours.toStringAsFixed(1)} Jam',
                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 18),
              ),
            ],
          ),
          Slider(
            value: _sleepHours,
            min: 0,
            max: 14,
            divisions: 28,
            activeColor: AppColors.primary,
            label: '${_sleepHours.toStringAsFixed(1)}j',
            onChanged: (val) => setState(() => _sleepHours = val),
          ),

          // Presets
          Wrap(
            spacing: 8,
            children: _presets.map((hrs) {
              final isSel = (_sleepHours - hrs).abs() < 0.1;
              return ChoiceChip(
                label: Text('${hrs}j'),
                selected: isSel,
                selectedColor: AppColors.primary.withValues(alpha: 0.2),
                labelStyle: TextStyle(
                  color: isSel ? AppColors.primary : AppColors.onSurface,
                  fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                ),
                onSelected: (_) => setState(() => _sleepHours = hrs),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),

          // Quality Slider
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Kualitas Tidur', style: TextStyle(fontWeight: FontWeight.w600)),
              Text(
                '${_sleepQuality.toInt()}%',
                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 16),
              ),
            ],
          ),
          Slider(
            value: _sleepQuality,
            min: 10,
            max: 100,
            divisions: 18,
            activeColor: AppColors.primaryLight,
            label: '${_sleepQuality.toInt()}%',
            onChanged: (val) => setState(() => _sleepQuality = val),
          ),
          const SizedBox(height: 20),

          CustomButton(
            text: 'Simpan Catatan Tidur',
            isLoading: _isLoading,
            onPressed: _handleSave,
          ),
        ],
      ),
    );
  }
}
