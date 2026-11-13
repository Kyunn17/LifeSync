import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../app/theme/app_colors.dart';
import '../../../../shared/widgets/custom_button.dart';
import '../../../../shared/widgets/status_banner.dart';
import '../../../insights/providers/insights_provider.dart';
import '../../../wellness/providers/wellness_provider.dart';
import '../../providers/dashboard_provider.dart';

class QuickExerciseSheet extends ConsumerStatefulWidget {
  final String date;
  final int currentExerciseMinutes;
  final int currentSteps;
  final int goalMinutes;

  const QuickExerciseSheet({
    super.key,
    required this.date,
    required this.currentExerciseMinutes,
    required this.currentSteps,
    required this.goalMinutes,
  });

  @override
  ConsumerState<QuickExerciseSheet> createState() => _QuickExerciseSheetState();
}

class _QuickExerciseSheetState extends ConsumerState<QuickExerciseSheet> {
  late double _exerciseMinutes;
  late int _steps;
  bool _isLoading = false;
  String? _errorMessage;

  final List<int> _quickMinutes = [15, 30, 45, 60, 90];

  @override
  void initState() {
    super.initState();
    _exerciseMinutes = widget.currentExerciseMinutes.toDouble().clamp(0.0, 300.0);
    _steps = widget.currentSteps;
  }

  Future<void> _handleSave() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final currentLog = await ref.read(wellnessRepositoryProvider).getHealthLog(widget.date);

      await ref.read(wellnessRepositoryProvider).upsertHealthLog(
            date: widget.date,
            sleepDurationMinutes: currentLog?.sleepDurationMinutes ?? 0,
            sleepQuality: currentLog?.sleepQuality ?? 85,
            exerciseDurationMinutes: _exerciseMinutes.round(),
            dailySteps: _steps,
            waterIntakeMl: currentLog?.waterIntakeMl ?? 0,
            mood: currentLog?.mood ?? 'Calm',
            energyLevel: currentLog?.energyLevel ?? 75,
            notes: currentLog?.notes,
          );

      ref.invalidate(dailyAnalyticsProvider);
      ref.invalidate(todayHealthLogProvider);
      ref.invalidate(weeklyAnalyticsProvider);

      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Gagal menyimpan: ${e.toString().replaceAll('ServerFailure: ', '')}';
        });
      }
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
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.directions_run_rounded, size: 20, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Atur Aktivitas Fisik',
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    'Target harian: ${widget.goalMinutes} menit',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Duration Slider & Display
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Durasi Olahraga', style: TextStyle(fontWeight: FontWeight.w600)),
              Text(
                '${_exerciseMinutes.round()} Menit',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          Slider(
            value: _exerciseMinutes,
            min: 0,
            max: 180,
            divisions: 36,
            activeColor: AppColors.primary,
            label: '${_exerciseMinutes.round()}m',
            onChanged: (val) => setState(() => _exerciseMinutes = val),
          ),

          // Quick Presets
          Wrap(
            spacing: 8,
            children: _quickMinutes.map((m) {
              final isSel = _exerciseMinutes.round() == m;
              return ChoiceChip(
                label: Text('${m}m'),
                selected: isSel,
                selectedColor: AppColors.primary.withValues(alpha: 0.2),
                labelStyle: TextStyle(
                  color: isSel ? AppColors.primary : AppColors.onSurface,
                  fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                ),
                onSelected: (_) => setState(() => _exerciseMinutes = m.toDouble()),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),

          // Steps Counter
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Jumlah Langkah Kaki', style: TextStyle(fontWeight: FontWeight.w600)),
              Text(
                '$_steps Langkah',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _steps = (_steps - 1000).clamp(0, 50000)),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('-1,000'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _steps += 1000),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('+1,000'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _steps += 3000),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('+3,000'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          if (_errorMessage != null) ...[
            StatusBanner(message: _errorMessage!, type: BannerType.error),
            const SizedBox(height: 12),
          ],

          CustomButton(
            text: 'Simpan Aktivitas Fisik',
            isLoading: _isLoading,
            onPressed: _handleSave,
          ),
        ],
      ),
    );
  }
}

