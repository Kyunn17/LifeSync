import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../core/errors/failure.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/status_banner.dart';
import '../providers/auth_provider.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  final String? initialEmail;

  const ForgotPasswordScreen({super.key, this.initialEmail});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _emailFormKey = GlobalKey<FormState>();
  final _passwordFormKey = GlobalKey<FormState>();

  late final TextEditingController _emailController;
  final TextEditingController _otpController = TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();
  final FocusNode _otpFocusNode = FocusNode();

  int _step = 1; // 1: Email, 2: 5-digit OTP, 3: New Password
  bool _isLoading = false;
  bool _isResending = false;
  int _resendCooldown = 0;
  Timer? _cooldownTimer;

  String? _resetToken;
  String? _errorMessage;
  String? _infoMessage;

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController(text: widget.initialEmail ?? '');
  }

  @override
  void dispose() {
    _cooldownTimer?.cancel();
    _emailController.dispose();
    _otpController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    _otpFocusNode.dispose();
    super.dispose();
  }

  void _startCooldown() {
    _cooldownTimer?.cancel();
    setState(() => _resendCooldown = 60);
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_resendCooldown <= 1) {
        timer.cancel();
        setState(() => _resendCooldown = 0);
      } else {
        setState(() => _resendCooldown -= 1);
      }
    });
  }

  String _extractErrorMessage(Object e) {
    if (e is Failure) return e.message;
    return 'Terjadi kesalahan. Silakan coba lagi.';
  }

  Future<void> _handleSendOtp() async {
    if (!_emailFormKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _infoMessage = null;
    });

    try {
      await ref
          .read(authRepositoryProvider)
          .requestPasswordResetOtp(email: _emailController.text.trim());
      if (!mounted) return;
      _otpController.clear();
      setState(() {
        _isLoading = false;
        _step = 2;
        _infoMessage =
            'Kode OTP 5 digit telah dikirim ke kotak masuk Gmail Anda.';
      });
      _startCooldown();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMessage = _extractErrorMessage(e);
      });
    }
  }

  Future<void> _handleResendOtp() async {
    if (_resendCooldown > 0 || _isResending) return;

    setState(() {
      _isResending = true;
      _errorMessage = null;
      _infoMessage = null;
    });

    try {
      await ref
          .read(authRepositoryProvider)
          .requestPasswordResetOtp(email: _emailController.text.trim());
      if (!mounted) return;
      _otpController.clear();
      setState(() {
        _isResending = false;
        _infoMessage = 'Kode OTP 5 digit baru telah dikirim ke email Anda.';
      });
      _startCooldown();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isResending = false;
        _errorMessage = _extractErrorMessage(e);
      });
    }
  }

  Future<void> _handleVerifyOtp() async {
    final code = _otpController.text.trim();
    if (code.length != 5 || _isLoading) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _infoMessage = null;
    });

    try {
      final token = await ref
          .read(authRepositoryProvider)
          .verifyPasswordResetOtp(
            email: _emailController.text.trim(),
            code: code,
          );
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _resetToken = token;
        _step = 3;
        _infoMessage = 'Kode OTP valid. Silakan buat kata sandi baru Anda.';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMessage = _extractErrorMessage(e);
      });
    }
  }

  Future<void> _handleResetPassword() async {
    if (!_passwordFormKey.currentState!.validate()) return;
    final token = _resetToken;
    if (token == null || token.isEmpty) {
      setState(() {
        _errorMessage =
            'Sesi reset tidak valid. Silakan verifikasi ulang kode OTP.';
        _step = 2;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _infoMessage = null;
    });

    try {
      await ref.read(authRepositoryProvider).resetPassword(
            email: _emailController.text.trim(),
            resetToken: token,
            newPassword: _newPasswordController.text,
          );
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Kata sandi berhasil diperbarui! Silakan masuk kembali.',
          ),
          backgroundColor: AppColors.primary,
          behavior: SnackBarBehavior.floating,
        ),
      );
      context.go('/login');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMessage = _extractErrorMessage(e);
      });
    }
  }

  void _handleBack() {
    if (_step > 1) {
      setState(() {
        _step -= 1;
        _errorMessage = null;
        _infoMessage = null;
      });
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final emailDisplay = _emailController.text.trim();

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
          onPressed: _handleBack,
        ),
        title: Text(
          'Lupa Kata Sandi',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w800,
            color: AppColors.onSurface,
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Main Bento Card
              Container(
                padding: const EdgeInsets.all(24),
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
                    // Step Badge Pill
                    Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.secondaryFixed.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          'Langkah $_step dari 3',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),

                    // Header Icon Emblem
                    Center(
                      child: Container(
                        width: 74,
                        height: 74,
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerLow,
                          borderRadius: BorderRadius.circular(22),
                        ),
                        child: Icon(
                          _step == 1
                              ? Icons.lock_reset_rounded
                              : _step == 2
                                  ? Icons.mark_email_read_rounded
                                  : Icons.password_rounded,
                          size: 38,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),

                    Text(
                      _step == 1
                          ? 'Atur Ulang Kata Sandi'
                          : _step == 2
                              ? 'Masukkan Kode OTP'
                              : 'Buat Kata Sandi Baru',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _step == 1
                          ? 'Masukkan alamat email akun LifeSync Anda untuk menerima kode verifikasi OTP 5-digit via email.'
                          : _step == 2
                              ? 'Masukkan 5 digit kode OTP yang telah kami kirimkan ke email Anda:'
                              : 'Buat kata sandi baru minimal 8 karakter untuk mengamankan akun Anda.',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                        height: 1.45,
                      ),
                    ),

                    if (_step >= 2 && emailDisplay.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Center(
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceContainerLow,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.alternate_email_rounded,
                                size: 14,
                                color: AppColors.primary,
                              ),
                              const SizedBox(width: 6),
                              Flexible(
                                child: Text(
                                  emailDisplay,
                                  overflow: TextOverflow.ellipsis,
                                  style: theme.textTheme.labelMedium?.copyWith(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 22),

                    if (_errorMessage != null) ...[
                      StatusBanner(
                        message: _errorMessage!,
                        type: BannerType.error,
                      ),
                      const SizedBox(height: 16),
                    ],

                    if (_infoMessage != null) ...[
                      StatusBanner(
                        message: _infoMessage!,
                        type: BannerType.info,
                      ),
                      const SizedBox(height: 16),
                    ],

                    if (_step == 1) _buildEmailStep(),
                    if (_step == 2) _buildOtpStep(theme),
                    if (_step == 3) _buildPasswordStep(),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              TextButton(
                onPressed: () => context.go('/login'),
                child: const Text('Kembali ke Halaman Masuk'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmailStep() {
    return Form(
      key: _emailFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
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
          const SizedBox(height: 20),
          CustomButton(
            text: 'Kirim Kode OTP',
            icon: Icons.send_rounded,
            isLoading: _isLoading,
            onPressed: _handleSendOtp,
          ),
        ],
      ),
    );
  }

  Widget _buildOtpStep(ThemeData theme) {
    final otpText = _otpController.text;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GestureDetector(
          onTap: () => _otpFocusNode.requestFocus(),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(5, (index) {
                  final hasChar = index < otpText.length;
                  final isActive = index == otpText.length ||
                      (otpText.length == 5 && index == 4);
                  final char = hasChar ? otpText[index] : '';

                  return Container(
                    width: 52,
                    height: 62,
                    decoration: BoxDecoration(
                      color: hasChar
                          ? AppColors.surface
                          : AppColors.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isActive
                            ? AppColors.primaryContainer
                            : hasChar
                                ? AppColors.primary.withValues(alpha: 0.4)
                                : AppColors.outlineVariant
                                    .withValues(alpha: 0.35),
                        width: isActive ? 2.0 : 1.2,
                      ),
                      boxShadow: isActive
                          ? [
                              BoxShadow(
                                color: AppColors.primaryContainer
                                    .withValues(alpha: 0.14),
                                blurRadius: 12,
                                offset: const Offset(0, 4),
                              ),
                            ]
                          : null,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          hasChar ? char : '•',
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: hasChar
                                ? AppColors.primary
                                : AppColors.outlineVariant,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Container(
                          width: 18,
                          height: 3,
                          decoration: BoxDecoration(
                            color: hasChar
                                ? AppColors.primaryContainer
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(99),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ),
              Opacity(
                opacity: 0.01,
                child: TextField(
                  controller: _otpController,
                  focusNode: _otpFocusNode,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(5),
                  ],
                  decoration: const InputDecoration(
                    counterText: '',
                  ),
                  onChanged: (val) {
                    setState(() {});
                    if (val.length == 5) {
                      _handleVerifyOtp();
                    }
                  },
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 22),
        CustomButton(
          text: 'Verifikasi Kode',
          icon: Icons.verified_rounded,
          isLoading: _isLoading,
          onPressed: otpText.length == 5 ? _handleVerifyOtp : null,
        ),
        const SizedBox(height: 12),
        CustomButton(
          text: _resendCooldown > 0
              ? 'Kirim ulang dalam ${_resendCooldown}d'
              : 'Kirim Ulang Kode',
          variant: ButtonVariant.outlined,
          isLoading: _isResending,
          icon: Icons.refresh_rounded,
          onPressed: _resendCooldown > 0 ? null : _handleResendOtp,
        ),
        const SizedBox(height: 6),
        TextButton(
          onPressed: () {
            setState(() {
              _step = 1;
              _errorMessage = null;
              _infoMessage = null;
            });
          },
          child: const Text('Ganti Email'),
        ),
      ],
    );
  }

  Widget _buildPasswordStep() {
    return Form(
      key: _passwordFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CustomTextField(
            label: 'Kata Sandi Baru',
            hint: 'Minimal 8 karakter',
            controller: _newPasswordController,
            isPassword: true,
            prefixIcon: Icons.lock_outline_rounded,
            validator: (val) {
              if (val == null || val.isEmpty) {
                return 'Kata sandi baru wajib diisi';
              }
              if (val.length < 8) {
                return 'Minimal 8 karakter';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          CustomTextField(
            label: 'Konfirmasi Kata Sandi',
            hint: 'Ulangi kata sandi baru',
            controller: _confirmPasswordController,
            isPassword: true,
            prefixIcon: Icons.lock_reset_rounded,
            validator: (val) {
              if (val == null || val.isEmpty) {
                return 'Konfirmasi kata sandi wajib diisi';
              }
              if (val != _newPasswordController.text) {
                return 'Konfirmasi kata sandi tidak cocok';
              }
              return null;
            },
          ),
          const SizedBox(height: 22),
          CustomButton(
            text: 'Simpan Kata Sandi Baru',
            icon: Icons.check_circle_outline_rounded,
            isLoading: _isLoading,
            onPressed: _handleResetPassword,
          ),
        ],
      ),
    );
  }
}
