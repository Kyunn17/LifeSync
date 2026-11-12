import 'dart:developer';
import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/secure_storage_service.dart';

class ApiClient {
  late final Dio dio;
  final SecureStorageService secureStorage;

  ApiClient({required this.secureStorage}) {
    dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: AppConfig.connectTimeout,
        receiveTimeout: AppConfig.receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Better Auth validates origin
          'Origin': AppConfig.apiBaseUrl,
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Attach session cookie and Bearer token if available
          final cookie = await secureStorage.getCookie();
          final token = await secureStorage.getToken();

          if (cookie != null && cookie.isNotEmpty) {
            options.headers['Cookie'] = cookie;
          }
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          log('[Dio] Request: ${options.method} ${options.uri}');
          return handler.next(options);
        },
        onResponse: (response, handler) async {
          // Extract set-cookie from Better Auth response
          final setCookieHeaders = response.headers['set-cookie'];
          if (setCookieHeaders != null && setCookieHeaders.isNotEmpty) {
            final fullCookie = setCookieHeaders.join('; ');
            await secureStorage.saveCookie(fullCookie);
          }

          // If auth endpoint returns a token in data
          if (response.data is Map<String, dynamic>) {
            final data = response.data as Map<String, dynamic>;
            if (data['token'] is String) {
              await secureStorage.saveToken(data['token'] as String);
            }
          }

          log('[Dio] Response [${response.statusCode}]: ${response.requestOptions.uri}');
          return handler.next(response);
        },
        onError: (DioException error, handler) {
          log('[Dio] Error [${error.response?.statusCode}]: ${error.message}');
          return handler.next(error);
        },
      ),
    );
  }
}

