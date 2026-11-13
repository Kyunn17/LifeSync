import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/status_banner.dart';
import '../providers/auth_provider.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  int _passwordStrength = 0;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _updatePasswordStrength(String val) {
    int score = 0;
    if (val.length >= 8) score++;
    if (RegExp(r'[A-Z]').hasMatch(val)) score++;
    if (RegExp(r'[0-9]').hasMatch(val)) score++;
    if (val.length >= 12 || RegExp(r'[^A-Za-z0-9]').hasMatch(val)) score++;
    setState(() {
      _passwordStrength = score;
    });
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(authStateProvider.notifier).signUp(
          _nameController.text.trim(),
          _emailController.text.trim(),
          _passwordController.text,
        );

    if (mounted && success) {
      context.push('/verify-otp');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authStateProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.surface,
              shape: BoxShape.circle,
              border: Border.all(
                color: AppColors.outlineVariant.withValues(alpha: 0.35),
              ),
            ),
            child: const Icon(Icons.arrow_back_rounded, size: 18),
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Daftar Akun Baru',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w800,
            color: AppColors.primary,
          ),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.secondaryFixed.withValues(alpha: 0.45),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.person_add_alt_1_rounded,
              size: 18,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Brand Emblem & Header
                Center(
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        width: 68,
                        height: 68,
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(22),
                          boxShadow: AppColors.bentoShadow,
                        ),
                        child: const Icon(
                          Icons.spa_rounded,
                          color: Colors.white,
                          size: 32,
                        ),
                      ),
                      Positioned(
                        bottom: -4,
                        right: -4,
                        child: Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            color: AppColors.secondaryFixed,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: const Icon(
                            Icons.bolt_rounded,
                            size: 14,
                            color: AppColors.onPrimaryFixed,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'Mulai Perjalanan Anda',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Daftar akun LifeSync untuk mengelola jadwal 24 jam, nutrisi, dan kebiasaan hidup seimbang.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 16),

                // 3 Feature Benefit Micro-Pills (Stitch Design)
                Row(
                  children: [
                    _buildBenefitPill(
                      icon: Icons.schedule_rounded,
                      label: 'Sirkadian',
                      iconColor: AppColors.primary,
                      bgColor: AppColors.secondaryFixed.withValues(alpha: 0.4),
                    ),
                    const SizedBox(width: 8),
                    _buildBenefitPill(
                      icon: Icons.restaurant_menu_rounded,
                      label: 'Nutrisi',
                      iconColor: const Color(0xFFD97706),
                      bgColor: const Color(0xFFFEF3C7),
                    ),
                    const SizedBox(width: 8),
                    _buildBenefitPill(
                      icon: Icons.monitor_heart_outlined,
                      label: 'Biometrik',
                      iconColor: AppColors.tertiary,
                      bgColor: AppColors.tertiaryFixed.withValues(alpha: 0.6),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Main Registration Bento Card
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(28),
                    boxShadow: AppColors.bentoShadow,
                    border: Border.all(
                      color: AppColors.outlineVariant.withValues(alpha: 0.25),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (authState.errorMessage != null) ...[
                        StatusBanner(
                          message: authState.errorMessage!,
                          type: BannerType.error,
                        ),
                        const SizedBox(height: 18),
                      ],

                      CustomTextField(
                        label: 'Nama Lengkap',
                        hint: 'Misal: Budi Santoso',
                        controller: _nameController,
                        prefixIcon: Icons.badge_outlined,
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Nama wajib diisi';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      CustomTextField(
                        label: 'Alamat Email',
                        hint: 'nama@gmail.com',
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        prefixIcon: Icons.mail_outline_rounded,
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Email wajib diisi';
                          }
                          if (!val.contains('@') || !val.contains('.')) {
                            return 'Format email tidak valid';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      CustomTextField(
                        label: 'Kata Sandi',
                        hint: 'Minimal 8 karakter',
                        controller: _passwordController,
                        isPassword: true,
                        prefixIcon: Icons.lock_outline_rounded,
                        onChanged: _updatePasswordStrength,
                        validator: (val) {
                          if (val == null || val.isEmpty) {
                            return 'Kata sandi wajib diisi';
                          }
                          if (val.length < 8) {
                            return 'Minimal 8 karakter';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 10),

                      // Live 4-Bar Password Strength Meter
                      Row(
                        children: List.generate(4, (index) {
                          final active = index < _passwordStrength;
                          return Expanded(
                            child: Container(
                              height: 5,
                              margin: EdgeInsets.only(right: index < 3 ? 6 : 0),
                              decoration: BoxDecoration(
                                color: active
                                    ? AppColors.primaryContainer
                                    : AppColors.surfaceContainerHigh,
                                borderRadius: BorderRadius.circular(99),
                              ),
                            ),
                          );
                        }),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _passwordStrength >= 3
                                ? 'Kekuatan: Kuat & Aman'
                                : _passwordStrength >= 1
                                    ? 'Kekuatan: Cukup (Min. 8 karakter)'
                                    : 'Gunakan kombinasi huruf & angka',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: _passwordStrength >= 2
                                  ? AppColors.primary
                                  : AppColors.outline,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const Icon(
                            Icons.shield_outlined,
                            size: 14,
                            color: AppColors.primary,
                          ),
                        ],
                      ),
                      const SizedBox(height: 22),

                      CustomButton(
                        text: 'Daftar Akun Baru',
                        icon: Icons.arrow_forward_rounded,
                        isLoading: authState.isLoading,
                        onPressed: _handleRegister,
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 18),

                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Sudah punya akun? ',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => context.pop(),
                      child: Text(
                        'Masuk di Sini',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBenefitPill({
    IconData? icon,
    IconData? fallbackIcon,
    required String label,
    required Color iconColor,
    required Color bgColor,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: AppColors.outlineVariant.withValues(alpha: 0.25),
          ),
        ),
        child: Column(
          children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: bgColor,
                shape: BoxShape.circle,
              ),
              child: Icon(
                fallbackIcon ?? icon,
                size: 16,
                color: iconColor,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppColors.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
