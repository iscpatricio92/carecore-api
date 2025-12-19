// carecore-frontend/services/AuthService.ts

import * as SecureStore from 'expo-secure-store';
import { appConfig } from '../config/AppConfig';
import { ErrorService } from './ErrorService';
import { AUTH_TOKEN_STORAGE_KEY, TokensResponse } from '@carecore/shared';

// 2. Definición de la clase AuthService
export class AuthService {
  // ===================================================================
  // A. Lógica de Intercambio de Código (AUTH CODE EXCHANGE)
  // ===================================================================

  /**
   * Intercambia el código de autorización por tokens usando PKCE
   *
   * Para aplicaciones móviles con PKCE, intercambiamos directamente con Keycloak
   * ya que PKCE no requiere client_secret (más seguro para mobile).
   *
   * @param code El código de autorización recibido de expo-auth-session
   * @param codeVerifier El verificador PKCE (generado por expo-auth-session)
   * @param redirectUri La URI de redirección usada en la solicitud de autorización
   */
  async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    redirectUri: string = appConfig.keycloak.redirectUri,
  ): Promise<TokensResponse> {
    // Construir URL del token endpoint de Keycloak
    const tokenUrl = `${appConfig.keycloak.issuer}/protocol/openid-connect/token`;

    try {
      // Preparar el body para el intercambio de tokens (form-urlencoded)
      const body = new URLSearchParams();
      body.append('grant_type', 'authorization_code');
      body.append('code', code);
      body.append('client_id', appConfig.keycloak.clientId);
      body.append('code_verifier', codeVerifier); // PKCE: code_verifier en lugar de client_secret
      body.append('redirect_uri', redirectUri);

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Error al intercambiar el código. Estado: ${response.status}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error_description || errorData.error || errorMessage;
        } catch {
          // Si no es JSON, usar el texto del error
          errorMessage = errorText || errorMessage;
        }

        ErrorService.handleAuthError(new Error(errorMessage), {
          status: response.status,
          operation: 'exchangeCodeForTokens',
        });
        throw new Error(errorMessage);
      }

      const tokenData = (await response.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
        id_token?: string;
      };

      if (!tokenData.access_token) {
        const error = new Error('Invalid token response from Keycloak: missing access_token');
        ErrorService.handleAuthError(error, { operation: 'exchangeCodeForTokens' });
        throw error;
      }

      // Construir respuesta en el formato esperado
      const tokens: TokensResponse = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || '',
        expires_in: tokenData.expires_in || 3600,
        token_type: tokenData.token_type || 'Bearer',
        id_token: tokenData.id_token,
        // user_info se obtendrá decodificando el JWT o llamando al endpoint /user
        user_info: {
          sub: '', // Se llenará después al obtener información del usuario
          roles: [],
        },
      };

      // Guardar tokens de forma segura
      await this.saveTokens(tokens);
      return tokens;
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        ErrorService.handleNetworkError(error, { operation: 'exchangeCodeForTokens' });
      } else if (error instanceof Error) {
        ErrorService.handleAuthError(error, { operation: 'exchangeCodeForTokens' });
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
   * Llama al endpoint del API que maneja el refresh para clientes públicos (mobile).
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      // 1. Obtener el refresh_token del SecureStore
      const tokensJson = await SecureStore.getItemAsync(AUTH_TOKEN_STORAGE_KEY);
      if (!tokensJson) return false;

      const tokens = JSON.parse(tokensJson);
      const refreshToken = tokens.refreshToken;

      if (!refreshToken) return false;

      // 2. Llamar al endpoint del API para refrescar el token
      // Pasamos el clientId del móvil para que el API use el cliente público (sin client_secret)
      const url = `${appConfig.api.authUrl}/refresh`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken,
          clientId: appConfig.keycloak.clientId, // Cliente público (mobile)
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Fallo al refrescar el token. Estado: ${response.status}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        ErrorService.handleAuthError(new Error(errorMessage), {
          operation: 'refreshAccessToken',
          status: response.status,
        });

        await this.removeTokens(); // Borrar tokens si falla el refresh
        return false;
      }

      const tokenData = (await response.json()) as {
        accessToken?: string;
        refreshToken?: string;
        expiresIn?: number;
        tokenType?: string;
      };

      if (!tokenData.accessToken) {
        throw new Error('Invalid token response: missing accessToken');
      }

      // El API devuelve tokens en formato { accessToken, refreshToken, expiresIn, tokenType }
      // Normalizar al formato TokensResponse
      const newTokens: TokensResponse = {
        access_token: tokenData.accessToken,
        refresh_token: tokenData.refreshToken || refreshToken, // usa el nuevo si viene
        expires_in: tokenData.expiresIn || 3600,
        token_type: tokenData.tokenType || 'Bearer',
        user_info: {
          sub: '', // se poblará luego al obtener user info
          roles: [],
        },
      };

      await this.saveTokens(newTokens);
      return true;
    } catch (error) {
      ErrorService.handleNetworkError(error, { operation: 'refreshAccessToken' });
      await this.removeTokens();
      return false;
    }
  }
}

// Exportar una instancia para usar como Singleton
export const authService = new AuthService();
