import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'katalog_nusantara.dart';
import 'models/food_item_model.dart';
import 'models/meal_entry_model.dart';

class NutritionRepository {
  final Dio _dio;

  static const _customFoodsKey = 'lifesync_custom_foods';
  static const _calorieGoalKey = 'lifesync_calorie_goal';
  static const _mealsPrefix = 'lifesync_meals_';

  NutritionRepository()
      : _dio = Dio(
          BaseOptions(
            connectTimeout: const Duration(seconds: 8),
            receiveTimeout: const Duration(seconds: 8),
            headers: {
              'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 LifeSyncApp/1.0',
            },
          ),
        );

  // 1. Search Open Food Facts API
  Future<List<FoodItem>> searchOpenFoodFacts(String query) async {
    if (query.trim().isEmpty) return [];

    try {
      // Query Indonesian portal first for relevant local food data
      final encodedQuery = Uri.encodeComponent(query.trim());
      final url =
          'https://id.openfoodfacts.net/cgi/search.pl?search_terms=$encodedQuery&search_simple=1&action=process&json=1&page_size=15';

      final response = await _dio.get(url);

      if (response.statusCode == 200 && response.data is Map<String, dynamic>) {
        final products = response.data['products'] as List? ?? [];
        return products
            .where((p) => p is Map<String, dynamic> && (p['product_name'] != null || p['product_name_en'] != null))
            .map((p) => FoodItem.fromOpenFoodFacts(p as Map<String, dynamic>))
            .where((f) => f.name.trim().isNotEmpty && f.calories > 0)
            .toList();
      }
    } catch (_) {
      // Fallback to world portal if id portal is slow
      try {
        final encodedQuery = Uri.encodeComponent(query.trim());
        final fallbackUrl =
            'https://world.openfoodfacts.net/cgi/search.pl?search_terms=$encodedQuery&search_simple=1&action=process&json=1&page_size=15';
        final response = await _dio.get(fallbackUrl);
        if (response.statusCode == 200 && response.data is Map<String, dynamic>) {
          final products = response.data['products'] as List? ?? [];
          return products
              .where((p) => p is Map<String, dynamic> && p['product_name'] != null)
              .map((p) => FoodItem.fromOpenFoodFacts(p as Map<String, dynamic>))
              .where((f) => f.name.trim().isNotEmpty && f.calories > 0)
              .toList();
        }
      } catch (_) {}
    }
    return [];
  }

  // 2. Hybrid Search (Nusantara Catalog + Custom User Foods + Open Food Facts)
  Future<List<FoodItem>> searchAllFoods(String query) async {
    final localResults = KatalogNusantara.search(query);
    final customResults = await searchCustomFoods(query);

    List<FoodItem> onlineResults = [];
    if (query.trim().length >= 2) {
      try {
        onlineResults = await searchOpenFoodFacts(query);
      } catch (_) {}
    }

    final Map<String, FoodItem> combined = {};
    for (final item in customResults) {
      combined[item.name.toLowerCase()] = item;
    }
    for (final item in localResults) {
      combined.putIfAbsent(item.name.toLowerCase(), () => item);
    }
    for (final item in onlineResults) {
      combined.putIfAbsent(item.name.toLowerCase(), () => item);
    }

    return combined.values.toList();
  }

  // 3. Custom Manual Foods Saved by User
  Future<List<FoodItem>> getCustomFoods() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_customFoodsKey);
    if (raw == null || raw.isEmpty) return [];

    try {
      final list = jsonDecode(raw) as List;
      return list.map((j) => FoodItem.fromJson(j as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> saveCustomFood(FoodItem food) async {
    final prefs = await SharedPreferences.getInstance();
    final current = await getCustomFoods();
    current.removeWhere((f) => f.id == food.id || f.name.toLowerCase() == food.name.toLowerCase());
    current.insert(0, food);

    final raw = jsonEncode(current.map((f) => f.toJson()).toList());
    await prefs.setString(_customFoodsKey, raw);
  }

  Future<List<FoodItem>> searchCustomFoods(String query) async {
    final all = await getCustomFoods();
    if (query.trim().isEmpty) return all;
    final q = query.toLowerCase().trim();
    return all.where((f) => f.name.toLowerCase().contains(q)).toList();
  }

  // 4. Daily Meals Storage
  Future<List<MealEntry>> getMealsForDate(String date) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_mealsPrefix$date');
    if (raw == null || raw.isEmpty) return [];

    try {
      final list = jsonDecode(raw) as List;
      return list.map((j) => MealEntry.fromJson(j as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> addMealEntry(MealEntry entry) async {
    final prefs = await SharedPreferences.getInstance();
    final meals = await getMealsForDate(entry.date);
    meals.add(entry);

    final raw = jsonEncode(meals.map((m) => m.toJson()).toList());
    await prefs.setString('$_mealsPrefix${entry.date}', raw);
  }

  Future<void> removeMealEntry(String date, String entryId) async {
    final prefs = await SharedPreferences.getInstance();
    final meals = await getMealsForDate(date);
    meals.removeWhere((m) => m.id == entryId);

    final raw = jsonEncode(meals.map((m) => m.toJson()).toList());
    await prefs.setString('$_mealsPrefix$date', raw);
  }

  // 5. Daily Calorie Goal (Default 2000 kcal)
  Future<int> getDailyCalorieGoal() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_calorieGoalKey) ?? 2000;
  }

  Future<void> setDailyCalorieGoal(int goalKcal) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_calorieGoalKey, goalKcal);
  }
}

