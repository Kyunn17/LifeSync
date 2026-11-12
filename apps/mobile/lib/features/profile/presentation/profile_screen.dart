import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../core/network/api_endpoints.dart';
import '../../auth/providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(authStateProvider).user;
    final profile = user?.profile;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profil & Pengaturan'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // User Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: AppColors.surfaceContainerHigh),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: AppColors.secondaryContainer,
                    child: Text(
                      user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'U',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                user?.name ?? 'Pengguna',
                                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Icon(Icons.verified_rounded, size: 16, color: AppColors.primary),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user?.email ?? '',
                          style: theme.textTheme.bodySmall?.copyWith(color: AppColors.outline),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceContainerLow,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            user?.role ?? 'USER',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Wellness Goals Section
            Text(
              'Target Kebugaran Harian',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.surfaceContainerHigh),
              ),
              child: Column(
                children: [
                  _buildGoalRow(
                    icon: Icons.bedtime_outlined,
                    label: 'Target Tidur',
                    value: '${((profile?.dailySleepGoalMinutes ?? 480) / 60).toStringAsFixed(0)} Jam / malam',
                  ),
                  const Divider(height: 1, indent: 56, color: AppColors.surfaceContainerHigh),
                  _buildGoalRow(
                    icon: Icons.water_drop_outlined,
                    label: 'Target Minum Air',
                    value: '${profile?.dailyWaterGoalMl ?? 2500} ml / hari',
                  ),
                  const Divider(height: 1, indent: 56, color: AppColors.surfaceContainerHigh),
                  _buildGoalRow(
                    icon: Icons.directions_walk_rounded,
                    label: 'Target Langkah',
                    value: '${profile?.dailyStepsGoal ?? 10000} langkah',
                  ),
                  const Divider(height: 1, indent: 56, color: AppColors.surfaceContainerHigh),
                  _buildGoalRow(
                    icon: Icons.fitness_center_rounded,
                    label: 'Target Olahraga',
                    value: '${profile?.dailyExerciseGoalMinutes ?? 45} menit / hari',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Account Actions Section
            Text(
              'Akun & Keamanan',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.surfaceContainerHigh),
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.logout_rounded, color: AppColors.onSurface),
                    title: const Text('Keluar dari Akun', style: TextStyle(fontWeight: FontWeight.w600)),
                    trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.outline),
                    onTap: () async {
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Konfirmasi Keluar'),
                          content: const Text('Apakah Anda yakin ingin keluar dari aplikasi LifeSync?'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
                            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Keluar')),
                          ],
                        ),
                      );

                      if (confirm == true) {
                        await ref.read(authStateProvider.notifier).signOut();
                        if (context.mounted) {
                          context.go('/login');
                        }
                      }
                    },
                  ),
                  const Divider(height: 1, indent: 56, color: AppColors.surfaceContainerHigh),
                  ListTile(
                    leading: const Icon(Icons.delete_forever_rounded, color: AppColors.error),
                    title: const Text(
                      'Hapus Akun Permanen',
                      style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.error),
                    ),
                    trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.outline),
                    onTap: () async {
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Hapus Akun Permanen?'),
                          content: const Text(
                            'Tindakan ini tidak dapat dibatalkan. Semua data jadwal, catatan kesehatan, dan profil Anda akan dihapus secara permanen dari server.',
                          ),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
                              onPressed: () => Navigator.pop(ctx, true),
                              child: const Text('Hapus Sekarang'),
                            ),
                          ],
                        ),
                      );

                      if (confirm == true) {
                        try {
                          await ref.read(apiClientProvider).dio.delete(ApiEndpoints.me);
                          await ref.read(authStateProvider.notifier).signOut();
                          if (context.mounted) {
                            context.go('/login');
                          }
                        } catch (_) {}
                      }
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            Center(
              child: Text(
                'LifeSync Wellness v0.1.0\nYour life, in better balance.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(color: AppColors.outline),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGoalRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Icon(icon, size: 22, color: AppColors.primary),
          const SizedBox(width: 16),
          Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500))),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.onSurface)),
        ],
      ),
    );
  }
}

