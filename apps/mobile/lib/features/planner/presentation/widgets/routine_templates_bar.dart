import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../app/theme/app_colors.dart';
import '../../providers/planner_provider.dart';

class RoutineTemplatesBar extends ConsumerStatefulWidget {
  final String date;
  final VoidCallback onApplied;

  const RoutineTemplatesBar({
    super.key,
    required this.date,
    required this.onApplied,
  });

  @override
  ConsumerState<RoutineTemplatesBar> createState() =>
      _RoutineTemplatesBarState();
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Preset Rutinitas Cepat',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.onSurface,
                ),
              ),
              const Text(
                '1-Klik Isi Otomatis',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildTemplatePill(
                label: '⚡ Salin Kemarin',
                icon: Icons.history_rounded,
                isPrimary: true,
                onTap: () => _applyTemplate('yesterday', 'Jadwal Kemarin'),
              ),
              const SizedBox(width: 8),
              _buildTemplatePill(
                label: '💼 Hari Kerja',
                icon: Icons.work_outline_rounded,
                isPrimary: false,
                onTap: () => _applyTemplate('workday', 'Template Hari Kerja'),
              ),
              const SizedBox(width: 8),
              _buildTemplatePill(
                label: '🏖️ Akhir Pekan',
                icon: Icons.weekend_outlined,
                isPrimary: false,
                onTap: () => _applyTemplate('weekend', 'Template Akhir Pekan'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTemplatePill({
    required String label,
    required IconData icon,
    required bool isPrimary,
    required VoidCallback onTap,
  }) {
    final isLoadingThis =
        _isApplying && _applyingLabel != null && label.contains(_applyingLabel!.split(' ').last);

    return InkWell(
      onTap: _isApplying ? null : onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isPrimary ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(999),
          boxShadow: AppColors.bentoShadow,
          border: Border.all(
            color: isPrimary
                ? AppColors.primary
                : AppColors.outlineVariant.withValues(alpha: 0.35),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isLoadingThis)
              SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: isPrimary ? Colors.white : AppColors.primary,
                ),
              )
            else
              Icon(
                icon,
                size: 15,
                color: isPrimary ? Colors.white : AppColors.primary,
              ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: isPrimary ? Colors.white : AppColors.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
