import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../app/theme/app_colors.dart';
import '../../../dashboard/providers/dashboard_provider.dart';
import '../../data/katalog_nusantara.dart';
import '../../data/models/food_item_model.dart';
import '../../data/models/meal_entry_model.dart';
import '../../providers/nutrition_provider.dart';
import 'manual_food_dialog.dart';

class AddFoodSheet extends ConsumerStatefulWidget {
  final MealType initialMealType;

  const AddFoodSheet({
    super.key,
    required this.initialMealType,
  });

  @override
  ConsumerState<AddFoodSheet> createState() => _AddFoodSheetState();
}

class _AddFoodSheetState extends ConsumerState<AddFoodSheet> {
  final _searchController = TextEditingController();
  late MealType _selectedMealType;
  String _filterType = 'all'; // 'all', 'local', 'openfoodfacts'

  List<FoodItem> _results = [];
  bool _isSearching = false;
  Timer? _debounceTimer;

  // Selected food for portion confirmation
  FoodItem? _selectedFood;
  double _servings = 1.0;

  @override
  void initState() {
    super.initState();
    _selectedMealType = widget.initialMealType;
    // Pre-populate with popular Indonesian foods
    _results = KatalogNusantara.items.take(15).toList();
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounceTimer?.cancel();
    if (query.trim().isEmpty) {
      setState(() {
        _isSearching = false;
        _results = KatalogNusantara.items.take(15).toList();
      });
      return;
    }

    setState(() => _isSearching = true);
    _debounceTimer = Timer(const Duration(milliseconds: 400), () async {
      final repo = ref.read(nutritionRepositoryProvider);
      final items = await repo.searchAllFoods(query);

      if (mounted) {
        setState(() {
          _isSearching = false;
          _results = items;
        });
      }
    });
  }

  Future<void> _handleAddFood(FoodItem food, double servings) async {
    final messenger = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);

    await ref.read(dailyNutritionProvider.notifier).addMeal(
          mealType: _selectedMealType,
          food: food,
          servings: servings,
        );

    ref.invalidate(dailyAnalyticsProvider);

    messenger.showSnackBar(
      SnackBar(
        content: Text(
          'Ditambahkan: ${food.name} (${(food.calories * servings).toInt()} kkal) ke ${_selectedMealType.label}',
        ),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
      ),
    );

    nav.pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Apply active filter
    final filteredResults = _results.where((item) {
      if (_filterType == 'local') return item.source == 'local';
      if (_filterType == 'openfoodfacts') return item.source == 'openfoodfacts';
      return true;
    }).toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      padding: const EdgeInsets.only(top: 16),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
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
          const SizedBox(height: 14),

          // Header & Meal Type Selector
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Tambah Makanan',
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      'Katalog Nusantara + Open Food Facts',
                      style: theme.textTheme.bodySmall?.copyWith(color: AppColors.outline),
                    ),
                  ],
                ),
                TextButton.icon(
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (_) => ManualFoodDialog(
                        initialMealType: _selectedMealType,
                        onFoodCreated: (food, mealType, servings) {
                          ref.read(nutritionRepositoryProvider).saveCustomFood(food);
                          _handleAddFood(food, servings);
                        },
                      ),
                    );
                  },
                  icon: const Icon(Icons.add_rounded, size: 18),
                  label: const Text('Input Manual'),
                  style: TextButton.styleFrom(foregroundColor: AppColors.primary),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Meal Type Selector Pills
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: MealType.values.map((type) {
                  final isSel = _selectedMealType == type;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text('${type.icon} ${type.label}'),
                      selected: isSel,
                      selectedColor: AppColors.primary.withValues(alpha: 0.18),
                      side: BorderSide(
                        color: isSel ? AppColors.primary : AppColors.surfaceContainerHigh,
                      ),
                      labelStyle: TextStyle(
                        color: isSel ? AppColors.primary : AppColors.onSurface,
                        fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                        fontSize: 12,
                      ),
                      onSelected: (val) {
                        if (val) setState(() => _selectedMealType = type);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Search Input Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Cari makanan: Nasi Padang, Telur, Indomie...',
                hintStyle: const TextStyle(fontSize: 13, color: AppColors.outline),
                prefixIcon: const Icon(Icons.search_rounded, color: AppColors.primary),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          _onSearchChanged('');
                        },
                      )
                    : null,
                filled: true,
                fillColor: AppColors.surfaceContainerLow,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Source Filter Chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                _buildFilterChip('Semua', 'all'),
                const SizedBox(width: 8),
                _buildFilterChip('🇮🇩 Nusantara', 'local'),
                const SizedBox(width: 8),
                _buildFilterChip('🌐 Open Food Facts', 'openfoodfacts'),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Search Progress or Results List
          if (_isSearching)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: SizedBox(
                  width: 28,
                  height: 28,
                  child: CircularProgressIndicator(strokeWidth: 2.5, color: AppColors.primary),
                ),
              ),
            )
          else if (filteredResults.isEmpty)
            Expanded(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(28),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.search_off_rounded, size: 48, color: AppColors.outline),
                      const SizedBox(height: 12),
                      const Text(
                        'Makanan tidak ditemukan',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Coba kata kunci lain atau gunakan tombol "Input Manual" untuk mencatat resep pribadi Anda.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: AppColors.outline),
                      ),
                      const SizedBox(height: 16),
                      FilledButton.icon(
                        onPressed: () {
                          showDialog(
                            context: context,
                            builder: (_) => ManualFoodDialog(
                              initialMealType: _selectedMealType,
                              onFoodCreated: (food, mealType, servings) {
                                ref.read(nutritionRepositoryProvider).saveCustomFood(food);
                                _handleAddFood(food, servings);
                              },
                            ),
                          );
                        },
                        style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                        icon: const Icon(Icons.edit_note_rounded, size: 18),
                        label: const Text('Input Manual Sekarang'),
                      ),
                    ],
                  ),
                ),
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                itemCount: filteredResults.length,
                separatorBuilder: (ctx, index) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final food = filteredResults[index];
                  final isSelected = _selectedFood?.id == food.id;

                  return Container(
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primary.withValues(alpha: 0.08)
                          : AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primary
                            : AppColors.surfaceContainerHigh,
                        width: isSelected ? 1.5 : 1,
                      ),
                    ),
                    child: Column(
                      children: [
                        ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                          onTap: () {
                            setState(() {
                              if (_selectedFood?.id == food.id) {
                                _selectedFood = null;
                              } else {
                                _selectedFood = food;
                                _servings = 1.0;
                              }
                            });
                          },
                          leading: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceContainerLow,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: food.imageUrl != null && food.imageUrl!.isNotEmpty
                                ? ClipRRect(
                                    borderRadius: BorderRadius.circular(12),
                                    child: Image.network(
                                      food.imageUrl!,
                                      fit: BoxFit.cover,
                                      errorBuilder: (ctx, err, stack) => const Icon(
                                        Icons.restaurant_rounded,
                                        color: AppColors.primary,
                                        size: 20,
                                      ),
                                    ),
                                  )
                                : const Icon(
                                    Icons.restaurant_rounded,
                                    color: AppColors.primary,
                                    size: 20,
                                  ),
                          ),
                          title: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  food.name,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: food.source == 'local'
                                      ? AppColors.primary.withValues(alpha: 0.12)
                                      : const Color(0xFF0284C7).withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  food.source == 'local' ? 'Nusantara' : 'OpenFood',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color: food.source == 'local'
                                        ? AppColors.primary
                                        : const Color(0xFF0284C7),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 2),
                              Text(
                                '${food.servingSize} • ${food.calories.toInt()} kkal',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'P: ${food.proteins.toStringAsFixed(1)}g • K: ${food.carbohydrates.toStringAsFixed(1)}g • L: ${food.fat.toStringAsFixed(1)}g',
                                style: const TextStyle(fontSize: 11, color: AppColors.outline),
                              ),
                            ],
                          ),
                          trailing: isSelected
                              ? IconButton(
                                  icon: const Icon(
                                    Icons.expand_less_rounded,
                                    color: AppColors.primary,
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      _selectedFood = null;
                                    });
                                  },
                                )
                              : FilledButton.tonalIcon(
                                  onPressed: () => _handleAddFood(food, 1.0),
                                  style: FilledButton.styleFrom(
                                    visualDensity: VisualDensity.compact,
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 6,
                                    ),
                                    backgroundColor: AppColors.secondaryFixed
                                        .withValues(alpha: 0.7),
                                  ),
                                  icon: const Icon(
                                    Icons.add_rounded,
                                    size: 15,
                                    color: AppColors.primary,
                                  ),
                                  label: const Text(
                                    'Tambah',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ),
                        ),

                        // Inline portion selector when food is tapped
                        if (isSelected)
                          Container(
                            padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.04),
                              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                            ),
                            child: Row(
                              children: [
                                const Text('Porsi:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                                const SizedBox(width: 8),
                                ...[0.5, 1.0, 1.5, 2.0].map((s) {
                                  final isP = _servings == s;
                                  return Padding(
                                    padding: const EdgeInsets.only(right: 6),
                                    child: InkWell(
                                      onTap: () => setState(() => _servings = s),
                                      borderRadius: BorderRadius.circular(8),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: isP ? AppColors.primary : AppColors.surfaceContainerLow,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          '${s}x',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: isP ? Colors.white : AppColors.onSurface,
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                }),
                                const Spacer(),
                                FilledButton.icon(
                                  onPressed: () => _handleAddFood(food, _servings),
                                  style: FilledButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  icon: const Icon(Icons.check, size: 16),
                                  label: Text(
                                    '+ Tambah (${(food.calories * _servings).toInt()} kkal)',
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String key) {
    final isSel = _filterType == key;
    return InkWell(
      onTap: () => setState(() => _filterType = key),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isSel ? AppColors.primary.withValues(alpha: 0.15) : AppColors.surfaceContainerLow,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSel ? AppColors.primary : Colors.transparent,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
            color: isSel ? AppColors.primary : AppColors.onSurface,
          ),
        ),
      ),
    );
  }
}
