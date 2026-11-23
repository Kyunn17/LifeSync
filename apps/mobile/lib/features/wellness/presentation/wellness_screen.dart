import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../../shared/widgets/status_banner.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../insights/providers/insights_provider.dart';
import '../../nutrition/providers/nutrition_provider.dart';
import '../../planner/providers/planner_provider.dart';
import '../providers/pushup_provider.dart';
import '../providers/step_counter_provider.dart';
import '../providers/wellness_provider.dart';
import 'widgets/weight_tracker_card.dart';

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
  double _sleepQuality = 85;
  int _dailySteps = 0;
  String _selectedMood = 'Calm';
  double _energyLevel = 75;
  bool _isSaving = false;
  String? _statusMessage;
  String? _lastSyncedDate;
  String? _lastSyncedHash;
  final TextEditingController _stepsController = TextEditingController(text: '0');

  @override
  void dispose() {
    _stepsController.dispose();
    super.dispose();
  }

  void _setDailySteps(int steps, {bool updateController = true}) {
    final clamped = steps.clamp(0, 200000);
    setState(() {
      _dailySteps = clamped;
      if (updateController) {
        final text = '$clamped';
        _stepsController.value = TextEditingValue(
          text: text,
          selection: TextSelection.collapsed(offset: text.length),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final selectedDate = ref.watch(selectedDateProvider);
    final healthLogAsync = ref.watch(todayHealthLogProvider);
    final scheduleAsync = ref.watch(scheduleSummaryProvider);
    final stepState = ref.watch(stepCounterProvider);
    final pushupStats = ref.watch(pushupStatsProvider);
    final nutrition = ref.watch(dailyNutritionProvider);
    final scheduledSleepMinutes =
        scheduleAsync.valueOrNull?.scheduledSleepMinutes ?? 0;
    final scheduledExerciseMinutes =
        scheduleAsync.valueOrNull?.scheduledExerciseMinutes ?? 0;

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
          final currentHash = log == null
              ? 'null'
              : '${log.date}_${log.sleepDurationMinutes}_${log.sleepQuality}_${log.exerciseDurationMinutes}_${log.dailySteps}_${log.mood}_${log.energyLevel}';
          if (_lastSyncedDate != selectedDate || _lastSyncedHash != currentHash) {
            _lastSyncedDate = selectedDate;
            _lastSyncedHash = currentHash;
            if (log != null) {
              _sleepQuality = (log.sleepQuality ?? 85).toDouble().clamp(10.0, 100.0);
              _dailySteps =
                  log.dailySteps > 0 ? log.dailySteps : stepState.todaySteps;
              _selectedMood = kMoodTypes.contains(log.mood) ? log.mood : 'Calm';
              _energyLevel = log.energyLevel.toDouble().clamp(10.0, 100.0);
            } else {
              _sleepQuality = 85;
              _dailySteps = stepState.todaySteps;
              _selectedMood = 'Calm';
              _energyLevel = 75;
            }
            final stepText = '$_dailySteps';
            _stepsController.value = TextEditingValue(
              text: stepText,
              selection: TextSelection.collapsed(offset: stepText.length),
            );
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

                // 0. Adaptive Weight Tracker & Weekly Diet Evaluation
                const WeightTrackerCard(),
                const SizedBox(height: 16),

                // 1. Sleep Section Bento Card
                _buildCard(
                  context,
                  title: 'Tidur & Pemulihan Sel',
                  subtitle: 'Durasi mengikuti Jadwal 24 Jam',
                  icon: Icons.bedtime_rounded,
                  iconColor: AppColors.tertiary,
                  iconBg: AppColors.tertiaryFixed,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildScheduleSyncedMetric(
                        label: 'Durasi Tidur (Jadwal 24 Jam)',
                        value:
                            '${(scheduledSleepMinutes / 60).toStringAsFixed(1)} Jam',
                        helperText:
                            'Mengikuti Jadwal 24 Jam ($scheduledSleepMinutes menit)',
                        accentColor: AppColors.tertiary,
                        onOpenPlanner: () => context.go('/planner'),
                      ),
                      const SizedBox(height: 14),
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
                  title: 'Aktivitas Fisik & Olahraga',
                  subtitle: 'Durasi dari Jadwal 24 Jam • Langkah & Push-Up',
                  icon: Icons.directions_run_rounded,
                  iconColor: AppColors.primary,
                  iconBg: AppColors.secondaryFixed.withValues(alpha: 0.5),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildScheduleSyncedMetric(
                        label: 'Durasi Olahraga (Jadwal 24 Jam)',
                        value: '$scheduledExerciseMinutes Menit',
                        helperText: 'Otomatis dari Jadwal 24 Jam',
                        accentColor: AppColors.primary,
                        onOpenPlanner: () => context.go('/planner'),
                      ),
                      const SizedBox(height: 14),
                      _buildValueHeader(
                        'Langkah Harian',
                        '$_dailySteps langkah',
                        AppColors.primaryContainer,
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _stepsController,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                        ],
                        decoration: InputDecoration(
                          isDense: true,
                          filled: true,
                          fillColor: AppColors.surfaceContainerLow,
                          hintText: 'Masukkan jumlah langkah',
                          suffixText: 'langkah',
                          prefixIcon: const Icon(
                            Icons.directions_walk_rounded,
                            size: 18,
                            color: AppColors.primaryContainer,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide.none,
                          ),
                        ),
                        onChanged: (value) {
                          final parsed = int.tryParse(value) ?? 0;
                          setState(() {
                            _dailySteps = parsed.clamp(0, 200000);
                          });
                        },
                      ),
                      Slider(
                        value: _dailySteps.toDouble().clamp(0.0, 30000.0),
                        min: 0,
                        max: 30000,
                        divisions: 60,
                        activeColor: AppColors.primaryContainer,
                        onChanged: (val) => _setDailySteps(val.toInt()),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerLow,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.fitness_center_rounded,
                              size: 18,
                              color: AppColors.primary,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Jumlah Push-Up Hari Ini',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.onSurfaceVariant,
                                    ),
                                  ),
                                  Text(
                                    'Streak ${pushupStats.currentStreak} hari • Total ${pushupStats.totalAllTimeReps} reps',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors.outline,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              '${pushupStats.todayReps} Reps',
                              style: const TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                if (!stepState.hasPermission) {
                                  final ok = await ref
                                      .read(stepCounterProvider.notifier)
                                      .requestPermissionAndStart();
                                  if (!ok && context.mounted) {
                                    final err = ref.read(stepCounterProvider).errorMessage;
                                    if (err != null) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text(err),
                                          backgroundColor: AppColors.error,
                                          behavior: SnackBarBehavior.floating,
                                        ),
                                      );
                                    }
                                  }
                                } else {
                                  if (stepState.todaySteps > _dailySteps) {
                                    _setDailySteps(stepState.todaySteps);
                                  }
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
                                'Push-Up (${pushupStats.todayReps}x)',
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
                            sleepDurationMinutes: scheduledSleepMinutes,
                            sleepQuality: _sleepQuality.toInt(),
                            exerciseDurationMinutes: scheduledExerciseMinutes,
                            dailySteps: _dailySteps,
                            waterIntakeMl: log?.waterIntakeMl ?? 0,
                            mood: _selectedMood,
                            energyLevel: _energyLevel.toInt(),
                            notes: log?.notes,
                          );

                      await ref
                          .read(stepCounterProvider.notifier)
                          .adoptExternalSteps(_dailySteps, date: selectedDate);

                      ref.invalidate(todayHealthLogProvider);
                      ref.invalidate(dailyAnalyticsProvider);
                      ref.invalidate(weeklyAnalyticsProvider);

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

  Widget _buildScheduleSyncedMetric({
    required String label,
    required String value,
    required String helperText,
    required Color accentColor,
    required VoidCallback onOpenPlanner,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildValueHeader(label, value, accentColor),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(
                Icons.lock_clock_rounded,
                size: 14,
                color: AppColors.outline,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  helperText,
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ),
              InkWell(
                onTap: onOpenPlanner,
                borderRadius: BorderRadius.circular(999),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  child: Text(
                    'Atur di Jadwal',
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      color: accentColor,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
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
