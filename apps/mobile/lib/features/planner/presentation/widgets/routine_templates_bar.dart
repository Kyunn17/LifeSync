import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../app/theme/app_colors.dart';
import '../providers/planner_provider.dart';

class RoutineTemplatesBar extends ConsumerStatefulWidget {
  final String date;
  final VoidCallback onApplied;

  const RoutineTemplatesBar({
    super.key,
    required this.date,
    required this.onApplied,
  });

  @override
  ConsumerState<RoutineTemplatesBar> createState() => _RoutineTemplatesBarState();
}

class _RoutineTemplatesBarState extends ConsumerState<RoutineTemplatesBar> {
  bool _isApplying = false;
  String? _applyingLabel;

  Future<void> _applyTemplate(String type, String label) async {
    if (_isApplying) return;

    setState(() {
      _isApplying = true;
      _applyingLabel = label;
    });

    try {
      final repo = ref.read(plannerRepositoryProvider);
      int count = 0;

      if (type == 'yesterday') {
        count = await repo.copyYesterdaySchedule(widget.date);
      } else {
        final categories = await repo.getCategories();
        count = await repo.applyRoutineTemplate(widget.date, type, categories);
      }

      ref.invalidate(scheduleSummaryProvider);
      widget.onApplied();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              count > 0
                  ? 'Berhasil menerapkan $count blok jadwal dari $label!'
                  : 'Tidak ada blok baru yang diterapkan.',
            ),
            backgroundColor: AppColors.primary,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal menerapkan template: $e'),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isApplying = false;
          _applyingLabel = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
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
            children: [
              const Icon(Icons.auto_awesome_rounded, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                'Template Cepat 24 Jam',
                style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              if (_isApplying) ...[
                const SizedBox(width: 8),
                const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                ),
              ],
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Isi jadwal dalam 1 ketukan agar tidak mulai dari nol:',
            style: theme.textTheme.bodySmall?.copyWith(color: AppColors.outline),
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildTemplatePill(
                  label: 'Salin Kemarin',
                  icon: Icons.copy_rounded,
                  color: AppColors.primary,
                  onTap: () => _applyTemplate('yesterday', 'Jadwal Kemarin'),
                ),
                const SizedBox(width: 8),
                _buildTemplatePill(
                  label: 'Hari Kerja',
                  icon: Icons.work_outline_rounded,
                  color: const Color(0xFF2563EB),
                  onTap: () => _applyTemplate('workday', 'Template Hari Kerja'),
                ),
                const SizedBox(width: 8),
                _buildTemplatePill(
                  label: 'Akhir Pekan',
                  icon: Icons.weekend_outlined,
                  color: const Color(0xFFD97706),
                  onTap: () => _applyTemplate('weekend', 'Template Akhir Pekan'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTemplatePill({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    final isLoadingThis = _isApplying && _applyingLabel?.contains(label) == true;

    return InkWell(
      onTap: _isApplying ? null : onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isLoadingThis)
              SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(strokeWidth: 2, color: color),
              )
            else
              Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

