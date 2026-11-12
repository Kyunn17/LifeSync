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
  String? _resendMessage;
  bool _isResending = false;

  @override
  void dispose() {
    _otpController.dispose();
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

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/login'),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: AppColors.secondaryContainer,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: const Icon(
                      Icons.pin_outlined,
                      size: 38,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Verifikasi Email',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Masukkan 5 digit kode verifikasi yang kami kirimkan ke Gmail:',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  email,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 32),

                if (authState.errorMessage != null) ...[
                  StatusBanner(
                    message: authState.errorMessage!,
                    type: BannerType.error,
                  ),
                  const SizedBox(height: 20),
                ],

                if (_resendMessage != null) ...[
                  StatusBanner(
                    message: _resendMessage!,
                    type: BannerType.info,
                  ),
                  const SizedBox(height: 20),
                ],

                // 5-Digit Pin Input
                Center(
                  child: SizedBox(
                    width: 240,
                    child: TextField(
                      controller: _otpController,
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      maxLength: 5,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                      ],
                      style: theme.textTheme.displayMedium?.copyWith(
                        letterSpacing: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                      decoration: InputDecoration(
                        counterText: '',
                        hintText: '•••••',
                        hintStyle: TextStyle(
                          letterSpacing: 16,
                          color: AppColors.outlineVariant,
                        ),
                        contentPadding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      onChanged: (val) {
                        setState(() {});
                        if (val.length == 5) {
                          _handleConfirm();
                        }
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                CustomButton(
                  text: 'Konfirmasi & Aktifkan',
                  isLoading: authState.isLoading,
                  onPressed: _otpController.text.length == 5 ? _handleConfirm : null,
                ),
                const SizedBox(height: 16),

                CustomButton(
                  text: 'Kirim Ulang Kode 5 Digit',
                  variant: ButtonVariant.outlined,
                  isLoading: _isResending,
                  icon: Icons.send_rounded,
                  onPressed: _handleResend,
                ),
                const SizedBox(height: 20),

                TextButton(
                  onPressed: () => context.go('/login'),
                  child: const Text('Kembali ke Halaman Masuk'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

