import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../app/theme/app_colors.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../data/models/meal_entry_model.dart';
import '../providers/nutrition_provider.dart';
import 'widgets/add_food_sheet.dart';
import 'widgets/macro_progress_bar.dart';

class CalorieTrackerScreen extends ConsumerWidget {
  const CalorieTrackerScreen({super.key});

  void _changeDate(WidgetRef ref, int deltaDays) {
    final currentStr = ref.read(selectedDateProvider);
    final dt = DateTime.tryParse(currentStr) ?? DateTime.now();
    final newDt = dt.add(Duration(days: deltaDays));
    final newDateStr = DateFormat('yyyy-MM-dd').format(newDt);
    ref.read(selectedDateProvider.notifier).state = newDateStr;
    ref.read(dailyNutritionProvider.notifier).loadDailyMeals(newDateStr);
  }

  void _openCalorieGoalDialog(BuildContext context, WidgetRef ref, int currentGoal) {
    final controller = TextEditingController(text: currentGoal.toString());

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Text('Target Kalori Harian'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Sesuaikan target kalori harian Anda (kkal):',
              style: TextStyle(fontSize: 13, color: AppColors.outline),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              autofocus: true,
              decoration: InputDecoration(
                suffixText: 'kkal',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [1800, 2000, 2200, 2500].map((k) {
                return ActionChip(
                  label: Text('$k kkal'),
                  onPressed: () => controller.text = k.toString(),
                );
              }).toList(),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () {
              final newGoal = int.tryParse(controller.text.trim());
              if (newGoal != null && newGoal > 500) {
                ref.read(dailyNutritionProvider.notifier).updateCalorieGoal(newGoal);
              }
              Navigator.pop(ctx);
            },
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
  }

  void _openAddFoodSheet(BuildContext context, MealType mealType) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddFoodSheet(initialMealType: mealType),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final selectedDate = ref.watch(selectedDateProvider);
    final nutrition = ref.watch(dailyNutritionProvider);

    final displayDate = DateFormat('EEEE, d MMMM yyyy', 'id_ID').format(
      DateTime.tryParse(selectedDate) ?? DateTime.now(),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Calorie & Nutrition Tracker'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left_rounded),
                  onPressed: () => _changeDate(ref, -1),
                ),
                Text(
                  displayDate,
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right_rounded),
                  onPressed: () => _changeDate(ref, 1),
                ),
              ],
            ),
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 96),
        children: [
          // 1. Calorie Summary Hero Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0A4D36), Color(0xFF0D7A53)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.25),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
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
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.16),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.local_fire_department_rounded, size: 14, color: Colors.orangeAccent),
                          SizedBox(width: 4),
                          Text(
                            'NUTRISI HARIAN',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ],
                      ),
                    ),
                    InkWell(
                      onTap: () => _openCalorieGoalDialog(context, ref, nutrition.targetCalories),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.edit_outlined, size: 12, color: Colors.white),
                            SizedBox(width: 4),
                            Text(
                              'Target',
                              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Numbers Display
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${nutrition.consumedCalories.toInt()}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 38,
                        fontWeight: FontWeight.w900,
                        height: 1.0,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        '/ ${nutrition.targetCalories} kkal',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.75),
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text(
                            'Sisa Kalori',
                            style: TextStyle(color: Colors.white70, fontSize: 10),
                          ),
                          Text(
                            '${nutrition.remainingCalories.toInt()} kkal',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Linear Calorie Progress
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: nutrition.calorieProgress,
                    minHeight: 8,
                    backgroundColor: Colors.white.withValues(alpha: 0.2),
                    valueColor: AlwaysStoppedAnimation<Color>(
                      nutrition.consumedCalories > nutrition.targetCalories
                          ? Colors.orangeAccent
                          : Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 2. Macronutrients Card (Protein, Karbo, Lemak)
          Container(
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
                    Text(
                      'Distribusi Makronutrisi',
                      style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      'Total ${(nutrition.consumedProteins + nutrition.consumedCarbs + nutrition.consumedFat).toStringAsFixed(0)}g',
                      style: const TextStyle(fontSize: 11, color: AppColors.outline),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                MacroProgressBar(
                  proteins: nutrition.consumedProteins,
                  carbs: nutrition.consumedCarbs,
                  fat: nutrition.consumedFat,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 3. Four Meal Sections
          ...MealType.values.map((mealType) {
            final meals = nutrition.getMealsByType(mealType);
            final subtotalKcal = nutrition.getCaloriesByType(mealType);

            return Container(
              margin: const EdgeInsets.only(bottom: 14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.surfaceContainerHigh),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Meal Header Row
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 12, 10),
                    child: Row(
                      children: [
                        Text(mealType.icon, style: const TextStyle(fontSize: 20)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                mealType.label,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                              Text(
                                '${subtotalKcal.toInt()} kkal',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                        FilledButton.tonalIcon(
                          onPressed: () => _openAddFoodSheet(context, mealType),
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: const Icon(Icons.add, size: 16),
                          label: const Text('Tambah', style: TextStyle(fontSize: 12)),
                        ),
                      ],
                    ),
                  ),

                  // Meal Items List or Empty state
                  if (meals.isEmpty)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                      child: Text(
                        'Belum ada makanan dicatat untuk ${mealType.label.toLowerCase()}.',
                        style: const TextStyle(fontSize: 12, color: AppColors.outline),
                      ),
                    )
                  else
                    ...meals.map((entry) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          border: Border(
                            top: BorderSide(color: AppColors.surfaceContainerLow),
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    entry.food.name,
                                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${entry.servings}x porsi • P: ${entry.totalProteins.toStringAsFixed(1)}g • K: ${entry.totalCarbs.toStringAsFixed(1)}g • L: ${entry.totalFat.toStringAsFixed(1)}g',
                                    style: const TextStyle(fontSize: 11, color: AppColors.outline),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              '${entry.totalCalories.toInt()} kkal',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.outline),
                              onPressed: () async {
                                await ref.read(dailyNutritionProvider.notifier).removeMeal(entry.id);
                              },
                            ),
                          ],
                        ),
                      );
                    }),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

