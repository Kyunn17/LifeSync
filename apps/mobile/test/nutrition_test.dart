import 'package:flutter_test/flutter_test.dart';
import 'package:lifesync_mobile/features/nutrition/data/katalog_nusantara.dart';
import 'package:lifesync_mobile/features/nutrition/data/models/food_item_model.dart';
import 'package:lifesync_mobile/features/nutrition/data/models/meal_entry_model.dart';
import 'package:lifesync_mobile/features/nutrition/providers/nutrition_provider.dart';

void main() {
  group('Nutrition Models & Catalog Tests', () {
    test('Katalog Nusantara contains rich Indonesian staple food items', () {
      expect(KatalogNusantara.items.length, greaterThanOrEqualTo(40));

      final nasiGoreng = KatalogNusantara.items.firstWhere((f) => f.name.contains('Nasi Goreng'));
      expect(nasiGoreng.calories, greaterThan(250));
      expect(nasiGoreng.source, 'local');
    });

    test('FoodItem calculates calories per serving accurately', () {
      const food = FoodItem(
        id: 'test_1',
        name: 'Dada Ayam Panggang',
        calories: 165,
        proteins: 31,
        carbohydrates: 0,
        fat: 3.6,
        servingSize: '100g',
        source: 'manual',
      );

      final entry = MealEntry(
        id: 'entry_1',
        date: '2026-11-13',
        mealType: MealType.lunch,
        food: food,
        servings: 2.0,
        loggedAt: DateTime.now(),
      );

      expect(entry.totalCalories, 330.0);
      expect(entry.totalProteins, 62.0);
      expect(entry.totalCarbs, 0.0);
      expect(entry.totalFat, closeTo(7.2, 0.01));
    });

    test('Open Food Facts JSON parser parses product properly', () {
      final json = {
        'code': '8991234567890',
        'product_name': 'Ultra Milk Cokelat 250ml',
        'brands': 'Ultra Jaya',
        'nutriments': {
          'energy-kcal_100g': 80.0,
          'proteins_100g': 3.2,
          'carbohydrates_100g': 12.0,
          'fat_100g': 2.0,
        },
        'serving_size': '250 ml',
        'image_url': 'https://example.com/ultramilk.jpg',
      };

      final item = FoodItem.fromOpenFoodFacts(json);
      expect(item.name, 'Ultra Milk Cokelat 250ml');
      expect(item.brand, 'Ultra Jaya');
      expect(item.calories, 80.0);
      expect(item.proteins, 3.2);
      expect(item.carbohydrates, 12.0);
      expect(item.fat, 2.0);
      expect(item.source, 'openfoodfacts');
    });

    test('DailyNutritionState correctly aggregates calories and macros', () {
      const food1 = FoodItem(
        id: '1',
        name: 'Nasi Putih',
        calories: 204,
        proteins: 4.2,
        carbohydrates: 44.5,
        fat: 0.4,
        servingSize: '1 porsi (150g)',
        source: 'local',
      );

      const food2 = FoodItem(
        id: '2',
        name: 'Telur Dadar',
        calories: 154,
        proteins: 10.0,
        carbohydrates: 1.0,
        fat: 11.0,
        servingSize: '1 butir',
        source: 'local',
      );

      final entry1 = MealEntry(
        id: 'm1',
        date: '2026-11-13',
        mealType: MealType.breakfast,
        food: food1,
        servings: 1.0,
        loggedAt: DateTime.now(),
      );

      final entry2 = MealEntry(
        id: 'm2',
        date: '2026-11-13',
        mealType: MealType.lunch,
        food: food2,
        servings: 2.0,
        loggedAt: DateTime.now(),
      );

      final state = DailyNutritionState(
        date: '2026-11-13',
        targetCalories: 2000,
        meals: [entry1, entry2],
      );

      // Consumed: 204 + (154 * 2) = 512
      expect(state.consumedCalories, 512.0);
      expect(state.remainingCalories, 1488.0);
      expect(state.calorieProgress, closeTo(0.256, 0.001));

      // Macros
      expect(state.consumedProteins, 24.2);
      expect(state.consumedCarbs, 46.5);
      expect(state.consumedFat, 22.4);

      // Filtering by type
      expect(state.getMealsByType(MealType.breakfast).length, 1);
      expect(state.getCaloriesByType(MealType.lunch), 308.0);
      expect(state.getMealsByType(MealType.dinner).isEmpty, isTrue);
    });
  });
}
