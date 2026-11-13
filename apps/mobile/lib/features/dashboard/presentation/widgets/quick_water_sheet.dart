import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../app/theme/app_colors.dart';
import '../../../../shared/widgets/custom_button.dart';
import '../../../../shared/widgets/status_banner.dart';
import '../../../insights/providers/insights_provider.dart';
import '../../../wellness/providers/wellness_provider.dart';
import '../../providers/dashboard_provider.dart';

class QuickWaterSheet extends ConsumerStatefulWidget {
  final String date;
  final int currentMl;
  final int goalMl;

  const QuickWaterSheet({
    super.key,
    required this.date,
    required this.currentMl,
    required this.goalMl,
  });

  @override
  ConsumerState<QuickWaterSheet> createState() => _QuickWaterSheetState();
}

class _QuickWaterSheetState extends ConsumerState<QuickWaterSheet> {
  late double _totalWaterMl;
  bool _isLoading = false;
  String? _errorMessage;

  final List<int> _quickPresets = [500, 1000, 1500, 2000, 2500, 3000];

  @override
  void initState() {
    super.initState();
    _totalWaterMl = widget.currentMl.toDouble().clamp(0.0, 6000.0);
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
            exerciseDurationMinutes: currentLog?.exerciseDurationMinutes ?? 0,
            dailySteps: currentLog?.dailySteps ?? 0,
            waterIntakeMl: _totalWaterMl.round(),
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

  void _addDelta(int delta) {
    setState(() {
      _totalWaterMl = (_totalWaterMl + delta).clamp(0.0, 6000.0);
    });
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
                  color: Colors.blue.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.water_drop_rounded, size: 20, color: Colors.blueAccent),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Atur Asupan Air Minum',
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    'Target harian: ${widget.goalMl} ml',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Total Display & Slider
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total Asupan Air', style: TextStyle(fontWeight: FontWeight.w600)),
              Text(
                '${_totalWaterMl.round()} ml',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Colors.blueAccent,
                ),
              ),
            ],
          ),
          Slider(
            value: _totalWaterMl,
            min: 0,
            max: 4000,
            divisions: 40,
            activeColor: Colors.blueAccent,
            label: '${_totalWaterMl.round()} ml',
            onChanged: (val) => setState(() => _totalWaterMl = val),
          ),

          // Quick Delta Buttons (+250ml, +500ml)
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _addDelta(250),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('+250 ml (1 Gelas)'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _addDelta(500),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('+500 ml (1 Botol)'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Presets
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _quickPresets.map((ml) {
              final isSel = _totalWaterMl.round() == ml;
              return ChoiceChip(
                label: Text('${ml}ml'),
                selected: isSel,
                selectedColor: Colors.blueAccent.withValues(alpha: 0.2),
                labelStyle: TextStyle(
                  color: isSel ? Colors.blueAccent : AppColors.onSurface,
                  fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                ),
                onSelected: (_) => setState(() => _totalWaterMl = ml.toDouble()),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),

          if (_errorMessage != null) ...[
            StatusBanner(message: _errorMessage!, type: BannerType.error),
            const SizedBox(height: 12),
          ],

          CustomButton(
            text: 'Simpan Asupan Air',
            isLoading: _isLoading,
            onPressed: _handleSave,
          ),
        ],
      ),
    );
  }
}
