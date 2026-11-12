import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/theme/app_colors.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../../shared/widgets/status_banner.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../providers/wellness_provider.dart';

const List<String> kMoodTypes = [
  'Peaceful',
  'Motivated',
  'Calm',
  'Focused',
  'Vibrant',
  'Steady',
  'Fatigued',
  'Restless',
];

class WellnessScreen extends ConsumerStatefulWidget {
  const WellnessScreen({super.key});

  @override
  ConsumerState<WellnessScreen> createState() => _WellnessScreenState();
}

class _WellnessScreenState extends ConsumerState<WellnessScreen> {
  double _sleepHours = 7.5;
  double _sleepQuality = 85;
  int _exerciseMinutes = 30;
  int _dailySteps = 6000;
  String _selectedMood = 'Calm';
  double _energyLevel = 75;
  bool _isSaving = false;
  String? _statusMessage;
  bool _initialized = false;

  @override
  Widget build(BuildContext context) {
    final selectedDate = ref.watch(selectedDateProvider);
    final healthLogAsync = ref.watch(todayHealthLogProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Catatan Wellness'),
      ),
      body: healthLogAsync.when(
        loading: () => const LoadingIndicator(message: 'Memuat catatan kebugaran...'),
        error: (err, _) => Center(child: Text('Gagal memuat: $err')),
        data: (log) {
          if (!_initialized && log != null) {
            _sleepHours = (log.sleepDurationMinutes / 60.0).clamp(0.0, 16.0);
            _sleepQuality = (log.sleepQuality ?? 85).toDouble();
            _exerciseMinutes = log.exerciseDurationMinutes;
            _dailySteps = log.dailySteps;
            _selectedMood = log.mood;
            _energyLevel = log.energyLevel.toDouble();
            _initialized = true;
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_statusMessage != null) ...[
                  StatusBanner(message: _statusMessage!, type: BannerType.success),
                  const SizedBox(height: 16),
                ],

                // 1. Sleep Section Card
                _buildCard(
                  context,
                  title: 'Tidur & Istirahat',
                  icon: Icons.bedtime_outlined,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Durasi Tidur Semalam'),
                          Text(
                            '${_sleepHours.toStringAsFixed(1)} Jam',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                          ),
                        ],
                      ),
                      Slider(
                        value: _sleepHours,
                        min: 0,
                        max: 14,
                        divisions: 28,
                        activeColor: AppColors.primary,
                        onChanged: (val) => setState(() => _sleepHours = val),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Kualitas Tidur'),
                          Text(
                            '${_sleepQuality.toInt()}%',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                          ),
                        ],
                      ),
                      Slider(
                        value: _sleepQuality,
                        min: 10,
                        max: 100,
                        divisions: 18,
                        activeColor: AppColors.primaryLight,
                        onChanged: (val) => setState(() => _sleepQuality = val),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 2. Physical Activity Card
                _buildCard(
                  context,
                  title: 'Aktivitas Fisik & Langkah',
                  icon: Icons.directions_run_rounded,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Durasi Olahraga'),
                          Text(
                            '$_exerciseMinutes Menit',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                          ),
                        ],
                      ),
                      Slider(
                        value: _exerciseMinutes.toDouble(),
                        min: 0,
                        max: 180,
                        divisions: 36,
                        activeColor: AppColors.primary,
                        onChanged: (val) => setState(() => _exerciseMinutes = val.toInt()),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Langkah Harian'),
                          Text(
                            '$_dailySteps langkah',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                          ),
                        ],
                      ),
                      Slider(
                        value: _dailySteps.toDouble(),
                        min: 0,
                        max: 30000,
                        divisions: 60,
                        activeColor: AppColors.primaryDark,
                        onChanged: (val) => setState(() => _dailySteps = val.toInt()),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 3. Mood & Energy Card
                _buildCard(
                  context,
                  title: 'Mood & Tingkat Energi',
                  icon: Icons.mood_rounded,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Kondisi Mood Saat Ini:', style: TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: kMoodTypes.map((mood) {
                          final isSelected = _selectedMood == mood;
                          return ChoiceChip(
                            label: Text(mood),
                            selected: isSelected,
                            selectedColor: AppColors.secondaryContainer,
                            labelStyle: TextStyle(
                              color: isSelected ? AppColors.primaryDark : AppColors.onSurface,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            ),
                            onSelected: (val) {
                              if (val) setState(() => _selectedMood = mood);
                            },
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Tingkat Energi'),
                          Text(
                            '${_energyLevel.toInt()}%',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                          ),
                        ],
                      ),
                      Slider(
                        value: _energyLevel,
                        min: 10,
                        max: 100,
                        divisions: 18,
                        activeColor: AppColors.secondary,
                        onChanged: (val) => setState(() => _energyLevel = val),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                CustomButton(
                  text: 'Simpan Catatan Hari Ini',
                  isLoading: _isSaving,
                  icon: Icons.check_circle_outline,
                  onPressed: () async {
                    setState(() => _isSaving = true);
                    try {
                      await ref.read(wellnessRepositoryProvider).upsertHealthLog(
                            date: selectedDate,
                            sleepDurationMinutes: (_sleepHours * 60).round(),
                            sleepQuality: _sleepQuality.toInt(),
                            exerciseDurationMinutes: _exerciseMinutes,
                            dailySteps: _dailySteps,
                            mood: _selectedMood,
                            energyLevel: _energyLevel.toInt(),
                          );

                      ref.invalidate(todayHealthLogProvider);
                      ref.invalidate(dailyAnalyticsProvider);

                      setState(() {
                        _isSaving = false;
                        _statusMessage = 'Catatan kebugaran berhasil disimpan!';
                      });
                    } catch (e) {
                      setState(() {
                        _isSaving = false;
                        _statusMessage = 'Gagal menyimpan: $e';
                      });
                    }
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildCard(
    BuildContext context, {
    required String title,
    required IconData icon,
    required Widget child,
  }) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.surfaceContainerHigh),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                title,
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const Divider(height: 24, color: AppColors.surfaceContainerHigh),
          child,
        ],
      ),
    );
  }
}

