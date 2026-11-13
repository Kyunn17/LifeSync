import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../app/theme/app_colors.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../auth/providers/auth_provider.dart';
import '../../wellness/providers/pushup_provider.dart';
import '../../wellness/providers/step_counter_provider.dart';
import '../../wellness/providers/wellness_provider.dart';
import '../../nutrition/providers/nutrition_provider.dart';
import '../providers/dashboard_provider.dart';
import 'widgets/breathing_exercise_dialog.dart';
import 'widgets/circadian_ring_chart.dart';
import 'widgets/quick_checkin_sheet.dart';
import 'widgets/quick_exercise_sheet.dart';
import 'widgets/quick_sleep_sheet.dart';
import 'widgets/quick_water_sheet.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(authStateProvider).user;
    final selectedDate = ref.watch(selectedDateProvider);
    final analyticsAsync = ref.watch(dailyAnalyticsProvider);
    final stepState = ref.watch(stepCounterProvider);
    final pushupStats = ref.watch(pushupStatsProvider);
    final nutrition = ref.watch(dailyNutritionProvider);

    final displayDate = DateFormat('EEEE, d MMMM yyyy', 'id_ID').format(
      DateTime.tryParse(selectedDate) ?? DateTime.now(),
    );

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        toolbarHeight: 68,
        titleSpacing: 20,
        title: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.2),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Icon(
                Icons.spa_rounded,
                color: Colors.white,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Halo, ${user?.name ?? 'Sobat'} 👋',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface,
                      letterSpacing: -0.3,
                    ),
                  ),
                  Text(
                    displayDate,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                      fontSize: 11.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 6),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.secondaryFixed.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 7,
                  height: 7,
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 5),
                const Text(
                  'Optimum',
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Segarkan Data',
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.surface,
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.outlineVariant.withValues(alpha: 0.35),
                ),
              ),
              child: const Icon(
                Icons.sync_rounded,
                size: 18,
                color: AppColors.primary,
              ),
            ),
            onPressed: () => ref.invalidate(dailyAnalyticsProvider),
          ),
          const SizedBox(width: 10),
        ],
      ),
      body: analyticsAsync.when(
        loading: () => const LoadingIndicator(
          message: 'Menyelaraskan ritme sirkadian & biometrik Anda...',
        ),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.wifi_off_rounded,
                  size: 48,
                  color: AppColors.outline,
                ),
                const SizedBox(height: 16),
                Text(
                  'Gagal memuat data',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  err.toString(),
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.invalidate(dailyAnalyticsProvider),
                  child: const Text('Coba Lagi'),
                ),
              ],
            ),
          ),
        ),
        data: (data) {
          final wellness = data.wellness;
          final schedule = data.schedule;
          final goals = data.goals;

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(dailyAnalyticsProvider.future),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Skor Harmoni Bio-Ritme Hero Bento Card
                  _buildBalanceScoreCard(
                    context,
                    data.balanceScore,
                    schedule.allocatedPercentage,
                    wellness.energyLevel,
                  ),
                  const SizedBox(height: 16),

                  // 2. Ritme Sirkadian 24 Jam Donut Card
                  CircadianRingChart(schedule: schedule),
                  const SizedBox(height: 20),

                  // 3. Vitalitas Harian Cepat Section Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Vitalitas Harian Cepat',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: AppColors.onSurface,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerLow,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const Text(
                          'Ketuk kartu untuk atur ✏️',
                          style: TextStyle(
                            fontSize: 11,
                            color: AppColors.primary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // 4. Quick Vitals 2x2 Bento Grid (Row 1: Sleep & Water)
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            showModalBottomSheet(
                              context: context,
                              isScrollControlled: true,
                              backgroundColor: Colors.transparent,
                              builder: (_) => QuickSleepSheet(
                                date: selectedDate,
                                currentMinutes: wellness.sleepDurationMinutes,
                                currentQuality: wellness.sleepQuality ?? 85,
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(24),
                          child: _buildVitalCard(
                            context,
                            title: 'Tidur Semalam',
                            icon: Icons.bedtime_rounded,
                            accentColor: AppColors.tertiary,
                            badgeBg: AppColors.tertiaryFixed,
                            value:
                                '${(wellness.sleepDurationMinutes / 60).toStringAsFixed(1)} Jam',
                            target:
                                'Target ${(goals.dailySleepGoalMinutes / 60).toStringAsFixed(0)} Jam',
                            progress: goals.dailySleepGoalMinutes > 0
                                ? (wellness.sleepDurationMinutes /
                                        goals.dailySleepGoalMinutes)
                                    .clamp(0.0, 1.0)
                                : 0.0,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            showModalBottomSheet(
                              context: context,
                              isScrollControlled: true,
                              backgroundColor: Colors.transparent,
                              builder: (_) => QuickWaterSheet(
                                date: selectedDate,
                                currentMl: wellness.waterIntakeMl,
                                goalMl: goals.dailyWaterGoalMl,
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(24),
                          child: _buildWaterCard(
                            context,
                            ref,
                            selectedDate,
                            wellness.waterIntakeMl,
                            goals.dailyWaterGoalMl,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // 5. Quick Vitals 2x2 Bento Grid (Row 2: Exercise & Mood)
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            final combinedSteps =
                                stepState.todaySteps > wellness.dailySteps
                                    ? stepState.todaySteps
                                    : wellness.dailySteps;
                            showModalBottomSheet(
                              context: context,
                              isScrollControlled: true,
                              backgroundColor: Colors.transparent,
                              builder: (_) => QuickExerciseSheet(
                                date: selectedDate,
                                currentExerciseMinutes:
                                    wellness.exerciseDurationMinutes,
                                currentSteps: combinedSteps,
                                goalMinutes: goals.dailyExerciseGoalMinutes,
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(24),
                          child: _buildVitalCard(
                            context,
                            title: 'Latihan & Fisik',
                            icon: Icons.directions_run_rounded,
                            accentColor: AppColors.primaryContainer,
                            badgeBg:
                                AppColors.secondaryFixed.withValues(alpha: 0.5),
                            value: '${wellness.exerciseDurationMinutes} Menit',
                            target:
                                'Target ${goals.dailyExerciseGoalMinutes}m • ${stepState.todaySteps > wellness.dailySteps ? stepState.todaySteps : wellness.dailySteps} lkg',
                            progress: goals.dailyExerciseGoalMinutes > 0
                                ? (wellness.exerciseDurationMinutes /
                                        goals.dailyExerciseGoalMinutes)
                                    .clamp(0.0, 1.0)
                                : 0.0,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            showModalBottomSheet(
                              context: context,
                              isScrollControlled: true,
                              backgroundColor: Colors.transparent,
                              builder: (_) => QuickCheckinSheet(
                                date: selectedDate,
                                currentMood: wellness.mood,
                                currentEnergy: wellness.energyLevel,
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(24),
                          child: _buildVitalCard(
                            context,
                            title: 'Mood & Fokus',
                            icon: Icons.sentiment_very_satisfied_rounded,
                            accentColor: const Color(0xFFD97706),
                            badgeBg: const Color(0xFFFEF3C7),
                            value: wellness.mood,
                            target: 'Energi ${wellness.energyLevel}%',
                            progress:
                                (wellness.energyLevel / 100.0).clamp(0.0, 1.0),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 6. Sensor Pedometer Otomatis Bento Card
                  _buildLiveStepBanner(
                    context,
                    ref,
                    stepState,
                    goals.dailyStepsGoal,
                  ),
                  const SizedBox(height: 14),

                  // 7. AI Push-Up Counter Hero Banner
                  _buildPushupStreakBanner(context, pushupStats),
                  const SizedBox(height: 14),

                  // 8. Target Kalori & Nutrisi Bento Card
                  _buildCalorieTrackerBanner(context, nutrition),
                  const SizedBox(height: 14),

                  // 9. Latihan Napas 1 Menit (Box Breathing)
                  _buildBreathingBanner(context),
                  const SizedBox(height: 18),

                  // 10. Kebiasaan Hari Ini (Habit Checklist)
                  _buildHabitChecklist(context, wellness, schedule, goals),
                  const SizedBox(height: 18),

                  // 11. Tips Sirkadian Hari Ini
                  if (data.tips.isNotEmpty) ...[
                    _buildTipCard(context, data.tips.first),
                    const SizedBox(height: 12),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildBalanceScoreCard(
    BuildContext context,
    int score,
    int circadianPct,
    int energyLevel,
  ) {
    final theme = Theme.of(context);
    final progress = (score / 100.0).clamp(0.0, 1.0);

    return Container(
      padding: const EdgeInsets.all(22),
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
              // Dual-Ring Score Meter
              SizedBox(
                width: 92,
                height: 92,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 92,
                      height: 92,
                      child: CircularProgressIndicator(
                        value: progress,
                        strokeWidth: 9,
                        strokeCap: StrokeCap.round,
                        backgroundColor: AppColors.surfaceContainerLow,
                        valueColor: const AlwaysStoppedAnimation<Color>(
                          AppColors.primary,
                        ),
                      ),
                    ),
                    SizedBox(
                      width: 68,
                      height: 68,
                      child: CircularProgressIndicator(
                        value: (circadianPct / 100.0).clamp(0.1, 1.0),
                        strokeWidth: 4.5,
                        strokeCap: StrokeCap.round,
                        backgroundColor: Colors.transparent,
                        valueColor: const AlwaysStoppedAnimation<Color>(
                          AppColors.secondaryFixedDim,
                        ),
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '$score',
                          style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w900,
                            color: AppColors.onSurface,
                            height: 1.0,
                          ),
                        ),
                        const Text(
                          '/ 100',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: AppColors.outline,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 18),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 9,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.secondaryFixed.withValues(alpha: 0.45),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: const Text(
                        'SKOR HARMONI BIO-RITME',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.6,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      score >= 75
                          ? 'Tubuh dalam Ritme Sinkron ✨'
                          : score >= 50
                              ? 'Ritme Stabil, Terus Jaga 🌱'
                              : 'Mari Bangun Ritme Hari Ini 🍃',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Kualitas tidur, hidrasi, & jadwal 24 jam mendukung pemulihan sel.',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 11.5,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // 3 Micro-Stat Pills
          Row(
            children: [
              _buildMicroTag(
                icon: Icons.wb_sunny_outlined,
                label: 'Sirkadian $circadianPct%',
                color: AppColors.primary,
              ),
              const SizedBox(width: 8),
              _buildMicroTag(
                icon: Icons.bolt_rounded,
                label: 'Energi $energyLevel%',
                color: AppColors.tertiary,
              ),
              const SizedBox(width: 8),
              _buildMicroTag(
                icon: Icons.favorite_border_rounded,
                label: score >= 70 ? 'Metabolik Baik' : 'Perlu Gerak',
                color: const Color(0xFF0284C7),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMicroTag({
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerLow,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 13, color: color),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVitalCard(
    BuildContext context, {
    required String title,
    required IconData icon,
    required Color accentColor,
    required Color badgeBg,
    required String value,
    required String target,
    required double progress,
  }) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: AppColors.bentoShadow,
        border: Border.all(
          color: AppColors.outlineVariant.withValues(alpha: 0.22),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, size: 20, color: accentColor),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  'Atur',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: accentColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            target,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.outline,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: AppColors.surfaceContainerLow,
              valueColor: AlwaysStoppedAnimation<Color>(accentColor),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWaterCard(
    BuildContext context,
    WidgetRef ref,
    String selectedDate,
    int currentMl,
    int goalMl,
  ) {
    final theme = Theme.of(context);
    const skyBlue = Color(0xFF0284C7);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: AppColors.bentoShadow,
        border: Border.all(
          color: AppColors.outlineVariant.withValues(alpha: 0.22),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFFE0F2FE),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.water_drop_rounded,
                  size: 20,
                  color: skyBlue,
                ),
              ),
              GestureDetector(
                onTap: () async {
                  final currentLog = await ref
                      .read(wellnessRepositoryProvider)
                      .getHealthLog(selectedDate);
                  await ref.read(wellnessRepositoryProvider).upsertHealthLog(
                        date: selectedDate,
                        sleepDurationMinutes:
                            currentLog?.sleepDurationMinutes ?? 420,
                        sleepQuality: currentLog?.sleepQuality ?? 85,
                        exerciseDurationMinutes:
                            currentLog?.exerciseDurationMinutes ?? 0,
                        dailySteps: currentLog?.dailySteps ?? 0,
                        waterIntakeMl: currentMl + 250,
                        mood: currentLog?.mood ?? 'Calm',
                        energyLevel: currentLog?.energyLevel ?? 75,
                        notes: currentLog?.notes,
                      );
                  ref.invalidate(dailyAnalyticsProvider);
                  ref.invalidate(todayHealthLogProvider);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: skyBlue,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Text(
                    '+250ml',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Hidrasi Air',
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            '$currentMl ml',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Target $goalMl ml',
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.outline,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: goalMl > 0 ? (currentMl / goalMl).clamp(0.0, 1.0) : 0.0,
              minHeight: 6,
              backgroundColor: AppColors.surfaceContainerLow,
              valueColor: const AlwaysStoppedAnimation<Color>(skyBlue),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLiveStepBanner(
    BuildContext context,
    WidgetRef ref,
    StepCounterState stepState,
    int goalSteps,
  ) {
    final theme = Theme.of(context);
    final isWalking = stepState.pedestrianStatus == 'walking';
    final progress = goalSteps > 0
        ? (stepState.todaySteps / goalSteps).clamp(0.0, 1.0)
        : 0.0;
    final kcalBurned = (stepState.todaySteps * 0.04).round();

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: AppColors.bentoShadow,
        border: Border.all(
          color: isWalking
              ? AppColors.primaryContainer
              : AppColors.outlineVariant.withValues(alpha: 0.25),
          width: isWalking ? 1.5 : 1,
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(
                  isWalking
                      ? Icons.directions_walk_rounded
                      : Icons.sensors_rounded,
                  size: 22,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Sensor Pedometer',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Container(
                          width: 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: stepState.hasPermission
                                ? AppColors.primaryContainer
                                : AppColors.outline,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Text(
                            stepState.hasPermission
                                ? (isWalking
                                    ? 'Berjalan • Hardware Pedometer'
                                    : 'Aktif (Hardware Pedometer)')
                                : 'Ketuk Aktifkan untuk hitung otomatis',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (!stepState.hasPermission)
                FilledButton(
                  onPressed: () => ref
                      .read(stepCounterProvider.notifier)
                      .requestPermissionAndStart(),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 8,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                  child: const Text(
                    'Aktifkan',
                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
                  ),
                )
              else
                InkWell(
                  borderRadius: BorderRadius.circular(999),
                  onTap: () async {
                    await ref
                        .read(stepCounterProvider.notifier)
                        .syncStepsToBackend();
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Langkah kaki berhasil disinkronkan ke server!',
                          ),
                          backgroundColor: AppColors.primary,
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.sync_rounded,
                          size: 14,
                          color: AppColors.primary,
                        ),
                        SizedBox(width: 4),
                        Text(
                          'Sinkronkan',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    '${stepState.todaySteps}',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      color: AppColors.onSurface,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '/ $goalSteps langkah',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              Text(
                '~$kcalBurned kkal terbakar',
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 7,
              backgroundColor: AppColors.surfaceContainerLow,
              valueColor: const AlwaysStoppedAnimation<Color>(
                AppColors.primaryContainer,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPushupStreakBanner(BuildContext context, PushupStatsState stats) {
    return InkWell(
      onTap: () => context.push('/pushup-counter'),
      borderRadius: BorderRadius.circular(28),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: AppColors.primaryGradient,
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.22),
              blurRadius: 18,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '🔥 ${stats.currentStreak} Hari Streak',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                Text(
                  'Rekor Terbaik: ${stats.bestSessionReps} Reps',
                  style: TextStyle(
                    color: AppColors.secondaryFixed.withValues(alpha: 0.95),
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              'Target Push-Up AI',
              style: TextStyle(
                color: Colors.white,
                fontSize: 19,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              'Deteksi postur tubuh real-time dengan kamera ML Kit Pose.',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.82),
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 9,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'CAPAIAN HARI INI',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          color: Colors.white.withValues(alpha: 0.7),
                        ),
                      ),
                      Text(
                        '${stats.todayReps} Reps',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.videocam_rounded,
                          size: 18,
                          color: AppColors.primary,
                        ),
                        SizedBox(width: 6),
                        Text(
                          'Mulai Latihan AI',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCalorieTrackerBanner(
    BuildContext context,
    DailyNutritionState nutrition,
  ) {
    final theme = Theme.of(context);
    final consumed = nutrition.consumedCalories.round();
    final target = nutrition.targetCalories;
    final progress = nutrition.calorieProgress.clamp(0.0, 1.0);
    final pct = (progress * 100).round();

    return InkWell(
      onTap: () => context.push('/calorie-tracker'),
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(24),
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
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.restaurant_rounded,
                    size: 20,
                    color: Color(0xFFD97706),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Target Kalori & Nutrisi',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: AppColors.onSurface,
                        ),
                      ),
                      Text(
                        nutrition.meals.isEmpty
                            ? 'Katalog Nusantara & Open Food Facts'
                            : '${nutrition.meals.length} makanan • Sisa ${nutrition.remainingCalories.round()} kkal',
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                const Text(
                  'Rincian →',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      '$consumed',
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: AppColors.onSurface,
                      ),
                    ),
                    Text(
                      ' / $target kkal',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                Text(
                  '$pct% Terpenuhi',
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFD97706),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 7,
                backgroundColor: AppColors.surfaceContainerLow,
                valueColor: AlwaysStoppedAnimation<Color>(
                  nutrition.calorieProgress > 1.0
                      ? AppColors.error
                      : const Color(0xFFF59E0B),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildMacroMiniPill(
                  'PRO',
                  '${nutrition.consumedProteins.round()}g',
                  AppColors.primary,
                ),
                const SizedBox(width: 8),
                _buildMacroMiniPill(
                  'KAR',
                  '${nutrition.consumedCarbs.round()}g',
                  const Color(0xFF0284C7),
                ),
                const SizedBox(width: 8),
                _buildMacroMiniPill(
                  'LEM',
                  '${nutrition.consumedFat.round()}g',
                  const Color(0xFFD97706),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMacroMiniPill(String label, String val, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerLow,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
            Text(
              val,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: AppColors.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBreathingBanner(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.surfaceContainerLow,
            AppColors.tertiaryFixed.withValues(alpha: 0.45),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: AppColors.tertiary.withValues(alpha: 0.15),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: AppColors.bentoShadow,
            ),
            child: const Icon(
              Icons.self_improvement_rounded,
              size: 26,
              color: AppColors.tertiary,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'PENENANG PIKIRAN',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.7,
                    color: AppColors.tertiary,
                  ),
                ),
                Text(
                  'Latihan Pernapasan 1 Menit',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Turunkan kortisol & pulihkan fokus dengan Box Breathing.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 11.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              backgroundColor: AppColors.primary,
            ),
            onPressed: () {
              showDialog(
                context: context,
                builder: (_) => const BreathingExerciseDialog(),
              );
            },
            child: const Text(
              'Mulai',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHabitChecklist(
    BuildContext context,
    dynamic wellness,
    dynamic schedule,
    dynamic goals,
  ) {
    final theme = Theme.of(context);

    final bool sleepDone =
        wellness.sleepDurationMinutes >= (goals.dailySleepGoalMinutes * 0.85);
    final bool waterDone =
        wellness.waterIntakeMl >= (goals.dailyWaterGoalMl * 0.7);
    final bool movementDone = wellness.exerciseDurationMinutes >= 20;
    final bool scheduleDone = schedule.allocatedMinutes >= 480;
    final bool moodDone = wellness.mood != null && wellness.mood != 'Calm';

    final int completedCount = [
      sleepDone,
      waterDone,
      movementDone,
      scheduleDone,
      moodDone,
    ].where((b) => b).length;

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
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Kebiasaan Hari Ini',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface,
                    ),
                  ),
                  const Text(
                    'Konsistensi mikro pembentuk ritme sehat',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: AppColors.secondaryFixed.withValues(alpha: 0.45),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '$completedCount/5 Selesai',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: completedCount / 5.0,
              minHeight: 6,
              backgroundColor: AppColors.surfaceContainerLow,
              valueColor: const AlwaysStoppedAnimation<Color>(
                AppColors.primaryContainer,
              ),
            ),
          ),
          const SizedBox(height: 14),
          _buildHabitItem(
            'Tidur berkualitas tercapai (≥ ${(goals.dailySleepGoalMinutes / 60).toStringAsFixed(0)} jam)',
            sleepDone,
          ),
          _buildHabitItem(
            'Hidrasi harian terpenuhi (${wellness.waterIntakeMl} ml)',
            waterDone,
          ),
          _buildHabitItem(
            'Aktivitas fisik / olahraga (≥ 20 menit)',
            movementDone,
          ),
          _buildHabitItem(
            'Jadwal 24 jam direncanakan (${(schedule.allocatedMinutes / 60).toStringAsFixed(1)} jam)',
            scheduleDone,
          ),
          _buildHabitItem(
            'Check-in kondisi mood & energi harian',
            moodDone,
          ),
        ],
      ),
    );
  }

  Widget _buildHabitItem(String title, bool isDone) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: isDone
            ? AppColors.surfaceContainerLow.withValues(alpha: 0.7)
            : AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDone
              ? AppColors.primaryContainer.withValues(alpha: 0.2)
              : AppColors.outlineVariant.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(
            isDone
                ? Icons.check_circle_rounded
                : Icons.radio_button_unchecked_rounded,
            size: 19,
            color: isDone ? AppColors.primaryContainer : AppColors.outlineVariant,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              title,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: isDone ? FontWeight.w700 : FontWeight.w500,
                color: isDone ? AppColors.onSurface : AppColors.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTipCard(BuildContext context, dynamic tip) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: AppColors.bentoShadow,
        border: Border.all(
          color: AppColors.outlineVariant.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.tips_and_updates_rounded,
              size: 20,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'TIPS SIRKADIAN HARI INI',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.7,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  tip.title as String,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  tip.content as String,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                    height: 1.4,
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
