// carecore-frontend/services/AuthService.ts

import * as SecureStore from 'expo-secure-store';

// Clave segura para el almacenamiento del token
const TOKEN_KEY = 'carecore_auth_token';
const API_BASE_URL = 'http://localhost:3000/api/auth'; // <--- AJUSTA TU URL LOCAL

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
    const url = `${API_BASE_URL}/exchange-code`; // <--- Tu endpoint en NestJS

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Tu API de NestJS espera estos datos
      body: JSON.stringify({
        code: code,
        code_verifier: codeVerifier,
        // Tu API ya conoce el redirect_uri y client_id
      }),
    });

    if (!response.ok) {
      // Manejo de errores de Keycloak/API
      throw new Error(`Error al intercambiar el código. Estado: ${response.status}`);
    }

    const data: TokensResponse = await response.json();

    // Una vez recibidos, guardar de forma segura.
    await this.saveTokens(data);
    return data;
  }

  // ===================================================================
  // B. Lógica de Almacenamiento Seguro (CRÍTICO)
  // ===================================================================

  /**
   * Guarda los tokens de forma segura en el dispositivo (keychain/encriptación Android).
   * @param tokens El objeto de tokens recibido.
   */
  private async saveTokens(tokens: TokensResponse): Promise<void> {
    // Nota: Solo guardamos el access_token y el refresh_token
    await SecureStore.setItemAsync(
      TOKEN_KEY,
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
    const tokensJson = await SecureStore.getItemAsync(TOKEN_KEY);
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
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }

  // ===================================================================
  // C. Lógica de Refresco de Token (NECESARIO)
  // ===================================================================

  /**
   * Usa el refresh_token para obtener un nuevo access_token sin reautenticar.
   */
  async refreshAccessToken(): Promise<boolean> {
    // 1. Obtener el refresh_token del SecureStore...
    const tokensJson = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!tokensJson) return false;

    const tokens = JSON.parse(tokensJson);
    const refreshToken = tokens.refreshToken;

    if (!refreshToken) return false;

    // 2. Llamar al endpoint de tu NestJS API para refrescar el token
    const url = `${API_BASE_URL}/refresh`; // <--- Tu endpoint de refresco

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
      console.error('Fallo al refrescar el token. Se requiere re-autenticación.');
      await this.removeTokens(); // Borrar tokens si falla el refresh
      return false; // Fallo
    }
  }
}

// Exportar una instancia para usar como Singleton
export const authService = new AuthService();
