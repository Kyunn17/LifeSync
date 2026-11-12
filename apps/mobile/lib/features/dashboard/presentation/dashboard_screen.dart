import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../app/theme/app_colors.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../auth/providers/auth_provider.dart';
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

    final displayDate = DateFormat('EEEE, d MMMM yyyy', 'id_ID').format(
      DateTime.tryParse(selectedDate) ?? DateTime.now(),
    );

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Halo, ${user?.name ?? 'Sobat'} 👋',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              displayDate,
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.secondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.invalidate(dailyAnalyticsProvider),
          ),
        ],
      ),
      body: analyticsAsync.when(
        loading: () => const LoadingIndicator(message: 'Memuat keseimbangan harian Anda...'),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.wifi_off_rounded, size: 48, color: AppColors.outline),
                const SizedBox(height: 16),
                Text(
                  'Gagal memuat data',
                  style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
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
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Balance Score Card
                  _buildBalanceScoreCard(context, data.balanceScore),
                  const SizedBox(height: 16),

                  // 2. Circadian 24-Hour Donut Ring
                  CircadianRingChart(schedule: schedule),
                  const SizedBox(height: 16),

                  // 3. Section Title with Edit Hint
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Ringkasan Kebugaran Hari Ini',
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const Text(
                        'Ketuk kartu untuk atur ✏️',
                        style: TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // 4. Quick Vitals Grid (Sleep & Water) - Fully Tappable to Edit!
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
                          borderRadius: BorderRadius.circular(20),
                          child: _buildVitalCard(
                            context,
                            title: 'Tidur Semalam',
                            icon: Icons.bedtime_outlined,
                            accentColor: const Color(0xFF005F3F),
                            value: '${(wellness.sleepDurationMinutes / 60).toStringAsFixed(1)} Jam',
                            target: 'Target ${(goals.dailySleepGoalMinutes / 60).toStringAsFixed(0)} Jam',
                            progress: goals.dailySleepGoalMinutes > 0
                                ? (wellness.sleepDurationMinutes / goals.dailySleepGoalMinutes).clamp(0.0, 1.0)
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
                          borderRadius: BorderRadius.circular(20),
                          child: _buildWaterCard(context, ref, wellness.waterIntakeMl, goals.dailyWaterGoalMl),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // 5. Movement & Mood Row - Fully Tappable!
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            showModalBottomSheet(
                              context: context,
                              isScrollControlled: true,
                              backgroundColor: Colors.transparent,
                              builder: (_) => QuickExerciseSheet(
                                date: selectedDate,
                                currentExerciseMinutes: wellness.exerciseDurationMinutes,
                                currentSteps: wellness.dailySteps,
                                goalMinutes: goals.dailyExerciseGoalMinutes,
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(20),
                          child: _buildVitalCard(
                            context,
                            title: 'Aktivitas Fisik',
                            icon: Icons.directions_run_rounded,
                            accentColor: const Color(0xFF0D7A53),
                            value: '${wellness.exerciseDurationMinutes} Menit',
                            target: 'Target ${goals.dailyExerciseGoalMinutes}m • ${wellness.dailySteps} lkg',
                            progress: goals.dailyExerciseGoalMinutes > 0
                                ? (wellness.exerciseDurationMinutes / goals.dailyExerciseGoalMinutes).clamp(0.0, 1.0)
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
                          borderRadius: BorderRadius.circular(20),
                          child: _buildVitalCard(
                            context,
                            title: 'Kondisi Mood',
                            icon: Icons.mood_rounded,
                            accentColor: const Color(0xFF3F6656),
                            value: wellness.mood,
                            target: 'Energi ${wellness.energyLevel}%',
                            progress: wellness.energyLevel / 100.0,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // 6. Relaxation Breathing Exercise Banner
                  _buildBreathingBanner(context),
                  const SizedBox(height: 20),

                  // 7. Daily Habit Checklist
                  _buildHabitChecklist(context, wellness, schedule, goals),
                  const SizedBox(height: 20),

                  // 8. Daily Wellness Tip
                  if (data.tips.isNotEmpty) ...[
                    _buildTipCard(context, data.tips.first),
                    const SizedBox(height: 24),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildBalanceScoreCard(BuildContext context, int score) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF005F3F), Color(0xFF0D7A53)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF005F3F).withValues(alpha: 0.25),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    'DAILY BALANCE SCORE',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  score >= 75
                      ? 'Keseimbangan Sangat Baik! ✨'
                      : score >= 50
                          ? 'Perjalanan Bagus, Tetap Konsisten 🌱'
                          : 'Ayo Mulai Catat Rutinitasmu 🍃',
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Mengukur alokasi waktu 24 jam, tidur, air, dan aktivitas hari ini.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: Colors.white.withValues(alpha: 0.85),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white.withValues(alpha: 0.15),
              border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 3),
            ),
            child: Center(
              child: Text(
                '$score',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVitalCard(
    BuildContext context, {
    required String title,
    required IconData icon,
    required Color accentColor,
    required String value,
    required String target,
    required double progress,
  }) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.surfaceContainerHigh),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 16, color: accentColor),
                  const SizedBox(width: 6),
                  Text(title, style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: accentColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.edit_outlined, size: 10, color: accentColor),
                    const SizedBox(width: 2),
                    Text(
                      'Atur',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: accentColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          Text(target, style: theme.textTheme.bodySmall),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
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

  Widget _buildWaterCard(BuildContext context, WidgetRef ref, int currentMl, int goalMl) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.surfaceContainerHigh),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.water_drop_rounded, size: 16, color: Colors.blueAccent),
                  const SizedBox(width: 6),
                  Text('Air Minum', style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.blueAccent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.edit_outlined, size: 10, color: Colors.blueAccent),
                    SizedBox(width: 2),
                    Text(
                      'Atur',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: Colors.blueAccent,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            '$currentMl ml',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          Text('Target ${goalMl}ml', style: theme.textTheme.bodySmall),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: goalMl > 0 ? (currentMl / goalMl).clamp(0.0, 1.0) : 0.0,
              minHeight: 6,
              backgroundColor: AppColors.surfaceContainerLow,
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.blueAccent),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBreathingBanner(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.surfaceContainerHigh),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.secondaryContainer,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.self_improvement_rounded, size: 28, color: AppColors.primary),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Latihan Pernapasan 1 Menit',
                  style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 2),
                Text(
                  'Tenangkan pikiran dan pulihkan fokus dengan Box Breathing.',
                  style: theme.textTheme.bodySmall?.copyWith(color: AppColors.outline),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              backgroundColor: AppColors.primary,
            ),
            onPressed: () {
              showDialog(
                context: context,
                builder: (_) => const BreathingExerciseDialog(),
              );
            },
            child: const Text('Mulai', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
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

    final bool sleepDone = wellness.sleepDurationMinutes >= (goals.dailySleepGoalMinutes * 0.85);
    final bool waterDone = wellness.waterIntakeMl >= (goals.dailyWaterGoalMl * 0.7);
    final bool movementDone = wellness.exerciseDurationMinutes >= 20;
    final bool scheduleDone = schedule.allocatedMinutes >= 480;
    final bool moodDone = wellness.mood != null && wellness.mood != 'Calm';

    final int completedCount = [sleepDone, waterDone, movementDone, scheduleDone, moodDone]
        .where((b) => b)
        .length;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.surfaceContainerHigh),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Habit Checklist Harian',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
              Text(
                '$completedCount/5 Selesai',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _buildHabitItem('Tidur berkualitas tercapai (≥ ${(goals.dailySleepGoalMinutes / 60).toStringAsFixed(0)} jam)', sleepDone),
          _buildHabitItem('Hidrasi harian terpenuhi (${wellness.waterIntakeMl} ml)', waterDone),
          _buildHabitItem('Aktivitas fisik / gerak (≥ 20 menit)', movementDone),
          _buildHabitItem('Jadwal 24 jam telah direncanakan (${(schedule.allocatedMinutes / 60).toStringAsFixed(1)} jam)', scheduleDone),
          _buildHabitItem('Check-in mood & energi telah dicatat', moodDone),
        ],
      ),
    );
  }

  Widget _buildHabitItem(String title, bool isDone) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(
            isDone ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
            size: 18,
            color: isDone ? AppColors.primary : AppColors.outlineVariant,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              title,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isDone ? FontWeight.w600 : FontWeight.normal,
                color: isDone ? AppColors.onSurface : AppColors.outline,
                decoration: isDone ? TextDecoration.none : null,
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
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.surfaceContainerHigh),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.secondaryContainer,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.lightbulb_outline_rounded, size: 22, color: AppColors.primary),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tip.title as String,
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
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
