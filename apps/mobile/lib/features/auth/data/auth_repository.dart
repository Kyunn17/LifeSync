import 'package:dio/dio.dart';
import '../../../core/errors/failure.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/network/api_response.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../shared/models/user_model.dart';

class AuthRepository {
  final ApiClient apiClient;
  final SecureStorageService secureStorage;

  AuthRepository({
    required this.apiClient,
    required this.secureStorage,
  });

  Future<UserModel> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final response = await apiClient.dio.post(
        ApiEndpoints.signIn,
        data: {
          'email': email.trim().toLowerCase(),
          'password': password,
        },
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        if (data['user'] != null) {
          final user = UserModel.fromJson(data['user'] as Map<String, dynamic>);
          return user;
        }
      }

      // If user isn't directly returned, fetch me
      return await getMe();
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? e.response?.data?['error']?['message'];
      final code = e.response?.data?['code'] ?? e.response?.data?['error']?['code'];

      if (e.response?.statusCode == 403 || (msg != null && msg.toString().toLowerCase().contains('verif'))) {
        throw AuthFailure(
          'Email Anda belum diverifikasi. Silakan masukkan 5 digit kode verifikasi.',
          code: 'EMAIL_NOT_VERIFIED',
        );
      }

      throw AuthFailure(
        msg?.toString() ?? 'Email atau kata sandi tidak valid.',
        code: code?.toString(),
      );
    } catch (e) {
      if (e is Failure) rethrow;
      throw AuthFailure('Gagal masuk. Silakan coba lagi.');
    }
  }

  Future<void> signUp({
    required String name,
    required String email,
    required String password,
  }) async {
    try {
      await apiClient.dio.post(
        ApiEndpoints.signUp,
        data: {
          'name': name.trim(),
          'email': email.trim().toLowerCase(),
          'password': password,
        },
      );
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? e.response?.data?['error']?['message'];
      throw AuthFailure(msg?.toString() ?? 'Gagal mendaftar akun.');
    }
  }

  Future<bool> verifyOtp({
    required String email,
    required String code,
  }) async {
    try {
      final response = await apiClient.dio.post(
        ApiEndpoints.verifyCode,
        data: {
          'email': email.trim().toLowerCase(),
          'code': code.trim(),
        },
      );

      final apiRes = ApiResponse.fromJson(
        response.data as Map<String, dynamic>,
        (json) => json,
      );

      return apiRes.success;
    } on DioException catch (e) {
      final msg = e.response?.data?['error']?['message'] ?? 'Kode verifikasi salah atau kedaluwarsa.';
      throw AuthFailure(msg.toString());
    }
  }

  Future<void> resendOtp({required String email}) async {
    try {
      await apiClient.dio.post(
        ApiEndpoints.resendCode,
        data: {'email': email.trim().toLowerCase()},
      );
    } on DioException catch (e) {
      final msg = e.response?.data?['error']?['message'] ?? 'Gagal mengirim ulang kode.';
      throw AuthFailure(msg.toString());
    }
  }

  Future<UserModel> getMe() async {
    try {
      final response = await apiClient.dio.get(ApiEndpoints.me);
      final apiRes = ApiResponse<UserModel>.fromJson(
        response.data as Map<String, dynamic>,
        (json) => UserModel.fromJson(json as Map<String, dynamic>),
      );

      if (!apiRes.success || apiRes.data == null) {
        throw const AuthFailure('Gagal memuat profil pengguna');
      }

      return apiRes.data!;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw const AuthFailure('Sesi telah berakhir. Silakan masuk kembali.', code: 'UNAUTHORIZED');
      }
      throw AuthFailure(e.message ?? 'Gagal memuat akun');
    }
  }

  Future<UserModel> updateProfile(Map<String, dynamic> payload) async {
    try {
      await apiClient.dio.patch(ApiEndpoints.me, data: payload);
      return await getMe();
    } on DioException catch (e) {
      final msg = e.response?.data?['error']?['message'] ?? 'Gagal memperbarui target profil.';
      throw AuthFailure(msg.toString());
    } catch (e) {
      if (e is Failure) rethrow;
      throw const AuthFailure('Gagal memperbarui profil.');
    }
  }

  Future<void> signOut() async {
    try {
      await apiClient.dio.post(ApiEndpoints.signOut);
    } catch (_) {}
    await secureStorage.clearAuthData();
  }
}

