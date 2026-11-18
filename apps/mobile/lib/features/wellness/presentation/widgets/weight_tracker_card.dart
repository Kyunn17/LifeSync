import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../app/theme/app_colors.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../../dashboard/providers/dashboard_provider.dart';
import '../../providers/weight_provider.dart';

class WeightTrackerCard extends ConsumerWidget {
  const WeightTrackerCard({super.key});

  Future<void> _openLogWeightDialog(
    BuildContext context,
    WidgetRef ref,
    double currentWeight,
    String date,
  ) async {
    final weightCtrl =
        TextEditingController(text: currentWeight.toStringAsFixed(1));
    final noteCtrl = TextEditingController();
    bool isSubmitting = false;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
          title: const Text(
            'Catat Berat Badan Harian',
            style: TextStyle(fontWeight: FontWeight.w800),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Berat terakhir: ${currentWeight.toStringAsFixed(1)} kg',
                style: const TextStyle(
                  fontSize: 12.5,
                  color: AppColors.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: weightCtrl,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                autofocus: true,
                decoration: InputDecoration(
                  labelText: 'Berat Badan Sekarang',
                  suffixText: 'kg',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: noteCtrl,
                maxLines: 2,
                decoration: InputDecoration(
                  labelText: 'Catatan Singkat (Opsional)',
                  hintText: 'Misal: Pagi sebelum makan...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: isSubmitting ? null : () => Navigator.pop(ctx),
              child: const Text('Batal'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final parsed = double.tryParse(
                        weightCtrl.text.trim().replaceAll(',', '.'),
                      );
                      if (parsed == null || parsed < 20 || parsed > 350) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content:
                                Text('Masukkan berat valid antara 20 - 350 kg.'),
                            backgroundColor: AppColors.error,
                          ),
                        );
                        return;
                      }

                      final delta = parsed - currentWeight;
                      if (delta.abs() >= 10.0) {
                        Navigator.pop(ctx);
                        if (context.mounted) {
                          await _openAnomalyConfirmDialog(
                            context,
                            ref,
                            date: date,
                            previousWeight: currentWeight,
                            newWeight: parsed,
                            deltaKg: double.parse(delta.toStringAsFixed(1)),
                            regularNote: noteCtrl.text.trim(),
                          );
                        }
                        return;
                      }

                      setDialogState(() => isSubmitting = true);
                      try {
                        await ref.read(weightTrackerProvider.notifier).logWeight(
                              date: date,
                              weightKg: parsed,
                              notes: noteCtrl.text.trim(),
                            );
                        if (ctx.mounted) Navigator.pop(ctx);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                  'Berat badan dicatat & target harian disinkronkan!'),
                              backgroundColor: AppColors.primary,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      } on WeightAnomalyException catch (ex) {
                        if (ctx.mounted) Navigator.pop(ctx);
                        if (context.mounted) {
                          await _openAnomalyConfirmDialog(
                            context,
                            ref,
                            date: date,
                            previousWeight: ex.previousWeightKg,
                            newWeight: ex.newWeightKg,
                            deltaKg: ex.deltaKg,
                            regularNote: noteCtrl.text.trim(),
                          );
                        }
                      } catch (e) {
                        setDialogState(() => isSubmitting = false);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Gagal mencatat: $e'),
                              backgroundColor: AppColors.error,
                            ),
                          );
                        }
                      }
                    },
              child: Text(isSubmitting ? 'Menyimpan...' : 'Simpan'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openAnomalyConfirmDialog(
    BuildContext context,
    WidgetRef ref, {
    required String date,
    required double previousWeight,
    required double newWeight,
    required double deltaKg,
    String? regularNote,
  }) async {
    final reasonCtrl = TextEditingController();
    bool isSubmitting = false;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Color(0xFFD97706)),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Konfirmasi Perubahan Drastis (>= 10 kg)',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  'Perubahan dari ${previousWeight.toStringAsFixed(1)} kg → ${newWeight.toStringAsFixed(1)} kg (${deltaKg >= 0 ? '+' : ''}$deltaKg kg). Pastikan data tidak salah ketik dan berikan alasan perubahan ini.',
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF78350F),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: reasonCtrl,
                maxLines: 3,
                autofocus: true,
                decoration: InputDecoration(
                  labelText: 'Catatan Alasan (Wajib) *',
                  hintText:
                      'Contoh: Lama tidak timbang (6 bulan), salah input sebelumnya, atau kondisi medis',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: isSubmitting ? null : () => Navigator.pop(ctx),
              child: const Text('Batal & Koreksi'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFD97706),
              ),
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final reason = reasonCtrl.text.trim();
                      if (reason.length < 3) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                                'Mohon tuliskan alasan minimal 3 karakter.'),
                            backgroundColor: AppColors.error,
                          ),
                        );
                        return;
                      }

                      setDialogState(() => isSubmitting = true);
                      try {
                        await ref.read(weightTrackerProvider.notifier).logWeight(
                              date: date,
                              weightKg: newWeight,
                              confirmAnomaly: true,
                              anomalyNote: reason,
                              notes: regularNote,
                            );
                        if (ctx.mounted) Navigator.pop(ctx);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                  'Perubahan berat terkonfirmasi & tersimpan!'),
                              backgroundColor: AppColors.primary,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      } catch (e) {
                        setDialogState(() => isSubmitting = false);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Gagal menyimpan: $e'),
                              backgroundColor: AppColors.error,
                            ),
                          );
                        }
                      }
                    },
              child: Text(isSubmitting ? 'Menyimpan...' : 'Ya, Data Benar'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(authStateProvider).user?.profile;
    final selectedDate = ref.watch(selectedDateProvider);
    final weightAsync = ref.watch(weightTrackerProvider);
    final profileWeight = profile?.weightKg ?? 65.0;

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
      child: weightAsync.when(
        loading: () => const Center(
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
        error: (_, _) => _buildContent(
          context,
          ref,
          currentWeight: profileWeight,
          date: selectedDate,
          evaluation: const WeightEvaluationModel(),
          logs: const [],
          bmi: profile?.biometrics?.bmi,
          bmiCategory: profile?.biometrics?.bmiCategory,
        ),
        data: (data) => _buildContent(
          context,
          ref,
          currentWeight: data.evaluation.currentWeightKg ?? profileWeight,
          date: selectedDate,
          evaluation: data.evaluation,
          logs: data.logs,
          bmi: profile?.biometrics?.bmi,
          bmiCategory: profile?.biometrics?.bmiCategory,
        ),
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    WidgetRef ref, {
    required double currentWeight,
    required String date,
    required WeightEvaluationModel evaluation,
    required List<WeightLogModel> logs,
    double? bmi,
    String? bmiCategory,
  }) {
    final isOptimal = evaluation.status == 'OPTIMAL';
    final isInsufficient = evaluation.status == 'INSUFFICIENT_DATA';
    final badgeBg = isInsufficient
        ? AppColors.surfaceContainerLow
        : isOptimal
            ? AppColors.secondaryFixed.withValues(alpha: 0.5)
            : const Color(0xFFFEF3C7);
    final badgeColor = isInsufficient
        ? AppColors.onSurfaceVariant
        : isOptimal
            ? AppColors.primary
            : const Color(0xFFB45309);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.secondaryFixed.withValues(alpha: 0.45),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(
                Icons.monitor_weight_rounded,
                color: AppColors.primary,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Berat Badan & Evaluasi',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                  ),
                  Text(
                    bmi != null
                        ? '${currentWeight.toStringAsFixed(1)} kg • BMI ${bmi.toStringAsFixed(1)} ($bmiCategory)'
                        : '${currentWeight.toStringAsFixed(1)} kg',
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: AppColors.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            FilledButton.icon(
              onPressed: () =>
                  _openLogWeightDialog(context, ref, currentWeight, date),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                minimumSize: Size.zero,
              ),
              icon: const Icon(Icons.add_rounded, size: 16),
              label: const Text(
                'Timbang',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        // Weekly Evaluation Box
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: badgeBg,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    isOptimal
                        ? Icons.verified_rounded
                        : isInsufficient
                            ? Icons.timeline_rounded
                            : Icons.insights_rounded,
                    size: 16,
                    color: badgeColor,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      evaluation.badge,
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 12.5,
                        color: badgeColor,
                      ),
                    ),
                  ),
                  if (evaluation.weeklyDeltaKg != null)
                    Text(
                      '${evaluation.weeklyDeltaKg! >= 0 ? '+' : ''}${evaluation.weeklyDeltaKg} kg',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 13,
                        color: badgeColor,
                      ),
                    ),
                ],
              ),
              if (evaluation.summary.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  evaluation.summary,
                  style: TextStyle(
                    fontSize: 12,
                    height: 1.35,
                    fontWeight: FontWeight.w600,
                    color: badgeColor.withValues(alpha: 0.9),
                  ),
                ),
              ],
            ],
          ),
        ),
        if (logs.isNotEmpty) ...[
          const SizedBox(height: 12),
          const Text(
            'Riwayat Timbangan Terbaru',
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 6),
          ...logs.take(4).map((entry) {
            final deltaLabel = entry.deltaKg == 0
                ? 'Awal'
                : '${entry.deltaKg > 0 ? '+' : ''}${entry.deltaKg.toStringAsFixed(1)} kg';
            return Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  Text(
                    entry.date,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: entry.isAnomaly && entry.anomalyNote != null
                        ? Row(
                            children: [
                              const Icon(
                                Icons.warning_amber_rounded,
                                size: 13,
                                color: Color(0xFFB45309),
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  entry.anomalyNote!,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    color: Color(0xFFB45309),
                                  ),
                                ),
                              ),
                            ],
                          )
                        : Text(
                            entry.notes ?? '',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: AppColors.outline,
                            ),
                          ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${entry.weightKg.toStringAsFixed(1)} kg',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 12.5,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      deltaLabel,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ],
    );
  }
}
