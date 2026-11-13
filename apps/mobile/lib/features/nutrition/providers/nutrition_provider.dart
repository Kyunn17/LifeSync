import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../data/models/food_item_model.dart';
import '../data/models/meal_entry_model.dart';
import '../data/nutrition_repository.dart';

final nutritionRepositoryProvider = Provider<NutritionRepository>((ref) {
  return NutritionRepository();
});

class DailyNutritionState {
  final String date;
  final int targetCalories;
  final List<MealEntry> meals;
  final bool isLoading;

  const DailyNutritionState({
    required this.date,
    this.targetCalories = 2000,
    this.meals = const [],
    this.isLoading = false,
  });

  double get consumedCalories => meals.fold(0.0, (sum, m) => sum + m.totalCalories);
  double get consumedProteins => meals.fold(0.0, (sum, m) => sum + m.totalProteins);
  double get consumedCarbs => meals.fold(0.0, (sum, m) => sum + m.totalCarbs);
  double get consumedFat => meals.fold(0.0, (sum, m) => sum + m.totalFat);

  double get remainingCalories => (targetCalories - consumedCalories).clamp(0.0, targetCalories.toDouble());
  double get calorieProgress => targetCalories > 0 ? (consumedCalories / targetCalories).clamp(0.0, 1.0) : 0.0;

  List<MealEntry> getMealsByType(MealType type) {
    return meals.where((m) => m.mealType == type).toList();
  }

  double getCaloriesByType(MealType type) {
    return getMealsByType(type).fold(0.0, (sum, m) => sum + m.totalCalories);
  }

  DailyNutritionState copyWith({
    String? date,
    int? targetCalories,
    List<MealEntry>? meals,
    bool? isLoading,
  }) {
    return DailyNutritionState(
      date: date ?? this.date,
      targetCalories: targetCalories ?? this.targetCalories,
      meals: meals ?? this.meals,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class DailyNutritionNotifier extends StateNotifier<DailyNutritionState> {
  final NutritionRepository _repo;

  DailyNutritionNotifier(this._repo, String initialDate)
      : super(DailyNutritionState(date: initialDate)) {
    loadDailyMeals(initialDate);
  }

  Future<void> loadDailyMeals(String date) async {
    state = state.copyWith(date: date, isLoading: true);
    final target = await _repo.getDailyCalorieGoal();
    final meals = await _repo.getMealsForDate(date);
    state = DailyNutritionState(
      date: date,
      targetCalories: target,
      meals: meals,
      isLoading: false,
    );
  }

  Future<void> addMeal({
    required MealType mealType,
    required FoodItem food,
    double servings = 1.0,
  }) async {
    final entry = MealEntry(
      id: 'meal_${DateTime.now().millisecondsSinceEpoch}',
      date: state.date,
      mealType: mealType,
      food: food,
      servings: servings,
      loggedAt: DateTime.now(),
    );

    await _repo.addMealEntry(entry);
    await loadDailyMeals(state.date);
  }

  Future<void> removeMeal(String entryId) async {
    await _repo.removeMealEntry(state.date, entryId);
    await loadDailyMeals(state.date);
  }

  Future<void> updateCalorieGoal(int goalKcal) async {
    await _repo.setDailyCalorieGoal(goalKcal);
    state = state.copyWith(targetCalories: goalKcal);
  }
}

final dailyNutritionProvider =
    StateNotifierProvider<DailyNutritionNotifier, DailyNutritionState>((ref) {
  final repo = ref.watch(nutritionRepositoryProvider);
  final selectedDate = ref.watch(selectedDateProvider);
  return DailyNutritionNotifier(repo, selectedDate);
});
