/**
 * HttpClient - Cliente HTTP base con interceptores
 *
 * Características:
 * - Agrega token JWT automáticamente en todas las requests
 * - Refresh automático de tokens cuando expiran (401)
 * - Manejo de timeouts y reintentos
 * - Headers comunes (Content-Type, Authorization)
 * - Manejo de errores 401/403 con redirección a login
 */

import { authService } from './AuthService';
import { ErrorService } from './ErrorService';
import { router } from 'expo-router';

interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  skipAuth?: boolean; // Para requests que no requieren autenticación
  token?: string; // Token opcional para usar en lugar de obtenerlo de authService
}

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryableStatusCodes: number[];
}

const DEFAULT_TIMEOUT = 30000; // 30 segundos
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 segundo

const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504]; // Timeout, rate limit, server errors

export class HttpClient {
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  /**
   * Realiza una request HTTP con interceptores y manejo de errores
   */
  async request<T>(url: string, config: RequestConfig = {}): Promise<T> {
    const {
      timeout: _timeout = DEFAULT_TIMEOUT, // Timeout no se usa actualmente, pero se mantiene para futuras implementaciones
      retries = DEFAULT_RETRIES,
      skipAuth = false,
      ...fetchConfig
    } = config;

    // Agregar headers comunes
    const headers = new Headers(fetchConfig.headers);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Agregar token de autenticación si no se omite
    if (!skipAuth) {
      try {
        // Si se proporciona un token explícito, usarlo directamente
        // Esto es útil cuando el token acaba de ser obtenido y puede no estar disponible en SecureStore aún
        const token = config.token || (await authService.getAccessToken());
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        } else if (!config.token) {
          // Solo lanzar error si no se proporcionó un token explícito
          // Si se proporcionó un token pero es null/undefined, no lanzar error aquí
          ErrorService.handleAuthError(new Error('No se encontró token de acceso'), {
            operation: 'request',
          });
          router.replace('/login');
          throw new Error('No se encontró token de acceso');
        }
      } catch {
        // Si no hay token y no es skipAuth, redirigir a login
        // Solo lanzar error si no se proporcionó un token explícito
        if (!skipAuth && !config.token) {
          ErrorService.handleAuthError(new Error('No se encontró token de acceso'), {
            operation: 'request',
          });
          router.replace('/login');
          throw new Error('No se encontró token de acceso');
        }
      }
    }

    const requestConfig: RequestInit = {
      ...fetchConfig,
      headers,
    };

    // Intentar la request con reintentos
    return this.requestWithRetry<T>(url, requestConfig, {
      maxRetries: retries,
      retryDelay: DEFAULT_RETRY_DELAY,
      retryableStatusCodes: RETRYABLE_STATUS_CODES,
    });
  }

  /**
   * Realiza una request con reintentos automáticos
   */
  private async requestWithRetry<T>(
    url: string,
    config: RequestInit,
    retryConfig: RetryConfig,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(url, config);

        // Si es 401 (Unauthorized), intentar refresh del token
        if (response.status === 401) {
          const refreshed = await this.handle401Error();
          if (refreshed) {
            // Reintentar la request con el nuevo token
            const newToken = await authService.getAccessToken();
            if (newToken) {
              const headers = new Headers(config.headers);
              headers.set('Authorization', `Bearer ${newToken}`);
              const newConfig = { ...config, headers };
              const retryResponse = await fetch(url, newConfig);

              if (retryResponse.ok) {
                return this.parseResponse<T>(retryResponse);
              }
              // Si sigue fallando después del refresh, lanzar error
              if (retryResponse.status === 401) {
                ErrorService.handleAuthError(new Error('Token inválido después de refresh'), {
                  operation: 'requestWithRetry',
                });
                router.replace('/login');
                throw new Error('Token inválido. Por favor, inicia sesión nuevamente.');
              }
            }
          } else {
            // No se pudo refrescar, redirigir a login
            ErrorService.handleAuthError(new Error('Sesión expirada'), {
              operation: 'requestWithRetry',
            });
            router.replace('/login');
            throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
          }
        }

        // Si es 403 (Forbidden), no reintentar
        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || 'Acceso prohibido';
          ErrorService.handleAuthError(new Error(errorMessage), {
            operation: 'requestWithRetry',
            status: 403,
          });
          throw new Error(errorMessage);
        }

        // Si la respuesta es exitosa, parsear y retornar
        if (response.ok) {
          return this.parseResponse<T>(response);
        }

        // Si es un error retryable y no es el último intento, esperar y reintentar
        if (
          retryConfig.retryableStatusCodes.includes(response.status) &&
          attempt < retryConfig.maxRetries
        ) {
          await this.delay(retryConfig.retryDelay * (attempt + 1)); // Backoff exponencial
          continue;
        }

        // Si no es retryable o es el último intento, lanzar error
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Error: ${response.statusText}`;
        throw new Error(errorMessage);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Error desconocido');

        // Si es un error de red y no es el último intento, reintentar
        if (
          error instanceof TypeError &&
          error.message.includes('fetch') &&
          attempt < retryConfig.maxRetries
        ) {
          await this.delay(retryConfig.retryDelay * (attempt + 1));
          continue;
        }

        // Si es el último intento o no es retryable, lanzar error
        if (attempt === retryConfig.maxRetries) {
          if (error instanceof TypeError && error.message.includes('fetch')) {
            ErrorService.handleNetworkError(lastError, { operation: 'requestWithRetry' });
          }
          throw lastError;
        }
      }
    }

    throw lastError || new Error('Error desconocido en request');
  }

  /**
   * Maneja errores 401 intentando refrescar el token
   */
  private async handle401Error(): Promise<boolean> {
    // Si ya hay un refresh en progreso, esperar a que termine
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    // Iniciar refresh
    this.isRefreshing = true;
    this.refreshPromise = authService
      .refreshAccessToken()
      .then((success) => {
        this.isRefreshing = false;
        this.refreshPromise = null;
        return success;
      })
      .catch((error) => {
        this.isRefreshing = false;
        this.refreshPromise = null;
        ErrorService.handleAuthError(error, { operation: 'handle401Error' });
        return false;
      });

    return this.refreshPromise;
  }

  /**
   * Parsea la respuesta JSON o texto
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    const text = await response.text();
    return text as unknown as T;
  }

  /**
   * Delay helper para reintentos
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Métodos de conveniencia para diferentes verbos HTTP
   */
  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }
}

// Exportar instancia singleton
export const httpClient = new HttpClient();
