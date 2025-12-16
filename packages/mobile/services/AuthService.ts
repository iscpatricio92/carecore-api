// carecore-frontend/services/AuthService.ts

import * as SecureStore from 'expo-secure-store';
import { appConfig } from '../config/AppConfig';
import { ErrorService, ErrorType } from './ErrorService';
import { AUTH_TOKEN_STORAGE_KEY } from '@carecore/shared';

// 1. Tipos de datos que Keycloak devuelve a tu API (y que tu API devuelve a la App)
interface TokensResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  id_token?: string;
  // Opcional: información del usuario (Ej: roles, fhirUser ID)
  user_info: {
    sub: string;
    roles: string[];
    // Otros claims del JWT que necesites
  };
}

// 2. Definición de la clase AuthService
export class AuthService {
  // ===================================================================
  // A. Lógica de Intercambio de Código (AUTH CODE EXCHANGE)
  // ===================================================================

  /**
   * Llama al endpoint de tu API de NestJS para intercambiar el código
   * de autorización de Keycloak por los tokens JWT.
   * @param code El código de autorización recibido de expo-auth-session.
   * @param codeVerifier El verificador PKCE.
   */
  async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokensResponse> {
    const url = `${appConfig.api.authUrl}/exchange-code`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          code_verifier: codeVerifier,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || `Error al intercambiar el código. Estado: ${response.status}`;
        ErrorService.handleAuthError(new Error(errorMessage), { status: response.status });
        throw new Error(errorMessage);
      }

      const data: TokensResponse = await response.json();

      // Una vez recibidos, guardar de forma segura.
      await this.saveTokens(data);
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        ErrorService.handleNetworkError(error, { operation: 'exchangeCodeForTokens' });
      }
      throw error;
    }
  }

  // ===================================================================
  // B. Lógica de Almacenamiento Seguro (CRÍTICO)
  // ===================================================================

  /**
   * Guarda los tokens de forma segura en el dispositivo (keychain/encriptación Android).
   * @param tokens El objeto de tokens recibido.
   */
  async saveTokens(tokens: TokensResponse): Promise<void> {
    // Nota: Solo guardamos el access_token y el refresh_token
    await SecureStore.setItemAsync(
      AUTH_TOKEN_STORAGE_KEY,
      JSON.stringify({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        userInfo: tokens.user_info,
      }),
    );
  }

  /**
   * Recupera el token de acceso del almacenamiento seguro.
   */
  async getAccessToken(): Promise<string | null> {
    const tokensJson = await SecureStore.getItemAsync(AUTH_TOKEN_STORAGE_KEY);
    if (!tokensJson) return null;

    try {
      const tokens = JSON.parse(tokensJson);
      return tokens.accessToken;
    } catch (e) {
      console.error('Error al parsear tokens:', e);
      return null;
    }
  }

  /**
   * Elimina todos los tokens del almacenamiento.
   */
  async removeTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_STORAGE_KEY);
  }

  // ===================================================================
  // C. Lógica de Refresco de Token (NECESARIO)
  // ===================================================================

  /**
   * Usa el refresh_token para obtener un nuevo access_token sin reautenticar.
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      // 1. Obtener el refresh_token del SecureStore...
      const tokensJson = await SecureStore.getItemAsync(AUTH_TOKEN_STORAGE_KEY);
      if (!tokensJson) return false;

      const tokens = JSON.parse(tokensJson);
      const refreshToken = tokens.refreshToken;

      if (!refreshToken) return false;

      // 2. Llamar al endpoint de tu NestJS API para refrescar el token
      const url = `${appConfig.api.authUrl}/refresh`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const newTokens: TokensResponse = await response.json();
        await this.saveTokens(newTokens);
        return true; // Éxito
      } else {
        const errorData = await response.json().catch(() => ({}));
        ErrorService.handleAuthError(
          new Error(errorData.message || 'Fallo al refrescar el token'),
          { status: response.status },
        );
        await this.removeTokens(); // Borrar tokens si falla el refresh
        return false; // Fallo
      }
    } catch (error) {
      ErrorService.handleNetworkError(error, { operation: 'refreshAccessToken' });
      await this.removeTokens();
      return false;
    }
  }
}

// Exportar una instancia para usar como Singleton
export const authService = new AuthService();
