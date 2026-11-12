import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/errors/failure.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/preferences_service.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../shared/models/user_model.dart';
import '../data/auth_repository.dart';

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('Initialize shared preferences in main()');
});

final preferencesServiceProvider = Provider<PreferencesService>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return PreferencesService(prefs);
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final secureStorage = ref.watch(secureStorageProvider);
  return ApiClient(secureStorage: secureStorage);
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final secureStorage = ref.watch(secureStorageProvider);
  return AuthRepository(apiClient: apiClient, secureStorage: secureStorage);
});

enum AuthStatus { initial, authenticated, unauthenticated, unverified }

class AuthState {
  final AuthStatus status;
  final UserModel? user;
  final String? unverifiedEmail;
  final String? pendingPassword;
  final bool isLoading;
  final String? errorMessage;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.unverifiedEmail,
    this.pendingPassword,
    this.isLoading = false,
    this.errorMessage,
  });

  AuthState copyWith({
    AuthStatus? status,
    UserModel? user,
    String? unverifiedEmail,
    String? pendingPassword,
    bool? isLoading,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      unverifiedEmail: unverifiedEmail ?? this.unverifiedEmail,
      pendingPassword: pendingPassword ?? this.pendingPassword,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AuthNotifier(this._repository) : super(const AuthState()) {
    checkAuthStatus();
  }

  Future<void> checkAuthStatus() async {
    try {
      final user = await _repository.getMe();
      if (!user.emailVerified) {
        state = state.copyWith(
          status: AuthStatus.unverified,
          unverifiedEmail: user.email,
          user: user,
        );
      } else {
        state = state.copyWith(
          status: AuthStatus.authenticated,
          user: user,
        );
      }
    } catch (_) {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  Future<bool> signIn(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final user = await _repository.signIn(email: email, password: password);
      if (!user.emailVerified) {
        state = state.copyWith(
          isLoading: false,
          status: AuthStatus.unverified,
          unverifiedEmail: email,
          pendingPassword: password,
        );
        return false;
      }
      state = state.copyWith(
        isLoading: false,
        status: AuthStatus.authenticated,
        user: user,
      );
      return true;
    } on AuthFailure catch (e) {
      if (e.code == 'EMAIL_NOT_VERIFIED') {
        state = state.copyWith(
          isLoading: false,
          status: AuthStatus.unverified,
          unverifiedEmail: email,
          pendingPassword: password,
        );
        // Automatically trigger resend OTP
        _repository.resendOtp(email: email);
        return false;
      }
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.message,
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Gagal masuk. Periksa koneksi internet Anda.',
      );
      return false;
    }
  }

  Future<bool> signUp(String name, String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      await _repository.signUp(name: name, email: email, password: password);
      state = state.copyWith(
        isLoading: false,
        status: AuthStatus.unverified,
        unverifiedEmail: email,
        pendingPassword: password,
      );
      return true;
    } on AuthFailure catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.message,
      );
      return false;
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Terjadi kesalahan saat pendaftaran.',
      );
      return false;
    }
  }

  Future<bool> verifyOtp(String code) async {
    final email = state.unverifiedEmail;
    if (email == null) return false;

    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final success = await _repository.verifyOtp(email: email, code: code);
      if (success) {
        // If password was stored, auto-login
        if (state.pendingPassword != null) {
          final user = await _repository.signIn(
            email: email,
            password: state.pendingPassword!,
          );
          state = state.copyWith(
            isLoading: false,
            status: AuthStatus.authenticated,
            user: user,
            unverifiedEmail: null,
            pendingPassword: null,
          );
          return true;
        }

        state = state.copyWith(
          isLoading: false,
          status: AuthStatus.unauthenticated,
          unverifiedEmail: null,
        );
        return true;
      }
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Kode 5 digit tidak valid.',
      );
      return false;
    } on AuthFailure catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.message,
      );
      return false;
    }
  }

  Future<bool> resendOtp() async {
    final email = state.unverifiedEmail;
    if (email == null) return false;

    try {
      await _repository.resendOtp(email: email);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> signOut() async {
    state = state.copyWith(isLoading: true);
    await _repository.signOut();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  return AuthNotifier(repository);
});

