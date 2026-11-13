import 'package:flutter/material.dart';
import '../../../../app/theme/app_colors.dart';
import '../../../../shared/widgets/custom_button.dart';
import '../../../../shared/widgets/custom_text_field.dart';
import '../../data/models/food_item_model.dart';
import '../../data/models/meal_entry_model.dart';

class ManualFoodDialog extends StatefulWidget {
  final MealType initialMealType;
  final Function(FoodItem food, MealType mealType, double servings) onFoodCreated;

  const ManualFoodDialog({
    super.key,
    required this.initialMealType,
    required this.onFoodCreated,
  });

  @override
  State<ManualFoodDialog> createState() => _ManualFoodDialogState();
}

class _ManualFoodDialogState extends State<ManualFoodDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _caloriesController = TextEditingController();
  final _proteinController = TextEditingController(text: '0');
  final _carbsController = TextEditingController(text: '0');
  final _fatController = TextEditingController(text: '0');
  final _servingSizeController = TextEditingController(text: '1 porsi');

  late MealType _selectedMealType;
  double _servings = 1.0;

  @override
  void initState() {
    super.initState();
    _selectedMealType = widget.initialMealType;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _caloriesController.dispose();
    _proteinController.dispose();
    _carbsController.dispose();
    _fatController.dispose();
    _servingSizeController.dispose();
    super.dispose();
  }

  void _handleSubmit() {
    if (!_formKey.currentState!.validate()) return;

    final food = FoodItem(
      id: 'custom_${DateTime.now().millisecondsSinceEpoch}',
      name: _nameController.text.trim(),
      calories: double.tryParse(_caloriesController.text.trim()) ?? 0.0,
      proteins: double.tryParse(_proteinController.text.trim()) ?? 0.0,
      carbohydrates: double.tryParse(_carbsController.text.trim()) ?? 0.0,
      fat: double.tryParse(_fatController.text.trim()) ?? 0.0,
      servingSize: _servingSizeController.text.trim().isNotEmpty
          ? _servingSizeController.text.trim()
          : '1 porsi',
      source: 'manual',
    );

    Navigator.pop(context);
    widget.onFoodCreated(food, _selectedMealType, _servings);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      backgroundColor: AppColors.surface,
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.edit_note_rounded, color: AppColors.primary, size: 22),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Input Makanan Manual',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Catat makanan rumahan, jajanan, atau menu kustom Anda:',
                style: theme.textTheme.bodySmall?.copyWith(color: AppColors.outline),
              ),
              const SizedBox(height: 16),

              // Meal Type Selector
              const Text('Waktu Makan:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: MealType.values.map((type) {
                    final isSel = _selectedMealType == type;
                    return Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ChoiceChip(
                        label: Text('${type.icon} ${type.label}'),
                        selected: isSel,
                        selectedColor: AppColors.primary.withValues(alpha: 0.2),
                        labelStyle: TextStyle(
                          color: isSel ? AppColors.primary : AppColors.onSurface,
                          fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                          fontSize: 11,
                        ),
                        onSelected: (val) {
                          if (val) setState(() => _selectedMealType = type);
                        },
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 14),

              CustomTextField(
                label: 'Nama Makanan / Minuman',
                hint: 'Misal: Nasi Goreng Spesial',
                controller: _nameController,
                validator: (val) => val == null || val.trim().isEmpty ? 'Nama makanan wajib diisi' : null,
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: CustomTextField(
                      label: 'Kalori (kkal)*',
                      hint: 'Misal: 350',
                      controller: _caloriesController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'Wajib';
                        if (double.tryParse(val.trim()) == null) return 'Angka';
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: CustomTextField(
                      label: 'Takaran Porsi',
                      hint: 'Misal: 1 piring',
                      controller: _servingSizeController,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Macros (Optional)
              const Text('Makronutrisi (Opsional):', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: CustomTextField(
                      label: 'Protein (g)',
                      hint: '0',
                      controller: _proteinController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: CustomTextField(
                      label: 'Karbo (g)',
                      hint: '0',
                      controller: _carbsController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: CustomTextField(
                      label: 'Lemak (g)',
                      hint: '0',
                      controller: _fatController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Servings Stepper
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Jumlah Porsi:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove_circle_outline, color: AppColors.primary, size: 22),
                        onPressed: () {
                          if (_servings > 0.5) setState(() => _servings -= 0.5);
                        },
                      ),
                      Text(
                        '${_servings.toStringAsFixed(1)}x',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.add_circle_outline, color: AppColors.primary, size: 22),
                        onPressed: () => setState(() => _servings += 0.5),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Batal'),
        ),
        CustomButton(
          text: 'Simpan Makanan',
          onPressed: _handleSubmit,
        ),
      ],
    );
  }
}

