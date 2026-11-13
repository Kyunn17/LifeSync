import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../../shared/widgets/status_banner.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../nutrition/providers/nutrition_provider.dart';
import '../providers/pushup_provider.dart';
import '../providers/step_counter_provider.dart';
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
    final stepState = ref.watch(stepCounterProvider);
    final pushupStats = ref.watch(pushupStatsProvider);
    final nutrition = ref.watch(dailyNutritionProvider);

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
                        value: _dailySteps.toDouble().clamp(0.0, 30000.0),
                        min: 0,
                        max: 30000,
                        divisions: 60,
                        activeColor: AppColors.primaryDark,
                        onChanged: (val) => setState(() => _dailySteps = val.toInt()),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                if (!stepState.hasPermission) {
                                  await ref.read(stepCounterProvider.notifier).requestPermissionAndStart();
                                } else {
                                  setState(() {
                                    if (stepState.todaySteps > _dailySteps) {
                                      _dailySteps = stepState.todaySteps;
                                    }
                                  });
                                }
                              },
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: AppColors.primary),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              icon: const Icon(Icons.sensors_rounded, size: 16),
                              label: Text(
                                stepState.hasPermission
                                    ? 'Sensor: ${stepState.todaySteps} lkg'
                                    : 'Aktifkan Sensor',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: () => context.push('/pushup-counter'),
                              style: FilledButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              icon: const Icon(Icons.camera_alt_rounded, size: 16),
                              label: Text(
                                'Push-Up (${pushupStats.currentStreak}🔥)',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 2b. Nutrition & Calorie Card
                _buildCard(
                  context,
                  title: 'Nutrisi & Kalori Harian',
                  icon: Icons.restaurant_rounded,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Asupan Kalori Tercatat'),
                          Text(
                            '${nutrition.consumedCalories.round()} / ${nutrition.targetCalories} kkal',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: nutrition.calorieProgress,
                          minHeight: 6,
                          backgroundColor: AppColors.surfaceContainerLow,
                          valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                        ),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: () => context.push('/calorie-tracker'),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.primary),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          minimumSize: const Size.fromHeight(42),
                        ),
                        icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
                        label: const Text('Buka Pelacak Kalori & Makanan'),
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

