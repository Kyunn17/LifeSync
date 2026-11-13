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
    final theme = Theme.of(context);
    final selectedDate = ref.watch(selectedDateProvider);
    final healthLogAsync = ref.watch(todayHealthLogProvider);
    final stepState = ref.watch(stepCounterProvider);
    final pushupStats = ref.watch(pushupStatsProvider);
    final nutrition = ref.watch(dailyNutritionProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        toolbarHeight: 68,
        titleSpacing: 20,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'JURNAL BIOMETRIK HARIAN',
              style: TextStyle(
                fontSize: 9.5,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.0,
                color: AppColors.primary,
              ),
            ),
            Text(
              'Catatan Wellness',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
                color: AppColors.onSurface,
              ),
            ),
          ],
        ),
      ),
      body: healthLogAsync.when(
        loading: () => const LoadingIndicator(
          message: 'Memuat catatan kebugaran...',
        ),
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
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_statusMessage != null) ...[
                  StatusBanner(
                    message: _statusMessage!,
                    type: BannerType.success,
                  ),
                  const SizedBox(height: 16),
                ],

                // 1. Sleep Section Bento Card
                _buildCard(
                  context,
                  title: 'Tidur & Pemulihan Sel',
                  subtitle: 'Durasi & efisiensi istirahat malam',
                  icon: Icons.bedtime_rounded,
                  iconColor: AppColors.tertiary,
                  iconBg: AppColors.tertiaryFixed,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildValueHeader(
                        'Durasi Tidur Semalam',
                        '${_sleepHours.toStringAsFixed(1)} Jam',
                        AppColors.tertiary,
                      ),
                      Slider(
                        value: _sleepHours,
                        min: 0,
                        max: 14,
                        divisions: 28,
                        activeColor: AppColors.tertiary,
                        onChanged: (val) => setState(() => _sleepHours = val),
                      ),
                      const SizedBox(height: 8),
                      _buildValueHeader(
                        'Kualitas Tidur',
                        '${_sleepQuality.toInt()}%',
                        AppColors.primary,
                      ),
                      Slider(
                        value: _sleepQuality,
                        min: 10,
                        max: 100,
                        divisions: 18,
                        activeColor: AppColors.primaryContainer,
                        onChanged: (val) => setState(() => _sleepQuality = val),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 2. Physical Activity & AI Push-Up Bento Card
                _buildCard(
                  context,
                  title: 'Aktivitas Fisik & Sensor',
                  subtitle: 'Latihan harian, pedometer, & AI Push-Up',
                  icon: Icons.directions_run_rounded,
                  iconColor: AppColors.primary,
                  iconBg: AppColors.secondaryFixed.withValues(alpha: 0.5),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildValueHeader(
                        'Durasi Olahraga',
                        '$_exerciseMinutes Menit',
                        AppColors.primary,
                      ),
                      Slider(
                        value: _exerciseMinutes.toDouble(),
                        min: 0,
                        max: 180,
                        divisions: 36,
                        activeColor: AppColors.primary,
                        onChanged: (val) =>
                            setState(() => _exerciseMinutes = val.toInt()),
                      ),
                      const SizedBox(height: 8),
                      _buildValueHeader(
                        'Langkah Harian',
                        '$_dailySteps langkah',
                        AppColors.primaryContainer,
                      ),
                      Slider(
                        value: _dailySteps.toDouble().clamp(0.0, 30000.0),
                        min: 0,
                        max: 30000,
                        divisions: 60,
                        activeColor: AppColors.primaryContainer,
                        onChanged: (val) =>
                            setState(() => _dailySteps = val.toInt()),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                if (!stepState.hasPermission) {
                                  await ref
                                      .read(stepCounterProvider.notifier)
                                      .requestPermissionAndStart();
                                } else {
                                  setState(() {
                                    if (stepState.todaySteps > _dailySteps) {
                                      _dailySteps = stepState.todaySteps;
                                    }
                                  });
                                }
                              },
                              icon: const Icon(Icons.sensors_rounded, size: 16),
                              label: Text(
                                stepState.hasPermission
                                    ? 'Sensor: ${stepState.todaySteps} lkg'
                                    : 'Aktifkan Sensor',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: () => context.push('/pushup-counter'),
                              style: FilledButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                padding: const EdgeInsets.symmetric(
                                  vertical: 13,
                                ),
                              ),
                              icon: const Icon(
                                Icons.videocam_rounded,
                                size: 16,
                              ),
                              label: Text(
                                'Push-Up (${pushupStats.currentStreak}🔥)',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 3. Nutrition & Calorie Bento Card
                _buildCard(
                  context,
                  title: 'Nutrisi & Kalori Harian',
                  subtitle: 'Katalog Nusantara & Open Food Facts',
                  icon: Icons.restaurant_rounded,
                  iconColor: const Color(0xFFD97706),
                  iconBg: const Color(0xFFFEF3C7),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildValueHeader(
                        'Asupan Kalori Tercatat',
                        '${nutrition.consumedCalories.round()} / ${nutrition.targetCalories} kkal',
                        const Color(0xFFD97706),
                      ),
                      const SizedBox(height: 10),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(99),
                        child: LinearProgressIndicator(
                          value: nutrition.calorieProgress.clamp(0.0, 1.0),
                          minHeight: 7,
                          backgroundColor: AppColors.surfaceContainerLow,
                          valueColor: const AlwaysStoppedAnimation<Color>(
                            Color(0xFFF59E0B),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () => context.push('/calorie-tracker'),
                          icon: const Icon(
                            Icons.add_circle_outline_rounded,
                            size: 18,
                          ),
                          label: const Text('Buka Pelacak Kalori & Makanan'),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 4. Mood & Energy Bento Card
                _buildCard(
                  context,
                  title: 'Mood & Tingkat Energi',
                  subtitle: 'Keseimbangan emosional & vitalitas',
                  icon: Icons.sentiment_very_satisfied_rounded,
                  iconColor: AppColors.primary,
                  iconBg: AppColors.secondaryFixed.withValues(alpha: 0.45),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Pilih Kondisi Mood Saat Ini:',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: kMoodTypes.map((mood) {
                          final isSelected = _selectedMood == mood;
                          return ChoiceChip(
                            label: Text(mood),
                            selected: isSelected,
                            selectedColor:
                                AppColors.secondaryFixed.withValues(alpha: 0.6),
                            side: BorderSide(
                              color: isSelected
                                  ? AppColors.primary
                                  : AppColors.outlineVariant
                                      .withValues(alpha: 0.35),
                            ),
                            labelStyle: TextStyle(
                              color: isSelected
                                  ? AppColors.primary
                                  : AppColors.onSurface,
                              fontWeight: isSelected
                                  ? FontWeight.w800
                                  : FontWeight.w600,
                              fontSize: 12,
                            ),
                            onSelected: (val) {
                              if (val) setState(() => _selectedMood = mood);
                            },
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 16),
                      _buildValueHeader(
                        'Tingkat Energi Tubuh',
                        '${_energyLevel.toInt()}%',
                        AppColors.primary,
                      ),
                      Slider(
                        value: _energyLevel,
                        min: 10,
                        max: 100,
                        divisions: 18,
                        activeColor: AppColors.primaryContainer,
                        onChanged: (val) => setState(() => _energyLevel = val),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                CustomButton(
                  text: 'Simpan Catatan Hari Ini',
                  isLoading: _isSaving,
                  icon: Icons.check_circle_outline_rounded,
                  onPressed: () async {
                    setState(() => _isSaving = true);
                    try {
                      await ref
                          .read(wellnessRepositoryProvider)
                          .upsertHealthLog(
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
                        _statusMessage =
                            'Catatan kebugaran berhasil disimpan!';
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

  Widget _buildValueHeader(String label, String value, Color accentColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.onSurfaceVariant,
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.surfaceContainerLow,
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            value,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              color: accentColor,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required Widget child,
  }) {
    final theme = Theme.of(context);

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
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, size: 20, color: iconColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 11.5,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}
