import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../app/theme/app_colors.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/dashboard_provider.dart';

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

                  // 2. 24-Hour Time Stewardship Card
                  _buildTimeAllocationCard(context, schedule),
                  const SizedBox(height: 16),

                  // 3. Quick Vitals Grid (Sleep & Water)
                  Row(
                    children: [
                      Expanded(
                        child: _buildVitalCard(
                          context,
                          title: 'Tidur',
                          icon: Icons.bedtime_outlined,
                          accentColor: const Color(0xFF005F3F),
                          value: '${(wellness.sleepDurationMinutes / 60).toStringAsFixed(1)} Jam',
                          target: 'Target ${(goals.dailySleepGoalMinutes / 60).toStringAsFixed(0)} Jam',
                          progress: goals.dailySleepGoalMinutes > 0
                              ? (wellness.sleepDurationMinutes / goals.dailySleepGoalMinutes).clamp(0.0, 1.0)
                              : 0.0,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildWaterCard(context, ref, wellness.waterIntakeMl, goals.dailyWaterGoalMl),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // 4. Movement & Mood Row
                  Row(
                    children: [
                      Expanded(
                        child: _buildVitalCard(
                          context,
                          title: 'Aktivitas Fisik',
                          icon: Icons.directions_run_rounded,
                          accentColor: const Color(0xFF0D7A53),
                          value: '${wellness.exerciseDurationMinutes} Menit',
                          target: 'Target ${goals.dailyExerciseGoalMinutes}m',
                          progress: goals.dailyExerciseGoalMinutes > 0
                              ? (wellness.exerciseDurationMinutes / goals.dailyExerciseGoalMinutes).clamp(0.0, 1.0)
                              : 0.0,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
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
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 5. Daily Wellness Tip
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
          // Circular Score Badge
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

  Widget _buildTimeAllocationCard(BuildContext context, dynamic schedule) {
    final theme = Theme.of(context);
    final allocated = schedule.allocatedMinutes as int;
    final remaining = schedule.remainingMinutes as int;
    final percent = schedule.allocatedPercentage as int;

    return Container(
      padding: const EdgeInsets.all(18),
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
                children: [
                  const Icon(Icons.schedule_rounded, size: 20, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Text(
                    'Alokasi 24 Jam (1.440m)',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              Text(
                '$percent% Terisi',
                style: theme.textTheme.labelMedium?.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: (percent / 100.0).clamp(0.0, 1.0),
              minHeight: 10,
              backgroundColor: AppColors.surfaceContainerLow,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Terjadwal: ${(allocated / 60).toStringAsFixed(1)} Jam',
                style: theme.textTheme.bodySmall,
              ),
              Text(
                'Waktu Luang: ${(remaining / 60).toStringAsFixed(1)} Jam',
                style: theme.textTheme.bodySmall?.copyWith(color: AppColors.secondary),
              ),
            ],
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
              Text(title, style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
              Icon(icon, size: 18, color: accentColor),
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
    final selectedDate = ref.watch(selectedDateProvider);

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
              Text('Air Minum', style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
              const Icon(Icons.water_drop_rounded, size: 18, color: Colors.blueAccent),
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
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () async {
                    await ref.read(dashboardRepositoryProvider).addWater(selectedDate, 250);
                    ref.invalidate(dailyAnalyticsProvider);
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: const Text(
                      '+250ml',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: InkWell(
                  onTap: () async {
                    await ref.read(dashboardRepositoryProvider).addWater(selectedDate, 500);
                    ref.invalidate(dailyAnalyticsProvider);
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: const Text(
                      '+500ml',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
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

