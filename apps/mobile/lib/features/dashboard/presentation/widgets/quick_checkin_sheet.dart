import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../app/theme/app_colors.dart';
import '../../../../shared/widgets/custom_button.dart';
import '../../../../shared/widgets/custom_text_field.dart';
import '../../../wellness/presentation/wellness_screen.dart';
import '../../providers/dashboard_provider.dart';

class QuickCheckinSheet extends ConsumerStatefulWidget {
  final String date;
  final String currentMood;
  final int currentEnergy;

  const QuickCheckinSheet({
    super.key,
    required this.date,
    required this.currentMood,
    required this.currentEnergy,
  });

  @override
  ConsumerState<QuickCheckinSheet> createState() => _QuickCheckinSheetState();
}

class _QuickCheckinSheetState extends ConsumerState<QuickCheckinSheet> {
  late String _selectedMood;
  late double _energyLevel;
  final _reflectionController = TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _selectedMood = widget.currentMood;
    _energyLevel = widget.currentEnergy.toDouble().clamp(10.0, 100.0);
  }

  @override
  void dispose() {
    _reflectionController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    setState(() => _isLoading = true);
    try {
      await ref.read(dashboardRepositoryProvider).logCheckin(
            date: widget.date,
            mood: _selectedMood,
            energyLevel: _energyLevel.toInt(),
            reflection: _reflectionController.text.trim(),
          );
      ref.invalidate(dailyAnalyticsProvider);
      if (mounted) Navigator.pop(context, true);
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: EdgeInsets.only(
        top: 24,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.secondaryContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.mood_rounded, size: 20, color: AppColors.primary),
                ),
                const SizedBox(width: 12),
                Text(
                  'Check-In Mood & Energi',
                  style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 20),
            const Text('Bagaimana perasaan Anda saat ini?', style: TextStyle(fontWeight: FontWeight.w600)),
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
            const SizedBox(height: 18),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Tingkat Energi', style: TextStyle(fontWeight: FontWeight.w600)),
                Text(
                  '${_energyLevel.toInt()}%',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 16),
                ),
              ],
            ),
            Slider(
              value: _energyLevel,
              min: 10,
              max: 100,
              divisions: 18,
              activeColor: AppColors.primary,
              onChanged: (val) => setState(() => _energyLevel = val),
            ),
            const SizedBox(height: 12),
            CustomTextField(
              label: 'Refleksi Singkat (Opsional)',
              hint: 'Apa yang membuat hari ini berarti?',
              controller: _reflectionController,
              maxLines: 2,
            ),
            const SizedBox(height: 24),
            CustomButton(
              text: 'Simpan Check-In',
              isLoading: _isLoading,
              onPressed: _handleSave,
            ),
          ],
        ),
      ),
    );
  }
}

