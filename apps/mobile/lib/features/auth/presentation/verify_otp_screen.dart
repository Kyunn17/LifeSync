import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/status_banner.dart';
import '../providers/auth_provider.dart';

class VerifyOtpScreen extends ConsumerStatefulWidget {
  const VerifyOtpScreen({super.key});

  @override
  ConsumerState<VerifyOtpScreen> createState() => _VerifyOtpScreenState();
}

class _VerifyOtpScreenState extends ConsumerState<VerifyOtpScreen> {
  final _otpController = TextEditingController();
  final _focusNode = FocusNode();
  String? _resendMessage;
  bool _isResending = false;

  @override
  void dispose() {
    _otpController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _handleConfirm() async {
    final code = _otpController.text.trim();
    if (code.length != 5) return;

    final success = await ref.read(authStateProvider.notifier).verifyOtp(code);
    if (mounted && success) {
      context.go('/dashboard');
    }
  }

  Future<void> _handleResend() async {
    setState(() {
      _isResending = true;
      _resendMessage = null;
    });

    final success = await ref.read(authStateProvider.notifier).resendOtp();

    if (mounted) {
      setState(() {
        _isResending = false;
        _resendMessage = success
            ? 'Kode 5 digit baru telah dikirim ke kotak masuk Gmail Anda!'
            : 'Gagal mengirim ulang kode. Silakan coba sesaat lagi.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authStateProvider);
    final email = authState.unverifiedEmail ?? 'nama@gmail.com';
    final otpText = _otpController.text;

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
          onPressed: () => context.go('/login'),
        ),
        title: Text(
          'Verifikasi Keamanan',
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
                    // Shield Emblem with Mail Read Badge
                    Center(
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Container(
                            width: 78,
                            height: 78,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceContainerLow,
                              borderRadius: BorderRadius.circular(24),
                            ),
                            child: const Icon(
                              Icons.verified_user_rounded,
                              size: 40,
                              color: AppColors.primary,
                            ),
                          ),
                          Positioned(
                            top: -4,
                            right: -4,
                            child: Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                color: AppColors.secondaryFixed,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white,
                                  width: 2.5,
                                ),
                              ),
                              child: const Icon(
                                Icons.mark_email_read_rounded,
                                size: 14,
                                color: AppColors.onPrimaryFixed,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    Text(
                      'Verifikasi Email',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Masukkan 5 digit kode OTP yang telah kami kirimkan ke alamat Gmail Anda:',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Email Pill Badge
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
                            Text(
                              email,
                              style: theme.textTheme.labelMedium?.copyWith(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    if (authState.errorMessage != null) ...[
                      StatusBanner(
                        message: authState.errorMessage!,
                        type: BannerType.error,
                      ),
                      const SizedBox(height: 16),
                    ],

                    if (_resendMessage != null) ...[
                      StatusBanner(
                        message: _resendMessage!,
                        type: BannerType.info,
                      ),
                      const SizedBox(height: 16),
                    ],

                    // 5 Individual Split PIN Slots Overlaid over Hidden TextField
                    GestureDetector(
                      onTap: () => _focusNode.requestFocus(),
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
                                            ? AppColors.primary
                                                .withValues(alpha: 0.4)
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
                                      style:
                                          theme.textTheme.headlineSmall?.copyWith(
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
                          // Invisible accessible TextField for keyboard input & tests
                          Opacity(
                            opacity: 0.0,
                            child: TextField(
                              controller: _otpController,
                              focusNode: _focusNode,
                              keyboardType: TextInputType.number,
                              maxLength: 5,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                              ],
                              decoration: const InputDecoration(
                                counterText: '',
                              ),
                              onChanged: (val) {
                                setState(() {});
                                if (val.length == 5) {
                                  _handleConfirm();
                                }
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    CustomButton(
                      text: 'Konfirmasi & Aktifkan',
                      icon: Icons.verified_rounded,
                      isLoading: authState.isLoading,
                      onPressed:
                          otpText.length == 5 ? _handleConfirm : null,
                    ),
                    const SizedBox(height: 12),

                    CustomButton(
                      text: 'Kirim Ulang Kode 5 Digit',
                      variant: ButtonVariant.outlined,
                      isLoading: _isResending,
                      icon: Icons.refresh_rounded,
                      onPressed: _handleResend,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Sanctuary Sync Trust Micro-Banner
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppColors.outlineVariant.withValues(alpha: 0.25),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppColors.secondaryFixed.withValues(alpha: 0.45),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.lock_clock_rounded,
                        color: AppColors.primary,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Sanctuary Cloud Sync',
                            style: theme.textTheme.labelLarge?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: AppColors.onSurface,
                            ),
                          ),
                          Text(
                            'Kode OTP berlaku selama 10 menit untuk melindungi profil kesehatan Anda.',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: AppColors.onSurfaceVariant,
                              fontSize: 11.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),
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
}
